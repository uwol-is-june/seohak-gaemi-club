# TSMC(TSM) 2026Q3 실적 — 멍거 관점: 경쟁 구도 해석

> 작성일 2026-11-06 · `/earnings-team` 서브보고서(멍거 · 경쟁 구도 해석자) · 자료 확보 등급 **B**(분기 주석 미발간)
> 1차 자료: `reports/TSM/_q3-2026-primary/`(Management Report·요약 재무제표·LSEG 콜 전문). 직전 판단: `reports/TSM/03-IndustryCompetition-Munger-Perspective.md`(09-23, 해자 ★5).
> 통화: TSMC는 원문 통화(NT$ 또는 US$) 그대로 쓴다. 비교용 환산은 TSMC 3Q 암묵 환율 **31.98**(NT$1,494.24B ÷ US$46.72B)을 쓰고 (추정)으로 표기한다.

## 0. 결론 먼저

| 항목 | 판정 |
|---|---|
| **경쟁 구도** | **강화** (단기 1~2년) · 장기(3~5년) 감시 항목은 **2개 늘었다** |
| **경쟁 우위 별점** | **★★★★★ (5/5)** — 09-23 ★5 유지 |
| **직전 분기(09-23) 대비 방향** | **유지~강화.** 숫자 근거는 더 강해졌다. 대신 Tesla Terafab·Intel 14A·EMIB-T·High-NA 지연이라는 "5년 뒤 청구서" 항목이 구체화됐다 |
| **해자 붕괴 신호(이번 분기)** | **약한 신호 2개, 강한 신호 0개** — ① 고객 간 웨이퍼 할당 재판매 질문(과잉 주문 징후 가능성) ② 백엔드(인터포저) 외부 조달 = TSMC 자체 병목 인정 |
| **멍거 한 줄** | 경쟁자는 지고 있다. TSMC를 죽일 수 있는 건 경쟁자가 아니라 **자기 capex 사이클**과 **고객의 수직계열화 의지**다 |

> 정정 1건(팀 리드 확인 요망): 지시문의 "R&D 1.8%"는 `fs-3Q26.txt` 레이아웃 열 어긋남 때문에 잘못 읽힌 값이다. Management Report 원문 기준 **R&D NT$88.98B(매출의 6.0%)**, **SG&A NT$27.45B(1.8%)**, 합계 OPEX 7.8%다. 🟢[사실]

---

## 1. 실적으로 읽는 경쟁 변화

### 1.1 성장률: TSMC가 업계보다 빠르게 큰다

| 지표 | 3Q26 | 비교 | 신뢰도 |
|---|---|---|---|
| TSMC 매출 YoY (US$) | **+41.2%** (US$46.72B) | — | 🟢[사실] |
| TSMC 매출 QoQ (NT$) | **+17.6%** | UMC +8.0% (같은 NT$ 기준) | 🟢[사실] / 🟡[사실] |
| TSMC FY26 USD 성장 가이던스 | **~44%** (상향) | GF 3Q +12.5% YoY · UMC +25.6% YoY | 🟢[사실] / 🟡[사실] |
| TSMC 9M26 누적 매출 | US$122.82B · GM 66.8% (9M25 59.0%) | — | 🟢[사실] |
| TSMC 3Q 점유율(Top10 파운드리 기준) | **약 76~77%** (2Q26 TrendForce 72.5%) | 비TSMC 9개사가 QoQ +5~8% 성장한다고 가정한 계산 | 🔴[추정] — TrendForce 3Q 집계는 12월 발표 예정 |

- **데이터에 따르면** TSMC는 성숙 파운드리(UMC·GF)보다 YoY 기준 2~3배 빠르다. 2Q→3Q 사이 점유율은 오르는 쪽이다(계산 근거는 추정).
- **하지만 반대로**: 성장률 격차의 대부분은 AI 가속기라는 **한 개 수요처**에서 온다. HPC 비중 57% → 68%(1년). 경쟁력이 아니라 노출이 만든 성장일 수도 있다. 이 노출은 사이클이 꺾일 때 반대로 작동한다. 🟢[사실] 비중 / [의견] 해석

### 1.2 가격결정력: 물량이 아니라 단가로 컸다

| 지표 | 수치 | 신뢰도 |
|---|---|---|
| 웨이퍼 출하 YoY / QoQ | +9.6% / +3.2% (4,476k 12인치 환산) | 🟢[사실] |
| 매출 YoY / QoQ (NT$) | +50.9% / +17.6% | 🟢[사실] |
| **웨이퍼당 매출 YoY / QoQ** | **약 +37.7% / +14.0%** (1.509÷1.096 · 1.176÷1.032) | 🟢[사실 기반 계산] |
| GF 3Q ASP YoY | +4.8% (믹스) | 🟡[사실] |
| UMC 4Q 가이던스 | USD ASP "견조(firm)" · 가동률 92% | 🟡[사실] |

- 웨이퍼당 매출 +37.7%는 노드 믹스(N3 23%→33%, N2 0%→8%)와 가격 인상이 섞인 값이다. 둘을 분리할 수 있는 자료는 없다. 경쟁 구도에서 핵심은 **고객이 이 단가를 받아들이고도 캐파가 부족하다는 점**이다.
- 콜에서 가격 인상 보도를 직접 물었을 때 CEO는 부인하지 않았다. 가격 전략은 "전략적"이며 미국 생산분은 대만과 다르게 매긴다고 답했다(§3). 🟢[사실 — 발언] / 가격 인상 규모 ⬛[데이터부족]
- **하지만 반대로**: 웨이퍼당 매출 증가가 전부 가격이라면 고객(Nvidia·AMD·하이퍼스케일러)의 이중 조달 유인이 그만큼 커진다. 비싼 독점은 대체재 개발 보조금이다(§5).

### 1.3 GM 66.4%: 경쟁 압력인가, 자기 비용인가

| 해석 | 증거 | 반증 | 판정 |
|---|---|---|---|
| **회사 설명: N2 램프 희석 + 해외팹 비용** | 2Q 67.7% → 3Q 66.4% → 4Q 가이던스 중간값 66%. 경영진이 두 요인을 명시. 해외팹 희석 FY26 ~2% → "향후 수년 3~4%" | 희석 규모를 노드별로 분해한 숫자가 없다(주석 미발간) | 🟢[사실] 발언 · **채택** |
| 경쟁 압력(가격 인하) | 없음 | 웨이퍼당 매출 +14% QoQ. 가격은 오르고 있다. 경쟁사 중 N2·N3를 같은 수율로 공급하는 곳 없음. CEO "수요가 공급을 훨씬 웃돈다" | **기각** |
| 정치적 비용(해외팹) | 해외팹 희석 3~4%p는 고객과 미국 정부가 요구한 공급망 분산의 대가다 | 비용을 가격으로 넘긴다는 신호(미국 가격 차등) | [의견] 경쟁이 아니라 **지정학 세금** |

**판정**: GM 하락은 경쟁 압력의 신호가 아니다. 데이터가 가리키는 원인은 선단 노드 신규 램프(경쟁 우위를 늘리는 투자)와 해외팹(지정학 세금)이다. 다만 해외팹 희석 3~4%p는 **영구적일 가능성이 높다**(추정). "GM 67%대"를 앞으로의 기준선으로 쓰면 안 된다. 🟡[추정]

### 1.4 R&D·OPEX·capex 강도

| 지표 | 3Q26 | 3Q25 | 의미 | 신뢰도 |
|---|---|---|---|---|
| R&D | NT$88.98B (6.0%) | NT$63.74B (6.4%) | 절대액 +39.6% YoY. 매출보다 느려 비율은 하락 | 🟢[사실] |
| SG&A | NT$27.45B (1.8%) | NT$24.02B (2.4%) | 판매 비용이 거의 안 드는 사업 — 고객이 줄을 선다 | 🟢[사실] |
| OPEX 합계 | 7.8% | 8.9% | 영업 레버리지 | 🟢[사실] |
| capex | US$13.8B (매출의 29.5%) | — | FY26 US$60~64B ÷ FY26E 매출 약 US$176B(9M 실적 + 4Q 가이던스 중간값) ≈ **34~36%** | 🟢[사실] / 🟡[추정] 비율 |

- R&D 분기 약 US$2.8B(추정 환산)는 Intel 전사 비GAAP R&D+MG&A US$4.1B(제품 사업 포함)와 비교된다. TSMC는 R&D 전액을 제조 공정에 쓴다. 공정 R&D 절대액에서 TSMC가 앞서 있을 가능성이 높다(추정). 🟡[추정]
- capex 34~36%는 경쟁사가 따라올 수 없는 **진입 장벽의 연간 갱신료**다. 동시에 업계 역사상 과잉투자 사이클의 전형적 모습이기도 하다(§5).

---

## 2. 동기간 경쟁사 비교표

| 회사 | 3Q26 매출 | 성장 | 이익률 | 선단 노드 진척 | 신뢰도 |
|---|---|---|---|---|---|
| **TSMC** | **US$46.72B** | +41.2% YoY (USD) | GM 66.4% · OM 58.7% | N2 매출 8%, 2027 캐파 2배+ · A14 리스크 2027 / 양산 2028 · CoWoS 5x 레티클 양산 | 🟢[사실] |
| **Intel Foundry** | US$6.697B (대부분 내부 거래) | +58% YoY | **영업손실 US$1.853B (−27.7%)** · 3Q25 −US$2.321B | 14A PDK 0.9 배포(10월) · 14A 양산 2H28 목표 · ASML과 High-NA 협력 · Lens Technology 유리기판 패키징 협력 | 🟢[사실] 8-K 원문 |
| └ Intel Foundry **외부** 매출 | **약 US$0.4B** (Foundry 매출 − 부문 간 제거 US$6.291B) | 3Q25 ≈ US$0.0B | — | 외부 고객: Tesla(Terafab) 14A 채택은 Musk 발언 보도 · Apple 18A-P 검토는 보도 수준 | 🟡[추정] 계산 · 🔴[주장] 고객 |
| Intel 전사 | US$16.5B | +21% YoY | 비GAAP GM 44.1% | 4Q 가이던스 US$15~16B(QoQ 감소) · PC 둔화 1H27까지 · US$23B 유상증자 | 🟢[사실] |
| **Samsung Foundry** | 미공시(부문 분리 없음) | 2Q→3Q "매출·수익성 크게 개선" | 흑자 전환 여부 미확인 | 2nm 수주 올해 전년 대비 2배+(CSP·AI/HPC, 고객명 미공개) · Exynos 2700(SF2 2세대) 4Q 양산 · Taylor 1팹 가동 시작 · 2027 HPC 비중 50%+ 목표 · 2nm 수율은 "안정화 계획"(수치 미공개) | 🟡[사실 — 콜 발언 보도] |
| **SMIC** | 3Q 실적 검색 미확인 · 가이던스 QoQ +2~4%(약 US$3.07~3.13B) | 2Q26 QoQ +20% | 가이던스 GM 26~28% (2Q 25.3%) | 7nm DUV 멀티패터닝 · 5nm 파일럿 | 🟡[사실] 가이던스 |
| **UMC** | NT$74.24B (약 US$2.32B, 추정 환산) | +8.0% QoQ · +25.6% YoY | GM 34.0% (2Q 32.5%) · 가동률 92% | 22nm 비중 18.3% · 선단 경쟁 없음 | 🟡[사실] |
| **GlobalFoundries** | US$1.899B | +12.5% YoY | 비IFRS GM 31.4%(사상 최고) · GAAP 순손실 US$270M | 선단 경쟁 포기 · **TSMC에 실리콘 인터포저 공급** | 🟡[사실] |
| ASML (장비) | €11.66B | +55.2% YoY | GM 57.5% | 2027·2028 수요를 공급이 다 못 채운다 · 2027 Low-NA EUV·DUV 캐파 +30% 계획 | 🟡[사실 — 2차 분석 경유] |
| AMD (고객) | US$13.4B | DC US$8.5B **+97%** | — | 4Q 가이던스 약 US$17B(+66% YoY) | 🟢[사실] AMD IR |

**누가 이기고 지고 있나**

1. **TSMC — 이기고 있다.** 매출이 Intel Foundry 외부 매출의 약 100배다(추정). 2위권 전체를 합쳐도 TSMC 한 분기 매출의 4분의 1이 안 된다(추정, 삼성 미공시 감안). 🟡[추정]
2. **Intel Foundry — 손실은 줄지만 외부 시장에선 아직 없다.** 영업손실이 US$2.32B → US$1.85B로 줄었다. 그러나 매출 대부분은 Intel 제품 부문의 내부 주문이다. 14A는 PDK 0.9 단계다. 외부 고객 양산 매출은 2028년 이후다. 🟢[사실] / [의견]
3. **Samsung Foundry — 처음으로 방향이 개선됐다.** 2nm 수주 2배, Taylor 가동, HBM4 베이스 다이(메모리 자사 수요). 09-23 판단보다 한 단계 나아졌다. 단 고객명·수율·이익 숫자가 하나도 공개되지 않았다. 발표와 딜리버리의 간극이라는 기존 패턴을 깰 증거는 아직 없다. 🟡[사실] / [의견]
4. **SMIC·UMC·GF — 다른 리그.** 성숙 노드는 가동률 90%대, ASP 견조로 업황이 좋다. TSMC 매출 중 16nm 이상 비중은 21%이고 계속 줄어든다(3Q25 26%). 경쟁 압력이 있는 영역에서 TSMC가 빠져나가는 중이다. 🟢[사실] 비중
5. **GF는 경쟁자에서 협력사로 바뀌었다.** TSMC가 인터포저를 GF에서 조달한다. 성숙 파운드리가 TSMC 선단 생태계의 하청으로 편입되는 구도다. [의견]

---

## 3. 경영진 경쟁 언급 해석 (인용은 `transcript-3Q26.txt` 원문)

| 주제 | 발언 (원문) | 해석 | 어조 |
|---|---|---|---|
| CoWoS 우위 | "we are in the real world production of 5x reticle size. I don't believe that anybody can do that today, except the TSMC." | 오늘 기준 패키징 독점 주장. 동시에 "As time goes by, yes, our competitors offer a very competitive solution."이라고 처음으로 경쟁 솔루션을 인정했다 | **자신감 + 경계** |
| 고객 이탈 대비 | EMIB-T 고객이 물량을 못 받으면 백업이 되겠느냐는 질문에 "I try to avoid to answer it directly ... that gives you enough hint." | 사실상 "그렇다". EMIB-T로 간 고객도 TSMC가 받아줄 수 있다는 뜻이다. 대체재의 실패 위험을 TSMC가 흡수하는 구조라 고객 이탈 비용이 낮아진다(양면적) | 자신감 |
| 점유율 의지 | "We have no intention to leave food on the table for others, and we want to capture every piece of business possible." (CEO) · CFO도 반복 | 역대 원칙("목표 캐파 도달 노드에 추가 증설 안 함")을 깨고 N3 신규 팹 3개를 추가했다. 경쟁자에게 넘칠 물량(spill-over)을 차단하려는 증설이다 | **공격적** |
| High-NA 지연 | "Whether that our technology because we are using is later than our competitor, so a disadvantage to TSMC? No" · 2030 도입 근거는 "best maturity"와 "reasonable cost" | 2010년대 EUV 때 TSMC가 성숙도를 기다려 Intel을 추월한 전례와 같은 논리. 반대로 High-NA가 A10 이후 필수가 되면 Intel이 장비 학습곡선에서 수년 앞선다 | 자신감(방어적 질문에 대한) |
| Intel IDM 인소싱 | "we treat every customer fairly ... we take into consideration of their internal capacity" · "I don't comment on a specific customer" | Intel의 인소싱 확대 여부에 답을 피했다. 이미 반영했다는 말만 했다. 정보 없음 = 판단 보류 | 중립(회피) |
| A14 > N2 | "in our A14, we have seen more and more customers actually higher than the 2-nanometer activities so far" | 2028년 노드에서도 고객 관여도가 N2를 넘는다. Intel 14A와 같은 시기 노드인데 고객 수에서 TSMC가 앞선다는 주장 | 자신감 |
| GF 인터포저 | "Definitely, we have a little bit shortage on the back end" | **TSMC 스스로 병목을 인정했다.** 병목은 해자이자 대체재가 태어나는 틈이다. EMIB-T 수요가 생기는 이유가 바로 이것이다 | **솔직(약점 인정)** |
| 웨이퍼 할당 재판매 | "we do not allow our customers to sublet or auction off the capacity ... the amount is very, very small." | 고객 간 할당 전매 질문이 나왔다는 자체가 일부 고객이 할당을 다 못 쓴다는 신호일 수 있다(추정). 규모는 "매우 작다" | 단호 |
| Terafab | "we discussed with them to see whether that we can be utilizing that actual capacity also ... the fab got to be run by TSMC." | 고객(Tesla)이 자기 팹을 짓고 Intel 14A와 TSMC 둘 다와 협상한다. TSMC는 운영권을 조건으로 건다 | 원칙 고수 |
| 수익성 | "there is no ceiling for TSMC's profitability, but a dramatic increase will not happen overnight either." | 가격 인상을 계속하되 고객을 압박하지 않겠다는 신호 | 자신감 |
| 소비자 수요 | "consumer and price-sensitive end market segments are being challenged due to the impact of rising component prices" | 메모리 가격 급등이 스마트폰·PC 수요를 누른다. Intel(PC 둔화 1H27까지)·SMIC CEO(메모리 가격 경고 보도)와 같은 방향 | **신중** |

**어조 종합**: 선단 로직과 AI 수요에 대해서는 이번 분기가 역대 콜 중 가장 공격적인 축에 든다("food on the table" 2회, N3 증설 원칙 파기). 불안의 흔적은 세 곳에 있다. ① 패키징 경쟁 솔루션 인정 ② 백엔드 부족 인정 ③ 소비자 부문 신중론. 앞의 둘은 경쟁 구도 관련이고, 셋째는 수요 사이클 관련이다. [의견]

---

## 4. 업계 트렌드와 경쟁 구도 영향

| 트렌드 | 이번 분기 증거 | TSMC 경쟁 구도 영향 | 신뢰도 |
|---|---|---|---|
| 에이전틱 AI CPU | CEO "demand from agent AI CPU continue to increase" · Intel "extraordinary demand for our Xeon" · Intel DCAI +78% | **양면.** CPU 수요는 Intel 자체 팹(Intel 3/18A)으로 흡수될 수 있는 첫 AI 수요다. AMD EPYC(TSMC)·Arm 서버 CPU(TSMC)와의 경쟁에서 Intel이 이기면 그만큼은 TSMC 밖이다. 다만 Intel도 일부 타일은 TSMC에 맡긴다 | 🟢[사실] 발언 / [의견] |
| 오픈소스 모델 | CEO가 AI 사용 장벽을 낮춰 실리콘 수요를 늘린다고 언급 | 수요 저변 확대. 경쟁 구도와는 중립 | 🟢[사실] 발언 |
| 전력 제약 | TSMC가 직접 미국 데이터센터·전력 현장 실사 — "so far so good" | 전력이 병목이면 와트당 성능이 경쟁 축이 된다. 선단 노드(N2·A16 SPR)에 유리하다(추정). CEO는 전력 때문에 후면전력 채택이 늘지는 않는다고 답했다 | 🟢[사실] 발언 / 🟡[추정] |
| 미국 중간선거(11-04) 후 데이터센터 규제 공포 | 11-05 TSM −10.78%, SOX −12.25%. 구체 법안 0건 | **경쟁 구도가 아니라 수요 총량 리스크.** 규제가 오면 전 파운드리가 같이 맞는다. 상대 지위는 불변, 절대 이익만 바뀐다 | 🟢[사실] 주가 / 🟡[주장] 규제 경로 |
| 미국 팹 확장(아리조나·텍사스·Terafab) | 아리조나 2팹 양산 3Q27(앞당김) · 텍사스 평가 · Terafab 협의 | 미국 내 Intel·Samsung(Taylor)의 "현지 생산" 차별점을 지운다. 대가는 GM 3~4%p | 🟢[사실] |
| 관세·232조 | 이번 기간 신규 조치 미확인. 대만-미국 협정(2026-02) 체계 유지(뉴스펄스 기준) | 현재 중립. 해외팹 증설이 관세 방패 역할 | 🟡[사실] |
| 대만의 대중 AI칩 수출 통제(10-16 보도) | TSMC 중국 매출 비중 **8%(3Q25) → 6% → 5%** | 중국 매출이 줄수록 SMIC의 중국 내수 독점이 굳는다. TSMC 선단 고객층에는 영향 없음. 북미 비중 79%로 상승 — 지정학적 고객 집중 | 🟢[사실] 비중 / 🟡[사실] 통제 보도(헤드라인) |
| 메모리 가격 급등 | TSMC 스마트폰 비중 30% → 21%(1년), Intel PC 둔화 | 소비자 로직 수요를 메모리가 잠식. Samsung은 메모리 이익으로 파운드리 적자를 버틸 체력이 생긴다(추정) — **삼성 추격 자금줄** | 🟢[사실] 비중 / [추정] |
| 장비 공급 부족·가격 인상 | TSMC "tool supply is tight" · "tool price inflation is real" · ASML 2027~28 공급 부족 | 장비가 한정되면 최대 구매자(TSMC)가 먼저 받는다(추정). 후발 주자의 증설 속도를 제한하는 장벽 | 🟢[사실] 발언 / 🟡[추정] |

---

## 5. 멍거식 역발상 — "어디서 죽을지 알면 그곳에 가지 않는다"

### 5.1 인버전: TSMC를 죽일 수 있는 것과 이번 분기 신호

| 사망 경로 | 이번 분기 신호 | 강도 | 근거 |
|---|---|---|---|
| ① 지정학(양안·봉쇄) | 새 사건 없음. 대만이 대중 통제를 미국과 맞춤 = 미국 진영 결속 강화 | 신호 없음 | 🟡[사실] |
| ② 고객 인소싱·수직계열화 | Tesla Terafab(자체 팹 + Intel 14A + TSMC 협의) · Intel IDM이 Xeon 공급 확대에 자금 투입(US$23B 증자) · Google TPU 9세대 EMIB-T 채택 보도 | **약함~중간** — 전부 2028년 이후 물량. 오늘 매출 영향 0 | 🔴[주장] Google·Tesla 보도 / 🟢[사실] Intel 증자 |
| ③ AI capex 붕괴 | 반대 신호: AMD DC +97%, TSMC "demand far above supply", ASML 2027~28 공급 부족. 경고 신호: 고객 간 할당 전매 질문, 소비자 부문 신중론, 선거 후 규제 공포 | **약함** (현재) · **잠복** (구조) | 🟢[사실] |
| ④ 대체 패키징 | CEO가 경쟁 솔루션을 "very competitive"라고 처음 인정 · TSMC 백엔드 부족 인정 · EMIB-T 원가가 CoWoS의 수분의 1이라는 분석 | **중간** — 이번 분기 가장 새로운 신호 | 🟢[사실] 발언 / 🟡[주장] 원가 분석 |
| ⑤ 경쟁사 선단 추격 | Samsung 2nm 수주 2배(고객명 없음) · Intel 14A PDK 0.9 · High-NA 4년 선행 | **약함** — 매출 격차가 너무 크다 | 🟡[사실] |
| ⑥ **자기 capex 과잉** | 2026~28 capex 과거 3년보다 "significantly higher" · 전 세계 팹 약 20개 동시 진행 · N3 증설 원칙 파기 · 해외팹 희석 3~4%p | **잠복** — 오늘은 수요가 받쳐준다 | 🟢[사실] |

**역발상 핵심**: 경쟁자로 TSMC를 죽이는 경로(⑤)는 이번 분기에 더 멀어졌다. 가까워진 것은 ②·④·⑥이다. 셋 다 TSMC가 너무 잘해서 생기는 반작용이다.
- ② 비싸고 부족하니 고객이 자기 팹(Terafab)과 제2공급처(Intel)를 키운다.
- ④ CoWoS가 부족하니 EMIB-T가 시장을 얻는다.
- ⑥ 수요가 넘치니 원칙을 깨고 증설한다. 반도체 역사에서 이 국면 다음에는 대개 과잉 공급이 왔다.

멍거라면 "인센티브를 보라"고 할 것이다. 지금 업계의 모든 참여자 — 고객·미국 정부·Intel·Samsung·Tesla — 가 **TSMC 의존을 줄이는 쪽**으로 돈을 쓰고 있다. 이 인센티브는 이번 분기에 더 강해졌다. 결과가 매출에 나타나는 시점이 2028~2030년이다. [의견]

**하지만 반대로**: 같은 그림이 2018~2022년에도 있었다(Intel IDM 2.0, Samsung 3nm GAA 선행, 미국 CHIPS법). 그 기간 TSMC 점유율은 오히려 올랐다. 인센티브가 있어도 실행력이 없으면 결과는 오지 않는다. 그리고 이번에 대체재를 키우는 고객들(Google·Tesla)조차 오늘 물량은 TSMC에 맡기고 있다. 🟡[사실] 역사 / [의견]

### 5.2 5년 뒤에 이 분기는 전환점일까

| 시나리오 | 2031년에 돌아볼 때 | 확률(주관) |
|---|---|---|
| A. 해자 확대 지속 | "AI 2차 확장기의 한가운데. A14가 N2보다 큰 노드가 됐다" | 약 60% [추정] |
| B. 부분 잠식 | "High-NA를 늦춘 결정과 패키징 병목이 Intel 14A·EMIB-T에 첫 고객을 줬다. 이 분기가 독점의 정점이었다" | 약 30% [추정] |
| C. 사이클 전환 | "선거 후 규제·소비자 부진·과잉 증설이 겹치기 시작한 첫 분기" | 약 10% [추정] |

- 이 분기가 전환점 후보인 근거는 숫자가 아니라 **결정**이다. ① High-NA 2030 확정 ② N3 증설 원칙 파기 ③ 백엔드 외부 조달 ④ Terafab 협의. 어느 결정도 오늘 실적을 바꾸지 않는다. 5년 뒤 경쟁 구도는 바꿀 수 있다. [의견]
- 확률은 근거가 약한 주관값이다. 수치보다 순서(A > B > C)만 의미가 있다.

---

## 6. 판정

| 질문 | 답 |
|---|---|
| 경쟁 구도 | **강화** — 점유율 상승(추정), 가격결정력 확인(웨이퍼당 매출 +37.7% YoY), 경쟁사 실적은 TSMC와 다른 리그 |
| 경쟁 우위 | **★★★★★ (5/5)** |
| 직전 분기 대비 | **유지~강화** (★5 → ★5). 감시 항목 +2: 대체 패키징(EMIB-T), 고객 수직계열화(Terafab) |
| 논제 영향 | 가정 "선단 노드 점유율 90%+"·"CoWoS 이중 병목" 유지. 레드라인 발동 0건. 새 레드라인 후보 제안: **"Top 5 고객 중 1곳 이상이 선단 로직 또는 CoWoS급 패키징 물량의 20%+를 타사 양산으로 이전 확인"** [의견] |
| 다음 분기 확인 항목 | ① TrendForce 3Q26 점유율(12월) ② Samsung 2nm 고객명·수율 수치 ③ Intel 외부 Foundry 매출(부문 간 제거 차이) ④ Google TPU 9세대 패키징 실제 공급처 ⑤ 4Q GM이 65% 하단을 지키는지 ⑥ 2027 capex 숫자(1월) |

### 멍거 어록으로 본 이번 분기

> "Invert, always invert." — TSMC를 죽일 경로를 거꾸로 그려보면, 경쟁자가 아니라 **고객과 자기 자신**이 나온다.

> "Show me the incentive and I will show you the outcome." — 업계 전체의 인센티브가 TSMC 의존 축소를 향한다. 결과가 나오기까지 시간이 걸릴 뿐이다.

> "All I want to know is where I'm going to die, so I'll never go there." — TSMC가 갈 수 있는 죽음의 장소는 반도체 역사가 이미 보여줬다. 수요 정점에서 원칙을 깨고 증설하는 곳이다. 이번 분기 TSMC는 N3에서 그 원칙을 깼다. 수요가 받쳐주는 동안은 옳은 결정이다. 매 분기 확인해야 할 이유이기도 하다.

**멍거식 총평**: 이번 분기에 경쟁자는 TSMC 근처에도 오지 못했다. Intel Foundry 외부 매출은 TSMC의 1%가 안 되고(추정), Samsung은 숫자를 공개하지 않았으며, 성숙 파운드리는 TSMC의 하청으로 들어왔다. 해자는 넓어졌다. 그러나 해자가 넓을수록 성 밖에서 다리를 놓으려는 사람도 많아진다. Tesla·Google·Intel·미국 정부가 지금 그 다리를 놓고 있다. 다리가 완성되는 시점은 2028년 이후다. 오늘의 ★5는 정당하다. 5년 뒤의 ★5는 이번 분기에 내린 결정(High-NA·증설·패키징)이 옳았는지에 달려 있다. [의견]

---

## 출처

- 1차(🟢): `reports/TSM/_q3-2026-primary/management-report-3Q26.txt` · `fs-3Q26.txt` · `transcript-3Q26.txt`(LSEG, 2026-10-15) · [SEC 6-K 3Q26](https://www.sec.gov/Archives/edgar/data/0001046179/000104617926000726/a3q26e_withguidancexfinal.htm)
- Intel 3Q26 8-K 원문(🟢): [intc.com 8-K 2026-10-29](https://www.intc.com/filings-reports/all-sec-filings/content/0000050863-26-000188/0000050863-26-000188.pdf)
- Samsung 3Q26 파운드리 콜 발언(🟡): [헤럴드경제 2026-10-29](https://mbiz.heraldcorp.com/article/10918885)
- UMC 3Q26(🟡): [BusinessWire/FinancialContent 2026-10-28](https://www.financialcontent.com/article/bizwire-2026-10-28-umc-reports-third-quarter-2026-results)
- GlobalFoundries 3Q26(🟡, 검색 경유): [SEC 6-K](https://www.sec.gov/Archives/edgar/data/0001709048/000170904826000259/globalfoundries3q2026earni.htm)
- SMIC 3Q26 가이던스(🟡): [HKEX 2026-08-13](https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0813/2026081300353.pdf)
- ASML 3Q26(🟡, 2차 분석): [beancount.io 2026-10-20](https://beancount.io/de/blog/2026/10/20/asml-fy2026-q3-earnings-analysis)
- Tesla 14A·EMIB-T 고객 보도(🔴): [PC Gamer](https://www.pcgamer.com/hardware/processors/tesla-to-use-intel-14a-for-ai-chips-as-musk-says-it-will-be-ready-for-prime-time-when-the-multi-billion-dollar-terafab-project-scales-up/) · [Tom's Hardware EMIB-T](https://www.tomshardware.com/tech-industry/semiconductors/intels-emib-t-heads-for-fab-rollout-this-year) · [io-fund](https://io-fund.com/ai-stocks/intel-vs-tsmc-cowos-constraints-intel-foundry)
- 대만 대중 AI칩 통제(🟡): [TrendForce](https://www.trendforce.com/news/?p=58987) · [Tom's Hardware](https://www.tomshardware.com/tech-industry/taiwan-weighs-criminal-ban-on-ai-chip-exports-to-all-of-china-as-us-trade-talks-continue) · FinalReport 인용 Bloomberg 10-16 헤드라인
- AMD 3Q26·선거 후 주가: `reports/TSM/TSM-news-20261106.md`(AMD IR 원문 인용)

## 데이터 공백

1. ⬛ TrendForce 3Q26 파운드리 점유율(12월 발표 전) — 본문 76~77%는 계산 추정
2. ⬛ Samsung Foundry 3Q26 매출·영업손익·2nm 수율 수치, 고객명
3. ⬛ SMIC 3Q26 실제 실적(검색 미확인)
4. ⬛ TSMC 가격 인상 규모와 노드 믹스 효과의 분리
5. ⬛ Intel·Samsung 3Q26 capex(동기간 비교 불가)
6. ⬛ 10-16 대만 대중 AI칩 통제의 확정 문안(헤드라인만 확인)

<!-- confidence-summary
high: 37
medium: 32
low: 6
gap: 7
verdict: 보통
-->

**verdict 근거**: TSMC 자체 수치와 Intel 8-K는 원문(🟢)이다. 경쟁사 비교의 나머지(Samsung·UMC·GF·SMIC·ASML)는 검색 경유라 🟡 상한이다. 고객 이탈 관련 보도(Tesla 14A·Google EMIB-T)는 🔴다. 점유율 추정과 Samsung 수치는 공백이다. 경쟁 구도 판정(강화)의 근거는 🟢 원문에 기대고, 장기 감시 항목은 🟡·🔴에 기댄다.
