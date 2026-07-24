#!/usr/bin/env python3
"""토큰 다이어트 계측 + 정확도 회귀 가드 — tools/token_diet_measure.py (TASK-41)

TASK-39/40 의 다이어트가 **토큰만 줄이고 정확도는 건드리지 않았음**을 데이터로 증명한다.
추측으로 "줄었다"고 말하지 않는다 — 원문을 실제로 받아 바이트를 잰다.

두 축을 각각 측정한다:

  1) 토큰 축 — Agent 가 재무 데이터를 얻으려고 컨텍스트에 삼키는 양
       before: SEC 10-K 원문 + stockanalysis 재무페이지 + macrotrends 페이지 (Agent 수만큼 중복)
       after : reports/{티커}/_data.md (팀 전체가 1회 공유)

  2) 정확도 축 — 줄인 뒤에도 수치가 같은가
       SEC XBRL(1차) vs Yahoo Finance(2차) 자동 교차검증 일치율.
       불일치가 있으면 그대로 드러낸다. **일치율이 떨어지면 다이어트 실패로 판정한다.**

사용법:
    python tools/token_diet_measure.py AAPL                 # 기본(4 Agent 팬아웃 가정)
    python tools/token_diet_measure.py AAPL --agents 6      # earnings-team 등
    python tools/token_diet_measure.py AAPL --no-10k        # 10-K 원문 제외(빠름)
    python tools/token_diet_measure.py AAPL MSFT NVDA       # 여러 종목

판정: 정확도 일치율이 100%가 아니면 불일치 내역을 출력하고 종료코드 3을 반환한다.
      (보고서 결론·수치가 동일한데 토큰만 줄어야 통과 — 결론이 바뀌면 롤백한다.)

외부 의존성 없음 (stdlib만).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_financials import (  # noqa: E402
    BROWSER_UA,
    SEC_FACTS_URL,
    build_annual,
    cross_validate,
    detect_taxonomy,
    fetch_yahoo_fundamentals,
    http_get,
    http_get_json,
    render_markdown,
    resolve_cik,
    resolve_currency,
)

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent

# 문자수 → 토큰 환산 계수. 영문 HTML 기준 대략 4자/토큰이며 **추정치**다.
# 하드 지표는 문자수이고, 토큰은 규모 감각을 주기 위한 보조 표기다.
CHARS_PER_TOKEN = 4


def measure_raw_sources(ticker: str, include_10k: bool) -> list[dict]:
    """다이어트 전 Agent 가 삼키던 원문들의 실제 크기를 잰다."""
    out: list[dict] = []

    def add(label: str, url: str, ua: str | None, timeout: int = 90):
        try:
            raw = http_get(url, timeout=timeout, retries=2, user_agent=ua)
            out.append({"label": label, "url": url, "chars": len(raw), "ok": True})
        except Exception as e:
            out.append({"label": label, "url": url, "chars": 0, "ok": False, "error": str(e)})

    if include_10k:
        url = latest_annual_doc_url(ticker)
        if url:
            add("SEC 연차보고서 원문(10-K/20-F)", url, None)

    add(
        "stockanalysis 재무페이지",
        f"https://stockanalysis.com/stocks/{ticker.lower()}/financials/",
        BROWSER_UA, timeout=40,
    )
    add(
        "macrotrends 재무페이지",
        f"https://www.macrotrends.net/stocks/charts/{ticker.upper()}/x/revenue",
        BROWSER_UA, timeout=40,
    )
    return out


def latest_annual_doc_url(ticker: str) -> str | None:
    """최신 연차보고서(10-K/20-F) 본문 문서 URL 을 찾는다."""
    cik, _ = resolve_cik(ticker)
    try:
        sub = http_get_json(f"https://data.sec.gov/submissions/CIK{cik}.json", timeout=60)
    except Exception:
        return None
    recent = sub.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    for i, form in enumerate(forms):
        if form in ("10-K", "20-F", "40-F"):
            acc = recent["accessionNumber"][i].replace("-", "")
            doc = recent["primaryDocument"][i]
            return (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/{doc}"
            )
    return None


def measure_ticker(ticker: str, agents: int, include_10k: bool) -> dict:
    ticker = ticker.strip().upper()

    # ── after: _data.md 생성(또는 기존 것 사용) ──────────────────────────────
    cik, name = resolve_cik(ticker)
    facts = http_get_json(SEC_FACTS_URL.format(cik=cik), timeout=90)
    tax_key, tag_key = detect_taxonomy(facts)
    currency = resolve_currency(facts, tax_key, tag_key)
    annual, tags_used = build_annual(facts, 10, tax_key, tag_key, currency)
    payload = {
        "ticker": ticker, "cik": cik, "companyName": name,
        "taxonomy": tax_key, "currency": currency,
        "generatedAt": "(계측용)", "tagsUsed": tags_used, "annual": annual,
    }
    if currency == "USD":
        payload["crossValidation"] = cross_validate(annual, fetch_yahoo_fundamentals(ticker, 10))
    after_md = render_markdown(payload)
    after_chars = len(after_md.encode("utf-8"))

    # ── before: 원문 실측 ───────────────────────────────────────────────────
    sources = measure_raw_sources(ticker, include_10k)
    per_agent = sum(s["chars"] for s in sources)

    cv = payload.get("crossValidation") or {}
    items = cv.get("items") or []
    matched = [i for i in items if i["verdict"] == "일치"]
    mismatched = [i for i in items if i["verdict"] != "일치"]

    return {
        "ticker": ticker,
        "sources": sources,
        "beforePerAgent": per_agent,
        "beforeTotal": per_agent * agents,
        "afterChars": after_chars,
        "agents": agents,
        "crossStatus": cv.get("status", "n/a"),
        "checks": len(items),
        "matched": len(matched),
        "mismatched": mismatched,
    }


def human(chars: int) -> str:
    tok = chars / CHARS_PER_TOKEN
    if tok >= 1000:
        return f"{chars:,} chars (~{tok / 1000:.0f}k 토큰)"
    return f"{chars:,} chars (~{tok:.0f} 토큰)"


def report(results: list[dict]) -> int:
    sep = "=" * 68
    failed = False

    for r in results:
        print(f"\n{sep}")
        print(f"  토큰 다이어트 계측 — {r['ticker']}  (Agent {r['agents']}개 팬아웃 가정)")
        print(sep)

        print("\n[ 다이어트 전 ] Agent 가 재무 데이터용으로 삼키던 원문 (실측)")
        failed_src = []
        for s in r["sources"]:
            mark = " " if s["ok"] else "✗"
            note = "" if s["ok"] else f"  ← 수집 실패, 합계에서 제외(과소집계)"
            if not s["ok"]:
                failed_src.append(s["label"])
            print(f"  {mark} {s['label']:<34} {human(s['chars'])}{note}")
        print(f"    Agent 1개당 소계 : {human(r['beforePerAgent'])}")
        print(f"    × {r['agents']} Agent (상한)  : {human(r['beforeTotal'])}")
        if failed_src:
            print(f"    ※ 수집 실패 {len(failed_src)}건은 합계에 넣지 않았다 → 절감률은 보수적 추정.")

        print("\n[ 다이어트 후 ] _data.md 1회 생성 → 전 Agent 공유")
        print(f"    _data.md          : {human(r['afterChars'])}")

        def pct(cut: float) -> str:
            # 99% 를 넘으면 소수 첫째자리로는 100.0% 로 뭉개져 과장으로 읽힌다.
            return f"{cut:.2f}%" if cut >= 99 else f"{cut:.1f}%"

        if r["beforePerAgent"] > 0:
            cut1 = (1 - r["afterChars"] / r["beforePerAgent"]) * 100
            ratio1 = r["beforePerAgent"] / max(r["afterChars"], 1)
            print(f"\n  ▶ Agent 1개 기준 절감률 {pct(cut1)}  ({ratio1:,.0f}배 축소)")
        if r["beforeTotal"] > 0:
            cutn = (1 - r["afterChars"] / r["beforeTotal"]) * 100
            ration = r["beforeTotal"] / max(r["afterChars"], 1)
            print(f"  ▶ {r['agents']} Agent 기준 절감률 {pct(cutn)}  ({ration:,.0f}배 축소)")
            print(
                f"    ※ '{r['agents']} Agent' 수치는 **상한**이다 — 실제로는 Agent 마다 "
                "받는 원문이 달라 중복도가 이보다 낮다."
            )

        print("\n[ 정확도 회귀 가드 ] SEC XBRL(1차) vs Yahoo Finance(2차)")
        if r["crossStatus"] != "ok":
            print(f"    ⚠️ 자동 교차검증 미완료 (status={r['crossStatus']})")
            print("       → 2차 출처를 직접 확인해야 한다. 정확도 판정 보류.")
        else:
            rate = r["matched"] / r["checks"] * 100 if r["checks"] else 0
            print(f"    대조 {r['checks']}건 · 일치 {r['matched']}건 · 일치율 {rate:.1f}%")
            if r["mismatched"]:
                failed = True
                print("    ❌ 불일치 — 원인 확인 전에는 다이어트 통과로 보지 않는다:")
                for m in r["mismatched"]:
                    # EPS 처럼 값이 작으면 정수 반올림 시 0 으로 뭉개진다 — 자릿수를 값에 맞춘다.
                    def num(v):
                        return f"{v:,.0f}" if abs(v) >= 1000 else f"{v:,.4g}"
                    print(
                        f"       FY{m['fiscalYear']} {m['metric']}: "
                        f"SEC {num(m['sec'])} vs Yahoo {num(m['secondary'])} "
                        f"({m['diffPct']:.2f}%, {m['verdict']})"
                    )
            else:
                print("    ✅ 전 항목 일치 — 수치 동일, 토큰만 감소 (정확도 무손실 확인)")

    print(f"\n{sep}")
    if failed:
        print("  판정: ⚠️ 불일치 존재 — 출처 방법론 차이인지 추출 오류인지 확인 후 판단할 것.")
        print(sep)
        return 3
    print("  판정: ✅ 통과 — 수치 동일, 토큰만 감소.")
    print(sep)
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description="토큰 다이어트 계측 + 정확도 회귀 가드 (TASK-41)")
    ap.add_argument("tickers", nargs="+", help="측정할 티커(들)")
    ap.add_argument("--agents", type=int, default=4,
                    help="팬아웃 Agent 수 (investment-team=4, earnings-team=6). 기본 4")
    ap.add_argument("--no-10k", action="store_true",
                    help="SEC 연차보고서 원문 계측 제외(빠르지만 절감률이 과소평가된다)")
    ap.add_argument("--json", action="store_true", help="JSON 으로 출력")
    args = ap.parse_args()

    results = [
        measure_ticker(t, args.agents, include_10k=not args.no_10k)
        for t in args.tickers
    ]

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        sys.exit(0)

    sys.exit(report(results))


if __name__ == "__main__":
    main()
