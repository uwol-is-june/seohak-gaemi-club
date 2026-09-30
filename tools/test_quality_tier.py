#!/usr/bin/env python3
"""quality_tier.judge · compute_axes 테스트 (TASK-156 · TASK-149 · TASK-150). 네트워크 없음.

실행:  python3 tools/run_tests.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import quality_tier as qt  # noqa: E402


def axes(**over) -> dict:
    """전 축 통과하는 기본 축 값에 over 를 덮는다."""
    base = {
        "roicPct": 25.0, "roicIsRoeFallback": False, "fcfMarginPct": 25.0,
        "declineYearCount": 0, "profitDrawdownPct": -10.0, "episodes": [],
        "negativeEquityYears": 0,
    }
    base.update(over)
    return base


def test_all_pass_is_t1():
    assert qt.judge(axes(), moat=5)["tier"] == "T1"


def test_roe_fallback_caps_at_t2():
    assert qt.judge(axes(roicIsRoeFallback=True), moat=5)["tier"] == "T2"


def test_four_of_five_is_t2():
    assert qt.judge(axes(fcfMarginPct=5.0), moat=5)["tier"] == "T2"


def test_missing_axis_is_t3():
    r = qt.judge(axes(roicPct=None), moat=5)
    assert r["tier"] == "T3" and "roic" in r["missing"]


def test_missing_moat_is_t3():
    assert qt.judge(axes(), moat=None)["tier"] == "T3"


def test_negative_equity_is_named_not_hidden():
    # 자본잠식 때문에 ROIC 가 비면 '데이터 없음'과 구분해 사유에 적는다(TASK-150).
    r = qt.judge(axes(roicPct=None, negativeEquityYears=4), moat=5)
    assert r["tier"] == "T3" and "자기자본 음수" in r["reason"]


def test_slow_deep_drawdown_is_hard_t3():
    ep = {"year": "2020", "ddPct": -60.0, "recoveredYear": None, "recoveryYears": None, "slowRecovery": True}
    r = qt.judge(axes(profitDrawdownPct=-60.0, episodes=[ep]), moat=5)
    assert r["tier"] == "T3" and "조건 무관" in r["reason"]


def test_fast_single_shock_is_not_cyclical():
    ep = {"year": "2020", "ddPct": -40.0, "recoveredYear": "2021", "recoveryYears": 1, "slowRecovery": False}
    assert qt.judge(axes(profitDrawdownPct=-40.0, episodes=[ep]), moat=5)["tier"] == "T1"


def _row(rev, eq=100.0, ltd=50.0, cash=10.0, liab=500.0, ebit=100.0, ni=80.0):
    return {"values": {"revenue": rev, "equity": eq, "longTermDebt": ltd, "cash": cash,
                       "totalLiabilities": liab, "operatingIncome": ebit, "netIncome": ni,
                       "operatingCashFlow": 120.0, "capex": 20.0}}


def test_negative_equity_uses_total_liabilities():
    # 장부 자본 -300 · 장기부채 100 → 자본+부채−현금 ≤ 0. 총부채+자본−현금(=500−300−10)으로 대체.
    annual = {str(y): _row(1000 + y, eq=-300.0, ltd=100.0) for y in range(2016, 2021)}
    a = qt.compute_axes(annual)
    assert a["roicPct"] is not None and not a["roicIsRoeFallback"]
    assert a["negativeEquityYears"] == 5 and a["roicAltInvestedYears"] == 5


def test_decline_only_between_adjacent_years():
    # 2018 이 빠져 있으면 2017→2019 변화(-20%)를 1년 역성장으로 세면 안 된다(TASK-149).
    annual = {"2016": _row(1000), "2017": _row(1000), "2019": _row(800), "2020": _row(850)}
    assert qt.compute_axes(annual)["declineYearCount"] == 0
    annual["2018"] = _row(1000)
    assert qt.compute_axes(annual)["declineYearCount"] == 1


if __name__ == "__main__":
    import run_tests
    raise SystemExit(run_tests.run_module(sys.modules[__name__]))
