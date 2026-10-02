#!/usr/bin/env python3
"""lab_record 규칙 테스트 (TASK-185). 가상 스크리닝 결과 · 파일 쓰기 없음.

실행:  python3 tools/run_tests.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lab_record as R  # noqa: E402

NOW = "2026-10-02T00:00:00+00:00"
URL = "https://example.com/evidence"


def _screen(cands=("AAA", "BBB", "CCC", "DDD", "EEE", "FFF"), control="CCC", run="2026-10-05"):
    stocks = {}
    for i, t in enumerate(cands, 1):
        stocks[t] = {
            "name": t, "sector": "Industrials", "rank": i,
            "metrics": {"price": 100.0, "priceTime": None, "upside": 0.3, "spinoffSuspect": [], "imputed": []},
            "score": {"quality": 70.0, "value": 80.0, "total": 75.0, "qualityGauge": 4, "valueGauge": 5},
            "plan": {"target": 130.0, "stopLoss": 85.0, "horizonMonths": 12},
        }
    return {"ruleVersion": "v1", "runDate": run, "candidates": list(cands), "stocks": stocks,
            "control": {"ticker": control, "seed": 20261005} if control else None, "nearMiss": None}


def _rej(t):
    return R.parse_reject(f"{t} | 사유 | {URL}")


def _err(fn) -> str:
    try:
        fn()
    except ValueError as e:
        return str(e)
    raise AssertionError("ValueError 가 나야 한다")


def test_top_pick_records_pick_and_control():
    rows = R.build_rows(_screen(), "AAA", False, [], "reports/lab/x.md", [], NOW)
    assert [(r["skill"], r["ticker"]) for r in rows] == [("lab-pick", "AAA"), ("lab-control", "CCC")]
    p = rows[0]
    assert p["call"] == "buy" and p["rank"] == 1 and p["target"] == 130.0 and p["stopLoss"] == 85.0
    assert p["id"] == "LAB-20261005-AAA-pick" and rows[1]["id"] == "LAB-20261005-CCC-control"


def test_lower_rank_requires_rejection_of_all_above():
    msg = _err(lambda: R.build_rows(_screen(), "CCC", False, [_rej("AAA")], None, [], NOW))
    assert "BBB" in msg
    rows = R.build_rows(_screen(), "CCC", False, [_rej("BBB"), _rej("AAA")], None, [], NOW)
    assert [r["ticker"] for r in rows[0]["rejected"]] == ["AAA", "BBB"]  # 순위순 정렬


def test_cannot_pick_outside_candidates_or_below_rank_five():
    assert "후보가 아닙니다" in _err(lambda: R.build_rows(_screen(), "ZZZ", False, [], None, [], NOW))
    rej = [_rej(t) for t in ("AAA", "BBB", "CCC", "DDD", "EEE")]
    assert "최대 5위" in _err(lambda: R.build_rows(_screen(), "FFF", False, rej, None, [], NOW))


def test_rejection_needs_evidence_url():
    assert "증거" in _err(lambda: R.parse_reject("AAA | 그냥 싫음"))
    assert "증거" in _err(lambda: R.parse_reject("AAA | 사유 | 출처없음"))


def test_rejections_below_pick_are_refused():
    assert "의미가 없습니다" in _err(lambda: R.build_rows(_screen(), "AAA", False, [_rej("DDD")], None, [], NOW))


def test_none_only_when_top_five_all_rejected_or_no_candidates():
    assert "탈락 사유 없는" in _err(lambda: R.build_rows(_screen(), None, True, [_rej("AAA")], None, [], NOW))
    rej = [_rej(t) for t in ("AAA", "BBB", "CCC", "DDD", "EEE")]
    rows = R.build_rows(_screen(), None, True, rej, None, [], NOW)
    assert rows[0]["kind"] == "none" and rows[0]["candidates"] == 6
    assert rows[1]["skill"] == "lab-control"  # 없음이어도 대조군은 기록
    empty = R.build_rows(_screen(cands=(), control=None), None, True, [], None, [], NOW)
    assert len(empty) == 1 and empty[0]["kind"] == "none"


def test_same_run_date_cannot_be_recorded_twice():
    first = R.build_rows(_screen(), "AAA", False, [], None, [], NOW)
    assert "이미 기록" in _err(lambda: R.build_rows(_screen(), "AAA", False, [], None, first, NOW))


def test_repeat_within_30_days_does_not_stack_a_new_call():
    first = R.build_rows(_screen(run="2026-10-05"), "AAA", False, [], None, [], NOW)
    again = R.build_rows(_screen(run="2026-10-12"), "AAA", False, [], None, first, NOW)
    assert again[0]["kind"] == "repeat" and again[0]["ref"] == "LAB-20261005-AAA-pick"
    later = R.build_rows(_screen(run="2026-11-09"), "AAA", False, [], None, first, NOW)
    assert later[0]["kind"] == "call"  # 35일 뒤면 새 콜


def test_decision_only_on_recorded_pick():
    rows = R.build_rows(_screen(), "AAA", False, [], None, [], NOW)
    d = R.decision_row(rows, "LAB-20261005-AAA-pick", "accepted", NOW)
    assert d["kind"] == "decision" and d["ref"] == "LAB-20261005-AAA-pick"
    assert "실험실 픽이 아닙니다" in _err(lambda: R.decision_row(rows, "LAB-20261005-CCC-control", "accepted", NOW))
    assert "중 하나" in _err(lambda: R.decision_row(rows, "LAB-20261005-AAA-pick", "maybe", NOW))


def test_brief_lists_top_five_and_warns_when_already_recorded():
    sc = _screen()
    out = R.brief(sc, [])
    assert "| 1 | AAA |" in out and "| 5 | EEE |" in out and "FFF" not in out
    assert "아직 없음" in out
    done = R.build_rows(sc, "AAA", False, [], None, [], NOW)
    assert "이미 기록됨" in R.brief(sc, done)


if __name__ == "__main__":
    import run_tests
    raise SystemExit(run_tests.run_module(sys.modules[__name__]))
