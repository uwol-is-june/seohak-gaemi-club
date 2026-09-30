#!/usr/bin/env python3
"""콜 채점 파리티 테스트 — Python 쪽(TASK-60).

공유 픽스처(data/test/call-scoring-fixtures.json)를 score_calls.score_call 에 넣어
기대값과 대조한다. dashboard/lib/calls.fixture.test.ts 가 같은 픽스처를 TS 로 검증하므로,
둘 중 하나라도 규칙이 어긋나면 이 테스트/저 테스트가 깨진다(수기 동기화 drift 방지).

사용법:  python tools/test_score_calls.py   (성공 시 exit 0)
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
import score_calls as sc  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURES = REPO_ROOT / "data" / "test" / "call-scoring-fixtures.json"


def main() -> int:
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    failures = []
    for case in data["cases"]:
        today = date.fromisoformat(case["today"])
        path = [tuple(x) for x in case["path"]] if case.get("path") else None
        result = sc.score_call(case["call"], case["priceNow"], today, path)
        for key, want in case["expect"].items():
            got = result.get(key)
            if got != want:
                failures.append(f"[{case['name']}] {key}: 기대 {want!r} ≠ 실제 {got!r}")

    # 중복 접기 파리티(TASK-139) — 키는 id + call.
    for case in data.get("dedupeCases", []):
        kept = sorted([c["id"], c["call"], c["priceAtCall"]] for c in sc.dedupe_calls(case["calls"]))
        want = sorted(case["expect"])
        if kept != want:
            failures.append(f"[dedupe: {case['name']}] 기대 {want} ≠ 실제 {kept}")

    total = len(data["cases"]) + len(data.get("dedupeCases", []))
    if failures:
        print(f"❌ 파리티 실패 ({len(failures)}건):")
        for f in failures:
            print("  - " + f)
        return 1
    print(f"✅ Python 채점 파리티 통과 ({total} 케이스)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
