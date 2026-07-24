# SAP — 산업 구도 & 경쟁 포지션 분석 (찰리 멍거 관점)

**작성일**: 2026-07-24
**대상**: SAP SE (NYSE: SAP — ADR / 프랑크푸르트 원주 SAP.DE)
**분석 프레임**: 찰리 멍거 — "역으로 생각하라(Invert, always invert)", 경쟁 파괴 시나리오 우선, 심리·인센티브·규제의 다층 격자(latticework)
**교차참조**: `reports/SAP/SAP-checklist-20260724.md`, `reports/SAP/SAP-quality-screen-20260724.md`, `reports/Enterprise-Software-industry-20260724.md`(2026-07-23 검증분)
**데이터 기준**: SAP Q2 2026 실적(2026-07-23 발표) 반영. 시장 규모는 3개 리서치사 교차. 통화 주의 — SAP는 유로(€) 결산.

---

## 요약: 한 문장

> **SAP는 대기업 ERP라는 "교체 불가능한 인프라"를 Oracle과 사실상 복점(複占)하는, 이 산업에서 해자가 가장 명확한 사업이다. 그러나 2026년 현재 그 해자의 세 기둥 — ① 2027 지원 종료라는 마이그레이션 강제력, ② 온프레미스 유지보수 아프터마켓 지배력, ③ 좌석·라이선스 기반 가격결정력 — 이 각각 EU 반독점 합의, 제3자 지원, AI 에이전트 상품화에 의해 동시에 시험받고 있다. 멍거식으로 물으면: 해자는 넓지 않고 안정적일 뿐이며, 그 안정성마저 규제가 방금 한 겹 벗겨냈다.**

---

## ⓪ 방법론·데이터 한계 (선고지)

| 항목 | 상태 |
|------|------|
| 시장점유율 데이터 | **정의별로 크게 상이** — 매출가중(달러) vs 설치기반(로고 수)이 다른 그림을 준다. 아래 §2에서 둘을 분리 제시 |
| Q2 2026 실적 | 2026-07-23 발표 보도 기반. 원문 20-F/분기서 일부 미대조 항목은 (추정) 표기 |
| Gartner Magic Quadrant | 2026년부터 **세그먼트별로 분할**(Product-Centric / Service-Centric / Finance). 단일 MQ 없음 — 세그먼트 명시 |
| 밸류에이션 | 일간 변동. checklist(P/E 19.18, fwd 16.7)와 J.P.Morgan 목표가(€175) 병기 |
| 세그먼트 매출 분해 | SAP는 SuccessFactors·Ariba 등을 개별 미공시 → HCM 규모는 애널리스트 추정 |

---

## 1. 산업 규모 & 성장 — ERP/엔터프라이즈 SW TAM

### 1.1 시장 규모 (3개 소스 교차)

| 구분 | 2025 | 2026 | 2034 전망 | CAGR |
|------|------|------|----------|------|
| **ERP SW 전체** (Fortune Business Insights) | — | **$106.2B** | $281.6B | **13.0%** |
| ERP SW 전체 (Precedence Research) | $115.3B | $136.3B | — | ~13~18%(추정) |
| **클라우드 ERP** (Fortune Business Insights) | — | **$76.2B** | $207.6B | **13.4%** |

- 소스 간 절대값은 20~30% 편차(범위 정의 차이). **성장률은 12~14%로 수렴** — 이는 §참조 리서치의 Gartner 전체 SW 지출 +15.1%보다 다소 낮다. **ERP는 성숙 코어 + 클라우드 전환 프리미엄의 합**이며, 폭발적 성장 산업이 아니다.

### 1.2 클라우드 침투율 — 아직 초·중반

- **온프레미스가 2025년에도 시장의 72%** (Fortune Business Insights). 즉 **클라우드 ERP 침투율 ≈ 28%**.
- 함의: 전환은 아직 초·중반. 이것이 SAP의 **강제 마이그레이션 논거의 기반**이자, 동시에 **전환 실패·지연 리스크의 원천**이다.

### 1.3 멍거의 첫 관찰 — "좋은 성장이 아니라 강제된 성장"

> 멍거: *"어떤 사업이 성장하는지보다, 왜 성장하는지를 물어라."*

SAP 클라우드 성장(+22~24%)의 상당 부분은 순수 신규 수요가 아니라 **2027년 ECC 지원 종료라는 마감시한이 만든 강제 전환**이다. 이는 양날의 검이다.
- **긍정**: 예측 가능한 백로그(현재 클라우드 백로그 +26%, 총 €77.3B).
- **부정**: 마감이 지나면(2027 이후) 전환 강제력이 소멸 → **성장률이 어디에 안착하느냐**가 핵심 질문. 전환 붐이 끝난 뒤의 정상 성장률(normalized growth)이 저10%대일지 한 자릿수일지 아직 불확실.

**차원 평점: 산업 규모·성장 ★★★☆☆** — 크고 안정적이나 폭발 성장은 아니며, SAP의 성장은 시한부 촉매에 기댄다.

---

## 2. 경쟁 구도 — 대기업 ERP는 복점, 그러나 로고 수는 다른 이야기

### 2.1 시장점유율 — 정의에 따라 정반대 그림

**⚠️ 핵심 방법론 경고**: 아래 두 표는 같은 시장의 다른 측정이다. 멍거식 다중모델 사고의 교과서 사례 — 하나만 보면 오판한다.

**(A) 달러/매출 가중 — 대기업·지출액 기준**

| 벤더 | ERP 매출 점유율(추정) | 주력 세그먼트 |
|------|---------------------|-------------|
| **SAP** | **~22~23%** | 대기업·글로벌·복잡 제조 |
| **Oracle** | **~12%** | 대기업(Fusion) + SMB(NetSuite) |
| Microsoft Dynamics | ~9% | 중견·SMB |
| 기타(Workday·Infor·Epicor·IFS 등) | 나머지 | 세그먼트별 |

> "Oracle·SAP·Microsoft가 70% 지배"라는 일부 소스 주장은 **정의 과장 가능성** — 위 매출 기준 합은 ~43%다. 다만 **대기업 티어(글로벌 2000급)로 좁히면 SAP+Oracle 복점 성격이 뚜렷**하다.

**(B) 설치기반/로고 수 — 기업 수 기준 (6sense)**

| 벤더 | 로고 점유율 | 고객 수 | 함의 |
|------|-----------|--------|------|
| **Microsoft Dynamics** | **23.55%** | 61,805사 | SMB 다수 → 로고 수 팽창 |
| Workday | 12.71% | 33,607사 | 재무+HCM |
| **SAP** | **11.11%** | 29,050사 | 소수 대형 계정에 매출 집중 |
| Infor | 1.76% | — | 제조 버티컬 |

**멍거의 해석**: SAP는 **로고 수는 3위이나 달러는 1위** — 즉 소수의 초대형 계정에 매출이 집중된 구조다. 이것이 **강점(높은 계정당 매출·전환비용)이자 약점(계정 집중 리스크, 개별 대형 이탈의 파급)**이다. Microsoft는 로고를 압도하나 대부분 저가 SMB로, 대기업 ERP에서 SAP의 직접 위협은 아직 제한적.

### 2.2 세그먼트별 경쟁 구도

| 세그먼트 | 지배자 | SAP 포지션 | 위협도 |
|---------|--------|-----------|--------|
| **대기업 코어 ERP(재무·SCM·제조)** | **SAP ↔ Oracle 복점** | **최강** (S/4HANA) | 낮음 |
| 중견(Mid-market) ERP | Microsoft·NetSuite·Infor·SAP(GROW) | 도전자 | 중간 |
| SMB ERP | NetSuite·Dynamics BC·Epicor | 약함 | (비핵심) |
| **HCM/인사** | **Workday 지배** | **열위** (SuccessFactors) | **높음** |
| 지출/조달(Procure) | SAP Ariba·Coupa | 강함 | 낮음 |
| 워크플로 인접(ITSM→엔터프라이즈) | ServiceNow | (인접 침투 관찰) | 중간 |

- **지역**: SAP는 **유럽·글로벌 복잡 제조에서 압도적**, 북미 중견·HCM에서 열위. 유럽 강세는 규제·데이터 주권·현지 컴플라이언스 지식에 뿌리.

**차원 평점: 경쟁 구도 ★★★★☆** — 핵심 전장(대기업 코어)에서 복점 방어력은 강하나, 인접 세그먼트(HCM·중견)에서 지속적으로 밀린다.

---

## 3. 핵심 경쟁사 개별 위협 평가

### 3.1 Oracle — "복점 파트너이자 유일한 실질 대체재" — 위협 ★★★☆☆

- **Fusion ERP +22%(FY25)**, 클라우드 가이던스 공격적(FY27 Q1 +58~64%, 단 대부분 OCI 인프라).
- **양면성**: Oracle은 SAP의 최대 경쟁자이지만, 동시에 **대기업이 SAP를 안 쓸 때 갈 유일한 동급 대안**이다. 복점은 서로의 프리미엄을 방어한다(암묵적 규율). 진짜 위협은 **신규 대형 전환 딜에서 Oracle이 SAP 이탈 고객을 흡수**하는 경우 — 2027 마감이 이탈 트리거를 만들면 Oracle이 최대 수혜.
- **멍거**: *"복점은 경쟁자가 곧 가격 방패다. 문제는 둘 중 하나가 규율을 깰 때."* Oracle의 공격적 AI 에이전트(Fusion Agentic) + OCI 가격은 규율을 깰 잠재 요인.

### 3.2 Microsoft (Dynamics) — "번들로 밑에서 올라온다" — 위협 ★★★☆☆ (장기 ★★★★☆)

- **Gartner 2026 MQ 3개 부문(Product-Centric·Service-Centric·Finance) 리더** 동시 등재 — 제품 성숙도 입증.
- **번들 위협의 본질**: Dynamics 365 + Azure + Copilot + Power Platform를 **묶어서 할인**. SMB·중견에서 로고를 쓸어담고(23.55%), 그 고객이 성장하며 위로 올라온다(land-and-expand upward).
- **SAP 방어선**: 초대형·글로벌·복잡 제조에서 Dynamics는 아직 기능 열위. 하지만 **AI가 구현 복잡도를 낮추면 이 방어선이 얇아진다** — 이것이 장기 위협을 ★★★★☆로 높이는 이유.
- **아이러니**: SAP RISE의 기본 인프라가 **Azure(MS 코셀 관계)** — SAP가 경쟁자에게 인프라 마진을 넘기는 구조(§6 참조).

### 3.3 Workday — "인접 세그먼트에서 이미 이겼다" — 위협 ★★★★☆ (HCM 국한 시 ★★★★★)

- **HCM 지배**: Workday 23.20% vs SAP SuccessFactors 4.99%. 고객 33,607 vs 7,228. Workday 구독매출 ~$8.0B(+16%) vs SAP HCM 포트폴리오 추정 $3.5~4.0B.
- **평가**: "북미 대기업이 SAP-ERP에 깊이 묶여 있지 않다면 Workday가 기본 선택"(ERP Research). **SAP가 이미 잃은 전장.** Workday는 재무(Financials)로 SAP ERP 코어까지 역침투 시도 중.
- **멍거의 경고**: SAP의 방어 논리는 "우리 ERP를 쓰면 우리 HCM도 쓴다"(번들 고착)이나, **데이터에 따르면 그 고착이 HCM에서는 작동하지 않았다** — 고객은 ERP는 SAP, HCM은 Workday로 분리 채택. 번들 해자가 세그먼트별로 균일하지 않다는 증거.

### 3.4 ServiceNow — "인접에서 워크플로를 흡수" — 위협 ★★☆☆☆ (관찰)

- ServiceNow(CEO Bill McDermott = 前 SAP CEO)는 ITSM→엔터프라이즈 워크플로로 TAM 확장, AI ACV $10억 돌파. **ERP를 직접 대체하진 않으나**, 부서 간 워크플로·업무 오케스트레이션 계층을 장악하면 **SAP가 "기록 시스템"으로 후방 격하**되고 마진 좋은 워크플로/AI 계층을 NOW가 가져갈 수 있다.
- **멍거**: *"당신의 前 CEO가 세운 회사가 당신의 미래 마진을 노린다는 건 시적이다."* — 직접 위협은 낮으나 **가치 배분 재편의 잠재 벡터**로 관찰 필요.

### 3.5 제3자 지원(Rimini Street) + EU 규제 — "숨은 최대 위협" — 위협 ★★★★☆

- 아래 §5.2에서 상술. **경쟁사 아닌 규제·아프터마켓이 SAP 해자의 가장 방어 안 되는 지점을 방금 열었다.**

**차원 평점: 경쟁사 위협 종합 ★★★☆☆** — 코어는 방어되나, HCM(Workday)은 이미 패배, 규제발 아프터마켓 개방이 새 위협.

---

## 4. 세그먼트·지역별 구도

| 구분 | SAP 강도 | 근거 | 추이 |
|------|---------|------|------|
| **대기업 ERP** | ★★★★★ | S/4HANA, 복점, 최강 전환비용 | 유지 |
| 중견(GROW with SAP) | ★★★☆☆ | 표준화 공용클라우드로 진입 확대 중 | 개선 시도 |
| SMB | ★★☆☆☆ | NetSuite·Dynamics에 열위 | 비핵심 |
| HCM | ★★☆☆☆ | Workday에 구조적 열위 | 악화 |
| **유럽·글로벌 복잡 제조** | ★★★★★ | 규제·데이터주권·현지 컴플라이언스 지식 | 유지 |
| 북미 | ★★★☆☆ | Workday·Oracle·MS 경쟁 격화 | 압박 |

- **유럽 강세는 진짜 해자**: GDPR·EU 데이터 주권·산업별 규제 준수는 미국 벤더가 단기 복제 불가. **단, EU 규제가 SAP 자신에게도 칼을 겨눔**(§5.2) — 유럽 홈그라운드가 규제 리스크의 진원이기도 한 역설.

**차원 평점: 세그먼트·지역 구도 ★★★★☆** — 코어·유럽 요새는 견고, 성장 세그먼트(중견·HCM·북미)는 방어.

---

## 5. 산업 트렌드 — AI, 클라우드 전환, 규제

### 5.1 AI (생성형/에이전트) — "가장 방어적, 그러나 상방도 제한"

- **컨센서스 우려**: McKinsey "우리가 아는 ERP의 종말", Goldman "AI가 ERP를 대체하나" — 월가의 실질 공포.
- **반(反)컨센서스 사실**: **기록 시스템(system of record)은 AI 시대 가장 방어적인 카테고리로 재확인됨.** AI 에이전트는 인터페이스·오케스트레이션 계층을 가져가되, 감사·규제·트랜잭션 무결성이 요구되는 기록 계층은 대체 불가. SAP는 이 산업에서 **AI 잠식 노출이 가장 낮은 종목**(참조 리서치 결론과 일치).
- **SAP의 AI 실행 (Q2 2026)**: AI + Business Data Cloud가 **상위 50대 딜의 90%+에 등장**. 연말까지 어시스턴트 50개 + 자율 에이전트 400개+ 출시 계획. Joule Work, Autonomous Suite 런칭. **Dremio(레이크하우스)·Prior Labs(AI 예측) 인수**로 데이터·AI 스택 보강. Palantir와 AI 데이터 마이그레이션 파트너십(GA 2026 Q3).
- **멍거의 균형**: AI는 SAP를 죽이지 못하지만, **살리지도 못한다.** ERP는 좌석당 폭발 성장이 어려운 구조 → AI 수익화가 NOW·PLTR처럼 극적이지 않다. **방어주이지 AI 성장주가 아니다.**

### 5.2 클라우드 전환(RISE/GROW) + 2027 마감 — "강제력의 정점, 그리고 규제의 반격"

**강제 전환의 현주소**:

| 지표 | 수치 |
|------|------|
| ECC 메인스트림 지원 종료 | **2027-12-31** |
| S/4HANA 전환 완료 | **34%만** |
| 2027 전 완료 계획 | 41% |
| 완료 못 할 것으로 인정 | 18% |
| 전환 계획 없음 | 7% |
| **여전히 ECC 잔류 조직** | **2만~2.5만 개** |
| 평균 구현 예산 초과 | +30% (정시 완료는 8%뿐) |

**RISE의 어두운 면 (고객 관점)**:
- 영구 온프레미스 라이선스를 포기하고 **FUE(Full-Use Equivalent) 기반 불투명 구독**으로 전환 → 장기 TCO 통제 불가 우려.
- Clean Core 강제, 커스터마이징 재작업, **BTP 소비 과금 예측 불가**.
- **2027 이후 프로모션 종료 가격 미공개** → 대부분 고객 2026 예산에 미반영("가격 절벽").
- Forrester(Sapphire 2026): 자율 엔터프라이즈 비전은 신뢰할 만하나 **"집중 리스크(concentration risk)"** 경고 — 한 벤더에 스택 전체를 맡기는 위험.

**⚠️ 규제의 반격 — EU 반독점 합의 (2026-07-09) — 이 보고서의 비컨센서스 핵심**:
- EU 집행위, SAP의 **온프레미스 유지보수 아프터마켓 관행**에 대한 반독점 조사 종결. 벌금 없이 **10년 구속력·글로벌 적용 시정 약속**.
- 골자: 고객이 **① 지원 범위 축소, ② 제3자 지원(Rimini Street 등) 이용, ③ 미사용 라이선스 해지, ④ SAP 지원 복귀**를 더 쉽게 할 수 있게 됨.
- **멍거식 함의 (결정적)**: SAP 해자의 세 기둥 중 하나였던 **"아프터마켓 유지보수 지배력·전환 마찰"이 규제로 한 겹 벗겨졌다.** 특히 ECC 잔류 2만~2.5만 조직은 **2027 마감을 앞두고 SAP 계정팀에 대한 협상 레버리지와 이탈 비용이 실질적으로 개선**됐다. 강제 전환의 압력밥솥에 방금 밸브가 생긴 셈 — SAP의 가격결정력·전환 강제력을 직접 약화시킨다.

### 5.3 규제 종합

- EU 데이터 주권 = **SAP에 유리**(유럽 요새 강화).
- EU 반독점 = **SAP에 불리**(아프터마켓·전환 강제력 약화).
- **같은 규제 환경이 방패이자 창** — 멍거의 "모든 것에는 대가가 따른다".

**차원 평점: 산업 트렌드 ★★★☆☆** — AI 방어력 최고(+), 클라우드 강제 전환(+), 그러나 규제·가격절벽·집중 리스크(−)가 상쇄.

---

## 6. 밸류체인 — 가치 배분의 이동

```
═══════════════════════════════════════════════════════════════
 업스트림 — 인프라 (하이퍼스케일러)
═══════════════════════════════════════════════════════════════
  Azure(RISE 기본·MS 코셀) / AWS / GCP
  → RISE 번들 하에서 인프라 마진을 하이퍼스케일러가 가져감
  → SAP는 인프라 재판매 마진만 취득 (Azure 기본선택 = 경쟁자 MS에 이익 이전)
        │
        ▼
═══════════════════════════════════════════════════════════════
 미드스트림 — SAP 플랫폼 (가치의 심장)  ★★★
═══════════════════════════════════════════════════════════════
  S/4HANA Cloud · BTP · Business Data Cloud · Joule/Autonomous Suite
  → 소프트웨어 구독·데이터 중력·AI 계층. SAP 마진의 원천 (GM ~73%)
        │
        ▼
═══════════════════════════════════════════════════════════════
 다운스트림 — 구현·컨설팅 파트너 (가치 유출 지점)
═══════════════════════════════════════════════════════════════
  Accenture($69.7B FY25) · Deloitte · PwC · Capgemini · IBM
  → Gartner 2026 "Cloud ERP Services" MQ 리더: Deloitte·PwC
  → 마이그레이션 1건당 수천만~수억 달러 → SI가 전환 지출의 큰 몫 흡수
```

**멍거의 밸류체인 통찰**:
1. **위(하이퍼스케일러)와 아래(SI)가 각각 마진을 가져간다.** SAP는 라이선스 소프트웨어라는 **가장 마진 좋은 중간층**을 쥐고 있으나, RISE 번들이 인프라를 위로, 구현을 아래로 새게 한다.
2. **SI 의존의 양면성**: Accenture·Deloitte 생태계는 **락인 강화(전환비용↑)**이자 **가치 유출**(전환 예산의 다수가 SAP가 아닌 SI로). 고객 불만("30% 예산 초과")의 상당 부분이 SI 구현 단계에서 발생 → 이는 **SAP 브랜드에 대한 불만으로 귀속**(SAP가 통제 못 하는 평판 리스크).
3. **가장 방어적 위치**: 그럼에도 **데이터 중력(Business Data Cloud)과 기록 시스템**은 밸류체인에서 SAP가 유일하게 대체 불가한 지점. AI 시대 가치가 "데이터·워크플로"로 이동한다면, SAP는 데이터를 쥐고 있다 — 단, 워크플로 계층을 ServiceNow류에 뺏기지 않는 한.

**차원 평점: 밸류체인 포지션 ★★★★☆** — 가장 마진 좋은 중간층 보유, 단 번들 구조가 상·하로 가치 유출.

---

## 7. 멍거식 역발상 (Invert) — SAP는 어떻게 질 수 있는가

> 멍거: *"내가 어디서 죽을지만 알면 된다. 그럼 거기를 안 가면 되니까(All I want to know is where I'm going to die, so I'll never go there)."*

### 7.1 SAP가 지는 시나리오 (파괴 경로)

| # | 파괴 경로 | 메커니즘 | 현재 증거 | 확률 |
|---|----------|---------|----------|------|
| **1** | **전환 붐 종료 후 성장 정체** | 2027 마감 지나면 강제 전환력 소멸 → 클라우드 성장이 한 자릿수로 안착 → 성장주 프리미엄 소멸 | 총매출 +6.4%(참조), Q2 순수 클라우드 +22~24%는 전환 촉매분 | **중~높음** |
| **2** | **규제발 아프터마켓 개방** | EU 합의로 제3자 지원·라이선스 해지 쉬워짐 → 유지보수 수익·전환 강제력 약화, ECC 잔류 2만+ 조직이 저비용 제3자 지원으로 잔류 | EU 2026-07-09 구속력 합의 | **중** |
| **3** | **HCM식 세그먼트 잠식 확산** | Workday가 HCM을 가져갔듯, 인접 모듈이 하나씩 best-of-breed에 뜯김 → SAP는 재무 코어만 남는 "축소된 요새" | Workday HCM 23% vs SAP 5%, CIO "AI + best-of-breed add-on" 트렌드 | **중** |
| **4** | **번들 마진 유출 심화** | RISE가 인프라(하이퍼스케일러)·구현(SI)으로 마진을 계속 새게 함 → 매출은 크나 SAP 귀속 마진 정체 | 2026 영업이익 가이던스 **하향**(Dremio/Prior Labs 희석) | **중** |
| **5** | **AI가 워크플로 계층을 분리** | 에이전트가 인터페이스·오케스트레이션을 장악 → SAP는 후방 DB로 격하, 고마진 상호작용 계층을 NOW·MS·PLTR이 흡수 | 아직 미발생. ServiceNow AI ACV $10억 | **낮음~중** |
| **6** | **고객 신뢰 붕괴(자충수)** | RISE 강매·가격 불투명·집중 리스크 반발 → 대형 계정이 능동적 이탈 계획 | "market voting no on RISE", DSAG/ASUG 불만, BSI 인증 갈등 | **낮음~중** |

### 7.2 "왜 똑똑한 투자자가 안 사는가" — 비관론의 실체

멍거는 반대편이 왜 안 사는지를 반드시 이해하려 한다. 안 사는 이유:

1. **성장 감속이 확인됐다**: Q4 2025 클라우드 백로그 +25%가 컨센서스(+26%)를 하회 → **단일 세션 14~16% 폭락**. J.P.Morgan은 "가속·마진 확장" 강세 논거가 **더는 성립 안 한다**며 Neutral로 강등, 목표가 €260→**€175**.
2. **소프트웨어 약세장 심리**: SaaSpocalypse로 SW 전반이 "가속 아니면 처벌" 국면 → 감속하는 SAP는 심리적 순풍 부재.
3. **가이던스 하향**: 2026 영업이익 가이던스를 M&A 희석으로 **하향**(€11.2~11.8B). 성장 사려 진입한 M&A가 단기 마진을 깎는다는 신호.
4. **밸류에이션 여유 부족**: P/E 19·PBR 3.1은 "방어주"치고 싸지 않다. fwd P/E ~16.7이 유일한 위안.
5. **주가가 이미 고점 대비 −42~50%**: 시장이 무언가를 알고 있다는 신호일 수 있음(멍거는 이를 "무시하되 이유는 파악하라"고 봄).

### 7.3 반대편 — 왜 여전히 매수 논거가 있는가 (양면 제시)

멍거식 균형: 위 파괴 경로에도 불구하고 —
- **복점 + 최강 전환비용 + 무차입 순현금 $12B + FCF €8.4B**는 **파산·영구손상 확률을 매우 낮춤**. 멍거 제1원칙("돈을 잃지 마라")에 부합.
- 파괴 경로 대부분은 **"성장 정체"이지 "사업 붕괴"가 아니다.** 최악조차 캐시카우로의 재분류(checklist 비관 −21.6%)이지 제로가 아님.
- **AI 잠식 방어력이 이 산업 최고** — 파괴 경로 5·6은 확률이 낮음.
- **규제(EU)조차 SAP를 쪼개거나 벌금 부과가 아닌 "행동 시정"으로 마무리** → 지배적 지위 자체는 인정된 셈.

### 7.4 멍거의 최종 판정 (역발상 종합)

> **"이것은 '망하지 않을 사업'이지 '이길 사업'이 아니다."**
>
> SAP의 해자는 **깊지만 넓어지지 않으며(deep but not widening)**, 2026년 들어 그 안정성마저 규제·가격절벽·세그먼트 잠식에 의해 세 방향에서 동시에 시험받고 있다. 멍거라면 이렇게 정리할 것이다:
> - **살 이유**: 무차입·복점·현금창출력이 하방을 방어하는, "죽지 않을" 우량 인프라.
> - **주저할 이유**: 성장 촉매(2027 마감)가 시한부이고, 아프터마켓 규제 개방이 가격결정력을 갉으며, AI 상방은 구조적으로 제한된다. **"싸게 사는 것"이 아니라 "적정하게 사는 것"** — 안전마진이 두껍지 않다.
> - **역발상 결론**: 파괴 경로들은 대부분 **점진적 마진 침식**이지 급성 붕괴가 아니다. 따라서 이 종목의 리스크는 "0이 되는 것"이 아니라 **"기대만큼 복리 성장하지 못하는 것"** — 즉 밸류트랩 위험이지 파산 위험이 아니다.

**차원 평점: 역발상/하방 방어 ★★★★☆** — 파괴 시나리오는 많으나 대부분 완만·비치명적, 재무 요새가 하방을 두껍게 방어.

---

## 8. 차원별 평점 종합

| 차원 | 평점 | 한 줄 요약 |
|------|------|-----------|
| ① 산업 규모·성장 | ★★★☆☆ | 크고 안정적, 폭발 성장 아님. 성장이 시한부 촉매(2027)에 의존 |
| ② 경쟁 구도 | ★★★★☆ | 대기업 코어 복점 방어 강함, 인접 세그먼트는 밀림 |
| ③ 경쟁사 위협 | ★★★☆☆ | 코어 방어, HCM은 Workday에 패배, 규제발 아프터마켓 개방이 새 위협 |
| ④ 세그먼트·지역 | ★★★★☆ | 코어·유럽 요새 견고, 성장 세그먼트 방어 |
| ⑤ 산업 트렌드(AI·클라우드·규제) | ★★★☆☆ | AI 방어력 최고(+), 규제·가격절벽·집중리스크(−) 상쇄 |
| ⑥ 밸류체인 포지션 | ★★★★☆ | 최고 마진 중간층 보유, 번들이 상·하로 가치 유출 |
| ⑦ 역발상/하방 방어 | ★★★★☆ | 파괴 경로 다수이나 완만·비치명적, 재무 요새가 하방 방어 |
| **종합** | **★★★★☆ (하단)** | **"망하지 않을" 우량 인프라, 그러나 "이길" 성장주는 아님** |

---

## 9. 결론 — 멍거 관점의 산업·경쟁 판정

**SAP는 이 산업에서 경쟁 포지션이 가장 방어적인 사업이다.** 대기업 ERP는 Oracle과의 복점이고, 전환비용은 산업 최강이며, AI 잠식 노출은 최저다. 무차입·순현금·73% GM·FCF €8.4B는 영구손상 확률을 극단적으로 낮춘다.

**그러나 멍거식 역발상은 세 가지 경고를 남긴다**:
1. **성장은 시한부다** — 2027 마감이 만든 강제 전환 붐이 끝난 뒤의 정상 성장률이 불확실. Q4 2025 백로그 감속 → 주가 −15%, J.P.Morgan 강등이 이를 이미 반영.
2. **해자가 규제로 얇아졌다** — EU 반독점 합의(2026-07-09)가 아프터마켓 유지보수·제3자 지원·라이선스 해지를 열어 **가격결정력과 전환 강제력을 직접 약화**. 이것이 본 분석의 가장 비컨센서스한 관찰이다.
3. **인접 세그먼트는 이미 진다** — HCM은 Workday에 4:1로 패배. best-of-breed + AI 트렌드가 SAP를 "축소된 재무 코어 요새"로 몰 수 있다.

**투자 함의 (산업·경쟁 차원 한정)**: SAP는 **밸류트랩 위험은 있으나 파산 위험은 없는** 방어적 우량주다. 경쟁 구도가 결정적으로 훼손된 종목이 아니라, **완만한 마진·성장 침식에 노출된** 종목이다. 따라서 이 종목의 승패는 "경쟁에서 지느냐"가 아니라 **"적정 가격에 샀느냐, 성장이 기대만큼 복리로 이어지느냐"**에 달려 있다 — 이는 §밸류에이션(checklist 관문5 ★★★)과 팀 리드의 최종 종합에서 판가름 난다.

> 멍거: *"위대한 사업을 적정 가격에 사는 것이, 적당한 사업을 헐값에 사는 것보다 훨씬 낫다."* — SAP는 전자에 해당한다. 다만 여기서 "위대함"은 **성장의 위대함이 아니라 내구성의 위대함**이다. 그리고 2026년, 그 내구성마저 규제가 한 겹 시험하기 시작했다.

---

## 데이터 출처

**산업 규모·성장**
- [Enterprise Resource Planning (ERP) Software Market Size, 2034 — Fortune Business Insights](https://www.fortunebusinessinsights.com/enterprise-resource-planning-erp-software-market-102498)
- [Cloud ERP Market Growth [2034] — Fortune Business Insights](https://www.fortunebusinessinsights.com/cloud-erp-market-108617)
- [ERP Software Market Size, Share and Trends 2026 to 2035 — Precedence Research](https://www.precedenceresearch.com/erp-software-market)

**시장점유율·경쟁**
- [SAP ERP Market Share — 6sense](https://6sense.com/tech/erp/sap-erp-market-share)
- [Microsoft Dynamics Market Share — 6sense](https://6sense.com/tech/erp/microsoft-dynamics-market-share)
- [Infor ERP Market Share — 6sense](https://6sense.com/tech/erp/infor-erp-market-share)
- [Workday vs SAP SuccessFactors HCM — 6sense](https://6sense.com/tech/human-capital-management/workday-vs-sapsuccessfactorshcm)
- [Workday vs SAP 2026: Independent ERP Comparison — ERP Research](https://www.erpresearch.com/en-us/blog/workday-vs-sap)
- [Oracle expands Fusion Agentic Applications — Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/oracle-expands-fusion-agentic-applications-155800375.html)
- [Microsoft Dynamics 365 named Leader in three Gartner MQ reports — Microsoft](https://www.microsoft.com/en-us/dynamics-365/blog/business-leader/2025/12/01/microsoft-dynamics-365-named-a-leader-in-three-gartner-magic-quadrant-reports-cloud-erp-for-service-centric-enterprises-cloud-erp-for-product-centric-enterprises-and-cloud-erp-finance/)

**SAP Q2 2026 실적**
- [SAP Quarterly Statement Q2 2026 — PR Newswire](https://www.prnewswire.com/news-releases/sap-quarterly-statement-q2-2026-302833633.html)
- [SAP Q2 2026 Cloud Revenue Rises 22% — InfotechLead](https://infotechlead.com/cloud/sap-q2-2026-cloud-revenue-rises-22-as-ai-erp-and-backlog-growth-drive-strong-enterprise-demand-97265)
- [SAP's Cloud Backlog Soars to €77.3 Billion — ad-hoc-news](https://www.ad-hoc-news.de/boerse/news/ueberblick/sap-s-cloud-backlog-soars-to-77-3-billion-yet-the-stock-languishes/69820619)
- [SAP Q2 2026 Earnings: Cloud Backlog Growth Hits 26%, Operating Profit Outlook Cut — BigGo Finance](https://finance.biggo.com/news/US_SAP_2026-07-23)

**클라우드 전환·2027 마감·RISE**
- [SAP 2027 Deadline Nears, a Third of Moves Done — Sentinel](https://sentinel.ht/sap-s4hana-migration-deadline/)
- [RISE with SAP: Cloud ERP Adoption Accelerates Ahead of 2027 Deadline — ERP.today](https://erp.today/rise-with-sap-cloud-erp-adoption-accelerates-ahead-of-2027-deadline-sapinsider-benchmark-report/)
- [RISE with SAP: 10 Things CIOs Need to Know in 2026 — Rimini Street](https://www.riministreet.com/blog/10-things-cios-should-know-about-rise-with-sap/)
- [SAP Sapphire 2026: The Autonomous Enterprise... Concentration Risk — Forrester](https://www.forrester.com/blogs/sap-sapphire-2026-the-autonomous-enterprise-is-credible-but-it-comes-with-concentration-risk/)
- [RISE with SAP Hyperscaler Choice 2026 — SAP Licensing Experts](https://saplicensingexperts.com/blog/rise-with-sap-hyperscaler-choice-the-complete-enterprise-guide-for-2026.html)

**EU 반독점 합의**
- [SAP's EU Settlement Shifts ERP Customer Leverage — Forrester](https://www.forrester.com/blogs/saps-eu-settlement-shifts-erp-customer-leverage/)
- [EU competition decision hands SAP customers more leverage — The Register](https://www.theregister.com/software/2026/07/15/eu-competition-decision-hands-sap-customers-more-leverage-in-contract-talks/5271154)
- [SAP Welcomes European Commission Decision — SAP News Center](https://news.sap.com/2026/07/sap-welcomes-european-commission-decision-concluding-investigation-on-premise-maintenance-support-policies/)

**AI·ERP 트렌드**
- [The end of ERP as we know it: five ways AI is disrupting ERP — McKinsey](https://www.mckinsey.com/capabilities/mckinsey-technology/our-insights/the-end-of-erp-as-we-know-it-five-ways-ai-is-disrupting-erp)
- [ERP in 2026: More AI, more best-of-breed add-ons — CIO](https://www.cio.com/article/4121113/erp-in-2026-more-ai-more-best-of-breed-add-ons.html)
- ["Will AI Replace ERP?" Goldman Sachs Report — Elevatiq](https://www.elevatiq.com/post/will-ai-replace-erp-goldman-sachs-report/)

**밸류체인·컨설팅**
- [Deloitte named Leader in 2026 Gartner MQ for Cloud ERP Services — Deloitte](https://www.deloitte.com/global/en/about/press-room/deloitte-named-leader-in-gartner-cloud-erp-services.html)
- [PwC Leader in 2026 Gartner MQ for Cloud ERP Services — PwC](https://www.pwc.com/gx/en/about/analyst-relations/leader-in-2026-gartner-magic-quadrant.html)

**밸류에이션·애널리스트**
- [SAP SE Stock Forecast — J.P.Morgan downgrade to Neutral, PT €175 — Capital.com](https://capital.com/en-int/market-updates/sap-stock-forecast-06-03-2026)
- [SAP SE (ETR:SAP) Statistics & Valuation Metrics — stockanalysis.com](https://stockanalysis.com/quote/etr/SAP/statistics/)

**면책**: 본 보고서는 리서치 목적 분석이며 투자 권유가 아니다. 시장점유율은 측정 방법(매출 vs 로고)에 따라 크게 달라지며 본문에 병기했다. 밸류에이션 배수는 일간 변동한다. SAP는 유로(€) 결산이며 ADR 투자자는 EUR/USD 변동에 노출된다.
