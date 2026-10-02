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
        --tier T2 --required-mos 15 \
        --target-low 148 --target-high 185 --horizon-months 24 \
        --fill-probability 0 --low-fill-plan catalyst-wait
"""
from __future__ import annotations

import argparse
import json
import re
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

# 티어별 요구 안전마진 범위(%) — skills/quality-tier.md. 범위 밖이면 티어 판정과 MOS 가 어긋난 것이다.
# 2026-10-02 보정(TASK-177): T1 0~15 → 0~10 · T2 15~30 → 10~20 · T3 유지.
TIER_MOS_RANGE = {"T1": (0.0, 10.0), "T2": (10.0, 20.0), "T3": (30.0, 40.0)}
# 외부 적정가 교차점검(TASK-175) — tools/external_value.py 와 같은 경계.
VALID_EXT_SOURCES = ("morningstar", "analystPV")
EXT_GAP_LOW = 0.75
EXT_GAP_HIGH = 1.25

# 논제(건강도)를 다루는 스킬 — 이 스킬의 콜이나 keep/hold 콜은 --health 가 빠지면 경고한다.
THESIS_SKILLS = ("thesis-tracker", "investment-team", "investment-checklist")

# 래더 한 줄의 허용 형식(TASK-143) — dashboard/lib/tranche.ts 의 PRICE_RE · LADDER_NOTE_RE 와 같다.
#   ① 가격이 있는 차수:  "1차 ≤$185 (25%) — AND 조건"
#   ② 래더 공통조건:     "AND: ADR 프리미엄 레인지 하단"
# 둘 다 아닌 자유 서술은 래더 파서가 아무것도 못 건져 화면에 안 그려진다.
TRANCHE_PRICE_RE = re.compile(r"\$\s*([0-9][\d,]*(?:\.\d+)?)")
TRANCHE_NOTE_RE = re.compile(r"^AND\s*[:：]", re.IGNORECASE)

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


def parse_call_date(raw: str | None, price: float | None) -> str:
    """--date 검증(TASK-142). 형식이 틀리면 원장 채점이 전부 NaN/폴백으로 흐른다.

    과거 날짜에 --price 가 없으면 **오늘 시세가 과거 시점가로 박제된다** — 콜의 불변 값이
    처음부터 틀린 채로 들어가므로 막는다. 미래 날짜는 존재할 수 없는 콜이다.
    """
    today = date.today()
    if raw is None:
        return today.isoformat()
    try:
        d = date.fromisoformat(raw.strip())
    except ValueError:
        sys.exit(f"오류: --date 는 YYYY-MM-DD 형식이어야 합니다: {raw}")
    if d > today:
        sys.exit(f"오류: --date {d} 는 미래입니다(오늘 {today}).")
    if d < today and price is None:
        sys.exit(f"""오류: 과거 날짜({d}) 콜에는 --price 가 필수입니다.
  생략하면 오늘 시세가 그날의 시점가로 박제됩니다(불변 값 오염). 그날 종가를 직접 넘기세요.""")
    return d.isoformat()


def validate_tranches(tranches: list[str] | None) -> None:
    """래더 줄 형식 검사(TASK-143) — 사후 tranche.test.ts 가 아니라 기록 시점에 막는다."""
    for t in tranches or []:
        text = (t or "").strip()
        if TRANCHE_NOTE_RE.match(text) or TRANCHE_PRICE_RE.search(text):
            continue
        sys.exit(f"""오류: --tranche "{text}" 는 래더로 읽을 수 없습니다.
  한 줄은 ①가격이 있는 차수이거나 ②'AND:' 로 시작하는 공통조건이어야 합니다.
    예) "1차 ≤$185 (25%) — AND 계약화 60%+ 공시"   "AND: ADR 프리미엄 4주+ 레인지 하단"
  자유 서술(예: "잔여는 조정 시 분할")은 --reason 이나 논제 파일에 적으세요.""")


# 건강도 근거(TASK-167) — "조건 | 상태". 상태 어휘는 셋뿐이다: 충족 · 미충족 · 미정.
# 한글·영문·기호 어느 쪽으로 적어도 같은 값으로 박제한다(대시보드는 met/unmet/pending 만 읽는다).
HEALTH_CHECK_STATUS = {
    "met": "met", "충족": "met", "달성": "met", "✅": "met", "o": "met",
    "unmet": "unmet", "미충족": "unmet", "미달성": "unmet", "❌": "unmet", "x": "unmet",
    "pending": "pending", "미정": "pending", "확인중": "pending", "⏳": "pending", "?": "pending",
}


def parse_health_checks(raw: list[str] | None) -> list[dict] | None:
    """`--health-check "조건 | 상태"` 들을 [{cond, status}] 로. 형식이 틀리면 종료한다."""
    if not raw:
        return None
    out: list[dict] = []
    for item in raw:
        cond, sep, status = item.rpartition("|")
        cond, key = cond.strip(), status.strip().lower()
        if not sep or not cond or key not in HEALTH_CHECK_STATUS:
            sys.exit(
                f'오류: --health-check 는 "조건 | 충족|미충족|미정" 형식이어야 합니다: {item!r}\n'
                '   예: --health-check "데이터센터 PPA 추가 체결 | 충족"'
            )
        out.append({"cond": cond, "status": HEALTH_CHECK_STATUS[key]})
    return out


def build_call(args: argparse.Namespace) -> dict:
    ticker = normalize_ticker(args.ticker)
    call_date = parse_call_date(args.date, args.price)

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

    if args.health is not None and not (0 <= args.health <= 10):
        sys.exit(f"오류: --health 는 0~10 범위여야 합니다: {args.health}")
    if args.health is None and (call in ("keep", "hold") or args.skill in THESIS_SKILLS):
        print("⚠️ 경고: --health 가 없습니다. 논제 건강도(0~10)를 넘기지 않으면 대시보드 건강도 칸이\n"
              "   '측정 안 함'으로 남습니다. 값이 그대로여도 매 콜에 다시 넘기세요(CLAUDE.md).")
    health_checks = parse_health_checks(args.health_check)
    if args.health is not None and health_checks is None:
        print("⚠️ 경고: --health 에 근거(--health-check)가 없습니다. 대시보드가 '왜 N/10인지'를\n"
              '   보여주지 못합니다. 조건마다 --health-check "조건 | 충족|미충족|미정" 을 넘기세요.')

    if args.fair_value is not None and args.fair_value <= 0:
        sys.exit(f"오류: --fair-value 는 양수(USD)여야 합니다: {args.fair_value}")
    ext_source = args.ext_source.strip() if args.ext_source else None
    if args.ext_fair_value is not None:
        if args.ext_fair_value <= 0:
            sys.exit(f"오류: --ext-fair-value 는 양수(USD)여야 합니다: {args.ext_fair_value}")
        if ext_source not in VALID_EXT_SOURCES:
            sys.exit(f"오류: --ext-fair-value 에는 --ext-source {VALID_EXT_SOURCES} 가 필요합니다.")
    _check_external_gap(args.fair_value, args.ext_fair_value, ext_source, call, ticker)

    if args.target_low is not None and args.target_high is not None and args.target_low > args.target_high:
        sys.exit(f"오류: --target-low {args.target_low} 가 --target-high {args.target_high} 보다 큽니다.")

    if args.required_mos is not None:
        if not (0 <= args.required_mos <= 100):
            sys.exit(f"오류: --required-mos 는 0~100(%) 범위여야 합니다: {args.required_mos}")
        if tier is not None:
            lo, hi = TIER_MOS_RANGE[tier]
            if not (lo <= args.required_mos <= hi):
                print(f"⚠️ 경고: {tier} 의 요구 MOS 범위는 {lo:g}~{hi:g}% 인데 {args.required_mos:g}% 입니다.\n"
                      "   티어 판정과 할인율이 어긋났습니다(skills/quality-tier.md). 의도라면 논제에 근거를 적으세요.")
    if call == "hold" and (tier is None or args.required_mos is None):
        print("⚠️ 경고: hold 콜에 --tier / --required-mos 가 없습니다. 대시보드 밴드이탈 판정이 티어 상한\n"
              "   폴백으로 돌고, 사후에 '할인율 판단이 옳았나'를 채점할 수 없습니다.\n"
              f"   python3 tools/quality_tier.py {ticker} --moat {{★}} 로 판정해 함께 넘기세요.")

    validate_tranches(args.tranche)

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
    if args.health is not None:
        row["health"] = round(float(args.health), 1)
    if health_checks:
        row["healthChecks"] = health_checks
    if args.reason:
        row["reason"] = args.reason
    if tier:
        row["tier"] = tier
    if args.required_mos is not None:
        row["requiredMosPct"] = args.required_mos

    # 목표가 밴드(선택): 밴드·래더 플래그 중 하나라도 주어지면 target 블록 생성.
    # 🔴 래더·추격금지선·체결확률만 넘긴 경우도 포함한다(TASK-142) — keep 증액 래더는
    # target-low/high 없이 --tranche 만 넘기는 경우가 있는데, 예전엔 조건에서 빠져 조용히 버려졌다.
    if any(v is not None for v in (
        args.target_low, args.target_high, args.horizon_months,
        args.tranche, args.no_chase, args.fair_value, args.ext_fair_value, fill, low_fill_plan,
    )):
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
        if args.fair_value is not None:
            # 내재가치(USD) — 표시용(대시보드 목표가 칸). 채점에는 쓰지 않는다(TASK-164).
            # hold 의 low/high 는 진입 밴드라 목표가가 아니므로, 목표가는 이 필드로만 전달된다.
            # 🔴 정의: **오늘 가치**(연 8% 현가) — 3년 목표가를 그대로 넣지 않는다(TASK-176).
            target["fairValue"] = args.fair_value
        if args.ext_fair_value is not None:
            # 외부 적정가(모닝스타 또는 애널 목표가 현가) — 우리 IV 의 거울(TASK-175).
            target["extFairValue"] = args.ext_fair_value
            target["extSource"] = ext_source
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
    starter        1차를 현재가 근처 소액 스타터로 올린다 (T1·T2 — 2026-10-02 보정)
    catalyst-wait  '포지션 없음 · 촉매 대기'로 솔직히 적는다
    widen-horizon  호라이즌을 늘려 밴드를 정당화한다""")

    # 게이트 3: 짧은 호라이즌 + 큰 낙폭 요구 = 종목 판단이 아니라 마켓타이밍 베팅이다(경고).
    if call == "hold" and high is not None and price > 0:
        drop_pct = (1.0 - high / price) * 100.0
        if drop_pct >= MARKET_TIMING_DROP_PCT and (horizon or 0) <= MARKET_TIMING_HORIZON_MONTHS:
            print(f"""⚠️ 경고: 밴드 상단까지 {drop_pct:.0f}% 하락이 필요한데 호라이즌이 {horizon or '?'}개월입니다.
   이건 종목 판단이 아니라 시장 전체 조정에 거는 마켓타이밍 베팅입니다. 논제에 그렇게 적혀 있는지 확인하세요.""")


    # 게이트 4: --target-high 와 래더 1차 가격이 어긋나면 안 된다 (2026-09-23 신설).
    #
    # 대시보드는 `target.high` 로 채점·밴드이탈 판정을 하고, 사람은 `tranches[0]`(1차)을 읽는다.
    # 두 숫자가 다르면 같은 종목이 화면과 문서에서 정반대로 보인다 — AXP 에서 실제 발생했다
    # (원장 $250 → 🔴 재산출 강제 / 래더 1차 $280 → ✅ 밴드 유효).
    # hold 만 본다 — keep/buy 의 target 은 도달 목표가라 증액 래더와 다른 게 정상이다
    # (CLAUDE.md "--target-low/high 는 도달 목표가 그대로"). dashboard highLadderMismatch 와 같은 규칙.
    tranches = target.get("tranches") or []
    if call == "hold" and high is not None and tranches:
        first = _tranche_price(tranches[0])
        if first is not None and abs(first - high) > 0.005 * max(first, high):
            print(f"""⚠️ 경고: --target-high ${high:,.2f} 와 1차 차수 가격 ${first:,.2f} 이 다릅니다.
   대시보드는 target.high 로 채점하고 사람은 1차를 읽습니다 — 두 값이 갈리면
   같은 종목이 화면과 문서에서 정반대로 보입니다(skills/quality-tier.md 2.5단계).
   1차 = 가장 먼저 닿는 가격이므로 보통 --target-high 와 같아야 합니다.""")


def _check_external_gap(iv: float | None, ext: float | None, source: str | None,
                        call: str, ticker: str) -> None:
    """게이트 5 (TASK-175): 우리 IV 가 외부 적정가와 25% 넘게 벌어지면 경고한다.

    2026-10-02 진단: 시스템 IV 가 모닝스타 적정가의 중앙값 88%였고 SAP 61%·TSM 66% 까지 벌어졌는데
    아무도 몰랐다 — 외부 기준이 기록에 없었기 때문이다. 외부 기준은 정답이 아니라 거울이다.
    이탈 자체는 허용하되 **해명 없는 이탈**을 막는다(skills/quality-tier.md 2.2단계).
    """
    if call == "avoid":
        return
    if iv is not None and ext is None:
        print("⚠️ 경고: --fair-value 에 외부 교차점검(--ext-fair-value)이 없습니다.\n"
              f"   python3 tools/external_value.py {ticker} --iv {iv:g} 로 산출해 함께 넘기세요.")
        return
    if iv is None or ext is None:
        return
    ratio = iv / ext
    if ratio < EXT_GAP_LOW or ratio > EXT_GAP_HIGH:
        side = "보수" if ratio < EXT_GAP_LOW else "낙관"
        print(f"⚠️ 경고: 내재가치 ${iv:,.2f} 가 외부 적정가({source}) ${ext:,.2f} 의 {ratio * 100:.0f}% — {side} 이탈.\n"
              "   논제에 '왜 외부와 다른가'를 가정별(성장률·목표 PER·확률·할인율)로 해명했는지 확인하세요.")


def _tranche_price(text: str) -> float | None:
    """래더 한 줄에서 첫 가격을 뽑는다. 예: "1차 ≤$185.5 (25%) — 조건" → 185.5"""
    m = re.search(r"\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)", text or "")
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def _ledger_rows() -> list[dict]:
    """원장 줄을 per-line 안전 파싱(깨진 줄 하나 때문에 신규 기록이 실패하지 않게 — TASK-64)."""
    if not LEDGER.exists():
        return []
    rows = []
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def append_call(row: dict) -> None:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    rows = _ledger_rows()
    # 🔴 같은 날·같은 스킬이라도 call 이 다르면 별개 판단이다(TASK-139). 관망(hold) 뒤에
    # 사용자 매수 buy 를 append 하는 경우가 대표적 — 같은 id 를 쓰면 채점기가 hold 를 지운다.
    # id 뒤에 call 을 붙여 서로 다른 id 로 남긴다(대시보드 React key·dedupe 둘 다 안전).
    base = row["id"]
    if any(r.get("id") == base and r.get("call") != row["call"] for r in rows):
        row["id"] = f"{base}-{row['call']}"
        print(f"주의: {base} 에 다른 call 이 이미 있어 id 를 {row['id']} 로 기록합니다(기존 콜 보존).")
    # append-only: 같은 id·같은 call 이 있으면 경고만 하고 그대로 추가(이력 보존 · 최신이 정정본).
    if any(r.get("id") == row["id"] for r in rows):
        print(f"주의: 같은 id({row['id']})의 콜이 이미 있습니다. 이력 보존을 위해 새 줄로 추가합니다.")
    with LEDGER.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def build_parser() -> argparse.ArgumentParser:
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
    ap.add_argument("--health", type=float, default=None,
                    help="논제 건강도 0~10 (reports/track-record.md 의 건강도 열과 같은 값). "
                         "🔴 별점(--conviction)과 다른 축이다 — 별점은 확신도, 건강도는 "
                         "가정·레드라인의 현재 상태다. 자유 텍스트에 적지 말고 이 플래그로 "
                         "넘긴다(대시보드가 숫자 필드를 먼저 읽는다)")
    ap.add_argument("--health-check", nargs="*", action="extend", default=None,
                    help='건강도 근거 — 조건마다 하나씩 "조건 | 상태". 상태는 충족 · 미충족 · 미정 '
                         '(met/unmet/pending · ✅/❌/⏳ 도 됨). 대시보드가 펼친 논제에 번호를 붙여 보여준다. '
                         '예: --health-check "PPA 추가 체결 | 충족" "FERC 규칙 확정 | 미정"')
    ap.add_argument("--reason", help="이 콜을 낸 사유 (예: 목표가 대비 고평가라 진입 대기)")
    ap.add_argument("--price", type=float, help="콜 시점 주가(USD). 생략 시 Yahoo에서 fetch")
    ap.add_argument("--target-low", type=float, help="목표가 밴드 하단(USD)")
    ap.add_argument("--target-high", type=float, help="목표가 밴드 상단(USD)")
    ap.add_argument("--horizon-months", type=int, help="목표 도달 기간(개월)")
    ap.add_argument("--tranche", nargs="*", action="extend", default=None,
                    help='분할 진입 래더 — 차수별로 하나씩. '
                         '예: --tranche "1차 ≤$185 (25%%) — 계약화 비율 60%%+ 공시" "2차 ≤$165 (35%%)"')
    ap.add_argument("--fair-value", type=float, default=None,
                    help="내재가치(USD) — 논제의 목표가. 채점에 쓰지 않는 표시용(대시보드 목표가 칸). "
                         "hold 의 --target-low/high 는 진입 밴드라 목표가를 따로 넘긴다")
    ap.add_argument("--no-chase", type=float, default=None,
                    help="추격 금지선(USD). 이 가격을 넘으면 어떤 차수도 활성화되지 않는다")
    ap.add_argument("--tier", default=None,
                    help="퀄리티 티어 T1|T2|T3 (skills/quality-tier.md). 요구 MOS가 티어별로 "
                         "다르므로 사후 채점을 위해 함께 박제한다")
    ap.add_argument("--required-mos", type=float, default=None,
                    help="티어별 요구 안전마진(%%). T1 0~10 · T2 10~20 · T3 30~40 (2026-10-02 보정)")
    ap.add_argument("--ext-fair-value", type=float, default=None,
                    help="외부 적정가(USD) — python3 tools/external_value.py 산출값. 우리 IV 의 거울")
    ap.add_argument("--ext-source", default=None,
                    help="외부 적정가 출처: morningstar | analystPV (애널 평균 목표가 ÷1.08)")
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
    return ap


def main() -> None:
    args = build_parser().parse_args()
    row = build_call(args)
    append_call(row)
    tgt = ""
    if "target" in row:
        t = row["target"]
        if "low" in t or "high" in t or "horizonMonths" in t:
            tgt = f" · 목표 {t.get('low', '?')}~{t.get('high', '?')} ({t.get('horizonMonths', '?')}M)"
        if "tranches" in t:
            tgt += f" · 래더 {len(t['tranches'])}줄"
        if "fairValue" in t:
            tgt += f" · 내재가치 ${t['fairValue']:,.2f}"
        if "extFairValue" in t:
            tgt += f" · 외부 ${t['extFairValue']:,.2f}({t.get('extSource')})"
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
    # 기록부가 바뀌면 track-record.md 표도 같은 순간 다시 그린다(TASK-172) — 손 편집 단계 제거.
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import render_track_record
        render_track_record.main([])
    except Exception as e:  # noqa: BLE001 — 콜 기록 자체는 이미 끝났다
        print(f"주의: track-record.md 표 갱신 실패({type(e).__name__}: {e}) — "
              "python3 tools/render_track_record.py 로 수동 실행")


if __name__ == "__main__":
    main()
