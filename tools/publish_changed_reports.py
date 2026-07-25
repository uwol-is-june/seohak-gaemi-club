#!/usr/bin/env python3
"""Stop 훅 엔트리포인트 — reports/ 하위 변경된 .md 를 Supabase에 발행하고 로컬 커밋한다.

CLAUDE.md 의 "자동 발행" 계약을 구현한다:
  세션 종료(Stop) → 변경 감지 → publish_report.py 로 upsert → 로컬 git 커밋(push 없음)

훅으로 실행되므로 **어떤 경우에도 세션을 막지 않는다**: 실패해도 종료코드 0,
표준출력은 Claude Code 훅 JSON(systemMessage) 한 줄만 낸다.

수동 실행도 가능:
    python3 tools/publish_changed_reports.py            # 발행 + 커밋
    python3 tools/publish_changed_reports.py --dry-run   # 대상만 출력
    python3 tools/publish_changed_reports.py --no-commit # 발행만, 커밋 안 함
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLISHER = REPO_ROOT / "tools" / "publish_report.py"


def git(*args: str, timeout: int = 30) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=timeout,
    )


def changed_reports() -> tuple[list[str], list[str]]:
    """(발행 대상, 삭제된 경로). core.quotepath=false 로 한글 파일명도 그대로 받는다."""
    out = git("-c", "core.quotepath=false", "status", "--porcelain", "--", "reports/")
    if out.returncode != 0:
        return [], []

    targets: list[str] = []
    deleted: list[str] = []
    for line in out.stdout.splitlines():
        if len(line) < 4:
            continue
        status, path = line[:2], line[3:]
        # 리네임/복사는 "old -> new" 형태 — 새 경로만 발행 대상이다.
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        path = path.strip('"')
        if not path.endswith(".md"):
            continue
        if "D" in status:
            deleted.append(path)
        else:
            targets.append(path)
    return sorted(set(targets)), sorted(set(deleted))


def emit(message: str) -> None:
    """Claude Code 훅 규약: stdout 에 JSON 한 줄. systemMessage 는 사용자에게 표시된다."""
    print(json.dumps({"systemMessage": message}, ensure_ascii=False))


def main() -> int:
    ap = argparse.ArgumentParser(description="변경된 보고서를 Supabase에 발행 + 로컬 커밋")
    ap.add_argument("--dry-run", action="store_true", help="대상만 출력하고 종료")
    ap.add_argument("--no-commit", action="store_true", help="발행만 하고 커밋하지 않음")
    args = ap.parse_args()

    targets, deleted = changed_reports()
    if not targets:
        if deleted and args.dry_run:
            print("발행 대상 없음. 삭제된 보고서: " + ", ".join(deleted))
        return 0

    if args.dry_run:
        print("발행 대상:")
        for t in targets:
            print(f"  {t}")
        if deleted:
            print("삭제됨(발행 대상 아님 — Supabase에는 남는다):")
            for d in deleted:
                print(f"  {d}")
        return 0

    pub = subprocess.run(
        [sys.executable, str(PUBLISHER), *targets],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=300,
    )
    if pub.returncode != 0:
        detail = (pub.stderr or pub.stdout).strip().splitlines()
        tail = detail[-1] if detail else f"종료코드 {pub.returncode}"
        emit(f"⚠️ 보고서 Supabase 발행 실패 ({len(targets)}건) — {tail}\n"
             f"수동 발행: python3 tools/publish_report.py {' '.join(targets)}")
        return 0  # 훅은 세션을 막지 않는다

    # 발행에 성공한 것만 커밋한다(발행 실패 시 커밋하면 다음 세션에 재시도 기회가 사라진다).
    published = [
        line.split("발행 완료: ", 1)[1].split(" [", 1)[0].strip()
        for line in pub.stdout.splitlines()
        if line.startswith("발행 완료: ")
    ] or targets

    note = ""
    if not args.no_commit:
        git("add", "--", *published)
        subject = (
            f"reports: {Path(published[0]).name} 발행"
            if len(published) == 1
            else f"reports: {len(published)}건 Supabase 발행"
        )
        commit = git("commit", "-m", subject, "--", *published)
        if commit.returncode != 0 and "nothing to commit" not in commit.stdout:
            note = " (로컬 커밋 실패 — 발행 자체는 완료)"

    names = ", ".join(Path(p).name for p in published[:4])
    if len(published) > 4:
        names += f" 외 {len(published) - 4}건"
    msg = f"✅ 보고서 {len(published)}건 Supabase 발행: {names}{note}"
    if deleted:
        msg += f"\n삭제된 보고서 {len(deleted)}건은 Supabase에 그대로 남아 있습니다: " + ", ".join(
            Path(d).name for d in deleted
        )
    emit(msg)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # 훅이 죽어도 세션은 살린다
        emit(f"⚠️ 보고서 자동 발행 훅 오류: {type(e).__name__}: {e}")
        sys.exit(0)
