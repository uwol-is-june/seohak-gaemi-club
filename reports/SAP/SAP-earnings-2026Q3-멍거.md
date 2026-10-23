# SAP 2026Q3 실적 — 경쟁 구도 (멍거 관점)

> 대상: SAP SE (NYSE ADR: SAP) · 실적 발표 2026-10-21 (Q3 = 7~9월) · 작성 2026-10-23
> 역할: 경쟁 변화 해석자 (찰리 멍거 관점) · 통화: SAP는 **EUR**, 경쟁사는 **USD**(각사 보고통화 그대로, 환산 없음)
> 자료 확보 등급 **B** — SAP 6-K 미제출. 보도자료(preliminary·unaudited)와 3자 콜 전문만 사용. **6-K 발간 후 재검토 필요**.
> SAP 원자료: `reports/SAP/_q3-primary/_q3-primary.md` (Team Lead 1회 수집본). 경쟁사 수치는 WebSearch·회사 보도자료 재게재본 경유.

---

## 요약 — 한 문장

**이번 분기는 "SAP가 경쟁사로부터 고객을 뺏고 있다"는 증거가 아니라, "자기 설치기반을 경쟁사보다 빠르게 클라우드로 옮기고 있고, 그 과정에서 아무도 대형 계정을 빼가지 못하고 있다"는 증거다.** 경쟁 구도 판정은 **유지**(코어 소폭 강화 · 주변부 약화 혼재). 레드라인 #6(ERP 코어 대형계정 연쇄 탈취)은 **미발동**이지만, 이를 직접 확인할 데이터(win/loss·이탈률)는 공개돼 있지 않다.

---

## 0. 방법론·데이터 한계 (선고지)

- SAP Q3 수치는 회사 보도자료 원문이지만 6-K 미제출 상태라 신뢰도 상한을 🟡[사실]로 둔다.
- 경쟁사 수치는 검색 경유 + 회사 보도자료 재게재본이다. 검색 경유 수치는 🟡 상한.
- **회계 기간이 다르다**: Oracle FQ1'27 = 6~8월, Workday·Salesforce FQ2'27 = 5~7월, SAP Q3 = 7~9월. "동기간"은 "가장 최근 발표 분기" 의미이며 1~2개월 어긋난다.
- **통화·지표 정의가 다르다**: SAP current cloud backlog(CCB) ≈ 12개월 계약잔고(cRPO 유사) 이지만 정의가 동일하지 않다. Oracle은 cRPO 대신 총 RPO만 공개.
- Microsoft FY27 Q1(Dynamics)과 ServiceNow Q3'26(10-28 발표 예정)은 아직 미발표 → ⬛.
- SAP 지역별 수치, S&M·R&D 분기 비율, 고객 이탈률, 대형 딜 win/loss는 보도자료에 없음 → ⬛ (추정 금지).

---

## 1. 실적으로 읽는 경쟁 변화

### 1.1 클라우드 +25% cc — 점유율 획득인가, 자기 고객 전환인가

| 지표 (EUR) | Q3'26 | Q3'25 | cc Δ | 해석 | 신뢰도 |
|---|---:|---:|---:|---|---|
| Cloud revenue | 6,668m | 5,290m | +25% (약 1pp는 재무곤경 복귀 고객 일회성) | 일회성 제외 실질 약 +24% | 🟡[사실] |
| Cloud ERP Suite | 5,924m | 4,586m | +28% | 클라우드의 89% (CFO) — 성장은 코어 ERP에서 나온다 | 🟡[사실] |
| Current cloud backlog | 24,144m | 18,839m | +26% | Q2'26 +26% cc(€22.9B)와 같은 속도 — 감속 없음 | 🟡[사실] |
| Software support | 2,434m | 2,565m | −6% | 설치기반이 클라우드로 이동(자기잠식) | 🟡[사실] |
| Software licenses | 147m | 161m | −9% | 온프렘 신규 판매는 사실상 종료 국면 | 🟡[사실] |
| Cloud and software | 9,249m | 8,016m | +14% | **이 숫자가 "진짜" 성장률에 가깝다** | 🟡[사실] |
| Total revenue | 10,270m | 9,076m | +12% | 경쟁사 총매출 성장률과 같은 비교 단위 | 🟡[사실] |

**멍거식 해석**: 클라우드 +25%의 상당 부분은 **같은 고객이 지불 방식을 바꾼 것**(support −6% → cloud)이다. 경쟁 비교의 정직한 단위는 클라우드 성장률이 아니라 **cloud & software +14% / 총매출 +12%** 다. 이 단위로 보면 SAP는 Workday(총매출 +12.8%)·Salesforce(+11%)와 **같은 대열**이지 압도적 우위가 아니다 🟡[추정].

- **하지만 반대로**: 전환 과정에서 고객이 이탈했다면 support 감소가 cloud 증가보다 훨씬 커야 한다. Q3에 support는 −€131m, cloud는 +€1,378m — **전환 시 지출이 늘었다**(RISE 전환 시 ACV 업리프트) 🟡[사실]. 업리프트는 고객이 SAP에 **더 많이** 지불하기로 선택했다는 뜻이고, 이는 대체재(Oracle·MS)로의 이탈 압력이 크지 않다는 간접 증거다 🟡[추정].
- **또 반대로**: 업리프트는 경쟁 우위가 아니라 **2027 ECC 지원종료라는 강제 마감**이 만든 협상력일 수 있다. 강제력과 경쟁력을 이번 데이터로는 분리할 수 없다 ⬛.

### 1.2 Cloud GM −0.7pp — 가격경쟁인가, 비용인가

| 지표 | Q3'26 | Q3'25 | Δ | 신뢰도 |
|---|---:|---:|---:|---|
| Cloud GM (IFRS) | 73.9% | 74.6% | −0.7pp | 🟡[사실] |
| Cloud GM (non-IFRS) | 74.3% | 75.1% | −0.8pp | 🟡[사실] |
| 9M Cloud GM (IFRS) | 74.3% | 74.6% | −0.3pp | 🟡[사실] |
| 레드라인 #3 기준 | 70% | — | 버퍼 3.9pp | 🟡[사실] |

- ⚑ **CFO 설명**: AI 투자·하드웨어 가격·인프라 비용 상승 + 전년 일회성 🟡[주장] (3자 전문, 원문 대조 전).
- **경쟁 함의 판정**: 가격경쟁이 원인이라면 (a) CCB 성장 둔화 또는 (b) 업리프트 축소가 같이 보여야 한다. CCB는 +26%로 유지됐다 → **가격 인하로 수주를 지키는 패턴은 아직 데이터에 없다** 🟡[추정].
- **하지만 반대로 — 더 불편한 해석**: "하드웨어 가격 상승"은 SAP가 인프라를 하이퍼스케일러(Azure 등)에서 빌린다는 구조의 비용이다. Oracle이 분기에 GPU 30만 장 이상을 고객에 인도하고 capex ~$28.5B를 집행하는 AI 인프라 붐 🟡[사실]이 **SAP의 원가를 밀어올리는 쪽**으로 작동한다 🟡[추정]. 즉 경쟁사(인프라 사업자)가 SAP의 매출총이익 일부를 가져가는 가치사슬 유출이며, 이는 기존 03 보고서 §6의 "번들 마진 유출" 경로가 진행 중임을 시사한다 🔴[추정].

### 1.3 Opex 레버리지 — 경쟁 강도의 역지표

| 지표 | Q3'26 | Q3'25 | Δ | 신뢰도 |
|---|---:|---:|---:|---|
| Gross margin (IFRS) | 73.1% | 73.5% | −0.4pp | 🟡[사실] |
| Operating margin (IFRS) | 28.5% | 27.4% | +1.1pp | 🟡[사실] |
| Operating margin (non-IFRS) | 29.5% | 28.3% | +1.2pp | 🟡[사실] |
| Opex/매출 (GM − OM, IFRS) | 44.6% | 46.1% | −1.5pp | 🟡[추정] (역산) |

- 매출총이익률이 내려갔는데 영업이익률이 올랐다 → 영업비용이 매출보다 느리게 늘었다. **경쟁이 격화되는 회사는 보통 S&M을 늘려야 한다** — 반대 패턴은 경쟁 압력이 통제 가능하다는 간접 신호다 🟡[추정].
- **하지만 반대로**: (1) Q3'25 기저에 세무소송·구조조정 일회성 각 −€0.1B가 있다 🟡[사실]. non-IFRS(구조조정 제외)에서도 +1.2pp라 레버리지 자체는 남지만, IFRS 개선폭은 기저효과로 부풀었다. (2) S&M·R&D 분기 비율은 보도자료에 없다 ⬛ — **영업 투자를 줄여서 얻은 마진인지 생산성(개발자 코드 기여 +70%, 중앙기능 +20%)인지 분리 불가** ⬛. (3) 인수(Reltio·Dremio·Prior Labs)가 영업이익 −€39m(non-IFRS) 희석 🟡[사실] — 이를 흡수하고도 레버리지가 났다는 점은 긍정.
- 2027 opex 성장 = 매출성장의 80~90% 가이던스 🟡[사실] → 경영진은 **경쟁 때문에 투자를 늘려야 하는 상황이 아니라고 판단**하고 있다 🟡[추정].

### 1.4 라이선스·서포트 감소의 의미

- Support −6% cc, 경영진은 "향후 감소율 가속" 가이던스 🟡[사실]. 이는 (a) 자사 클라우드 전환(계획된 자기잠식)과 (b) EU 합의 후 제3자 유지보수 이탈의 합이다.
- **(a)와 (b)를 분리할 데이터가 없다** ⬛ — 가정 #7·레드라인 #5는 이번 분기로 검증 불가. 단, support 감소폭(−€131m)이 cloud 증가폭(+€1,378m)의 1/10 수준이라 "명확한 이탈 가속"(레드라인 #5) 징후는 없다 🟡[추정].
- 라이선스: CFO "transactional은 바닥 통과, 2027 tailwind는 과장" 🟡[주장] — 온프렘 시장에서 Oracle과의 가격전 신호는 없음.

---

## 2. 경쟁사 비교표 (가장 최근 발표 분기)

| 회사 (분기·기간) | 매출 성장 | 앱/구독 성장 | 백로그 | 영업이익률 | 메모 | 신뢰도 |
|---|---|---|---|---|---|---|
| **SAP** (Q3'26, 7~9월) | 총 €10.27B **+12% cc** | Cloud **+25% cc** · Cloud ERP Suite **+28% cc** | CCB €24.1B **+26% cc** | non-IFRS **29.5%** | 2026 클라우드 가이던스 상단 예상 | 🟡[사실] |
| **Oracle** (FQ1'27, 6~8월, 9-10 발표) | 총 $19.3B **+30%** | SaaS $4.2B **+10%** · IaaS $7.4B +121% · Software −3% | RPO $664B (+$209B YoY, 약 +46%) | non-GAAP **42%** | FCF −$5B, capex ~$28.5B. Fusion ERP 별도 미공시 | 🟡[사실] |
| **Workday** (FQ2'27, 5~7월, 8-27 발표) | 총 $2.649B **+12.8%** | 구독 $2.471B **+13.9%** | 12M 구독잔고(cRPO) $9.034B **+14.2%** · Q3 가이던스 cRPO **+11~12%** | non-GAAP **31.1%** | AI가 신규 ACV의 25%+ · GRR 97% | 🟡[사실] |
| **Salesforce** (FQ2'27, 5~7월, 8-26 발표) | 총 $11.3B **+11%** (Informatica $456M 포함) | Subscription & support $10.8B **+12%** | cRPO $33.5B **+14% cc** | non-GAAP **34.1%** | Informatica 제외 유기 성장 약 +6~7% | 🟡[사실] / 유기성장 🔴[추정] |
| **ServiceNow** (Q3'26) | ⬛ (10-28 발표 예정) | Q2'26 구독 $3.877B +24.5%(+23% cc) · Q3 가이던스 +20.5% | Q2 cRPO $13.2B +21.5% cc · Q3 가이던스 +20% | ⬛ | Q3 미발표 — Q2·가이던스로 대체 | 🟡[사실] |
| **Microsoft Dynamics** (FY27 Q1) | ⬛ 미발표 (10월 말 예정 추정) | 직전 확인치: FY26 Q2 Dynamics 365 +19% | ⬛ | ⬛ (부문 미공시) | FY26 Q4 Dynamics 별도 수치 미확보 | ⬛ |

### 2.1 표가 말하는 것

1. ⚑ **애플리케이션 백로그 성장에서 SAP(+26%)가 비교군 최상위다** — Workday +14%(가이던스 +11~12%로 감속), Salesforce +14%(인수 포함), ServiceNow +21.5%(Q2). 🟡[사실]
2. **Oracle의 성장은 앱이 아니라 AI 인프라다.** SaaS +10%는 SAP Cloud ERP Suite +28%의 3분의 1 수준 🟡[사실]. ERP 코어에서 Oracle이 SAP 대형계정을 빠르게 흡수하고 있다면 Oracle SaaS가 가속해야 하는데 데이터는 그 반대다 🟡[추정]. → 레드라인 #6의 가장 유력한 가해자 후보에서 **반대 증거**.
3. **Workday의 감속**(cRPO +14.2% → 가이던스 +11~12%)은 HCM 시장 포화 + Financials 역침투의 속도가 느리다는 신호다 🟡[추정]. SAP가 HCM을 되찾았다는 뜻은 아니다(03 보고서: Workday HCM 23% vs SuccessFactors 5%).
4. **마진은 SAP가 하위권**: non-IFRS 29.5% vs Oracle 42% · Salesforce 34% · Workday 31% 🟡[사실]. 이는 RISE 구조상 인프라 원가를 SAP가 떠안기 때문이다 🟡[추정]. 성장 우위는 마진 열위와 교환된 것이다.

**하지만 반대로**: SAP 성장률 우위의 상당 부분은 **강제 마감(2027 ECC)이 만든 일시적 전환 수요**다. Workday·Salesforce에는 이런 강제 마감이 없다. 동일 조건(총매출)으로 놓으면 SAP +12% cc vs Workday +12.8% vs Salesforce +11% — **차이가 사라진다** 🟡[사실]. "SAP가 경쟁에서 이기고 있다"가 아니라 "SAP는 고객을 잃지 않으면서 가격 구조를 바꾸고 있다"가 정확한 표현이다 [의견].

---

## 3. 경영진의 경쟁 언급 — 말한 것과 말하지 않은 것

| 관찰 | 내용 | 해석 | 신뢰도 |
|---|---|---|---|
| 경쟁사 실명 언급 없음 | 콜 전체에서 Oracle·Workday·Salesforce·Microsoft 미언급 | 3자 전문 기준 | 🟡[사실] |
| "not committing to a preferred model" | "Unlike some of our peers, SAP is not committing to a preferred model" · 70+ 모델 · 고객데이터 LLM 학습 미사용 | LLM을 범용 부품으로 만들고 데이터·프로세스 계층에 가치를 묶는 전략 | 🟡[주장] |
| Joule 규모 | 어시스턴트 400 · 에이전트 ~3,000 | 수량 지표일 뿐 매출 기여 미공시 | 🟡[주장] |
| 상위 50딜 중 AI 포함 비중 | "9 of the 50" vs "nine out of 10" — 전문 간 상충 | 가정 #6 검증 지표인데 확정 불가 | ⬛ |
| Concur | 경비는 안정, 출장예약은 신규 진입자 경쟁 | 인접 모듈 best-of-breed 잠식의 실제 사례 | 🟡[주장] |
| 회피된 질문 | BNP(headless software·모델 파트너십) · Citi(백로그 믹스·ECC 견인) · MS(CCB 가이던스 보수성) | 경쟁 관련 핵심 질문 3개 모두 수치 답변 없음 | 🟡[사실] |

**멍거식 해석**:
- **경쟁사를 말하지 않는 것** 자체는 두 가지로 읽힌다. ① 대기업 ERP 복점의 승자가 굳이 경쟁사를 언급할 이유가 없다(자신감) ② 투자자가 가장 두려워하는 질문(AI·headless)에 답하지 않는 것(회피). **이번 콜은 ②의 흔적이 더 짙다** — headless 질문을 피했다 [의견].
- "선호 모델 없음"은 Microsoft(OpenAI 결합)·Salesforce(자체 에이전트 플랫폼)를 겨냥한 차별화로 읽힌다 🔴[추정]. 멍거식으로는 **보완재(LLM)를 상품화하라**는 정석이다. 반대로 보면, SAP가 독자 AI 우위가 없음을 고백한 것이기도 하다 — 가치가 모델 제공자에게 넘어가면 SAP는 "데이터 보관소"로 격하된다 🔴[추정].
- **Concur는 탄광의 카나리아다.** 03 보고서 §7.1 파괴경로 #3(HCM식 세그먼트 잠식 확산)의 실제 사례가 경영진 입에서 나왔다. 규모는 작지만 "경쟁이 SAP의 주변부부터 뜯는다"는 패턴은 반복되고 있다 🟡[추정]. 신규 진입자의 실명은 콜에서 나오지 않았다 ⬛.

---

## 4. 업계 트렌드

### 4.1 AI 에이전트 · headless · SaaS 디레이팅

- 2026-01~03 "SaaSpocalypse": 소프트웨어 지수 20~30% 하락, 트리거로 1-29 SAP 클라우드 전망과 ServiceNow 실적이 함께 거론됨. Salesforce −30%+, Workday −33% (해당 기간) 🟡[사실].
- Salesforce **Headless 360**(2026-04 TDX): 전 기능을 API·MCP·CLI로 노출, UI 선택사항화. Workday·SAP도 일부 기능 headless 전환 보도 🟡[사실]. Gartner: SaaS 지출 40%가 사용량·에이전트·성과 기반 과금으로 이동 전망 🟡[주장].
- **SAP에의 함의**: headless의 위협은 **사용자 수(seat) 기반 과금의 붕괴**다. SAP 클라우드 ERP도 사용자 기반 과금 요소가 있어 노출이 있다 🔴[추정]. 다만 ERP는 CRM과 달리 **원장(기록 시스템)** 이라, 에이전트가 늘어도 원장을 대체하기보다 원장 호출이 늘어난다 [의견]. Workday GRR 97% · SAP CCB +26%는 **"AI가 기존 앱을 대체 중"이라는 가설을 현재 데이터가 지지하지 않는다**는 반증이다 🟡[추정].
- **하지만 반대로**: 잠식은 이탈(churn)보다 **좌석 수 축소·가격 재협상**으로 먼저 온다. CCB는 계약 갱신 주기만큼 늦게 반응한다(후행 지표). 지금 지표가 깨끗하다고 위협이 없다는 뜻은 아니다 [의견].
- **시장 반응**: SAP ADR 10/20 $228.98 → 10/23 $240.59(+5.1%) 🟡[사실]. 디레이팅 국면에서 SAP는 차별 보상받은 쪽이다.

### 4.2 규제 — EU 반독점 합의(2026-07) 후속

- 합의 내용(AT.40823): 재가입 수수료 폐지 · 미지원기간 소급 유지보수 상한(off-support 요금의 50% 또는 6개월분 중 낮은 쪽) · 랜드스케이프 분할 지원 허용 · 특정 사유(인력 10%+ 감축, 사업부 매각 등) 해지 허용 · **10년·전 세계 적용 · 온프렘만**(클라우드 제외) · 독립 감시인 🟡[사실].
- 업계 반응: DSAG 대표 "제3자 유지보수는 (독일어권에서) 완전한 니치" — 효과는 점진적이라는 관측 🟡[주장]. Rimini Street 등의 합의 후 구체 계약 사례 미확인 ⬛.
- **경쟁 함의**: 합의가 **온프렘에만** 적용되므로, 고객을 클라우드(RISE)로 옮길수록 SAP는 규제 노출에서 벗어난다. 역설적으로 EU 합의는 SAP의 클라우드 전환 유인을 **강화**한다 🟡[추정]. 반대로, 클라우드로 가기 싫은 ECC 잔류 고객에게는 "제3자 지원 + 잔류"라는 합법적 출구가 열렸다 — 이 출구의 사용량은 support 감소율 가속(경영진 가이던스)에 섞여 보이지 않는다 ⬛.

### 4.3 ECC 2027 마이그레이션 수요

- ECC 메인스트림 지원 2027-12-31 종료, 연장 2030-12-31(+2pp 요금) 🟡[사실].
- Citi의 "ECC 마감이 백로그를 얼마나 견인하나" 질문에 수치 답변 없음 🟡[사실] → 가정 #5(2027 이후 자발적 수요) 검증 진전 없음 ⬛.
- CFO: 2027 총매출 성장 가속 가이던스 🟡[주장] — 경영진은 2027 절벽을 보지 않는다고 말한다. 마감 전년도에 가속을 말하는 것은 마감 직전 수요 쏠림(pull-forward)과도 일치하므로 **2028년 이후에 대한 정보는 아니다** [의견].

---

## 5. 레드라인·가정 점검 (경쟁 관련분)

| 항목 | 이번 분기 증거 | 판정 | 신뢰도 |
|---|---|---|---|
| 레드라인 #6 ERP 코어 대형계정 연쇄 탈취 | Oracle SaaS +10%(가속 없음), Workday cRPO 감속, SAP CCB +26% 유지 · Cloud ERP Suite +28% | **미발동** (단 win/loss 직접 데이터 없음) | 🟡[추정] |
| 레드라인 #3 Cloud GM 70% 이하 추세 | 73.9%, 전년 대비 −0.7pp | 미발동 · 방향은 하향 — 다음 분기 감시 | 🟡[사실] |
| 레드라인 #5 EU 여파 이탈 가속 | support −6% cc(전환분과 분리 불가) | 판정 불가 | ⬛ |
| 가정 #6 AI 해자 방어·확대 | Joule 에이전트 수 증가, 상위 50딜 AI 비중 수치 상충, 매출 기여 미공시 | 유지(🟢)하되 근거는 약화 — 수주 비중 확정치 필요 | 🟡[주장] |
| 가정 #7 EU 합의 후 이탈 제한적 | 니치 전망(DSAG), 구체 이탈 데이터 없음 | 🟡 유지(미검증) | 🟡[주장] |

---

## 6. 멍거식 역발상 — 무엇이 SAP를 죽일 수 있는가

> 멍거: *"내가 어디서 죽을지만 알면 된다. 그럼 거기를 안 가면 되니까."*

| # | 파괴 경로 (03 보고서 §7.1 기준) | 이번 실적의 신호 | 방향 | 신뢰도 |
|---|---|---|---|---|
| 1 | 전환 붐 종료 후 성장 정체 | CCB +26% 유지, 2026 가이던스 상단 — 단 2027 이후 정보 없음 | 판정 유보 | 🟡[추정] |
| 2 | 규제발 아프터마켓 개방 | support 감소 가속 가이던스 — 원인 분리 불가 | 판정 불가 | ⬛ |
| 3 | 세그먼트 잠식 확산 | **Concur 출장예약 신규 진입자** — 실제 사례 1건 추가 | 악화 신호(소) | 🟡[주장] |
| 4 | 번들 마진 유출 | Cloud GM −0.7pp(하드웨어·인프라 원가) · 마진 비교군 최하위 | 악화 신호(소) | 🟡[사실] |
| 5 | AI가 워크플로 계층 분리 | headless 질문 회피 · "선호 모델 없음" · 단 CCB에 잠식 흔적 없음 | 중립 | 🔴[추정] |
| 6 | 고객 신뢰 붕괴 | 업리프트 전환 지속, 대형 이탈 보도 없음 | 개선/중립 | 🟡[추정] |

**추가로 본 위험 — 경쟁이 아니라 사이클**:
- Q4가 연간 수주의 ~50% 🟡[주장] · CFO "these interest rates start to develop teeth"(5%+ 금리) 🟡[주장] · Q3 매출채권 높음·회수 강화 🟡[주장]. 경쟁 구도가 멀쩡해도 **Q4 한 분기에 수주가 몰리는 구조**는 매크로 충격에 약하다. 이번 분기 숫자가 좋을수록 Q4의 기대 문턱이 올라간다 [의견].

### 6.1 5년 후 전환점인가?

- **전환점이라고 볼 근거**: (a) 앱 백로그 성장에서 경쟁군 최상위 (b) 경쟁사 중 ERP 코어를 공격할 자원이 가장 큰 Oracle이 자본을 AI 인프라에 쏟고 있다(FCF −$5B) — 앱 가격전 여력이 줄었을 가능성 🔴[추정] (c) EU 합의가 클라우드를 제외해 전환 유인을 강화.
- **전환점이 아니라고 볼 근거**: (a) 성장의 본질이 강제 마감에 의한 자기 전환이라 2028년 이후 정상 성장률은 여전히 미지수 ⬛ (b) 마진은 경쟁군 최하위이며 인프라 원가에 노출 (c) 주변부(HCM·Concur)는 계속 뜯기고 있다 (d) headless·과금 모델 전환은 CCB에 늦게 나타난다.
- **판단**: 이번 분기는 **전환점이 아니라 "기존 궤도의 확인"** 이다. 5년 후를 바꿀 변수는 2028년 Cloud ERP Suite 성장률과 AI 과금 모델의 형태이며, 둘 다 아직 데이터가 없다 [의견].

---

## 7. 판정

### 7.1 경쟁 구도: **유지** (코어 소폭 강화 · 주변부 약화 혼재)

| 축 | 방향 | 근거 |
|---|---|---|
| ERP 코어 (대기업) | 소폭 강화 | Cloud ERP Suite +28% cc vs Oracle SaaS +10%, CCB 감속 없음 |
| 인접 모듈 (HCM·T&E) | 소폭 약화 | Concur 출장예약 신규 진입자, Workday HCM 지배 지속 |
| 마진 구조 (가치사슬) | 소폭 약화 | Cloud GM −0.7pp, 인프라 원가 노출, 마진 비교군 최하위 |
| 규제 (EU) | 판정 불가 | support 감소의 원인 분리 데이터 없음 |
| AI·headless | 중립 (정보 부족) | 핵심 질문 회피, 매출 기여 미공시 |

**강화로 올리지 않은 이유**: 성장 우위가 강제 마감에서 오는지 경쟁력에서 오는지 분리할 수 없고, 총매출 기준으로는 Workday·Salesforce와 같은 대열이다. **악화로 내리지 않은 이유**: 레드라인 #6의 가해자 후보(Oracle·Workday)가 모두 앱에서 가속하지 않았고, SAP 백로그는 감속하지 않았다.

### 7.2 평점

| 차원 | 평점 | 한 줄 |
|---|---|---|
| ERP 코어 경쟁 포지션 | ★★★★★ | 앱 백로그 성장 경쟁군 최상위, 탈취 신호 없음 [의견] |
| 인접 세그먼트 방어 | ★★☆☆☆ | HCM 이미 패배, T&E 신규 진입자 [의견] |
| 가치사슬 마진 방어 | ★★★☆☆ | 성장과 맞바꾼 마진, 인프라 원가 노출 [의견] |
| AI·headless 대응 | ★★★☆☆ | 전략은 합리적(모델 중립), 증거는 부족(수치 회피) [의견] |
| **경쟁 구도 종합** | **★★★★☆** | 지난 보고서(03)와 같은 등급 — 이번 분기가 바꾼 것은 없다 [의견] |

### 7.3 멍거식 총평

> *"Invert, always invert."* — 이번 실적을 뒤집어 보면, SAP를 죽이려면 누군가 대형 ERP 계정을 연쇄로 빼가야 한다. 가장 유력한 후보 Oracle은 앱이 아니라 GPU를 팔고 있고, Workday는 감속 중이며, Microsoft는 아직 숫자를 내지 않았다. **지금 SAP의 적은 경쟁사가 아니라 시간(2027 이후)과 원가(인프라)다.**

> *"좋은 사업은 경쟁자를 걱정하지 않는다. 그러나 현명한 주주는 걱정한다."* 🟡 (원어 출처 미확인 — 멍거 사상의 요약으로 표기) — 경영진이 경쟁사를 언급하지 않은 것은 자신감일 수 있으나, headless 질문 회피는 주주가 대신 걱정해야 할 영역을 남겼다 [의견].

**양면 결론**: 이번 분기는 레드라인 #6에 대한 **반대 증거를 하나 더 쌓았다**(강세 근거). 동시에 마진 유출(#4)과 주변부 잠식(#3)이라는 **완만한 파괴 경로 두 개가 소폭 진행 중**임을 보였다(약세 근거). 03 보고서의 결론 — "망하지 않을 사업이지 이길 사업은 아니다" — 를 수정할 근거는 이번 실적에 없다. 다만 "이길 사업"의 증거에 가장 가까운 숫자(CCB +26% · Cloud ERP Suite +28%)가 두 분기 연속 나왔다는 점은 기록해 둔다 [의견].

### 7.4 다음에 볼 것

1. **6-K 발간 후**: 지역별 수치, S&M·R&D 비율, 매출채권 증가 규모 — 본 보고서 ⬛ 항목 재검토
2. **Microsoft FY27 Q1 Dynamics 성장률**(10월 말) · **ServiceNow Q3'26**(10-28) — 비교표 ⬛ 칸 채우기
3. **Q4'26 CCB** — Q4에 연간 수주 ~50%가 몰린다. CFO가 말한 "24% or so" 근처를 지키는지
4. **Cloud GM** — 2분기 연속 하락이면 인프라 원가가 구조적임을 의미(레드라인 #3 방향)
5. **support 감소 중 제3자 유지보수 이탈분** — 경영진이 분리 공개하는지(가정 #7)

---

## 데이터 출처

- SAP Q3 2026 Quarterly Statement (2026-10-21, PR Newswire 재게재본 via Yahoo Finance) · 3자 콜 전문(Motley Fool·Investing.com) — `reports/SAP/_q3-primary/_q3-primary.md`
- SAP 연간 기준선: SEC EDGAR XBRL (`reports/SAP/_data.md`)
- Oracle FQ1'27 보도자료 (2026-09-10): [placera.se 재게재](https://www.placera.se/pressmeddelanden/oracle-announces-q1-results-driven-by-triple-digit-growth-in-cloud-infrastructure-revenues-20260910) · [oracle.com](https://www.oracle.com/de/news/announcement/q1fy27-earnings-release-2026-09-10/) · [beancount.io 분석](https://beancount.io/blog/2026/09/13/oracle-fy2027-q1-earnings-analysis)
- Workday FQ2'27 (2026-08-27): [newsroom.workday.com](https://newsroom.workday.com/2026-08-27-Workday-Announces-Fiscal-2027-Second-Quarter-Financial-Results) · [MarketBeat 콜 요지](https://www.marketbeat.com/instant-alerts/transcript-workday-q2-earnings-call-highlights-2026-08-27/)
- Salesforce FQ2'27 (2026-08-26): [investor.salesforce.com](https://investor.salesforce.com/news/news-details/2026/Salesforce-Delivers-Record-Second-Quarter-Fiscal-2027-Results/)
- ServiceNow Q2'26 · Q3 일정: [SEC 8-K Q2'26](https://www.sec.gov/Archives/edgar/data/0001373715/000137371526000072/erq2fy26.htm) · [Q3 발표일 공지](https://investor.servicenow.com/news/news-details/2026/ServiceNow-to-Announce-Third-Quarter-2026-Financial-Results-on-October-28/default.aspx)
- Microsoft Dynamics: [FY26 Q1 부문 실적](https://www.microsoft.com/en-us/Investor/earnings/FY-2026-Q1/productivity-and-business-processes-performance) · [FY26 Q2 부문 실적](https://www.microsoft.com/en-us/Investor/earnings/FY-2026-Q2/productivity-and-business-processes-performance)
- SAP Q2'26 CCB €22.9B: [boerse-express](https://www.boerse-express.com/news/articles/sap-aktie-cloud-backlog-waechst-27-prozent-auf-229-milliarden-932299)
- SaaS 디레이팅·headless: [financialcontent](https://markets.financialcontent.com/stocks/article/marketminute-2026-2-16-the-saaspocalypse-ai-agent-revolution-triggers-historic-25-sell-off-in-software-giants) · [cloudmagazin](https://www.cloudmagazin.com/en/2026/03/25/saaspocalypse-why-ai-agents-are-shattering-the-per-seat-cloud-business-model/) · [Gartner](https://www.gartner.com/en/documents/7738957) · [a16z](https://a16z.com/podcast/is-software-losing-its-head/)
- EU 합의: [CIO.com](https://www.cio.com/article/4195520/sap-concedes-to-eu-freeing-cios-from-expensive-support-shackles.html) · [Redress Compliance](https://redresscompliance.com/sap-eu-antitrust-commitments-maintenance-analysis) · [SAPinsider](https://sapinsider.org/blogs/sap-offers-commitments-to-resolve-eu-concerns-over-on-premise-erp-support-practices)
- 차단 소스(WSJ·Reuters·MarketWatch·Barron's) 미사용.

---

## 신뢰도 요약

- 핵심 가정(⚑): ① SAP Q3 클라우드·CCB 수치(보도자료, 6-K 미제출) ② 경쟁사 비교 수치(검색·보도자료 재게재) ③ Cloud GM 하락 원인 = 비용(경영진 주장) — 셋 다 🟡 수준
- 6-K 발간 후 SAP 수치는 🟢로 상향 가능. Microsoft·ServiceNow 칸은 10월 말 발표 후 갱신 필요.

<!-- confidence-summary
high: 1
medium: 74
low: 7
gap: 22
verdict: 보통
-->
