#!/usr/bin/env python3
"""기존 git 저장소의 모든 보고서(reports/**/*.md)를 Supabase로 1회 이관한다.

각 파일의 committed_at 은 git 마지막 커밋 시각으로 보존한다(신선도 정확도 유지).

사용법:
    python tools/migrate_reports_to_supabase.py            # 실제 이관
    python tools/migrate_reports_to_supabase.py --dry-run  # 대상만 출력
"""
from __future__ import annotations

import argparse

from publish_report import REPO_ROOT, build_row, supabase_upsert


def main() -> None:
    ap = argparse.ArgumentParser(description="기존 보고서를 Supabase로 일괄 이관")
    ap.add_argument("--dry-run", action="store_true", help="업로드 없이 대상 목록만 출력")
    args = ap.parse_args()

    reports_dir = REPO_ROOT / "reports"
    md_files = sorted(reports_dir.rglob("*.md"))
    rels = [str(p.relative_to(REPO_ROOT)).replace("\\", "/") for p in md_files]

    if not rels:
        print("이관할 보고서가 없습니다.")
        return

    print(f"대상 {len(rels)}개:")
    for r in rels:
        print(f"  - {r}")

    if args.dry_run:
        print("\n[dry-run] 업로드하지 않았습니다.")
        return

    rows = [build_row(rel, use_git_date=True) for rel in rels]
    # 배치 업서트(한 번에). 개수가 많지 않아 단일 요청으로 충분.
    supabase_upsert(rows)
    print(f"\n이관 완료: {len(rows)}개 보고서를 Supabase에 upsert 했습니다.")


if __name__ == "__main__":
    main()
