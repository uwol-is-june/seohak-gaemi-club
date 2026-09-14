#!/usr/bin/env python3
"""퀄리티 티어(T1/T2/T3)를 SEC XBRL 실적으로 기계 판정한다. (TASK-106)

skills/quality-tier.md 표준의 **실행본**이다. 요구 안전마진이 티어별로 다른데
(T1 0~15% · T2 15~30% · T3 30~40%), 티어를 사람이 감으로 매기면 표준이 있으나 마나다.
5개 축 중 **4개는 과거 실적이라 기계로 확정**할 수 있다:

  (1) 자본 효율   평균 ROIC = EBIT x (1 - 세율) / (자기자본 + 장기부채 - 현금)
                  금융/리츠처럼 EBIT·투하자본 개념이 성립하지 않으면 ROE로 대체하고 명시한다
  (2) 현금 창출   평균 FCF 마진 = (영업현금흐름 - CAPEX) / 매출
  (3) 성장 지속성 대상 기간 중 매출 역성장 연도 수
  (4) 이익 안정성 순이익 최고점 -> 최저점 낙폭(peak-to-trough) — 분할 면역을 위해 EPS 아님
  (5) 해자        별점 - **정성 판단이라 기계가 못 낸다.** --moat 로 입력한다.

🔴 순서를 지킨다: 티어 판정은 **밸류에이션보다 먼저**다. 밸류에이션 결과를 보고 티어를
   맞추면 확증편향이다. 이 도구는 주가를 아예 읽지 않는다.

사용법:
    python3 tools/quality_tier.py AXP --moat 4
    python3 tools/quality_tier.py NVDA --moat 5 --json
    python3 tools/quality_tier.py CEG            # 해자 미입력 -> 판정 보류 + 민감도 안내
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent

# 미국 법인세 실효세율 근사. ROIC 의 NOPAT 환산용이며 티어 문턱(15%) 대비 민감도가 낮다
# (세율 21% <-> 25% 차이는 ROIC 를 5% 미만 움직인다).
TAX_RATE = 0.21

# skills/quality-tier.md 1단계 판정표의 문턱.
TH_ROIC = 15.0           # (1) >=15%
TH_FCF_MARGIN = 15.0     # (2) >=15%
TH_DECLINE_YEARS = 1     # (3) <=1회
TH_MOAT = 4              # (5) 별4+

# (4) 이익 안정성 — 깊이가 아니라 **반복성과 회복력**으로 본다.
# 깊이만 보면 COVID(2020) 한 번에 우량 기업이 전부 시클리컬로 찍힌다(2026-09-14 실측).
EPISODE_DRAWDOWN = -35.0      # 이보다 깊게 빠지면 '에피소드' 1회로 센다
FAST_RECOVERY_YEARS = 2       # 고점 회복까지 이 연수 이내면 사이클이 아니라 충격이다
HARD_T3_PROFIT_DRAWDOWN = -50.0  # 이보다 깊고 회복도 느리면(또는 미회복) 즉시 T3

REQUIRED_MOS = {"T1": "0~15%", "T2": "15~30%", "T3": "30~40%"}
MARK = {True: "OK", False: "미달", None: "데이터부족"}


def load_fetcher():
    """tools/fetch_financials.py 를 모듈로 불러온다(재사용 가능한 단일 진입점이 없어 조합한다)."""
    spec = importlib.util.spec_from_file_location("ff", REPO_ROOT / "tools" / "fetch_financials.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fetch_annual(ff, ticker: str, years: int) -> tuple[dict, str]:
    """fetch_financials 의 구성 함수를 조합해 연간 재무만 얻는다."""
    cik, name = ff.resolve_cik(ticker)
    facts = ff.http_get_json(ff.SEC_FACTS_URL.format(cik=cik), timeout=60)
    tax_key, tag_key = ff.detect_taxonomy(facts)
    currency = ff.resolve_currency(facts, tax_key, tag_key)
    annual, _tags = ff.build_annual(facts, years, tax_key, tag_key, currency)
    return annual, name


def _num(v):
    return v if isinstance(v, (int, float)) else None


def compute_axes(annual: dict) -> dict:
    """연도별 values 에서 기계 축 4개를 계산한다."""
    years = sorted(annual.keys())
    rows = [(y, annual[y].get("values", {})) for y in years]

    # (1) ROIC — 투하자본이 0 이하인 해는 버린다(의미가 없다).
    roics = []
    for _, v in rows:
        ebit = _num(v.get("operatingIncome"))
        eq = _num(v.get("equity"))
        ltd = _num(v.get("longTermDebt"))
        cash = _num(v.get("cash"))
        if ebit is None or eq is None:
            continue
        invested = eq + (ltd or 0) - (cash or 0)
        if invested <= 0:
            continue
        roics.append(ebit * (1 - TAX_RATE) / invested * 100)

    # EBIT 가 거의 안 잡히면(금융·보험에서 흔하다) ROE 로 대체하고 그 사실을 남긴다.
    roe_fallback = False
    if len(roics) < 3:
        roics = []
        for _, v in rows:
            ni, eq = _num(v.get("netIncome")), _num(v.get("equity"))
            if ni is None or eq is None or eq <= 0:
                continue
            roics.append(ni / eq * 100)
        roe_fallback = True

    # (2) FCF 마진
    fcf_margins = []
    for _, v in rows:
        ocf = _num(v.get("operatingCashFlow"))
        capex = _num(v.get("capex"))
        rev = _num(v.get("revenue"))
        if ocf is None or rev is None or rev <= 0:
            continue
        fcf_margins.append((ocf - (capex or 0)) / rev * 100)

    # (3) 매출 역성장 연도 — 연속한 연도끼리만 비교한다.
    revs = [(y, _num(v.get("revenue"))) for y, v in rows]
    revs = [(y, r) for y, r in revs if r is not None]
    decline_years = [str(revs[i][0]) for i in range(1, len(revs)) if revs[i][1] < revs[i - 1][1]]

    # (4) 이익 peak-to-trough — 고점을 경신해 온 뒤의 최대 낙폭.
    #
    # 🔴 EPS 가 아니라 **순이익(절대액)** 으로 잰다. XBRL 의 epsDiluted 는 그 해에 보고된
    # 그대로라 **액면분할 전후가 한 시계열에 섞인다** — NVDA 를 EPS 로 재면 분할(4:1, 10:1)
    # 때문에 -97% 가 나와 모든 분할 종목이 자동으로 T3 가 된다(2026-09-14 실측).
    # 이 축의 목적은 "이익이 사이클을 타는가"이고 순이익은 분할에 면역이다.
    # (주식 희석은 이 축이 아니라 quality-screen 7번 지표가 따로 본다.)
    # 🔴 깊이만 보면 안 된다. 10년 창에는 COVID(2020)가 들어 있어서, 단발 외생 충격을
    # 한 번 맞은 우량 기업이 전부 '시클리컬'로 찍힌다(2026-09-14 실측: 8종목 전부 T3).
    # 시클리컬의 정의는 "깊게 빠졌다"가 아니라 **"반복해서 빠지고, 회복이 느리다"** 이므로
    # 에피소드 수와 회복 연수를 함께 센다.
    profits = [(y, _num(v.get("netIncome"))) for y, v in rows]
    profits = [(y, p) for y, p in profits if p is not None]
    worst_dd, worst_idx = None, None
    peak, peak_idx = None, None
    episodes = []          # (시작 인덱스, 고점, 회복 인덱스 or None)
    open_ep = None
    for i, (_y, p) in enumerate(profits):
        if peak is None or p > peak:
            peak, peak_idx = p, i
        if not (peak and peak > 0):
            continue
        dd = (p / peak - 1) * 100
        if worst_dd is None or dd < worst_dd:
            worst_dd, worst_idx = dd, i
        if open_ep is None:
            if dd <= EPISODE_DRAWDOWN:          # 새 에피소드 시작
                open_ep = {"peak": peak, "peakIdx": peak_idx, "startIdx": i,
                           "recoveredIdx": None, "year": str(profits[i][0]), "ddPct": round(dd, 1)}
        else:
            if p >= open_ep["peak"]:            # 직전 고점 회복 → 에피소드 종료
                open_ep["recoveredIdx"] = i
                episodes.append(open_ep)
                open_ep = None
    if open_ep is not None:
        episodes.append(open_ep)                # 아직 회복 못 한 에피소드

    recovery_years = None
    unrecovered_years = None
    if episodes:
        worst_ep = min(episodes, key=lambda e: e["startIdx"] if worst_idx is None else abs(e["startIdx"] - worst_idx))
        if worst_ep["recoveredIdx"] is not None:
            recovery_years = worst_ep["recoveredIdx"] - worst_ep["peakIdx"]
        else:
            unrecovered_years = (len(profits) - 1) - worst_ep["startIdx"]

    return {
        "roicPct": round(sum(roics) / len(roics), 1) if roics else None,
        "roicIsRoeFallback": roe_fallback,
        "roicYears": len(roics),
        "fcfMarginPct": round(sum(fcf_margins) / len(fcf_margins), 1) if fcf_margins else None,
        "fcfYears": len(fcf_margins),
        "declineYearCount": len(decline_years) if len(revs) >= 2 else None,
        "declineYears": decline_years,
        "profitDrawdownPct": round(worst_dd, 1) if worst_dd is not None else None,
        "drawdownEpisodes": len(episodes) if profits else None,
        "episodes": [_episode_out(e, profits) for e in episodes],
        "recoveryYears": recovery_years,
        "unrecoveredYears": unrecovered_years,
        "profitYears": len(profits),
        "yearsCovered": [str(years[0]), str(years[-1])] if years else None,
    }


def _episode_out(e: dict, profits: list) -> dict:
    """에피소드 1건을 보고용으로 편다.

    회복 연수는 **급감한 해 -> 직전 고점을 되찾은 해**로 잰다. 고점 연도부터 세면
    급감 직전의 평평한 해까지 벌점이 되어(AXP 2019) 1년 만에 회복한 충격이
    '3년 걸림'으로 잡힌다.
    """
    recovered = e["recoveredIdx"] is not None
    rec_years = (e["recoveredIdx"] - e["startIdx"]) if recovered else None
    # 아직 회복 못 했어도 급감이 최근(2년 이내)이면 '느리다'고 단정하지 않는다 — 시간이 없었을 뿐이다.
    elapsed = (len(profits) - 1) - e["startIdx"]
    slow = (rec_years > FAST_RECOVERY_YEARS) if recovered else (elapsed > FAST_RECOVERY_YEARS)
    return {
        "year": e["year"],
        "ddPct": e["ddPct"],
        "recoveredYear": str(profits[e["recoveredIdx"]][0]) if recovered else None,
        "recoveryYears": rec_years,
        "slowRecovery": slow,
    }


def judge(axes: dict, moat: int | None) -> dict:
    """5개 축 -> 티어. 축별 통과 여부를 함께 돌려준다."""
    roic, fcf = axes["roicPct"], axes["fcfMarginPct"]
    dec, dd = axes["declineYearCount"], axes["profitDrawdownPct"]
    episodes = axes["episodes"]
    # 회복 연수는 에피소드별로 센다(고점 연도 -> 고점 회복 연도).
    slow = [e for e in episodes if e["slowRecovery"]]
    fast = [e for e in episodes if not e["slowRecovery"]]

    # 단발 충격인가, 구조적 사이클인가.
    #   깊은 급감이 없다                         -> 안정
    #   빠르게(2년 내) 회복한 충격이 2회 이하    -> 외생 충격(세제개편·팬데믹). 안정으로 본다
    #   회복이 느리거나 미회복인 급감이 있다     -> 시클리컬
    #   빠른 회복이어도 3회 이상 흔들렸다        -> 시클리컬(너무 자주 흔들린다)
    if axes["profitDrawdownPct"] is None:
        stability = None
    elif slow:
        stability = False
    elif len(fast) >= 3:
        stability = False
    else:
        stability = True

    checks = {
        "roic": None if roic is None else roic >= TH_ROIC,
        "fcfMargin": None if fcf is None else fcf >= TH_FCF_MARGIN,
        "decline": None if dec is None else dec <= TH_DECLINE_YEARS,
        "profitStability": stability,
        "moat": None if moat is None else moat >= TH_MOAT,
    }

    # 하드 T3: 회복하지 못할 만큼 깊게 빠졌거나, 너무 자주 흔들린다.
    # (깊이 단독으로는 하드 T3 를 걸지 않는다 — 단발 충격을 사이클로 오인하기 때문이다.)
    if slow and dd is not None and dd <= HARD_T3_PROFIT_DRAWDOWN:
        e = slow[0]
        detail = "미회복" if e["recoveredYear"] is None else f"회복에 {e['recoveryYears']}년"
        return {"tier": "T3", "checks": checks,
                "reason": f"{e['year']}년 순이익 {e['ddPct']}% 급감 후 {detail} — 조건 무관 T3"}
    if len(fast) + len(slow) >= 3:
        return {"tier": "T3", "checks": checks,
                "reason": f"35% 초과 이익 급감이 {len(fast) + len(slow)}회 — 구조적 시클리컬, 조건 무관 T3"}
    # 하드 T3 (2): 모르면 보수적으로.
    missing = [k for k, v in checks.items() if v is None]
    if missing:
        return {"tier": "T3", "checks": checks, "missing": missing,
                "reason": f"축 {', '.join(missing)} 데이터부족 — 표준상 무조건 T3(모르면 보수적으로)"}

    passed = sum(1 for v in checks.values() if v)
    if passed == 5:
        # ROE 대체는 T1 을 막는다. 레버리지를 키우면 ROE 는 올라가지만 자본 효율이
        # 좋아진 게 아니다 — 은행·카드사가 자동으로 컴파운더가 되는 구멍을 막는다.
        # (부채비율을 근거로 사람이 T1 으로 올릴 수 있다. 근거는 보고서에 남긴다.)
        if axes["roicIsRoeFallback"]:
            return {"tier": "T2", "checks": checks,
                    "reason": "5개 축 전부 충족하나 (1)이 ROE 대체 — 레버리지 효과 배제 불가로 T2 상한"}
        return {"tier": "T1", "checks": checks, "reason": "5개 축 전부 충족"}
    if passed == 4:
        return {"tier": "T2", "checks": checks,
                "reason": "5개 중 4개 충족 — 미달 축이 심각한지 사람이 확인한다"}
    return {"tier": "T3", "checks": checks, "reason": f"5개 중 {passed}개만 충족"}


def fmt(v, suffix="", digits=1):
    return "-" if v is None else f"{v:.{digits}f}{suffix}"


def main() -> None:
    ap = argparse.ArgumentParser(
        description="SEC XBRL 실적으로 퀄리티 티어를 판정 (skills/quality-tier.md 실행본)"
    )
    ap.add_argument("ticker")
    ap.add_argument("--moat", type=int, choices=[1, 2, 3, 4, 5],
                    help="해자 별점(1~5). 정성 판단이라 기계가 못 낸다 — 리서치 보고서에서 가져온다")
    ap.add_argument("--years", type=int, default=10, help="추출 연차 수 (기본 10)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    ticker = args.ticker.strip().upper()
    ff = load_fetcher()
    try:
        annual, name = fetch_annual(ff, ticker, args.years)
    except Exception as e:  # noqa: BLE001 — 네트워크·티커 오류를 한 줄로 보고
        sys.exit(f"오류: {ticker} 재무 추출 실패 ({e})")
    if not annual:
        sys.exit(f"오류: {ticker} 연간 XBRL 데이터를 찾지 못했습니다(신규 상장·미제출 가능).")

    axes = compute_axes(annual)
    verdict = judge(axes, args.moat)
    payload = {
        "ticker": ticker,
        "companyName": name,
        "yearsCovered": axes["yearsCovered"],
        "axes": axes,
        "moat": args.moat,
        **verdict,
        "requiredMos": REQUIRED_MOS[verdict["tier"]],
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False))
        return

    c = verdict["checks"]
    roic_label = "평균 ROE(대체)" if axes["roicIsRoeFallback"] else "평균 ROIC"
    span = f"{axes['yearsCovered'][0]}~{axes['yearsCovered'][1]}" if axes["yearsCovered"] else "-"
    print(f"퀄리티 티어 판정 — {ticker} ({name})")
    print(f"  대상 연도: {span}")
    print()
    print(f"  {'축':<26}{'값':>10}   {'기준':<10}판정")
    print(f"  {'-' * 60}")
    print(f"  (1) {roic_label:<22}{fmt(axes['roicPct'], '%'):>10}   {'>=15%':<10}{MARK[c['roic']]}")
    print(f"  (2) {'평균 FCF마진':<22}{fmt(axes['fcfMarginPct'], '%'):>10}   {'>=15%':<10}{MARK[c['fcfMargin']]}")
    print(f"  (3) {'매출 역성장 연도':<22}{fmt(axes['declineYearCount'], '회', 0):>10}   {'<=1회':<10}{MARK[c['decline']]}")
    print(f"  (4) {'순이익 peak-to-trough':<22}{fmt(axes['profitDrawdownPct'], '%'):>10}   {'>-35%':<10}{MARK[c['profitStability']]}")
    print(f"  (5) {'해자':<22}{(str(args.moat) + '점') if args.moat else '-':>10}   {'4점+':<10}{MARK[c['moat']]}")
    print()
    if axes["roicIsRoeFallback"]:
        print("  주의: EBIT/투하자본이 성립하지 않아 ROE로 대체했다(금융·보험에서 흔하다).")
        print("        ROE는 레버리지로 부풀 수 있으므로 부채비율을 함께 봐야 한다.")
    if axes["declineYears"]:
        print(f"  · 역성장 연도: {', '.join(axes['declineYears'])}")
    if axes["episodes"]:
        for e in axes["episodes"]:
            rec = f"{e['recoveredYear']}년 회복" if e["recoveredYear"] else "미회복"
            print(f"  · 이익 급감 에피소드: {e['year']}년 {e['ddPct']}% -> {rec}")
        print("    (일회성·외생 충격이라면 사람이 티어를 올릴 수 있다 — 근거를 보고서에 남긴다)")
    print()
    print(f"  => 티어 {payload['tier']} · 요구 MOS {payload['requiredMos']}")
    print(f"     근거: {verdict['reason']}")

    if args.moat is None:
        print()
        print("  해자(5)를 입력하면 확정된다 — 리서치 보고서의 해자 별점을 --moat 로 넘긴다.")
        mech = [c["roic"], c["fcfMargin"], c["decline"], c["profitStability"]]
        if all(v is True for v in mech):
            print("    기계 축 4개 전부 통과 -> 별4+ 면 T1, 별3 이하면 T2.")
        elif sum(1 for v in mech if v is True) == 3:
            print("    기계 축 3/4 통과 -> 별4+ 면 T2, 별3 이하면 T3.")
        else:
            print("    기계 축이 2개 이하 통과 -> 해자와 무관하게 T3.")
    print()
    print("  주의: 이 판정은 과거 실적만 본다. 주가·밸류에이션은 읽지 않는다(순서 역전 방지).")


if __name__ == "__main__":
    main()
