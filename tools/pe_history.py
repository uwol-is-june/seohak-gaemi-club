#!/usr/bin/env python3
"""과거 PER 분포 — tools/pe_history.py (TASK-174)

3시나리오의 **목표 PER 을 감이 아니라 그 종목의 과거 분포에서** 가져오기 위한 도구.
(2026-10-02 진단: 거의 모든 논제가 "3년 뒤 PER 이 지금보다 낮아진다"를 근거 없이 기본값으로
깔아 내재가치가 모닝스타 적정가의 중앙값 88% 수준으로 일관되게 낮았다 — skills/quality-tier.md 2.1단계.)

계산:
  연도별 PER = 회계연도 말 월 종가 / 그 해 희석 EPS (GAAP, SEC XBRL)
  - EPS 는 tools/fetch_financials.py (SEC XBRL companyfacts) 에서 가져온다.
  - 주가는 Yahoo 월봉(분할 조정)이다. XBRL EPS 는 **제출 시점 기준**이라, 공시 제출일 이후에
    일어난 분할만큼 EPS 를 나눠 맞춘다(제출일 전 분할은 공시가 이미 반영했다 — 이중 보정 금지).
  - 적자(EPS ≤ 0) 연도는 PER 이 정의되지 않으므로 제외한다.
  - 외국 상장사(20-F)는 통화를 맞추려고 **현지 상장 티커**의 주가를 쓴다(LOCAL_LISTING).

출력: 연도별 PER, 10년/5년 중앙값, 25·75 분위수, 최저·최고, 그리고 3시나리오 기본값
  Base = 10년 중앙값 (상한 PE_CAP)   · Bull = 75 분위수 (상한 PE_CAP)   · Bear = 10년 최저

사용법 (저장소 루트에서):
    python3 tools/pe_history.py GOOGL
    python3 tools/pe_history.py SAP --json
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import statistics
import subprocess
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

ROOT = Path(__file__).resolve().parent.parent

# 목표 PER 상한 — 초고성장기 배수(NVDA 10년 중앙값 51x, ADBE 46x)를 3년 뒤 출구 배수로 쓰면
# 내재가치가 비상식적으로 부푼다. 30x 는 S&P500 장기 고점대이며 모닝스타 적정가와도 정합한다
# (NVDA: 30x 적용 시 현가 IV ≈ $310 = 모닝스타 $310, 2026-10-02 실측).
PE_CAP = 30.0

# 20-F 제출 외국 기업 — EPS 통화와 맞는 현지 상장 주가를 쓴다(ADR 주가 × 환율·ADR 비율 혼입 방지).
LOCAL_LISTING = {"SAP": "SAP.DE", "TSM": "2330.TW", "ASML": "ASML.AS", "NVO": "NOVO-B.CO"}


def percentile(sorted_vals: list[float], q: float) -> float:
    """선형 보간 분위수 (q: 0~1). 입력은 정렬돼 있어야 한다."""
    if not sorted_vals:
        raise ValueError("빈 목록")
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    pos = (len(sorted_vals) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (pos - lo)


def split_factor_after(filed: dt.date, splits: list[tuple[dt.date, float]]) -> float:
    """공시 제출일 **이후** 일어난 분할의 누적 배수. 제출일 이전 분할은 공시가 이미 반영했다."""
    f = 1.0
    for d, ratio in splits:
        if d > filed:
            f *= ratio
    return f


def price_at_month(prices: list[tuple[dt.date, float]], when: dt.date) -> float | None:
    """회계연도 말과 같은 연·월의 월봉 종가. 없으면 None."""
    hits = [p for d, p in prices if (d.year, d.month) == (when.year, when.month)]
    return hits[-1] if hits else None


def build_rows(annual: dict, prices: list[tuple[dt.date, float]],
               splits: list[tuple[dt.date, float]]) -> list[dict]:
    """fetch_financials 의 annual 블록 + 월봉 + 분할 → 연도별 PER 행."""
    rows = []
    for fy, rec in sorted(annual.items()):
        end = rec.get("periodEnd")
        eps = (rec.get("values") or {}).get("epsDiluted")
        prov = ((rec.get("provenance") or {}).get("epsDiluted") or {})
        if not end or eps is None or eps <= 0:
            continue
        end_d = dt.date.fromisoformat(end)
        filed = dt.date.fromisoformat(prov["filed"]) if prov.get("filed") else end_d
        px = price_at_month(prices, end_d)
        if px is None:
            continue
        eps_adj = eps / split_factor_after(filed, splits)
        rows.append({"fy": fy, "periodEnd": end, "price": round(px, 2),
                     "eps": eps, "epsSplitAdj": round(eps_adj, 4), "pe": round(px / eps_adj, 1)})
    return rows


def summarize(rows: list[dict], cap: float = PE_CAP) -> dict:
    """PER 분포 요약 + 3시나리오 기본 목표 PER."""
    pes = [r["pe"] for r in rows]
    if len(pes) < 3:
        raise ValueError(f"유효 연도 {len(pes)}개 — PER 분포를 낼 수 없다(최소 3개)")
    s = sorted(pes)
    med10 = statistics.median(pes)
    med5 = statistics.median(pes[-5:])
    p75 = percentile(s, 0.75)
    base = min(med10, cap)
    bull = max(min(p75, cap), base)
    # Bear 는 Base 를 넘을 수 없다 — 10년 최저가 상한보다 높은 종목(AMZN 최저 32.2x > 30x)에서
    # 비관 배수가 중립보다 높아지는 역전이 생긴다. 그때 Bear 기본값은 무의미하므로 사람이 근거를 적어 정한다.
    bear = min(s[0], base)
    bear_inverted = s[0] > base
    return {
        "years": len(pes),
        "median10": round(med10, 1),
        "median5": round(med5, 1),
        "p25": round(percentile(s, 0.25), 1),
        "p75": round(p75, 1),
        "min": s[0],
        "max": s[-1],
        "cap": cap,
        "capped": med10 > cap,
        "bearInverted": bear_inverted,
        "defaults": {"bull": round(bull, 1), "base": round(base, 1), "bear": round(bear, 1)},
    }


def _yahoo_monthly(sym: str) -> tuple[list[tuple[dt.date, float]], list[tuple[dt.date, float]]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=12y&interval=1mo&events=split"
    r = subprocess.run(["curl", "-s", "-H", "User-Agent: Mozilla/5.0", url],
                       capture_output=True, text=True, timeout=40)
    if r.returncode != 0 or not r.stdout.strip():
        raise RuntimeError(f"Yahoo 월봉 조회 실패: {sym}")
    res = json.loads(r.stdout)["chart"]["result"][0]
    to_d = lambda t: dt.datetime.fromtimestamp(t, dt.timezone.utc).date()  # noqa: E731
    closes = res["indicators"]["quote"][0]["close"]
    prices = [(to_d(t), c) for t, c in zip(res["timestamp"], closes) if c]
    ev = (res.get("events") or {}).get("splits") or {}
    splits = sorted((to_d(v["date"]), v["numerator"] / v["denominator"]) for v in ev.values())
    return prices, splits


def _annual_eps(ticker: str) -> dict:
    r = subprocess.run([sys.executable, str(ROOT / "tools" / "fetch_financials.py"), ticker,
                        "--years", "10", "--json", "--no-save"],
                       capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0 or not r.stdout.strip():
        raise RuntimeError(f"SEC XBRL EPS 조회 실패: {ticker}\n{r.stderr[-400:]}")
    return json.loads(r.stdout)["annual"]


def main() -> int:
    ap = argparse.ArgumentParser(description="과거 PER 분포 → 3시나리오 기본 목표 PER")
    ap.add_argument("ticker")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    t = args.ticker.upper()
    sym = LOCAL_LISTING.get(t, t)
    prices, splits = _yahoo_monthly(sym)
    rows = build_rows(_annual_eps(t), prices, splits)
    summary = summarize(rows)
    payload = {"ticker": t, "priceSymbol": sym, "rows": rows, **summary}
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    print(f"{t} — 회계연도 말 PER (GAAP 희석 EPS · 주가 {sym})")
    for r in rows:
        print(f"  FY{r['fy']}  {r['periodEnd']}  주가 {r['price']:>10,.2f}  EPS {r['epsSplitAdj']:>9.3f}  PER {r['pe']:>6.1f}x")
    print(f"\n  10년 중앙값 {summary['median10']}x · 5년 중앙값 {summary['median5']}x · "
          f"25~75분위 {summary['p25']}~{summary['p75']}x · 최저 {summary['min']}x · 최고 {summary['max']}x")
    d = summary["defaults"]
    note = f"  ⚠️ 10년 중앙값이 상한 {PE_CAP:g}x 를 넘어 상한으로 잘랐다" if summary["capped"] else ""
    print(f"  => 3시나리오 기본 목표 PER: Bull {d['bull']}x · Base {d['base']}x · Bear {d['bear']}x{note}")
    if summary["bearInverted"]:
        print(f"  ⚠️ 10년 최저({summary['min']}x)가 Base 보다 높다 — Bear 기본값이 무의미하다. 비관 배수는 근거를 적어 직접 정한다.")
    print("     Base 를 이보다 낮게 쓰려면 논제에 '체질 변화' 근거를 문장으로 남긴다 (quality-tier.md 2.1단계).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
