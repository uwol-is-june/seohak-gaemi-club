"""tools/calibration_check.py 단위 테스트 — 네트워크 없이 집계 로직만 검증한다."""
from calibration_check import buy_line, latest_live_calls, measure, score


def test_latest_call_wins_and_avoid_is_excluded():
    rows = [
        {"ticker": "AAA", "date": "2026-09-01", "recordedAt": "1", "call": "hold"},
        {"ticker": "AAA", "date": "2026-09-30", "recordedAt": "2", "call": "avoid"},
        {"ticker": "BBB", "date": "2026-09-01", "recordedAt": "1", "call": "keep"},
        {"ticker": "BBB", "date": "2026-09-01", "recordedAt": "3", "call": "hold"},
    ]
    live = latest_live_calls(rows)
    assert "AAA" not in live
    assert live["BBB"]["call"] == "hold"


def test_buy_line_prefers_first_tranche():
    c = {"call": "hold", "target": {"high": 90, "tranches": ["AND: 공통조건", "1차 ≤$95 (30%)"]}}
    assert buy_line(c) == 95
    assert buy_line({"call": "hold", "target": {"high": 90}}) == 90
    assert buy_line({"call": "keep", "target": {"high": 300}}) is None  # keep 의 high 는 도달 목표가


def test_measure_excludes_t3_from_buy_line():
    calls = {
        "A": {"call": "hold", "tier": "T1", "target": {"fairValue": 110, "high": 95}},
        "B": {"call": "hold", "tier": "T3", "target": {"fairValue": 80, "high": 50}},
    }
    m = measure(calls, {"A": 100, "B": 100}, {"A": 120})
    assert m["value"] == (1.10 + 0.80) / 2
    assert m["buy"] == 0.95  # T3 의 0.50 은 매수선 집계에서 빠진다
    assert round(m["vsExt"], 3) == round(110 / 120, 3)


def test_consecutive_off_target_counts_same_side_only():
    from calibration_check import consecutive_off_target
    h = [{"valueVerdict": "🔵 과보수"}, {"valueVerdict": "✅ 목표 범위"},
         {"valueVerdict": "🔵 과보수"}, {"valueVerdict": "🔵 과보수"}]
    assert consecutive_off_target(h, "value") == 2
    h2 = [{"buyVerdict": "🟠 과공격"}, {"buyVerdict": "🔵 과보수"}]
    assert consecutive_off_target(h2, "buy") == 1  # 방향이 바뀌면 연속이 끊긴다
    assert consecutive_off_target([], "value") == 0


def test_record_row_keeps_verdict_and_targets():
    from calibration_check import record_row
    m = {"value": 1.02, "buy": 0.98, "vsExt": 0.91,
         "n": {"tickers": 10, "value": 10, "buy": 8, "vsExt": 10},
         "rows": [{"ticker": "AAA", "ivRatio": 1.0234567}]}
    r = record_row(m, "2026-10-02")
    assert r["date"] == "2026-10-02"
    assert "과보수" in r["valueVerdict"] and "목표 범위" in r["buyVerdict"]
    assert r["targets"]["value"] == [1.04, 1.15]
    assert r["rows"][0]["ivRatio"] == 1.0235


def test_score_anchors():
    assert round(score(0.453)) == 0
    assert round(score(1.523)) == 100
    assert 50 <= score(1.0) <= 52
