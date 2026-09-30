#!/usr/bin/env python3
"""tools/ 파이썬 테스트 러너 — pytest 없이도 `test_*.py` 의 `test_*` 함수를 전부 돌린다.

pytest 형식(평범한 assert + test_ 함수)으로 쓰여 있으므로 pytest 가 있으면 `pytest tools` 로도 된다.
이 환경엔 pytest 가 없어서(2026-09-30 확인) 의존성 없이 도는 진입점을 따로 둔다.

실행:  python3 tools/run_tests.py
"""
from __future__ import annotations

import importlib
import sys
import traceback
from pathlib import Path
from types import ModuleType

TOOLS = Path(__file__).resolve().parent

# Windows 콘솔(cp949)에서 한글·기호 출력 시 UnicodeEncodeError 방지.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass


def run_module(mod: ModuleType) -> int:
    """모듈 안의 test_* 함수를 돌리고 실패 수를 돌려준다. 파일에 main() 만 있으면 그걸 부른다."""
    tests = [(n, f) for n, f in vars(mod).items() if n.startswith("test_") and callable(f)]
    if not tests and callable(getattr(mod, "main", None)):
        return 1 if mod.main() else 0
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  ✔ {name}")
        except Exception:  # noqa: BLE001 — 테스트 러너는 모든 실패를 모아 보고한다
            failed += 1
            print(f"  ✖ {name}")
            traceback.print_exc()
    return failed


def main() -> int:
    sys.path.insert(0, str(TOOLS))
    total_failed = 0
    for path in sorted(TOOLS.glob("test_*.py")):
        print(f"# {path.name}")
        mod = importlib.import_module(path.stem)
        total_failed += run_module(mod)
    print("✅ 전부 통과" if total_failed == 0 else f"❌ 실패 {total_failed}건")
    return 1 if total_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
