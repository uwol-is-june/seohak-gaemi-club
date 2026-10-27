# GENERAC HOLDINGS INC. (GNRC) 열등주 제거 스크리닝
<!-- meta sector: AI-Infrastructure -->

**스크리닝 날짜**: 2026-10-27 · **방식**: 퍼널 1.5단계 기계 판정 (`tools/quality_screen_batch.py`) — 주가를 읽지 않는다
**대상**: GENERAC HOLDINGS INC. · CIK 0001474735 · 보고통화 USD · 데이터 11개 회계연도

## 7지표 판정

| # | 지표 | 값 | 기준 | 판정 | 신뢰도 | 비고 |
|---|---|---|---|---|---|---|
| ① | ROE | 20.4% | ≥ 8% (10년 평균) | ✅ | 🟢[사실] | 10년 평균 |
| ② | FCF | +$1.55B | > 0 (5년 누적) | ✅ | 🟢[사실] | 5년 합계 · 유동화 회수 보정 FY16,17,18,19,20,21,22,23 |
| ③ | 이자커버리지 | 3.82x | ≥ 2배 (최신 연도) | ✅ | 🟢[사실] | FY2025 · EBIT=세전이익+이자 |
| ④ | Gross Margin | 36.2% | ≥ 15% (10년 평균) | ✅ | 🟢[사실] | 10년 평균 |
| ⑤ | OCF/NI | 1.33 | ≥ 0.7 (5년 합계) | ✅ | 🟢[사실] | 5년 합계 비율 · 유동화 회수 보정 FY16,17,18,19,20,21,22,23 |
| ⑥ | Net Margin | 9.3% | ≥ 5% (10년 평균) | ✅ | 🟢[사실] | 10년 평균 |
| ⑦ | 주식희석 | -7.0% | ≤ +20% (5년) | ✅ | 🟢[사실] | FY2020→FY2025 |

**회계 표시 보정** 🟢[사실·계산]
- 매출채권 유동화 회수(DPP)를 영업현금흐름에 가산 — GAAP 투자활동 분류 되돌림 (FY2016, FY2017, FY2018, FY2019, FY2020, FY2021, FY2022, FY2023 · 공시 태그 ProceedsFromCollectionOfRetainedInterestInSecuritizedReceivables)

## 요약 테이블

| 기업 | ①ROE | ②FCF | ③이자커버리지 | ④Gross Margin | ⑤OCF/NI | ⑥Net Margin | ⑦주식희석 | 결과 | 사유 |
|---|---|---|---|---|---|---|---|---|---|
| GENERAC HOLDINGS INC. (GNRC) | ✅ 20.4% | ✅ +$1.55B | ✅ 3.82x | ✅ 36.2% | ✅ 1.33 | ✅ 9.3% | ✅ -7.0% | **통과** | — |

## 면제 규칙 적용 여부

- 적용 없음 — 미달 지표에 해당하는 면제 조건이 없거나 미달 지표가 없다.

## 최종 판정

**최종 판정**: 통과

7지표 기준 충족. 열등주 제거는 첫 번째 관문이지 마지막 관문이 아니다 — 통과는 "확실히 나쁘지 않다"는 뜻일 뿐, 밸류에이션·해자·경영진은 퍼널 2단계 이후에서 본다.

<!-- quality-screen result: 통과 -->

## 데이터 출처

- SEC EDGAR XBRL companyfacts — `data.sec.gov/api/xbrl/companyfacts/CIK0001474735.json` (10-K/20-F 연간값, 2026-10-27 추출)
- 계산: `tools/quality_screen_batch.py` (fetch_financials 태그 정의 재사용)

## 데이터 신뢰도

<!-- confidence-summary
high: 7
medium: 0
low: 0
gap: 0
verdict: 높음
-->

- 🟢 7 · 🟡 0 · 🔴 0 · ⬛ 0 — 판정 수치는 전부 SEC 원문 기계 추출이다. ⬛ 는 해당 태그가 공시에 없다는 뜻이며 추정으로 채우지 않았다.
