#!/usr/bin/env python3
"""대시보드 디자인 토큰 오용 검사.

리뉴얼(2026-09-23)로 정리한 규칙이 주석에만 적혀 있으면 다음 편집에서 다시 샌다.
기계가 지키게 한다.

    python3 tools/check_design_tokens.py          # 검사만
    python3 tools/check_design_tokens.py --list   # 위반 전체 나열

규칙의 근거는 dashboard/app/globals.css 의 @theme 주석에 실측 대비값과 함께 있다.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# lib/ 도 포함한다 — 일부 판정 모듈이 톤 클래스 문자열을 직접 들고 있다
# (예: lib/bottleneck.ts 의 color, lib/earnings-day.ts 의 tone).
SCAN_DIRS = [
    ROOT / "dashboard" / "components",
    ROOT / "dashboard" / "app",
    ROOT / "dashboard" / "lib",
]

# (정규식, 제목, 왜 안 되는가)
RULES: list[tuple[str, str, str]] = [
    (
        r"\btext-primary\b",
        "primary 를 텍스트 색으로 씀",
        "--color-primary(#3182F6)는 카드 위 4.46:1이라 본문 기준(4.5) 미달이다. "
        "fill 전용이고, 파란 글자가 필요하면 text-down(#4593FC, 5.39:1)을 쓴다.",
    ),
    (
        r"\btext-faint\b(?![^\"'`]*\b(?:text-\[1[01]px\]|sr-only)\b)",
        "faint 를 본문 색으로 씀",
        "--color-faint(#6B7684)는 3.59:1이라 UI 요소 전용이다. 읽어야 하는 글자는 "
        "text-mute(5.45:1) 이상을 쓴다.",
    ),
    (
        r"(?:bg|text|border|ring|fill|stroke|from|to|via|divide)-"
        r"(?:slate|gray|zinc|neutral|stone|emerald|green|lime|red|rose|pink|amber|yellow|"
        r"orange|blue|sky|indigo|violet|purple|fuchsia|teal|cyan)-[0-9]{2,3}",
        "Tailwind 기본 팔레트 직접 사용",
        "의미 토큰을 쓴다. 등락은 up/down(한국 관례: 상승 빨강·하락 파랑), "
        "판정은 success/danger/warn. 두 축을 섞으면 '빗나감'이 '상승'으로 읽힌다.",
    ),
    (
        r"(?:bg|text|border|ring|fill|stroke|divide)-white\b",
        "순백(#fff) 직접 지정",
        "다크 테마의 흰색은 --color-ink(#F2F4F6)다. 순백은 눈부시고 토큰 밖이다.",
    ),
    (
        r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b",
        "hex 색상 하드코딩",
        "색은 globals.css 의 @theme 이 유일한 출처다.",
    ),
]


def scan(list_all: bool) -> int:
    files: list[Path] = []
    for d in SCAN_DIRS:
        if d.exists():
            files += sorted(d.rglob("*.tsx")) + sorted(d.rglob("*.ts"))

    total = 0
    for pattern, title, why in RULES:
        rx = re.compile(pattern)
        hits: list[tuple[Path, int, str]] = []
        for f in files:
            for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
                # 주석 줄은 규칙을 '설명'하는 자리라 건너뛴다
                st = line.lstrip()
                if st.startswith(("//", "*", "/*")):
                    continue
                if rx.search(line):
                    hits.append((f.relative_to(ROOT), i, st[:100]))
        if hits:
            total += len(hits)
            print(f"\n🔴 {title} — {len(hits)}건")
            print(f"   {why}")
            for f, i, src in hits if list_all else hits[:5]:
                print(f"     {f}:{i}  {src}")
            if not list_all and len(hits) > 5:
                print(f"     … 외 {len(hits) - 5}건 (--list 로 전체)")

    if total == 0:
        print(f"✅ 디자인 토큰 위반 없음 ({len(files)}개 파일 검사)")
        return 0
    print(f"\n합계 {total}건")
    return 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="위반을 전부 나열")
    sys.exit(scan(ap.parse_args().list))
