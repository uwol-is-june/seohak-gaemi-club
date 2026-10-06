# SpaceX (SPCX) — 투자 리스크 및 경영진 자질 평가 (리루 관점)

**작성일**: 2026-10-06 · **역할**: risk-assessor (리루 / Li Lu) · **기준 주가**: $171.09 (10-05 종가) · 시총 $2.32T
**정보 풍부도**: B등급 (2026-06-12 상장, 10-K 없음 · 10-Q 1회 · 실적 콜 1회)
**원자료**: `reports/SPCX/_data.md`(재무·세그먼트·사건) · `SPCX-news-20261006.md` · `SPCX-news-20260810.md` · `SPCX-checklist-20261006.md` + 이번 추가 조사(S-1 리스크 팩터, Q2 콜 전문, 10-Q 해설, 지배구조 보도)

> 리루: "투자에서 진짜 위험은 주가 변동이 아니라 **원금의 영구적 손실**이다."
> 이 보고서는 SpaceX가 좋은 회사인지가 아니라, **어떤 경로로 주주 자본이 영구히 훼손될 수 있는지**를 묻는다.

### 신뢰도 표기
🟢 원문·2개 이상 독립 출처 · 🟡 단일/2차 출처 또는 계보 겹침 · 🔴 추정·단일 주장 · ⬛ 데이터 없음
`[사실]` 공시·확정 보도 · `[추정]` 계산·추론 · `[주장]` 경영진 발언·소송·공매도측 등 미검증 주장 · `[의견]` 본 보고서의 판단

---

## 0. 한 줄 결론

> **사업 핵심(Starlink·발사)은 리루가 찾는 "해자 있는 독점적 사업"에 가깝지만, 그 현금흐름을 쓰는 사람(Musk 1인)의 자본 배분을 소수주주가 견제할 수단이 0에 가깝고, 그 자본이 지금 검증 안 된 AI capex(연 $65B 페이스)로 흘러가고 있다.** 리스크 관점 종합 ★★☆☆☆, 논제 건강도 **5/10**. 영구 손실 경로의 1순위는 Starship 실패가 아니라 **AI 자본 배분과 지배구조의 결합**이다. `[의견]`

---

## 1. 경영진 평가

### 1.1 인물별 역량·신뢰성

| 인물 | 역할 | 역량 범위 (증거) | 신뢰성 (약속 vs 실행) | 평가 |
|------|------|------|------|------|
| **Elon Musk** | CEO · CTO · 이사회 의장 | 엔지니어링·제품 비전 최상급: 재사용 로켓 상용화, Starlink 누적 ~1,200만 가입자(Q2) 🟢`[사실]`. 9-28 Starship Flight 14 첫 궤도 도달 🟢`[사실]` | **일정 약속은 상습적으로 늦는다.** Artemis III 착륙선(HLS)은 당초 2025 → 지연, NASA가 2025-10 계약 재개방 검토 🟢`[사실]`([Satellite Today](https://www.satellitetoday.com/government-military/2025/10/20/nasa-acting-admin-duffy-says-spacex-is-delayed-on-moon-lander/)). Flight 13(7-16) 점화 후 abort 🟡. Q2 콜: "1년 뒤 하루 1회 이상 Starship 비행" 🟡`[주장]` · AI 전력 "20GW 훨씬 초과 목표, 15GW 정도는 달성할 듯" 🟡`[주장]`([Webull 전문](https://www.webull.com/news/15387111038133248)) | 역량 ★5 / 일정 신뢰성 ★2 |
| **Gwynne Shotwell** | 사장 · COO | 상업·정부 영업과 운영 실행의 실질 책임자. Q2 미국 정부 계약 $6B+ 수주 발언 🟡`[주장]`, NSSL Phase 3 $1.6B(7월) 🟢`[사실]`. EchoStar 65MHz FCC 승인 확보 🟢`[사실]` | 발사 운영(Falcon) 실행력은 업계 최상위 🟢. 콜에서 "Artemis III 내년, 2028 유인 달 착륙" 🟡`[주장]` — HLS 이력상 지연 가능성 높음 `[의견]` | 역량 ★5 / 신뢰성 ★4 |
| **Bret Johnsen** | CFO | IPO($135 · 638.9M주 · 순조달 ~$85.7B 🟡) + $25B 투자등급 회사채(가중평균 5.855% · 평균만기 11.7년) 🟡 집행 | **"컴퓨트 신규 투자 회수기간 1년 미만", "capex는 다 같지 않다 — 사실상 COGS처럼 움직인다"** 🟡`[주장]`([implicator](https://www.implicator.ai/spacex-capital-spending-18-billion-debut-quarter/) · Webull 전문). **검증 데이터 없음** — AI 세그먼트 Q2 영업손실 −$1.26B 🟡. "향후 2개 분기 capex는 Q2와 비슷" 🟡 | 역량 ★4 / 주장 검증 ⬛ |

> ⚠️ IPO 순조달액 출처 충돌: 10-Q 해설(finrep)은 **~$85.7B**, 언론 다수는 **~$75B**. stockanalysis 현금흐름표는 Q2 주식발행 $205M · 차입발행 $114.8B로 분류(분류 오류 의심 — `_data.md`). 10-Q 원문 대조 전에는 🟡. ⬛ 원문 미대조.

### 1.2 Musk의 시간 배분 — S-1이 스스로 인정한 리스크

| 항목 | 내용 | 신뢰도 |
|------|------|------|
| 겸직 | Tesla CEO, Neuralink, Boring Company, (xAI는 SpaceX에 합병), 前 트럼프 대통령 수석고문 — **S-1 리스크 팩터에 "주의력 분산"으로 명시** | 🟢`[사실]` ([Washington Technology](https://washingtontechnology.com/companies/2026/05/spacexs-biggest-risk-factor-might-be-elon-musk/413698/) · [S-1](https://www.sec.gov/Archives/edgar/data/0001181412/000162828026036936/spaceexplorationtechnologi.htm)) |
| 핵심인물 보험 | **없음** — "Musk 상실 시 경영 구조가 크게 흔들릴 수 있다" | 🟢`[사실]` (S-1 인용, 2개 매체) |
| 시간 배분 비율 | ⬛ 미공시 | ⬛ |
| 승계 계획 | ⬛ 미공시. 운영은 Shotwell이 실증, **자본 배분 결정권은 Musk 1인** | 🟡`[의견]` |

**하지만 반대로**: Musk의 주의력 분산은 2002년 이래 상수였고, 그 기간에 SpaceX는 발사 시장 지배력을 쌓았다. 운영은 Shotwell 체제로 돌아간다는 증거가 20년 치 있다. 위험은 "운영"이 아니라 "**자본 배분이 Musk 생태계 전체의 이해에 맞춰질 가능성**"이다. `[의견]`

### 1.3 자본 배분 — 의사결정 품질 검토

| 결정 | 규모 | 성격 | 검증 상태 | 평가 |
|------|------|------|------|------|
| **xAI 합병** (2026-02) | 비공개 내부거래(Musk 양측 지배) | Musk 계열 적자 AI 회사를 현금창출 Starlink와 결합 | S-1: xAI 매출 성장 22%·수십억 달러 손실(합병 전), 2025 capex의 ~60%(~$20B 🟡)가 xAI | 🔴 독립 평가 없는 관계자 거래 `[의견]` |
| **AI capex** | Q2 $18.4B 중 AI $15.8B(86%) 🟢 · 하반기 Q2 수준 유지 → **FY26 ~$65B 외삽** 🔴`[추정]`(H1 $28.5B + $18.4B×2) | 컴퓨트 임대(Google 월 ~$920M × 32개월, 추가 6개월 $6.7B 계약) | AI 세그먼트 Q2: 매출 $2.56B · adj. EBITDA +$1.1B · **영업손실 −$1.26B** 🟡 — 감가상각 반영 시 아직 적자 | 🟡 계약 매출은 실재, **회수기간 <1년 주장은 미검증** |
| **Cursor(Anysphere) $60B 전액 주식** (06-16) | 시총 대비 희석 ~2.6% 🔴`[추정]` · ARR $2.6B ≈ 23배 | 반독점 실패 시 **$4B 역해지수수료** 🟡 · 호주 경쟁당국 심사 🟡 · Musk "거의 다 됐지만 규제 종결을 앞서가면 안 된다" 🟡 | **10-06 현재 종결 여부 ⬛** | 🟡 IPO 4일 만의 고평가 주식 M&A `[의견]` |
| **Terafab** (08-06, Tesla 공동) | 1단계 $16.8B 🟢, 총 $55~119B 구상 🟡 | **Tesla와의 공동투자 = 관계자 거래.** SEC 공시상 $38B 격차 지적 🔴`[주장]`(TechTimes 단일) | 분담 비율·지배구조 ⬛ | 🔴 계열사 간 이해충돌 소지 |
| 회사채 $25B | 연이자 ~$1.46B 🔴`[추정]`(25B×5.855%) | 장기 고정금리 — 금리 리스크를 잘 관리한 결정 | 🟡 | ✅ 긍정 |
| 자사주 매입 | Q1 $4.38B · Q2 $0.54B 🟡 | 상장 전후 직원 유동성 목적 추정 | 배당 없음 🟢 | 중립 |

> 리루: "좋은 경영진의 증거는 말이 아니라 **자본을 어디에 썼고 그 결과가 무엇이었는지**의 기록이다." `[어록 취지]`
> SpaceX의 자본 배분 기록은 **발사·Starlink에서는 탁월**(재사용으로 원가 혁신 → 독점), **AI에서는 아직 기록이 없다**(합병 8개월).

**차원 결론 — 경영진 ★★★☆☆**: 운영 역량은 ★5급이나 일정 신뢰성(★2)과 AI 자본 배분의 미검증·관계자 거래 집중이 깎는다. `[의견]`

---

## 2. 규제 리스크

| 규제 축 | 현재 상태 | 위험 경로 | 확률/영향 | 신뢰도 |
|------|------|------|------|------|
| **FAA (발사 면허·mishap)** | 2026-05 Starship 부스터 분리 실패 → FAA 사고조사 요구, 종결 후 Flight 13 재개 🟡. Flight 14(9-28) 엔진 1기 조기 정지 — **mishap 조사 개시 여부 ⬛**. Boca Chica Tiered EA 결정문 미발표 🟡. Musk: 캐치 시도는 "규제 승인을 받는다면" 🟡 | 사고 → 운항 중단 수주~수개월 → V3 위성 배치 지연 → Starlink 용량·AI 우주 데이터센터 서사 지연 | 중 / 중 `[추정]` | 🟡 |
| **FCC (스펙트럼)** | EchoStar 65MHz 인수 승인(2026-05, $2.4B 에스크로 조건) 🟢. Starlink Mobile V2 위성 "내년부터" 🟡`[주장]` | 통신 3사·ASTS 측 간섭·조건 분쟁, 정권 교체 시 FCC 태도 변화 | 중 / 중 | 🟢/🟡 |
| **ITAR·수출규제** | 구체 분쟁 ⬛ (검색 범위 내 0건 — 부재 확인 아님) | 해외 Starlink·발사 고객 제약 | ⬛ | ⬛ |
| **NASA·DoD 의존 · 정치** | **미국 정부 매출 ~20%** 🟡(S-1 인용 보도) → TTM 기준 ~$4.6B 🔴`[추정]`. S-1: "미국 정부·군과 동일시돼 해외·상업 고객이 이탈할 수 있다", **Brazil 자산압류 선례 명시** 🟢`[사실]` | Musk–정권 관계 악화 시 계약·인허가 보복, 해외 정부의 Starlink 규제 | 중 / 상 `[추정]` | 🟡 |
| **셧다운** | FY27 CR로 **12-11까지** 자금 확보 🟢 | 셧다운 시 FAA 면허 업무 지연, NASA 지급 지연 | 중 / 저(일시적) | 🟢 |
| **반독점** | Cursor: 호주 심사·$4B 역해지수수료 🟡. 발사 시장 점유 지배력에 대한 DOJ/FTC 조사 ⬛ | 거래 무산 시 $4B 현금 유출 | 저~중 / 저 | 🟡 |
| **SEC** | 강제중재 허용으로 SEC 입장 전환(2025-09) 🟡. 회계: Valor 관련 AI 인프라 리스 일부 "**failed sale-leaseback**"으로 부채 계상 🟡`[사실]`([Yahoo/Reuters 계열 보도](https://finance.yahoo.com/markets/stocks/articles/spacex-reveals-musk-company-links-012411560.html) — 원문은 Reuters 기사지만 Yahoo 게재본 사용) | 관계자 리스 회계 재작성·코멘트 레터 | 저 / 중 | 🟡 |

**하지만 반대로**: SpaceX는 미국 국가안보 발사의 사실상 필수 공급자(NSSL Lane 1·Phase 3)다. 정치 보복의 상한은 "대체 불가능성"이 막는다 — 대체재(ULA·Blue Origin·RKLB Neutron)가 아직 물량을 못 받는다. `[의견]`

**차원 결론 — 규제 ★★★☆☆**: 개별 규제는 관리 가능하나, **정치 리스크가 Musk 개인 행동에 연동**된다는 점이 구조적 꼬리위험이다.

---

## 3. 경쟁 리스크 (간략 — 상세는 멍거 역할)

| 경쟁자 | 영역 | 위협 수준 | 근거 |
|------|------|------|------|
| Amazon Leo(Kuiper) | 위성 인터넷 | 중 (중기) | 자본력 무제한, 서비스 개시 미정 🟡 · Globalstar 인수 🟡 |
| AST SpaceMobile | D2D(휴대폰 직결) | 중 | BlueBird 11~13 발사, ~200Mbps 🟢 — Starlink Mobile과 정면 충돌 |
| Blue Origin | 발사·HLS 대체 | 저~중 | NASA HLS 재경쟁 검토 수혜자 후보 🟡 |
| Rocket Lab | 중형 발사·국방 | 저 | Iridium 인수·$397M 우주군 수주 🟡 — 국방부 공급처 분산 수혜 |
| 중국(Guowang·Qianfan) | 해외 위성 인터넷 | 중 (해외 시장) | ⬛ 정량 데이터 없음 |
| **하이퍼스케일러·AI 랩** | AI 컴퓨트·모델 | **상** | Google은 고객이자 경쟁자. xAI는 OpenAI·Google·Anthropic·Meta 대비 자본·고객 기반 열세 `[의견]` |

**차원 결론 — 경쟁 ★★★★☆**: 우주(발사·Starlink)는 위협 낮음. **위협은 AI 쪽에 집중** — 회사가 자본을 가장 많이 쏟는 곳이 경쟁이 가장 치열한 곳이다.

---

## 4. 사업 리스크

### 4.1 AI 부문 — "자본 블랙홀"인가

| 지표 (Q2 2026) | 값 | 신뢰도 |
|------|------|------|
| AI 세그먼트 매출 | $2.56B (+247%) | 🟡 |
| AI adj. EBITDA | +$1.1B (첫 흑자) | 🟡 |
| **AI 세그먼트 영업손실** | **−$1.26B** (영업이익률 −49%) | 🟡 (10-Q 해설, 세그먼트 합 −$143M ≈ 연결 −$141M로 정합) |
| AI capex | $15.8B (분기) | 🟢 |
| AI 매출 / AI capex | **0.16x** | 🔴`[추정]` |
| 연결 OCF / capex | 2,419 / 18,382 = **13%** | 🟡`[추정]` |
| Google 계약 | 월 ~$920M × 32개월 ≈ $29B 총액, 10월 인식 개시 | 🟢 |
| 추가 클라우드 계약 | $6.7B / 6개월 (Q3 초) | 🟡`[주장]` CFO |

- **증거(블랙홀 아님 쪽)**: 계약 매출이 실재하고(Google ~$29B·$6.7B), adj. EBITDA가 첫 흑자. CFO는 회수기간 <1년 주장. 🟡
- **증거(블랙홀 쪽)**: 감가상각 후 영업손실 −$1.26B. 분기 capex $15.8B 대비 분기 매출 $2.6B. **"회수기간 <1년"이 맞다면 연환산 AI 매출이 capex에 근접해야 하는데 현재 0.16x** 🔴`[추정]` — 다만 신규 capex의 매출화 시차(설치→가동)가 있어 결정적 반증은 아니다.
- **판정**: 🔴 **미정 — Q3·Q4 두 분기가 필요하다.** `[의견]`

### 4.2 감가상각 부담

- 서버·GPU 내용연수 ⬛ (10-Q 해설에 구체 내용연수 없음). Starlink 위성 설계수명 ⬛(원문 미확인).
- 연 $65B 페이스 capex 중 AI 장비 비중 86% → GPU 내용연수가 짧을수록 감가상각이 매출 증가를 상쇄. **CFO가 "COGS처럼 움직인다"고 말한 것은 사실상 단기 상각을 시인한 것**으로 읽을 수 있다 `[의견]`.
- 관계자 Valor AI 인프라 리스 의무 **$20B+**, 일부 부채 계상 🟡 — 표면 차입금($38.4B~$39.7B) 외 유사부채.

### 4.3 Starship 실패 리스크

| 시나리오 | 영향 경로 | 평가 |
|------|------|------|
| 반복 실패(1년+ 지연) | V3 위성 배치 지연 → Starlink 용량·D2D 지연 / HLS 계약 일부 상실 / 우주 데이터센터 서사 붕괴 | 시총에 내재된 옵션가치 손실. **현금흐름 붕괴는 아님**(Falcon이 본업) `[의견]` |
| 현재 상태 | Flight 14 첫 궤도·V3 26기 배치 🟢, 엔진 1기 조기정지 🟢, Flight 15 미정 | 진척 실재 |

### 4.4 위성 수명·우주 쓰레기

- 저궤도 위성 대량 교체 주기 → **Starlink는 구조적 유지 capex 사업**. 교체 비용 규모 ⬛.
- 궤도 충돌·쓰레기 규제 강화(FCC 탈궤도 규칙 등) 가능성 — 구체 2026 조치 ⬛.

**차원 결론 — 사업 리스크 ★★☆☆☆**: 핵심(Starlink 영업이익 $1.66B, 마진 38.6% 🟡)은 강하다. 그러나 **회사 전체의 현금흐름은 Starlink가 벌고 AI가 쓰는 구조**이며, AI의 회수가 증명되기 전까지 FCF TTM −$32.5B 🟢가 지속된다.

---

## 5. 거시 리스크

| 요인 | 노출 | 평가 |
|------|------|------|
| 금리 | 부채 대부분 고정금리($25B @5.855%, 11.7년) 🟡 → 이자 리스크 낮음. **밸류에이션(Forward PER ~102x 🟡) 듀레이션 리스크는 큼** | 중 |
| 경기 | Starlink 소비자 ARPU $66 보합 🟡, CFO "지역 확장으로 혼합 ARPU 하락 가능" 🟡`[주장]` | 중 |
| **AI 사이클 반전** | AI가 매출 33%·capex 86%. 컴퓨트 단가 하락 시 Google 외 신규 계약 단가·가동률 하락. Musk "현재 제약은 메모리" 🟡 — 공급 제약이 풀리면 가격 경쟁 | **상** |
| 셧다운(CR 12-11) | FAA·NASA 업무 지연 — 일시적 | 저 |
| 수급(락업) | 아래 6.4 참조 | 중 (단기) |

**차원 결론 — 거시 ★★★☆☆**: 금리 자체보다 **AI 사이클 + 고밸류 듀레이션**의 결합이 위험.

---

## 6. 지배구조

### 6.1 확인된 사실 (공시 기반 🟢/🟡)

| 항목 | 내용 | 신뢰도 |
|------|------|------|
| 의결권 구조 | Class B 10표 / Class A 1표. **Musk 지분 42.5% · 의결권 83.8%** | 🟢 (Reuters 분석의 Yahoo 게재본 · `_data.md` 42~43%/84~85% 일치) |
| 이사회 | 9인. **Musk가 CEO·CTO·의장 겸임**. 이사 선임·해임·공석 충원을 Musk 단독 가능 | 🟡 |
| Controlled company 면제 | 지명·보상위원회 독립 과반 **두지 않을 계획** | 🟢 (2개 매체) |
| 강제 중재·집단소송 금지 | 배심재판 권리 "취소불능·무조건" 포기, 회사·이사·임원·**지배주주**·IPO 주관사 상대 집단소송 금지 | 🟢 (2개 매체) |
| 텍사스 법인 | 2024 델라웨어→텍사스 이전. **주주제안 요건 $1M 또는 3% 지분**. 위임장 경쟁·적대적 인수 방어 강화 | 🟢 |
| Musk 성과보상 | 2026-01-13 Class B **10억 주** 제한부 주식: 15개 트랜치 시총 목표(최대 $7.5T) **AND 100만 명 화성 영구 정착지** 둘 다 충족 시 베스팅. xAI 합병 후 목표 조정 | 🟡 (S-1 인용 보도 다수) — 잠재 희석 ~7.4% 🔴`[추정]`(1B/13.57B) |
| 관계자 거래 | 2025 Tesla로부터 ~$650M 구매(xAI의 Megapack $506M 포함), Cybertruck $131M(정가 기준), **Valor 관련 AI 인프라 리스 의무 $20B+**, Terafab 공동투자, Tesla의 SpaceX 소수지분 | 🟡 (Reuters 계열 Yahoo 게재본 · Irish Times) |
| 기관 반발 | NYC·NYS 감사관·CalPERS가 IPO 관련 서한 발송 | 🟡 (서한 존재만 확인, 내용 ⬛) |
| 주주환원 | 배당 없음 🟢. 자사주 Q1 $4.38B · Q2 $0.54B 🟡 — 정책 공시 ⬛ | 🟢/🟡 |

### 6.2 이해충돌 매트릭스 `[의견]`

| 거래 상대 | Musk 이해 | SpaceX 소수주주 이해 | 충돌 강도 |
|------|------|------|------|
| Tesla (Terafab·Megapack·Cybertruck) | Tesla 지분 ~13~20%대 ⬛(정확치 미확인) | 시장가 거래·투자수익 | 중~상 |
| xAI(합병 완료)·X | 합병 전 xAI·X 대주주였음 | 합병비율·적자 흡수 | **상** (이미 실행됨) |
| Valor Equity Partners (AI 리스) | 장기 Musk 생태계 투자사 🟡 | 리스 조건 공정성 | 중 ⬛ |
| Musk 성과보상(화성) | 개인 보상 | 희석·자본의 화성 우선 배분 | 중 |

### 6.3 미확정 주장 (🔴[주장]) — 사실과 분리

| 주장 | 출처 | 상태 |
|------|------|------|
| Terafab 1단계 수치에 SEC 공시상 $38B 격차 | TechTimes 단일 | 🔴`[주장]` 원문 대조 ⬛ |
| Intel의 Terafab 합류 | 검색 요약 1줄 | 🔴`[주장]` |
| Fugazi Research 공매도 보고서(2026-06) — **SpaceX가 아니라 우주 피어 6종 대상**, "SPCX 상장 시 피어 프리미엄 소멸" | Webull/Benzinga | 🟡 존재 · SpaceX 직접 공격 아님 |
| SpaceX 직접 대상 공매도 보고서 | 검색 범위 내 없음 | ⬛ (부재 확인 아님) |
| SpaceX 지분 투자 SPV 관련 소송(Delaware Chancery, GTS–Trellis) | Law360·Bloomberg Law | 🟡 — **회사 자체가 아닌 투자 비히클 분쟁**, 직접 영향 낮음 |

### 6.4 락업 일정 — 출처 충돌

| 트랜치 | 출처 A (news 10-06, KuCoin 계열) | 출처 B (startuphub·purepowerpicks) | 신뢰도 |
|------|------|------|------|
| 1차 | 08-06 911.5M주 🟢 | 동일 | 🟢 |
| 2차 | — | 08-12 또는 08-20, ~319M주 (출처 내부 불일치) | 🔴 |
| 이후 | **10-09 ~3.2억주 · 10-24 · 12-08** | 9월 ~7억주 · 10월 유사 규모 | 🔴 충돌 |
| Musk | 6B+주(≈$1T+ 🔴`[추정]` @$171) **366일 락업 → ~2027-06** | 동일 | 🟡 |

> ⬛ S-1/424B 원문 락업 조항 미대조. 날짜별 수량은 확정 불가.

**차원 결론 — 지배구조 ★★☆☆☆** (★1 하드 거부 직전): 회계 부정·허위 공시 증거는 없다. 하지만 **"Musk만이 Musk를 견제할 수 있다"** 구조 위에서 관계자 거래(xAI·Tesla·Valor)가 이미 수백억 달러 규모로 실행 중이다. 소수주주의 법적 구제수단(집단소송·배심재판·주주제안)이 전부 봉쇄됐다.

> 리루: "나는 **능력 있고 정직한** 경영진이 운영하는 회사에만 투자한다. 능력은 측정하기 쉽지만 정직(주주에 대한 신의)은 **견제 장치가 없을 때** 드러난다." `[어록 취지]`

---

## 7. 장기 확실성 — 10년 후 SpaceX

### 7.1 10년 후 시나리오 `[의견]` (확률은 정성적 판단, 🔴)

| 시나리오 | 모습 | 판단 근거 |
|------|------|------|
| **기본** | 발사 독점(Starship 재사용 상용화) + Starlink 글로벌 통신사(가입자 수천만, D2D 포함) — 이 둘은 **높은 확실성**. AI는 "Starlink 현금흐름을 쓰는 컴퓨트 임대업"으로 정착, 수익률은 하이퍼스케일러 평균 수준 | 발사·Starlink의 규모·원가 우위는 10년간 재현 어려움 |
| 상방 | 우주 데이터센터(Suncatcher형) 상용화, Musk 성과보상 시총 목표 근접 | 현재 실험 단계(10-01 Google TPU 위성) |
| **하방(영구 손실 경로)** | AI capex가 회수되지 않고 GPU 세대 교체마다 재투자 → Starlink FCF가 영구적으로 AI에 흡수. 그 사이 관계자 거래로 가치 이전 | 견제 장치 부재로 하방 경로를 외부에서 차단 불가 |

### 7.2 비즈니스 모델을 무너뜨릴 수 있는 것

1. **AI 자본 배분 실패의 장기화** (가장 가능성 있는 영구 손실 경로) `[의견]`
2. **Musk 리스크** — 사망·이탈(핵심인물 보험 없음 🟢) 또는 정치적 충돌로 정부 계약·해외 인가 동시 상실
3. **Kessler형 궤도 사고** — 저확률·초고영향, 정량 ⬛
4. **D2D·지상망 경쟁으로 Starlink ARPU 구조적 하락** — CFO 스스로 혼합 ARPU 하락 가능성 언급 🟡

> 리루(공자 인용): "**아는 것을 안다 하고, 모르는 것을 모른다 하는 것이 아는 것이다.**"
> 발사·Starlink 10년 후는 "안다"에 가깝다. AI 부문 10년 후는 "모른다"다. 회사 capex의 86%가 "모른다" 쪽에 있다.

**차원 결론 — 장기 확실성 ★★★☆☆** (우주 단독 ★4, AI 포함 연결 ★2 → 가중 ★3)

---

## 8. 레드라인 (무효화 조건)

> 조건은 **회사가 분기마다 공시하는 지표(10-Q·실적 보도자료·8-K)** 로만 건다.

| # | 레드라인 | 확인 지표 (공시) | 현재 값 | 상태 |
|---|------|------|------|------|
| R1 | **Connectivity 세그먼트 매출 YoY < +20%가 2분기 연속** | 10-Q 세그먼트 매출 | Q2 +66% 🟡 | 미발동 |
| R2 | **AI 세그먼트 adj. EBITDA가 다시 적자로 2분기 연속** | 실적 보도자료 세그먼트 표 | Q2 +$1.1B 🟡 | 미발동 |
| R3 | **순현금(현금 − 총차입금)이 마이너스 전환** | 10-Q 재무상태표 | +$60.3B 🟡 | 미발동 |
| R4 | **Musk 계열사(Tesla·X·Valor·Musk 개인 회사)와 신규 관계자 거래가 분기 $5B 초과로 공시** (8-K/10-Q 관계자 거래 주석) | 10-Q RPT 주석·8-K | Terafab 1단계 $16.8B(분담 ⬛)·Valor 리스 $20B+(기존) | 미정 — 분담 공시 대기 |
| R5 | **FY27 capex 가이던스가 FY26 실적 이상 + 연결 OCF/capex < 25% 지속** | 실적 콜 가이던스·현금흐름표 | Q2 OCF/capex 13% 🟡 · FY27 가이던스 ⬛ | 미정 (Q4 실적 시 판정) |

---

## 9. ⚑ 핵심 가정 (load-bearing) 및 논제 건강도

| ⚑ | 가정 | 확인 지표 (분기 공시) | 현재 값 | 상태 |
|---|------|------|------|------|
| A1 | Starlink가 현금 엔진으로 계속 성장 | Connectivity 매출 YoY ≥ +30% **AND** 세그먼트 영업이익률 ≥ 35% | +66% · 38.6% 🟡 | **충족** |
| A2 | AI capex가 회수 가능 | AI 세그먼트 **영업이익**(감가상각 후) 개선 추세 — 손실 축소 2분기 연속 | Q2 −$1.26B (비교 시계열 1개) | **미정** |
| A3 | capex가 2026 하반기~2027에 정점 | 분기 capex ≤ $18.4B 유지 & FY27 가이던스 ≤ FY26 | CFO "하반기 Q2와 비슷" 🟡 · FY27 ⬛ | **미정** |
| A4 | 재무 완충력 유지 | 순현금 ≥ +$30B | +$60.3B 🟡 | **충족** |
| A5 | 연결 현금흐름이 자립 방향 | 분기 OCF/capex ≥ 25% | 13% 🟡 | **미충족** |
| A6 | 정부 수요 유지(정치 리스크 미현실화) | 정부 매출 비중·수주 공시, 계약 해지 8-K 없음 | ~20% 🟡 · Q2 $6B+ 수주 🟡`[주장]` | **충족** |
| A7 | 관계자 거래가 공정가·독립 승인 하에 이뤄짐 | 10-Q 관계자 거래 주석 · Terafab 분담 공시 | 독립 위원회 승인 여부 ⬛ · controlled company 면제 🟢 | **미정** |

### 논제 건강도: **5 / 10**

근거: 충족 3(A1·A4·A6) · 미충족 1(A5) · 미정 3(A2·A3·A7). 레드라인 발동 0, 붕괴(⚫) 가정 0.
- 점수를 받치는 것: Starlink 현금 엔진(A1)과 $60B 순현금(A4)이 **2~3년치 AI capex 실패를 견딜 완충**을 준다.
- 점수를 깎는 것: 논제의 성패를 가르는 A2(AI 회수)·A3(capex 정점)가 **아직 단 한 분기의 데이터만 있다**. A5는 현재 명백히 미충족. A7은 구조상 외부에서 확인 불가에 가깝다.
- **다음 판정 시점**: Q3 실적(11월 초) — A2·A3의 2번째 데이터 포인트 + Cursor 연결 + Terafab 분담 공시.

**하지만 반대로**: 건강도를 더 높게 볼 근거 — 매출 연환산 $1,000억 가이던스 🟡, Google 장기 계약 🟢, Starship 궤도 도달 🟢. 더 낮게 볼 근거 — FCF TTM −$32.5B 🟢, 표면 차입 외 Valor 리스 $20B+ 🟡, 지배구조 견제 0.

---

## 10. 차원별 평점 요약

| 차원 | 평점 | 한 줄 |
|------|------|------|
| 경영진 (역량·신뢰성·자본배분) | ★★★☆☆ | 운영 ★5, 일정 약속 ★2, AI 자본 배분 미검증 |
| 규제 | ★★★☆☆ | 개별 규제는 관리 가능, 정치 리스크가 Musk 개인에 연동 |
| 경쟁 | ★★★★☆ | 우주는 독점적, 위협은 AI에 집중 |
| 사업 리스크 | ★★☆☆☆ | Starlink가 벌고 AI가 쓴다 — FCF TTM −$32.5B |
| 거시 | ★★★☆☆ | 고정금리 부채는 양호, AI 사이클·고밸류 듀레이션 위험 |
| 지배구조 | ★★☆☆☆ | 의결권 83.8% · 강제중재 · 텍사스 · 관계자 거래 대규모 |
| 장기 확실성 | ★★★☆☆ | 우주 ★4 / AI ★2 |
| **종합 (리스크 관점)** | **★★☆☆☆** | **영구 손실 경로 = AI 자본 배분 × 견제 불가 지배구조** |

---

## 11. 종합 결론

1. **사실** — SpaceX의 우주 사업(발사·Starlink)은 규모·원가·규제 면허에서 10년 단위 우위를 가진다. Starlink는 Q2 영업이익 $1.66B·마진 38.6%로 현금 엔진이 작동 중이다. 🟡`[사실]`
2. **사실** — 그 현금과 IPO 자금(~$75~86B 🟡)은 지금 AI capex로 들어가고 있다(Q2 $15.8B, 연 ~$65B 페이스 🔴`[추정]`). AI 세그먼트는 감가상각 후 아직 적자다. 🟡
3. **사실** — 이 배분을 결정하는 사람은 의결권 83.8%를 쥔 Musk 1인이며, 소수주주의 집단소송·배심재판·실효적 주주제안이 봉쇄돼 있고, 관계자 거래(xAI 합병·Tesla Terafab·Valor 리스)가 이미 대규모로 실행됐다. 🟢/🟡
4. **의견** — 리루 기준에서 이 종목은 "훌륭한 사업 + 검증 안 된 자본 배분 + 견제 없는 지배구조"다. 리루가 BYD·Micron에 투자할 때 본 것은 **경영진이 소수주주를 동업자로 대하는 기록**이었다. SpaceX에는 우주 사업에선 그 기록이 있으나 AI 자본 배분에선 아직 없다.
5. **의견** — Starship 실패는 옵션가치 손실이지 영구 손실이 아니다(Falcon이 본업). **영구 손실의 진짜 경로는 Starlink FCF가 회수 안 되는 AI capex와 계열사 거래로 장기간 흘러가는 것**이며, 이를 외부에서 막을 장치가 없다.
6. **하지만 반대로** — Musk의 과거 자본 배분 중 "모두가 미쳤다고 한" 결정(재사용 로켓, Starlink 자체 위성망)이 결국 독점을 만들었다. AI capex도 같은 패턴일 가능성을 배제할 수 없고, Google ~$29B 계약은 외부 고객이 가치를 인정한 실증이다. 이 반론은 **Q3·Q4 AI 세그먼트 영업이익**으로 검증 가능하다.

> 리루: "가장 큰 위험은 당신이 모르는 것을 안다고 착각하는 것이다." `[어록 취지]`
> 현재 시점에서 SpaceX의 AI 부문은 회사도, 시장도, 우리도 모른다. 리스크 관점에서는 **Q3 실적까지 관망**이 합리적이다. 지배구조 할인은 그 이후에도 사라지지 않는다.

---

## 12. 정보 갭 선언 (⬛)

- S-1·10-Q **원문 직접 대조 없음** — 리스크 팩터·지배구조·관계자 거래는 2차 보도(Reuters 계열 Yahoo 게재본, Washington Technology 등) 경유 🟡
- IPO 순조달액 $75B vs $85.7B 충돌, Q2 차입 발행 $114.8B 분류 ⬛
- 락업 트랜치 날짜·수량 출처 충돌 (6.4)
- Flight 14 FAA mishap 조사 개시 여부 ⬛
- Cursor 거래 종결 여부(10-06 현재) ⬛
- Terafab 분담 비율·이사회 독립 승인 절차 ⬛
- AI 장비·위성 내용연수, 감가상각 정책 ⬛
- 정부 매출 비중 정확치(S-1 원문) ⬛ — 보도 "~20%"
- ITAR·해외 인허가·반독점(DOJ/FTC) 2026 동향 ⬛ (검색 범위 내 0건 ≠ 부재)
- Musk 시간 배분 비율, 승계 계획 ⬛
- NYC·NYS·CalPERS 서한 내용 ⬛
- Musk의 Tesla 지분율 정확치 ⬛

---

## 출처

- [SpaceX Form S-1 (SEC EDGAR)](https://www.sec.gov/Archives/edgar/data/0001181412/000162828026036936/spaceexplorationtechnologi.htm) — 직접 열람 안 함, 검색 색인·보도 인용 경유
- [Washington Technology — SpaceX's biggest risk factor might be Elon Musk](https://washingtontechnology.com/companies/2026/05/spacexs-biggest-risk-factor-might-be-elon-musk/413698/)
- [Yahoo Finance — Analysis: SpaceX IPO gives Musk sweeping power](https://finance.yahoo.com/markets/stocks/articles/analysis-spacex-ipo-gives-musk-100130777.html)
- [The Standard — SpaceX IPO gives Musk sweeping power and curbs shareholder rights](https://www.thestandard.com.hk/world/article/331293/SpaceX-IPO-gives-Musk-sweeping-power-and-curbs-shareholder-rights)
- [NYC Comptroller — Letter to SpaceX re: IPO](https://comptroller.nyc.gov/reports/letter-to-spacex-re-ipo-from-nyc-comptroller-levine-nys-comptroller-dinapoli-and-calpers-ceo-frost/)
- [Yahoo Finance — SpaceX reveals Musk company links](https://finance.yahoo.com/markets/stocks/articles/spacex-reveals-musk-company-links-012411560.html) · [Irish Times](https://www.irishtimes.com/business/2026/05/21/spacex-filing-reveals-musk-company-links-ahead-of-ipo/)
- [SpaceX Q2 2026 Earnings Call Transcript (Webull)](https://www.webull.com/news/15387111038133248)
- [implicator.ai — SpaceX capital spending $18B debut quarter](https://www.implicator.ai/spacex-capital-spending-18-billion-debut-quarter/)
- [finrep.ai — SpaceX first 10-Q: seven financial reporting decisions](https://www.finrep.ai/blog/spacex-first-10-q-seven-financial-reporting-decisions-explained)
- [Mars colony 성과보상 보도 (S-1 인용)](https://menastartupdigest.com/?p=37736)
- [Global Competition Review — Cursor 거래](https://globalcompetitionreview.com/gcr-usa/article/gibson-dunn-kirkland-steer-spacexs-cursor-buy) · [entrepreneurloop](https://entrepreneurloop.com/spacex-buying-cursor-60-billion-acquisition-ipo/)
- [Satellite Today — NASA to reopen HLS contract](https://www.satellitetoday.com/government-military/2025/10/20/nasa-acting-admin-duffy-says-spacex-is-delayed-on-moon-lander/) · [Gizmodo — ASAP 경고](https://gizmodo.com/spacexs-starship-lunar-lander-could-be-years-late-nasa-safety-panel-warns-2000662122)
- [startuphub — SpaceX lockup](https://www.startuphub.ai/news/spcx-lockup-expiration-2026-07-12)
- [Webull — Fugazi Research 우주주 공매도 보고서](https://www.webull.hk/en/news/15046133741869056) · [Law360 — SPV 소송](https://www.law360.co.uk/articles/2439250)
- 내부: `reports/SPCX/_data.md`, `SPCX-news-20261006.md`, `SPCX-news-20260810.md`, `SPCX-checklist-20261006.md`

---

<!-- discount-ledger
role: 리스크·경영진(리루)
items:
  - name: 지배구조 할인 (의결권 83.8%·강제중재·controlled company·관계자 거래)
    pct: 15
    reason: 소수주주 견제수단 부재 + xAI 합병·Terafab·Valor 리스 $20B+ 등 관계자 거래 실행 중 · [사실] 구조 / [추정] 할인 폭
    overlapsWith: 버핏(경영진·해자 평가)·팀리드 종합의 지배구조 감점
  - name: AI 자본 배분 사업 리스크 할인 (capex 회수 미검증)
    pct: 10
    reason: AI 세그먼트 Q2 영업손실 −$1.26B, AI 매출/capex 0.16x, 회수기간 <1년은 CFO [주장] · [추정]
    overlapsWith: 버핏 3-시나리오 Bear 가중·FCF 추정(동일 리스크 이중 차감 주의)
  - name: 규제·정치 리스크 할인 (정부 매출 ~20%, Musk 연동 정치 리스크, FAA)
    pct: 5
    reason: S-1 리스크 팩터(정부 의존·Brazil 압류 선례) [사실] / 할인 폭 [추정]
    overlapsWith: none
  - name: Musk 핵심인물·성과보상 희석
    pct: ⬛
    reason: 핵심인물 보험 없음 [사실] · 10억 주 성과보상 잠재 희석 ~7.4% [추정] — 베스팅 조건(화성 100만 명) 달성 확률 정량화 불가로 정성 처리
    overlapsWith: 버핏 주식수 가정(희석 반영 여부)
  - name: 거시 하향
    pct: 0
    reason: 고정금리 부채로 금리 직접 노출 낮음. AI 사이클 리스크는 위 사업 리스크 항목에 포함 [의견]
    overlapsWith: none
total: 30
-->

<!-- confidence-summary
high: 16
medium: 38
low: 14
gap: 14
verdict: 보통
-->

**신뢰도 요약**: 🟢 16 · 🟡 38 · 🔴 14 · ⬛ 14 → **보통**.
지배구조 골격(의결권·강제중재·텍사스·controlled company)과 핵심인물 리스크는 S-1을 인용한 복수 매체가 일치해 단단하다. 반면 세그먼트 영업손익·IPO 순조달액·관계자 거래 금액은 10-Q/S-1 원문을 직접 열지 못해 🟡에 머물고, 락업 일정과 Terafab 관련 주장은 출처가 충돌하거나 단일 출처라 🔴다. 논제의 성패를 가르는 AI 회수(A2)·capex 정점(A3)은 데이터 포인트가 1개뿐이다.
