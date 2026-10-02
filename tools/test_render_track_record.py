"""render_track_record.py 테스트 (TASK-172) — 합성 문서·합성 기록부로 표 생성 규칙을 확인한다."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_track_record as r  # noqa: E402

TODAY = date(2026, 10, 2)

DOC = """# 트랙레코드

## 현재 보유 포지션

<!-- auto:positions:begin -->
옛 손 편집 표
<!-- auto:positions:end -->

손으로 쓴 서술 — 그대로 남아야 한다.

## 관찰 논제

<!-- auto:watchlist:begin -->
<!-- auto:watchlist:end -->

## 매매 로그 (Trade Log)

| 날짜 | 티커 | 매매 | 단가 | 수량 | 비고 |
|------|------|:----:|------|:----:|------|
| 2026-07-24 | AAA | 매수 | $100.00 | 2 | |
| 2026-08-01 | AAA | 매수 | $130.00 | 1 | |
| 2026-09-10 | AAA | — (콜) | $150.00 | — | 콜 행은 무시 |
| 2026-07-01 | SSS | 매수 | $50 | 1 | |
| 2026-08-01 | SSS | 매도 | $60 | 1 | 전량 청산 |

## 청산 완료 포지션
"""


def call(ticker, d, skill, kind, **extra):
    c = {"id": f"{ticker}-{d}-{skill}", "ticker": ticker, "date": d, "skill": skill,
         "call": kind, "priceAtCall": 100.0, "recordedAt": f"{d}T00:00:00+00:00"}
    c.update(extra)
    return c


def test_positions_from_trade_log():
    pos = r.parse_positions(DOC)
    assert set(pos) == {"AAA"}, pos  # SSS 는 전량 매도 · 콜 행은 무시
    assert pos["AAA"]["qty"] == 3 and pos["AAA"]["first"] == "2026-07-24"
    assert abs(pos["AAA"]["cost"] / pos["AAA"]["qty"] - 110.0) < 1e-9


def test_newer_call_supersedes_other_skill():
    # QLYS 실측 패턴: 7/31 investment-team 밴드가 9/23 thesis-tracker 재산출 옆에 남으면 안 된다.
    g = r.group_theses([
        call("QQQ", "2026-07-31", "investment-team", "hold", target={"low": 105, "high": 115}),
        call("QQQ", "2026-09-23", "thesis-tracker", "hold", target={"low": 93, "high": 106}),
    ], TODAY)["QQQ"]
    assert [c["skill"] for c in g["active"]] == ["thesis-tracker"]


def test_near_calls_coexist():
    g = r.group_theses([
        call("NNN", "2026-09-30", "thesis-tracker", "keep"),
        call("NNN", "2026-10-02", "investment-checklist", "keep"),
    ], TODAY)["NNN"]
    assert len(g["active"]) == 2 and g["active"][0]["skill"] == "investment-checklist"


def test_render_tables_and_keeps_narrative():
    calls = [
        call("AAA", "2026-07-24", "thesis-tracker", "buy"),
        call("AAA", "2026-09-30", "thesis-tracker", "avoid", health=1.0, conviction="★★☆☆☆"),
        call("WWW", "2026-09-23", "thesis-tracker", "hold", health=7.0, tier="T2", requiredMosPct=20,
             target={"low": 93, "high": 106, "horizonMonths": 12, "fillProbability": 3.9,
                     "lowFillPlan": "catalyst-wait", "noChaseAbove": 133,
                     "tranches": ["1차 ≤$106 (40%)", "2차 ≤$93 (60%) — 조건 없음"]}),
        call("XXX", "2026-09-30", "investment-checklist", "avoid"),
    ]
    out = r.render(DOC, calls, TODAY)
    assert "옛 손 편집 표" not in out
    assert "손으로 쓴 서술 — 그대로 남아야 한다." in out
    pos = out.split("<!-- auto:positions:begin -->")[1].split("<!-- auto:positions:end -->")[0]
    assert "**AAA**" in pos and "$110.00 · 3주" in pos and "**회피**" in pos and "**1/10**" in pos
    watch = out.split("<!-- auto:watchlist:begin -->")[1].split("<!-- auto:watchlist:end -->")[0]
    assert "**WWW**" in watch and "1차 ≤$106 (40%)<br>2차 ≤$93" in watch
    assert "체결확률 **3.9%** 🔴" in watch and ">$133.00" in watch
    assert "**XXX**" in watch.split("관망이 아닌 미보유 종목")[1]  # 회피는 별도 표
    assert "**AAA**" not in watch  # 보유 종목은 관찰 표에 안 나온다
    assert r.render(out, calls, TODAY) == out  # 다시 그려도 같다(멱등)


def test_health_falls_back_with_date():
    calls = [
        call("HHH", "2026-08-01", "thesis-tracker", "hold", health=6.0),
        call("HHH", "2026-09-01", "thesis-tracker", "hold"),
    ]
    g = r.group_theses(calls, TODAY)["HHH"]
    assert r._health(g) == "6/10<br><sub>08-01 값</sub>"


def test_pipe_in_text_is_escaped():
    c = call("PPP", "2026-09-01", "thesis-tracker", "hold",
             target={"low": 1, "high": 2, "tranches": ["1차 ≤$2 (100%) — A | B"]})
    assert "A \\| B" in r._ladder(c)


def test_missing_marker_raises():
    try:
        r.render("# 마커 없음\n", [], TODAY)
    except SystemExit:
        return
    raise AssertionError("마커가 없으면 멈춰야 한다")
