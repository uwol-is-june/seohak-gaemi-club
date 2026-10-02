"""tools/pe_history.py 단위 테스트 — 네트워크 없이 순수 함수만 검증한다."""
import datetime as dt

from pe_history import build_rows, percentile, split_factor_after, summarize

D = dt.date


def test_split_only_after_filing_is_applied():
    splits = [(D(2021, 7, 20), 4.0), (D(2024, 6, 10), 10.0)]
    # 2020년 제출 공시 → 두 분할 모두 이후 → 40배
    assert split_factor_after(D(2020, 2, 20), splits) == 40.0
    # 2023년 제출(2021 분할 반영 완료) → 2024 분할만
    assert split_factor_after(D(2023, 2, 24), splits) == 10.0
    # 2025년 제출 → 이미 전부 반영
    assert split_factor_after(D(2025, 2, 26), splits) == 1.0


def _rec(end, eps, filed):
    return {"periodEnd": end, "values": {"epsDiluted": eps},
            "provenance": {"epsDiluted": {"filed": filed}}}


def test_build_rows_no_double_split_adjustment():
    # GOOGL 형: 2020 EPS 는 2022 분할 후 공시에서 재작성된 값(2.93) → 다시 나누면 안 된다
    annual = {
        "2019": _rec("2019-12-31", 49.16, "2020-02-04"),  # 분할 전 공시 → /20
        "2020": _rec("2020-12-31", 2.93, "2023-02-03"),   # 분할 후 재작성 → 그대로
    }
    prices = [(D(2019, 12, 1), 66.97), (D(2020, 12, 1), 87.63)]
    rows = build_rows(annual, prices, [(D(2022, 7, 18), 20.0)])
    assert [r["pe"] for r in rows] == [27.2, 29.9]


def test_build_rows_skips_losses_and_missing_prices():
    annual = {"2020": _rec("2020-12-31", -1.0, "2021-02-01"),
              "2021": _rec("2021-12-31", 2.0, "2022-02-01")}
    assert build_rows(annual, [(D(2020, 12, 1), 10.0)], []) == []


def test_percentile_linear():
    assert percentile([1.0, 2.0, 3.0, 4.0], 0.5) == 2.5
    assert percentile([10.0], 0.75) == 10.0


def _rows(pes):
    return [{"pe": p} for p in pes]


def test_summarize_defaults_and_cap():
    s = summarize(_rows([28.5, 58.5, 23.9, 27.2, 29.9, 25.8, 19.3, 24.1, 23.5, 29.0]))
    assert s["median10"] == 26.5
    assert s["defaults"]["base"] == 26.5
    assert s["defaults"]["bear"] == 19.3
    assert s["defaults"]["bull"] >= s["defaults"]["base"]
    hyper = summarize(_rows([42.5, 51.0, 21.7, 52.3, 75.1, 63.6, 114.9, 51.7, 40.8, 39.0]))
    assert hyper["capped"] is True
    assert hyper["defaults"]["base"] == 30.0 and hyper["defaults"]["bull"] == 30.0


def test_bear_never_exceeds_base():
    # AMZN 형: 10년 최저 32.2x 가 상한 30x 보다 높다 → Bear 가 Base 를 넘으면 안 된다
    s = summarize(_rows([32.2, 51.5, 74.6, 80.3, 190.2, 60.0, 45.0, 90.0, 51.5, 70.0]))
    assert s["defaults"]["base"] == 30.0
    assert s["defaults"]["bear"] <= s["defaults"]["base"]
    assert s["bearInverted"] is True
    assert summarize(_rows([28.5, 23.9, 27.2, 19.3]))["bearInverted"] is False


def test_summarize_needs_three_years():
    try:
        summarize(_rows([20.0, 21.0]))
    except ValueError:
        return
    raise AssertionError("3년 미만이면 ValueError 여야 한다")
