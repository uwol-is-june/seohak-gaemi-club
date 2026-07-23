#!/usr/bin/env python3
"""
데이터 소스 사전 접근 점검 — tools/site_preflight.py

사용법 (저장소 루트에서 상대경로로 실행 권장 — 폴더명이 달라도 동작):
  python3 tools/site_preflight.py <프로파일> [티커]

프로파일:
  industry-research      macrotrends / sec / yahoo / seekingalpha / wsj / finviz
  industry-funnel        finviz / macrotrends / stockanalysis / sec
  quality-screen         macrotrends / stockanalysis
  earnings-review        sec / seekingalpha
  all                    전체 사이트

티커 생략 시 AAPL로 대체하여 사이트 접근성만 확인한다.
"""

import subprocess
import sys

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
        "risk": "⚠️ 봇 차단 가능",
        "alt": "stockanalysis.com/stocks/{lower}/financials/",
    },
    "stockanalysis": {
        "name": "stockanalysis.com",
        "url": "https://stockanalysis.com/stocks/{lower}/financials/",
        "fixed_url": False,
        "risk": "✅ 안정적",
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
        "risk": "⚠️ 유료 장벽 가능",
        "alt": "Yahoo Finance 뉴스 / SEC 8-K Exhibit 99.1",
    },
    "wsj": {
        "name": "WSJ",
        "url": "https://www.wsj.com/market-data/quotes/{ticker}",
        "fixed_url": False,
        "risk": "⚠️ 유료 구독 기사 다수",
        "alt": "Yahoo Finance / Bloomberg",
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
        "risk": "🔴 봇 탐지 강함",
        "alt": "웹 검색: '{ticker} employee reviews glassdoor'",
    },
    "linkedin": {
        "name": "LinkedIn",
        # robots.txt는 로그인 없이 접근 가능 — 사이트 생존 여부만 확인
        "url": "https://www.linkedin.com/robots.txt",
        "fixed_url": True,
        "risk": "🔴 봇 탐지 강함",
        "alt": "웹 검색: '회사명 CEO LinkedIn profile'",
    },
}

PROFILES = {
    "industry-research":    ["macrotrends", "sec", "yahoo", "seekingalpha", "wsj", "finviz"],
    "industry-funnel":      ["finviz", "macrotrends", "stockanalysis", "sec"],
    "quality-screen":       ["macrotrends", "stockanalysis"],
    "earnings-review":      ["sec", "seekingalpha"],
    "all":                  list(SITES.keys()),
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
                "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
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
        sys.exit(1)
    else:
        print(f"\n✅ 전체 접근 가능 — 리서치를 시작한다.\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
