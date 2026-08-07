#!/usr/bin/env python3
"""
데이터 소스 사전 접근 점검 — tools/site_preflight.py

사용법 (저장소 루트에서 상대경로로 실행 권장 — 폴더명이 달라도 동작):
  python3 tools/site_preflight.py <프로파일> [티커]

프로파일:
  industry-research          stockanalysis / macrotrends / sec / yahoo / cnbc / seekingalpha / finviz
  industry-funnel            stockanalysis / macrotrends / finviz / sec
  quality-screen             stockanalysis / macrotrends
  earnings-team              sec / yahoo / cnbc / seekingalpha
  private-company-research   glassdoor / linkedin / sec / bloomberg / yahoo
  all                        전체 사이트

각 프로파일의 사이트는 **주 소스부터** 나열한다(출력 순서 = 우선순위).

2026-08 실측 기준:
  - macrotrends.net은 상시 봇 차단이라 stockanalysis.com이 사실상 재무 주 소스다.
  - 403은 "못 쓴다"가 아니다 — 직접 열기(WebFetch/curl)만 막힌 것이고 **WebSearch 색인은
    살아 있다**(macrotrends·Seeking Alpha·Glassdoor·Bloomberg 모두 검색으로 내용 확인됨).
    다만 검색 경유는 원문 직접 확인이 아니므로 신뢰도는 🟡가 상한이다(data-confidence.md).
  - WSJ·Reuters·MarketWatch·Barron's는 **Anthropic 크롤러를 robots.txt로 차단**해
    WebFetch도 WebSearch도 통하지 않는다 → 소스 목록에서 제거했다. 앞의 셋은 같은
    Dow Jones/News Corp 계열이라 계열 내 대체(WSJ→MarketWatch 등)도 통하지 않는다.
  - 뉴스는 CNBC가 직접 접근(200)과 검색이 모두 되는 유일한 소스다.

티커 생략 시 AAPL로 대체하여 사이트 접근성만 확인한다.
(private-company-research는 대상이 비상장사라 티커를 넘기지 않는다 — sec/yahoo는
 AAPL 기준 대리 테스트가 되고, 실제 확인 대상은 glassdoor/linkedin이다.)

종료 코드:
  0  점검 완료 (차단이 있어도 0 — 스킬 정책이 "차단 여부와 무관하게 진행"이므로
     차단은 실패가 아니라 경고다. 호출부의 `python3 ... || py ...` 인터프리터 폴백이
     차단 때문에 오작동해 같은 점검이 중복 실행되는 것을 막는다)
  2  사용법 오류 (알 수 없는 프로파일)
"""

import os
import subprocess
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

# Windows 콘솔(cp949 등)에서 🔴/✅ 같은 이모지 출력 시 UnicodeEncodeError로 스크립트가
# 통째로 죽는 것을 방지한다. 표준출력을 UTF-8로 재설정하고, 재설정이 불가한 환경에서는
# 인코딩 불가 문자를 대체 문자(?)로 흘려보내 최소한 실행은 완주하게 한다.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SITES = {
    "macrotrends": {
        "name": "macrotrends.net",
        # 슬러그를 알 수 없으므로 AAPL 고정 URL로 사이트 접근성 대리 테스트
        "url": "https://www.macrotrends.net/stocks/charts/AAPL/apple/revenue",
        "fixed_url": True,
        # 2026-07~08 실측 내내 403. "가능"이 아니라 상시 차단으로 보는 게 맞다.
        # WebSearch 색인은 살아 있으나 **연도별 시계열 표는 나오지 않는다**(메타 설명만 색인됨).
        # 실측: AAPL 10년 ROE 질의 4회 재시도 → 값 0건. 시계열은 stockanalysis/SEC XBRL로 간다.
        "risk": "🔴 봇 차단 상시 (검색은 단일값만)",
        "alt": "stockanalysis.com/stocks/{lower}/financials/ (시계열·원문 확인·🟢) "
               "/ WebSearch는 최신 단일값만 (🟡, 10년 추이는 안 나옴)",
    },
    "stockanalysis": {
        "name": "stockanalysis.com",
        "url": "https://stockanalysis.com/stocks/{lower}/financials/",
        "fixed_url": False,
        "risk": "✅ 안정적 (재무 주 소스)",
        "alt": None,
    },
    "sec": {
        "name": "SEC EDGAR",
        # efts.sec.gov full-text search API — cgi-bin/browse-edgar는 403 반환
        "url": 'https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=10-K',
        "fixed_url": False,
        "risk": "✅ 공식 서비스",
        "alt": None,
    },
    "yahoo": {
        "name": "Yahoo Finance",
        # /financials/ 경로는 404 — quote 페이지로 접근성 확인
        "url": "https://finance.yahoo.com/quote/{ticker}",
        "fixed_url": False,
        "risk": "✅ 안정적",
        "alt": None,
    },
    "seekingalpha": {
        "name": "Seeking Alpha",
        "url": "https://seekingalpha.com/symbol/{ticker}",
        "fixed_url": False,
        "risk": "🔴 봇 차단 상시 (검색은 가능)",
        "alt": "WebSearch로 우회 (allowed_domains=['seekingalpha.com']) / Yahoo Finance 뉴스 / SEC 8-K Ex-99.1",
    },
    "cnbc": {
        "name": "CNBC",
        "url": "https://www.cnbc.com/quotes/{ticker}",
        "fixed_url": False,
        # 직접 접근(200)과 WebSearch 색인이 모두 살아 있는 유일한 뉴스 소스 (2026-08 실측).
        "risk": "✅ 안정적 (뉴스 주 소스)",
        "alt": None,
    },
    "bloomberg": {
        "name": "Bloomberg",
        "url": "https://www.bloomberg.com/quote/{ticker}:US",
        "fixed_url": False,
        "risk": "🔴 직접 접근 차단 (검색은 가능)",
        "alt": "WebSearch로 우회 (allowed_domains=['bloomberg.com'])",
    },
    "finviz": {
        "name": "Finviz",
        "url": "https://finviz.com/quote.ashx?t={ticker}",
        "fixed_url": False,
        "risk": "⚠️ 일부 Elite 전용 필터",
        "alt": "stockanalysis.com 스크리너",
    },
    "glassdoor": {
        "name": "Glassdoor",
        # 리뷰 페이지는 로그인 필요 — 홈페이지로 사이트 접근성만 확인
        "url": "https://www.glassdoor.com/",
        "fixed_url": True,
        "risk": "🔴 봇 차단 상시 (검색은 가능)",
        "alt": "WebSearch로 우회 (allowed_domains=['glassdoor.com'], '회사명 employee reviews')",
    },
    "linkedin": {
        "name": "LinkedIn",
        # robots.txt는 로그인 없이 접근 가능 — 사이트 생존 여부만 확인
        "url": "https://www.linkedin.com/robots.txt",
        "fixed_url": True,
        "risk": "🔴 봇 탐지 강함",
        "alt": "WebSearch로 우회 (allowed_domains=['linkedin.com'], '회사명 CEO profile')",
    },
}

# 나열 순서 = 점검·출력 순서 = 소스 우선순위. macrotrends가 상시 봇 차단이므로
# 재무 프로파일은 stockanalysis를 앞에 둔다(skills/financial-data.md 우선순위와 일치).
PROFILES = {
    "industry-research":        ["stockanalysis", "macrotrends", "sec", "yahoo", "cnbc", "seekingalpha", "finviz"],
    "industry-funnel":          ["stockanalysis", "macrotrends", "finviz", "sec"],
    "quality-screen":           ["stockanalysis", "macrotrends"],
    "earnings-team":            ["sec", "yahoo", "cnbc", "seekingalpha"],
    "private-company-research": ["glassdoor", "linkedin", "sec", "bloomberg", "yahoo"],
    "all":                      list(SITES.keys()),
}

STATUS_MAP = {
    "200": ("✅ 접근 가능",              True),
    "301": ("✅ 리디렉션 후 접근",        True),
    "302": ("✅ 리디렉션 후 접근",        True),
    "400": ("⚠️ 잘못된 요청",            False),
    "401": ("⚠️ 인증 필요",              False),
    "402": ("💳 유료 구독 필요",          False),
    "403": ("🔴 접근 차단 (봇 탐지)",     False),
    "404": ("⚠️ 페이지 없음",            False),
    "429": ("🔴 요청 초과 (일시 차단)",   False),
    "503": ("🔴 서비스 불가",             False),
    "000": ("🔴 연결 실패 (네트워크)",    False),
}


def check_site(key: str, ticker: str) -> dict:
    site = SITES[key]
    lower = ticker.lower()
    url = site["url"] if site["fixed_url"] else (
        site["url"].replace("{ticker}", ticker).replace("{lower}", lower)
    )
    try:
        proc = subprocess.run(
            [
                "curl", "-s", "-o", os.devnull, "-w", "%{http_code}",
                "-L", "--max-time", "10",
                "-H", (
                    "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                url,
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        code = proc.stdout.strip() or "000"
    except Exception:
        code = "000"

    label, accessible = STATUS_MAP.get(code, (f"⚠️ HTTP {code}", False))
    alt = None
    if site["alt"]:
        alt = site["alt"].replace("{ticker}", ticker).replace("{lower}", lower)
    fixed_note = " (AAPL 기준 대리 테스트)" if site["fixed_url"] else ""

    return {
        "name": site["name"],
        "code": code,
        "label": label,
        "accessible": accessible,
        "alt": alt,
        "fixed_note": fixed_note,
    }


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    profile = sys.argv[1]
    ticker = sys.argv[2].upper() if len(sys.argv) > 2 else "AAPL"

    if profile not in PROFILES:
        print(f"오류: 알 수 없는 프로파일 '{profile}'")
        print(f"사용 가능: {', '.join(PROFILES.keys())}")
        sys.exit(2)

    site_keys = PROFILES[profile]
    sep = "=" * 57

    print(f"\n{sep}")
    print(f"  사전 점검: 데이터 소스 접근 확인")
    print(f"  프로파일: {profile}  |  티커: {ticker}")
    print(sep)

    blocked = []
    for key in site_keys:
        r = check_site(key, ticker)
        print(f"  {r['label']:<34} {r['name']}{r['fixed_note']}")
        if not r["accessible"] and r["alt"]:
            print(f"    → 대체: {r['alt']}")
        if not r["accessible"]:
            blocked.append(r)

    print(sep)
    if blocked:
        print(f"\n⚠️  차단 {len(blocked)}개 감지 — 위 대체 소스로 전환하여 리서치를 진행한다.\n")
    else:
        print(f"\n✅ 전체 접근 가능 — 리서치를 시작한다.\n")
    # 차단은 실패가 아니다 — 항상 0으로 끝낸다(위 docstring "종료 코드" 참조).
    sys.exit(0)


if __name__ == "__main__":
    main()
