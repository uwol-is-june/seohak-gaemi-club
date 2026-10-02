#!/usr/bin/env python3
"""reports/track-record.md 의 '보유 포지션' · '관찰 논제' 표를 판단 기록부에서 다시 그린다. (TASK-172)

왜 필요한가:
    두 표는 오래 **손으로** 고쳐 왔다. 판단 기록부(data/calls.jsonl)에 콜을 append 하고
    표를 따로 고치는 2단계라, 한쪽을 빠뜨리면 화면(기록부 기준)과 문서(표 기준)가 어긋났다
    (2026-10-02 실측: ADBE 9/30 avoid · QLYS 9/23 재산출이 표와 화면에서 서로 달랐다).
    이제 표는 **파생물**이다 — 기록부와 매매 로그만 고치면 이 도구가 표를 다시 쓴다.

소스:
    - 판단(판정·래더·티어·건강도·추격금지) ← data/calls.jsonl
    - 보유(최초 매수일·평균 단가·수량)      ← track-record.md '매매 로그' 표
      (사용자가 알린 체결만 적는 곳 — 콜로 보유를 추측하지 않는다)

표는 마커 사이만 교체한다. 마커 밖(서술·감사 기록)은 건드리지 않는다:
    <!-- auto:positions:begin --> ... <!-- auto:positions:end -->
    <!-- auto:watchlist:begin --> ... <!-- auto:watchlist:end -->

종목별 '현재 판단'은 대시보드 groupTheses(dashboard/lib/thesis-groups.ts)와 같은 규칙이다:
스킬별 최신 1건 → 종목 최신 판단에서 SUPERSEDE_DAYS 안쪽만 살아있는 논제(TASK-170).
단 시세 채점은 하지 않는다 — 호라이즌이 끝난 콜만 제외하고, 적중·빗나감은 대시보드가 본다.

실행:
    python3 tools/render_track_record.py           # 표 갱신
    python3 tools/render_track_record.py --check   # 갱신이 필요하면 종료코드 1 (쓰지 않음)
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from score_calls import add_months, dedupe_calls, load_calls  # noqa: E402

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
TRACK_RECORD = REPO_ROOT / "reports" / "track-record.md"

# dashboard/lib/thesis-groups.ts SUPERSEDE_DAYS 와 같아야 한다.
SUPERSEDE_DAYS = 7

CALL_LABEL = {"buy": "매수", "keep": "보유 유지", "hold": "관망", "avoid": "회피"}
LOW_FILL_LABEL = {"starter": "스타터", "catalyst-wait": "촉매 대기", "widen-horizon": "호라이즌 연장"}

AUTO_NOTE = "<sub>🤖 자동 생성 — `data/calls.jsonl` · 매매 로그 기준. 이 표를 직접 고치지 말 것(다음 기록 때 덮어쓴다)</sub>"


# ── 매매 로그 → 보유 ─────────────────────────────────────────────────────

def parse_positions(md: str) -> dict[str, dict]:
    """'## 매매 로그' 표에서 매수·매도 행만 모아 종목별 보유를 만든다. 콜 행('— (콜)')은 무시."""
    m = re.search(r"^## 매매 로그.*?$(.*?)(?=^## )", md, re.S | re.M)
    if not m:
        return {}
    pos: dict[str, dict] = {}
    for line in m.group(1).splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5 or not re.match(r"\d{4}-\d{2}-\d{2}$", cells[0]):
            continue
        day, ticker, side, price_s, qty_s = cells[:5]
        side = side.replace("*", "")
        price = _num(price_s)
        qty = _num(qty_s)
        if side not in ("매수", "매도") or price is None or qty is None:
            continue
        p = pos.setdefault(ticker.upper(), {"first": day, "qty": 0.0, "cost": 0.0})
        p["first"] = min(p["first"], day)
        if side == "매수":
            p["qty"] += qty
            p["cost"] += qty * price
        else:
            avg = p["cost"] / p["qty"] if p["qty"] else 0.0
            p["qty"] -= qty
            p["cost"] = avg * max(p["qty"], 0.0)
    return {t: p for t, p in pos.items() if p["qty"] > 1e-9}


def _num(s: str) -> float | None:
    m = re.search(r"-?[\d,]+(?:\.\d+)?", s.replace("$", ""))
    return float(m.group(0).replace(",", "")) if m else None


# ── 기록부 → 종목별 현재 판단 ─────────────────────────────────────────────

def _days(a: str, b: str) -> int:
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


def _expired(c: dict, today: date) -> bool:
    h = (c.get("target") or {}).get("horizonMonths")
    if not isinstance(h, (int, float)):
        return False
    try:
        return add_months(date.fromisoformat(c["date"]), int(h)) < today
    except (KeyError, ValueError):
        return False


def group_theses(calls: list[dict], today: date) -> dict[str, dict]:
    """티커 → {active: [...최신순], all: [...최신순]}. 대시보드 groupTheses 와 같은 규칙."""
    by: dict[str, list[dict]] = {}
    for c in dedupe_calls(calls):
        by.setdefault(c["ticker"].strip().upper(), []).append(c)
    out = {}
    for t, lst in by.items():
        lst.sort(key=lambda c: (c.get("date", ""), c.get("recordedAt") or ""), reverse=True)
        latest: dict[str, dict] = {}
        for c in lst:
            latest.setdefault(c.get("skill", ""), c)
        cands = list(latest.values())
        live = [c for c in cands if not _expired(c, today)]
        if live:
            newest = max(c["date"] for c in live)
            active = [c for c in live if _days(c["date"], newest) <= SUPERSEDE_DAYS]
        else:
            active = cands[:1]
        active.sort(key=lambda c: (c.get("date", ""), c.get("recordedAt") or ""), reverse=True)
        out[t] = {"active": active, "all": lst}
    return out


# ── 셀 렌더링 ────────────────────────────────────────────────────────────

def _esc(s: str) -> str:
    return str(s).replace("|", "\\|").replace("\n", " ")


def _money(v) -> str:
    return f"${v:,.2f}" if isinstance(v, (int, float)) else "—"


def _ladder(c: dict) -> str:
    t = c.get("target") or {}
    lines = [_esc(x) for x in t.get("tranches") or []]
    h = t.get("horizonMonths")
    if not lines:
        lo, hi = t.get("low"), t.get("high")
        if c.get("call") == "hold" and isinstance(lo, (int, float)) and isinstance(hi, (int, float)):
            lines = [f"${lo:,.0f}~${hi:,.0f}", "⬛ 차수 미산출 — 다음 검토 때 산출"]
        else:
            return "—"
    if isinstance(h, (int, float)):
        lines.append(f"<sub>호라이즌 {int(h)}M</sub>")
    return "<br>".join(lines)


def _tier(c: dict, with_fill: bool) -> str:
    parts = []
    if c.get("tier"):
        mos = c.get("requiredMosPct")
        parts.append(f"**{c['tier']}**" + (f" (요구 MOS {mos:g}%)" if isinstance(mos, (int, float)) else ""))
    if with_fill:
        t = c.get("target") or {}
        fp = t.get("fillProbability")
        if fp is not None:
            s = "unknown" if fp == "unknown" else f"{fp:g}%"
            flag = " 🔴" if isinstance(fp, (int, float)) and fp < 25 else ""
            parts.append(f"체결확률 **{s}**{flag}")
        if t.get("lowFillPlan"):
            parts.append(LOW_FILL_LABEL.get(t["lowFillPlan"], t["lowFillPlan"]))
    return "<br>".join(parts) or "—"


def _health(g: dict) -> str:
    lead = g["active"][0]
    if isinstance(lead.get("health"), (int, float)):
        return f"**{lead['health']:g}/10**"
    for c in g["all"]:  # 살아있는 논제가 안 적었으면 지난 값을 날짜를 달아 보여준다(대시보드와 같음)
        if isinstance(c.get("health"), (int, float)):
            return f"{c['health']:g}/10<br><sub>{c['date'][5:]} 값</sub>"
    return "—"


def _verdict(g: dict) -> str:
    lead = g["active"][0]
    s = f"**{CALL_LABEL.get(lead['call'], lead['call'])}** (`{lead['call']}`)"
    stars = re.search(r"[★☆]{2,}", str(lead.get("conviction") or ""))
    if stars:  # 자유 서술 확신도는 표에서 잘리면 오독된다 — 별점만 싣는다
        s += f" · {stars.group(0)}"
    s += f"<br><sub>{lead['date']} · {lead.get('skill', '')}</sub>"
    for other in g["active"][1:]:
        s += (f"<br>⚠️ 병존: {CALL_LABEL.get(other['call'], other['call'])}"
              f" <sub>{other['date']} · {other.get('skill', '')}</sub>")
    return s


def _no_chase(c: dict) -> str:
    v = (c.get("target") or {}).get("noChaseAbove")
    return f">${v:,.2f}" if isinstance(v, (int, float)) else "—"


def _link(c: dict) -> str:
    rep = c.get("report") or ""
    if not rep.startswith("reports/"):
        return "—"
    rel = rep[len("reports/"):]
    return f"[{Path(rel).name}]({rel})"


def _reason(c: dict, n: int = 90) -> str:
    r = str(c.get("reason") or "").strip()
    if not r:
        return ""
    return _esc(r if len(r) <= n else r[:n].rstrip() + "…")


# ── 표 ──────────────────────────────────────────────────────────────────

def render_positions(groups: dict[str, dict], positions: dict[str, dict]) -> str:
    rows = [
        AUTO_NOTE,
        "",
        "| 티커 | 최초 매수일 | 평균 단가 · 수량 | 현재 판정 | 티어 · 요구 MOS | 증액 래더 — 차수 · 가격 · 비중 | 추격금지 | 건강도 | 판단 사유 | 근거 |",
        "|------|-----------|----------------|----------|:----------:|------------------|---------|:------:|---------|------|",
    ]
    for t in sorted(positions):
        p = positions[t]
        avg = p["cost"] / p["qty"]
        g = groups.get(t)
        qty = f"{p['qty']:g}주"
        if g is None:
            rows.append(f"| **{t}** | {p['first']} | {_money(avg)} · {qty} | ⬛ 기록부에 콜 없음 | — | — | — | — | — | — |")
            continue
        lead = g["active"][0]
        rows.append(
            f"| **{t}** | {p['first']} | {_money(avg)} · {qty} | {_verdict(g)} | {_tier(lead, False)} | "
            f"{_ladder(lead)} | {_no_chase(lead)} | {_health(g)} | {_reason(lead)} | {_link(lead)} |"
        )
    if len(rows) == 4:
        rows.append("| — | (보유 없음) | | | | | | | | |")
    return "\n".join(rows)


def render_watchlist(groups: dict[str, dict], positions: dict[str, dict]) -> str:
    watch, other, excluded = [], [], []
    for t in sorted(groups):
        if t in positions:
            continue
        active = groups[t]["active"]
        if active[0]["call"] == "hold":
            watch.append(t)
        elif all(c["call"] == "avoid" for c in active):
            # 제외 논제(TASK-192) — 살아있는 판단이 전부 회피. 대시보드 lib/thesis-groups.ts isExcluded 와 같은 규칙.
            excluded.append(t)
        else:
            other.append(t)
    # 최근 판단이 위로 — 손댄 종목이 먼저 보인다.
    watch.sort(key=lambda t: groups[t]["active"][0]["date"], reverse=True)
    rows = [
        AUTO_NOTE,
        "",
        "| 티커 | 현재 판정 | 시점가 | 티어 · 체결확률 | 진입 래더 — 차수 · 가격 · 비중 | 추격금지 | 내재가치 | 건강도 | 판단 사유 | 근거 |",
        "|------|----------|-------|:----------:|------------------|---------|--------|:------:|---------|------|",
    ]
    for t in watch:
        g = groups[t]
        lead = g["active"][0]
        fv = (lead.get("target") or {}).get("fairValue")
        rows.append(
            f"| **{t}** | {_verdict(g)} | {_money(lead.get('priceAtCall'))} | {_tier(lead, True)} | "
            f"{_ladder(lead)} | {_no_chase(lead)} | {_money(fv) if fv else '—'} | {_health(g)} | "
            f"{_reason(lead)} | {_link(lead)} |"
        )
    if not watch:
        rows.append("| — | (관망 논제 없음) | | | | | | | | |")
    sections = [
        (other, "**관망이 아닌 미보유 종목** — 최근 판단이 매수이거나 출처끼리 갈려 진입 래더가 없다."),
        (excluded, "**제외** — 살아있는 판단이 전부 회피(`avoid`)라 검토 대상에서 뺀 관찰 논제. "
                   "다시 보려면 `/thesis-tracker {티커} 논제수립`."),
    ]
    for tickers, title in sections:
        if not tickers:
            continue
        rows += [
            "",
            title,
            "",
            "| 티커 | 현재 판정 | 시점가 | 건강도 | 판단 사유 | 근거 |",
            "|------|----------|-------|:------:|---------|------|",
        ]
        for t in tickers:
            g = groups[t]
            lead = g["active"][0]
            rows.append(
                f"| **{t}** | {_verdict(g)} | {_money(lead.get('priceAtCall'))} | {_health(g)} | "
                f"{_reason(lead)} | {_link(lead)} |"
            )
    return "\n".join(rows)


def replace_block(md: str, name: str, body: str) -> str:
    begin, end = f"<!-- auto:{name}:begin -->", f"<!-- auto:{name}:end -->"
    pat = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if not pat.search(md):
        raise SystemExit(f"마커 {begin} … {end} 가 {TRACK_RECORD.name} 에 없습니다.")
    return pat.sub(lambda _: f"{begin}\n{body}\n{end}", md, count=1)


def render(md: str, calls: list[dict], today: date) -> str:
    positions = parse_positions(md)
    groups = group_theses(calls, today)
    md = replace_block(md, "positions", render_positions(groups, positions))
    return replace_block(md, "watchlist", render_watchlist(groups, positions))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="track-record.md 표를 판단 기록부에서 다시 그린다")
    ap.add_argument("--check", action="store_true", help="갱신이 필요하면 종료코드 1 (파일은 쓰지 않음)")
    args = ap.parse_args(argv)
    if not TRACK_RECORD.exists():
        print(f"{TRACK_RECORD} 없음 — 건너뜀")
        return 0
    old = TRACK_RECORD.read_text(encoding="utf-8")
    new = render(old, load_calls(), date.today())
    if new == old:
        print("track-record.md 표: 변경 없음")
        return 0
    if args.check:
        print("track-record.md 표가 판단 기록부와 어긋납니다 — python3 tools/render_track_record.py")
        return 1
    TRACK_RECORD.write_text(new, encoding="utf-8")
    print("track-record.md 표 갱신 완료 (보유 포지션 · 관찰 논제)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
