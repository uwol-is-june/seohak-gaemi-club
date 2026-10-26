"""tools/quality_screen_batch.py — 열등주 제거 7지표 기계 판정 테스트 (TASK-195). 네트워크 없음."""
import re
from datetime import date

from quality_screen_batch import compute, judge, screen, ticker_report


def _annual(n=11, *, rev=1000.0, gp=400.0, ni=120.0, eq=800.0, ocf=150.0, capex=30.0,
            shares=100.0, interest=10.0, pretax=150.0, overrides=None):
    """n개 회계연도의 합성 연간 재무 (fetch_financials.build_annual 출력 형태)."""
    out = {}
    for i in range(n):
        fy = 2015 + i
        v = dict(revenue=rev, grossProfit=gp, netIncome=ni, equity=eq, operatingCashFlow=ocf,
                 capex=capex, dilutedShares=shares, interestExpense=interest, pretaxIncome=pretax,
                 operatingIncome=pretax + interest, longTermDebt=500.0)
        v.update((overrides or {}).get(fy, {}))
        d = {
            "fcf": None if v["operatingCashFlow"] is None or v["capex"] is None else v["operatingCashFlow"] - v["capex"],
            "grossMarginPct": None if v["grossProfit"] is None else v["grossProfit"] / v["revenue"] * 100,
            "netMarginPct": None if v["netIncome"] is None else v["netIncome"] / v["revenue"] * 100,
        }
        out[str(fy)] = {"values": v, "derived": d}
    return out


def _run(annual, **kw):
    flags = {k: kw.pop(k) for k in ("exempt_c", "ma_exempt") if k in kw}
    return judge(compute(annual, **kw), **flags)


def test_healthy_company_passes():
    r = _run(_annual())
    assert r["verdict"] == "통과"
    assert all(i["status"] == "pass" for i in r["indicators"].values())
    assert round(r["indicators"]["roe"]["value"], 1) == 15.0
    assert r["indicators"]["coverage"]["text"] == "16.00x"   # (150+10)/10


def test_low_roe_fails():
    r = _run(_annual(ni=50.0, eq=1000.0, pretax=60.0))       # ROE 5% · NM 5%
    assert r["verdict"] == "탈락" and "roe" in r["fails"]


def test_coverage_two_decimals_near_threshold():
    r = _run(_annual(interest=100.0, pretax=97.0))           # (97+100)/100 = 1.97
    assert r["indicators"]["coverage"]["text"] == "1.97x"
    assert r["indicators"]["coverage"]["status"] == "fail"


def test_financials_skip_coverage():
    r = _run(_annual(interest=100.0, pretax=50.0), financial=True)
    assert r["indicators"]["coverage"]["status"] == "na"
    assert "coverage" not in r["fails"]


def test_negative_cumulative_fcf_fails():
    r = _run(_annual(ocf=20.0, capex=60.0))
    assert r["indicators"]["fcf"]["status"] == "fail"


def test_ocf_ni_uses_sum_ratio_and_flags_losses():
    r = _run(_annual(ni=-50.0))
    assert r["indicators"]["ocfNi"]["text"] == "적자" and r["indicators"]["ocfNi"]["status"] == "fail"


def test_dilution_fails_without_ma_and_exempts_with_flag():
    sh = {2025: {"dilutedShares": 130.0}}                    # FY2020 100 → FY2025 130 = +30%
    r = _run(_annual(overrides=sh))
    assert r["indicators"]["dilution"]["status"] == "fail" and r["hints"]
    r2 = _run(_annual(overrides=sh), ma_exempt=True)
    assert r2["verdict"] == "면제 통과"


def test_exemption_a_young_high_margin():
    # 데이터 6년(상장 10년 미만 근사) · GM 40% · OCF 흑자 · ROE 5%
    r = _run(_annual(n=6, ni=40.0, eq=800.0, rev=500.0, gp=200.0, pretax=50.0))
    assert r["indicators"]["roe"]["status"] == "exempt"
    assert r["verdict"] == "면제 통과"


def test_exemption_a_not_for_mature_company():
    r = _run(_annual(n=11, ni=40.0, eq=800.0, rev=500.0, gp=200.0, pretax=50.0))
    assert r["verdict"] == "탈락"


def test_exemption_b_recovering_net_margin():
    early = {fy: {"netIncome": 10.0} for fy in range(2015, 2024)}   # NM 1% … 최근 2년 12%
    r = _run(_annual(overrides=early, eq=500.0))
    assert r["indicators"]["nm"]["status"] == "exempt"


def test_exemption_c_requires_human_flag():
    # GM 12% · NM 2.5% · ROE 25% · OCF/NI 1.6 — Costco 형
    a = _annual(rev=4000.0, gp=480.0, ni=100.0, eq=400.0, ocf=160.0, capex=40.0, pretax=130.0)
    r = _run(a)
    assert r["verdict"] == "탈락" and any("면제 C" in h for h in r["hints"])
    r2 = _run(a, exempt_c=True)
    assert r2["verdict"] == "면제 통과"


def test_three_gaps_means_data_shortage():
    none = {fy: {"grossProfit": None, "interestExpense": None, "dilutedShares": None}
            for fy in range(2015, 2026)}
    r = _run(_annual(overrides=none))
    assert r["verdict"] == "데이터 부족"


def test_ticker_report_keeps_dashboard_contract():
    r = _run(_annual())
    r.update(ticker="XYZ", name="XYZ Corp", cik="0000000001", currency="USD")
    md = ticker_report(r, sector="Defense", today=date(2026, 10, 26))
    lines = md.splitlines()
    assert lines[0].startswith("# ") and lines[1] == "<!-- meta sector: Defense -->"
    assert "**최종 판정**: 통과" in md
    assert re.search(r"<!--\s*quality-screen\s+result:\s*통과\s*-->", md)
    assert "<!-- confidence-summary" in md and "verdict: 높음" in md
    assert "🟢[사실]" in md


def test_screen_isolates_fetch_failure():
    def fake(t):
        if t == "BAD":
            raise RuntimeError("boom")
        return _annual(), f"{t} Inc", {"cik": "1", "currency": "USD", "freshness": {}}
    res = screen(["GOOD", "BAD"], financials=set(), exempt_c=set(), ma_exempt=set(), sleep=0, fetch=fake)
    assert res[0]["verdict"] == "통과"
    assert res[1]["verdict"] == "데이터 부족" and "조회 실패" in res[1]["error"]


def test_dpp_collections_are_added_back_to_ocf():
    # CEG 형: 공시 OCF 음수지만 유동화 회수(투자활동)를 되돌리면 흑자
    dpp = {fy: {"operatingCashFlow": -100.0, "dppCollections": 300.0} for fy in range(2021, 2025)}
    a = _annual(overrides=dpp)
    for fy in range(2021, 2025):   # 합성 derived 의 fcf 도 공시 기준으로 맞춘다
        a[str(fy)]["derived"]["fcf"] = -100.0 - 30.0
    r = _run(a)
    assert r["dppYears"] == [2021, 2022, 2023, 2024]
    assert r["indicators"]["fcf"]["status"] == "pass"
    assert r["indicators"]["ocfNi"]["status"] == "pass"
    assert "유동화 회수 보정" in r["indicators"]["fcf"]["note"] and r["adjustments"]


def test_no_dpp_no_adjustment():
    r = _run(_annual())
    assert r["dppYears"] == [] and r["adjustments"] == []
