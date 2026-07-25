#!/usr/bin/env python3
"""Supabase reports 테이블 → 로컬 reports/ 로 되받는다(발행의 역방향).

Supabase가 소스 오브 트루스이므로, 로컬 파일이 유실되면 대시보드에는 보이는데
로컬에서 참조할 수 없는 상태가 된다. 이 스크립트로 복구한다.

사용법:
    python3 tools/pull_reports_from_supabase.py --dry-run     # 차이만 확인
    python3 tools/pull_reports_from_supabase.py               # 없는 파일만 복구
    python3 tools/pull_reports_from_supabase.py --overwrite   # 내용이 다른 파일까지 DB 버전으로 덮어쓰기
    python3 tools/pull_reports_from_supabase.py --path reports/ADBE/FinalReport.md   # 특정 경로만

환경변수: publish_report.py 와 동일 (SUPABASE_URL / SUPABASE_SERVICE_KEY,
dashboard/.env.local 폴백).
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publish_report import REPO_ROOT, load_env  # noqa: E402  (같은 자격증명 로직 재사용)

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass


def fetch_rows() -> list[dict]:
    url, key = load_env()
    endpoint = f"{url}/rest/v1/reports?select=path,content,updated_at&order=path"
    req = urllib.request.Request(endpoint)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase HTTP {e.code}: {e.read().decode('utf-8', 'replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"Supabase 연결 실패: {e.reason}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Supabase의 보고서를 로컬로 복구")
    ap.add_argument("--dry-run", action="store_true", help="쓰지 않고 차이만 출력")
    ap.add_argument("--overwrite", action="store_true",
                    help="로컬에 있지만 내용이 다른 파일도 DB 버전으로 덮어쓴다")
    ap.add_argument("--path", action="append", default=None,
                    help="특정 경로만 처리(여러 번 지정 가능)")
    args = ap.parse_args()

    rows = fetch_rows()
    if args.path:
        wanted = set(args.path)
        rows = [r for r in rows if r["path"] in wanted]
        missing_keys = wanted - {r["path"] for r in rows}
        for k in sorted(missing_keys):
            print(f"Supabase에 없음: {k}")

    created: list[str] = []
    updated: list[str] = []
    same = 0
    differs: list[str] = []

    for row in rows:
        rel = row["path"]
        # 경로 탈출 방지 — DB 값을 그대로 파일시스템에 쓰기 전에 검증한다.
        if not rel.startswith("reports/") or not rel.endswith(".md") or ".." in rel.split("/"):
            print(f"건너뜀(경로 이상): {rel}")
            continue
        abs_path = REPO_ROOT / rel
        content = row["content"]

        if not abs_path.exists():
            if not args.dry_run:
                abs_path.parent.mkdir(parents=True, exist_ok=True)
                abs_path.write_text(content, encoding="utf-8")
            created.append(rel)
            continue

        if abs_path.read_text(encoding="utf-8") == content:
            same += 1
        elif args.overwrite:
            if not args.dry_run:
                abs_path.write_text(content, encoding="utf-8")
            updated.append(rel)
        else:
            differs.append(rel)

    verb = "복구 예정" if args.dry_run else "복구 완료"
    print(f"Supabase {len(rows)}건 조회 — 동일 {same}건")
    for rel in created:
        print(f"  [{verb}] {rel}")
    for rel in updated:
        print(f"  [덮어씀] {rel}")
    for rel in differs:
        print(f"  [내용 다름 — 유지] {rel}  (DB 버전으로 덮어쓰려면 --overwrite)")
    if not created and not updated and not differs:
        print("로컬과 Supabase가 일치합니다.")


if __name__ == "__main__":
    main()
