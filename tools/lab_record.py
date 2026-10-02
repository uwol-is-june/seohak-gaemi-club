#!/usr/bin/env python3
"""실험실 판단 기록부 — data/lab-calls.jsonl 에 이번 주 픽·대조군·"없음"을 append 한다. (TASK-185)

기존 판단 기록부(data/calls.jsonl)와 **파일을 분리**한다. 실험실은 기존 시스템과 독립된
두 번째 의견이라, 같은 파일에 넣으면 트랙레코드 탭·track-record.md·충돌 판정·채점기가
전부 실험실 콜을 걸러내야 하고 하나라도 빠지면 기존 화면이 바뀐다. 형식 원칙은 같다:
append-only · 시점가는 도구 실측(모델 기억값 금지) · 받든 안 받든 전부 기록.

🔴 순위는 기계(lab_screen.py)가 정하고 LLM 은 **탈락만** 시킬 수 있다(docs/LAB-SPEC.md 6절).
   이 도구가 그 규칙을 강제한다 — N위를 픽으로 기록하려면 1~N−1위 전부의 탈락 사유와
   증거 URL 이 있어야 한다. 탈락 없이 아래 순위를 고르는 것(= 승격)은 기록 자체가 거부된다.

사용법 (저장소 루트에서):
    # 1위가 결격 검증을 통과 → 1위 픽
    python3 tools/lab_record.py --screen data/_lab/screen-20261002.json --pick AOS \\
        --report reports/lab/lab-pick-20261002.md

    # 1위 탈락 → 2위 픽 (탈락 사유 | 증거 URL)
    python3 tools/lab_record.py --screen data/_lab/screen-20261002.json --pick SWKS \\
        --reject "AOS | 중국 매출 급감으로 평균회귀 불성립 | https://..."

    # 후보 0개 또는 상위 5개 전부 탈락 → 이번 주 없음
    python3 tools/lab_record.py --screen data/_lab/screen-20261002.json --none

    # 검증 대상 보기 (가장 최근 스크리닝, 기록 안 함)
    python3 tools/lab_record.py --brief

    # 사용자 수락/거절 (실제 매수 여부와 별개 — 매수는 기존 매매 로그로)
    python3 tools/lab_record.py --decide LAB-20261002-AOS-pick accepted
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
LEDGER = REPO_ROOT / "data" / "lab-calls.jsonl"

MAX_RANK = 5             # LAB-SPEC 6절: 최대 5위까지만 내려간다
REPEAT_DAYS = 30         # 같은 종목 30일 내 재선정 → 새 콜을 쌓지 않는다(repeat 로만 남김)
DECISIONS = ("accepted", "declined")


def ledger_rows(path: Path = LEDGER) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def parse_reject(raw: str) -> dict:
    """'TICKER | 사유 | URL' → {ticker, reason, evidence}. 증거 URL 없는 탈락은 거부."""
    parts = [p.strip() for p in raw.split("|")]
    if len(parts) < 3 or not parts[0] or not parts[1] or not parts[2].startswith("http"):
        raise ValueError(
            f'--reject 형식 오류: {raw!r}\n'
            '  "티커 | 탈락 사유 | 증거 URL" 이어야 합니다. 증거 없는 탈락은 기록하지 않습니다(LAB-SPEC 6절).'
        )
    return {"ticker": parts[0].upper(), "reason": parts[1], "evidence": " | ".join(parts[2:])}


def recent_pick(rows: list[dict], skill: str, ticker: str, on: date) -> dict | None:
    """같은 skill 에서 REPEAT_DAYS 안에 같은 종목을 이미 콜했으면 그 콜."""
    for r in reversed(rows):
        if r.get("skill") != skill or r.get("kind") != "call" or r.get("ticker") != ticker:
            continue
        days = (on - date.fromisoformat(r["date"])).days
        if 0 <= days <= REPEAT_DAYS:
            return r
    return None


def _call_row(screen: dict, ticker: str, skill: str, report: str | None,
              rejected: list[dict], now: str) -> dict:
    st = screen["stocks"][ticker]
    m, s, plan = st["metrics"], st["score"], st["plan"]
    row = {
        "id": f"LAB-{screen['runDate'].replace('-', '')}-{ticker}-{skill.split('-')[1]}",
        "kind": "call",
        "skill": skill,
        "ruleVersion": screen["ruleVersion"],
        "date": screen["runDate"],
        "ticker": ticker,
        "name": st.get("name"),
        "sector": st.get("sector"),
        "call": "buy",
        "rank": st["rank"],
        # 시점가 = 스크리닝이 Yahoo 에서 실측한 값. 목표가·철회선이 같은 가격에서 계산됐다.
        "priceAtCall": round(float(m["price"]), 4),
        "priceTime": m.get("priceTime"),
        "target": round(float(plan["target"]), 4),
        "stopLoss": round(float(plan["stopLoss"]), 4),
        "horizonMonths": plan["horizonMonths"],
        "upsidePct": round(m["upside"] * 100, 2),
        "score": {"quality": round(s["quality"], 1), "value": round(s["value"], 1),
                  "total": round(s["total"], 1),
                  "qualityGauge": s["qualityGauge"], "valueGauge": s["valueGauge"]},
        "flags": {"spinoffSuspect": bool(m.get("spinoffSuspect")), "imputed": m.get("imputed") or []},
        "screen": f"data/_lab/screen-{screen['runDate'].replace('-', '')}.json",
        "recordedAt": now,
    }
    if report:
        row["report"] = report
    if rejected:
        row["rejected"] = rejected
    return row


def build_rows(screen: dict, pick: str | None, none: bool, rejects: list[dict],
               report: str | None, existing: list[dict], now: str) -> list[dict]:
    """이번 실행의 기록 줄들(픽 + 대조군, 또는 없음). 규칙 위반이면 ValueError."""
    cands: list[str] = screen["candidates"]
    run_date = date.fromisoformat(screen["runDate"])
    if any(r.get("date") == screen["runDate"] and r.get("skill") in ("lab-pick", "lab-none")
           for r in existing):
        raise ValueError(f"{screen['runDate']} 실행은 이미 기록돼 있습니다 — append-only 라 다시 쓰지 않습니다.")

    rej_by = {r["ticker"]: r for r in rejects}
    if pick:
        pick = pick.upper()
        if pick not in cands:
            raise ValueError(f"{pick} 는 이번 주 후보가 아닙니다 — 기계 순위 밖의 종목은 고를 수 없습니다.")
        rank = cands.index(pick) + 1
        if rank > MAX_RANK:
            raise ValueError(f"{pick} 는 {rank}위 — 최대 {MAX_RANK}위까지만 내려갑니다. 위가 전부 탈락이면 --none.")
        missing = [t for t in cands[:rank - 1] if t not in rej_by]
        if missing:
            raise ValueError(
                f"{pick}({rank}위)를 고르려면 위 순위 {', '.join(missing)} 의 탈락 사유(--reject)가 필요합니다.\n"
                "  LLM 은 순위를 올릴 수 없고 탈락만 시킬 수 있습니다(LAB-SPEC 6절)."
            )
        if pick in rej_by:
            raise ValueError(f"{pick} 를 탈락시키면서 동시에 픽으로 고를 수 없습니다.")
        extra = [t for t in rej_by if t not in cands[:rank - 1]]
        if extra:
            raise ValueError(f"픽보다 아래 순위·후보 밖의 탈락은 의미가 없습니다: {', '.join(extra)}")
    elif none:
        top = cands[:MAX_RANK]
        missing = [t for t in top if t not in rej_by]
        if missing:
            raise ValueError(
                f"'없음'은 후보가 0개이거나 상위 {MAX_RANK}개가 전부 탈락일 때만 됩니다. "
                f"탈락 사유 없는 후보: {', '.join(missing)}"
            )
    else:
        raise ValueError("--pick 티커 또는 --none 중 하나가 필요합니다.")

    rows: list[dict] = []
    ordered_rej = [rej_by[t] for t in cands if t in rej_by]
    if pick:
        prev = recent_pick(existing, "lab-pick", pick, run_date)
        if prev:
            rows.append({"id": f"LAB-{screen['runDate'].replace('-', '')}-{pick}-repeat", "kind": "repeat",
                         "skill": "lab-pick", "ruleVersion": screen["ruleVersion"], "date": screen["runDate"],
                         "ticker": pick, "ref": prev["id"], "rejected": ordered_rej or None,
                         "report": report, "recordedAt": now})
        else:
            rows.append(_call_row(screen, pick, "lab-pick", report, ordered_rej, now))
    else:
        near = screen.get("nearMiss")
        rows.append({"id": f"LAB-{screen['runDate'].replace('-', '')}-none", "kind": "none",
                     "skill": "lab-none", "ruleVersion": screen["ruleVersion"], "date": screen["runDate"],
                     "candidates": len(cands), "nearMiss": near, "rejected": ordered_rej or None,
                     "report": report, "recordedAt": now})

    # 대조군 — 픽이 있든 없든 후보가 있으면 기록한다(순위·검증이 무작위보다 나은지 재는 비교군).
    ctrl = (screen.get("control") or {}).get("ticker")
    if ctrl:
        prev = recent_pick(existing, "lab-control", ctrl, run_date)
        if prev:
            rows.append({"id": f"LAB-{screen['runDate'].replace('-', '')}-{ctrl}-control-repeat",
                         "kind": "repeat", "skill": "lab-control", "ruleVersion": screen["ruleVersion"],
                         "date": screen["runDate"], "ticker": ctrl, "ref": prev["id"], "recordedAt": now})
        else:
            row = _call_row(screen, ctrl, "lab-control", None, [], now)
            row["seed"] = screen["control"]["seed"]
            rows.append(row)
    return [{k: v for k, v in r.items() if v is not None} for r in rows]


def latest_screen_path() -> Path | None:
    files = sorted((REPO_ROOT / "data" / "_lab").glob("screen-*.json"))
    return files[-1] if files else None


def brief(screen: dict, existing: list[dict], n: int = MAX_RANK) -> str:
    """스킬이 290KB JSON 을 통째로 읽지 않게 검증 대상만 압축해 보여준다(토큰 예산)."""
    done = [r for r in existing if r.get("date") == screen["runDate"] and r.get("kind") != "decision"]
    lines = [
        f"스크리닝 {screen['runDate']} · 규칙 {screen['ruleVersion']} · 후보 {len(screen['candidates'])}개"
        f" · 대조군 {(screen.get('control') or {}).get('ticker') or '없음'}",
        "⚠️ 이 실행일은 이미 기록됨 — 다시 기록할 수 없다" if done else "기록: 아직 없음",
        "",
        "| 순위 | 티커 | 회사 | 섹터 | 현재가 | 목표가 | 상승여력 | 최신 FY | 주의 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for t in screen["candidates"][:n]:
        st = screen["stocks"][t]
        m = st["metrics"]
        flags = []
        if m.get("spinoffSuspect"):
            flags.append("분사의심 " + ",".join(f"{x['date']}×{x['ratio']}" for x in m["spinoffSuspect"]))
        if m.get("imputed"):
            flags.append("보완:" + "/".join(m["imputed"]))
        lines.append(
            f"| {st['rank']} | {t} | {st['name']} | {st['sector']} | ${m['price']:.2f} | "
            f"${st['plan']['target']:.2f} | {m['upside'] * 100:+.1f}% | {m.get('latestPeriodEnd')} | "
            f"{' · '.join(flags) or '—'} |"
        )
    if not screen["candidates"]:
        near = screen.get("nearMiss")
        lines.append(f"(후보 0개 — 근접: {near or '없음'}) → `--none` 으로 기록")
    return "\n".join(lines)


def decision_row(existing: list[dict], call_id: str, decision: str, now: str) -> dict:
    if decision not in DECISIONS:
        raise ValueError(f"결정은 {DECISIONS} 중 하나여야 합니다: {decision}")
    target = next((r for r in existing if r.get("id") == call_id), None)
    if not target or target.get("skill") != "lab-pick" or target.get("kind") != "call":
        raise ValueError(f"{call_id} 는 기록된 실험실 픽이 아닙니다.")
    return {"id": f"{call_id}-{decision}", "kind": "decision", "ref": call_id, "decision": decision,
            "date": date.today().isoformat(), "recordedAt": now}


def append(rows: list[dict], path: Path = LEDGER) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="실험실 판단 기록부(data/lab-calls.jsonl)에 append")
    ap.add_argument("--screen", help="lab_screen.py 산출 JSON 경로")
    ap.add_argument("--pick", help="픽 티커 (후보 상위 5위 이내)")
    ap.add_argument("--none", action="store_true", help="이번 주 없음")
    ap.add_argument("--reject", nargs="*", action="extend", default=None,
                    help='위 순위 탈락 — "티커 | 사유 | 증거 URL"')
    ap.add_argument("--report", help="픽 보고서 경로 (reports/lab/lab-pick-YYYYMMDD.md)")
    ap.add_argument("--decide", nargs=2, metavar=("ID", "accepted|declined"), help="사용자 수락/거절 기록")
    ap.add_argument("--brief", action="store_true", help="검증 대상(상위 5위)만 표로 출력 — 기록하지 않는다")
    args = ap.parse_args(argv)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    existing = ledger_rows()
    if args.brief:
        path = REPO_ROOT / args.screen if args.screen else latest_screen_path()
        if not path or not path.exists():
            print("오류: 스크리닝 결과가 없습니다 — python3 tools/lab_screen.py 를 먼저 실행하세요.", file=sys.stderr)
            return 1
        print(f"{path.relative_to(REPO_ROOT).as_posix()}\n")
        print(brief(json.loads(path.read_text(encoding="utf-8")), existing))
        return 0
    try:
        if args.decide:
            rows = [decision_row(existing, args.decide[0], args.decide[1], now)]
        else:
            if not args.screen:
                ap.error("--screen 이 필요합니다.")
            screen = json.loads((REPO_ROOT / args.screen).read_text(encoding="utf-8"))
            rejects = [parse_reject(r) for r in (args.reject or [])]
            rows = build_rows(screen, args.pick, args.none, rejects, args.report, existing, now)
    except ValueError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1

    append(rows)
    # 공개 페이지(site/lab/picks.json)도 같은 순간 다시 만든다 — 기록과 페이지가 어긋나지 않게.
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import build_lab_site
        build_lab_site.main([])
    except Exception as e:  # noqa: BLE001 — 기록 자체는 이미 끝났다
        print(f"주의: site/lab/picks.json 갱신 실패({type(e).__name__}: {e}) — python3 tools/build_lab_site.py")
    for r in rows:
        desc = r.get("ticker") or f"없음 (후보 {r.get('candidates')}개)"
        extra = (f" @ ${r['priceAtCall']} → 목표 ${r['target']} · 철회 ${r['stopLoss']}"
                 if r.get("kind") == "call" else "")
        print(f"기록: {r['id']} [{r.get('skill', r.get('kind'))}] {desc}{extra}")
    print(f"  → {LEDGER.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
