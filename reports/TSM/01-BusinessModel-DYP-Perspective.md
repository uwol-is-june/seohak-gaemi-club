# TSMC (TSM) — 비즈니스 모델 & MOAT 분석

**관점**: 단융핑(Duan Yongping) — "좋은 사업"과 본분(本分)
**작성**: business-analyst | **기준일**: 2026-07-24
**주가 참고**: TSM ADR ~$415 (시가총액 ~$2.1T 추정: 약 5.19B ADR × $415)

> 단융핑 원칙: "좋은 사업은 차별화되고, 가격을 스스로 정할 수 있으며, 그 우위가 오래간다.
> 그리고 본분(本分)을 지킨다 — 자기가 해야 할 일에 집중하고, 하지 말아야 할 일을 하지 않는다."
> 이 보고서는 시장 컨센서스("TSMC는 기술 해자가 압도적이다")를 **재검증**하고,
> 컨센서스가 놓치는 **비즈니스 모델 규율(本分)이야말로 복제 불가능한 진짜 해자**라는 비컨센서스 논지를 전개한다.

---

## 0. 핵심 데이터 스냅샷 (Q2'26 실적, 2026-07-16 발표)

| 지표 | Q2'26 | YoY | QoQ | 출처 |
|------|-------|-----|-----|------|
| 매출 | US$40.20B (NT$1,270.38B) | +36.0% | +12.0% | TSMC IR / SEC 6-K |
| Gross Margin | **67.7%** | — | (가이드 65.5–67.5% 상회) | TSMC IR |
| Operating Margin | 60.3% | — | — | TSMC IR |
| Net Margin | 55.6% | — | — | TSMC IR |
| EPS | NT$27.25 (US$4.31/ADR) | +77.4% | — | TSMC IR |
| Q3'26 가이드 매출 | US$44.6–45.8B | — | — | TSMC IR |

**웨이퍼 매출 구성 (Q2'26)**
- 노드별: 3nm **30%**, 5nm **33%**, 7nm **11%** → 선단(7nm 이하) **77%**. 2nm 데뷔 분기 **3%**
- 플랫폼별: HPC **~60%+ (약 2/3가 AI)**, 스마트폰 26%, IoT 6%, 자동차 4%
- 지역별(FY2025): 북미 **75%**, 중국 9%, APAC(ex-중국) 9%, 일본 4%, EMEA 3%

**연간 재무 교차검증 (stockanalysis.com, NT$ 기준)**

| 연도 | 매출(NT$M) | GM | OM | NM | FCF(NT$M) | ROE |
|------|-----------|-----|-----|-----|-----------|-----|
| FY2022 | 2,263,891 | 59.6% | 49.5% | 43.9% | 527,927 | — |
| FY2023 | 2,161,736 | 54.4% | 42.6% | 39.4% | 292,151 | — |
| FY2024 | 2,894,308 | 56.1% | 45.7% | 40.0% | 870,171 | — |
| FY2025 | 3,809,054 (~$122B) | 59.9% | 50.8% | 44.5% | 1,002,565 | ~31–35% |
| TTM | 4,440,492 | 64.2% | 56.1% | 50.4% | 1,143,557 | ~40% |

> **교차검증 노트**: FY2025 매출 NT$3.81T ≈ $121–122B (환율 ~31.3), 복수 소스와 오차 1% 이내 일치.
> ROE는 소스별 31.4%(stockanalysis) / 35.4%(financecharts) / ~40%(TTM)로 편차 존재 — 계산 기준(연말 vs TTM) 차이로 판단, "30%대 후반 상승 추세"로 표기.

---

## 1. 비즈니스 모델 본질 — 순수 파운드리의 정의

TSMC는 **순수(pure-play) 위탁생산 파운드리**다. 자기 브랜드 칩을 설계·판매하지 않는다.
이것이 단순한 사업 분류가 아니라 **경쟁우위의 근원**이라는 점이 핵심이다.

- **매출 = 웨이퍼 판매**: 팹리스/IDM 고객의 설계를 실리콘으로 제조. 설계 IP는 고객 소유.
- **선단 집중**: 웨이퍼 매출의 77%가 7nm 이하 선단. 성숙 노드는 점차 규모 축소.
- **AI 편중 심화**: HPC 플랫폼이 매출의 ~2/3. FY2026 매출 성장 가이드를 30%대 → **40%+**로 상향
  ("AI 수요 2030년까지 견조" — CEO 발언, Q2'26 컨콜).

**DYP 시각의 본질 규정**: TSMC의 사업 본질은 "칩을 만드는 것"이 아니라
**"고객과 경쟁하지 않는다는 신뢰(neutrality)를 파는 것"**이다. Nvidia·Apple·AMD가
자사의 가장 민감한 설계 자산을 맡기는 이유는 TSMC가 그 설계로 자기 제품을 만들어
고객을 배신할 유인이 구조적으로 없기 때문이다. → **이것이 6번 항목 본분(本分)의 핵심**.

**★평점: 사업모델 명료성 ★★★★★**
결론: 한 문장으로 설명 가능하고("고객과 경쟁하지 않는 선단 제조 유틸리티"), 25년간 일관됨. 단융핑이 선호하는 "이해 가능한 단순한 사업".

---

## 2. 플라이휠 — 실제 작동하는가? (데이터 검증)

가설: **선단 리더십 → 최우선 고객 확보 → 물량·현금 → R&D·capex → 수율 격차 확대 → (다시) 선단 리더십**

이 플라이휠의 작동 여부를 판별하는 **결정적 증거(the tell)**는 다음이다:
> **막대한 capex 사이클 한복판에서 마진이 "확대"되고 있다.**

통상 자본집약 사업은 대규모 증설 시 감가상각·초기 저수율로 마진이 **압박**받는다.
그러나 TSMC는 정반대다:

| 검증 포인트 | 데이터 | 판정 |
|------------|--------|------|
| 선단 리더십 | 2nm 데뷔, A16(1.6nm) 2026 도입, 수율 ~80% (vs 경쟁 50–60%) | ✅ 확대 |
| 최우선 고객 | Apple·Nvidia·AMD·Qualcomm 모두 N2 선점 계약 | ✅ 독점적 |
| 물량·현금 | FY2025 FCF NT$1.0T, TTM NT$1.14T (증가) | ✅ 강화 |
| R&D·capex | 2026 capex **$60–64B**로 상향(기존 $52–56B) — 경쟁사 총합 초과 | ✅ 압도 |
| 수율 격차 | GM 59.9%(FY25) → **67.7%(Q2'26)**, N2 "무할인" 정책 | ✅ 확대 |

**결정적 관찰**: capex를 사상 최대로 늘리는 와중에 GM이 60%→67.7%로 확대. 이는 플라이휠이
"수사(修辭)"가 아니라 **재무적으로 실증**됨을 의미. 가격결정력 상승분 > 원가 인플레이션.

**반대 근거(양면 제시)**:
- H2'26 2nm 급램프가 GM을 **3–4%p 희석** 예정 (TSMC 자체 가이드) → 플라이휠 초기 국면의 일시적 역풍.
- 해외 팹(Arizona·Japan) 고비용 구조가 클러스터 규모경제(대만 집적)를 부분 훼손 → 장기 마진 상단 제약 가능.
- 고객 집중(Nvidia+Apple 비중 과다 추정) + AI capex 순환성 → 플라이휠은 "AI 수요 지속"이라는 외생 변수에 레버리지됨.

**★평점: 플라이휠 실효성 ★★★★★**
결론: 마진 확대라는 반(反)직관적 증거로 실증됨. 단, "AI 수요 순환"이 유일한 진짜 약한 고리.

---

## 3. MOAT 정밀 평가

### 3-1. 브랜드/가격결정력 — ★★★★★
- N2 웨이퍼 **~$30,000** 책정(N3 $25–27k 대비 10–20%↑, 일부 소스 $20k 기준 50%↑). **"무할인(no-discount)" 정책 공식화**.
- 대체재 부재 → **선단 사실상 독점 가격**. GM 67.7%가 가격결정력의 직접 증거.
- Apple조차 과거 소폭 할인 관행이 N2에서는 축소. → 가격결정력이 최대 고객에게도 관철.

### 3-2. 전환비용 — ★★★★★
- 설계-공정 공동최적화(DTCO), PDK/IP 종속, 재검증(requalification) 비용·시간(수개월~1년+), 테이프아웃 리스크.
- 선단에서 멀티파운드리 전략이 사실상 불가능 → **디자인 윈 = 노드 수명 내내 고착**.

### 3-3. 네트워크효과/생태계 — ★★★★☆
- OIP(Open Innovation Platform): EDA(Cadence·Synopsys)·IP 파트너·OSAT가 TSMC PDK 중심으로 표준화.
- 고객이 많을수록 생태계 성숙 → 신규 고객 진입 용이. 다만 고전적 양면 네트워크효과보다는 "생태계 중력".

### 3-4. 규모의경제 — ★★★★★ (단, ▽ 하방 압력 주시)
- 2026 capex **$64B** — Intel Foundry·Samsung Foundry가 적자를 내는 규모를 TSMC는 흑자로 소화.
- 대만 남부/중부 집적 클러스터의 인력·공급망·전력 효율.
- **하방 요인**: Arizona $265B 등 해외 분산이 클러스터 원가 우위를 희석 → 규모경제의 "질" 변화.

### 3-5. 기술장벽 — ★★★★★ (단, "갱신형" 해자)
- 리더십 2–3년 선행, 수율 ~80% vs Intel 18A 50–60%·Samsung SF2 불안정.
- **주의**: 기술 격차는 "영구"가 아니라 매년 $60B+ capex로 **갱신해야 유지**되는 해자. 자금 유입이 끊기면 침식 가능 → 플라이휠 의존적.

**MOAT 종합: ★★★★★**
5개 차원 중 4개가 만점, 1개(생태계)가 4점. 특히 가격결정력·전환비용의 결합이 단융핑이 말하는
"오래가는 차별화"의 교과서적 사례. 다만 규모경제·기술장벽은 **capex 자가발전**에 의존하는
"갱신형" 해자라는 점을 명시.

---

## 4. 고객/파트너 가치 — 팹리스·하이퍼스케일러에 제공하는 독자 가치

| 고객군 | TSMC가 주는 독자 가치 | 대체 가능성 |
|--------|---------------------|------------|
| Nvidia | 최선단 GPU + **CoWoS 패키징 수직결합** → AI 가속기 물량 = TSMC 캐파에 종속 | 없음(선단+CoWoS) |
| Apple | 무재고 리스크 초선단 물량, 매년 신노드 최우선 배정 | 없음 |
| AMD | Intel 대비 공정 우위를 아웃소싱으로 확보 → 경쟁력의 근원 | 없음 |
| Broadcom | 하이퍼스케일러 커스텀 ASIC(TPU류) 제조 파트너 | 없음 |
| 하이퍼스케일러(Google·Amazon·MS) | 자체 실리콘(TPU/Trainium/Maia)의 제조 기반 | 없음 |

핵심: **팹리스의 경쟁우위 자체가 TSMC 접근권에서 파생**된다. Nvidia의 해자(CUDA+최선단 실리콘)조차
TSMC 선단+CoWoS 없이는 물량 실현 불가. → TSMC는 "AI 밸류체인의 병목이자 필수 유틸리티".

**★평점: 고객가치 독자성 ★★★★★**

---

## 5. 사업 포트폴리오 시너지 — 선단 로직 + CoWoS 첨단 패키징 수직결합

- **CoWoS 캐파 확장**: 2024말 ~35k wpm → **2026말 ~130k wpm** (>80% CAGR 2022–27). 수급 갭 20%→10%(2026말)로 축소 전망.
- **차세대**: CoPoS(Chip-on-Panel-on-Substrate) 파일럿 2027 목표.
- **수직결합의 전략적 의미**: 프론트엔드(선단 로직) + 백엔드(CoWoS 첨단 패키징)를 한 지붕에서 통합 →
  AI 가속기 전체 밸류체인 캡처 + 병목 통제권 → **제2의 가격결정력 원천**.

**비컨센서스 관점**: CoWoS 병목은 컨센서스에서 "곧 해소될 일시적 공급 제약"으로 취급되나,
실제로는 **선단 로직 해자를 패키징까지 연장하는 "제2 해자층"**이다. 다만 갭 축소(20%→10%)가
지속되면 병목發 프리미엄은 점차 정상화될 수 있고, OSAT·Intel/Samsung 패키징 추격이 장기 변수.

**★평점: 포트폴리오 시너지 ★★★★★**

---

## 6. 단융핑 "좋은 사업" 기준 — 본분(本分)을 지키는가?

| DYP 기준 | 판정 | 근거 |
|----------|------|------|
| 차별화 | ✅ 압도 | 유일 선단 공급자, 수율 격차 |
| 가격결정력 | ✅ 압도 | N2 무할인, GM 67.7% |
| 지속가능 경쟁우위 | ✅ 강함(단, 갱신형) | capex 자가발전 플라이휠 |
| **본분(本分)** | ✅ **핵심 강점** | 순수 파운드리 = "고객과 경쟁 안 함"의 규율을 25년 지킴 |

**본분의 진짜 의미**: TSMC의 본분은 "하지 않는 일"에 있다 — 자기 칩을 만들지 않고, 고객과 경쟁하지 않으며,
선단 제조라는 한 우물만 판다. 이 **자기절제(self-restraint)**가 신뢰를 낳고, 신뢰가 최우선 고객을 낳고,
고객이 물량을 낳는다. 이는 단융핑이 강조하는 "本分을 지키면 결과는 따라온다"의 완벽한 실증이다.

---

## 7. 비컨센서스 논점 (A급 정보 풍부도 — "정확하지만 무의미한 결론" 회피)

### 7-1. 삼성·Intel 파운드리 추격 실패는 "기술 문제"가 아니라 "본분(구조) 문제"다 ★핵심 비컨센서스

컨센서스: "삼성·Intel은 수율이 뒤처져 못 따라온다."
**비컨센서스**: 그들의 실패는 **일차적으로 조직 DNA·이해상충 문제**이며, 기술 격차는 그 "결과"다.

- **Samsung**: 자체 칩(Exynos)·스마트폰·메모리 사업을 영위 → 파운드리 고객(Qualcomm·Nvidia)은
  "내 설계가 삼성 제품부문으로 샐 수 있다"는 구조적 불신. Qualcomm 등 대형 외부 고객 확보 실패로
  Intel에 2위 자리마저 위협. Q3'25 점유율 6.8% vs TSMC **71%**.
- **Intel**: IDM 유산 — Foundry가 Intel Products에 종속. 18A 수율 50–60%로 개선됐으나
  TSMC ~80%에 미달, 외부 고객 신뢰 미확보.
- **함의**: 자본·기술은 시간이 지나면 따라잡힐 수 있으나, **"고객과 경쟁하지 않는 중립성"은 사업구조를
  통째로 바꾸지 않는 한 복제 불가**. → TSMC의 진짜 해자는 팹이 아니라 **本分(중립성) 그 자체**.
  단융핑이 볼 진짜 우위는 여기 있다.

### 7-2. CoWoS 병목의 지속성 — 해자인가, 소멸하는 프리미엄인가?

- 병목이 "제2 해자층"으로 기능 중(7-5). 그러나 수급 갭 20%→10% 축소 = **병목發 초과이익은 정상화 방향**.
- 지속성 판정: 로직-패키징 통합 기술 리더십은 유지되나, "부족 프리미엄"은 감소. → 해자는 남되, 병목 렌트는 축소.

### 7-3. 지정학이 사업 "본질"을 바꾸는가?

- 컨센서스: "대만 리스크 = 밸류에이션 할인."
- **비컨센서스**: $265B 미국 투자 + 일본 + 독일 확장으로 TSMC가 **"대만 기업" → "글로벌 전략 유틸리티"**로 전환 중.
  북미 매출 75%, 미국 AI 전체가 TSMC에 의존 → **"too critical to fail"(실리콘 실드 2.0)**.
- **그러나 사업 경제성은 실제로 바뀐다**: 해외 고비용 팹 → 원가 우위(대만 클러스터 집적) 부분 훼손,
  마진 상단 구조적 제약. 즉 지정학은 **비즈니스 모델을 "최저원가 대만 클러스터" → "지리분산 프리미엄 전략공급자"로 이동**시킨다.
  이것이 밸류에이션보다 더 근본적인 변화. 단, 프리미엄 가격결정력이 원가 상승을 상쇄 중(GM 67.7%가 증거).

### 7-4. AI 편중 = "좋은 사업"의 아킬레스건?

- 매출 ~2/3가 AI/HPC. AI capex 순환 시 최대 취약. 단융핑이라면 "수요 지속성"을 가장 먼저 물을 것.
- 양면: (강세) 2030년까지 견조하다는 자체 가이드·40%+ 성장. (약세) 하이퍼스케일러 capex 조정 시 레버리지 역방향.
- 이것이 TSMC 사업의 **유일한 진짜 순환 리스크** — 해자가 아니라 수요 사이클 노출.

---

## 종합 결론

**TSMC는 단융핑 기준 "매우 좋은 사업"이다 — 그러나 시장이 이유를 절반만 안다.**

| 차원 | ★평점 |
|------|-------|
| 사업모델 명료성 | ★★★★★ |
| 플라이휠 실효성 | ★★★★★ |
| MOAT 종합 | ★★★★★ |
| 고객가치 독자성 | ★★★★★ |
| 포트폴리오 시너지 | ★★★★★ |
| 본분(本分) | ★★★★★ |
| **비즈니스 모델 종합** | **★★★★★** |

**컨센서스가 옳은 것**: 기술 리더십·가격결정력·플라이휠은 실증됨(capex 확대 중 마진 확대가 결정적 증거).

**컨센서스가 놓치는 것(비컨센서스 핵심)**:
1. **진짜 해자는 팹이 아니라 本分(중립성)**이다. 삼성·Intel의 실패는 기술이 아니라 "고객과 경쟁하는 구조"에서 온다 —
   이는 사업구조를 통째로 바꾸지 않는 한 복제 불가하며, TSMC가 25년간 지켜온 자기절제의 산물이다.
2. **기술·규모 해자는 "갱신형"** — 매년 $60B+ capex로 재생산해야 유지된다. 플라이휠 의존적이며, 자금 유입의 전제는 "AI 수요 지속".
3. **지정학은 밸류에이션이 아니라 사업 경제성 자체**를 "최저원가 클러스터 → 지리분산 프리미엄 공급자"로 이동시킨다.

**유일한 진짜 취약점**: 해자가 아니라 **AI/HPC 수요 순환 노출**(매출 2/3). 사업 "질"의 문제가 아니라 "사이클"의 문제.

**DYP 한 줄 판정**: "차별화·가격결정력·지속우위·본분 — 네 기준을 모두 만족하는 드문 사업. 사야 할 이유가 아니라
'가격이 맞을 때 사면 되는 사업'. 사업의 질은 논쟁거리가 아니고, 논쟁은 오직 밸류에이션과 AI 사이클에 있다."

---

### 출처
- [TSMC 2Q'26 SEC Form 6-K](https://www.sec.gov/Archives/edgar/data/0001046179/000104617926000451/a2q26e_withguidancexfinal.htm) · [TSMC IR 2Q26 Earnings Release](https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-07/a80d7933be643644081584087731f73b22ea5a2c/2Q26%20EarningsRelease.pdf) · [TSMC PR 3326](https://pr.tsmc.com/english/news/3326)
- [Investing.com — TSMC Q2'26 slides (HPC +20%, 마진)](https://www.investing.com/news/company-news/tsmc-q2-2026-slides-ai-demand-drives-record-margins-hpc-surges-20-93CH-4794789) · [Hardware Busters — 2/3가 AI](https://hwbusters.com/news/tsmc-q2-2026-the-best-quarter-in-its-history-and-two-thirds-of-it-was-ai/) · [TipRanks — 2nm/3nm 수요](https://www.tipranks.com/news/company-announcements/tsmc-posts-77-profit-surge-on-strong-2nm-and-3nm-demand-in-q2-2026)
- [Tom's Hardware — Arizona $100B 추가·capex $64B](https://www.tomshardware.com/tech-industry/tsmc-commits-another-100-billion-to-arizona-for-at-least-four-more-2nm-fabs) · [Taipei Times — capex >$64B](https://www.taipeitimes.com/News/front/archives/2026/07/17/2003860881) · [BigGo — 40%+ 성장 가이드](https://finance.biggo.com/news/US_TSM_2026-07-16)
- [stockanalysis.com — TSM 재무제표](https://stockanalysis.com/stocks/tsm/financials/) · [stockanalysis.com — TSM 통계](https://stockanalysis.com/stocks/tsm/statistics/) · [macrotrends — TSM ROE](https://www.macrotrends.net/stocks/charts/TSM/taiwan-semiconductor-manufacturing/roe)
- [technode — N2 웨이퍼 $30,000](https://technode.com/2025/10/09/tsmc-sets-2nm-wafer-price-at-30000-far-below-earlier-50-increase-speculation/) · [Astute Group — 2nm 독점 가격](https://www.astutegroup.com/news/industrial/tsmcs-2nm-wafer-price-hits-30000-amid-monopoly-concerns/)
- [TrendForce — CoWoS 수급 갭 20%→10%](https://www.trendforce.com/news/2026/06/15/news-tsmc-cowos-supply-demand-gap-reportedly-seen-narrowing-from-20-to-10-by-end-2026-as-capacity-expands/) · [Digitimes — CoWoS 80% CAGR](https://www.digitimes.com/news/a20260410VL204/packaging-capacity-tsmc-nvidia-demand.html) · [FinancialContent — CoWoS 캐파 2배](https://markets.financialcontent.com/stocks/article/tokenring-2026-1-1-the-great-packaging-pivot-how-tsmc-is-doubling-cowos-capacity-to-break-the-ai-supply-bottleneck-through-2026)
- [PatentPC — 파운드리 점유율(TSMC 71%/Samsung 6.8%)](https://patentpc.com/blog/samsung-vs-tsmc-vs-intel-whos-winning-the-foundry-market-latest-numbers) · [Businesskorea — Intel 18A 수율](https://www.businesskorea.co.kr/news/articleView.html?idxno=273037) · [Economy.ac — Intel 60% 수율/삼성 2위 위협](https://economy.ac/news/2026/01/202601286779)
- [StockTitan — TSMC 20-F(지역별 매출)](https://www.stocktitan.net/sec-filings/TSM/20-f-taiwan-semiconductor-manufacturing-co-ltd-files-annual-report-fo-e7792df70159.html) · [stockdividendscreener — 국가별 매출](https://stockdividendscreener.com/technology/semiconductor/tsmc/tsmc-revenue-by-country/)
