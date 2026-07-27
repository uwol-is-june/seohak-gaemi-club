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

    # 목표가 밴드(선택): low/high/horizon 중 하나라도 주어지면 target 블록 생성.
    if args.target_low is not None or args.target_high is not None or args.horizon_months is not None:
        target: dict = {}
        if args.target_low is not None:
            target["low"] = args.target_low
        if args.target_high is not None:
            target["high"] = args.target_high
        if args.horizon_months is not None:
            target["horizonMonths"] = args.horizon_months
        row["target"] = target

    if args.load_bearing:
        row["loadBearing"] = args.load_bearing
    if args.invalidation:
        row["invalidation"] = args.invalidation
    return row


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
    ap.add_argument("--load-bearing", nargs="*", default=[], help="핵심 가정(⚑)들")
    ap.add_argument("--invalidation", nargs="*", default=[], help="무효화/레드라인 조건들")
    args = ap.parse_args()

    row = build_call(args)
    append_call(row)
    tgt = ""
    if "target" in row:
        t = row["target"]
        tgt = f" · 목표 {t.get('low', '?')}~{t.get('high', '?')} ({t.get('horizonMonths', '?')}M)"
    print(f"기록 완료: {row['id']} — {row['call']} @ ${row['priceAtCall']}{tgt}")
    print(f"  → {LEDGER.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
