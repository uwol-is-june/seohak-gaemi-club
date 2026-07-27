#!/usr/bin/env python3
"""보고서(.md)를 Supabase reports 테이블에 발행(upsert)한다.

git push 대신 이 스크립트로 보고서를 대시보드에 반영한다.
파싱(회사 정규화·스크리닝 판정·신뢰도)은 발행 시점에 수행돼 컬럼으로 저장되므로,
대시보드는 쿼리 1회로 목록을 그린다(본문 N+1 fetch 제거).

사용법:
    python tools/publish_report.py reports/WST/WST-checklist-20260723.md [다른.md ...]

환경변수(우선순위: 실제 환경변수 > dashboard/.env.local):
    SUPABASE_URL           예: https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY   service_role 키(서버 전용, 절대 커밋 금지)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Windows 콘솔(cp949)에서 한글·기호 출력 시 UnicodeEncodeError 로 죽는 것을 막는다.
# 이 스크립트는 Stop 훅이 실행하므로 여기서 죽으면 발행 체인 전체가 끊긴다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent

# ─── 회사명 정규화 (github.ts의 COMPANY_ALIAS_GROUPS 포팅) ──────────────────
COMPANY_ALIAS_GROUPS = [
    ["QUBT", "QuantumComputing", "Quantum Computing", "퀀텀컴퓨팅"],
]


def _normalize_company_key(s: str) -> str:
    return re.sub(r"[\s_.\-]", "", s.lower())


_ALIAS_LOOKUP = {}
for _group in COMPANY_ALIAS_GROUPS:
    for _name in _group:
        _ALIAS_LOOKUP[_normalize_company_key(_name)] = _group[0]


def canonical_company(folder: str) -> str:
    return _ALIAS_LOOKUP.get(_normalize_company_key(folder), folder)


def company_from_path(path: str) -> str | None:
    """reports/{company}/{file}.md → company(정규화); reports/{file}.md → None."""
    parts = path.split("/")
    if len(parts) > 2:
        return canonical_company(parts[1])
    return None


# ─── 판정 파싱 (github.ts 포팅) ─────────────────────────────────────────────
def classify_verdict(scan: str) -> str | None:
    if re.search(r"면제\s*통과", scan):
        return "면제 통과"
    if "탈락" in scan:
        return "탈락"
    if "통과" in scan:
        return "통과"
    if re.search(r"데이터\s*부족", scan):
        return "데이터 부족"
    return None


def parse_quality_screen_result(md: str) -> str | None:
    marker = re.search(
        r"<!--\s*quality-screen\s+result:\s*(면제\s*통과|탈락|통과|데이터\s*부족)\s*-->", md
    )
    if marker:
        return classify_verdict(marker.group(1))
    lines = md.split("\n")
    for i, line in enumerate(lines):
        if "최종 판정" in line:
            window = "\n".join(lines[i : i + 4])
            v = classify_verdict(window)
            if v:
                return v
            break
    return classify_verdict(md)


def parse_confidence_verdict(md: str) -> str | None:
    block = re.search(r"<!--\s*confidence-summary([\s\S]*?)-->", md)
    if not block:
        return None
    m = re.search(r"verdict:\s*(높음|보통|낮음)", block.group(1))
    return m.group(1) if m else None


# ─── 환경변수 로드 (dashboard/.env.local 폴백) ──────────────────────────────
def load_env() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not (url and key):
        env_path = REPO_ROOT / "dashboard" / ".env.local"
        if env_path.exists():
            for raw in env_path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k == "SUPABASE_URL" and not url:
                    url = v
                elif k == "SUPABASE_SERVICE_KEY" and not key:
                    key = v
    if not (url and key):
        sys.exit(
            "오류: SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없습니다 "
            "(환경변수 또는 dashboard/.env.local 에 설정)."
        )
    return url.rstrip("/"), key


# ─── Supabase upsert (PostgREST) ────────────────────────────────────────────
def supabase_upsert(rows: list[dict]) -> None:
    url, key = load_env()
    endpoint = f"{url}/rest/v1/reports?on_conflict=path"
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=body, method="POST")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    # merge-duplicates = path 충돌 시 upsert
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 201, 204):
                sys.exit(f"Supabase 응답 오류: {resp.status}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        sys.exit(f"Supabase HTTP {e.code}: {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"Supabase 연결 실패: {e.reason}")


def git_commit_iso(path: str) -> str | None:
    """파일의 마지막 git 커밋 시각(ISO). 실패 시 None."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", path],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=10,
        )
        s = out.stdout.strip()
        return s or None
    except Exception:
        return None


def build_row(rel_path: str, *, use_git_date: bool) -> dict:
    abs_path = REPO_ROOT / rel_path
    content = abs_path.read_text(encoding="utf-8")
    name = rel_path.split("/")[-1]
    summary = parse_quality_screen_result(content) if "-quality-screen-" in name else None
    now_iso = datetime.now(timezone.utc).isoformat()
    committed = (git_commit_iso(rel_path) if use_git_date else None) or now_iso
    return {
        "path": rel_path,
        "company": company_from_path(rel_path),
        "name": name,
        "content": content,
        "summary": summary,
        "confidence": parse_confidence_verdict(content),
        "committed_at": committed,
        "updated_at": now_iso,
    }


def normalize_rel(path_arg: str) -> str:
    """입력 경로를 repo 루트 기준 'reports/...' 상대경로(슬래시)로 정규화."""
    p = Path(path_arg)
    if p.is_absolute():
        # repo 루트 밖의 절대경로면 relative_to 가 ValueError → 친절히 종료(TASK-51).
        try:
            rel = p.resolve().relative_to(REPO_ROOT)
        except ValueError:
            sys.exit(f"오류: repo 루트 밖의 경로입니다: {path_arg}")
    else:
        # 이미 reports/ 로 시작하면 그대로, 아니면 그대로 시도
        rel = Path(path_arg)
    rel_str = str(rel).replace("\\", "/")
    if not rel_str.startswith("reports/") or not rel_str.endswith(".md"):
        sys.exit(f"오류: reports/*.md 경로가 아닙니다: {path_arg}")
    return rel_str


def is_internal(rel_str: str) -> bool:
    """언더스코어로 시작하는 파일은 내부 산출물 — 보고서가 아니다.

    예: `_data.md` (fetch_financials.py 가 만드는 재무 데이터 캐시, TASK-39).
    Stop 훅은 reports/ 하위 변경 .md 를 전부 넘기므로 여기서 걸러내지 않으면
    데이터 캐시가 보고서로 대시보드에 뜬다.
    """
    return Path(rel_str).name.startswith("_")


def main() -> None:
    ap = argparse.ArgumentParser(description="보고서를 Supabase에 발행(upsert)")
    ap.add_argument("paths", nargs="+", help="reports/ 하위 .md 경로(들)")
    ap.add_argument(
        "--git-date", action="store_true",
        help="committed_at 을 파일의 마지막 git 커밋 시각으로 설정(기본: 현재 시각)",
    )
    args = ap.parse_args()

    rels = [normalize_rel(p) for p in args.paths]
    skipped = [r for r in rels if is_internal(r)]
    targets = [r for r in rels if not is_internal(r)]
    for r in skipped:
        print(f"건너뜀(내부 파일): {r}")
    if not targets:
        print("발행할 보고서가 없습니다.")
        return

    # 존재하지 않는 파일은 건너뛴다 — build_row 의 read_text 가 FileNotFoundError 로
    # 크래시하면 Stop 훅 발행 체인 전체가 깨진다(TASK-51).
    rows = []
    for r in targets:
        if not (REPO_ROOT / r).is_file():
            print(f"경고: 파일이 없어 건너뜁니다: {r}", file=sys.stderr)
            continue
        rows.append(build_row(r, use_git_date=args.git_date))
    if not rows:
        print("발행할 보고서가 없습니다.")
        return
    supabase_upsert(rows)
    for r in rows:
        tag = f" [{r['summary']}]" if r["summary"] else ""
        print(f"발행 완료: {r['path']}{tag}")


if __name__ == "__main__":
    main()
