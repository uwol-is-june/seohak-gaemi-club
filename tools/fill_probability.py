#!/usr/bin/env python3
"""진입 밴드 체결확률(fillProbability)을 과거 낙폭 베이스레이트로 산출한다. (TASK-99)

왜 필요한가 (2026-09-10 진단):
    콜 원장의 `hold` 14건 중 12건이 밴드 상단조차 시점가보다 10~34% 아래였다.
    밴드는 있는데 "호라이즌 안에 그 가격이 올 확률"이 없으니, **닿을 리 없는 밴드도
    계획처럼 보였다**. 이 도구는 그 확률을 감이 아니라 해당 종목의 과거 실제 낙폭
    빈도로 계산한다.

계산 방법:
    과거 N년 일봉(배당·분할 조정 종가)에서, 임의의 날을 진입 시점으로 잡았을 때
    이후 H개월 안에 목표가까지의 하락률이 실현된 비율을 센다.
      - 시작일 i 마다 threshold = close[i] × (1 + 필요낙폭)
      - close[i+1 .. i+H] 의 최저가가 threshold 이하면 '체결'
      - 체결 시작일 수 / 전체 시작일 수 = 베이스레이트

    ⚠️ 과거 빈도는 미래 확률이 아니다(레짐 변화·기업 성숙도 변화). 이 값은
    "이 밴드가 상식적으로 도달 가능한 범위인가"를 거르는 **하한 점검**이지 예측이 아니다.

사용법:
    python3 tools/fill_probability.py --ticker CEG --target 185 --horizon-months 24
    python3 tools/fill_probability.py --ticker NVDA --target 172 --horizon-months 12 --json
    python3 tools/fill_probability.py --ticker AXP --target 250 --horizon-months 12 --price 344.72
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from statistics import median

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

TRADING_DAYS_PER_MONTH = 21
# 25% 미만이면 밴드가 장식이다 — 진입 계획을 재설계하라는 임계값(quality-tier.md / TASK-99).
LOW_FILL_THRESHOLD = 25.0


def to_yahoo_symbol(ticker: str) -> str:
    return ticker.strip().upper().replace(".", "-").replace(" ", "-")


def fetch_closes(ticker: str, years: int) -> list[float]:
    """Yahoo v8 chart에서 분할·배당 조정 일봉 종가를 가져온다.

    조정 종가를 쓰는 이유: 미조정 종가로 낙폭을 재면 분할이 -50% 폭락으로 잡힌다.
    """
    sym = to_yahoo_symbol(ticker)
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}"
        f"?range={years}y&interval=1d&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
        sys.exit(f"오류: {ticker} 시세를 가져오지 못했습니다 ({e}).")

    try:
        result = data["chart"]["result"][0]
    except (KeyError, IndexError, TypeError):
        sys.exit(f"오류: {ticker} 응답 형식을 해석하지 못했습니다.")

    series = None
    adj = result.get("indicators", {}).get("adjclose")
    if adj and isinstance(adj, list) and adj[0].get("adjclose"):
        series = adj[0]["adjclose"]
    else:
        quote = result.get("indicators", {}).get("quote")
        if quote and isinstance(quote, list):
            series = quote[0].get("close")
    if not series:
        sys.exit(f"오류: {ticker} 종가 시계열이 비어 있습니다.")

    return [float(c) for c in series if isinstance(c, (int, float))]


def base_rate(closes: list[float], required_drop: float, window: int) -> dict:
    """required_drop(음수, 예 -0.25)이 window 거래일 안에 실현된 시작일 비율."""
    n = len(closes)
    starts = n - window
    if starts <= 0:
        return {"samples": 0}

    hits = 0
    worst_moves: list[float] = []
    for i in range(starts):
        base = closes[i]
        if base <= 0:
            continue
        lowest = min(closes[i + 1 : i + 1 + window])
        move = lowest / base - 1.0
        worst_moves.append(move)
        if move <= required_drop:
            hits += 1

    if not worst_moves:
        return {"samples": 0}

    return {
        "samples": len(worst_moves),
        "hits": hits,
        "probability": round(hits / len(worst_moves) * 100, 1),
        "medianMaxDrawdown": round(median(worst_moves) * 100, 1),
        "worstDrawdown": round(min(worst_moves) * 100, 1),
    }


def main() -> None:
    ap = argparse.ArgumentParser(
        description="진입 밴드가 호라이즌 안에 체결될 확률을 과거 낙폭 베이스레이트로 산출"
    )
    ap.add_argument("--ticker", required=True, help="티커 (예: CEG)")
    ap.add_argument("--target", type=float, required=True,
                    help="체결 기준가(USD). 보통 진입 밴드 **상단**(가장 먼저 닿는 가격)")
    ap.add_argument("--horizon-months", type=int, required=True, help="호라이즌(개월)")
    ap.add_argument("--price", type=float,
                    help="기준 현재가(USD). 생략 시 시계열 마지막 종가 사용")
    ap.add_argument("--years", type=int, default=10, help="베이스레이트 산출 기간(년, 기본 10)")
    ap.add_argument("--json", action="store_true", help="JSON으로 출력")
    args = ap.parse_args()

    if args.horizon_months <= 0:
        sys.exit("오류: --horizon-months 는 1 이상이어야 합니다.")

    closes = fetch_closes(args.ticker, args.years)
    price = args.price if args.price is not None else closes[-1]
    if price <= 0:
        sys.exit("오류: 기준 현재가가 0 이하입니다.")

    required_drop = args.target / price - 1.0
    window = args.horizon_months * TRADING_DAYS_PER_MONTH
    stats = base_rate(closes, required_drop, window)

    years_available = round(len(closes) / 252, 1)

    if stats.get("samples", 0) == 0:
        msg = (
            f"⬛ 데이터부족: {args.ticker} 상장 이력 {years_available}년으로는 "
            f"{args.horizon_months}개월 창을 만들 수 없습니다. "
            "호라이즌을 줄이거나 fillProbability 를 ⬛로 남기고 T3 취급하세요."
        )
        if args.json:
            print(json.dumps({"ticker": args.ticker.upper(), "error": "insufficient_history",
                              "yearsAvailable": years_available}, ensure_ascii=False))
        else:
            print(msg)
        sys.exit(1)

    prob = stats["probability"]
    verdict = "장식 밴드 (재설계 필요)" if prob < LOW_FILL_THRESHOLD else "도달 가능"

    payload = {
        "ticker": args.ticker.upper(),
        "price": round(price, 4),
        "target": args.target,
        "requiredDropPct": round(required_drop * 100, 1),
        "horizonMonths": args.horizon_months,
        "lookbackYears": years_available,
        "fillProbability": prob,
        "samples": stats["samples"],
        "medianMaxDrawdownPct": stats["medianMaxDrawdown"],
        "worstDrawdownPct": stats["worstDrawdown"],
        "verdict": verdict,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False))
        return

    print(f"체결확률 — {payload['ticker']}")
    print(f"  현재가 ${payload['price']} → 목표 ${args.target} "
          f"(필요 낙폭 {payload['requiredDropPct']:+.1f}%)")
    print(f"  호라이즌 {args.horizon_months}개월 · 베이스레이트 {years_available}년 "
          f"({stats['samples']:,}개 시작일)")
    print()
    print(f"  ▶ fillProbability = {prob}%  → {verdict}")
    print()
    print(f"  참고: 같은 창에서 실현된 최대낙폭 중앙값 {payload['medianMaxDrawdownPct']}% · "
          f"역대 최악 {payload['worstDrawdownPct']}%")
    if prob < LOW_FILL_THRESHOLD:
        print()
        print(f"  🔴 {LOW_FILL_THRESHOLD}% 미만 — 이 밴드는 실행 계획이 아니라 장식이다. 셋 중 하나를 택한다:")
        print("     (a) starter      — 1차를 현재가 근처 소액 스타터로 올린다 (T1 컴파운더만)")
        print("     (b) catalyst-wait — '포지션 없음 · 촉매 대기'로 솔직히 적는다")
        print("     (c) widen-horizon — 호라이즌을 늘려 밴드를 정당화한다")
    print()
    print("  ⚠️ 과거 빈도는 미래 확률이 아니다. 레짐·기업 성숙도가 바뀌면 무너진다 —")
    print("     이 값은 예측이 아니라 '상식적으로 도달 가능한가'의 하한 점검이다.")


if __name__ == "__main__":
    main()
