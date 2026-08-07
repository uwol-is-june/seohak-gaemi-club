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
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLISHER = REPO_ROOT / "tools" / "publish_report.py"
SECTOR_SYNC = REPO_ROOT / "tools" / "sync_sector_map.py"

# Windows 콘솔(cp949)에서 한글·이모지 출력 시 UnicodeEncodeError 로 죽는 것을 막는다.
# 이 스크립트는 Stop 훅이 실행하므로 여기서 죽으면 발행 체인 전체가 끊긴다.
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
    """(발행 대상, 삭제된 경로). core.quotepath=false 로 한글 파일명도 그대로 받는다.

    --untracked-files=all 필수: 이게 없으면 git 이 **완전히 새로운 폴더**(예: 처음
    만드는 티커 reports/CEG/)를 파일 단위로 나열하지 않고 `?? reports/CEG/` 폴더 하나로
    접어버린다. 그러면 경로가 .md 로 안 끝나 아래 필터에서 스킵돼 **새 종목의 첫 보고서가
    영영 발행되지 않는다**. -uall 로 폴더를 파일 단위로 펼쳐야 한다.
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
        # 리네임/복사는 "old -> new" 형태 — 새 경로만 발행 대상이다.
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        path = path.strip('"')
        if not path.endswith(".md"):
            continue
        # `_` 로 시작하는 파일/폴더는 **보고서가 아니라 원자료 캐시·공유 코퍼스**다
        # (예: reports/{티커}/_data.md — SEC XBRL 기계추출 결과,
        #      reports/{티커}/_q2-primary/*.md — Agent 들이 공유하는 1차 자료 발췌).
        # 발행하면 대시보드 '종목별 보고서'에 원자료가 보고서로 섞여 뜬다.
        # dashboard/lib/articles.ts 도 같은 이유로 `_data.md/json` 을 제외한다.
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

    # 자식(publish_report.py)은 stdout 을 UTF-8 로 내므로 부모도 UTF-8 로 디코딩해야
    # 한다. text=True 기본은 로케일 코덱(Windows=cp949)이라 한글 출력에서 죽는다.
    # PYTHONIOENCODING/PYTHONUTF8 도 넘겨 자식 인코딩까지 이중으로 고정한다.
    child_env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    pub = subprocess.run(
        [sys.executable, str(PUBLISHER), *targets],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=300,
        encoding="utf-8", errors="replace", env=child_env,
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

    # 보고서가 바뀌었으면 '티커 → 섹터' 자동 맵도 다시 만든다(TASK-90). 실패해도
    # 발행 자체는 이미 끝났으므로 경고만 붙이고 넘어간다.
    sync_note = ""
    if SECTOR_SYNC.is_file():
        sync = subprocess.run(
            [sys.executable, str(SECTOR_SYNC)],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=120,
            encoding="utf-8", errors="replace", env=child_env,
        )
        if sync.returncode != 0:
            sync_note = " (섹터 자동 맵 갱신 실패 — python3 tools/sync_sector_map.py 로 재시도)"

    names = ", ".join(Path(p).name for p in published[:4])
    if len(published) > 4:
        names += f" 외 {len(published) - 4}건"
    msg = f"✅ 보고서 {len(published)}건 Supabase 발행: {names}{note}{sync_note}"
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
