#!/usr/bin/env python3
"""보고서 마커에서 '티커 → 섹터' 자동 맵을 만들어 Supabase app_config 에 저장한다(TASK-90).

대시보드 '종목별 보고서' 탭의 1차·2차 위계(분야 → 섹터)에서 **섹터 → 분야**는 이미
자동 판정(dashboard/lib/sector-domains.ts)이지만, **티커 → 섹터**는 사용자가 그룹 편집
UI로 직접 넣어야 했다. 이 스크립트가 그 빈칸을 보고서 자체에서 채운다.

읽는 마커 두 가지(둘 다 HTML 주석이라 렌더링에는 안 보인다):

  1) 퍼널 보고서(reports/{섹터}-funnel-{YYYYMMDD}.md) — /industry-funnel 산출물
     <!-- funnel sector: Defense | finalists: NOC, GD, PLTR -->
     → 최종 선정 종목 전부를 그 섹터에 배정한다.

  2) 종목 보고서(reports/{티커}/*.md) — /investment-team·/investment-checklist 등
     <!-- meta sector: Defense -->
     → 그 폴더의 티커를 해당 섹터에 배정한다. 퍼널을 거치지 않은 종목(시작점 B)을 덮고,
       충돌 시 퍼널 마커보다 **우선**한다(더 구체적인 출처이므로).

같은 우선순위 안에서 충돌하면 파일명 날짜가 최신인 쪽이 이긴다.

결과는 app_config('sector_auto_map') 에 {"NOC": "Defense", ...} 형태로 upsert 된다.
대시보드는 이 맵을 **수동 그룹의 빈칸에만** 적용한다(수동 우선 — mergeAutoSectorGroups).

사용법:
    python3 tools/sync_sector_map.py            # 스캔 + Supabase 저장
    python3 tools/sync_sector_map.py --dry-run  # 스캔 결과만 출력(저장 안 함)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publish_report import canonical_company, load_env  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = REPO_ROOT / "reports"
CONFIG_KEY = "sector_auto_map"

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, ValueError):
        pass

FUNNEL_MARKER = re.compile(
    r"<!--\s*funnel\s+sector:\s*([^|>]+?)\s*\|\s*finalists:\s*([^>]*?)\s*-->", re.IGNORECASE
)
META_MARKER = re.compile(r"<!--\s*meta\s+sector:\s*([^>|]+?)\s*-->", re.IGNORECASE)
# 티커: 영문 시작 + 영숫자/점/하이픈. 'BRK.B' 같은 클래스 표기까지 허용하되 문장은 배제한다.
TICKER_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")
DATE_RE = re.compile(r"(\d{8})")

# 우선순위 티어 — 큰 쪽이 이긴다.
TIER_FUNNEL = 0
TIER_META = 1


def file_date(name: str) -> str:
    m = DATE_RE.search(name)
    return m.group(1) if m else "00000000"


def clean_ticker(raw: str) -> str | None:
    """마커 안의 한 항목을 티커로 정규화. 굵게(**NOC**)·괄호주석 등 장식을 벗긴다."""
    t = raw.strip().strip("*`\"'").strip()
    t = t.split("(")[0].strip()  # 'TSM (TSMC)' → 'TSM'
    t = t.upper()
    return t if TICKER_RE.match(t) else None


def scan() -> tuple[dict[str, str], list[str]]:
    """(티커→섹터 맵, 경고 목록)."""
    warnings: list[str] = []
    # ticker → (tier, date, sector) — 더 높은 (tier, date) 가 이긴다.
    best: dict[str, tuple[int, str, str]] = {}

    def offer(ticker: str, sector: str, tier: int, date: str, src: str) -> None:
        cur = best.get(ticker)
        cand = (tier, date, sector)
        if cur is None or cand[:2] > cur[:2]:
            # 우선순위가 더 높다(종목 마커 > 퍼널 마커, 같은 티어면 최신 날짜) → 정상 교체.
            best[ticker] = cand
            return
        # 여기부터는 cand 가 cur 를 못 이긴 경우다. 그중 **동률인데 섹터만 다른 것**이 충돌이다.
        # 우선순위로 우열을 못 가리므로 먼저 스캔된 값을 유지하고(파일 순회가 sorted() 라 결정적)
        # 경고를 남긴다 — 조용히 넘기면 대시보드에서 섹터가 갈려도 원인을 못 찾는다.
        if cur[:2] == cand[:2] and cur[2] != sector:
            warnings.append(
                f"{ticker}: 섹터 충돌 '{cur[2]}' vs '{sector}' — 우선순위·날짜가 같아 "
                f"우열을 못 가림 → '{cur[2]}' 유지 ({src}). 한쪽 마커를 고쳐 표기를 통일하라."
            )

    if not REPORTS_DIR.is_dir():
        return {}, ["reports/ 디렉터리가 없습니다."]

    # 1) 퍼널 보고서(루트) — 최종 선정 종목
    for path in sorted(REPORTS_DIR.glob("*.md")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as e:
            warnings.append(f"{path.name}: 읽기 실패 ({e})")
            continue
        m = FUNNEL_MARKER.search(text)
        if not m:
            continue
        sector = m.group(1).strip()
        if not sector:
            warnings.append(f"{path.name}: funnel 마커에 섹터명이 비어 있습니다.")
            continue
        date = file_date(path.name)
        found = 0
        for raw in re.split(r"[,/·]", m.group(2)):
            ticker = clean_ticker(raw)
            if not ticker:
                if raw.strip():
                    warnings.append(f"{path.name}: 티커로 못 읽은 항목 '{raw.strip()}'")
                continue
            offer(canonical_company(ticker), sector, TIER_FUNNEL, date, path.name)
            found += 1
        if not found:
            warnings.append(f"{path.name}: funnel 마커에 유효한 티커가 없습니다.")

    # 2) 종목 보고서 — 폴더 티커에 직접 섹터 지정(퍼널보다 우선)
    for folder in sorted(p for p in REPORTS_DIR.iterdir() if p.is_dir()):
        ticker = canonical_company(folder.name)
        for path in sorted(folder.glob("*.md")):
            if path.name.startswith("_"):
                continue  # 내부 산출물(_data.md 등)
            try:
                text = path.read_text(encoding="utf-8")
            except OSError as e:
                warnings.append(f"{folder.name}/{path.name}: 읽기 실패 ({e})")
                continue
            m = META_MARKER.search(text)
            if not m:
                continue
            sector = m.group(1).strip()
            if sector:
                offer(ticker, sector, TIER_META, file_date(path.name), f"{folder.name}/{path.name}")

    return {t: v[2] for t, v in sorted(best.items())}, warnings


def upsert_config(mapping: dict[str, str]) -> None:
    url, key = load_env()
    endpoint = f"{url}/rest/v1/app_config?on_conflict=key"
    row = [{"key": CONFIG_KEY, "value": mapping}]
    req = urllib.request.Request(endpoint, data=json.dumps(row).encode("utf-8"), method="POST")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 201, 204):
                sys.exit(f"Supabase 응답 오류: {resp.status}")
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase HTTP {e.code}: {e.read().decode('utf-8', 'replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"Supabase 연결 실패: {e.reason}")


def main() -> None:
    ap = argparse.ArgumentParser(description="보고서 마커 → 티커별 섹터 자동 맵 동기화")
    ap.add_argument("--dry-run", action="store_true", help="스캔 결과만 출력하고 저장하지 않음")
    args = ap.parse_args()

    mapping, warnings = scan()
    for w in warnings:
        print(f"경고: {w}", file=sys.stderr)

    by_sector: dict[str, list[str]] = {}
    for ticker, sector in mapping.items():
        by_sector.setdefault(sector, []).append(ticker)
    for sector in sorted(by_sector):
        print(f"  {sector}: {', '.join(sorted(by_sector[sector]))}")

    if args.dry_run:
        print(f"(dry-run) 자동 배정 {len(mapping)}종목 / {len(by_sector)}섹터 — 저장 안 함")
        return
    upsert_config(mapping)
    print(f"섹터 자동 맵 저장 완료: {len(mapping)}종목 / {len(by_sector)}섹터")


if __name__ == "__main__":
    main()
