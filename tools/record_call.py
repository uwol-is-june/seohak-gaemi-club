#!/usr/bin/env python3
"""콜 원장(data/calls.jsonl)에 매수/보유/회피 콜을 1줄 append한다. (TASK-38 Phase 1)

트랙레코드 피드백 루프의 기록 단계. investment-checklist / investment-team /
thesis-tracker 스킬이 buy/hold/avoid 판정을 낼 때 이 도구로 콜을 박제한다.

핵심 원칙(feedback-loop-design.md):
  - 콜 시점 값은 불변. priceAtCall 은 지금 시세를 명시적으로 fetch해 박제한다
    (모델 기억값 금지). --price 를 직접 주면 그 값을 쓰고, 없으면 Yahoo에서 가져온다.
  - append-only. 같은 id가 이미 있어도 이전 줄을 덮어쓰지 않고 새 줄을 추가한다(이력 보존).

사용법:
    python tools/record_call.py \
        --ticker AAPL --skill investment-checklist \
        --report reports/AAPL/AAPL-checklist-20260723.md \
        --call buy --conviction "★★★★☆" \
        --target-low 260 --target-high 300 --horizon-months 24 \
        --load-bearing "광의 해자 지속" "iPhone 교체주기 안정" \
        --invalidation "ROE < 15% 2분기 연속"

    # 목표가 없는 방향-only 콜(예: 단순 회피):
    python tools/record_call.py --ticker XYZ --skill quality-screen --call avoid

    # 관망(hold) 콜 — 진입 밴드가 있으면 체결확률이 필수다(TASK-99):
    python3 tools/fill_probability.py --ticker CEG --target 185 --horizon-months 24
    python tools/record_call.py --ticker CEG --skill thesis-tracker --call hold \
        --tier T2 --required-mos 25 \
        --target-low 148 --target-high 185 --horizon-months 24 \
        --fill-probability 0 --low-fill-plan catalyst-wait
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

# Windows 콘솔(cp949)에서 한글·기호(★, —) 출력 시 UnicodeEncodeError를 막는다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
LEDGER = REPO_ROOT / "data" / "calls.jsonl"

# 콜은 '포지션'이 아니라 '예측'이다. keep(보유 유지)과 hold(관망)는 정반대를 예측하므로
# 절대 섞어 쓰지 않는다 — keep 은 "이미 갖고 있고 안 떨어진다", hold 는 "아직 안 샀고 내려오길 기다린다".
VALID_CALLS = ("buy", "keep", "hold", "avoid")

# 퀄리티 티어(quality-tier.md). 요구 안전마진이 티어별로 다르므로 사후 채점을 위해 함께 박제한다.
VALID_TIERS = ("T1", "T2", "T3")

# 체결확률 임계값 — 이 아래면 밴드가 실행 계획이 아니라 장식이다(TASK-99).
LOW_FILL_THRESHOLD = 25.0
# 장식 밴드일 때 반드시 택해야 하는 대응. 셋 다 아니면 그 밴드는 기록하지 않는다.
VALID_LOW_FILL_PLANS = ("starter", "catalyst-wait", "widen-horizon")

# 이 낙폭 이상을 이 호라이즌 안에 요구하면 종목 판단이 아니라 마켓타이밍 베팅이다.
MARKET_TIMING_DROP_PCT = 20.0
MARKET_TIMING_HORIZON_MONTHS = 12


def normalize_ticker(t: str) -> str:
    """저장용 티커: 대문자, 공백 제거. (클래스주 표기는 입력 그대로 대문자화)"""
    return t.strip().upper()


def to_yahoo_symbol(ticker: str) -> str:
    """Yahoo 심볼: 클래스주 대시(BRK.B/BRK B → BRK-B). quotes 라우트와 동일 규칙."""
    return ticker.strip().upper().replace(".", "-").replace(" ", "-")


def fetch_price(ticker: str) -> float | None:
    """Yahoo v8 chart 메타에서 현재가(regularMarketPrice)를 가져온다. 실패 시 None."""
    sym = to_yahoo_symbol(ticker)
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}"
        "?range=1d&interval=1d"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None
    try:
        meta = data["chart"]["result"][0]["meta"]
    except (KeyError, IndexError, TypeError):
        return None
    price = meta.get("regularMarketPrice")
    return float(price) if isinstance(price, (int, float)) else None


def parse_fill_probability(raw: str | None) -> float | None | str:
    """--fill-probability 파싱: 0~100 숫자 | "unknown"(⬛데이터부족) | 미지정(None).

    "unknown"은 상장 이력이 짧아 베이스레이트를 낼 수 없는 경우다(도구가 그렇게 답한다).
    모르는 것을 숫자로 지어내는 대신 명시적으로 남긴다 — 대신 대응 계획은 똑같이 요구한다.
    """
    if raw is None:
        return None
    v = raw.strip().lower()
    if v == "unknown":
        return "unknown"
    try:
        num = float(v)
    except ValueError:
        sys.exit("오류: --fill-probability 는 0~100 숫자 또는 'unknown' 이어야 합니다.")
    if not 0.0 <= num <= 100.0:
        sys.exit("오류: --fill-probability 는 0~100 범위여야 합니다.")
    return num


def make_id(ticker: str, call_date: str, skill: str) -> str:
    """{티커}-{YYYYMMDD}-{skill}. 날짜의 대시는 제거."""
    return f"{ticker}-{call_date.replace('-', '')}-{skill}"


def build_call(args: argparse.Namespace) -> dict:
    ticker = normalize_ticker(args.ticker)
    call_date = args.date or date.today().isoformat()

    price = args.price
    if price is None:
        price = fetch_price(ticker)
        if price is None:
            sys.exit(
                f"오류: {ticker} 시세를 가져오지 못했습니다. "
                "--price 로 콜 시점 주가를 직접 지정하세요(불변 값)."
            )

    call = args.call.strip().lower()
    if call not in VALID_CALLS:
        sys.exit(f"오류: --call 은 {VALID_CALLS} 중 하나여야 합니다: {call}")

    tier = args.tier.strip().upper() if args.tier else None
    if tier is not None and tier not in VALID_TIERS:
        sys.exit(f"오류: --tier 는 {VALID_TIERS} 중 하나여야 합니다: {tier}")

    fill = parse_fill_probability(args.fill_probability)
    low_fill_plan = args.low_fill_plan.strip().lower() if args.low_fill_plan else None
    if low_fill_plan is not None and low_fill_plan not in VALID_LOW_FILL_PLANS:
        sys.exit(f"오류: --low-fill-plan 은 {VALID_LOW_FILL_PLANS} 중 하나여야 합니다: {low_fill_plan}")

    row: dict = {
        "id": make_id(ticker, call_date, args.skill),
        "ticker": ticker,
        "date": call_date,
        "skill": args.skill,
        "call": call,
        "priceAtCall": round(float(price), 4),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
    }
    if args.report:
        row["report"] = args.report
    if args.conviction:
        row["conviction"] = args.conviction
    if args.reason:
        row["reason"] = args.reason
    if tier:
        row["tier"] = tier
    if args.required_mos is not None:
        row["requiredMosPct"] = args.required_mos

    # 목표가 밴드(선택): low/high/horizon 중 하나라도 주어지면 target 블록 생성.
    if args.target_low is not None or args.target_high is not None or args.horizon_months is not None:
        target: dict = {}
        if args.target_low is not None:
            target["low"] = args.target_low
        if args.target_high is not None:
            target["high"] = args.target_high
        if args.horizon_months is not None:
            target["horizonMonths"] = args.horizon_months
        # 분할 진입 래더(선택). low~high 두 숫자만으로는 "얼마부터 순차적으로 사는가"를
        # 알 수 없어 대시보드 밴드 열이 실행 불가능한 정보가 된다 — 차수별 원문을 그대로 싣는다.
        # 자유 문자열로 두는 이유: 차수 수·비중 표기(25% / 1/3)·AND 조건이 종목마다 달라
        # 스키마를 고정하면 표현을 잃는다. 형식은 "N차 ≤$가격 (비중) — AND 조건".
        if args.tranche:
            target["tranches"] = args.tranche
        if args.no_chase is not None:
            target["noChaseAbove"] = args.no_chase
        if fill is not None:
            # "unknown"은 문자열 그대로 박제한다 — 0% 로 뭉개면 "확률이 0"과 구분이 사라진다.
            target["fillProbability"] = fill
        if low_fill_plan:
            target["lowFillPlan"] = low_fill_plan
        row["target"] = target

        _check_band_gates(call, price, target, fill, low_fill_plan, ticker)

    if args.load_bearing:
        row["loadBearing"] = args.load_bearing
    if args.invalidation:
        row["invalidation"] = args.invalidation
    return row


def _check_band_gates(
    call: str,
    price: float,
    target: dict,
    fill: float | None | str,
    low_fill_plan: str | None,
    ticker: str,
) -> None:
    """밴드/호라이즌 정합성 게이트 (TASK-99).

    2026-09-10 진단: `hold` 14건 중 12건이 밴드 상단조차 시점가보다 10~34% 아래였다.
    체결확률이 필드에 없으니 **닿을 리 없는 밴드도 계획처럼 보였다**. 여기서 막는다.
    """
    high = target.get("high")
    horizon = target.get("horizonMonths")

    # 게이트 1: 관망 콜에 진입 밴드가 있으면 체결확률은 필수다.
    if call == "hold" and high is not None and fill is None:
        sys.exit(f"""오류: `hold` 콜에 진입 밴드가 있으면 --fill-probability 가 필수입니다.
  먼저 베이스레이트를 산출하세요:
    python3 tools/fill_probability.py --ticker {ticker} --target {high} --horizon-months {horizon or 12} --price {price}
  그 출력의 fillProbability 를 --fill-probability 로 넘깁니다(이력 부족이면 'unknown').""")

    # 게이트 2: 체결확률이 임계값 미만(또는 unknown)이면 대응 계획을 반드시 택한다.
    if high is not None:
        is_low = (fill == "unknown") or (isinstance(fill, float) and fill < LOW_FILL_THRESHOLD)
        if is_low and not low_fill_plan:
            shown = "unknown" if fill == "unknown" else f"{fill}%"
            sys.exit(f"""오류: 체결확률 {shown} — 이 밴드는 실행 계획이 아니라 장식입니다.
  --low-fill-plan 으로 대응을 명시하세요:
    starter        1차를 현재가 근처 소액 스타터로 올린다 (T1 컴파운더만)
    catalyst-wait  '포지션 없음 · 촉매 대기'로 솔직히 적는다
    widen-horizon  호라이즌을 늘려 밴드를 정당화한다""")

    # 게이트 3: 짧은 호라이즌 + 큰 낙폭 요구 = 종목 판단이 아니라 마켓타이밍 베팅이다(경고).
    if call == "hold" and high is not None and price > 0:
        drop_pct = (1.0 - high / price) * 100.0
        if drop_pct >= MARKET_TIMING_DROP_PCT and (horizon or 0) <= MARKET_TIMING_HORIZON_MONTHS:
            print(f"""⚠️ 경고: 밴드 상단까지 {drop_pct:.0f}% 하락이 필요한데 호라이즌이 {horizon or '?'}개월입니다.
   이건 종목 판단이 아니라 시장 전체 조정에 거는 마켓타이밍 베팅입니다. 논제에 그렇게 적혀 있는지 확인하세요.""")


def append_call(row: dict) -> None:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    # append-only: 같은 id가 있으면 경고만 하고 그대로 추가(이력 보존).
    if LEDGER.exists():
        # 깨진 줄 하나 때문에 신규 콜 기록이 실패하지 않도록 per-line 으로 안전 파싱한다(TASK-64).
        dup = False
        for line in LEDGER.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                if json.loads(line).get("id") == row["id"]:
                    dup = True
                    break
            except json.JSONDecodeError:
                continue
        if dup:
            print(f"주의: 같은 id({row['id']})의 콜이 이미 있습니다. 이력 보존을 위해 새 줄로 추가합니다.")
    with LEDGER.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="콜 원장에 매수/보유/회피 콜을 append")
    ap.add_argument("--ticker", required=True, help="티커 (예: AAPL)")
    ap.add_argument("--skill", required=True, help="콜을 낸 스킬 (예: investment-checklist)")
    ap.add_argument(
        "--call",
        required=True,
        help="buy(매수) | keep(보유 유지) | hold(관망·진입 대기) | avoid(회피)",
    )
    ap.add_argument("--date", help="콜 시점 YYYY-MM-DD (기본: 오늘)")
    ap.add_argument("--report", help="근거 보고서 경로 (예: reports/AAPL/AAPL-checklist-20260723.md)")
    ap.add_argument("--conviction", help="확신도/신뢰도 (예: ★★★★☆)")
    ap.add_argument("--reason", help="이 콜을 낸 사유 (예: 목표가 대비 고평가라 진입 대기)")
    ap.add_argument("--price", type=float, help="콜 시점 주가(USD). 생략 시 Yahoo에서 fetch")
    ap.add_argument("--target-low", type=float, help="목표가 밴드 하단(USD)")
    ap.add_argument("--target-high", type=float, help="목표가 밴드 상단(USD)")
    ap.add_argument("--horizon-months", type=int, help="목표 도달 기간(개월)")
    ap.add_argument("--tranche", nargs="*", action="extend", default=None,
                    help='분할 진입 래더 — 차수별로 하나씩. '
                         '예: --tranche "1차 ≤$185 (25%%) — 계약화 비율 60%%+ 공시" "2차 ≤$165 (35%%)"')
    ap.add_argument("--no-chase", type=float, default=None,
                    help="추격 금지선(USD). 이 가격을 넘으면 어떤 차수도 활성화되지 않는다")
    ap.add_argument("--tier", default=None,
                    help="퀄리티 티어 T1|T2|T3 (skills/quality-tier.md). 요구 MOS가 티어별로 "
                         "다르므로 사후 채점을 위해 함께 박제한다")
    ap.add_argument("--required-mos", type=float, default=None,
                    help="티어별 요구 안전마진(%%). T1 0~15 · T2 15~30 · T3 30~40")
    ap.add_argument("--fill-probability", default=None,
                    help="진입 밴드가 호라이즌 안에 체결될 확률(%%) 또는 'unknown'. "
                         "python3 tools/fill_probability.py 로 산출한다. "
                         "`hold` + 밴드면 필수")
    ap.add_argument("--low-fill-plan", default=None,
                    help="체결확률 25%% 미만일 때의 대응: starter | catalyst-wait | widen-horizon")
    # action="extend" — 한 플래그에 값 여러 개(`--load-bearing "A" "B"`)도, 플래그 반복
    # (`--load-bearing "A" --load-bearing "B"`)도 모두 누적된다. nargs="*" 단독이면 플래그를
    # 반복했을 때 앞의 값이 **조용히 덮어써져 마지막 1개만 남는다**(실측: NVDA 콜 2건에서
    # 가정 5개·레드라인 8개가 각각 1개로 잘렸다). default=None 은 argparse 가 기본 리스트를
    # 프로세스 간 재사용하는 함정을 피하기 위한 것이다.
    ap.add_argument("--load-bearing", nargs="*", action="extend", default=None,
                    help="핵심 가정(⚑)들 — 값 여러 개 또는 플래그 반복 모두 누적됨")
    ap.add_argument("--invalidation", nargs="*", action="extend", default=None,
                    help="무효화/레드라인 조건들 — 값 여러 개 또는 플래그 반복 모두 누적됨")
    args = ap.parse_args()

    row = build_call(args)
    append_call(row)
    tgt = ""
    if "target" in row:
        t = row["target"]
        tgt = f" · 목표 {t.get('low', '?')}~{t.get('high', '?')} ({t.get('horizonMonths', '?')}M)"
        if "fillProbability" in t:
            fp = t["fillProbability"]
            tgt += f" · 체결확률 {fp if fp == 'unknown' else str(fp) + '%'}"
        if "lowFillPlan" in t:
            tgt += f" · 대응 {t['lowFillPlan']}"
    tier_s = f" · {row['tier']}" if "tier" in row else ""
    if "requiredMosPct" in row:
        tier_s += f"(요구 MOS {row['requiredMosPct']}%)"
    print(f"기록 완료: {row['id']} — {row['call']}{tier_s} @ ${row['priceAtCall']}{tgt}")
    print(f"  → {LEDGER.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
