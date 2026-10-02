#!/usr/bin/env python3
"""실험실 공개 페이지 데이터 생성 — tools/build_lab_site.py

data/lab-calls.jsonl(실험실 판단 기록부)에서 **주차별 추천만** 뽑아 site/lab/picks.json 을 만든다.
site/lab/ 은 Vercel 에 정적 사이트로 배포되는 폴더다(서버·빌드 없음) — 모바일 전용 간단 목록.

보여주는 것은 주차 · 종목 · 추천가 · 목표가 · 철회가뿐이다. 대조군·채점·시세는 넣지 않는다
(실시간이 필요 없고, 정적 페이지라 받을 수도 없다).

    python3 tools/build_lab_site.py          # site/lab/picks.json 갱신
    python3 tools/build_lab_site.py --check  # 갱신이 필요하면 종료코드 1

lab_record.py 가 기록 직후 자동으로 부른다 — 손으로 돌릴 일은 거의 없다.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
LEDGER = REPO_ROOT / "data" / "lab-calls.jsonl"
OUT = REPO_ROOT / "site" / "lab" / "picks.json"


def week_label(iso: str) -> str:
    """목요일 기준 주차 — 그 주(월~일)의 목요일이 속한 달의 몇 번째 주.

    "날짜 ÷ 7" 로 세면 10/02(금)와 10/05(월)가 둘 다 '10월 1주차'가 돼 주차가 겹친다.
    목요일 기준이면 한 주(월~일)가 정확히 한 라벨을 갖는다: 10/02 → 10월 1주차, 10/05 → 10월 2주차.
    """
    d = date.fromisoformat(iso)
    thursday = d - timedelta(days=d.weekday()) + timedelta(days=3)
    return f"{thursday.month}월 {(thursday.day - 1) // 7 + 1}주차"


def build(rows: list[dict]) -> dict:
    calls = {r["id"]: r for r in rows if r.get("kind") == "call"}
    weeks = []
    for r in rows:
        if r.get("kind") == "call" and r.get("skill") == "lab-pick":
            base, repeat = r, False
        elif r.get("kind") == "repeat" and r.get("skill") == "lab-pick":
            base, repeat = calls.get(r.get("ref"), {}), True
        elif r.get("kind") == "none":
            weeks.append({"runDate": r["date"], "week": week_label(r["date"]), "kind": "none",
                          "candidates": r.get("candidates", 0)})
            continue
        else:
            continue
        if not base:
            continue
        price = float(base["priceAtCall"])
        weeks.append({
            "runDate": r["date"],
            "week": week_label(r["date"]),
            "kind": "pick",
            "repeat": repeat,
            "pickedOn": base["date"],
            "ticker": base["ticker"],
            "name": base.get("name") or base["ticker"],
            "sector": base.get("sector"),
            "price": round(price, 2),
            "target": round(float(base["target"]), 2),
            "stop": round(float(base["stopLoss"]), 2),
            "targetPct": round((float(base["target"]) / price - 1) * 100, 1),
            "stopPct": round((float(base["stopLoss"]) / price - 1) * 100, 1),
            "horizonMonths": base.get("horizonMonths", 12),
        })
    weeks.sort(key=lambda w: w["runDate"], reverse=True)
    return {"updatedAt": weeks[0]["runDate"] if weeks else None, "weeks": weeks}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="실험실 공개 페이지 데이터(site/lab/picks.json) 생성")
    ap.add_argument("--check", action="store_true", help="갱신이 필요하면 종료코드 1 (쓰지 않음)")
    args = ap.parse_args(argv)

    rows = []
    if LEDGER.exists():
        for line in LEDGER.read_text(encoding="utf-8").splitlines():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    text = json.dumps(build(rows), ensure_ascii=False, indent=1) + "\n"
    current = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    if args.check:
        if current != text:
            print("site/lab/picks.json 갱신 필요 — python3 tools/build_lab_site.py")
            return 1
        print("site/lab/picks.json: 최신")
        return 0
    if current != text:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(text, encoding="utf-8")
        print(f"site/lab/picks.json 갱신 ({len(json.loads(text)['weeks'])}주)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
