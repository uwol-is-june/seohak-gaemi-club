#!/usr/bin/env python3
"""토스증권 체결 내역 → data/trades.jsonl 동기화 (TASK-196)

왜 필요한가:
    보유 여부·매수가·수량은 사용자가 "XXX 매수 $Y에 N주"라고 **말해야만** 매매 로그에 들어갔다.
    알리지 않은 매수는 기록에 없어서, 2026-10-27 실측으로 토스 잔고 9종목 중 6종목(NVDA 5주 등)이
    트랙레코드에서 '관망'으로 남아 있었다. 체결은 토스가 이미 알고 있으므로 거기서 가져온다.

소스:
    GET /api/v1/orders?status=CLOSED  — 종료된 주문(체결·취소·거부). execution.filledQuantity > 0 만 체결로 본다.
    GET /api/v1/holdings              — 대조용. 체결 합계 수량이 잔고와 다르면 경고한다
                                         (Open API 로 낼 수 없는 호가 유형 — 장전·장후 시간외 종가 —
                                          주문은 주문 목록에 안 나온다고 토스 문서가 명시한다).

data/trades.jsonl 은 토스 체결의 **거울**이다(판단 기록부처럼 append-only 원본이 아니다).
같은 체결은 id(orderId 해시)로 합쳐지고, 토스 조회 범위 밖으로 밀려난 옛 체결도 지우지 않는다.
orderId 원문은 저장소(공개)에 남기지 않는다 — 해시만 쓴다.

인증: TOSS_APP_KEY · TOSS_APP_SECRET (· TOSS_ACCOUNT_SEQ) 환경변수, 없으면 dashboard/.env.local.
토스는 IP 허용목록을 요구한다 — 등록 안 된 네트워크에서는 실패하고 아무것도 쓰지 않는다.

실행:
    python3 tools/sync_toss_trades.py                 # 동기화 + track-record.md 표 갱신
    python3 tools/sync_toss_trades.py --dry-run       # 새 체결·대조 결과만 출력
    python3 tools/sync_toss_trades.py --if-stale 60   # 마지막 성공이 60분 안이면 건너뜀(Stop 훅용)
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
TRADES = REPO_ROOT / "data" / "trades.jsonl"
STATE = REPO_ROOT / "data" / ".toss-sync.json"  # 마지막 동기화 상태 — .gitignore
ENV_FILE = REPO_ROOT / "dashboard" / ".env.local"
BASE = "https://openapi.tossinvest.com"
TIMEOUT = 15


class TossError(Exception):
    pass


# ── 인증·HTTP ────────────────────────────────────────────────────────────

def load_env() -> dict[str, str]:
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            k, sep, v = line.strip().partition("=")
            if sep and k and not k.startswith("#"):
                env[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("TOSS_APP_KEY", "TOSS_APP_SECRET", "TOSS_ACCOUNT_SEQ"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def _request(path: str, headers: dict, data: bytes | None = None) -> dict:
    req = urllib.request.Request(BASE + path, data=data, headers=headers,
                                 method="POST" if data is not None else "GET")
    for attempt in range(2):  # 429 는 잠깐 쉬고 한 번만 재시도(대시보드 lib/toss.ts 와 같음)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 0:
                time.sleep(1.2)
                continue
            # 본문은 계좌·토큰이 섞일 수 있어 출력하지 않는다.
            hint = " (IP 허용목록 확인)" if e.code in (401, 403) else ""
            raise TossError(f"{path} HTTP {e.code}{hint}") from None
        except (urllib.error.URLError, TimeoutError) as e:
            raise TossError(f"{path} 연결 실패 — {e}") from None
    raise TossError(f"{path} 요청 한도 초과")


def fetch(env: dict) -> tuple[list[dict], list[dict]]:
    """(종료된 주문 전체, 해외 보유 종목)."""
    key, secret = env.get("TOSS_APP_KEY"), env.get("TOSS_APP_SECRET")
    if not key or not secret:
        raise TossError("TOSS_APP_KEY / TOSS_APP_SECRET 없음 (환경변수 또는 dashboard/.env.local)")
    basic = base64.b64encode(f"{key}:{secret}".encode()).decode()
    tok = _request("/oauth2/token", {"Authorization": f"Basic {basic}",
                                     "Content-Type": "application/x-www-form-urlencoded"},
                   b"grant_type=client_credentials")["access_token"]
    auth = {"Authorization": f"Bearer {tok}"}
    seq = env.get("TOSS_ACCOUNT_SEQ")
    if not seq:
        accounts = _request("/api/v1/accounts", auth).get("result") or []
        if not accounts:
            raise TossError("계좌를 찾을 수 없음")
        seq = str(accounts[0]["accountSeq"])
    acct = {**auth, "X-Tossinvest-Account": str(seq)}

    orders, cursor = [], None
    for _ in range(50):  # 100건 × 50쪽 — 무한 루프 방어
        q = {"status": "CLOSED", "limit": "100", **({"cursor": cursor} if cursor else {})}
        res = _request("/api/v1/orders?" + urllib.parse.urlencode(q), acct).get("result") or {}
        orders += res.get("orders") or []
        cursor = res.get("nextCursor")
        if not res.get("hasNext") or not cursor:
            break
    holdings = (_request("/api/v1/holdings", acct).get("result") or {}).get("items") or []
    return orders, [h for h in holdings if h.get("marketCountry") != "KR"]


# ── 변환·대조 (순수 함수 — 테스트 대상) ───────────────────────────────────

def _f(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def to_fills(orders: list[dict]) -> list[dict]:
    """종료된 주문 → 체결 레코드. 미국 주식(USD)만, 체결 수량 > 0 만(부분 체결 후 취소 포함)."""
    out = []
    for o in orders:
        ex = o.get("execution") or {}
        qty, price = _f(ex.get("filledQuantity")), _f(ex.get("averageFilledPrice"))
        if not qty or qty <= 0 or price is None or o.get("currency") != "USD":
            continue
        at = ex.get("filledAt") or o.get("orderedAt") or ""
        out.append({
            "id": hashlib.sha256(str(o["orderId"]).encode()).hexdigest()[:16],
            "date": at[:10],  # KST 기준 날짜 — 기존 매매 로그 표기와 같다
            "filledAt": at,
            "ticker": str(o["symbol"]).upper(),
            "side": "buy" if o.get("side") == "BUY" else "sell",
            "qty": qty,
            "price": price,
            "commission": _f(ex.get("commission")) or 0.0,
            "currency": "USD",
            "source": "toss",
        })
    return out


def merge(old: list[dict], new: list[dict]) -> tuple[list[dict], list[dict]]:
    """(합친 전체 · 처음 보는 체결). 같은 id 는 토스 최신 값으로 덮는다."""
    by = {t["id"]: t for t in old}
    added = [t for t in new if t["id"] not in by]
    by.update({t["id"]: t for t in new})
    return sorted(by.values(), key=lambda t: (t["filledAt"], t["id"])), added


def positions(trades: list[dict]) -> dict[str, dict]:
    """체결 → 종목별 보유 {first, qty, cost}. 평균단가법(매도는 수량만 줄이고 단가는 유지).
    전량 매도 후 재매수하면 최초 매수일을 새로 잡는다."""
    pos: dict[str, dict] = {}
    for t in sorted(trades, key=lambda t: t["filledAt"]):
        p = pos.get(t["ticker"])
        if t["side"] == "buy":
            if p is None or p["qty"] <= 1e-9:
                p = pos[t["ticker"]] = {"first": t["date"], "qty": 0.0, "cost": 0.0}
            p["qty"] += t["qty"]
            p["cost"] += t["qty"] * t["price"]
        elif p is not None and p["qty"] > 1e-9:
            avg = p["cost"] / p["qty"]
            p["qty"] = max(p["qty"] - t["qty"], 0.0)
            p["cost"] = avg * p["qty"]
    return {k: v for k, v in pos.items() if v["qty"] > 1e-9}


def reconcile(pos: dict[str, dict], holdings: list[dict]) -> list[str]:
    """체결로 만든 보유 수량 vs 토스 잔고 수량. 다르면 사람이 읽을 경고 문장."""
    held = {str(h["symbol"]).upper(): _f(h.get("quantity")) or 0.0 for h in holdings}
    warns = []
    for t in sorted(set(held) | set(pos)):
        a, b = (pos.get(t) or {}).get("qty", 0.0), held.get(t, 0.0)
        if abs(a - b) > 1e-6:
            warns.append(f"{t}: 체결 합계 {a:g}주 ≠ 토스 잔고 {b:g}주 "
                         "(Open API 로 낼 수 없는 호가 유형 주문은 체결 내역에 안 나온다)")
    return warns


def describe(t: dict) -> str:
    return f"{t['date']} {t['ticker']} {'매수' if t['side'] == 'buy' else '매도'} {t['qty']:g}주 @ ${t['price']:,.2f}"


# ── 파일 ────────────────────────────────────────────────────────────────

def load_trades(path: Path = TRADES) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def write_trades(trades: list[dict], path: Path = TRADES) -> None:
    path.write_text("".join(json.dumps(t, ensure_ascii=False) + "\n" for t in trades), encoding="utf-8")


def read_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def write_state(state: dict) -> None:
    try:
        STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


def stale(minutes: float) -> bool:
    last = read_state().get("lastSuccess")
    if not last:
        return True
    try:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds() / 60
    except ValueError:
        return True
    return age >= minutes


# ── 실행 ────────────────────────────────────────────────────────────────

def sync(dry_run: bool = False) -> dict:
    """동기화 1회. 반환: {added: [...], warnings: [...], positions: {...}}. 실패는 TossError."""
    orders, holdings = fetch(load_env())
    merged, added = merge(load_trades(), to_fills(orders))
    pos = positions(merged)
    result = {"added": added, "warnings": reconcile(pos, holdings), "positions": pos}
    if dry_run:
        return result
    if added or not TRADES.exists():
        write_trades(merged)
    write_state({"lastSuccess": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 "fills": len(merged), "warnings": result["warnings"]})
    return result


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="토스 체결 내역을 data/trades.jsonl 로 동기화")
    ap.add_argument("--dry-run", action="store_true", help="쓰지 않고 새 체결·대조 결과만 출력")
    ap.add_argument("--if-stale", type=float, metavar="MIN",
                    help="마지막 성공 동기화가 MIN 분 안이면 건너뜀")
    args = ap.parse_args(argv)

    if args.if_stale is not None and not stale(args.if_stale):
        print(f"건너뜀 — 마지막 동기화가 {args.if_stale:g}분 안")
        return 0
    try:
        res = sync(dry_run=args.dry_run)
    except TossError as e:
        print(f"⚠️ 토스 동기화 실패 — {e}")
        return 1

    for t in res["added"]:
        print(f"🆕 {describe(t)}")
    if not res["added"]:
        print("새 체결 없음")
    for w in res["warnings"]:
        print(f"⚠️ {w}")
    held = ", ".join(f"{t} {p['qty']:g}주" for t, p in sorted(res["positions"].items()))
    print(f"보유(체결 기준): {held or '없음'}")

    if not args.dry_run:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import render_track_record
        render_track_record.main([])
    return 0


if __name__ == "__main__":
    sys.exit(main())
