#!/usr/bin/env python3
"""실험실 기계 필터 — tools/lab_screen.py (TASK-182 · TASK-183)

S&P 500 전체를 docs/LAB-SPEC.md 의 규칙대로 걸러 '이번 주 추천 종목' 후보 순위를 낸다.
LLM 없음 · 토큰 0. 규칙의 원본은 LAB-SPEC.md 이고, 이 파일이 문서와 다르면 이 파일이 틀린 것이다.

🔴 기존 시스템과 독립: 관찰 종목·판단 기록부·quality_tier.py·고평가 게이트를 **읽지 않는다**.
   재사용하는 것은 fetch_financials.py 의 SEC 수집 코드뿐이다.

사용법 (저장소 루트에서):
    python3 tools/lab_screen.py                  # 수집(캐시 활용) + 계산 → data/_lab/screen-YYYYMMDD.json
    python3 tools/lab_screen.py --collect-only   # 수집 + 커버리지 리포트만
    python3 tools/lab_screen.py --offline        # 네트워크 없이 캐시만으로 계산
    python3 tools/lab_screen.py --refresh        # 캐시 무시하고 전부 재수집 (추출 규칙을 바꿨을 때)
    python3 tools/lab_screen.py --tickers AAPL MSFT   # 일부 종목만 (디버그용 — 백분위가 달라진다)

캐시: data/_lab/cache/ (git 제외). SEC 7일 · Yahoo 1일 이내면 재수집하지 않는다.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import statistics
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from html import unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_financials as ff  # noqa: E402

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

RULE_VERSION = "v1"  # docs/LAB-SPEC.md — 규칙을 바꾸면 올리고 채점을 분리한다

REPO_ROOT = ff.REPO_ROOT
LAB_DIR = REPO_ROOT / "data" / "_lab"
CACHE_DIR = LAB_DIR / "cache"
SEC_CACHE = CACHE_DIR / "sec"
YAHOO_CACHE = CACHE_DIR / "yahoo"
UNIVERSE_CACHE = CACHE_DIR / "universe.json"

WIKI_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
YAHOO_CHART = (
    "https://query1.finance.yahoo.com/v8/finance/chart/{sym}"
    "?range=12y&interval=1mo&events=split"
)

SEC_TTL_DAYS = 7
YAHOO_TTL_DAYS = 1
SEC_YEARS = 11  # 10년 중앙값 + 여유 1년

# ── 규칙 상수 (LAB-SPEC.md 와 1:1) ──────────────────────────────────────────
EXCLUDED_SECTORS = ("Financials", "Real Estate")    # E1
STALE_MONTHS = 15                                    # E3
MIN_HISTORY_YEARS = 8                                # E4
HISTORY_YEARS = 10                                   # 목표가·퀄리티 계산 창
MOMENTUM_CUT_PCT = 20                                # E6 하위 %
MIN_UPSIDE = 0.15                                    # E7
STOP_LOSS = 0.85                                     # 철회선 = 픽가 × 0.85
HORIZON_MONTHS = 12
NORMALIZE_YEARS = 3                                  # FCFps_now = 최근 3년 중앙값

FUNNEL_STEPS = [
    ("E1", "sector", "업종 제외 (금융·리츠)"),
    ("E2", "no_data", "데이터 부족"),
    ("E3", "stale", "최신 재무가 15개월 초과"),
    ("E4", "short_history", "FCF 이력 8년 미만"),
    ("E5", "fcf_negative", "정상화 FCF ≤ 0"),
    ("E6", "momentum", "12-1M 추세 하위 20%"),
    ("E7", "upside", "기대 상승여력 +15% 미만"),
]


# ═════════════════════════════════════════════════════════════════════════════
# 1. 수집 (네트워크) — TASK-182
# ═════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """전역 최소 간격. SEC 는 초당 10회 상한 — 여유를 둬 0.15초 간격."""

    def __init__(self, min_interval: float):
        self.min_interval = min_interval
        self._lock = threading.Lock()
        self._last = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            delay = self._last + self.min_interval - now
            if delay > 0:
                time.sleep(delay)
            self._last = time.monotonic()


SEC_LIMIT = RateLimiter(0.15)
YAHOO_LIMIT = RateLimiter(0.25)


FORCE_REFRESH = False  # --refresh: 캐시 TTL 무시


def _fresh(path: Path, ttl_days: float) -> bool:
    if FORCE_REFRESH or not path.exists():
        return False
    try:
        blob = json.loads(path.read_text(encoding="utf-8"))
        fetched = datetime.fromisoformat(blob["fetchedAt"])
    except (OSError, ValueError, KeyError):
        return False
    return datetime.now(timezone.utc) - fetched < timedelta(days=ttl_days)


def _write_json(path: Path, blob: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(blob, ensure_ascii=False), encoding="utf-8")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _strip_tags(s: str) -> str:
    return unescape(re.sub(r"<[^>]+>", "", s)).strip()


def parse_universe(html: str) -> list[dict]:
    """Wikipedia 'constituents' 표 → [{ticker, name, sector, subIndustry, cik}]."""
    start = html.find('id="constituents"')
    if start < 0:
        raise ValueError("Wikipedia 표(id=constituents)를 찾지 못했습니다 — 페이지 구조 변경")
    end = html.find("</table>", start)
    table = html[start:end]
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table, flags=re.S):
        cells = [_strip_tags(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.S)]
        if len(cells) < 7:
            continue  # 헤더 행
        rows.append({
            "ticker": cells[0].upper(),
            "name": cells[1].rstrip("| ").strip(),  # 원문 오타 방어 (2026-10-02 "ResMed|")
            "sector": cells[2],
            "subIndustry": cells[3],
            "cik": cells[6].zfill(10) if cells[6].isdigit() else None,
        })
    return rows


def fetch_universe(offline: bool) -> dict:
    if offline or _fresh(UNIVERSE_CACHE, 1):
        return json.loads(UNIVERSE_CACHE.read_text(encoding="utf-8"))
    html = ff.http_get(WIKI_URL, user_agent=ff.BROWSER_UA).decode("utf-8", errors="replace")
    rows = parse_universe(html)
    if len(rows) < 480:
        raise ValueError(f"S&P 500 구성 종목이 {len(rows)}개뿐 — 파싱 오류 의심")
    blob = {"source": WIKI_URL, "fetchedAt": _now_iso(), "count": len(rows), "constituents": rows}
    _write_json(UNIVERSE_CACHE, blob)
    return blob


SEC_KEYS = ("revenue", "operatingIncome", "netIncome", "epsDiluted", "operatingCashFlow",
            "capex", "totalAssets", "cash", "longTermDebt", "dilutedShares")

# 대체 태그 (LAB-SPEC 2절) — fetch_financials 의 METRICS 는 다른 스킬도 쓰므로 건드리지 않고
# 실험실에서만 후순위로 보완한다. 2026-10-02 커버리지 진단에서 탈락 원인 1위였다.
CAPEX_FALLBACK = {"key": "capexFallback", "kind": "duration", "unit_kind": "money",
                  "gaap": ["PaymentsToAcquireOtherPropertyPlantAndEquipment"], "ifrs": []}
MIN_EPS_FOR_IMPLIED_SHARES = 0.10  # |EPS| 가 이보다 작으면 센트 반올림 오차가 커서 역산하지 않는다


def compact_sec(annual: dict, capex_fallback: dict[int, dict] | None = None) -> list[dict]:
    """build_annual 결과 → 필요한 값만 남긴 연도 목록 (캐시 용량 절감).

    결측 보완(LAB-SPEC 2절):
      - CAPEX 없음 → `PaymentsToAcquireOtherPropertyPlantAndEquipment`
      - 희석주식수 없음 → 순이익 / 희석EPS 역산 (다중 클래스 주식 회사는 주식수를
        클래스별로만 공시해 companyfacts 에 합계가 없다 — HSY·GOOGL)
    """
    out = []
    for fy in sorted(annual):
        row = annual[fy]
        v = row["values"]
        prov = row.get("provenance", {})
        rec = {"fy": int(fy), "periodEnd": row.get("periodEnd"),
               **{k: v.get(k) for k in SEC_KEYS},
               "sharesFiled": (prov.get("dilutedShares") or {}).get("filed"),
               "imputed": []}
        if rec["capex"] is None and capex_fallback and int(fy) in capex_fallback:
            rec["capex"] = capex_fallback[int(fy)]["value"]
            rec["imputed"].append("capex")
        eps, ni = rec.get("epsDiluted"), rec.get("netIncome")
        if (rec["dilutedShares"] is None and eps is not None and ni is not None
                and abs(eps) >= MIN_EPS_FOR_IMPLIED_SHARES and (ni > 0) == (eps > 0)):
            rec["dilutedShares"] = ni / eps
            rec["sharesFiled"] = (prov.get("epsDiluted") or {}).get("filed")
            rec["imputed"].append("dilutedShares")
        out.append(rec)
    return out


def fetch_sec(ticker: str, cik: str, offline: bool) -> dict:
    path = SEC_CACHE / f"{ticker}.json"
    if offline or _fresh(path, SEC_TTL_DAYS):
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return {"error": "캐시 없음 (offline)"}
    try:
        SEC_LIMIT.wait()
        facts = ff.http_get_json(ff.SEC_FACTS_URL.format(cik=cik), timeout=60)
        try:
            tax_key, tag_key = ff.detect_taxonomy(facts)
        except SystemExit:
            raise RuntimeError("us-gaap / ifrs-full 택소노미 없음")
        currency = ff.resolve_currency(facts, tax_key, tag_key)
        annual, _ = ff.build_annual(facts, SEC_YEARS, tax_key, tag_key, currency)
        capex_fb, _ = ff.extract_metric(facts, CAPEX_FALLBACK, tax_key, tag_key, currency)
        blob = {"fetchedAt": _now_iso(), "cik": cik, "currency": currency,
                "years": compact_sec(annual, capex_fb)}
    except (RuntimeError, ValueError, KeyError) as e:
        blob = {"fetchedAt": _now_iso(), "cik": cik, "error": str(e)}
    _write_json(path, blob)
    return blob


def parse_chart(data: dict) -> dict:
    """Yahoo chart 응답 → {months: {"YYYY-MM": close}, splits: [{date, ratio}], price, priceTime}."""
    res = data["chart"]["result"][0]
    meta = res.get("meta", {})
    offset = int(meta.get("gmtoffset") or 0)
    closes = (res.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
    months: dict[str, float] = {}
    for ts, c in zip(res.get("timestamp") or [], closes):
        if c is None:
            continue
        d = datetime.fromtimestamp(ts + offset, tz=timezone.utc)
        months[f"{d.year:04d}-{d.month:02d}"] = float(c)  # 같은 달 중복 시 뒤 값(최신)
    splits = []
    for s in (res.get("events") or {}).get("splits", {}).values():
        num, den = s.get("numerator"), s.get("denominator")
        if num and den:
            d = datetime.fromtimestamp(s["date"] + offset, tz=timezone.utc).date()
            splits.append({"date": d.isoformat(), "ratio": float(num) / float(den)})
    splits.sort(key=lambda s: s["date"])
    price_time = meta.get("regularMarketTime")
    return {
        "months": months,
        "splits": splits,
        "price": meta.get("regularMarketPrice"),
        "priceTime": (datetime.fromtimestamp(price_time, tz=timezone.utc).isoformat()
                      if price_time else None),
        "currency": meta.get("currency"),
    }


def fetch_yahoo(ticker: str, offline: bool) -> dict:
    path = YAHOO_CACHE / f"{ticker}.json"
    if offline or _fresh(path, YAHOO_TTL_DAYS):
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return {"error": "캐시 없음 (offline)"}
    sym = ticker.replace(".", "-")
    try:
        YAHOO_LIMIT.wait()
        data = ff.http_get_json(YAHOO_CHART.format(sym=sym), user_agent=ff.BROWSER_UA, timeout=30)
        blob = {"fetchedAt": _now_iso(), **parse_chart(data)}
    except (RuntimeError, ValueError, KeyError, IndexError, TypeError) as e:
        blob = {"fetchedAt": _now_iso(), "error": str(e)}
    _write_json(path, blob)
    return blob


def collect(universe: list[dict], offline: bool, workers: int = 4) -> dict[str, dict]:
    """종목별 {sec, yahoo}. 금융·리츠(E1)는 수집하지 않는다 — 어차피 제외된다."""
    targets = [c for c in universe if c["sector"] not in EXCLUDED_SECTORS]
    out: dict[str, dict] = {}
    t0 = time.monotonic()

    def one(c: dict) -> tuple[str, dict]:
        sec = (fetch_sec(c["ticker"], c["cik"], offline) if c.get("cik")
               else {"error": "CIK 없음"})
        yh = fetch_yahoo(c["ticker"], offline)
        return c["ticker"], {"sec": sec, "yahoo": yh}

    with ThreadPoolExecutor(max_workers=1 if offline else workers) as pool:
        futs = [pool.submit(one, c) for c in targets]
        for i, fut in enumerate(as_completed(futs), 1):
            t, blob = fut.result()
            out[t] = blob
            if i % 50 == 0 or i == len(futs):
                print(f"  수집 {i}/{len(futs)} ({time.monotonic() - t0:.0f}s)", file=sys.stderr)
    return out


# ═════════════════════════════════════════════════════════════════════════════
# 2. 계산 (순수 함수 · 네트워크 없음) — TASK-183
# ═════════════════════════════════════════════════════════════════════════════

def month_key(iso: str) -> str:
    return iso[:7]


def shift_month(key: str, n: int) -> str:
    y, m = int(key[:4]), int(key[5:7])
    idx = y * 12 + (m - 1) + n
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}"


def split_factor_after(splits: list[dict], filed: str | None) -> float:
    """공시일 이후 분할 비율의 곱. 공시일을 모르면 보정하지 않는다(1.0)."""
    if not filed:
        return 1.0
    f = 1.0
    for s in splits:
        if s["date"] > filed:
            f *= s["ratio"]
    return f


def spinoff_suspects(splits: list[dict], run_date: date, years: int = NORMALIZE_YEARS) -> list[dict]:
    """정수비(k:1 · 1:k)가 아닌 분할 = 분사 의심. Yahoo 는 분사 조정을 소수 비율 '분할'로 기록한다
    (CMCSA 2026-01-05 Versant 분사 = 1.067). 분사 전 FCF 에는 떨어져 나간 사업이 섞여 있어
    목표가가 부풀려진다 → 탈락시키지 않고 표시해 LLM 결격 검증(TASK-188)이 반드시 확인하게 한다."""
    since = date(run_date.year - years, run_date.month, min(run_date.day, 28)).isoformat()
    out = []
    for s in splits:
        r = s["ratio"]
        clean = min(abs(r - round(r)), abs(1 / r - round(1 / r))) < 1e-6
        if s["date"] >= since and not clean:
            out.append(s)
    return out


def momentum_12_1(months: dict[str, float], run_date: date) -> float | None:
    """12-1M 수익률 = 종가[t−1] / 종가[t−12] − 1. t = 실행일이 속한 달."""
    t = f"{run_date.year:04d}-{run_date.month:02d}"
    a, b = months.get(shift_month(t, -1)), months.get(shift_month(t, -12))
    if not a or not b:
        return None
    return a / b - 1


def _median(xs: list[float]) -> float | None:
    return statistics.median(xs) if xs else None


def ticker_metrics(sec: dict, yh: dict, run_date: date) -> dict:
    """한 종목의 팩터 원값과 제외 판정 재료. 판정 자체는 run_funnel 이 한다."""
    m: dict = {"dataError": None}
    if sec.get("error") or yh.get("error"):
        m["dataError"] = sec.get("error") or yh.get("error")
        return m
    if sec.get("currency") != "USD":
        m["dataError"] = f"보고통화 {sec.get('currency')}"
        return m
    months = yh.get("months") or {}
    price = yh.get("price")
    mom = momentum_12_1(months, run_date)
    if not price or mom is None:
        m["dataError"] = "월봉 13개월 부족" if mom is None else "현재가 없음"
        return m

    years = sorted(sec.get("years") or [], key=lambda r: r["fy"])
    splits = yh.get("splits") or []
    rows = []
    for r in years:
        fcf = (r["operatingCashFlow"] - r["capex"]
               if r.get("operatingCashFlow") is not None and r.get("capex") is not None else None)
        sh = r.get("dilutedShares")
        fcfps = None
        if fcf is not None and sh:
            fcfps = fcf / (sh * split_factor_after(splits, r.get("sharesFiled")))
        p = months.get(month_key(r["periodEnd"])) if r.get("periodEnd") else None
        rows.append({**r, "fcf": fcf, "fcfps": fcfps, "priceAtFy": p,
                     "yield": (fcfps / p) if fcfps is not None and p else None})

    latest_end = max((r["periodEnd"] for r in rows if r.get("periodEnd")), default=None)
    hist = [r for r in rows if r["yield"] is not None][-HISTORY_YEARS:]
    with_fcfps = [r for r in rows if r["fcfps"] is not None]
    fcfps_now = _median([r["fcfps"] for r in with_fcfps[-NORMALIZE_YEARS:]])
    med_yield = _median([r["yield"] for r in hist])

    target = upside = None
    if fcfps_now is not None and med_yield is not None and med_yield > 0:
        target = fcfps_now / med_yield
        upside = target / price - 1

    window = rows[-HISTORY_YEARS:]
    roa = [r["operatingIncome"] / (r["totalAssets"] - (r["cash"] or 0))
           for r in window
           if r.get("operatingIncome") is not None and r.get("totalAssets")
           and r["totalAssets"] - (r["cash"] or 0) > 0]
    om = [r["operatingIncome"] / r["revenue"] for r in window
          if r.get("operatingIncome") is not None and r.get("revenue")]
    last = rows[-1] if rows else {}
    q3 = None
    if last.get("longTermDebt") is not None and last.get("fcf") is not None:
        q3 = (float("inf") if last["fcf"] <= 0
              else (last["longTermDebt"] - (last.get("cash") or 0)) / last["fcf"])

    m.update({
        "price": price,
        "priceTime": yh.get("priceTime"),
        "latestPeriodEnd": latest_end,
        "historyYears": len(hist),
        "fcfpsNow": fcfps_now,
        "yieldNow": (fcfps_now / price) if fcfps_now is not None else None,
        "medianYield": med_yield,
        "target": target,
        "upside": upside,
        "momentum": mom,
        "spinoffSuspect": spinoff_suspects(splits, run_date),
        "imputed": sorted({i for r in years for i in r.get("imputed", [])}),
        "q1": _median(roa),
        "q2": statistics.pstdev(om) if len(om) >= 5 else None,
        "q3": q3,
    })
    return m


def months_between(a: date, b: date) -> float:
    return (b - a).days / 30.44


def percentile_ranks(values: dict[str, float | None], higher_is_better: bool) -> dict[str, float | None]:
    """LAB-SPEC 5절: (더 나쁜 수 + 동값 수 × 0.5) / (n − 1) × 100. 결측은 None."""
    have = {t: v for t, v in values.items() if v is not None}
    n = len(have)
    out: dict[str, float | None] = {t: None for t in values}
    if n == 0:
        return out
    if n == 1:
        return {**out, **{t: 50.0 for t in have}}
    vals = list(have.values())
    for t, v in have.items():
        worse = sum(1 for x in vals if (x < v if higher_is_better else x > v))
        ties = sum(1 for x in vals if x == v) - 1
        out[t] = (worse + ties * 0.5) / (n - 1) * 100
    return out


def _mean(xs: list[float | None]) -> float | None:
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def gauge(pct: float | None) -> int | None:
    """백분위 → 1~5단."""
    if pct is None:
        return None
    return min(5, int(pct // 20) + 1)


def run_funnel(universe: list[dict], metrics: dict[str, dict], run_date: date) -> dict:
    """제외 규칙 E1~E7 + 순위. 반환은 screen JSON 의 본문."""
    rows: dict[str, dict] = {}
    for c in universe:
        rows[c["ticker"]] = {"ticker": c["ticker"], "name": c["name"], "sector": c["sector"],
                             "excluded": None, "metrics": metrics.get(c["ticker"], {})}

    def exclude(t: str, code: str, detail: str = "") -> None:
        rows[t]["excluded"] = {"code": code, "detail": detail}

    alive = lambda: [t for t, r in rows.items() if r["excluded"] is None]  # noqa: E731
    counts = [{"step": "universe", "label": "S&P 500", "remaining": len(rows)}]

    for t in alive():
        if rows[t]["sector"] in EXCLUDED_SECTORS:
            exclude(t, "sector", rows[t]["sector"])
    counts.append({"step": "E1", "remaining": len(alive())})

    for t in alive():
        err = rows[t]["metrics"].get("dataError") if rows[t]["metrics"] else "수집 안 됨"
        if err:
            exclude(t, "no_data", err)
    counts.append({"step": "E2", "remaining": len(alive())})

    for t in alive():
        end = rows[t]["metrics"].get("latestPeriodEnd")
        if not end or months_between(date.fromisoformat(end), run_date) > STALE_MONTHS:
            exclude(t, "stale", end or "기간종료일 없음")
    counts.append({"step": "E3", "remaining": len(alive())})

    for t in alive():
        n = rows[t]["metrics"].get("historyYears", 0)
        if n < MIN_HISTORY_YEARS:
            exclude(t, "short_history", f"{n}년")
    counts.append({"step": "E4", "remaining": len(alive())})

    for t in alive():
        f = rows[t]["metrics"].get("fcfpsNow")
        if f is None or f <= 0:
            exclude(t, "fcf_negative", f"FCF/주 {f}")
    counts.append({"step": "E5", "remaining": len(alive())})

    # E6 모집단 = E1 통과 + 모멘텀 값이 있는 종목 전체 (뒤 단계와 무관하게 고정)
    pool = sorted(r["metrics"]["momentum"] for r in rows.values()
                  if (r["excluded"] is None or r["excluded"]["code"] != "sector")
                  and r["metrics"] and r["metrics"].get("momentum") is not None)
    cut = None
    if pool:
        k = int(len(pool) * MOMENTUM_CUT_PCT / 100)
        cut = pool[k] if k < len(pool) else None  # 하위 k개 = cut 미만
    for t in alive():
        mom = rows[t]["metrics"]["momentum"]
        if cut is not None and mom < cut:
            exclude(t, "momentum", f"12-1M {mom:+.1%} < 경계 {cut:+.1%}")
    counts.append({"step": "E6", "remaining": len(alive())})

    # 순위: E6 생존자 = 랭킹 모집단
    ranked = alive()
    get = lambda key: {t: rows[t]["metrics"].get(key) for t in ranked}  # noqa: E731
    pr = {
        "q1": percentile_ranks(get("q1"), True),
        "q2": percentile_ranks(get("q2"), False),
        "q3": percentile_ranks(get("q3"), False),
        "v1": percentile_ranks(get("upside"), True),
        "v2": percentile_ranks(get("yieldNow"), True),
    }
    for t in ranked:
        q = _mean([pr["q1"][t], pr["q2"][t], pr["q3"][t]])
        v = _mean([pr["v1"][t], pr["v2"][t]])
        rows[t]["score"] = {
            **{k: pr[k][t] for k in pr},
            "quality": q, "value": v,
            "total": None if q is None or v is None else (q + v) / 2,
            "qualityGauge": gauge(q), "valueGauge": gauge(v),
        }
        if q is None or v is None:
            exclude(t, "score_missing", "퀄리티 또는 밸류 지표 전부 결측")

    for t in alive():
        u = rows[t]["metrics"].get("upside")
        if u is None or u < MIN_UPSIDE:
            exclude(t, "upside", "목표가 정의 불가" if u is None else f"상승여력 {u:+.1%}")
    counts.append({"step": "E7", "remaining": len(alive())})

    candidates = sorted(alive(), key=lambda t: (-rows[t]["score"]["total"], t))
    for i, t in enumerate(candidates, 1):
        r = rows[t]
        r["rank"] = i
        r["plan"] = {
            "target": r["metrics"]["target"],
            "stopLoss": r["metrics"]["price"] * STOP_LOSS,
            "horizonMonths": HORIZON_MONTHS,
        }

    seed = int(run_date.strftime("%Y%m%d"))
    control = random.Random(seed).choice(candidates) if candidates else None

    # 후보 0개일 때 화면에 보여줄 근접 후보 = E7 탈락 중 상승여력 최대
    near = None
    if not candidates:
        e7 = [t for t, r in rows.items() if r["excluded"] and r["excluded"]["code"] == "upside"
              and r["metrics"].get("upside") is not None]
        if e7:
            near = max(e7, key=lambda t: (rows[t]["metrics"]["upside"], t))

    labels = {code: label for _, code, label in FUNNEL_STEPS}
    for c in counts:
        step = next((s for s in FUNNEL_STEPS if s[0] == c["step"]), None)
        if step:
            c["code"], c["label"] = step[1], step[2]

    return {
        "funnel": counts,
        "momentumCut": cut,
        "candidates": candidates,
        "control": {"ticker": control, "seed": seed} if control else None,
        "nearMiss": near,
        "reasonLabels": labels,
        "stocks": rows,
    }


# ═════════════════════════════════════════════════════════════════════════════
# 3. 실행
# ═════════════════════════════════════════════════════════════════════════════

def coverage_report(universe: list[dict], data: dict[str, dict], run_date: date) -> dict:
    """수집 커버리지 — 10년 이력 확보 수와 실패 사유. TASK-182 체크용."""
    fail: dict[str, list[str]] = {}
    full = 0
    for c in universe:
        if c["sector"] in EXCLUDED_SECTORS:
            continue
        d = data.get(c["ticker"])
        m = ticker_metrics(d["sec"], d["yahoo"], run_date) if d else {"dataError": "수집 안 됨"}
        if m.get("dataError"):
            fail.setdefault(m["dataError"][:60], []).append(c["ticker"])
        elif m.get("historyYears", 0) >= MIN_HISTORY_YEARS:
            full += 1
        else:
            fail.setdefault(f"이력 {m.get('historyYears', 0)}년", []).append(c["ticker"])
    return {
        "universe": len(universe),
        "afterSector": sum(1 for c in universe if c["sector"] not in EXCLUDED_SECTORS),
        "historyOk": full,
        "failures": {k: sorted(v) for k, v in sorted(fail.items(), key=lambda kv: -len(kv[1]))},
    }


def already_recorded(run_date: date, ledger: Path = REPO_ROOT / "data" / "lab-calls.jsonl") -> bool:
    """그 실행일의 픽·없음이 판단 기록부에 있는가."""
    if not ledger.exists():
        return False
    iso = run_date.isoformat()
    for line in ledger.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if r.get("date") == iso and r.get("kind") in ("call", "none", "repeat"):
            return True
    return False


def json_safe(o):
    """비유한 실수(inf · NaN)를 null 로. 표준 JSON 에는 Infinity 가 없어 대시보드의 JSON.parse 가
    파일 전체를 거부한다(2026-10-02 실측: Q3 = inf 한 종목 때문에 탭이 '실행 기록 없음'으로 떴다).
    순위 계산은 이미 끝난 뒤라 저장값만 바꾼다 — q3 가 null 이고 원 FCF 가 음수면 '최하위'였다는 뜻."""
    if isinstance(o, float):
        return o if o == o and o not in (float("inf"), float("-inf")) else None
    if isinstance(o, dict):
        return {k: json_safe(v) for k, v in o.items()}
    if isinstance(o, list):
        return [json_safe(v) for v in o]
    return o


def main() -> int:
    ap = argparse.ArgumentParser(description="실험실 기계 필터 (docs/LAB-SPEC.md)")
    ap.add_argument("--collect-only", action="store_true", help="수집 + 커버리지 리포트만")
    ap.add_argument("--offline", action="store_true", help="네트워크 없이 캐시만 사용")
    ap.add_argument("--tickers", nargs="*", help="일부 종목만 (디버그 — 백분위가 달라진다)")
    ap.add_argument("--date", help="실행일 YYYY-MM-DD (기본: 오늘)")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--refresh", action="store_true", help="캐시 TTL 무시하고 전부 재수집")
    args = ap.parse_args()
    global FORCE_REFRESH
    FORCE_REFRESH = args.refresh and not args.offline

    run_date = date.fromisoformat(args.date) if args.date else date.today()
    # 🔴 기록된 실행일의 스크리닝은 덮어쓰지 않는다 — 픽의 시점가·목표가·순위의 근거(사전 등록 증거)다.
    #    같은 날 다시 돌리면 장중 시세로 값이 바뀌어 기록과 근거가 어긋난다.
    if not args.collect_only and not args.tickers and already_recorded(run_date):
        print(f"중단: {run_date} 실행은 이미 판단 기록부(data/lab-calls.jsonl)에 기록돼 있어 "
              f"screen-{run_date.strftime('%Y%m%d')}.json 을 덮어쓰지 않습니다.", file=sys.stderr)
        return 0
    uni = fetch_universe(args.offline)
    universe = uni["constituents"]
    if args.tickers:
        want = {t.upper() for t in args.tickers}
        universe = [c for c in universe if c["ticker"] in want]

    t0 = time.monotonic()
    data = collect(universe, args.offline, args.workers)
    elapsed = time.monotonic() - t0

    cov = coverage_report(universe, data, run_date)
    print(f"\n커버리지: 유니버스 {cov['universe']} → 금융·리츠 제외 {cov['afterSector']} → "
          f"이력 {MIN_HISTORY_YEARS}년+ 확보 {cov['historyOk']} (수집 {elapsed:.0f}s)")
    for reason, ts in cov["failures"].items():
        print(f"  - {reason}: {len(ts)}개 {', '.join(ts[:8])}{' …' if len(ts) > 8 else ''}")
    if args.collect_only:
        return 0

    metrics = {t: ticker_metrics(d["sec"], d["yahoo"], run_date) for t, d in data.items()}
    result = run_funnel(universe, metrics, run_date)
    out = {
        "ruleVersion": RULE_VERSION,
        "runDate": run_date.isoformat(),
        "generatedAt": _now_iso(),
        "universe": {"source": uni["source"], "fetchedAt": uni["fetchedAt"], "count": len(universe)},
        "coverage": cov,
        **result,
    }
    LAB_DIR.mkdir(parents=True, exist_ok=True)
    path = LAB_DIR / f"screen-{run_date.strftime('%Y%m%d')}.json"
    path.write_text(json.dumps(json_safe(out), ensure_ascii=False, separators=(",", ":"), allow_nan=False),
                    encoding="utf-8")

    print("\n깔때기: " + " → ".join(f"{c.get('step')} {c['remaining']}" for c in out["funnel"]))
    for t in result["candidates"][:10]:
        r = result["stocks"][t]
        m, s = r["metrics"], r["score"]
        print(f"  #{r['rank']:>2} {t:<6} 총점 {s['total']:5.1f} (Q {s['quality']:5.1f} · V {s['value']:5.1f})"
              f"  ${m['price']:.2f} → 목표 ${m['target']:.2f} ({m['upside']:+.1%})")
    if result["control"]:
        print(f"  대조군: {result['control']['ticker']}")
    if result["nearMiss"]:
        print(f"  후보 없음 — 근접: {result['nearMiss']}")
    print(f"\n저장: {path.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
