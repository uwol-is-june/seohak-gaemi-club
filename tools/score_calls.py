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

# 기회비용 채점의 기준선(TASK-100). "안 샀으면 그 돈이 있었을 곳"은 현금이 아니라 시장이다.
# dashboard/lib/calls.ts 의 BENCHMARK_TICKER 와 같아야 한다.
BENCHMARK_TICKER = "SPY"


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


def dedupe_calls(calls: list[dict]) -> list[dict]:
    """같은 콜이 두 줄 이상이면 최신 1건만 남긴다 (TASK-104).

    원장은 append-only 라서 같은 스킬을 같은 날 다시 돌리면 같은 id 로 한 줄이 더 쌓인다
    (record_call.py 는 경고만 하고 이력 보존을 위해 추가한다). 그대로 채점하면 그 판단이
    두 번 세어져 적중률·기회비용 분모가 왜곡된다.

    🔴 키는 id(= 티커-날짜-스킬)다. **같은 날 다른 스킬이 낸 콜은 중복이 아니다** —
    서로 다른 판단이고, 그 불일치를 드러내는 것이 논제 충돌 판정의 목적이다.

    dashboard/lib/calls.ts 의 dedupeCalls 와 같은 규칙이어야 한다.
    """
    latest: dict[str, dict] = {}
    for c in calls:
        cid = c.get("id")
        if not cid:
            continue
        prev = latest.get(cid)
        # recordedAt 최신이 정정본. 동률(둘 다 없음 포함)이면 나중 줄을 남긴다.
        if prev is None or (c.get("recordedAt") or "") >= (prev.get("recordedAt") or ""):
            latest[cid] = c
    return list(latest.values())


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


def fetch_benchmark_series(years: int = 5) -> list[tuple[int, float]] | None:
    """벤치마크 일별 조정종가 [(unix_ts, close)]. 실패하면 None(0으로 뭉개지 않는다)."""
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{BENCHMARK_TICKER}"
        f"?range={years}y&interval=1d&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        result = data["chart"]["result"][0]
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError,
            ValueError, KeyError, IndexError, TypeError):
        return None

    ts = result.get("timestamp") or []
    adj = (result.get("indicators", {}).get("adjclose") or [{}])[0].get("adjclose")
    raw = (result.get("indicators", {}).get("quote") or [{}])[0].get("close")
    series = adj if isinstance(adj, list) else raw
    if not isinstance(ts, list) or not isinstance(series, list) or len(ts) != len(series):
        return None

    # 결측 종가(휴장·공백)는 버린다 — 그대로 두면 인덱스가 어긋난다.
    out = [
        (int(t), float(c))
        for t, c in zip(ts, series)
        if isinstance(t, (int, float)) and isinstance(c, (int, float))
    ]
    return out if len(out) >= 2 else None


def benchmark_return_since(series: list[tuple[int, float]] | None, call_date: str) -> float | None:
    """콜 시점부터 지금까지의 벤치마크 수익률(%).

    콜 당일이 휴장이면 직전 거래일 종가를 쓴다(그날 살 수 있었던 마지막 가격).
    시계열 시작보다 오래된 콜은 기준선이 없으므로 None — 0으로 뭉개지 않는다.
    """
    if not series:
        return None
    try:
        d = datetime.strptime(call_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None
    cutoff = int(d.timestamp()) + 86_399  # 그날 장 마감까지 포함

    at = None
    for t, c in reversed(series):
        if t <= cutoff:
            at = c
            break
    if at is None or at <= 0:
        return None
    now = series[-1][1]
    return (now - at) / at * 100.0


def score_benchmark(call_type: str, return_pct: float | None,
                    benchmark_return_pct: float | None) -> dict:
    """벤치마크 대비 채점 (TASK-100) — dashboard/lib/calls.ts scoreBenchmark 와 동일 규칙.

    기존 채점은 밴드 터치만 봤다. `hold` 걸어두고 주가가 +30% 도망가도 손실로 잡히지
    않아 **"안 사서 잃은 것"이 트랙레코드에서 보이지 않았다**(2026-09-10 진단).

    콜별 반사실과 적중 조건:
      buy/keep   샀다/계속 보유 ↔ SPY  → 종목이 SPY 를 초과해야 적중
      hold/avoid 관망/회피      ↔ SPY  → 종목이 SPY 에 미달해야 적중(안 산 게 이득)
    초과수익 정확히 0은 우위가 실증되지 않은 것이라 적중으로 치지 않는다.
    """
    if benchmark_return_pct is None or return_pct is None:
        return {
            "benchmarkReturnPct": benchmark_return_pct,
            "excessReturnPct": None,
            "benchmarkHit": None,
            "opportunityCostPct": None,
        }
    excess = return_pct - benchmark_return_pct
    wants_upside = call_type in ("buy", "keep")
    hit = excess > 0 if wants_upside else excess < 0
    return {
        "benchmarkReturnPct": benchmark_return_pct,
        "excessReturnPct": excess,
        "benchmarkHit": hit,
        # "이 판단 때문에 포기한 상대수익(pp)". 적중이면 0 — 포기한 게 없다.
        "opportunityCostPct": 0.0 if hit else abs(excess),
    }


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
    # 벤치마크 집계는 확정 콜 중 **초과수익이 계산된 것**만 분모로 쓴다.
    # (시세·시계열 결측을 0으로 뭉개면 적중률이 왜곡된다.)
    with_bm = [s for s in resolved if isinstance(s.get("excessReturnPct"), (int, float))]
    bm_hits = sum(1 for s in with_bm if s.get("benchmarkHit") is True)
    bm_lo, bm_hi = wilson_interval(bm_hits, len(with_bm))
    excesses = [s["excessReturnPct"] for s in with_bm]
    # 관망(hold)이 포기한 상대수익 — 보수성 편향의 직접 지표.
    hold_resolved = [s for s in with_bm if s.get("call") == "hold"]
    hold_costs = [s["opportunityCostPct"] for s in hold_resolved
                  if isinstance(s.get("opportunityCostPct"), (int, float))]
    # 진행중 관망의 **잠정** 기회비용 — 호라이즌 12~24M 을 다 기다리면 편향을 못 본다.
    running_hold = [s for s in scored
                    if s.get("call") == "hold" and s.get("status") == "진행중"
                    and isinstance(s.get("opportunityCostPct"), (int, float))]
    running_costs = [s["opportunityCostPct"] for s in running_hold]

    return {
        "resolvedCount": n,
        "directionHits": hits,
        "directionHitRate": (hits / n) if n else None,
        "ci95": [lo, hi],
        "avgTargetErrorPct": (sum(errs) / len(errs)) if errs else None,
        "inProgress": sum(1 for s in scored if s["status"] == "진행중"),
        "unknown": sum(1 for s in scored if s["status"] == "unknown"),
        "smallSample": n < 10,
        "benchmarkResolvedCount": len(with_bm),
        "benchmarkHits": bm_hits,
        "benchmarkHitRate": (bm_hits / len(with_bm)) if with_bm else None,
        "benchmarkCi95": [bm_lo, bm_hi],
        "avgExcessReturnPct": (sum(excesses) / len(excesses)) if excesses else None,
        "holdOpportunityCostAvgPct": (sum(hold_costs) / len(hold_costs)) if hold_costs else None,
        "holdResolvedCount": len(hold_resolved),
        "inProgressHoldOpportunityCostAvgPct": (sum(running_costs) / len(running_costs)) if running_costs else None,
        "inProgressHoldCount": len(running_hold),
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
    bm_rate = agg.get("benchmarkHitRate")
    if bm_rate is not None:
        blo, bhi = agg["benchmarkCi95"]
        print(f"{BENCHMARK_TICKER} 대비 적중률(확정 {agg['benchmarkResolvedCount']}콜): {bm_rate*100:.0f}% "
              f"[{agg['benchmarkHits']}/{agg['benchmarkResolvedCount']}] · 95% CI {blo*100:.0f}~{bhi*100:.0f}%")
        print(f"  (buy/keep 은 {BENCHMARK_TICKER} 초과가 적중, hold/avoid 는 미달이 적중 — 안 산 게 이득이었나)")
    if agg.get("avgExcessReturnPct") is not None:
        print(f"평균 초과수익: {agg['avgExcessReturnPct']:+.1f}pp")
    if agg.get("holdOpportunityCostAvgPct") is not None:
        print(f"관망(hold) 평균 기회비용: {agg['holdOpportunityCostAvgPct']:.1f}pp "
              f"(확정 {agg['holdResolvedCount']}건) — 기다리느라 포기한 상대수익")
    if agg.get("inProgressHoldOpportunityCostAvgPct") is not None:
        print(f"관망(hold) 잠정 기회비용: {agg['inProgressHoldOpportunityCostAvgPct']:.1f}pp "
              f"(진행중 {agg['inProgressHoldCount']}건) — 확정 전 참고치")
    if agg["smallSample"]:
        print("⚠️ 표본이 작습니다(<10). 적중률은 성과가 아니라 규율 신호로만 해석하세요.")


def main() -> None:
    ap = argparse.ArgumentParser(description="콜 원장을 Yahoo 시세로 채점")
    ap.add_argument("--json", action="store_true", help="JSON으로 출력")
    args = ap.parse_args()

    calls = dedupe_calls(load_calls())
    today = datetime.now(timezone.utc).date()
    # 티커별 시세는 한 번씩만 fetch(중복 콜 절약).
    tickers = {c.get("ticker") for c in calls if c.get("ticker")}
    prices = {t: fetch_price(t) for t in tickers}
    # 벤치마크 시계열은 콜 수와 무관하게 1건. 같은 날짜 콜이 많아 날짜별로 캐시한다.
    benchmark = fetch_benchmark_series()
    bm_by_date: dict[str, float | None] = {}

    scored = []
    for c in calls:
        sc = score_call(c, prices.get(c.get("ticker")), today)
        d = sc.get("date") or ""
        if d not in bm_by_date:
            bm_by_date[d] = benchmark_return_since(benchmark, d)
        # 벤치마크 채점은 score_call 밖에서 얹는다 — 그래야 채점 파리티 픽스처
        # (data/test/call-scoring-fixtures.json)가 이 필드에 영향받지 않는다.
        sc.update(score_benchmark(sc.get("call"), sc.get("returnPct"), bm_by_date[d]))
        scored.append(sc)

    agg = aggregate(scored)

    if args.json:
        print(json.dumps({"calls": scored, "aggregate": agg}, ensure_ascii=False, indent=2))
    else:
        print_table(scored, agg)


if __name__ == "__main__":
    main()
