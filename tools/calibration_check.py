#!/usr/bin/env python3
"""보수성 보정 측정 — tools/calibration_check.py (TASK-178)

"우리 시스템이 얼마나 보수적인가"를 감이 아니라 숫자로 잰다. 판단 기록부(data/calls.jsonl)의
종목별 최신 살아있는 콜에서 두 비율의 **중앙값**을 낸다:

  가치 판단 = 내재가치(target.fairValue) / 현재가
  매수선    = 다음 매수가(래더 1차 또는 target.high) / 현재가   ← T1·T2 만 (T3 는 의도적으로 보수)

목표 범위 (skills/quality-tier.md 0단계 · 2026-10-02 결정):
  가치 판단 1.04 ~ 1.15  (= 0~100 척도 55~65점 · 모닝스타 적정가보다 약간 아래)
  매수선    0.93 ~ 1.00  (= 45~52점 · 시장가 근처 ~ 약간 아래)
척도: 0점 = 그레이엄 공식(√22.5·EPS·BPS), 100점 = 애널 최고 목표가, 시장가 ≈ 51점
(2026-10-02 관망·보유 11종목 실측 앵커 — 바스켓·날짜가 바뀌면 앵커도 움직이므로 점수는 참고, 판정은 비율로 한다).

함께 출력: 외부 적정가(모닝스타 우선) 대비 우리 IV 비율 · 이탈 종목 목록.

사용법 (저장소 루트에서):
    python3 tools/calibration_check.py           # 기록부의 외부 적정가만 사용(빠름)
    python3 tools/calibration_check.py --live    # 외부 적정가가 없는 종목은 실시간 조회
    python3 tools/calibration_check.py --live --record   # 측정값을 data/calibration.jsonl 에 누적 (분기 1회)
    python3 tools/calibration_check.py --history # 누적 기록 추이 (TASK-180 판정용)
"""
from __future__ import annotations

import argparse
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

TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))
from record_call import _tranche_price  # noqa: E402

LEDGER = TOOLS.parent / "data" / "calls.jsonl"
# 측정 이력(append-only) — "2분기 연속 과보수/과공격이면 기본값 재검토"(quality-tier.md 0단계)를
# 판정하려면 과거 측정값이 남아 있어야 한다. 화면 출력만으로는 추이를 볼 수 없다(TASK-180).
HISTORY = TOOLS.parent / "data" / "calibration.jsonl"
LIVE_CALLS = ("hold", "keep", "buy")

VALUE_TARGET = (1.04, 1.15)
BUY_TARGET = (0.93, 1.00)
# 2026-10-02 앵커(그레이엄 중앙값 0.453 → 0점, 애널 최고 목표가 중앙값 1.523 → 100점).
ANCHOR_LO, ANCHOR_HI = 0.453, 1.523


def score(ratio: float) -> float:
    return (ratio - ANCHOR_LO) / (ANCHOR_HI - ANCHOR_LO) * 100


def latest_live_calls(rows: list[dict]) -> dict[str, dict]:
    """종목별 최신 콜(date → recordedAt 순). 최신이 avoid 면 그 종목은 측정에서 뺀다."""
    best: dict[str, dict] = {}
    for r in rows:
        t = r.get("ticker")
        key = (r.get("date", ""), r.get("recordedAt", ""))
        if t and (t not in best or key >= (best[t].get("date", ""), best[t].get("recordedAt", ""))):
            best[t] = r
    return {t: r for t, r in best.items() if r.get("call") in LIVE_CALLS}


def buy_line(call: dict) -> float | None:
    """다음 매수가 — 래더 1차 가격 우선, 없으면 hold 의 target.high."""
    tgt = call.get("target") or {}
    for line in tgt.get("tranches") or []:
        p = _tranche_price(line)
        if p is not None:
            return p
    return tgt.get("high") if call.get("call") == "hold" else None


def measure(calls: dict[str, dict], prices: dict[str, float], ext: dict[str, float]) -> dict:
    """비율 중앙값과 종목별 표. prices/ext 는 티커 → 값."""
    table, values, buys, exts = [], [], [], []
    for t, c in sorted(calls.items()):
        px = prices.get(t)
        if not px:
            continue
        tgt = c.get("target") or {}
        iv = tgt.get("fairValue")
        bl = buy_line(c)
        tier = c.get("tier")
        e = ext.get(t)
        row = {"ticker": t, "call": c["call"], "tier": tier, "price": px,
               "ivRatio": iv / px if iv else None, "buyRatio": bl / px if bl else None,
               "ivVsExt": iv / e if iv and e else None}
        table.append(row)
        if row["ivRatio"] is not None:
            values.append(row["ivRatio"])
        if row["buyRatio"] is not None and tier in ("T1", "T2"):
            buys.append(row["buyRatio"])
        if row["ivVsExt"] is not None:
            exts.append(row["ivVsExt"])
    med = lambda xs: statistics.median(xs) if xs else None  # noqa: E731
    return {"rows": table, "value": med(values), "buy": med(buys), "vsExt": med(exts),
            "n": {"value": len(values), "buy": len(buys), "vsExt": len(exts), "tickers": len(table)}}


def _yahoo_price(t: str) -> float | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{t}?range=5d&interval=1d"
    r = subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", url], capture_output=True, text=True, timeout=30)
    try:
        return json.loads(r.stdout)["chart"]["result"][0]["meta"]["regularMarketPrice"]
    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
        return None


def record_row(m: dict, today: str) -> dict:
    """측정 결과 → 이력 한 줄. 점수·판정을 함께 박제해 기준(앵커·목표)이 바뀌어도 당시 판단이 남게 한다."""
    rnd = lambda x: round(x, 4) if x is not None else None  # noqa: E731
    return {
        "date": today,
        "value": rnd(m["value"]),
        "valueScore": round(score(m["value"]), 1) if m["value"] is not None else None,
        "valueVerdict": _verdict(m["value"], *VALUE_TARGET),
        "buy": rnd(m["buy"]),
        "buyScore": round(score(m["buy"]), 1) if m["buy"] is not None else None,
        "buyVerdict": _verdict(m["buy"], *BUY_TARGET),
        "vsExt": rnd(m["vsExt"]),
        "n": m["n"],
        "targets": {"value": list(VALUE_TARGET), "buy": list(BUY_TARGET)},
        "rows": [{k: (rnd(v) if isinstance(v, float) else v) for k, v in r.items()} for r in m["rows"]],
    }


def consecutive_off_target(history: list[dict], key: str) -> int:
    """가장 최근부터 연속으로 목표 범위를 벗어난 측정 횟수(같은 방향만 센다)."""
    streak, side = 0, None
    for h in reversed(history):
        v = h.get(f"{key}Verdict", "")
        cur = "low" if "과보수" in v else "high" if "과공격" in v else None
        if cur is None or (side is not None and cur != side):
            break
        side, streak = cur, streak + 1
    return streak


def load_history() -> list[dict]:
    if not HISTORY.exists():
        return []
    return [json.loads(l) for l in HISTORY.read_text(encoding="utf-8").splitlines() if l.strip()]


def print_history() -> int:
    hist = load_history()
    if not hist:
        print("측정 이력 없음 — python3 tools/calibration_check.py --live --record 로 기록을 시작한다.")
        return 0
    print("보수성 보정 측정 이력 (data/calibration.jsonl)\n")
    print(f"  {'날짜':10} {'가치 판단':>10} {'매수선':>8} {'IV/외부':>8}  종목수")
    for h in hist:
        v = f"{h['valueScore']:.0f}점" if h.get("valueScore") is not None else "—"
        b = f"{h['buyScore']:.0f}점" if h.get("buyScore") is not None else "—"
        e = f"{h['vsExt'] * 100:.0f}%" if h.get("vsExt") is not None else "—"
        print(f"  {h['date']:10} {v:>10} {b:>8} {e:>8}  {h['n']['tickers']}")
    for key, name in (("value", "가치 판단"), ("buy", "매수선")):
        k = consecutive_off_target(hist, key)
        if k >= 2:
            print(f"\n  🔴 {name} {k}회 연속 목표 이탈 — skills/quality-tier.md 기본값(목표 PER·확률·MOS) 재검토 대상(0단계)")
    return 0


def _verdict(v: float | None, lo: float, hi: float) -> str:
    if v is None:
        return "⬛ 측정 불가"
    return "🔵 과보수" if v < lo else "🟠 과공격" if v > hi else "✅ 목표 범위"


def main() -> int:
    ap = argparse.ArgumentParser(description="보수성 보정 측정 (판단 기록부 기준)")
    ap.add_argument("--live", action="store_true", help="외부 적정가가 기록 안 된 종목은 실시간 조회")
    ap.add_argument("--record", action="store_true", help="측정값을 data/calibration.jsonl 에 누적한다(분기 1회)")
    ap.add_argument("--history", action="store_true", help="누적 측정 추이만 출력한다")
    args = ap.parse_args()
    if args.history:
        return print_history()
    rows = [json.loads(l) for l in LEDGER.read_text(encoding="utf-8").splitlines() if l.strip()]
    calls = latest_live_calls(rows)
    prices = {t: p for t in calls if (p := _yahoo_price(t))}
    ext: dict[str, float] = {}
    for t, c in calls.items():
        v = (c.get("target") or {}).get("extFairValue")
        if v:
            ext[t] = v
        elif args.live:
            import external_value as ev
            ms = ev.fetch_morningstar(t)
            if ms:
                ext[t] = ms["fairValue"]
            else:
                yh = ev.fetch_yahoo(t)
                if yh:
                    ext[t] = round(yh["targetMean"] / (1 + ev.DISCOUNT), 2)
    m = measure(calls, prices, ext)

    print(f"보수성 보정 측정 — 살아있는 논제 {m['n']['tickers']}종목 (최신 콜이 avoid 인 종목 제외)\n")
    print(f"  {'티커':6} {'콜':5} {'티어':4} {'현재가':>10} {'IV/현재가':>9} {'매수선/현재가':>12} {'IV/외부':>8}")
    f = lambda x: f"{x * 100:.0f}%" if x is not None else "—"  # noqa: E731
    for r in m["rows"]:
        print(f"  {r['ticker']:6} {r['call']:5} {r['tier'] or '-':4} {r['price']:>10,.2f} "
              f"{f(r['ivRatio']):>9} {f(r['buyRatio']):>12} {f(r['ivVsExt']):>8}")
    print()
    for name, key, (lo, hi) in (("가치 판단", "value", VALUE_TARGET), ("매수선(T1·T2)", "buy", BUY_TARGET)):
        v = m[key]
        s = f"{v * 100:.0f}% · {score(v):.0f}점" if v is not None else "—"
        print(f"  {name:12} 중앙값 {s:>14}  목표 {lo * 100:.0f}~{hi * 100:.0f}% "
              f"({score(lo):.0f}~{score(hi):.0f}점)  → {_verdict(v, lo, hi)}  (n={m['n'][key]})")
    if m["vsExt"] is not None:
        print(f"  IV/외부적정가 중앙값 {m['vsExt'] * 100:.0f}% (n={m['n']['vsExt']}) — 75% 미만 종목은 해명 필수")
    missing_iv = [r["ticker"] for r in m["rows"] if r["ivRatio"] is None]
    if missing_iv:
        print(f"\n  ⚠️ 내재가치 미기록: {', '.join(missing_iv)} — 다음 검토 때 --fair-value 로 기록")
    if args.record:
        import datetime as _dt
        HISTORY.parent.mkdir(parents=True, exist_ok=True)
        with HISTORY.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record_row(m, _dt.date.today().isoformat()), ensure_ascii=False) + "\n")
        print(f"\n  → 기록: {HISTORY.relative_to(TOOLS.parent)} (--history 로 추이 확인)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
