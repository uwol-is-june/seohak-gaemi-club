# ADBE Q2 FY2026 — 1차 자료 공유 캐시 (팀 리드 1회 수집 · 재수집 금지)

수집 시각: 2026-09-10 · 출처: SEC EDGAR 원문 직접 확인 🟢[사실]

## 원문 링크 (직접 확인 완료)
| 자료 | URL |
|---|---|
| Q2 FY2026 8-K (2026-06-11) | https://www.sec.gov/Archives/edgar/data/796343/000079634326000109/adbe-20260608.htm |
| Q2 FY2026 실적 보도자료 Ex-99.1 | https://www.sec.gov/Archives/edgar/data/796343/000079634326000109/adbeex991q226.htm |
| Q2 FY2026 10-Q (2026-06-15, acc 0000796343-26-000112) | https://www.sec.gov/Archives/edgar/data/796343/000079634326000112/ (본문 htm: adbe-2026 0529.htm 계열 — 인덱스에서 확인) |
| 🔴 CEO 승계 8-K (2026-09-08) | https://www.sec.gov/Archives/edgar/data/796343/000079634326000144/adbe-20260902.htm |
| 직전 분기 Q1 FY2026 8-K (2026-03-12) | acc 0000796343-26-000048 |
| 연간 재무 10년 (SEC XBRL 기계추출) | reports/ADBE/_data.md |

## Q2 FY2026 실적 (Ex-99.1 원문 · 🟢[사실])
| 항목 | 값 |
|---|---|
| 총매출 | **$6.62B** (+13% YoY 보고 / +11% 고정환율) |
| GAAP 영업이익 | $2.24B |
| GAAP 순이익 | $1.71B |
| GAAP 희석EPS | $4.25 |
| Non-GAAP 영업이익 | $2.95B |
| Non-GAAP 순이익 | $2.40B |
| Non-GAAP 희석EPS | $5.96 |
| 영업현금흐름 | $2.17B |
| 자사주 매입 | 8.5M주 |
| 현금(유동) | $4.92B |
| 유동부채성 차입 | $1.84B |
| 장기부채 | $4.80B |
| **총 ARR** | **$27.10B** (Semrush 인수분 약 $480M 포함) |
| RPO | $22.27B · cRPO = RPO의 67% |
| **AI-first ARR** | **$500M 초과 (YoY 3배)** |
| 구독매출 합계 | $6.39B (+14% YoY / +12% cc) |
| ─ Business Professionals & Consumers | $1.85B (+16% YoY / +15% cc) |
| ─ Creative & Marketing Professionals | $4.54B (+13% YoY / +11% cc) |

## 가이던스 (Q2 발표 시점 · 🟢[사실])
| 항목 | Q3 FY2026 | FY2026 (상향) |
|---|---|---|
| 총매출 | $6.67~6.72B | $26.50~26.60B |
| GAAP EPS | $4.40~4.45 | $17.90~18.00 |
| Non-GAAP EPS | $6.05~6.10 | $24.35~24.45 |
| Non-GAAP 영업마진 | 약 44.0% | 약 45.0% |
| 총 ARR 성장 | — | 10.2% YoY |

## 경영진 발언 (Ex-99.1 원문 인용 · 🟢[사실])
> Shantanu Narayen: "Adobe delivered record revenue of $6.62 billion in Q2 reflecting strong AI-driven demand across our customer groups and we are raising our full-year fiscal 2026 revenue and non-GAAP EPS targets on the strength of that performance."

## 🔴 Q2 이후 발생한 중대 사건 (2026-09-08 8-K · 🟢[사실])
- **Anil Chakravarthy**(현 President, Customer Experience Orchestration Business) → **President & CEO 임명, 2026-12-01 발효**. 이사회 합류.
- **Shantanu Narayen** → CEO 은퇴, **Executive Chair** 로 이동.
- **David Wadhwani**(President, Creativity & Productivity Business) → **2026-09-27 부로 사임**, senior advisor 로 전환. (= CEO 후보에서 탈락 후 이탈)
- 보상 내역은 Item 5.02(c)(3) 수정신고로 4영업일 내 별도 제출 예정 — **현재 미공시 ⬛**
- 보도자료 발표일: 2026-09-03 (Item 7.01)

## 시장 데이터 (stockanalysis.com, 2026-09-09 종가 · 🟡[사실] 단일출처)
- 주가 **$254.86** (−0.93%) · 시총 **$101.31B** · 발행주식 397.50M
- PER 14.58 · Fwd PER 9.82 · 52주 레인지 $190.12 ~ $370.86
- 시총 검산: 254.86 × 397.50M = $101.31B ✅ 편차 0.00% (financial_rigor.py)
- 참고: 2026-08-27 종가 $289.15 → 2026-09-09 $254.86 = **−11.9%** (CEO 승계 발표 구간 포함)

## ⚠️ 교차검증 경고 (fetch_financials.py --cross 출력)
- FY2024 영업이익: SEC XBRL **$6.74B** vs Yahoo **$7.74B** = 오차 14.84% ❌ 중대 불일치
  → **SEC 원문($6.74B GAAP)을 정본으로 쓴다.** Yahoo 값은 Non-GAAP 혼입으로 추정.
- 나머지 35개 항목은 ✅ 일치.

## ⚠️ 타이밍 주의 (필수 명시)
**Q3 FY2026 실적은 2026-09-10(오늘) 장 마감 후 발표 예정이다** — 본 분석 시점에 미발표.
따라서 본 보고서는 **"Q3 발표 직전 시점의 Q2 정밀분석 + Q3에서 확인할 관전 포인트"** 성격이다.
컨센서스(Q3): 매출 $6.69B · Non-GAAP EPS $6.08 🟡[추정] (셀사이드 집계, 단일출처)

## 🔴 CEO 승계 발표 전후 주가 (stockanalysis.com 일별 OHLC · 🟡[사실] 단일출처)
| 날짜 | 종가 | 등락 | 거래량 |
|---|---|---|---|
| 2026-09-02 (Wadhwani 사임 통지일) | $279.79 | −2.20% | 3.76M |
| 2026-09-03 (승계 보도자료 발표) | $285.75 | +2.13% | 3.44M |
| **2026-09-04 (발표 후 첫 정규장)** | **$266.51** | **−6.73%** | **6.55M** |
| 2026-09-08 (8-K 제출) | $257.26 | −3.47% | 5.34M |
| 2026-09-09 | $254.86 | −0.93% | 4.05M |

- 9/3 종가 → 9/9 종가 **−10.81%**. 거래량은 9/4에 3개월 평균(약 6.3M) 대비 **1.04배**이나 직전일(3.44M) 대비 **1.9배 급증**.
- **성격 판정**: 8월의 "순수 섹터 베타" 랠리와 정반대다 — 이번엔 **Adobe 고유 이벤트에 대한 거래량 수반 하락**이다.
- 셀사이드 반응 🟡[주장] (검색 경유, 원문 미확인): Jefferies — "We had believed David Wadhwani... would be the rational choice given his running of 3/4 of ADBE's revs... With Wadhwani's departure, we believe more departures and org changes are likely."
- Chakravarthy 이력 🟡[사실]: Adobe 6년차 내부 인사. 현 Customer Experience Orchestration 사업 + 전세계 영업(worldwide field operations) 총괄. 직전 **Informatica CEO 4년**(엔터프라이즈 클라우드 데이터 관리).
- ⚠️ **논제 대조 필수**: 진입 트리거 #1은 "유능한 후임 CEO 선임 — **특히 AI·제품 백그라운드**"였다. Chakravarthy는 **엔터프라이즈 데이터·영업 백그라운드**이며, 매출 3/4를 운영하던 제품 리더는 떠난다. 트리거 충족 여부는 단순 판정이 아니다 — 양면으로 다뤄라.
