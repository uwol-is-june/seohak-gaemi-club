# TECK → Anglo Teck — 재무·밸류에이션 분석 (버핏 관점)
<!-- meta sector: Copper -->

**역할**: financial-analyst (워런 버핏 관점) · **작성일: 2026-10-02** · **정보 풍부도: B등급**
**분석 대상**: NYSE: TECK(Class B) = **합병 후 Anglo Teck 1.3301주에 대한 청구권**
**기준가**: TECK **$65.22** · AAL.L **3,979p** · GBP/USD **1.3184** (Yahoo chart API, 2026-10-01~02 실측 🟢) · COMEX 구리(HG=F) **$6.543/lb** (10-02 🟢)

> **결론 먼저**: 중립 내재가치 **TECK 1주 = $46.0** (Anglo Teck 1주 $34.58 × 1.3301). 현재가 $65.22는 내재가치의 **141.8%**,
> 현재 안전마진 **−41.8%** vs 요구 MOS **40%**(T3). 절대 고평가 게이트 ②·③ 위반 → **`buy` 금지.** ★★☆☆☆

---

## 0. 🔴 먼저 바로잡을 사실 — 합병 내재가치는 $69.78이 아니라 $64.20이다

기존 체크리스트(09-30)는 합병 내재가치를 `AAL × FX × 1.3301`로 계산했다. **이 식은 Anglo 특별배당을 빠뜨렸다.**

| 항목 | 내용 | 신뢰도 |
|---|---|:---:|
| Anglo 특별배당 | **$4.5B (주당 약 $4.19)** — 합병 완료 **전** Anglo 주주명부 기준 주주에게 지급. 지급 시한은 효력일 후 45일로 연장 | 🟢[사실] (Anglo 주주총회 Circular · Teck 6-K) |
| Teck 주주 수령 여부 | ❌ 수령하지 않음 — 62.4/37.6 지분 비율은 이 배당을 전제로 한 것 | 🟢[사실] (거래 구조) / 금액은 "정상배당 정렬을 위한 조정 대상" 🟡 |
| 지급 상태 | 미지급(합병 미완료) | 🟡[사실] (09-30 기준 완료 공시 없음) |

`financial_rigor.py calc` 산출:

| 항목 | 값 |
|---|---:|
| Anglo 1주 (USD) = 39.79 × 1.3184 | **$52.46** |
| 합병가치(배당 포함, 기존 방식) = 52.46 × 1.3301 | $69.78 |
| **합병가치(특별배당 차감) = (52.46 − 4.19) × 1.3301** | **$64.20** |
| TECK 현재가 | **$65.22** |
| 스프레드 (기존 방식) | −6.53% |
| **스프레드 (배당 차감)** | **+1.59% (TECK이 패리티보다 비싸다)** |

`cross-validate` 결과: 계산 패리티 $64.20 vs 시장 $65.22 — 편차 0.79%, ✅ 2% 이내 일치.

**해석** 🟡[추정]: 시장은 TECK을 **특별배당을 뺀 Anglo 가격 × 1.3301**에 맞춰 가격을 매기고 있다. 그렇다면 체크리스트의 "−7.7% 딜 리스크 스프레드"는
**대부분 산술 오류였다.** 남은 프리미엄(+1.6%)은 완료 전 TECK 정상배당, 미국 상장 유동성, 특별배당 조정 조항 때문으로 보인다(⬛ 분해 불가).
→ **시장은 딜 성사를 사실상 확정으로 보고 있다.** 따라서 TECK의 가치 = Anglo Teck의 가치이며, 머저 아비트라지로 얻을 수익은 거의 없다.

---

## 1. Pro forma 구조 — 합병 후 주식수와 순부채

| 항목 | 값 | 출처 · 신뢰도 |
|---|---:|---|
| Anglo 발행주식수 (H1 2026) | **1,072M** | stockanalysis 대차대조표 🟡 |
| Teck 발행주식수 (A+B) | **490.6M** | stockanalysis 🟡 · 시총 검산 편차 0.15% ✅ |
| 신주 발행 = 490.6M × 1.3301 | **652.6M** | 🟢[사실](교환비율) × 🟡 |
| **합병 후 총 발행주식수** | **≈ 1,724.6M (1.7246B)** | 🟡[추정] — 공시 완전희석 기준과 차이 있음 |
| 검산: Teck 측 지분 = 652.6 / 1,724.6 | **37.8%** | 회사 발표 37.6%(완전희석 기준) 🟢 → 차이 0.2%p는 Anglo 스톡옵션·자사주 차이로 추정 |
| Anglo Teck 1주 시장가치 (특별배당 차감) | **$48.27** | 52.46 − 4.19 |
| **Pro forma 시가총액** | **$83.73B** | Anglo $56.24B − 특별배당 $4.5B + Teck $32.00B. `verify-market-cap`(48.27 × 1.7246B = $83.25B) 편차 0.58% ✅ |

| 순부채 구성 | 값 | 신뢰도 |
|---|---:|---|
| Anglo 순부채 (2026-06-30) | $8.2B (IR) / $8.40B (stockanalysis) — `cross-validate` 편차 1.18% ✅ | 🟢 |
| Teck 순부채 | $2.63B (부채 $6.90B − 현금 $4.26B) | 🟡 (stockanalysis 단일) |
| 특별배당 지출 | +$4.5B | 🟢 |
| **Pro forma 순부채** | **$15.33B** | 🟡[추정] |
| 미반영 | 석탄 매각 선지급금 최대 $2.3B(완료 여부 ⬛) · Teck 비지배지분(QB2 40% 등) 가치 ⬛ | ⬛ |

---

## 2. Anglo American 실적 추이 (continuing operations 구분)

Anglo는 백금(Valterra 분리 완료)·니켈·제철용 석탄·De Beers(매각 진행)를 정리 중이다. **연도별 매출이 같은 사업 범위가 아니다** — FY2024 매출 급감(−42.1%)은 대부분 재분류 효과다.

### 2-1. 법정 수치 (stockanalysis, USD M) 🟡

| 항목 | FY2021 | FY2022 | FY2023 | FY2024 | FY2025 | TTM(26.6) |
|---|---:|---:|---:|---:|---:|---:|
| 매출 | 41,554 | 35,118 | 30,652 | 17,745 | 18,546 | 19,518 |
| 매출총이익 | 28,297 | 11,070 | 17,416 | 11,298 | 11,698 | 13,068 |
| 영업이익 | 17,314 | 10,890 | 6,261 | 3,475 | 3,973 | 4,718 |
| 순이익(지배주주, 손상 포함) | 8,562 | 4,514 | 283 | **−3,068** | **−3,741** | **−2,720** |
| OCF | 16,723 | 9,765 | 6,496 | 8,103 | 5,511 | 5,798 |
| CAPEX | 5,732 | 6,191 | 5,876 | 3,974 | 3,340 | 3,251 |
| FCF | 10,991 | 3,574 | 620 | 4,129 | 2,171 | 2,547 |
| 지배주주 BVPS ($) | 25.93 | 25.57 | 23.47 | 19.43 | 16.78 | 16.01 |

⚠️ 매출총이익 FY2022(11,070)가 FY2023(17,416)보다 낮은 것은 집계 사이트의 분류 비일관성으로 보인다 🔴 — 매출총이익률은 판정에 쓰지 않는다.
⚠️ 순손실은 De Beers·니켈·석탄 손상차손 때문이다(🟡[사실]). 이 수치가 Anglo의 "자본 파괴 이력"이다.

### 2-2. 회사 기준 underlying (continuing) 🟢 (Anglo IR — 집계 사이트와 독립 아님)

| 항목 | FY2024 | FY2025 | H1 2025 | **H1 2026** | TTM(계산) |
|---|---:|---:|---:|---:|---:|
| Underlying EBITDA | $6.3B | **$6.4B** | $2.955B | **$4.002B** (+35%) | **$7.45B** |
| EBITDA 마진 | ⬛ | ⬛ | 32% | **38%** | — |
| 구리 EBITDA (마진) | ⬛ | 마진 49% | ⬛ | **$2.9B (60%)** | — |
| 기본 underlying EPS (continuing) | $1.11 | **$0.80** | $0.32 | **$0.77** | **$1.25** |
| 기본 EPS (법정, 전체) | ⬛ | $(3.31) 희석 | $(1.58) | $(0.80) | — |
| Attributable FCF | $(209)M | $790M | $322M | $803M | — |
| 순부채 / underlying EBITDA | — | — | — | **1.0x** | — |
| Attributable ROCE | — | — | 9% | **15%** | — |

출처: [Anglo Interim Results 2026](https://www.angloamerican.com/media/press-releases/2026/30-07-2026) · [Anglo FY2025 Results](https://www.angloamerican.com/media/press-releases/2026/20-02-2026) · [stockanalysis AAL](https://stockanalysis.com/quote/lon/AAL/financials/)

**FY2025 underlying EPS가 EBITDA 증가에도 −28% 감소**한 원인은 회사 설명상 금융비용·감가상각 증가와 비지배지분·세금 믹스다 🟡[주장]. 즉
**EBITDA 중 상당 부분이 Anglo 주주가 아니라 비지배주주(Quellaveco·Kumba·Anglo Sur 지분 파트너)에게 간다.** EV/EBITDA만 보면 이 누수가 안 보인다.

---

## 3. Teck 실적 (SEC XBRL · CAD) 🟢

`reports/TECK/_data.md` 그대로 (보고통화 **CAD**, 환산하지 않음):

| 항목 (CAD) | FY2021 | FY2022 | FY2023 | FY2024 | FY2025 |
|---|---:|---:|---:|---:|---:|
| 매출 | 12.77B | 17.32B | 6.48B | 9.06B | 10.76B |
| 매출총이익률 | 40.8% | 49.5% | 17.2% | 17.7% | 24.7% |
| 영업이익 | 4.98B | 6.99B | 222M | −9M | 2.25B |
| 순이익 | 2.87B | 3.32B | 2.41B | 406M | 1.40B |
| OCF | 4.74B | 7.98B | 4.08B | 2.79B | 1.48B |
| CAPEX | 3.97B | 4.42B | 3.88B | 2.26B | 1.84B |
| FCF | 772M | 3.56B | 199M | 528M | **−359M** |
| ROE | 12.5% | 13.0% | 8.9% | 1.6% | 5.6% |

⚠️ FY2023 매출 급감(−62.6%)과 순이익률 37.2%는 **제철용 석탄 사업(EVR, Glencore 매각) 중단영업 재분류** 효과다 — 매출에서 빠졌고 순이익에는 매각 관련 이익이 들어갔다 🟡[추정].

**TTM (USD, stockanalysis statistics 🟡)**: 매출 $9.85B · EBITDA $4.62B · 순이익 $1.76B · EPS $3.59 · FCF $1.35B · ROE 8.72% · ROIC 8.65% · 유동비율 3.12

**교차검증 결과**:
| 항목 | 1차 | 2차 | 판정 |
|---|---|---|---|
| 보고통화 | SEC XBRL: CAD | stockanalysis 손익계산서: "Financials in millions CAD" 표기 확인 | ✅ 통화 일치 |
| TECK 시가총액 | $65.22 × 490.6M = $32.00B | stockanalysis $31.95B | ✅ 편차 0.15% |
| TECK 연도별 매출·순이익 값 | SEC C$10.76B / C$1.40B (FY25) | stockanalysis 표 값 파싱 실패 | ⬛ **2차 값 대조 미완료** — 통화·단위만 확인 |

⚠️ stockanalysis statistics의 TTM 값은 USD로 표기되나 원 공시는 CAD다. 사이트 내부 환산 환율은 ⬛.

---

## 4. 수익성 · 현금흐름 · 재무건전성 — Pro forma

### 4-1. Pro forma TTM 이익 (Anglo Teck 1주 기준)

| 구성 | 값 | 근거 |
|---|---:|---|
| Anglo continuing underlying 이익 | $1.25 × 1.072B ≈ $1.34B | 🟢 EPS × 🟡 주식수 |
| Teck 순이익 (TTM) | $1.76B | 🟡 |
| 시너지 (세후, **50%만 반영**) | $0.8B × 50% × (1−30%) = $0.28B | 회사 목표 $800M 세전·연간 🟢[주장] / 반영률·세율 🔴[추정] |
| **Pro forma 이익 / 주식수 1.7246B** | **Anglo Teck EPS $1.96** | `calc` |
| **TECK 1주 환산 EPS (× 1.3301)** | **$2.61** | `calc` |

⚠️ De Beers 손실은 중단영업이라 제외했다. 매각이 늦어지면 실제 지배주주 이익은 이보다 낮다(H1 2026 전체 underlying EPS $0.58 vs continuing $0.77) 🟡.

### 4-2. 수익성

| 지표 | Anglo | Teck | Pro forma | 판정 |
|---|---|---|---|---|
| ROE | TTM −3.07% (법정) 🟡 | 8.72% TTM 🟡 / 10년 평균 ROIC 7.0% 🟢 | **10.55%** (EPS $2.61 / 장부 BVPS $24.75, `verify-valuation`) 🔴 | ❌ <15% |
| ROIC | 5년 평균 **14.0%** (법정 영업이익×0.65 기준, 29.1→17.7→9.4→5.7→7.7%) 🔴 / ROCE 15% (회사, H1 26) 🟡 | 8.65% TTM | ⬛ (취득회계 미확정) | ⚠️ 하락 추세 |
| EBITDA 마진 | continuing 38% (H1 26) 🟢 · 구리 60% | TTM EBITDA $4.62B / 매출 $9.85B 🟡 | — | ✅ 구리 고가 구간 |
| 매출총이익률 | 분류 비일관 🔴 | 24.7% (FY25) 🟢 | — | 판정 보류 |

⚠️ Pro forma BVPS $24.75(TECK 1주 환산)는 **역사적 장부가 단순 합산**이다(Anglo 지배주주 자본 $17.16B − 특별배당 $4.5B + Teck 자본 $19.43B = $32.09B / 1.7246B × 1.3301). 합병 취득회계에서 Teck 자산을 공정가치로 다시 평가하면 장부가는 크게 오르고 ROE는 낮아진다 🔴.

**수익성 ★★☆☆☆** — 구리 가격 강세 구간인데도 자본수익률이 자본비용(8~10%)을 겨우 넘는다. 근거: Anglo 5년 ROIC 하락 추세, Teck 10년 ROIC 7.0%.
> 하지만 반대로: Anglo ROCE가 9%에서 15%로 뛰었고(H1), 구리 EBITDA 마진 60%는 업계 최상위다. QB2·Quellaveco 투자기가 끝나면서 자본수익률이 구조적으로 올라갈 수 있다 🟡[추정].

### 4-3. 현금흐름

| 항목 (USD) | Anglo TTM | Teck TTM | Pro forma 합계 |
|---|---:|---:|---:|
| OCF | $5.80B | ⬛(USD TTM) | — |
| CAPEX | $3.25B | ⬛ | — |
| FCF (100% 연결) | **$2.55B** | **$1.35B** | **≈ $3.90B** 🟡 |
| Attributable FCF | $803M (H1만) 🟢 | — | ⬛ |
| FCF Yield (pro forma 시총 $83.73B 대비) | — | — | **약 4.7%** 🔴 (연결 FCF는 비지배지분 몫이 포함돼 과대) |

Anglo FCF 5년 추이(10,991 → 3,574 → 620 → 4,129 → 2,171)는 **사이클을 그대로 탄다**. Teck은 FY2025에 FCF가 마이너스(C$−359M)였다.

**현금흐름 ★★☆☆☆** — 연결 FCF는 플러스지만 그중 비지배지분 몫이 크고, 사이클 저점에서는 0 근처로 떨어진 이력이 양사 모두 있다.

### 4-4. 재무건전성

| 지표 | 값 | 판정 |
|---|---:|---|
| Pro forma 순부채 | $15.33B (특별배당 포함) | 🟡 |
| Pro forma TTM EBITDA | Anglo $7.45B + Teck $4.62B = **$12.07B** 🟡 | — |
| **순부채 / EBITDA** | **1.27x** (`calc`) | ✅ <2x |
| 유동비율 | Anglo 2.77 (19,243/6,953) · Teck 3.12 🟡 | ✅ |
| 비지배지분 장부가 | Anglo $6.24B + Teck ⬛ | ⚠️ 상당 |

**재무건전성 ★★★★☆** — 특별배당 $4.5B를 반영해도 레버리지가 낮다. 다만 구리 가격이 mid-cycle로 돌아가면 EBITDA가 줄어 비율은 올라간다.

---

## 5. 밸류에이션 — 직접 계산 (Anglo Teck 기준)

### 5-1. 현재 멀티플

| 지표 | 계산 | 값 | 신뢰도 |
|---|---|---:|:---:|
| **PER (TTM pro forma)** | $65.22 / $2.61 (`verify-valuation`) | **24.99x** | 🔴 (pro forma 추정 EPS) |
| 동일 · Anglo Teck 기준 | $49.03 / $1.96 | 25.0x | 🔴 |
| 포워드 PER (참고) | Anglo 27.07x · Teck 19.45x (stockanalysis) | — | 🟡 |
| **EV/EBITDA** | (시총 $83.73B + 순부채 $15.33B + Anglo NCI $6.24B) / $12.07B | **8.72x** (Teck NCI 미포함 → 실제보다 낮게 잡힘) | 🔴 |
| P/B | $65.22 / $24.75 (역사 장부 합산) | 2.64x | 🔴 |
| P/NAV | 애널리스트 NAV 미확인 | ⬛ | ⬛ |
| Earnings Yield | 1 / 24.99 | 4.00% | 🔴 |

### 5-2. 동종 비교 (stockanalysis statistics, 2026-10-02 조회 🟡)

| 기업 | PER | Fwd PER | EV/EBITDA | P/B | ROE | ROIC |
|---|---:|---:|---:|---:|---:|---:|
| Freeport (FCX) | 33.95 | 20.04 | 11.07 | 4.95 | 14.75% | 12.68% |
| Southern Copper (SCCO) | 29.98 | 27.58 | 17.11 | 13.56 | 49.90% | 41.17% |
| BHP | 21.56 | 16.53 | 7.60 | 3.76 | 24.00% | 21.72% |
| Rio Tinto | 12.99 | 11.50 | 7.71 | 2.19 | 19.31% | 14.60% |
| Glencore | 16.36 | 12.25 | 8.09 | 2.35 | 16.04% | 8.15% |
| **Anglo Teck (pro forma)** | **25.0** | — | **8.72+** | 2.64 | **10.55%** | ⬛ |

**해석**: Anglo Teck은 **EV/EBITDA로는 다각화 메이저(BHP·Rio·Glencore 7.6~8.1x) 수준이지만, PER로는 구리 순수 종목(FCX) 쪽에 가깝다.**
차이를 만드는 것이 비지배지분과 감가상각·금융비용이다 — EBITDA는 메이저급인데 지배주주 이익은 그만큼 남지 않는다. ROE 10.55%는 비교군 최저다.
**동종 대비 싸다는 근거는 없다** 🟡[의견].

---

## 6. 퀄리티 티어 판정 (밸류에이션과 무관하게 먼저 확정)

### 6-1. Teck — `python3 tools/quality_tier.py TECK --moat 3` (SEC XBRL 2016~2025) 🟢

| 축 | 값 | 기준 | 판정 |
|---|---:|---|:---:|
| ① 10년 평균 ROIC | 7.0% | ≥15% | ❌ |
| ② 10년 평균 FCF마진 | 7.7% | ≥15% | ❌ |
| ③ 매출 역성장 (−5% 초과) | 3회 (2019 −5.0% · 2020 −25.0% · 2023 −62.6%) | ≤1회 | ❌ |
| ④ 이익 안정성 | 에피소드 2회: 2019 −119.5% → 2022 회복(3년) · 2024 −87.8% → 미회복 | 안정 | ❌ |
| ⑤ 해자 | ★3 (자원 희소성, 업종 공통) 🟡[의견] | ★4+ | ❌ |

→ **T3** (2019 급감 후 회복 3년 — 조건 무관 T3)

### 6-2. Anglo — 공개 연차 수치로 직접 산출 (5년만 확보)

| 축 | 값 | 기준 | 판정 |
|---|---:|---|:---:|
| ① 평균 ROIC | **5년 14.0%** (29.1 · 17.7 · 9.4 · 5.7 · 7.7%) 🔴 — **10년 ⬛** | ≥15% | ⬛ → 미달 처리 |
| ② 평균 FCF마진 | **5년 14.7%** (26.4 · 10.2 · 2.0 · 23.3 · 11.7%) 🔴 — 사업 범위가 해마다 다름, **10년 ⬛** | ≥15% | ⬛ → 미달 처리 |
| ③ 매출 역성장 | 3회 (FY22 −15.5% · FY23 −12.7% · FY24 −42.1%(재분류 포함)) 🟡 | ≤1회 | ❌ |
| ④ 이익 안정성 | 순이익 $8,562M(21) → $(3,741)M(25), **2022년부터 미회복 에피소드** 🟡 | 안정 | ❌ (낙폭 −50% 초과 → 즉시 T3) |
| ⑤ 해자 | ★3 (구리·철광석 장수명 자산, 업종 공통) 🟡[의견] | ★4+ | ❌ |

→ **T3** (④ 시클리컬 + 낙폭 −50% 초과 → 조건 무관 T3. 10년 축 ⬛도 T3 규칙에 해당)

### 6-3. 합병 법인 최종 판정

**Anglo Teck = T3 (시클리컬)** · 오버라이드: 없음. 상향 근거가 없다 — 두 회사 모두 5개 축 중 통과한 축이 0개다.

**요구 MOS = 40% (T3 범위 30~40%의 상단)**. 상단을 택한 이유(quality-tier.md 조정 요인 3개 전부 "빡빡" 쪽):
1. 내재가치 핵심 가정(pro forma EPS·시너지·mid-cycle PER)이 🔴 추정이다
2. 시나리오 분산이 넓다 (비관 −73.7% / 낙관 +21.7%)
3. 무효화 조건(De Beers 매각 지연, 통합 실패, 구리 가격 반락)을 감시하기 어렵고 발생 확률도 낮지 않다

---

## 7. 내재가치 산출 — 금융 정확성 검증 (`financial_rigor.py batch` 원문)

### 7-1. Mid-cycle 가정 (모두 🔴[추정])

| 가정 | 값 | 근거 |
|---|---|---|
| 기준 이익 | TECK 1주 환산 EPS **$2.61** (pro forma TTM, 시너지 50%) | §4-1 |
| 구리 가격 | TTM 실현가 수준을 mid-cycle로 간주 (실현가 수치 ⬛). 현재 COMEX $6.54/lb는 **사이클 고점 구간**이라 기준에 쓰지 않는다 | 🟢 현물가 / 🔴 mid-cycle 판단 |
| 중립 성장 +8%/년 (3년) | 시너지 단계적 실현 + QB2·Quellaveco 램프업 + 금융비용 감소 | 🔴 |
| 낙관 +15% / 20x | 구리 $6+ 유지, 시너지 100% + Collahuasi–QB 연계 시너지 | 🔴 |
| 비관 −10% / 9x | 구리 반락 + 2019·2024형 이익 급감 + De Beers 추가 손상 | 🔴 |
| 중립 PER 14x | 광산주 사이클 평균 PER (09-30 체크리스트와 같은 가정 — 비교 가능하도록 유지) | 🔴 |

### 7-2. 도구 출력

```
[1/17] verify-market-cap  (TECK)
  Price: 65.22 USD · Shares: 490.60M · Calculated Cap: 32.00B USD · Reported Cap: 31.95B USD
  Deviation: 0.15%  ✅ 산술 일치

[2/17] verify-market-cap  (Anglo Teck pro forma, 특별배당 차감)
  Price: 48.27 USD · Shares: 1.72B · Calculated Cap: 83.25B USD · Reported Cap: 83.73B USD
  Deviation: 0.58%  ✅ 산술 일치

[3/17] verify-valuation  (TECK 1주 환산)
  PE (TTM):       65.22 / 2.61 = 24.99x
  Earnings Yield: 4.00%
  PB:             65.22 / 24.75 = 2.64x
  ROE:            2.61 / 24.75 = 10.55%

[4/17] cross-validate: Anglo net debt H1 2026
  ✅ Anglo IR      : 8.20 B USD  (deviation 1.18%)
  ✅ stockanalysis : 8.40 B USD  (deviation 1.18%)
  ✅ All sources within 2.0% — data consistent

[5/17] cross-validate: Anglo Teck merger value per TECK (ex special div)
  ✅ calc_AAL_x_FX : 64.20 USD  (deviation 0.79%)
  ✅ TECK_market   : 65.22 USD  (deviation 0.79%)

[6/17] three-scenario   Current Price: 65.22 · Current EPS: 2.61 · Forecast Years: 3
  Scenario               Growth  Target PE   Target EPS  Target Price   Upside
  Bull (Optimistic)         15%        20x         3.97         79.4    +21.7%
  Base (Neutral)             8%        14x         3.29         46.0    -29.4%
  Bear (Pessimistic)       -10%         9x         1.90         17.1    -73.7%
  ✅ All calculations use exact decimal arithmetic — results are auditable
```

### 7-3. 교차 확인 — EV 방식

`calc`: ((EBITDA $12.07B + 시너지 반영 $0.4B) × 7.0x − 순부채 $15.33B − Anglo NCI $6.24B) / 1.7246B × 1.3301 = **$50.69 (TECK 1주)**

이 값은 **상한값**이다 — Teck 비지배지분(QB2 40%)을 빼지 않았고 Anglo NCI도 장부가로만 뺐다. 실제 비지배지분 경제가치를 반영하면 내려간다.
→ 이익 방식 $46.0과 EV 방식 ≤$50.7이 같은 방향을 가리킨다. **두 방식 모두 현재가 $65.22보다 22~29% 낮다.**

### 7-4. 🔴 내재가치 (중립) — 확정값

| 단위 | 값 |
|---|---:|
| Anglo Teck 1주 | **$34.58** |
| **TECK 1주 (× 1.3301)** | **$46.0** |
| 비관 / 낙관 (TECK 1주) | $17.1 / $79.4 |

> 시장이 함의하는 Anglo Teck 1주 가치는 $49.03(= 65.22 / 1.3301)이다. 특별배당을 뺀 Anglo 현재가 $48.27도 내재가치 대비 **139.6%** —
> **Teck 주주는 비싼 증권을 받고, 그 증권은 지금도 비싸다** 🔴[추정].

---

## 8. 안전마진 평가

| 항목 | 값 |
|---|---:|
| 내재가치 (중립, TECK 1주) | $46.0 |
| 현재가 | $65.22 (내재가치의 **141.8%**) |
| **현재 안전마진** = 1 − 65.22/46.0 | **−41.8%** |
| 요구 MOS (T3) | 40% |
| 부족분 | **81.8%p** |
| **매수 상한** = 46.0 × (1 − 0.40) | **$27.6** |
| 2.55 정합성: 매수 상한 vs 비관×1.05 ($17.96) | $27.6 > $17.96 → ✅ 자기모순 아님 |
| 2.5 병 진단 | **병 ② 밸류에이션 괴리** (현재가/IV > 100%) — 산술로 고칠 수 없다 |

### 절대 고평가 게이트

| 게이트 | 계산 | 판정 |
|---|---|:---:|
| ① 현재가 > 낙관 목표가 | $65.22 < $79.4 | ⬜ 해당 없음 |
| ② 10년 후 25x PER 매도 시 연환산 < 10% | 중립 +8%/년 → 10년 EPS $5.63 × 25 = $140.8 → 연환산 **8.0%** (배당 제외). 낙관 +15%/년이면 15.0% | 🔴 **위반** (중립 경로) |
| ③ 하방 손실 > 상방 이익 (크기 비교) | 비관 **−73.7%** > 낙관 **+21.7%** | 🔴 **위반** |

→ **`buy` 금지.** 게이트 ③은 확률을 넣어도 뒤집히지 않는다(상방 크기가 하방의 1/3 미만이다).

**안전마진 ★☆☆☆☆** — 요구 MOS 크게 미달 + 게이트 2개 위반.

---

## 9. 딜 무산 시나리오 — 독립 TECK (하방 분석용)

09-30 체크리스트의 독립 기업 근거를 재사용했다 (TTM EPS $3.59 · 3년 · `three-scenario`):

| 시나리오 | 독립 TECK 가치 | 현재가 대비 |
|---|---:|---:|
| 낙관 (+12%, 20x) | $100.9 | +54.7% (추정) |
| 중립 (+5%, 14x) | **$58.2** | **−10.8%** |
| 비관 (−10%, 9x) | $23.6 | −63.8% |
| 참고: 애널리스트 평균 목표가 | $52.65 (stockanalysis) 🟡 | −19.3% |

**결과 매트릭스 (TECK 1주, 중립 기준)**:

| 결과 | 가치 | 현재가 대비 |
|---|---:|---:|
| 합병 완료 → Anglo Teck 중립 | $46.0 | −29.4% |
| 딜 무산 → 독립 TECK 중립 | $58.2 | −10.8% |
| 최악: 구리 반락 (합병 후) | $17.1 | −73.7% |

**역설적 발견** 🔴[추정]: 우리 가정에서는 **딜 무산 시 독립 TECK 중립가치($58.2)가 합병 완료 시 가치($46.0)보다 높다.** Anglo 측 지배주주 이익이 주가 대비 약하기 때문이다(Anglo continuing underlying EPS $1.25 vs 특별배당 차감가 $48.27 = PER 약 39x).
> 하지만 반대로: Anglo의 FY2025 이익은 금융비용·감가상각이 정점인 해였고, 포워드 PER(27x)이 시사하듯 시장은 이익 회복을 이미 기대한다. 우리 TTM 기준이 Anglo를 과소평가하고 있을 수 있다 — **이 점이 본 분석의 최대 불확실성이다.**

---

## 10. 진입 래더 초안 (매수 상한 $27.6 기준)

> 현재 판정이 `buy` 금지이므로 이 래더는 **"얼마면 사는가"의 기록**이다. 승인 후 보유하게 될 증권(Anglo Teck)의 가치를 TECK 1주로 환산한 가격이다.

| 차수 | 가격 (TECK) | 비중 | AND 조건 (정기 공시 지표만) |
|---|---:|---:|---|
| 1차 | **≤ $27.6** | 30% | AND **직전 반기 보고서의 순부채/underlying EBITDA ≤ 1.5x** (Anglo 반기 보고서에 공시) |
| 2차 | ≤ $24.0 | 35% | AND **분기 생산보고서의 구리 생산 가이던스 하향 없음** |
| 3차 | ≤ $20.5 | 35% | 조건 없음 |
| **추격 금지선** | **> $46.0** (중립 내재가치) | — | 현재 $65.22 = **41.8% 초과 → 전 차수 미활성** |
| 호라이즌 | 36M 제안 | — | — |

**AND 조건이 붙은 차수는 가격만 닿아도 집행하지 않는다** — 조건이 미충족이면 3차까지 기다린다.

### 체결확률 (`fill_probability.py`, 1차 $27.6)

| 호라이즌 | 필요 낙폭 | fillProbability | 판정 |
|---|---:|---:|---|
| 24M | −57.7% | **24.1%** | 도구 판정 "장식 밴드" (<25%) |
| 36M | −57.7% | **41.2%** | 도달 가능 |
| 참고 | 같은 창 최대낙폭 중앙값 −28.8%(24M) / −33.8%(36M) · 역대 최악 −79.0% | | |

- 24M 기준 25% 미만 → `--low-fill-plan` 필요. 제안: **`widen-horizon`(36M)** 또는 **`catalyst-wait`**. T3라 `starter`는 허용되지 않는다.
- ⚠️ **이 베이스레이트는 독립 TECK의 10년 낙폭 기반**이다(독립 표본 약 4개). 합병 후 Anglo Teck은 철광석·다이아몬드가 섞여 변동성이 다를 수 있고, 대부분 기간의 주가가 석탄 사업을 포함한 TECK이었다 — 참고값일 뿐이다.
- 🔴 **체결확률이 낮다고 밴드를 올리지 않는다.** 내재가치는 그대로 두고 진입 방식(호라이즌)을 바꾼다.

---

## 11. 차원별 종합

| 차원 | ★ | 한 줄 |
|---|:---:|---|
| 수익성 | ★★☆☆☆ | pro forma ROE 10.55%, Anglo ROIC 하락 추세, Teck 10년 ROIC 7.0% |
| 현금흐름 | ★★☆☆☆ | 연결 FCF 약 $3.9B 플러스, 그러나 비지배지분 누수와 사이클 저점 0 근처 이력 |
| 재무건전성 | ★★★★☆ | 특별배당 포함 순부채/EBITDA 1.27x |
| 밸류에이션 | ★☆☆☆☆ | PER 25x(구리 고점 이익 기준), EV/EBITDA 8.7x+ — 동종 대비 싸지 않음 |
| 안전마진 | ★☆☆☆☆ | MOS −41.8% vs 요구 40%, 게이트 ②·③ 위반 |
| **종합** | **★★☆☆☆** | 재무는 건전하지만 가격이 내재가치의 142% |

---

## 12. 종합 결론

1. **분석 대상 문제는 해소됐다.** 09-23 thesis는 "평가 대상이 없다"고 판정했지만, 시장이 TECK을 Anglo Teck 패리티(특별배당 차감, +1.6%)로 가격을 매기고 있으므로 **Anglo Teck을 밸류에이션하면 TECK을 평가할 수 있다.** 이번 보고서가 그 값을 냈다: **중립 $46.0 / TECK 1주.**
2. **판정 자체는 기존과 같다 — 사지 않는다.** 이유가 바뀌었다: 기존 이유는 "범위 밖"이었고, 이번 이유는 **"T3 시클리컬인데 구리 고점 구간 이익에 25배를 내야 하는 가격"**이다(게이트 ②·③ 위반).
3. **기존 보고서의 스프레드 산식 오류**: 특별배당 $4.19를 빼면 "−7.7% 딜 스프레드"는 사라진다. TECK 머저 아비트라지 논거(연환산 ~11%)는 성립하지 않는다 🟡.
4. **최대 불확실성**: Anglo continuing 이익의 정상화 수준. FY2025 EPS $0.80이 일시적 저점이라면 내재가치는 올라간다. 다만 낙관 시나리오($79.4)를 써도 상방은 +21.7%에 불과하다.

> **버핏**: "훌륭한 회사를 적정한 가격에 사는 것이 적정한 회사를 훌륭한 가격에 사는 것보다 훨씬 낫다."
> — Anglo Teck은 **적정한 회사를 훌륭하지 않은 가격에** 파는 경우다. 원자재 가격이 오르면 모두가 천재가 되지만, 버핏은 가격수용자의 이익을 고점에서 자본화하지 않는다.

---

## 데이터 출처

- Yahoo Finance chart API — TECK $65.22 · AAL.L 3,979p · GBPUSD 1.3184 · HG=F $6.543 · USDCAD 1.4234 (2026-10-01~02) 🟢
- `reports/TECK/_data.md` — Teck SEC XBRL 10년 재무 (CAD) 🟢
- [Anglo American Interim Results 2026](https://www.angloamerican.com/media/press-releases/2026/30-07-2026) · [H1 2026 PDF](https://www.angloamerican.com/~/media/Files/A/Anglo-American-Group-v9/PLC/media/press-release/releases/2026pr/anglo-american-interim-results-2026.pdf)
- [Anglo American Full Year Results 2025](https://www.angloamerican.com/media/press-releases/2026/20-02-2026) · [Investegate RNS](https://www.investegate.co.uk/announcement/rns/anglo-american--aal/anglo-american-full-year-2025-results/9439268)
- [Anglo American Circular (특별배당·교환비율)](https://www.angloamerican.com/~/media/Files/A/Anglo-American-Group-v9/PLC/investors/investor-presentations/anglo-american-circular-notice-gm-2025.pdf) · [Teck 합병 발표](https://www.teck.com/news/news-releases/2025/teck-and-anglo-american-to-combine-through-merger-of-equals-to-form-a-global-critical-minerals-champion) · [Globe and Mail — 특별배당 지급 시한 조정](https://www.theglobeandmail.com/investing/markets/stocks/TECK/pressreleases/4405978/teck-refines-timing-terms-for-anglo-american-merger-and-special-dividend/)
- stockanalysis.com — [AAL 손익](https://stockanalysis.com/quote/lon/AAL/financials/) · [AAL 대차](https://stockanalysis.com/quote/lon/AAL/financials/balance-sheet/) · [AAL 현금흐름](https://stockanalysis.com/quote/lon/AAL/financials/cash-flow-statement/) · [AAL 통계](https://stockanalysis.com/quote/lon/AAL/statistics/) · [TECK 통계](https://stockanalysis.com/stocks/teck/statistics/) · FCX·SCCO·BHP·RIO·GLEN 통계 🟡
- 도구: `quality_tier.py` · `financial_rigor.py batch` · `fill_probability.py`
- 내부: [TECK-checklist-20260930.md](TECK-checklist-20260930.md) · [TECK-thesis.md](TECK-thesis.md)

<!-- discount-ledger
role: 재무·밸류에이션(버핏)
items:
  - name: 시너지 반영률 50%
    pct: 50
    reason: 회사 목표 세전 $800M 중 절반만 이익에 반영 (시너지 금액의 50%, 내재가치 전체에 대한 비율 아님) · [추정]
    overlapsWith: 리스크(리루) 역할의 통합·딜 실행 리스크 할인
  - name: 목표 PER mid-cycle 14x (현재 25x 대신)
    pct: ⬛
    reason: 구리 고점 구간 이익을 고점 배수로 자본화하지 않음. 정성 판단 · [추정]
    overlapsWith: 산업(멍거) 역할의 사이클 할인
  - name: 구리 가격 mid-cycle 기준 (현물 $6.54 미사용)
    pct: ⬛
    reason: 현물가 대신 TTM 실현가 수준을 기준 이익으로 사용 · [추정]
    overlapsWith: 산업(멍거) 역할의 구리 가격 가정
  - name: 요구 안전마진 (T3 상단)
    pct: 40
    reason: quality_tier.py T3 판정 + 조정 요인 3개 모두 빡빡 쪽 · 티어는 [사실] 기반, 상단 선택은 [의견]
    overlapsWith: 리스크(리루) 역할의 하방 할인 — 시나리오 비관(−10%/9x)과 이중 차감 여부 Team Lead 점검 필요
  - name: 딜 리스크
    pct: 0
    reason: 시장 스프레드(특별배당 차감 시 +1.6%)가 딜 성사를 확정으로 가격 매김 → 내재가치에서 별도 차감하지 않음 · [사실]+[추정]
    overlapsWith: none
total: 40 (가격 단위 할인 기준. 시너지 50%는 이익 항목 내부 할인이라 합산하지 않음)
-->

<!-- confidence-summary
high: 13
medium: 16
low: 11
gap: 9
verdict: 보통
-->

**신뢰도 요약**: 🟢 13 · 🟡 16 · 🔴 11 · ⬛ 9.
🟢 = 주가·환율·교환비율·특별배당 구조·Teck SEC 10년 재무·Anglo underlying EBITDA/EPS(IR) · 티어 도구 판정.
🟡 = stockanalysis 단일 출처 수치(Teck TTM USD, Anglo 법정 재무, 동종 멀티플) · 특별배당 미지급 상태.
🔴 = pro forma EPS·시너지 반영률·mid-cycle PER·3시나리오 성장률·Anglo 5년 ROIC/FCF마진(사업 범위 불일치)·EV 방식 내재가치.
⬛ = Anglo 10년 축 · Teck 비지배지분 가치 · 석탄 매각 대금 수령 여부 · 애널리스트 NAV · TTM 구리 실현가 · 취득회계 후 장부가 · Teck 2차 출처 값 대조 · 스프레드 프리미엄 분해 · Anglo 특별배당 최종 조정액.
**판정은 추정치 하나에 기대지 않는다** — 이익 방식($46.0)과 EV 방식(≤$50.7)이 모두 현재가보다 22~29% 낮고, 게이트 ③은 낙관 가정을 써도 위반이다.
