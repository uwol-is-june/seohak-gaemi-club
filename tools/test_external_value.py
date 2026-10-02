"""tools/external_value.py 단위 테스트 — 네트워크 없이 판정 로직만 검증한다."""
from external_value import assess, pick_morningstar_row


def test_pick_exact_ticker_only():
    rows = [{"TenforeId": "126.1.GOOG", "FairValueEstimate": 430},
            {"TenforeId": "126.1.GOOGL", "FairValueEstimate": 433}]
    assert pick_morningstar_row(rows, "googl")["FairValueEstimate"] == 433
    assert pick_morningstar_row(rows, "GOO") is None


def test_assess_prefers_morningstar():
    a = assess(314, 433, 429.36)
    assert a["reference"] == "morningstar"
    assert a["verdict"] == "conservative"  # 314/433 = 0.725
    assert a["analystPV"] == round(429.36 / 1.08, 2)


def test_assess_falls_back_to_analyst_pv():
    a = assess(300, None, 342.98)  # CEG 처럼 모닝스타 커버리지가 없을 때
    assert a["reference"] == "analystPV"
    assert a["verdict"] == "ok"


def test_assess_bounds():
    assert assess(76, 100, None)["verdict"] == "ok"
    assert assess(74, 100, None)["verdict"] == "conservative"
    assert assess(126, 100, None)["verdict"] == "optimistic"


def test_assess_unknown_without_iv_or_reference():
    assert assess(None, 100, None)["verdict"] == "unknown"
    assert assess(100, None, None)["verdict"] == "unknown"
