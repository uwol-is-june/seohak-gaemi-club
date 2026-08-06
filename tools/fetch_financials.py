#!/usr/bin/env python3
"""구조화 재무 데이터 추출기 — tools/fetch_financials.py (TASK-39)

10-K/재무 페이지를 HTML 통째로 컨텍스트에 삼키는 대신, **실제로 쓰는 재무 수치만**
SEC XBRL에서 직접 뽑아 컴팩트 JSON + 요약표로 만든다.

핵심 원칙 (정확도 무손실):
  - 1차 출처는 SEC XBRL companyfacts — **공시 확정 수치를 기계로 직접** 읽는다.
    사람이 HTML을 눈으로 읽다 생기는 전사(transcription) 오류가 원천 제거된다.
    → financial-data.md 기준의 "원본 1차" 이므로 신뢰도 🟢 근거가 된다.
  - 버리는 것은 Agent가 읽지도 않던 법률 보일러플레이트뿐. 숫자는 원문과 동일하다.
  - **교차검증을 대체하지 않는다.** 2차 출처(stockanalysis 등) 확보에 실패하면
    실패를 명시하고, 스킬은 기존 WebFetch 경로로 폴백해 2출처 검증을 유지한다.
    도구가 조용히 단일 출처로 떨어지는 일은 없다.

사용법 (저장소 루트에서 실행):
    python tools/fetch_financials.py AAPL                # 추출 → reports/AAPL/_data.json + 요약표
    python tools/fetch_financials.py AAPL --years 10     # 연차 수 지정 (기본 5)
    python tools/fetch_financials.py AAPL --cross        # 2차 출처 교차검증 시도
    python tools/fetch_financials.py AAPL --json         # stdout에 JSON만 출력
    python tools/fetch_financials.py AAPL --no-save      # 파일 저장 없이 출력만

SEC 요청 예절: SEC는 연락처가 담긴 User-Agent를 요구한다. 환경변수로 지정 권장:
    SEC_USER_AGENT="Your Name your@email.com"

외부 의존성 없음 (stdlib만). Python >= 3.9.
"""
from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

# Windows 콘솔(cp949)에서 한글·기호(★, —, ✅) 출력 시 UnicodeEncodeError 방지.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent

SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
SEC_USER_AGENT = os.environ.get(
    "SEC_USER_AGENT", "AI-Berkshire-Research (contact via repo owner)"
)

# ── 지표 정의 ────────────────────────────────────────────────────────────────
# 각 지표를 택소노미별 태그 후보 목록으로 정의한다. 기업/연도마다 쓰는 태그가 달라서
# 우선순위대로 시도하고, **연도 단위로** 값이 있는 첫 태그를 채택한다(태그 전환 대응).
#   kind: "duration" (기간 합계 — 손익/현금흐름) | "instant" (시점 잔액 — 재무상태표)
#   unit_kind: "money" (보고통화) | "per_share" (통화/주) | "shares" (주식수)
#   gaap: us-gaap 태그 (미국기업 10-K) / ifrs: ifrs-full 태그 (외국기업 20-F)
METRICS: list[dict] = [
    {
        "key": "revenue", "label": "매출", "kind": "duration", "unit_kind": "money",
        # `Revenues`(총매출)를 최우선. 보험·금융·복합기업(예: BRK)은 보험료수입·이자/배당
        # 수익이 있어 RevenueFromContractWithCustomer 가 **총매출의 부분집합**이다.
        # 그걸 먼저 잡으면 매출이 과소계상된다(BRK FY2023 $254.9B vs 실제 총매출 $364.5B).
        # 반대로 Apple 등 일반 기업은 `Revenues` 태그가 없어 자동으로 다음 후보로 넘어간다.
        "gaap": [
            "Revenues",
            "RevenueFromContractWithCustomerExcludingAssessedTax",
            "RevenueFromContractWithCustomerIncludingAssessedTax",
            "SalesRevenueNet",
            "SalesRevenueGoodsNet",
        ],
        "ifrs": ["Revenue", "RevenueFromContractsWithCustomers"],
    },
    {
        "key": "grossProfit", "label": "매출총이익", "kind": "duration", "unit_kind": "money",
        "gaap": ["GrossProfit"], "ifrs": ["GrossProfit"],
    },
    {
        "key": "operatingIncome", "label": "영업이익", "kind": "duration", "unit_kind": "money",
        "gaap": ["OperatingIncomeLoss"], "ifrs": ["ProfitLossFromOperatingActivities"],
    },
    {
        "key": "netIncome", "label": "순이익", "kind": "duration", "unit_kind": "money",
        "gaap": ["NetIncomeLoss", "ProfitLoss"],
        "ifrs": ["ProfitLossAttributableToOwnersOfParent", "ProfitLoss"],
    },
    {
        "key": "epsDiluted", "label": "희석EPS", "kind": "duration", "unit_kind": "per_share",
        "gaap": ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"],
        "ifrs": ["DilutedEarningsLossPerShare"],
    },
    {
        "key": "operatingCashFlow", "label": "영업현금흐름", "kind": "duration", "unit_kind": "money",
        "gaap": [
            "NetCashProvidedByUsedInOperatingActivities",
            "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
        ],
        "ifrs": ["CashFlowsFromUsedInOperatingActivities"],
    },
    {
        "key": "capex", "label": "CAPEX", "kind": "duration", "unit_kind": "money",
        "gaap": [
            "PaymentsToAcquirePropertyPlantAndEquipment",
            "PaymentsToAcquireProductiveAssets",
        ],
        "ifrs": ["PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"],
    },
    {
        "key": "dilutedShares", "label": "희석주식수", "kind": "duration", "unit_kind": "shares",
        "gaap": ["WeightedAverageNumberOfDilutedSharesOutstanding"],
        "ifrs": ["WeightedAverageNumberOfDilutedSharesOutstanding"],
    },
    {
        "key": "totalAssets", "label": "총자산", "kind": "instant", "unit_kind": "money",
        "gaap": ["Assets"], "ifrs": ["Assets"],
    },
    {
        "key": "totalLiabilities", "label": "총부채", "kind": "instant", "unit_kind": "money",
        "gaap": ["Liabilities"], "ifrs": ["Liabilities"],
    },
    {
        "key": "equity", "label": "자기자본", "kind": "instant", "unit_kind": "money",
        "gaap": [
            "StockholdersEquity",
            "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
        ],
        "ifrs": ["EquityAttributableToOwnersOfParent", "Equity"],
    },
    {
        "key": "cash", "label": "현금성자산", "kind": "instant", "unit_kind": "money",
        "gaap": [
            "CashAndCashEquivalentsAtCarryingValue",
            "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
        ],
        "ifrs": ["CashAndCashEquivalents"],
    },
    {
        "key": "longTermDebt", "label": "장기부채", "kind": "instant", "unit_kind": "money",
        "gaap": ["LongTermDebtNoncurrent", "LongTermDebt"],
        "ifrs": ["NoncurrentPortionOfNoncurrentBondsIssued", "LongtermBorrowings"],
    },
]

# 연간 보고서 서식. 외국기업(TSM 등)은 10-K 대신 20-F, 캐나다 기업은 40-F 를 낸다.
ANNUAL_FORMS = ("10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A")
# 연간 기간 판정: 회계연도는 52/53주(364~371일) 또는 달력 12개월. 여유를 둬 340~400일.
ANNUAL_MIN_DAYS, ANNUAL_MAX_DAYS = 340, 400


# ── HTTP ─────────────────────────────────────────────────────────────────────
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def http_get(url: str, *, timeout: int = 30, retries: int = 3,
             user_agent: str | None = None) -> bytes:
    """GET 후 본문 반환. gzip/deflate 응답을 투명하게 해제한다. 실패 시 예외.

    User-Agent 는 호스트마다 요구가 다르다 — SEC 는 연락처가 담긴 UA 를 요구하고,
    Yahoo 는 브라우저 UA 가 아니면 차단한다. 호출자가 지정하지 않으면 SEC 기준을 쓴다.
    """
    last_err: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": user_agent or SEC_USER_AGENT,
                "Accept-Encoding": "gzip",
                "Accept": "application/json,text/html,*/*",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
                return raw
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(1.0 + attempt)  # SEC rate limit 완화
    raise RuntimeError(f"요청 실패: {url} — {last_err}")


def http_get_json(url: str, **kw) -> dict:
    return json.loads(http_get(url, **kw).decode("utf-8"))


# ── SEC: 티커 → CIK ──────────────────────────────────────────────────────────
def resolve_cik(ticker: str) -> tuple[str, str]:
    """티커 → (10자리 zero-padded CIK, 회사명). 실패 시 SystemExit."""
    want = ticker.strip().upper()
    try:
        data = http_get_json(SEC_TICKERS_URL)
    except RuntimeError as e:
        sys.exit(f"오류: SEC 티커 목록을 가져오지 못했습니다 — {e}")

    # {"0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}, ...}
    for row in data.values():
        if str(row.get("ticker", "")).upper() == want:
            return str(row["cik_str"]).zfill(10), str(row.get("title", ""))

    # 클래스주 표기 흔들림(BRK.B ↔ BRK-B) 재시도
    alt = want.replace(".", "-")
    for row in data.values():
        if str(row.get("ticker", "")).upper() == alt:
            return str(row["cik_str"]).zfill(10), str(row.get("title", ""))

    sys.exit(f"오류: SEC에서 티커 '{ticker}' 를 찾지 못했습니다 (미국 상장 티커인지 확인).")


# ── SEC: 연간 시계열 추출 ────────────────────────────────────────────────────
def _fy_label(end_iso: str) -> int:
    """회계연도 라벨 = 기간 종료일의 연도.

    SEC 의 fy/fp 필드는 '그 수치가 실린 공시의' 회계연도라 직전연도 비교 수치까지
    같은 fy 로 붙는다. 따라서 fy 를 쓰면 안 되고, 데이터 자체의 end 날짜로 라벨한다.
    (AAPL 2023-09-30 → FY2023, NVDA 2024-01-28 → FY2024, WMT 2024-01-31 → FY2024
     — 모두 회사 자체 표기와 일치.) 모호함이 없도록 periodEnd 를 항상 함께 남긴다.
    """
    return int(end_iso[:4])


def _annual_points(fact_units: list[dict], kind: str) -> dict[int, dict]:
    """companyfacts 의 unit 엔트리 목록 → {회계연도: {value, periodEnd, accn, filed, form}}.

    - 연간 보고서(10-K)만 사용한다.
    - duration 은 340~400일 기간만 (분기·누적 소계 배제).
    - 같은 연도가 여러 번 나오면(원공시 + 정정공시/후속 비교표) **filed 가 가장 늦은**
      값을 채택한다 = 재작성(restatement) 반영된 최신 확정치.
    """
    out: dict[int, dict] = {}
    for e in fact_units:
        if e.get("form") not in ANNUAL_FORMS:
            continue
        end = e.get("end")
        val = e.get("val")
        if not end or val is None:
            continue

        if kind == "duration":
            start = e.get("start")
            if not start:
                continue
            try:
                days = (date.fromisoformat(end) - date.fromisoformat(start)).days
            except ValueError:
                continue
            if not (ANNUAL_MIN_DAYS <= days <= ANNUAL_MAX_DAYS):
                continue

        fy = _fy_label(end)
        filed = e.get("filed", "")
        prev = out.get(fy)
        if prev is None or filed >= prev["filed"]:
            out[fy] = {
                "value": val,
                "periodEnd": end,
                "accn": e.get("accn", ""),
                "filed": filed,
                "form": e.get("form", ""),
            }
    return out


def detect_taxonomy(facts: dict) -> tuple[str, str]:
    """공시 택소노미 판별. 반환 (facts 키, METRICS 키).

    미국기업은 us-gaap(10-K), 외국기업은 ifrs-full(20-F)로 공시한다.
    """
    available = facts.get("facts", {})
    if "us-gaap" in available:
        return "us-gaap", "gaap"
    if "ifrs-full" in available:
        return "ifrs-full", "ifrs"
    sys.exit(
        "오류: us-gaap / ifrs-full 택소노미를 찾지 못했습니다 — "
        "기존 WebFetch 경로를 사용하세요."
    )


def resolve_currency(facts: dict, tax_key: str, tag_key: str) -> str:
    """회사의 보고통화를 **하나로** 결정한다.

    TSM 처럼 원화(TWD)와 편의환산(USD)을 동시에 태깅하는 기업이 있다. 지표마다 통화가
    달라지면 매출은 TWD, 자기자본은 USD 같은 재앙이 나므로 회사 단위로 하나만 고른다.
    매출 태그에서 연간 데이터가 가장 많은 통화를 채택하고, 동수면 USD 를 택한다.
    """
    node = facts.get("facts", {}).get(tax_key, {})
    revenue_tags = next(m for m in METRICS if m["key"] == "revenue")[tag_key]

    counts: dict[str, int] = {}
    for tag in revenue_tags:
        units = (node.get(tag) or {}).get("units") or {}
        for unit, entries in units.items():
            if unit.endswith("/shares") or unit == "shares":
                continue
            counts[unit] = counts.get(unit, 0) + len(_annual_points(entries, "duration"))

    if not counts:
        return "USD"
    best = max(counts.values())
    winners = [u for u, c in counts.items() if c == best]
    return "USD" if "USD" in winners else sorted(winners)[0]


def unit_for(metric: dict, currency: str) -> str:
    """지표의 companyfacts units 키를 보고통화 기준으로 만든다."""
    kind = metric["unit_kind"]
    if kind == "money":
        return currency
    if kind == "per_share":
        return f"{currency}/shares"
    return "shares"


def extract_metric(
    facts: dict, metric: dict, tax_key: str, tag_key: str, currency: str
) -> tuple[dict[int, dict], str | None]:
    """지표 하나를 태그 우선순위대로 추출. 연도별로 값이 있는 첫 태그를 채택.

    반환: ({회계연도: point}, 실제 사용된 태그 표기)
    """
    node = facts.get("facts", {}).get(tax_key, {})
    unit_key = unit_for(metric, currency)
    merged: dict[int, dict] = {}
    used: list[str] = []

    for tag in metric[tag_key]:
        entry = node.get(tag)
        if not entry:
            continue
        units = entry.get("units", {}).get(unit_key)
        if not units:
            continue
        pts = _annual_points(units, metric["kind"])
        added = False
        for fy, pt in pts.items():
            if fy not in merged:  # 앞선(우선순위 높은) 태그가 이긴다
                merged[fy] = dict(pt, tag=tag)
                added = True
        if added:
            used.append(tag)

    return merged, (" + ".join(used) if used else None)


def _safe_div(a, b):
    if a is None or b is None:
        return None
    try:
        if b == 0:
            return None
        return a / b
    except TypeError:
        return None


def build_annual(
    facts: dict, years: int, tax_key: str, tag_key: str, currency: str
) -> tuple[dict, dict]:
    """연도별 지표 + 파생지표 계산. 반환 (annual, tagsUsed)."""
    per_metric: dict[str, dict[int, dict]] = {}
    tags_used: dict[str, str | None] = {}
    for m in METRICS:
        pts, used = extract_metric(facts, m, tax_key, tag_key, currency)
        per_metric[m["key"]] = pts
        tags_used[m["key"]] = used

    all_years = sorted({fy for pts in per_metric.values() for fy in pts}, reverse=True)
    keep = all_years[:years]

    annual: dict[str, dict] = {}
    for fy in sorted(keep):
        row: dict = {"periodEnd": None, "values": {}, "provenance": {}}
        for m in METRICS:
            pt = per_metric[m["key"]].get(fy)
            if pt is None:
                row["values"][m["key"]] = None
                continue
            row["values"][m["key"]] = pt["value"]
            row["provenance"][m["key"]] = {
                "tag": pt.get("tag"), "accn": pt["accn"],
                "filed": pt["filed"], "form": pt["form"], "periodEnd": pt["periodEnd"],
            }
            # 대표 기간종료일: 손익 기준(duration)을 우선 채택
            if row["periodEnd"] is None and m["kind"] == "duration":
                row["periodEnd"] = pt["periodEnd"]

        v = row["values"]
        # 파생지표 — 양쪽 입력이 같은 회계연도에 모두 있을 때만 계산(없으면 null)
        fcf = None
        if v.get("operatingCashFlow") is not None and v.get("capex") is not None:
            fcf = v["operatingCashFlow"] - v["capex"]
        gm = _safe_div(v.get("grossProfit"), v.get("revenue"))
        om = _safe_div(v.get("operatingIncome"), v.get("revenue"))
        nm = _safe_div(v.get("netIncome"), v.get("revenue"))
        roe = _safe_div(v.get("netIncome"), v.get("equity"))
        de = _safe_div(v.get("totalLiabilities"), v.get("equity"))
        # 저장 정밀도는 표시 정밀도보다 충분히 높게 유지한다(6자리).
        # 표시용으로 미리 반올림해 두면 렌더링에서 한 번 더 반올림돼 **이중 반올림**이 된다
        # (실측: NVDA FY2026 D/E 0.3148 → round(,3)=0.315 → f"{:.2f}"=0.32. 올바른 값은 0.31).
        # 반올림은 표시 계층에서 딱 한 번만 한다.
        row["derived"] = {
            "fcf": fcf,
            "grossMarginPct": None if gm is None else round(gm * 100, 6),
            "operatingMarginPct": None if om is None else round(om * 100, 6),
            "netMarginPct": None if nm is None else round(nm * 100, 6),
            "roePct": None if roe is None else round(roe * 100, 6),
            "debtToEquity": None if de is None else round(de, 6),
        }
        annual[str(fy)] = row

    return annual, tags_used


def freshness(annual: dict) -> dict:
    """최신 회계연도가 얼마나 오래됐는지 판정.

    SEC 인덱싱 지연이나 미제출로 최신 연도가 빠질 수 있다(예: TSM FY2025 미반영).
    이걸 모르면 Agent 가 구데이터를 '최신'으로 오인한다 — 명시적으로 경고한다.
    """
    ends = [r.get("periodEnd") for r in annual.values() if r.get("periodEnd")]
    if not ends:
        return {"latestPeriodEnd": None, "monthsOld": None, "stale": True}
    latest = max(ends)
    days = (date.today() - date.fromisoformat(latest)).days
    months = round(days / 30.44, 1)
    # 회계연도 종료 후 공시까지 통상 2~4개월. 15개월을 넘으면 다음 연도가 이미 나왔다고 본다.
    return {"latestPeriodEnd": latest, "monthsOld": months, "stale": days > 455}


# ── 2차 출처 (교차검증용, best-effort) ───────────────────────────────────────
# Yahoo fundamentals-timeseries 항목 → 내부 지표 키 매핑.
# (stockanalysis.com 은 JS 렌더링이라 서버사이드 파싱이 불가 — 기계 판독 가능한
#  Yahoo 를 2차 출처로 쓴다. Yahoo 도 실패하면 스킬이 WebFetch 로 직접 확인한다.)
YAHOO_FIELDS = {
    "annualTotalRevenue": "revenue",
    "annualNetIncome": "netIncome",
    "annualOperatingIncome": "operatingIncome",
    "annualGrossProfit": "grossProfit",
    "annualDilutedEPS": "epsDiluted",
    "annualOperatingCashFlow": "operatingCashFlow",
    "annualCapitalExpenditure": "capex",
    "annualStockholdersEquity": "equity",
    "annualTotalAssets": "totalAssets",
}


def fetch_yahoo_fundamentals(ticker: str, years: int = 5) -> dict:
    """Yahoo Finance 연간 재무를 2차 출처로 가져온다 (기계 판독).

    **실패해도 조용히 넘어가지 않는다** — status 를 남겨 호출자(스킬)가 기존 WebFetch
    경로로 폴백해 2출처 교차검증을 반드시 완료하도록 한다.
    """
    sym = ticker.strip().upper().replace(".", "-")
    types = ",".join(YAHOO_FIELDS)
    # period1=0 을 주면 Yahoo 는 빈 결과를 돌려준다 — 실제 구간을 계산해 넘겨야 한다.
    # 요청 연차보다 넉넉히 잡아 회계연도 경계에서 잘리지 않게 한다.
    now = int(time.time())
    period1 = max(0, now - int((years + 3) * 366 * 86400))
    url = (
        f"https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/"
        f"timeseries/{sym}?symbol={sym}&type={types}"
        f"&period1={period1}&period2={now + 86400}"
    )
    try:
        raw = http_get(
            url, timeout=25, retries=2, user_agent=BROWSER_UA
        ).decode("utf-8", errors="replace")
        data = json.loads(raw)
    except (RuntimeError, ValueError) as e:
        return {"status": "failed", "url": url, "error": str(e), "annual": {}}

    results = (data.get("timeseries") or {}).get("result") or []
    if not results:
        return {
            "status": "unparsed", "url": url,
            "error": "Yahoo 응답에 timeseries 데이터가 없습니다.", "annual": {},
        }

    annual: dict[str, dict] = {}
    for block in results:
        field = ((block.get("meta") or {}).get("type") or [None])[0]
        key = YAHOO_FIELDS.get(field)
        if not key:
            continue
        for entry in block.get(field) or []:
            if not isinstance(entry, dict):
                continue
            as_of = entry.get("asOfDate")
            if entry.get("periodType") != "12M" or not as_of:
                continue
            val = (entry.get("reportedValue") or {}).get("raw")
            if val is None:
                continue
            annual.setdefault(str(_fy_label(as_of)), {})[key] = float(val)

    if not annual:
        return {
            "status": "unparsed", "url": url,
            "error": "연간(12M) 항목을 찾지 못했습니다.", "annual": {},
        }
    return {"status": "ok", "url": url, "annual": annual}


def cross_validate(annual: dict, secondary: dict) -> dict:
    """SEC(1차) vs 2차 출처 오차율 계산. financial-data.md 임계값을 그대로 적용.

    ≤1% 일치 ✅ / 1~5% 불일치 ⚠️ / >5% 중대 불일치 ❌
    """
    if secondary.get("status") != "ok":
        return {
            "status": secondary.get("status", "failed"),
            "note": (
                "2차 출처 확보 실패 — 교차검증 미완료. 스킬은 WebFetch 로 2차 출처를 "
                "직접 확인해 2출처 검증을 반드시 완료할 것(단일 출처 판정 금지)."
            ),
            "url": secondary.get("url"),
            "error": secondary.get("error"),
            "items": [],
        }

    items = []
    for fy, row in annual.items():
        sec_row = secondary["annual"].get(fy)
        if not sec_row:
            continue
        for key in sorted(set(YAHOO_FIELDS.values())):
            a = row["values"].get(key)
            b = sec_row.get(key)
            if a is None or b is None or a == 0:
                continue
            # CAPEX 는 부호 규약이 다르다(SEC: 지출 양수 / Yahoo: 현금유출 음수).
            # 규약 차이를 불일치로 오판하지 않도록 절대값으로 비교한다.
            if key == "capex":
                a, b = abs(a), abs(b)
            diff_pct = abs(a - b) / abs(a) * 100
            if diff_pct <= 1:
                verdict = "일치"
            elif diff_pct <= 5:
                verdict = "불일치"
            else:
                verdict = "중대 불일치"
            items.append({
                "fiscalYear": fy, "metric": key,
                "sec": a, "secondary": b,
                "diffPct": round(diff_pct, 3), "verdict": verdict,
            })

    worst = "일치"
    for it in items:
        if it["verdict"] == "중대 불일치":
            worst = "중대 불일치"
            break
        if it["verdict"] == "불일치":
            worst = "불일치"
    return {"status": "ok", "url": secondary.get("url"), "worst": worst, "items": items}


# ── 출력 ─────────────────────────────────────────────────────────────────────
def fmt_money(v, currency: str = "USD") -> str:
    """금액 포맷. USD 는 $ 기호, 그 외 통화는 통화코드를 붙여 오인을 막는다."""
    if v is None:
        return "⬛"
    pre, suf = ("$", "") if currency == "USD" else ("", f" {currency}")
    a = abs(v)
    if a >= 1e12:
        return f"{pre}{v / 1e12:.2f}T{suf}"
    if a >= 1e9:
        return f"{pre}{v / 1e9:.2f}B{suf}"
    if a >= 1e6:
        return f"{pre}{v / 1e6:.1f}M{suf}"
    return f"{pre}{v:,.2f}{suf}"


def fmt_pct(v) -> str:
    return "⬛" if v is None else f"{v:.1f}%"


def render_markdown(payload: dict) -> str:
    annual = payload["annual"]
    years = sorted(annual.keys())
    if not years:
        return "(추출된 연간 데이터 없음)"

    cur = payload.get("currency", "USD")
    money = lambda v: fmt_money(v, cur)  # noqa: E731

    lines: list[str] = []
    lines.append(f"### {payload['companyName']} ({payload['ticker']}) — SEC XBRL 연간 재무")
    lines.append("")
    lines.append(f"- CIK: {payload['cik']} · 출처: SEC EDGAR XBRL companyfacts (원본 1차)")
    lines.append(
        f"- 택소노미: {payload['taxonomy']} · 보고통화: **{cur}** · 추출 시각: {payload['generatedAt']}"
    )
    if cur != "USD":
        lines.append(
            f"- ⚠️ **보고통화가 {cur} 이다 — USD 아님.** 달러 환산 없이 그대로 표기했다. "
            "USD 비교가 필요하면 환율을 명시해 별도 환산할 것(임의 환산 금지)."
        )
    fr = payload.get("freshness") or {}
    if fr.get("stale"):
        lines.append(
            f"- 🔴 **데이터 신선도 경고**: 최신 회계연도 종료일이 {fr['latestPeriodEnd']} "
            f"({fr['monthsOld']}개월 전)로, 이후 회계연도가 SEC XBRL 에 아직 반영되지 않았다. "
            "**최신 실적을 최신으로 단정하지 말 것** — 최근 실적발표를 별도 확인해 보완한다."
        )
    lines.append("")

    head = "| 항목 | " + " | ".join(f"FY{y}" for y in years) + " |"
    sep = "|---|" + "---|" * len(years)
    lines += [head, sep]

    def row(label: str, getter, fmt) -> str:
        cells = [fmt(getter(annual[y])) for y in years]
        return f"| {label} | " + " | ".join(cells) + " |"

    lines.append(row("기간종료", lambda r: r.get("periodEnd"), lambda v: v or "⬛"))
    for m in METRICS:
        if m["key"] == "epsDiluted":
            lines.append(row(f"{m['label']} ({cur})", lambda r, k=m["key"]: r["values"].get(k),
                             lambda v: "⬛" if v is None else f"{v:,.2f}"))
        elif m["key"] == "dilutedShares":
            lines.append(row(m["label"], lambda r, k=m["key"]: r["values"].get(k),
                             lambda v: "⬛" if v is None else f"{v / 1e9:.3f}B"))
        else:
            lines.append(row(m["label"], lambda r, k=m["key"]: r["values"].get(k), money))

    lines.append(row("FCF (OCF−CAPEX)", lambda r: r["derived"]["fcf"], money))
    lines.append(row("매출총이익률", lambda r: r["derived"]["grossMarginPct"], fmt_pct))
    lines.append(row("영업이익률", lambda r: r["derived"]["operatingMarginPct"], fmt_pct))
    lines.append(row("순이익률", lambda r: r["derived"]["netMarginPct"], fmt_pct))
    lines.append(row("ROE", lambda r: r["derived"]["roePct"], fmt_pct))
    lines.append(row("부채/자기자본", lambda r: r["derived"]["debtToEquity"],
                     lambda v: "⬛" if v is None else f"{v:.2f}"))

    lines.append("")
    lines.append("> ⬛ = SEC 공시에 해당 태그 없음 — **추정 금지**, 공백 유지.")
    lines.append("> 위 수치는 SEC 원문 직접 확인이므로 data-confidence 기준 🟢[사실].")

    cv = payload.get("crossValidation")
    if cv:
        lines.append("")
        if cv["status"] != "ok":
            lines.append(f"**교차검증: ⚠️ 미완료** — {cv['note']}")
        else:
            items = cv["items"]
            mismatches = [i for i in items if i["verdict"] != "일치"]
            ok_n = len(items) - len(mismatches)
            lines.append(
                f"**교차검증 (SEC vs Yahoo Finance)**: {len(items)}개 대조 · "
                f"✅ 일치 {ok_n} · 최악 판정 **{cv['worst']}**"
            )
            # 일치 항목은 건수로만 요약한다(행마다 나열하면 그 자체가 토큰 낭비).
            # 판단이 필요한 불일치 건만 전량 표기 — 축약하지 않는다.
            if mismatches:
                lines.append("")
                lines.append("| FY | 항목 | SEC(1차) | Yahoo(2차) | 오차 | 판정 |")
                lines.append("|---|---|---|---|---|---|")
                icon = {"불일치": "⚠️", "중대 불일치": "❌"}
                for it in mismatches:
                    lines.append(
                        f"| FY{it['fiscalYear']} | {it['metric']} | {money(it['sec'])} | "
                        f"{money(it['secondary'])} | {it['diffPct']:.2f}% | "
                        f"{icon.get(it['verdict'], '')} {it['verdict']} |"
                    )
                lines.append("")
                lines.append(
                    "> 불일치 원인은 GAAP/Non-GAAP·회계연도 정의·소수지분 처리 차이가 흔하다. "
                    "❌ 중대 불일치(>5%)는 **SEC 10-K 원문으로 반드시 재확인** 후 사용한다."
                )
    return "\n".join(lines)


# ── main ─────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser(
        description="SEC XBRL에서 연간 재무를 추출해 컴팩트 JSON + 요약표로 출력 (TASK-39)"
    )
    ap.add_argument("ticker", help="미국 상장 티커 (예: AAPL)")
    ap.add_argument("--years", type=int, default=5, help="추출할 연차 수 (기본 5)")
    ap.add_argument("--cross", action="store_true", help="2차 출처 교차검증 시도")
    ap.add_argument("--json", action="store_true", help="stdout에 JSON만 출력")
    ap.add_argument("--no-save", action="store_true", help="reports/{티커}/_data.json 저장 생략")
    ap.add_argument("--out", help="저장 경로 직접 지정")
    args = ap.parse_args()

    ticker = args.ticker.strip().upper()
    cik, name = resolve_cik(ticker)

    try:
        facts = http_get_json(SEC_FACTS_URL.format(cik=cik), timeout=60)
    except RuntimeError as e:
        sys.exit(f"오류: SEC companyfacts 조회 실패 ({ticker}/CIK {cik}) — {e}")

    tax_key, tag_key = detect_taxonomy(facts)
    currency = resolve_currency(facts, tax_key, tag_key)
    annual, tags_used = build_annual(facts, args.years, tax_key, tag_key, currency)
    if not annual:
        sys.exit(
            f"오류: {ticker} 의 연간 XBRL 데이터(10-K/20-F)를 찾지 못했습니다. "
            "신규 상장이거나 XBRL 미제출일 수 있습니다 — 기존 WebFetch 경로를 사용하세요."
        )

    payload = {
        "ticker": ticker,
        "cik": cik,
        "companyName": name,
        "taxonomy": tax_key,
        "currency": currency,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "primary": "SEC EDGAR XBRL companyfacts",
            "primaryUrl": SEC_FACTS_URL.format(cik=cik),
            "note": "원본 1차 공시 수치 — 기계 추출이므로 전사 오류 없음 (🟢[사실])",
        },
        "tagsUsed": tags_used,
        "freshness": freshness(annual),
        "annual": annual,
    }

    if args.cross:
        if currency != "USD":
            # 통화가 다르면 Yahoo 수치와 단순 대조할 수 없다. 억지로 비교해
            # 거짓 '일치/불일치' 를 만들지 않고, 수동 검증을 요구한다.
            payload["crossValidation"] = {
                "status": "currency-mismatch",
                "note": (
                    f"보고통화가 {currency} 라 Yahoo 수치와 자동 대조하지 않았다"
                    "(거짓 판정 방지). 2차 출처는 동일 통화 기준으로 직접 확인할 것."
                ),
                "url": None, "error": None, "items": [],
            }
        else:
            payload["crossValidation"] = cross_validate(
                annual, fetch_yahoo_fundamentals(ticker, args.years)
            )

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(render_markdown(payload))

    if not args.no_save:
        out = Path(args.out) if args.out else (REPO_ROOT / "reports" / ticker / "_data.json")
        out.parent.mkdir(parents=True, exist_ok=True)
        # 두 벌로 나눠 저장한다:
        #   _data.json — 태그·accn·filed 등 provenance 포함 (report_audit 추적용, 20KB+)
        #   _data.md   — 요약표만 (Agent 가 읽는 것, ~2KB)
        # Agent 가 provenance 까지 통째로 읽으면 그 자체가 낭비다. 감사 추적은 디스크에
        # 남기되, 컨텍스트에는 요약만 올린다.
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        md_out = out.with_suffix(".md")
        md_out.write_text(render_markdown(payload) + "\n", encoding="utf-8")
        if not args.json:
            def rel(p: Path):
                try:
                    return p.relative_to(REPO_ROOT)
                except ValueError:
                    return p
            print(f"\n저장 완료:")
            print(f"  {rel(md_out)}   ← Agent 는 이 요약을 읽는다")
            print(f"  {rel(out)} ← provenance 포함 감사용")

    # 교차검증 미완료는 종료코드로도 알린다(스킬이 폴백 분기 가능).
    cv = payload.get("crossValidation")
    if cv and cv["status"] != "ok":
        sys.exit(3)


if __name__ == "__main__":
    main()
