#!/usr/bin/env python3
"""fill_probability.base_rate 테스트 (TASK-156). 합성 시계열 — 네트워크 없음.

실행:  python3 tools/run_tests.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fill_probability as fp  # noqa: E402


def test_too_short_series_has_no_samples():
    assert fp.base_rate([100.0] * 5, -0.1, window=10)["samples"] == 0


def test_flat_series_never_fills():
    r = fp.base_rate([100.0] * 40, -0.1, window=10)
    assert r["samples"] == 30 and r["hits"] == 0 and r["probability"] == 0.0


def test_touch_is_lowest_close_in_window():
    # 10일째에 -20% 한 번 찍고 복귀 — 그 날을 창에 포함하는 시작일만 체결이다.
    closes = [100.0] * 30
    closes[10] = 80.0
    r = fp.base_rate(closes, -0.15, window=5)
    # 시작일 i 의 창은 i+1..i+5 → i=5..9 가 10일째를 포함한다.
    assert r["samples"] == 25 and r["hits"] == 5
    assert r["worstDrawdown"] == -20.0


def test_required_drop_boundary_is_inclusive():
    closes = [100.0, 90.0, 100.0, 100.0]
    assert fp.base_rate(closes, -0.10, window=1)["hits"] == 1


def test_effective_samples_reported():
    # 창이 겹치는 표본이라 독립 표본 수는 samples/window 수준이다(TASK-158).
    r = fp.base_rate([100.0] * 40, -0.1, window=10)
    assert r["effectiveSamples"] == 3.0


if __name__ == "__main__":
    import run_tests
    raise SystemExit(run_tests.run_module(sys.modules[__name__]))
