#!/usr/bin/env python3
"""외부 적정가 교차점검 — tools/external_value.py (TASK-175)

우리 내재가치(IV)를 **독립된 외부 기준 두 개**와 나란히 놓는다.
  ① 모닝스타 적정가(Fair Value Estimate) — 오늘 기준 DCF 적정가. 1순위 기준.
  ② 애널리스트 평균 목표가(Yahoo 컨센서스) — **12개월 후** 가격이라 ÷1.08 로 현가화해 비교한다.
     셀사이드는 구조적 낙관 편향이 있어 보조 기준으로만 쓴다(모닝스타가 없을 때 대체).

판정 (skills/quality-tier.md 2.2단계):
  IV / 기준 < 0.75  → 🔴 보수 이탈 — 논제에 "왜 외부보다 25% 넘게 낮은가"를 가정별로 해명해야 한다
  IV / 기준 > 1.25  → 🟡 낙관 이탈 — 같은 해명을 반대 방향으로
  그 사이           → ✅ 정합
외부 기준은 **정답이 아니라 거울**이다. 이탈이 곧 오류는 아니지만, 해명 없는 이탈은 오류로 본다.

사용법 (저장소 루트에서):
    python3 tools/external_value.py GOOGL                # 외부 기준만
    python3 tools/external_value.py GOOGL --iv 314       # 우리 IV 와 비교 판정
    python3 tools/external_value.py GOOGL --iv 314 --json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

# IV 정의와 같은 할인율 — 시장 기대수익(연 8%). 12개월 목표가를 오늘 가치로 돌릴 때 쓴다.
DISCOUNT = 0.08
LOW_RATIO = 0.75
HIGH_RATIO = 1.25

MS_URL = (
    "https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener"
    "?page=1&pageSize=10&outputType=json&version=1&languageId=en-US&currencyId=USD"
    "&universeIds=E0EXG%24XNAS%7CE0EXG%24XNYS"
    "&securityDataPoints=SecId%7CName%7CTenforeId%7CClosePrice%7CFairValueEstimate"
    "%7CEconomicMoat%7CStarRatingM255&filters=FairValueEstimate:notnull&term={t}"
)
UA = "Mozilla/5.0"


def _curl(url: str, cookie: str | None = None, save_cookie: str | None = None) -> str:
    cmd = ["curl", "-s", "-A", UA]
    if cookie:
        cmd += ["-b", cookie]
    if save_cookie:
        cmd += ["-c", save_cookie]
    r = subprocess.run(cmd + [url], capture_output=True, text=True, timeout=40)
    return r.stdout if r.returncode == 0 else ""


def pick_morningstar_row(rows: list[dict], ticker: str) -> dict | None:
    """검색 결과 중 티커가 정확히 일치하는 행(TenforeId 끝자리). 부분 일치는 쓰지 않는다."""
    for r in rows:
        if (r.get("TenforeId") or "").split(".")[-1].upper() == ticker.upper():
            return r
    return None


def fetch_morningstar(ticker: str) -> dict | None:
    raw = _curl(MS_URL.format(t=ticker))
    try:
        row = pick_morningstar_row(json.loads(raw).get("rows", []), ticker)
    except (json.JSONDecodeError, AttributeError):
        return None
    if not row or not row.get("FairValueEstimate"):
        return None
    return {"fairValue": row["FairValueEstimate"], "close": row.get("ClosePrice"),
            "moat": row.get("EconomicMoat"), "stars": row.get("StarRatingM255")}


def fetch_yahoo(ticker: str) -> dict | None:
    with tempfile.TemporaryDirectory() as d:
        ck = str(Path(d) / "ck.txt")
        _curl("https://fc.yahoo.com", save_cookie=ck)
        crumb = _curl("https://query1.finance.yahoo.com/v1/test/getcrumb", cookie=ck).strip()
        if not crumb or "<" in crumb:
            return None
        raw = _curl(f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
                    f"?modules=financialData&crumb={crumb}", cookie=ck)
    try:
        fd = json.loads(raw)["quoteSummary"]["result"][0]["financialData"]
    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
        return None
    g = lambda k: (fd.get(k) or {}).get("raw")  # noqa: E731
    if g("targetMeanPrice") is None:
        return None
    return {"price": g("currentPrice"), "targetMean": g("targetMeanPrice"),
            "targetMedian": g("targetMedianPrice"), "targetHigh": g("targetHighPrice"),
            "analysts": g("numberOfAnalystOpinions")}


def assess(iv: float | None, ms_fv: float | None, analyst_mean: float | None) -> dict:
    """우리 IV 를 외부 기준과 비교. 기준은 모닝스타 우선, 없으면 애널리스트 평균 목표가 현가."""
    analyst_pv = round(analyst_mean / (1 + DISCOUNT), 2) if analyst_mean else None
    ref, ref_name = (ms_fv, "morningstar") if ms_fv else (analyst_pv, "analystPV")
    out = {"analystPV": analyst_pv, "reference": ref_name if ref else None, "referenceValue": ref}
    if iv is None or not ref:
        out.update(ratio=None, verdict="unknown")
        return out
    ratio = iv / ref
    verdict = "conservative" if ratio < LOW_RATIO else "optimistic" if ratio > HIGH_RATIO else "ok"
    out.update(ratio=round(ratio, 3), verdict=verdict)
    return out


VERDICT_LABEL = {"conservative": "🔴 보수 이탈 (외부 기준의 75% 미만) — 논제에 가정별 해명 필수",
                 "optimistic": "🟡 낙관 이탈 (외부 기준의 125% 초과) — 논제에 가정별 해명 필수",
                 "ok": "✅ 정합 (외부 기준의 75~125%)",
                 "unknown": "⬛ 판정 불가 (IV 미입력 또는 외부 기준 없음)"}


def main() -> int:
    ap = argparse.ArgumentParser(description="외부 적정가 교차점검 (모닝스타 · 애널리스트 컨센서스)")
    ap.add_argument("ticker")
    ap.add_argument("--iv", type=float, default=None, help="우리 내재가치(USD, 오늘 기준)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    t = args.ticker.upper()
    ms = fetch_morningstar(t)
    yh = fetch_yahoo(t)
    a = assess(args.iv, ms and ms["fairValue"], yh and yh["targetMean"])
    payload = {"ticker": t, "morningstar": ms, "analyst": yh, **a, "iv": args.iv}
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    price = (yh or {}).get("price") or (ms or {}).get("close")
    print(f"{t} 외부 적정가 교차점검" + (f" (현재가 ${price:,.2f})" if price else ""))
    if ms:
        print(f"  모닝스타 적정가   ${ms['fairValue']:,.2f}  (해자 {ms['moat']} · ★{ms['stars'] or '-'})")
    else:
        print("  모닝스타 적정가   ⬛ 없음 (커버리지 밖)")
    if yh:
        print(f"  애널 평균 목표가  ${yh['targetMean']:,.2f} (12M, {yh['analysts']}명) → 현가 ${a['analystPV']:,.2f}"
              f"  · 범위 ~${yh['targetHigh']:,.2f}")
    else:
        print("  애널 평균 목표가  ⬛ 조회 실패")
    if args.iv is not None:
        ref = "모닝스타" if a["reference"] == "morningstar" else "애널 목표가 현가"
        r = f"{a['ratio'] * 100:.0f}% of {ref}" if a["ratio"] else "-"
        print(f"  우리 IV          ${args.iv:,.2f}  → {r}")
        print(f"  판정: {VERDICT_LABEL[a['verdict']]}")
        if a["reference"]:
            print(f"  기록: record_call.py ... --fair-value {args.iv:g} --ext-fair-value {a['referenceValue']:g}"
                  f" --ext-source {a['reference']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
