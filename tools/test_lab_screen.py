#!/usr/bin/env python3
"""lab_screen 계산 규칙 테스트 (TASK-183). 가상 종목 · 네트워크 없음.

규칙 원본은 docs/LAB-SPEC.md — 테스트 이름에 해당 규칙 번호를 단다.

실행:  python3 tools/run_tests.py
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lab_screen as L  # noqa: E402

RUN = date(2026, 10, 2)


def _months(price_by_month: dict[str, float] | None = None, base: float = 100.0) -> dict[str, float]:
    """2014-01 ~ 2026-10 월봉. 기본은 평평한 100."""
    out = {}
    for y in range(2014, 2027):
        for m in range(1, 13):
            k = f"{y:04d}-{m:02d}"
            if k <= "2026-10":
                out[k] = base
    out.update(price_by_month or {})
    return out


def _sec(fcf_by_year: dict[int, float], shares: float = 100.0, filed: str = "2026-03-01",
         oi: float = 30.0, rev: float = 100.0, ta: float = 200.0, cash: float = 20.0,
         ltd: float | None = 50.0, currency: str = "USD") -> dict:
    years = []
    for fy, fcf in sorted(fcf_by_year.items()):
        years.append({
            "fy": fy, "periodEnd": f"{fy}-12-31", "revenue": rev, "operatingIncome": oi,
            "operatingCashFlow": fcf + 10.0, "capex": 10.0, "totalAssets": ta, "cash": cash,
            "longTermDebt": ltd, "dilutedShares": shares, "sharesFiled": filed,
        })
    return {"currency": currency, "years": years}


def _yh(months=None, price=100.0, splits=None) -> dict:
    return {"months": months or _months(), "price": price, "splits": splits or []}


TEN_YEARS = {y: 5.0 for y in range(2016, 2026)}  # FCF 5 × 10년, 주당 0.05


# ── 2절: 데이터 정의 ─────────────────────────────────────────────────────────

def test_split_factor_only_counts_splits_after_filing():
    splits = [{"date": "2021-07-20", "ratio": 4.0}, {"date": "2024-06-10", "ratio": 10.0}]
    assert L.split_factor_after(splits, "2021-02-26") == 40.0   # 두 분할 모두 공시 뒤
    assert L.split_factor_after(splits, "2022-03-18") == 10.0   # 첫 분할은 이미 반영
    assert L.split_factor_after(splits, "2025-02-26") == 1.0
    assert L.split_factor_after(splits, None) == 1.0


def test_split_adjusted_fcf_per_share_matches_adjusted_price():
    # 공시 후 2:1 분할 → 주식수 ×2 로 보정돼야 분할조정 종가와 같은 잣대가 된다.
    sec = _sec(TEN_YEARS, shares=100.0, filed="2020-01-01")
    yh = _yh(splits=[{"date": "2023-01-01", "ratio": 2.0}], months=_months(base=50.0), price=50.0)
    m = L.ticker_metrics(sec, yh, RUN)
    assert abs(m["fcfpsNow"] - 5.0 / 200.0) < 1e-12
    assert abs(m["yieldNow"] - 0.025 / 50.0) < 1e-12


def test_fcfps_now_is_median_of_last_three_years():
    fcf = dict(TEN_YEARS)
    fcf[2025] = 50.0  # 일회성 급등 1년
    m = L.ticker_metrics(_sec(fcf), _yh(), RUN)
    assert m["fcfpsNow"] == 0.05  # 중앙값이라 급등이 무시된다


def test_momentum_12_1_skips_latest_month():
    mo = _months({"2025-10": 100.0, "2026-09": 130.0, "2026-10": 10.0})
    assert abs(L.momentum_12_1(mo, RUN) - 0.30) < 1e-12


def test_momentum_missing_month_is_none():
    mo = _months()
    del mo["2025-10"]
    assert L.momentum_12_1(mo, RUN) is None


def _annual(values: dict, filed: dict | None = None) -> dict:
    keys = L.SEC_KEYS
    return {"2024": {"periodEnd": "2024-12-31", "values": {k: values.get(k) for k in keys},
                     "provenance": {k: {"filed": d} for k, d in (filed or {}).items()}}}


def test_capex_fallback_tag_fills_gap():
    rows = L.compact_sec(_annual({"operatingCashFlow": 50.0}), {2024: {"value": 7.0}})
    assert rows[0]["capex"] == 7.0 and rows[0]["imputed"] == ["capex"]


def test_shares_implied_from_eps_with_eps_filed_date():
    rows = L.compact_sec(_annual({"netIncome": 200.0, "epsDiluted": 2.0}, {"epsDiluted": "2025-02-01"}))
    assert rows[0]["dilutedShares"] == 100.0 and rows[0]["sharesFiled"] == "2025-02-01"
    assert "dilutedShares" in rows[0]["imputed"]


def test_shares_not_implied_from_tiny_or_sign_mismatched_eps():
    assert L.compact_sec(_annual({"netIncome": 1.0, "epsDiluted": 0.05}))[0]["dilutedShares"] is None
    assert L.compact_sec(_annual({"netIncome": -10.0, "epsDiluted": 1.0}))[0]["dilutedShares"] is None


def test_reported_shares_win_over_implied():
    rows = L.compact_sec(_annual({"netIncome": 200.0, "epsDiluted": 2.0, "dilutedShares": 99.0}))
    assert rows[0]["dilutedShares"] == 99.0 and rows[0]["imputed"] == []


def test_fractional_split_flagged_as_spinoff_within_three_years():
    splits = [{"date": "2017-02-21", "ratio": 2.0}, {"date": "2024-01-01", "ratio": 0.5},
              {"date": "2026-01-05", "ratio": 1.067}, {"date": "2020-01-01", "ratio": 1.2}]
    got = L.spinoff_suspects(splits, RUN)
    assert [s["date"] for s in got] == ["2026-01-05"]  # 2:1·1:2 는 정상 분할, 2020 은 3년 밖


# ── 4절: 목표가 ──────────────────────────────────────────────────────────────

def test_target_reverts_to_own_median_yield():
    # 과거 수익률 0.05/100 = 0.05%, 현재가가 절반(50)이면 목표가 100 · 상승여력 +100%
    m = L.ticker_metrics(_sec(TEN_YEARS), _yh(price=50.0), RUN)
    assert abs(m["target"] - 100.0) < 1e-9
    assert abs(m["upside"] - 1.0) < 1e-9


def test_target_undefined_when_median_yield_not_positive():
    fcf = {y: -5.0 for y in range(2016, 2023)} | {2023: 5.0, 2024: 5.0, 2025: 5.0}
    m = L.ticker_metrics(_sec(fcf), _yh(), RUN)
    assert m["target"] is None and m["upside"] is None


def test_non_usd_reporter_is_data_error():
    m = L.ticker_metrics(_sec(TEN_YEARS, currency="TWD"), _yh(), RUN)
    assert "TWD" in m["dataError"]


def test_q3_worst_when_latest_fcf_negative():
    fcf = dict(TEN_YEARS)
    fcf[2025] = -1.0
    m = L.ticker_metrics(_sec(fcf), _yh(), RUN)
    assert m["q3"] == float("inf")


# ── 5절: 백분위 ──────────────────────────────────────────────────────────────

def test_percentile_formula_and_ties():
    r = L.percentile_ranks({"A": 1.0, "B": 2.0, "C": 2.0, "D": 3.0, "E": None}, True)
    assert r["A"] == 0.0 and r["D"] == 100.0
    assert r["B"] == r["C"] == 50.0       # (1 + 1×0.5) / 3 × 100
    assert r["E"] is None


def test_percentile_lower_is_better_and_single():
    r = L.percentile_ranks({"A": 1.0, "B": 3.0}, False)
    assert r["A"] == 100.0 and r["B"] == 0.0
    assert L.percentile_ranks({"A": 7.0}, True)["A"] == 50.0


def test_gauge_buckets():
    assert [L.gauge(p) for p in (0, 19.9, 20, 59, 80, 100)] == [1, 1, 2, 3, 5, 5]


# ── 3·5·6절: 깔때기 전체 ─────────────────────────────────────────────────────

def _universe_and_metrics(spec: dict[str, tuple]) -> tuple[list[dict], dict[str, dict]]:
    """spec: {ticker: (sector, sec, yh)} → run_funnel 입력."""
    uni = [{"ticker": t, "name": t, "sector": s} for t, (s, _, _) in spec.items()]
    met = {t: L.ticker_metrics(sec, yh, RUN) for t, (s, sec, yh) in spec.items()
           if s not in L.EXCLUDED_SECTORS}
    return uni, met


def test_funnel_each_exclusion_code():
    falling = _months({"2025-10": 200.0, "2026-09": 100.0})
    spec = {
        "BANK": ("Financials", _sec(TEN_YEARS), _yh()),
        "NODAT": ("Industrials", {"error": "x"}, _yh()),
        "OLD": ("Industrials", _sec({y: 5.0 for y in range(2012, 2024)}), _yh()),
        "SHORT": ("Industrials", _sec({y: 5.0 for y in range(2020, 2026)}), _yh()),
        "NEG": ("Industrials", _sec({y: -5.0 for y in range(2016, 2026)}), _yh()),
        "KNIFE": ("Industrials", _sec(TEN_YEARS), _yh(months=falling, price=50.0)),
        "PRICEY": ("Industrials", _sec(TEN_YEARS), _yh(price=95.0)),
        "CHEAP": ("Industrials", _sec(TEN_YEARS), _yh(price=50.0)),
    }
    # KNIFE 가 하위 20% 에 들도록 평범한 추세의 종목을 더 넣는다(모집단 10개 → 하위 2개).
    for i in range(3):
        spec[f"FILL{i}"] = ("Industrials", _sec(TEN_YEARS), _yh(price=60.0))
    uni, met = _universe_and_metrics(spec)
    res = L.run_funnel(uni, met, RUN)
    code = lambda t: (res["stocks"][t]["excluded"] or {}).get("code")  # noqa: E731
    assert code("BANK") == "sector"
    assert code("NODAT") == "no_data"
    assert code("OLD") == "stale"
    assert code("SHORT") == "short_history"
    assert code("NEG") == "fcf_negative"
    assert code("KNIFE") == "momentum"
    assert code("PRICEY") == "upside"
    assert code("CHEAP") is None and "CHEAP" in res["candidates"]
    assert [c["remaining"] for c in res["funnel"]] == [11, 10, 9, 8, 7, 6, 5, 4]


def test_ranking_ties_break_alphabetically_and_plan_fields():
    spec = {t: ("Industrials", _sec(TEN_YEARS), _yh(price=50.0)) for t in ("ZZZ", "AAA", "MMM")}
    uni, met = _universe_and_metrics(spec)
    res = L.run_funnel(uni, met, RUN)
    assert res["candidates"] == ["AAA", "MMM", "ZZZ"]
    plan = res["stocks"]["AAA"]["plan"]
    assert plan["stopLoss"] == 50.0 * 0.85 and plan["horizonMonths"] == 12


def test_control_is_seeded_by_run_date():
    spec = {t: ("Industrials", _sec(TEN_YEARS), _yh(price=50.0)) for t in "ABCDEFG"}
    uni, met = _universe_and_metrics(spec)
    a = L.run_funnel(uni, met, RUN)["control"]
    b = L.run_funnel(uni, met, RUN)["control"]
    assert a == b and a["seed"] == 20261002 and a["ticker"] in "ABCDEFG"


def test_no_candidates_reports_near_miss():
    spec = {"P1": ("Industrials", _sec(TEN_YEARS), _yh(price=95.0)),
            "P2": ("Industrials", _sec(TEN_YEARS), _yh(price=90.0))}
    uni, met = _universe_and_metrics(spec)
    res = L.run_funnel(uni, met, RUN)
    assert res["candidates"] == [] and res["control"] is None
    assert res["nearMiss"] == "P2"  # 상승여력이 더 큰 쪽


def test_upside_gate_applied_after_ranking():
    # 백분위는 E6 생존자 전체로 매긴다 — E7 탈락 종목도 점수를 가진다.
    spec = {"IN": ("Industrials", _sec(TEN_YEARS), _yh(price=50.0)),
            "OUT": ("Industrials", _sec(TEN_YEARS), _yh(price=95.0))}
    uni, met = _universe_and_metrics(spec)
    res = L.run_funnel(uni, met, RUN)
    assert res["stocks"]["OUT"]["score"]["v1"] == 0.0
    assert res["stocks"]["IN"]["score"]["v1"] == 100.0


def test_json_safe_strips_non_finite():
    import json
    out = L.json_safe({"a": float("inf"), "b": [float("nan"), 1.5], "c": {"d": float("-inf")}})
    assert out == {"a": None, "b": [None, 1.5], "c": {"d": None}}
    json.dumps(out, allow_nan=False)  # 표준 JSON 으로 직렬화돼야 한다


# ── 1절: 유니버스 파싱 ────────────────────────────────────────────────────────

def test_parse_universe_table():
    html = ('<table id="constituents"><tbody><tr><th>Symbol</th></tr>'
            '<tr><td><a>MMM</a></td><td><a>3M</a></td><td>Industrials</td><td>Conglomerates</td>'
            '<td>St Paul</td><td>1957-03-04</td><td>0000066740</td><td>1902</td></tr>'
            '<tr><td><a>BRK.B</a></td><td>Berkshire &amp; Co</td><td>Financials</td><td>x</td>'
            '<td>y</td><td>z</td><td>1067983</td><td>1839</td></tr></tbody></table>')
    rows = L.parse_universe(html)
    assert [r["ticker"] for r in rows] == ["MMM", "BRK.B"]
    assert rows[1]["name"] == "Berkshire & Co" and rows[1]["cik"] == "0001067983"


if __name__ == "__main__":
    import run_tests
    raise SystemExit(run_tests.run_module(sys.modules[__name__]))
