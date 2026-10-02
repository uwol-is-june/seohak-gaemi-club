#!/usr/bin/env python3
"""build_lab_site 테스트 — 주차 라벨 · 픽/유지/없음 변환. 네트워크·파일 쓰기 없음.

실행:  python3 tools/run_tests.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_lab_site as B  # noqa: E402


def test_week_label_is_thursday_based():
    # 같은 주(월~일)는 같은 라벨, 다음 주는 다른 라벨이어야 한다 — "날짜÷7" 은 10/02·10/05 를 겹쳤다.
    assert B.week_label("2026-09-28") == B.week_label("2026-10-02") == B.week_label("2026-10-04") == "10월 1주차"
    assert B.week_label("2026-10-05") == "10월 2주차"
    assert B.week_label("2026-11-02") == "11월 1주차"
    assert B.week_label("2027-01-01") == "12월 5주차"  # 그 주 목요일이 12/31


CALL = {"id": "LAB-20261002-AOS-pick", "kind": "call", "skill": "lab-pick", "date": "2026-10-02",
        "ticker": "AOS", "name": "A. O. Smith", "sector": "Industrials", "priceAtCall": 56.67,
        "target": 80.7975, "stopLoss": 48.1695, "horizonMonths": 12}


def test_build_pick_repeat_none_and_skips_control():
    rows = [
        CALL,
        {"id": "c", "kind": "call", "skill": "lab-control", "date": "2026-10-02", "ticker": "UPS",
         "priceAtCall": 93.89, "target": 125.0, "stopLoss": 79.8},
        {"id": "r", "kind": "repeat", "skill": "lab-pick", "date": "2026-10-05", "ticker": "AOS",
         "ref": "LAB-20261002-AOS-pick"},
        {"id": "n", "kind": "none", "skill": "lab-none", "date": "2026-10-12", "candidates": 7},
        {"id": "d", "kind": "decision", "ref": "LAB-20261002-AOS-pick", "decision": "accepted", "date": "2026-10-02"},
    ]
    out = B.build(rows)
    assert [w["runDate"] for w in out["weeks"]] == ["2026-10-12", "2026-10-05", "2026-10-02"]
    none, rep, pick = out["weeks"]
    assert none["kind"] == "none" and none["week"] == "10월 3주차"
    assert rep["repeat"] is True and rep["pickedOn"] == "2026-10-02" and rep["price"] == 56.67
    assert pick["target"] == 80.8 and pick["stop"] == 48.17
    assert pick["targetPct"] == 42.6 and pick["stopPct"] == -15.0
    assert all(w.get("ticker") != "UPS" for w in out["weeks"])  # 대조군은 공개 페이지에 없다


def test_empty_ledger():
    assert B.build([]) == {"updatedAt": None, "weeks": []}


if __name__ == "__main__":
    import run_tests
    raise SystemExit(run_tests.run_module(sys.modules[__name__]))
