#!/usr/bin/env python3
"""콜 원장(data/calls.jsonl)을 외부 실측(Yahoo 시세)으로 채점한다. (TASK-38 Phase 2)

자기신고가 아닌 외부 대조가 핵심 — 시스템이 체계적으로 틀리는지 학습하는 장치.
콜 시점가(priceAtCall, 불변)와 현재가를 비교해 방향 적중 / 목표 도달 / 목표 오차 /
경과·신선도를 계산하고, 확정(horizon 경과) 콜 기준 방향 적중률을 집계한다.

원칙(feedback-loop-design.md §0):
  - 채점 기준은 외부 시세(Yahoo). 모델 자기평가 금지.
  - 채점 불가(시세 없음/상폐)는 unknown 으로 남긴다.
  - horizon 미도달 콜은 '진행 중'(provisional). 확정 콜만 적중률 분모에 넣는다.
  - 적중률은 표본이 작을 때 규율 신호일 뿐 — 신뢰구간·표본수 함께 표기.

사용법:
    python tools/score_calls.py            # 표로 출력
    python tools/score_calls.py --json     # 기계 판독용 JSON
"""
from __future__ import annotations

import argparse
import calendar
import json
import math
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
LEDGER = REPO_ROOT / "data" / "calls.jsonl"

DAYS_PER_MONTH = 30.44

# 방향 판정의 '의미 있는 움직임' 문턱(%). keep 은 하방만, hold 는 양방향으로 본다.
# dashboard/lib/calls.ts 의 DRIFT_TOLERANCE_PCT 와 반드시 같은 값이어야 한다.
DRIFT_TOLERANCE_PCT = 10

# horizon 미명시 콜의 최소 확정 대기일(TASK-44). 콜 당일 하루 등락으로 즉시 확정돼
# 트랙레코드가 오염되는 것을 막는다. dashboard/lib/calls.ts 의 MIN_RESOLVE_DAYS 와 같아야 한다.
MIN_RESOLVE_DAYS = 30


def to_yahoo_symbol(ticker: str) -> str:
    return ticker.strip().upper().replace(".", "-").replace(" ", "-")


def fetch_price(ticker: str) -> float | None:
    sym = to_yahoo_symbol(ticker)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=1d&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        meta = data["chart"]["result"][0]["meta"]
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError,
            ValueError, KeyError, IndexError, TypeError):
        return None
    price = meta.get("regularMarketPrice")
    return float(price) if isinstance(price, (int, float)) else None


def add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    day = min(d.day, calendar.monthrange(y, m)[1])
    return date(y, m, day)


def load_calls() -> list[dict]:
    if not LEDGER.exists():
        return []
    calls = []
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            calls.append(json.loads(line))
        except json.JSONDecodeError:
            print(f"경고: 파싱 불가한 원장 줄을 건너뜁니다: {line[:60]}...", file=sys.stderr)
    return calls


def score_call(call: dict, now_price: float | None, today: date) -> dict:
    """콜 하나를 채점. now_price 가 None이면 대부분 필드가 unknown."""
    price_at = call.get("priceAtCall")
    call_type = call.get("call")
    try:
        call_date = date.fromisoformat(call["date"])
    except (KeyError, ValueError):
        call_date = today
    elapsed_days = (today - call_date).days

    target = call.get("target") or {}
    horizon_months = target.get("horizonMonths")
    # 0 은 유효한 horizon 이므로 truthiness 대신 명시적 None 검사(TASK-44).
    if not isinstance(horizon_months, (int, float)) or isinstance(horizon_months, bool):
        horizon_months = None
    horizon_end = add_months(call_date, int(horizon_months)) if horizon_months is not None else None
    horizon_elapsed = bool(horizon_end and today >= horizon_end)
    horizon_progress = None
    if horizon_months is not None and horizon_months > 0:
        horizon_progress = max(0.0, min(elapsed_days / (horizon_months * DAYS_PER_MONTH), 1.0))

    result: dict = {
        "id": call.get("id"),
        "ticker": call.get("ticker"),
        "call": call_type,
        "date": call.get("date"),
        "priceAtCall": price_at,
        "priceNow": now_price,
        "elapsedDays": elapsed_days,
        "horizonMonths": horizon_months,
        "horizonProgress": horizon_progress,
        "horizonElapsed": horizon_elapsed,
        "directionHit": None,      # True/False/None(unknown)
        "returnPct": None,         # 콜 이후 수익률(%)
        "targetReached": None,
        "targetErrorPct": None,
        "status": "unknown",       # 진행중 | 적중 | 빗나감 | unknown
        "invalidation": call.get("invalidation", []),
    }

    if now_price is None or not isinstance(price_at, (int, float)) or price_at == 0:
        return result

    ret = (now_price - price_at) / price_at * 100
    result["returnPct"] = ret

    low, high = target.get("low"), target.get("high")
    mid = None
    if isinstance(low, (int, float)) and isinstance(high, (int, float)):
        mid = (low + high) / 2
    elif isinstance(low, (int, float)):
        mid = low
    elif isinstance(high, (int, float)):
        mid = high

    # 방향 적중 — 콜은 '포지션'이 아니라 '예측'이고, keep 과 hold 는 정반대를 예측한다:
    #   buy   상승
    #   keep  보유 유지가 옳았나 = 의미 있는 하락이 없었나(상방은 무제한 허용)
    #   hold  관망이 옳았나 = 기다린 진입 밴드로 내려왔나(밴드 없으면 ±문턱 횡보)
    #   avoid 하락
    if call_type == "buy":
        result["directionHit"] = now_price > price_at
    elif call_type == "avoid":
        result["directionHit"] = now_price < price_at
    elif call_type == "keep":
        result["directionHit"] = ret >= -DRIFT_TOLERANCE_PCT
    elif call_type == "hold":
        if isinstance(low, (int, float)) and isinstance(high, (int, float)):
            result["directionHit"] = low <= now_price <= high
        else:
            result["directionHit"] = abs(ret) <= DRIFT_TOLERANCE_PCT

    # 목표 도달·오차
    if isinstance(low, (int, float)) and isinstance(high, (int, float)):
        result["targetReached"] = low <= now_price <= high
    # mid == 0 은 '목표 없음'이 아니라 목표가 0 — 나눗셈 방지 겸 의도 명시(TASK-72, calls.ts와 동일).
    if mid is not None and mid != 0:
        result["targetErrorPct"] = (now_price - mid) / mid * 100

    # 상태(TASK-44): horizon 있으면 미경과=진행중, 경과=적중/빗나감.
    # horizon 없으면 최소 대기일 전엔 진행중(당일 확정 오염 방지), 이후 방향으로 확정.
    if horizon_months is not None:
        if not horizon_elapsed:
            result["status"] = "진행중"
        elif result["directionHit"] is True:
            result["status"] = "적중"
        elif result["directionHit"] is False:
            result["status"] = "빗나감"
    elif elapsed_days < MIN_RESOLVE_DAYS:
        result["status"] = "진행중"
    elif result["directionHit"] is True:
        result["status"] = "적중"
    elif result["directionHit"] is False:
        result["status"] = "빗나감"
    return result


def wilson_interval(hits: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """이항 적중률의 Wilson 신뢰구간(95%). 작은 표본에서 과대해석 방지용."""
    if n == 0:
        return (0.0, 0.0)
    p = hits / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, center - margin), min(1.0, center + margin))


def aggregate(scored: list[dict]) -> dict:
    """확정(horizon 경과 or horizon 없이 최소 대기일 경과) 콜 기준 방향 적중률 집계."""
    resolved = [s for s in scored if s["status"] in ("적중", "빗나감")]
    hits = sum(1 for s in resolved if s["directionHit"] is True)
    n = len(resolved)
    lo, hi = wilson_interval(hits, n)
    errs = [s["targetErrorPct"] for s in resolved if s["targetErrorPct"] is not None]
    return {
        "resolvedCount": n,
        "directionHits": hits,
        "directionHitRate": (hits / n) if n else None,
        "ci95": [lo, hi],
        "avgTargetErrorPct": (sum(errs) / len(errs)) if errs else None,
        "inProgress": sum(1 for s in scored if s["status"] == "진행중"),
        "unknown": sum(1 for s in scored if s["status"] == "unknown"),
        "smallSample": n < 10,
    }


def fmt_pct(v, digits=1):
    return f"{v:+.{digits}f}%" if isinstance(v, (int, float)) else "—"


def print_table(scored: list[dict], agg: dict) -> None:
    print("=" * 78)
    print("콜 트랙레코드 — 외부 실측(Yahoo) 채점")
    print("=" * 78)
    if not scored:
        print("원장이 비어 있습니다 (data/calls.jsonl). 콜이 기록되면 여기 나타납니다.")
        return
    header = f"{'티커':<8}{'콜':<6}{'시점가':>9}{'현재가':>9}{'수익률':>9}{'경과':>7}  {'상태'}"
    print(header)
    print("-" * 78)
    for s in scored:
        pa = f"${s['priceAtCall']:.2f}" if isinstance(s["priceAtCall"], (int, float)) else "—"
        pn = f"${s['priceNow']:.2f}" if isinstance(s["priceNow"], (int, float)) else "—"
        el = f"{s['elapsedDays']}d"
        mark = {"적중": "✅", "빗나감": "❌", "진행중": "⏳", "unknown": "❔"}.get(s["status"], "")
        print(f"{s['ticker']:<8}{s['call']:<6}{pa:>9}{pn:>9}{fmt_pct(s['returnPct']):>9}{el:>7}  {mark} {s['status']}")
    print("-" * 78)
    rate = agg["directionHitRate"]
    if rate is not None:
        lo, hi = agg["ci95"]
        print(f"방향 적중률(확정 {agg['resolvedCount']}콜): {rate*100:.0f}% "
              f"[{agg['directionHits']}/{agg['resolvedCount']}] · 95% CI {lo*100:.0f}~{hi*100:.0f}%")
    else:
        print(f"방향 적중률: 확정 콜 없음 (진행중 {agg['inProgress']}, 미채점 {agg['unknown']})")
    if agg["avgTargetErrorPct"] is not None:
        print(f"평균 목표 오차: {agg['avgTargetErrorPct']:+.1f}%")
    if agg["smallSample"]:
        print("⚠️ 표본이 작습니다(<10). 적중률은 성과가 아니라 규율 신호로만 해석하세요.")


def main() -> None:
    ap = argparse.ArgumentParser(description="콜 원장을 Yahoo 시세로 채점")
    ap.add_argument("--json", action="store_true", help="JSON으로 출력")
    args = ap.parse_args()

    calls = load_calls()
    today = datetime.now(timezone.utc).date()
    # 티커별 시세는 한 번씩만 fetch(중복 콜 절약).
    tickers = {c.get("ticker") for c in calls if c.get("ticker")}
    prices = {t: fetch_price(t) for t in tickers}
    scored = [score_call(c, prices.get(c.get("ticker")), today) for c in calls]
    agg = aggregate(scored)

    if args.json:
        print(json.dumps({"calls": scored, "aggregate": agg}, ensure_ascii=False, indent=2))
    else:
        print_table(scored, agg)


if __name__ == "__main__":
    main()
