#!/usr/bin/env python3
"""Stop 훅 엔트리포인트 — reports/ 하위 변경된 .md 를 로컬 git 에 커밋한다(push 없음).

보고서 저장소는 **파일시스템 + git** 이다(Supabase 발행 경로는 폐지됨). 대시보드는
reports/*.md 를 직접 읽으므로 화면 반영에는 커밋이 필요 없고, 이 훅의 목적은
**이력·백업**이다 — 실수로 지워도 `git checkout` 으로 되돌릴 수 있게 한다.

훅으로 실행되므로 **어떤 경우에도 세션을 막지 않는다**: 실패해도 종료코드 0,
표준출력은 Claude Code 훅 JSON(systemMessage) 한 줄만 낸다.

수동 실행:
    python3 tools/commit_reports.py            # 커밋
    python3 tools/commit_reports.py --dry-run  # 대상만 출력
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Windows 콘솔(cp949)에서 한글·이모지 출력 시 UnicodeEncodeError 로 죽는 것을 막는다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, ValueError):
        pass


def git(*args: str, timeout: int = 30) -> subprocess.CompletedProcess:
    # encoding 명시 필수: 자식(git)이 UTF-8 을 내는데 부모가 cp949 로 디코딩하면
    # 한글 경로/파일명에서 UnicodeDecodeError 로 죽는다(errors=replace 로 방어).
    return subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=timeout,
        encoding="utf-8", errors="replace",
    )


def changed_reports() -> tuple[list[str], list[str]]:
    """(추가·수정된 경로, 삭제된 경로). core.quotepath=false 로 한글 파일명도 그대로 받는다.

    --untracked-files=all 필수: 이게 없으면 git 이 **완전히 새로운 폴더**(예: 처음
    만드는 티커 reports/CEG/)를 파일 단위로 나열하지 않고 `?? reports/CEG/` 폴더 하나로
    접어버린다. 그러면 경로가 .md 로 안 끝나 아래 필터에서 스킵돼 **새 종목의 첫 보고서가
    영영 커밋되지 않는다**. -uall 로 폴더를 파일 단위로 펼쳐야 한다.
    """
    out = git("-c", "core.quotepath=false", "status", "--porcelain",
              "--untracked-files=all", "--", "reports/")
    if out.returncode != 0:
        return [], []

    targets: list[str] = []
    deleted: list[str] = []
    for line in out.stdout.splitlines():
        if len(line) < 4:
            continue
        status, path = line[:2], line[3:]
        # 리네임/복사는 "old -> new" 형태 — 새 경로만 대상이다.
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        path = path.strip('"')
        if not path.endswith(".md"):
            continue
        # `_` 로 시작하는 파일/폴더는 **보고서가 아니라 원자료 캐시·공유 코퍼스**다
        # (예: reports/{티커}/_data.md — SEC XBRL 기계추출 결과,
        #      reports/{티커}/_q2-primary/*.md — Agent 들이 공유하는 1차 자료 발췌).
        # 대시보드(lib/reports-store.ts)도 같은 규칙으로 목록에서 제외한다.
        if any(seg.startswith("_") for seg in path.split("/")[1:]):
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
    ap = argparse.ArgumentParser(description="변경된 보고서를 로컬 git 에 커밋")
    ap.add_argument("--dry-run", action="store_true", help="대상만 출력하고 종료")
    args = ap.parse_args()

    targets, deleted = changed_reports()
    if not targets and not deleted:
        if args.dry_run:
            print("커밋 대상 없음.")
        return 0

    if args.dry_run:
        for t in targets:
            print(f"  추가/수정: {t}")
        for d in deleted:
            print(f"  삭제: {d}")
        return 0

    # 삭제도 함께 스테이징한다(대시보드에서 지운 보고서가 다음 턴마다 다시 잡히지 않게).
    paths = targets + deleted
    git("add", "--all", "--", *paths)

    if len(paths) == 1:
        subject = f"reports: {Path(paths[0]).name} 갱신"
    else:
        subject = f"reports: {len(paths)}건 갱신"
    commit = git("commit", "-m", subject, "--", *paths)
    if commit.returncode != 0:
        if "nothing to commit" in commit.stdout:
            return 0
        detail = (commit.stderr or commit.stdout).strip().splitlines()
        tail = detail[-1] if detail else f"종료코드 {commit.returncode}"
        emit(f"⚠️ 보고서 로컬 커밋 실패 ({len(paths)}건) — {tail}\n"
             f"수동 실행: python3 tools/commit_reports.py")
        return 0  # 훅은 세션을 막지 않는다

    names = ", ".join(Path(p).name for p in paths[:4])
    if len(paths) > 4:
        names += f" 외 {len(paths) - 4}건"
    note = f" (삭제 {len(deleted)}건 포함)" if deleted else ""
    emit(f"✅ 보고서 {len(paths)}건 로컬 커밋{note}: {names}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # 훅이 죽어도 세션은 살린다
        emit(f"⚠️ 보고서 커밋 훅 오류: {type(e).__name__}: {e}")
        sys.exit(0)
