"""tools/financial_rigor.py — 3시나리오 현가 내재가치 테스트 (TASK-176)."""
from decimal import Decimal

from financial_rigor import scenario_intrinsic_value


def test_iv_is_present_value_of_weighted_target():
    # 기본 25/50/25 · 8% · 3년
    r = scenario_intrinsic_value([400, 200, 100])
    assert float(r["weighted"]) == 225.0
    assert round(float(r["iv"]), 2) == round(225 / 1.08 ** 3, 2)


def test_tsm_correction_reproduces():
    # 2026-09-23 TSM 감사: 3년 Base $455.4 ÷ 1.08³ = $361 (확률 0/1/0 으로 Base 만)
    r = scenario_intrinsic_value([0, 455.4, 0], probs=(0, 1, 0))
    assert 361 <= float(r["iv"]) < 362  # 361.51 — 보고서는 $361 로 버림 표기


def test_probabilities_must_sum_to_one():
    try:
        scenario_intrinsic_value([1, 1, 1], probs=(0.3, 0.5, 0.3))
    except ValueError:
        return
    raise AssertionError("확률 합 ≠ 1 이면 ValueError")


def test_exact_decimal():
    r = scenario_intrinsic_value([100, 100, 100], discount=0)
    assert r["iv"] == Decimal("100")
