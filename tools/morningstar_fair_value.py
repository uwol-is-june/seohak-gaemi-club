#!/usr/bin/env python3
"""
Fetch all stocks with fair value estimates from the Morningstar screener API,
calculate potential upside, and output Top 100.
"""

import json
import subprocess
import sys
import time
import csv
import os
from datetime import datetime

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

API_BASE = (
    "https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener"
    "?page={page}&pageSize={page_size}"
    "&sortOrder=FairValueEstimate%20desc"
    "&outputType=json&version=1"
    "&languageId=en-US&currencyId=USD"
    "&universeIds=E0EXG%24XNAS%7CE0EXG%24XNYS"
    "&securityDataPoints=SecId%7CName%7CPriceCurrency%7CTenforeId%7CClosePrice"
    "%7CStarRatingM255%7CQuantitativeFairValue%7CFairValueEstimate"
    "%7CAssessmentOfFairValueUncertainty%7CEconomicMoat%7CIndustryName%7CSectorName"
    "&filters=FairValueEstimate:notnull"
)

PAGE_SIZE = 100
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def fetch_page(page: int) -> dict:
    url = API_BASE.format(page=page, page_size=PAGE_SIZE)
    result = subprocess.run(
        ["curl", "-s", "-H", "User-Agent: Mozilla/5.0", url],
        capture_output=True, text=True, timeout=30,
    )
    # curl 실패(네트워크/타임아웃)나 빈 응답을 json.loads 에 그대로 넘기면
    # JSONDecodeError 로 크래시하므로 먼저 검증한다(TASK-50).
    if result.returncode != 0 or not result.stdout.strip():
        raise RuntimeError(f"curl 실패 (page {page}, returncode={result.returncode})")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"JSON 파싱 실패 (page {page}): {e}") from e


def extract_ticker(tenforeid: str) -> str:
    if not tenforeid:
        return ""
    parts = tenforeid.split(".")
    return parts[-1] if len(parts) >= 3 else tenforeid


def main():
    print(f"\n{'='*80}")
    print(f"  Morningstar Fair Value Screener  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*80}\n")

    print("  Fetching page 1...")
    try:
        data = fetch_page(1)
    except (RuntimeError, subprocess.TimeoutExpired) as e:
        print(f"  ❌ 1페이지 조회 실패: {e}")
        return
    total = data.get("total", 0)
    all_rows = data.get("rows", [])
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    print(f"  Total: {total} stocks, {total_pages} pages\n")

    for page in range(2, total_pages + 1):
        if page % 10 == 0 or page == total_pages:
            print(f"  Fetching page {page}/{total_pages}...")
        try:
            data = fetch_page(page)
            rows = data.get("rows", [])
            if not rows:
                break
            all_rows.extend(rows)
            time.sleep(0.3)
        except Exception as e:
            print(f"  ⚠️  Page {page} failed: {e}")
            time.sleep(1)

    print(f"\n  Fetched {len(all_rows)} records")

    stocks = []
    for row in all_rows:
        fair_value = row.get("FairValueEstimate")
        close_price = row.get("ClosePrice")
        if not fair_value or not close_price or close_price <= 0:
            continue

        ticker = extract_ticker(row.get("TenforeId", ""))
        upside = (fair_value - close_price) / close_price * 100

        stocks.append({
            "ticker": ticker,
            "name": row.get("Name", ""),
            "close_price": round(close_price, 2),
            "fair_value": round(fair_value, 2),
            "upside_pct": round(upside, 1),
            "star_rating": row.get("StarRatingM255", ""),
            "moat": row.get("EconomicMoat", ""),
            "uncertainty": row.get("AssessmentOfFairValueUncertainty", ""),
            "sector": row.get("SectorName", ""),
            "industry": row.get("IndustryName", ""),
        })

    stocks.sort(key=lambda x: x["upside_pct"], reverse=True)

    print(f"\n{'='*80}")
    print(f"  Top 100 by Potential Upside")
    print(f"{'='*80}\n")
    print(f"  {'Rank':>4} {'Ticker':<8} {'Company':<35} {'Price':>10} {'Fair Value':>10} {'Upside':>8} {'Stars':>5} {'Moat':<8} {'Industry':<20}")
    print(f"  {'-'*4} {'-'*8} {'-'*35} {'-'*10} {'-'*10} {'-'*8} {'-'*5} {'-'*8} {'-'*20}")

    for i, s in enumerate(stocks[:100], 1):
        # StarRatingM255 가 "4.0" 같은 문자열/실수로 올 수 있어 int() 직접 호출은 크래시한다(TASK-65).
        try:
            stars = "★" * int(float(s["star_rating"])) if s["star_rating"] else "N/A"
        except (TypeError, ValueError):
            stars = "N/A"
        print(
            f"  {i:>4} {s['ticker']:<8} {s['name'][:35]:<35} "
            f"${s['close_price']:>9,.2f} ${s['fair_value']:>9,.2f} "
            f"{s['upside_pct']:>+7.1f}% "
            f"{stars:>5} "
            f"{s['moat']:<8} {s['industry'][:20]:<20}"
        )

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = datetime.now().strftime("%Y%m%d")
    csv_path = os.path.join(OUTPUT_DIR, f"morningstar_fair_value_{today}.csv")

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "rank", "ticker", "name", "close_price", "fair_value",
            "upside_pct", "star_rating", "moat", "uncertainty", "sector", "industry"
        ])
        writer.writeheader()
        for i, s in enumerate(stocks, 1):
            writer.writerow({"rank": i, **s})

    print(f"\n  Full data saved to: {csv_path}")
    print(f"  Total: {len(stocks)} stocks (sorted by upside)\n")

    # 유효 종목이 0개면 len(stocks) 나눗셈이 ZeroDivisionError → 요약 전체를 가드(TASK-50).
    if stocks:
        undervalued = [s for s in stocks if s["upside_pct"] > 0]
        overvalued = [s for s in stocks if s["upside_pct"] < 0]
        print(f"  📊 Summary:")
        print(f"     Undervalued: {len(undervalued)} ({len(undervalued)/len(stocks)*100:.0f}%)")
        print(f"     Overvalued:  {len(overvalued)} ({len(overvalued)/len(stocks)*100:.0f}%)")
        if undervalued:
            avg_upside = sum(s["upside_pct"] for s in undervalued) / len(undervalued)
            print(f"     Avg upside (undervalued): +{avg_upside:.1f}%")
        wide_moat_undervalued = [s for s in stocks if s["moat"] == "Wide" and s["upside_pct"] > 0]
        print(f"     Wide moat + undervalued: {len(wide_moat_undervalued)}")
    else:
        print("  📊 유효한 (FairValue+ClosePrice) 종목이 없어 요약을 건너뜁니다.")


if __name__ == "__main__":
    main()
