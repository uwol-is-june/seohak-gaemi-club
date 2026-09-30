#!/usr/bin/env python3
"""record_call.py 기록 검증 테스트 (TASK-156) — build_call · 게이트 1~4 · 입력 검증.

네트워크를 쓰지 않도록 모든 케이스에 --price 를 준다. 원장 파일은 건드리지 않는다
(append_call 은 부르지 않고, id 충돌 케이스만 임시 원장으로 돌린다).

실행:  python3 tools/run_tests.py   (pytest 가 있으면 `pytest tools` 도 된다)
"""
from __future__ import annotations

import contextlib
import io
import json
import shlex
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import record_call as rc  # noqa: E402


def build(cmd: str) -> tuple[dict | None, str, str | None]:
    """(row, 경고 출력, 에러 메시지). 게이트가 막으면 row=None · 에러 메시지."""
    args = rc.build_parser().parse_args(shlex.split(cmd))
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            row = rc.build_call(args)
    except SystemExit as e:
        return None, out.getvalue(), str(e.code)
    return row, out.getvalue(), None


BASE = "--ticker XYZ --skill thesis-tracker --price 100 --health 7"


def test_buy_minimal():
    row, _, err = build(f"{BASE} --call buy")
    assert err is None
    assert row["call"] == "buy" and row["priceAtCall"] == 100 and row["health"] == 7
    assert row["id"] == f"XYZ-{date.today().strftime('%Y%m%d')}-thesis-tracker"
    assert "target" not in row


def test_gate1_hold_band_requires_fill_probability():
    _, _, err = build(f"{BASE} --call hold --tier T2 --required-mos 25 --target-low 70 --target-high 80")
    assert err and "--fill-probability" in err


def test_gate2_low_fill_requires_plan():
    cmd = f"{BASE} --call hold --tier T2 --required-mos 25 --target-low 70 --target-high 80 --horizon-months 24"
    _, _, err = build(cmd + " --fill-probability 10")
    assert err and "--low-fill-plan" in err
    _, _, err = build(cmd + " --fill-probability unknown")
    assert err and "--low-fill-plan" in err
    row, _, err = build(cmd + " --fill-probability 10 --low-fill-plan catalyst-wait")
    assert err is None and row["target"]["lowFillPlan"] == "catalyst-wait"


def test_gate3_market_timing_warns():
    row, out, err = build(
        f"{BASE} --call hold --tier T2 --required-mos 25 --target-low 60 --target-high 75 "
        "--horizon-months 6 --fill-probability 30"
    )
    assert err is None and row is not None
    assert "마켓타이밍" in out


def test_gate4_high_vs_first_tranche_hold_only():
    ladder = '--tranche "1차 ≤$85 (30%)" "2차 ≤$75 (70%)"'
    _, out, _ = build(
        f"{BASE} --call hold --tier T2 --required-mos 25 --target-low 75 --target-high 80 "
        f"--horizon-months 24 --fill-probability 40 {ladder}"
    )
    assert "1차 차수 가격" in out
    # keep 의 target 은 도달 목표가 — 증액 래더와 달라도 경고하지 않는다.
    _, out, _ = build(f"{BASE} --call keep --target-low 120 --target-high 140 {ladder}")
    assert "1차 차수 가격" not in out


def test_ladder_only_keep_is_not_dropped():
    # target-low/high 없이 래더·추격금지선만 넘겨도 원장에 들어가야 한다(TASK-142).
    row, _, err = build(f'{BASE} --call keep --tranche "1차 ≤$90 (50%)" "AND: 가이던스 유지" --no-chase 120')
    assert err is None
    assert row["target"] == {"tranches": ["1차 ≤$90 (50%)", "AND: 가이던스 유지"], "noChaseAbove": 120.0}


def test_tranche_format_rejected():
    _, _, err = build(f'{BASE} --call keep --tranche "잔여는 조정 시 분할"')
    assert err and "래더로 읽을 수 없습니다" in err


def test_date_validation():
    _, _, err = build(f"{BASE} --call buy --date 2026-13-01")
    assert err and "YYYY-MM-DD" in err
    future = (date.today() + timedelta(days=3)).isoformat()
    _, _, err = build(f"{BASE} --call buy --date {future}")
    assert err and "미래" in err
    past = (date.today() - timedelta(days=3)).isoformat()
    # 과거 날짜 + --price 는 허용
    row, _, err = build(f"{BASE} --call buy --date {past}")
    assert err is None and row["date"] == past
    # 과거 날짜 + --price 없음은 거부(오늘 시세가 과거 시점가로 박제되는 것 방지)
    args = rc.build_parser().parse_args(
        shlex.split(f"--ticker XYZ --skill s --call avoid --date {past}"))
    try:
        rc.build_call(args)
        raise AssertionError("과거 날짜 + --price 없음이 통과했다")
    except SystemExit as e:
        assert "--price" in str(e.code)


def test_band_and_mos_validation():
    _, _, err = build(f"{BASE} --call hold --target-low 90 --target-high 80 --fill-probability 50")
    assert err and "보다 큽니다" in err
    _, out, err = build(f"{BASE} --call hold --tier T1 --required-mos 30 --target-low 70 --target-high 80 "
                        "--fill-probability 50")
    assert err is None and "요구 MOS 범위" in out
    _, _, err = build(f"{BASE} --call buy --required-mos 150")
    assert err and "0~100" in err


def test_health_warning():
    _, out, _ = build("--ticker XYZ --skill thesis-tracker --price 100 --call keep")
    assert "--health 가 없습니다" in out
    _, out, _ = build("--ticker XYZ --skill quality-screen --price 100 --call avoid")
    assert "--health" not in out


def test_append_suffixes_id_when_call_differs():
    # 같은 날·같은 스킬 hold 뒤 buy → id 에 -buy 를 붙여 hold 를 보존한다(TASK-139).
    orig = rc.LEDGER
    with tempfile.TemporaryDirectory() as d:
        rc.LEDGER = Path(d) / "calls.jsonl"
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                rc.append_call({"id": "A-1-t", "call": "hold"})
                rc.append_call({"id": "A-1-t", "call": "buy"})
            ids = [json.loads(l)["id"] for l in rc.LEDGER.read_text(encoding="utf-8").splitlines()]
        finally:
            rc.LEDGER = orig
    assert ids == ["A-1-t", "A-1-t-buy"]


if __name__ == "__main__":
    import run_tests
    raise SystemExit(run_tests.run_module(sys.modules[__name__]))
