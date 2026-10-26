#!/usr/bin/env python3
"""열등주 제거 7지표를 SEC XBRL 실적으로 기계 판정한다 — 퍼널 1.5단계. (TASK-195)

`/industry-funnel` 의 1단계 전체 스캔(30~60종목) 직후, 밸류에이션(2단계)보다 **먼저** 돌린다.
품질과 가격을 한 단계에 섞으면 좋은 사업이 PER 때문에 먼저 떨어진다 — 그래서 이 도구는
주가를 아예 읽지 않는다.

예전에는 개별 스킬(`/quality-screen`)이 종목마다 웹 조사로 7지표를 채웠다(종목당 1~3M 토큰).
7지표는 전부 공시 시계열이라 **조사가 아니라 계산**이다 — SEC companyfacts 한 번으로 끝난다.

| # | 지표 | 탈락 기준 |
|---|------|---------|
| 1 | 10년 평균 ROE | 8% 미만 |
| 2 | 5년 누적 FCF | 음수 |
| 3 | 이자커버리지 (EBIT/이자비용, 최신 연도) | 2배 미만 (은행·보험은 미적용) |
| 4 | 장기 Gross Margin (10년 평균) | 15% 미만 |
| 5 | OCF / Net Income (5년 합계 비율) | 0.7 미만 |
| 6 | 장기 Net Margin (10년 평균) | 5% 미만 |
| 7 | 5년 발행주식수 증가율 | 20% 초과 (M&A 외 원인) |

면제 규칙 A(ROE · 전략적 투자기) · B(Net Margin · 전략적 저마진)는 수치만으로 판정한다.
C(고회전 박리다매)와 ⑦의 M&A 예외는 **사업 모델 판단**이 필요해 기계가 자동 적용하지 않는다 —
수치 조건이 맞으면 힌트만 출력하고, 사람이 확인한 뒤 `--exempt-c` / `--ma-exempt` 로 넘긴다.

⛔ 못 구한 값은 ⬛ 로 남기고 판정에서 뺀다(data-confidence 원칙 4). ⬛ 가 3개 이상이면 `데이터 부족`.

사용법:
    python3 tools/quality_screen_batch.py BWXT CW CEG VST GEV --sector Nuclear-Power --write-reports
    python3 tools/quality_screen_batch.py JPM BAC WFC --financials JPM,BAC,WFC
    python3 tools/quality_screen_batch.py COST --exempt-c COST --json
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import time
from datetime import date
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent

# ── 기준 (skills/industry-funnel.md 1.5단계와 같은 값) ─────────────────────────
TH_ROE = 8.0
TH_COVERAGE = 2.0
TH_GM = 15.0
TH_OCF_NI = 0.7
TH_NM = 5.0
TH_DILUTION = 20.0
# 면제 규칙
EX_GM = 30.0          # A·B: Gross Margin > 30%
EX_C_ROE = 20.0       # C: ROE > 20%
EX_C_OCF_NI = 1.0     # C: OCF/NI > 1.0
EX_A_MAX_YEARS = 10   # A: 상장 10년 미만 — XBRL 연간 데이터 연수로 근사한다
GAP_LIMIT = 3         # ⬛ 가 이 개수 이상이면 '데이터 부족'

FETCH_YEARS = 11      # ⑦은 '최신 vs 5년 전'이라 10년 창 + 1년이 필요하다

# 매출채권 유동화의 이연매입대금(DPP) 회수 — GAAP(ASU 2016-15)는 투자활동으로 분류한다.
# 영업에서 번 현금이 영업현금흐름 밖으로 빠져 ②FCF·⑤OCF/NI 가 음수로 찍힌다
# (실측 CEG FY2021~24: 공시 OCF −$1.3~−5.3B · 회수 +$3.9~10.2B · 프로그램 종료 FY2025 에 OCF +$4.2B).
# 공시 태그가 정해져 있어 기계로 되돌린다 — 보정한 연도는 결과에 그대로 표시한다.
DPP_METRIC = {
    "key": "dppCollections", "label": "유동화 채권 회수(DPP)", "kind": "duration", "unit_kind": "money",
    "gaap": ["ProceedsFromCollectionOfRetainedInterestInSecuritizedReceivables"],
    "ifrs": [],
}

NAMES = {
    "roe": "①ROE", "fcf": "②FCF", "coverage": "③이자커버리지", "gm": "④Gross Margin",
    "ocfNi": "⑤OCF/NI", "nm": "⑥Net Margin", "dilution": "⑦주식희석",
}
ICON = {"pass": "✅", "fail": "❌", "exempt": "⚠️→✅", "gap": "⬛", "na": "—"}


def load_fetcher():
    spec = importlib.util.spec_from_file_location("ff", REPO_ROOT / "tools" / "fetch_financials.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fetch_annual(ff, ticker: str, years: int = FETCH_YEARS) -> tuple[dict, str, dict]:
    cik, name = ff.resolve_cik(ticker)
    facts = ff.http_get_json(ff.SEC_FACTS_URL.format(cik=cik), timeout=60)
    tax_key, tag_key = ff.detect_taxonomy(facts)
    currency = ff.resolve_currency(facts, tax_key, tag_key)
    annual, _tags = ff.build_annual(facts, years, tax_key, tag_key, currency)
    dpp, _ = ff.extract_metric(facts, DPP_METRIC, tax_key, tag_key, currency)
    for fy, row in annual.items():
        pt = dpp.get(int(fy))
        if pt and pt.get("value"):
            row["values"]["dppCollections"] = pt["value"]
    meta = {"cik": cik, "currency": currency, "freshness": ff.freshness(annual)}
    return annual, name, meta


# ── 계산 ─────────────────────────────────────────────────────────────────────

def _num(v):
    return v if isinstance(v, (int, float)) else None


def _rows(annual: dict) -> list[tuple[int, dict]]:
    """[(회계연도, values+derived)] 오름차순."""
    out = []
    for fy in sorted(annual, key=int):
        r = annual[fy]
        v = dict(r.get("values", {}))
        v.update({f"d_{k}": val for k, val in (r.get("derived") or {}).items()})
        out.append((int(fy), v))
    return out


def _avg(xs: list[float]) -> float | None:
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def _ind(value, status: str, text: str, note: str = "", years: int | None = None) -> dict:
    return {"value": value, "status": status, "text": text, "note": note, "years": years}


def _adjust_dpp(rows: list[tuple[int, dict]]) -> list[int]:
    """DPP 회수를 OCF·FCF 에 되돌린다. 보정한 회계연도 목록을 반환."""
    years = []
    for fy, v in rows:
        dpp = _num(v.get("dppCollections"))
        if not dpp or _num(v.get("operatingCashFlow")) is None:
            continue
        v["operatingCashFlow"] = v["operatingCashFlow"] + dpp
        if _num(v.get("d_fcf")) is not None:
            v["d_fcf"] = v["d_fcf"] + dpp
        years.append(fy)
    return years


def compute(annual: dict, *, financial: bool = False) -> dict:
    """7지표 원값과 1차 판정(면제 적용 전)."""
    rows = _rows(annual)
    dpp_years = _adjust_dpp(rows)
    dpp_note = f" · 유동화 회수 보정 FY{','.join(str(y)[2:] for y in dpp_years)}" if dpp_years else ""
    last10 = rows[-10:]
    last5 = rows[-5:]
    n_years = len(rows)
    ind: dict[str, dict] = {}

    # ① 10년 평균 ROE — 자기자본이 음수인 해는 ROE 가 정의되지 않으므로 뺀다
    roes, neg_eq = [], 0
    for _, v in last10:
        ni, eq = _num(v.get("netIncome")), _num(v.get("equity"))
        if ni is None or eq is None:
            continue
        if eq <= 0:
            neg_eq += 1
            continue
        roes.append(ni / eq * 100)
    roe = _avg(roes)
    if roe is None:
        note = "자기자본 음수 — ROE 산출 불가" if neg_eq else "순이익·자기자본 태그 없음"
        ind["roe"] = _ind(None, "gap", "⬛", note)
    else:
        note = f"{len(roes)}년 평균" + (f" · 자기자본 음수 {neg_eq}개년 제외" if neg_eq else "")
        ind["roe"] = _ind(roe, "pass" if roe >= TH_ROE else "fail", f"{roe:.1f}%", note, len(roes))

    # ② 5년 누적 FCF
    fcfs = [_num(v.get("d_fcf")) for _, v in last5]
    fcfs = [x for x in fcfs if x is not None]
    if len(fcfs) < 3:
        ind["fcf"] = _ind(None, "gap", "⬛", "OCF·CAPEX 3개년 미만")
    else:
        s = sum(fcfs)
        note = f"{len(fcfs)}년 합계" + ("" if len(fcfs) == 5 else " (데이터 기간 부족)") + dpp_note
        ind["fcf"] = _ind(s, "pass" if s > 0 else "fail", _money(s), note, len(fcfs))

    # ③ 이자커버리지 — 최신 연도부터 거슬러 이자비용이 있는 첫 해
    if financial:
        ind["coverage"] = _ind(None, "na", "—", "은행·보험 — 미적용")
    else:
        ind["coverage"] = _coverage(rows)

    # ④ 장기 Gross Margin
    gms = [_num(v.get("d_grossMarginPct")) for _, v in last10]
    gm = _avg(gms)
    if gm is None:
        ind["gm"] = _ind(None, "gap", "⬛", "매출총이익·매출원가 태그 없음")
    else:
        k = len([x for x in gms if x is not None])
        ind["gm"] = _ind(gm, "pass" if gm >= TH_GM else "fail", f"{gm:.1f}%", f"{k}년 평균", k)

    # ⑤ OCF / NI — 합계 비율(적자 연도 하나가 연도별 비율 평균을 폭주시키는 것을 막는다)
    pairs = [(_num(v.get("operatingCashFlow")), _num(v.get("netIncome"))) for _, v in last5]
    pairs = [(o, n) for o, n in pairs if o is not None and n is not None]
    if len(pairs) < 3:
        ind["ocfNi"] = _ind(None, "gap", "⬛", "OCF·순이익 3개년 미만")
    else:
        so, sn = sum(o for o, _ in pairs), sum(n for _, n in pairs)
        if sn <= 0:
            ind["ocfNi"] = _ind(None, "fail", "적자", f"{len(pairs)}년 합계 순이익 ≤ 0" + dpp_note, len(pairs))
        else:
            r = so / sn
            ind["ocfNi"] = _ind(r, "pass" if r >= TH_OCF_NI else "fail", f"{r:.2f}",
                                f"{len(pairs)}년 합계 비율" + dpp_note, len(pairs))

    # ⑥ 장기 Net Margin
    nms = [_num(v.get("d_netMarginPct")) for _, v in last10]
    nm = _avg(nms)
    if nm is None:
        ind["nm"] = _ind(None, "gap", "⬛", "순이익·매출 태그 없음")
    else:
        k = len([x for x in nms if x is not None])
        ind["nm"] = _ind(nm, "pass" if nm >= TH_NM else "fail", f"{nm:.1f}%", f"{k}년 평균", k)

    # ⑦ 5년 발행주식수 증가율 — 최신 vs 5회계연도 전 (없으면 창 안 가장 이른 해)
    sh = [(fy, _num(v.get("dilutedShares"))) for fy, v in rows]
    sh = [(fy, s) for fy, s in sh if s]
    if len(sh) < 2:
        ind["dilution"] = _ind(None, "gap", "⬛", "희석주식수 태그 없음")
    else:
        fy_last, s_last = sh[-1]
        base = [(fy, s) for fy, s in sh if fy <= fy_last - 5]
        fy0, s0 = base[-1] if base else sh[0]
        g = (s_last / s0 - 1) * 100
        note = f"FY{fy0}→FY{fy_last}" + ("" if fy_last - fy0 >= 5 else " (5년 미만)")
        ind["dilution"] = _ind(g, "pass" if g <= TH_DILUTION else "fail", f"{g:+.1f}%", note)

    trend = {
        "nYears": n_years,
        "nmLast": [_num(v.get("d_netMarginPct")) for _, v in rows[-3:]],
        "ocfLast2": [_num(v.get("operatingCashFlow")) for _, v in rows[-2:]],
    }
    return {"indicators": ind, "trend": trend, "dppYears": dpp_years}


def _coverage(rows: list[tuple[int, dict]]) -> dict:
    for fy, v in reversed(rows[-3:]):
        ie = _num(v.get("interestExpense"))
        if ie is None:
            continue
        if ie <= 0:
            return _ind(None, "pass", "순이자수익", f"FY{fy} 이자비용 ≤ 0")
        pre, op = _num(v.get("pretaxIncome")), _num(v.get("operatingIncome"))
        if pre is not None:
            ebit, basis = pre + ie, "세전이익+이자"
        elif op is not None:
            ebit, basis = op, "영업이익"
        else:
            return _ind(None, "gap", "⬛", f"FY{fy} EBIT 태그 없음")
        x = ebit / ie
        # 소수 둘째 자리 — 1.97x 를 "2.0x ❌" 로 보이게 하지 않는다
        return _ind(x, "pass" if x >= TH_COVERAGE else "fail", f"{x:.2f}x", f"FY{fy} · EBIT={basis}")
    latest = rows[-1][1] if rows else {}
    ltd = _num(latest.get("longTermDebt"))
    if ltd is not None and ltd == 0:
        return _ind(None, "pass", "무차입", "장기부채 0 · 이자비용 태그 없음")
    return _ind(None, "gap", "⬛", "최근 3년 이자비용 태그 없음")


def judge(result: dict, *, exempt_c: bool = False, ma_exempt: bool = False) -> dict:
    """면제 규칙 적용 → 최종 판정. result 를 갱신해 돌려준다."""
    ind, tr = result["indicators"], result["trend"]
    gm = ind["gm"]["value"]
    exemptions, hints = [], []

    # 면제 A — ① ROE: 상장 10년 미만(데이터 연수로 근사) + GM > 30% + 최근 2년 OCF 흑자
    if ind["roe"]["status"] == "fail":
        young = tr["nYears"] < EX_A_MAX_YEARS
        ocf_ok = len(tr["ocfLast2"]) == 2 and all(x is not None and x > 0 for x in tr["ocfLast2"])
        if young and gm is not None and gm > EX_GM and ocf_ok:
            ind["roe"]["status"] = "exempt"
            exemptions.append(f"면제 A (①ROE) — 데이터 {tr['nYears']}년(상장 10년 미만 추정) · "
                              f"GM {gm:.1f}% > 30% · 최근 2년 OCF 흑자")

    # 면제 B — ⑥ Net Margin: GM > 30% + 최근 2년 NM ≥ 5% 또는 3년 연속 상승
    if ind["nm"]["status"] == "fail" and gm is not None and gm > EX_GM:
        nml = [x for x in tr["nmLast"] if x is not None]
        recovered = len(nml) >= 2 and all(x >= TH_NM for x in nml[-2:])
        rising = len(nml) == 3 and nml[0] < nml[1] < nml[2]
        if recovered or rising:
            ind["nm"]["status"] = "exempt"
            why = "최근 2년 NM 5% 이상 회복" if recovered else "NM 3년 연속 상승"
            exemptions.append(f"면제 B (⑥Net Margin) — GM {gm:.1f}% > 30% · {why}")

    # 면제 C — ④·⑥: ROE > 20% + OCF/NI > 1.0 + 박리다매 모델(사람 확인 필요)
    c_targets = [k for k in ("gm", "nm") if ind[k]["status"] == "fail"]
    if c_targets:
        roe, ocf = ind["roe"]["value"], ind["ocfNi"]["value"]
        numeric_ok = roe is not None and roe > EX_C_ROE and ocf is not None and ocf > EX_C_OCF_NI
        if numeric_ok and exempt_c:
            for k in c_targets:
                ind[k]["status"] = "exempt"
            exemptions.append(f"면제 C ({'·'.join(NAMES[k] for k in c_targets)}) — ROE {roe:.1f}% > 20% · "
                              f"OCF/NI {ocf:.2f} > 1.0 · 멤버십/플랫폼/박리다매 모델(사람 확인)")
        elif numeric_ok:
            hints.append("면제 C 수치 조건 충족(ROE>20%·OCF/NI>1.0) — 멤버십/플랫폼/박리다매 모델이면 "
                         "`--exempt-c` 로 재실행")

    # ⑦ M&A 예외 — 희석이 인수 대가 지급이면 탈락시키지 않는다(사람 확인 필요)
    if ind["dilution"]["status"] == "fail":
        if ma_exempt:
            ind["dilution"]["status"] = "exempt"
            exemptions.append("⑦ M&A 예외 — 주식 증가가 인수 대가(사람 확인)")
        else:
            hints.append("⑦ 20% 초과 — 인수 대가 주식 발행이면 `--ma-exempt` 로 재실행(10-K 확인)")

    fails = [k for k, i in ind.items() if i["status"] == "fail"]
    gaps = [k for k, i in ind.items() if i["status"] == "gap"]
    if fails:
        verdict = "탈락"
    elif len(gaps) >= GAP_LIMIT:
        verdict = "데이터 부족"
    elif exemptions:
        verdict = "면제 통과"
    else:
        verdict = "통과"
    adjustments = []
    if result.get("dppYears"):
        adjustments.append("매출채권 유동화 회수(DPP)를 영업현금흐름에 가산 — GAAP 투자활동 분류 되돌림 "
                           f"(FY{', FY'.join(str(y) for y in result['dppYears'])} · 공시 태그 "
                           "ProceedsFromCollectionOfRetainedInterestInSecuritizedReceivables)")
    result.update(verdict=verdict, fails=fails, gaps=gaps, exemptions=exemptions, hints=hints,
                  adjustments=adjustments)
    return result


def _money(v: float) -> str:
    a = abs(v)
    s = f"${a / 1e9:,.2f}B" if a >= 1e9 else f"${a / 1e6:,.0f}M"
    return ("−" if v < 0 else "+") + s


# ── 출력 ─────────────────────────────────────────────────────────────────────

def summary_table(results: list[dict]) -> str:
    head = "| 기업 | " + " | ".join(NAMES.values()) + " | 결과 | 사유 |"
    lines = [head, "|" + "---|" * (len(NAMES) + 3)]
    for r in results:
        if r.get("error"):
            lines.append(f"| {r['ticker']} | " + " | ".join("⬛" for _ in NAMES)
                         + f" | **데이터 부족** | {r['error']} |")
            continue
        cells = [f"{ICON[r['indicators'][k]['status']]} {r['indicators'][k]['text']}".strip()
                 for k in NAMES]
        reason = ", ".join(NAMES[k] for k in r["fails"]) if r["fails"] else (
            "⬛ " + ", ".join(NAMES[k] for k in r["gaps"]) if r["gaps"] else "—")
        lines.append(f"| {r['name']} ({r['ticker']}) | " + " | ".join(cells)
                     + f" | **{r['verdict']}** | {reason} |")
    return "\n".join(lines)


def stats(results: list[dict]) -> str:
    n = len(results)
    cnt = {v: sum(1 for r in results if r.get("verdict") == v)
           for v in ("통과", "면제 통과", "탈락", "데이터 부족")}
    alive = cnt["통과"] + cnt["면제 통과"]
    pct = alive / n * 100 if n else 0
    return (f"**통과율**: {alive}/{n} = {pct:.0f}% "
            f"(통과 {cnt['통과']} · 면제 통과 {cnt['면제 통과']} · 탈락 {cnt['탈락']} · 데이터 부족 {cnt['데이터 부족']})")


CRITERIA = {
    "roe": "≥ 8% (10년 평균)", "fcf": "> 0 (5년 누적)", "coverage": "≥ 2배 (최신 연도)",
    "gm": "≥ 15% (10년 평균)", "ocfNi": "≥ 0.7 (5년 합계)", "nm": "≥ 5% (10년 평균)",
    "dilution": "≤ +20% (5년)",
}


def ticker_report(r: dict, *, sector: str | None, today: date) -> str:
    """대시보드가 파싱하는 종목별 보고서. quality-screen 결과 마커·confidence-summary 계약을 지킨다."""
    ind = r["indicators"]
    high = sum(1 for i in ind.values() if i["status"] in ("pass", "fail", "exempt"))
    gap = sum(1 for i in ind.values() if i["status"] == "gap")
    # 면제 A 의 '상장 10년 미만'은 XBRL 연수로 근사한 것이라 한 단계 낮춘다
    medium = 1 if any(e.startswith("면제 A") for e in r["exemptions"]) else 0
    high -= medium
    denom = high + medium + gap
    verdict_conf = "높음" if denom and high / denom >= 0.7 else ("보통" if denom and (high + medium) / denom >= 0.5 else "낮음")

    tag = lambda i: {"gap": "⬛", "na": "—"}.get(i["status"], "🟢[사실]")  # noqa: E731
    lines = [f"# {r['name']} ({r['ticker']}) 열등주 제거 스크리닝"]
    if sector:
        lines.append(f"<!-- meta sector: {sector} -->")
    fr = r.get("freshness") or {}
    lines += [
        "",
        f"**스크리닝 날짜**: {today.isoformat()} · **방식**: 퍼널 1.5단계 기계 판정 "
        f"(`tools/quality_screen_batch.py`) — 주가를 읽지 않는다",
        f"**대상**: {r['name']} · CIK {r.get('cik', '⬛')} · 보고통화 {r.get('currency', 'USD')} · "
        f"데이터 {r['trend']['nYears']}개 회계연도",
    ]
    if fr.get("stale"):
        lines.append(f"- 🔴 신선도 경고: 최신 회계연도 종료 {fr.get('latestPeriodEnd')} — 이후 연도가 XBRL에 미반영")
    lines += [
        "",
        "## 7지표 판정",
        "",
        "| # | 지표 | 값 | 기준 | 판정 | 신뢰도 | 비고 |",
        "|---|---|---|---|---|---|---|",
    ]
    for k, label in NAMES.items():
        i = ind[k]
        lines.append(f"| {label[0]} | {label[1:]} | {i['text']} | {CRITERIA[k]} | {ICON[i['status']]} | "
                     f"{tag(i)} | {i['note']} |")
    if r.get("adjustments"):
        lines += ["", "**회계 표시 보정** 🟢[사실·계산]"] + [f"- {a}" for a in r["adjustments"]]
    lines += ["", "## 요약 테이블", "", summary_table([r]), "", "## 면제 규칙 적용 여부", ""]
    if r["exemptions"]:
        lines += [f"- {e}" for e in r["exemptions"]]
    else:
        lines.append("- 적용 없음 — 미달 지표에 해당하는 면제 조건이 없거나 미달 지표가 없다.")
    for h in r["hints"]:
        lines.append(f"- 💡 {h}")
    reason = (", ".join(NAMES[k] for k in r["fails"]) + " 미달") if r["fails"] else "7지표 기준 충족"
    if r["gaps"]:
        reason += f" · ⬛ {', '.join(NAMES[k] for k in r['gaps'])}는 판정에서 제외"
    lines += [
        "",
        "## 최종 판정",
        "",
        f"**최종 판정**: {r['verdict']}",
        "",
        f"{reason}. 열등주 제거는 첫 번째 관문이지 마지막 관문이 아니다 — 통과는 \"확실히 나쁘지 않다\"는 "
        "뜻일 뿐, 밸류에이션·해자·경영진은 퍼널 2단계 이후에서 본다.",
        "",
        f"<!-- quality-screen result: {r['verdict']} -->",
        "",
        "## 데이터 출처",
        "",
        f"- SEC EDGAR XBRL companyfacts — `data.sec.gov/api/xbrl/companyfacts/CIK{r.get('cik', '')}.json` "
        f"(10-K/20-F 연간값, {today.isoformat()} 추출)",
        "- 계산: `tools/quality_screen_batch.py` (fetch_financials 태그 정의 재사용)",
        "",
        "## 데이터 신뢰도",
        "",
        "<!-- confidence-summary",
        f"high: {high}",
        f"medium: {medium}",
        "low: 0",
        f"gap: {gap}",
        f"verdict: {verdict_conf}",
        "-->",
        "",
        f"- 🟢 {high} · 🟡 {medium} · 🔴 0 · ⬛ {gap} — 판정 수치는 전부 SEC 원문 기계 추출이다. "
        "⬛ 는 해당 태그가 공시에 없다는 뜻이며 추정으로 채우지 않았다.",
        "",
    ]
    return "\n".join(lines)


def screen(tickers: list[str], *, financials: set[str], exempt_c: set[str], ma_exempt: set[str],
           sleep: float = 0.15, fetch=None) -> list[dict]:
    ff = None if fetch else load_fetcher()
    out = []
    for i, t in enumerate(tickers):
        if i and sleep:
            time.sleep(sleep)  # SEC 공정 사용 정책(초당 10회) 여유
        try:
            annual, name, meta = fetch(t) if fetch else fetch_annual(ff, t)
        except Exception as e:  # noqa: BLE001 — 한 종목 실패가 배치를 멈추지 않는다
            out.append({"ticker": t, "name": t, "verdict": "데이터 부족",
                        "error": f"SEC XBRL 조회 실패: {type(e).__name__}"})
            continue
        if not annual:
            out.append({"ticker": t, "name": name, "verdict": "데이터 부족", "error": "연간 데이터 없음"})
            continue
        r = compute(annual, financial=t in financials)
        judge(r, exempt_c=t in exempt_c, ma_exempt=t in ma_exempt)
        r.update(ticker=t, name=name, **meta)
        out.append(r)
    return out


def _set(s: str | None) -> set[str]:
    return {x.strip().upper() for x in (s or "").split(",") if x.strip()}


def main() -> None:
    ap = argparse.ArgumentParser(description="열등주 제거 7지표 일괄 판정 (퍼널 1.5단계)")
    ap.add_argument("tickers", nargs="+", help="티커 목록 (공백 또는 쉼표 구분)")
    ap.add_argument("--sector", help="종목 보고서 섹터 마커 (퍼널 파일명의 섹터 토큰과 같은 표기)")
    ap.add_argument("--financials", help="은행·보험 티커(쉼표) — ③이자커버리지 미적용")
    ap.add_argument("--exempt-c", help="면제 C(박리다매 모델)를 사람이 확인한 티커(쉼표)")
    ap.add_argument("--ma-exempt", help="⑦ 희석이 인수 대가임을 사람이 확인한 티커(쉼표)")
    ap.add_argument("--write-reports", action="store_true",
                    help="통과·면제 통과 종목에 reports/{T}/{T}-quality-screen-{날짜}.md 작성(대시보드 칩)")
    ap.add_argument("--write-all", action="store_true", help="탈락·데이터 부족 종목도 보고서 작성")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--sleep", type=float, default=0.15)
    a = ap.parse_args()

    tickers = []
    for t in a.tickers:
        tickers += [x.strip().upper() for x in t.split(",") if x.strip()]
    results = screen(tickers, financials=_set(a.financials), exempt_c=_set(a.exempt_c),
                     ma_exempt=_set(a.ma_exempt), sleep=a.sleep)

    today = date.today()
    written = []
    if a.write_reports or a.write_all:
        for r in results:
            if r.get("error"):
                continue
            if not a.write_all and r["verdict"] not in ("통과", "면제 통과"):
                continue
            d = REPO_ROOT / "reports" / r["ticker"]
            d.mkdir(parents=True, exist_ok=True)
            p = d / f"{r['ticker']}-quality-screen-{today:%Y%m%d}.md"
            p.write_text(ticker_report(r, sector=a.sector, today=today), encoding="utf-8")
            written.append(p.relative_to(REPO_ROOT).as_posix())

    if a.json:
        print(json.dumps({"results": results, "written": written}, ensure_ascii=False, indent=2, default=str))
        return
    print(f"열등주 제거 7지표 — {len(results)}개 종목 ({today.isoformat()} · SEC XBRL · 주가 미사용)\n")
    print(summary_table(results))
    print()
    print(stats(results))
    for r in results:
        for adj in r.get("adjustments", []):
            print(f"  🔧 {r['ticker']}: {adj}")
        for e in r.get("exemptions", []):
            print(f"  {r['ticker']}: {e}")
        for h in r.get("hints", []):
            print(f"  💡 {r['ticker']}: {h}")
    if written:
        print("\n종목 보고서 작성:")
        for w in written:
            print(f"  {w}")


if __name__ == "__main__":
    main()
