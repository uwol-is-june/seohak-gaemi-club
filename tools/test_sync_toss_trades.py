"""sync_toss_trades.py 테스트 (TASK-196) — 합성 토스 주문 응답으로 체결 변환·병합·보유·대조 규칙을 확인한다."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_track_record as r  # noqa: E402
import sync_toss_trades as st  # noqa: E402


def order(oid, symbol, side, qty, price, at, status="FILLED", currency="USD"):
    """토스 GET /api/v1/orders 응답의 orders[] 한 건 (2026-10-27 실측 형태)."""
    return {
        "orderId": oid, "symbol": symbol, "side": side, "orderType": "LIMIT", "status": status,
        "price": None, "quantity": str(qty), "currency": currency, "orderedAt": at,
        "execution": {"filledQuantity": str(qty) if qty else "0",
                      "averageFilledPrice": str(price) if price is not None else None,
                      "commission": "0.2", "filledAt": at},
    }


ORDERS = [
    order("o1", "NVDA", "BUY", 1, 232.66, "2026-05-14T15:56:11+09:00"),
    order("o2", "NVDA", "BUY", 1, 198.16, "2026-07-01T11:44:15+09:00"),
    order("o3", "ADBE", "BUY", 1, 213.88, "2026-07-24T16:17:25+09:00"),
    order("o4", "ADBE", "SELL", 1, 241.79, "2026-10-02T15:49:24+09:00"),
    order("o5", "TSM", "BUY", 0, None, "2026-07-30T18:14:17+09:00", status="CANCELED"),  # 미체결 취소
    order("o6", "005930", "BUY", 1, 70000, "2026-07-30T09:00:00+09:00", currency="KRW"),  # 국내
]


def test_fills_keep_only_executed_usd():
    fills = st.to_fills(ORDERS)
    assert [f["ticker"] for f in fills] == ["NVDA", "NVDA", "ADBE", "ADBE"]
    assert fills[0]["date"] == "2026-05-14" and fills[0]["side"] == "buy" and fills[0]["price"] == 232.66
    assert all("o1" not in f["id"] and len(f["id"]) == 16 for f in fills)  # orderId 원문을 남기지 않는다


def test_merge_is_idempotent_and_keeps_old():
    fills = st.to_fills(ORDERS)
    merged, added = st.merge([], fills)
    assert len(added) == 4
    again, added2 = st.merge(merged, fills)
    assert again == merged and added2 == []
    # 토스 조회 범위 밖으로 밀려난 옛 체결도 지우지 않는다.
    kept, _ = st.merge(merged, fills[:1])
    assert len(kept) == 4


def test_positions_average_cost_and_closed():
    pos = st.positions(st.to_fills(ORDERS))
    assert set(pos) == {"NVDA"}  # ADBE 는 전량 매도
    assert pos["NVDA"]["qty"] == 2 and pos["NVDA"]["first"] == "2026-05-14"
    assert abs(pos["NVDA"]["cost"] / 2 - (232.66 + 198.16) / 2) < 1e-9


def test_rebuy_after_exit_resets_first_date():
    fills = st.to_fills(ORDERS + [order("o7", "ADBE", "BUY", 1, 220.0, "2026-10-20T10:00:00+09:00")])
    pos = st.positions(fills)
    assert pos["ADBE"]["first"] == "2026-10-20" and pos["ADBE"]["cost"] == 220.0


def test_reconcile_flags_quantity_gap():
    pos = st.positions(st.to_fills(ORDERS))
    assert st.reconcile(pos, [{"symbol": "NVDA", "quantity": "2"}]) == []
    warns = st.reconcile(pos, [{"symbol": "NVDA", "quantity": "3"}, {"symbol": "AOS", "quantity": "2"}])
    assert len(warns) == 2 and warns[0].startswith("AOS") and "NVDA: 체결 합계 2주 ≠ 토스 잔고 3주" in warns[1]


DOC = """# 트랙레코드

<!-- auto:positions:begin -->
<!-- auto:positions:end -->

<!-- auto:watchlist:begin -->
<!-- auto:watchlist:end -->

<!-- auto:fills:begin -->
<!-- auto:fills:end -->

## 매매 로그 (Trade Log)

| 날짜 | 티커 | 매매 | 단가 | 수량 | 비고 |
|------|------|:----:|------|:----:|------|

## 청산 완료 포지션
"""


def test_render_positions_from_trades():
    """매매 로그가 비어 있어도 토스 체결이 있으면 보유로 잡고, 최신 판단이 관망이면 경고한다."""
    calls = [{"id": "x", "ticker": "NVDA", "date": "2026-10-23", "skill": "investment-team", "call": "hold",
              "priceAtCall": 212.21, "recordedAt": "2026-10-23T00:00:00+00:00", "health": 4.0}]
    out = r.render(DOC, calls, date(2026, 10, 27), st.to_fills(ORDERS))
    pos = out.split("<!-- auto:positions:begin -->")[1].split("<!-- auto:positions:end -->")[0]
    assert "**NVDA**" in pos and "$215.41 · 2주" in pos and "`keep` 콜 필요" in pos
    watch = out.split("<!-- auto:watchlist:begin -->")[1].split("<!-- auto:watchlist:end -->")[0]
    assert "**NVDA**" not in watch
    fills = out.split("<!-- auto:fills:begin -->")[1].split("<!-- auto:fills:end -->")[0]
    assert fills.index("2026-10-02 | ADBE | 매도") < fills.index("2026-05-14 | NVDA | 매수")  # 최신순
    assert r.render(out, calls, date(2026, 10, 27), st.to_fills(ORDERS)) == out  # 멱등
