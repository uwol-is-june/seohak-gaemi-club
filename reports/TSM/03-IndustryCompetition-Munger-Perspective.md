# TSMC (TSM) — 산업 구도·경쟁 포지션 분석 (찰리 멍거 관점)

> **작성**: industry-researcher (멍거 시각) | **작성일**: 2026-07-24
> **역할**: 반도체 파운드리 산업 구도와 TSM의 경쟁 해자 평가, 반론·역발상 집중
> **원칙**: 객관성 우선 — 데이터 → 논리 → 결론. 모든 핵심 판단에 반대 근거 병기.
> **주의**: 파운드리 점유율은 출처별 편차가 크다(집계 기준: 전체 파운드리 vs 순수 파운드리, 매출 vs 웨이퍼). 핵심 수치는 복수 출처 병기하고 기준일을 명기했다.

> *"The big money is not in the buying and selling, but in the waiting… but you have to buy the right business at the right price."* — 그리고 멍거는 "가격 결정력(pricing power)이야말로 사업의 질을 판단하는 단 하나의 가장 중요한 결정"이라고 했다. 이 렌즈로 TSM을 본다.

---

## 0. 한눈에 보는 결론 (Executive Summary)

| 차원 | 평점 | 한 줄 결론 |
|------|------|-----------|
| 1. 산업 규모·성장 | ★★★★★ | 파운드리 TAM 2026 ~$185B, 선단 노드 9%+ CAGR. AI가 성장을 재작성 중 |
| 2. 경쟁 구도(점유율) | ★★★★★ | 전체 ~70%, 선단 노드 90%+. 2위 삼성 6.5%와의 격차가 아니라 심연(chasm) |
| 3. 핵심 위협 평가 | ★★★★☆ | 삼성·Intel·SMIC 모두 실질 위협 아님. 단 "느린 잠식" 시나리오는 감시 필요 |
| 4. 세그먼트 구도 | ★★★★★ | 선단 로직+CoWoS에서 사실상 독점. 성숙노드는 中 과잉의 유일한 약점 |
| 5. 산업 트렌드 | ★★★★☆ | 미세화 한계·첨단 패키징 부상은 TSM에 유리. 지정학·온쇼어링은 양날의 칼 |
| 6. 밸류체인 가치 배분 | ★★★★☆ | 이익은 EDA·NVDA·ASML에 더 집중. TSM은 "필수불가결하지만 자본집약" |
| 7. 멍거식 역발상 | ★★★★☆ | 지배력 붕괴 경로는 존재하나 모두 저확률·장기. "이번엔 다르다"의 함정 점검 |

**종합**: TSM은 멍거가 말하는 "great business at a fair price"의 교과서다 — 선단 노드에서 사실상 독점적 가격 결정력을 가지며($30K 2nm 웨이퍼), CoWoS 병목까지 장악해 AI 사이클의 유일한 통행세 징수자다. 다만 멍거라면 반드시 물었을 것이다: (1) 이 이익의 얼마가 자본지출(2026 capex $64B)로 되돌아가는가, (2) 대만 집중 리스크와 온쇼어링 마진 희석은 "invert" 했을 때 얼마나 치명적인가. **해자는 진짜다. 하지만 자본집약도와 지정학은 '완벽한 사업'이 되는 것을 막는다.**

---

## 1. 산업 규모·성장 — TAM과 선단 노드 성장률

### 데이터 (기준일 명기)

| 지표 | 값 | 출처·기준일 |
|------|-----|-----------|
| 파운드리 TAM 2026(E) | $180–202B (컨센서스 중앙값 ~$185B) | Global Market Insights / Mordor / Fortune BI, 2026 발간 |
| 전체 파운드리 매출 Q1 2026 | $47.95B (분기 사상 최대) | TelecomLead / Counterpoint 인용, 2026-Q1 |
| 파운드리 장기 CAGR | 6.9%–12.2% (출처별 편차 큼) | 상동, ~2033-35 전망 |
| 10nm 이하 선단 노드 CAGR | ~9.05% | Global Market Insights, 2026 |
| AI/HPC 침투(TSM 매출 기준) | HPC가 TSM 매출의 **66%** (Q2 2026, 전분기 55%) | TSMC Q2 2026 실적, 2026-07-16 |

### 멍거의 시각

성장률 숫자 자체보다 **성장의 질(quality of growth)**을 본다. 파운드리 전체는 7% 성장이지만, 그 성장의 대부분이 **선단 노드 + AI/HPC**에 집중돼 있고, 그 구간을 TSM이 90%+ 장악한다. 즉 TSM은 "성장하는 산업의 성장하는 부분"을 독점한다. TSM 자신의 매출에서 HPC 비중이 반년 만에 55%→66%로 뛴 것은 시장 성장률(7%)과 무관하게 TSM이 성장 파이의 대부분을 흡수하고 있다는 증거다(2026-07-16 실적).

**반대로(하지만):** 이런 침투율 급등은 **AI 자본지출 사이클의 정점 리스크**를 동반한다. HPC 66%는 집중이자 취약점이다 — 하이퍼스케일러 capex가 꺾이면 TSM 매출의 3분의 2가 직격탄이다. 멍거라면 "성장이 좋을 때가 아니라 나쁠 때 어떻게 되는가"를 물었을 것이다.

**★★★★★** — TAM은 크고 성장하며, TSM은 성장의 프리미엄 구간을 독점. 단 AI 집중은 사이클 리스크를 내포.

---

## 2. 경쟁 구도 — 시장점유율 (선단 vs 성숙 구분)

### 전체 파운드리 점유율 (출처별 병기)

| 기업 | 점유율 (Q1 2026) | 출처 |
|------|-----------------|------|
| **TSMC** | **72.3%** | TelecomLead/Counterpoint, 2026-Q1 |
| Samsung | 6.5% | 상동 |
| SMIC | 5.1% | 상동 |
| UMC | 3.9% | 상동 |
| GlobalFoundries | 3.3% | 상동 |
| HuaHong | 2.5% | 상동 |

> 주: 다른 집계(Taipei Times, 2026-03)는 TSM "2025년 연간 ~70%"로 보도. 순수 파운드리 vs 전체 기준 차이. **핵심은 어느 집계든 TSM 70%±.**

### 선단 노드(7nm 이하) 점유율 — 여기가 진짜 이야기

| 구분 | TSM | 경쟁사 | 근거 |
|------|-----|--------|------|
| 선단 노드(leading-edge) 생산 | **90%+** | 삼성 한 자릿수, Intel 미미 | 다수 산업 리포트, 2026 |
| TSM 매출 내 7nm 이하 비중 | **77%** | — | TSMC Q2 2026 (5nm 33%, 3nm 30%, 7nm 11%, 2nm 3%) |

### 멍거의 시각: "격차가 아니라 심연이다"

멍거는 경쟁 구도를 볼 때 **"2위와의 거리"**를 본다. 여기서 TSM과 삼성의 거리는 72% vs 6.5% — 11배다. 그리고 이것은 정적 격차가 아니라 **누적 우위(cumulative advantage)**의 결과다: 최선단 고객(Apple, NVIDIA)이 TSM에 몰리고 → 물량이 수율 학습을 가속하고 → 수율이 다시 고객을 끌어들이는 플라이휠. 멍거가 말하는 "lollapalooza effect"의 산업판이다. 후발주자는 수율 학습을 위한 물량 자체를 확보할 수 없다.

**반대로(하지만):** 성숙 노드(28nm+)에서는 이야기가 다르다. 여기서 TSM의 점유는 훨씬 낮고, 中 파운드리(SMIC, HuaHong)가 90%가 28nm+에 집중해 물량 공세를 편다. TSM의 해자는 **선단 노드에 국한된 해자**다 — 이것을 전체 사업의 해자로 착각하면 안 된다.

**★★★★★** — 선단 노드에서 사실상 독점. 2위와의 격차가 구조적·자기강화적.

---

## 3. 핵심 위협 개별 평가

### 3-1. 삼성 파운드리 — GAA 2nm 반전 시도

| 항목 | 데이터 | 출처·시점 |
|------|--------|-----------|
| 삼성 2nm(SF2) 수율 | ~55–60% (6개월 전 ~20%에서 급등) | Design-Reuse/TrendForce, 2025-11 ~ 2026-03 |
| TSM 2nm 수율 | ~60–70% (더 안정적) | 상동 |
| Tesla AI6 수주 | $16.5B, Taylor 팹, 2027 양산 | TrendForce, 2025-07 확정 |
| Qualcomm SF2 | 협상 중이나 수율 우려로 TSM 잔류 가능성 | TrendForce, 2026-04 |

**평가**: 삼성의 진전은 **실재하나 불충분**하다. Tesla AI6 수주($16.5B)와 2nm 수율 3배 개선은 진짜 반전 신호다. 하지만 (1) 수율이 여전히 TSM보다 5–15%p 낮고 양산 문턱(70%) 미달, (2) 2026-04 시점에도 Qualcomm이 수율 우려로 이탈 가능성이 보도됐다. **멍거의 판정: 삼성은 "생존 가능한 2번째 소스"가 될 수는 있어도 "왕좌 도전자"는 아니다.** 고객들이 삼성을 쓰는 이유는 삼성이 더 좋아서가 아니라 **TSM 의존도를 낮추고 가격 협상력을 얻기 위해서**다(TrendForce가 명시). 이것은 위협이 아니라 TSM 가격 결정력의 약한 상한선일 뿐.

### 3-2. Intel Foundry — 18A / 14A 외부고객

| 항목 | 데이터 | 출처·시점 |
|------|--------|-----------|
| 18A 수율 | 55–65% (수익 문턱 70–80% 미달, 흑자 수율 연말 목표) | TechPowerUp/Yahoo, 2026 |
| 18A 생산능력 | ~30,000 wpm | 상동 |
| 외부 대형 고객 | **아직 확보 못 함** | Electronics Weekly, 2026-05 |
| 14A | 고객 커밋 2026 하반기~2027 상반기, risk 2028, 양산 2029 | OC3D/Borecraft, 2026 |

**평가**: Intel Foundry는 **자사 제품(Panther Lake)을 돌릴 뿐 외부 대형 고객이 없다**. 심지어 Intel 스스로 18A를 외부에 팔지 말고 14A에 집중할지 재고 중이다(2026 보도). 14A의 외부 고객 양산은 2029년. **멍거의 판정: Intel은 "make-or-break year"를 매년 반복 중이다.** 미국 정부의 전략적 후원(온쇼어링)이 유일한 생명줄이지만, 정부 보조금은 기술 격차를 메우지 못한다. 3–4년 뒤 14A가 성공해도 그때 TSM은 A14(1.4nm)/A10을 양산 중일 것. **추격의 수학이 성립하지 않는다.**

### 3-3. 중국 SMIC — 성숙노드 과잉

| 항목 | 데이터 | 출처·시점 |
|------|--------|-----------|
| SMIC 2025 매출 | 673억 위안 (+16.5% YoY), 순익 50억 위안 | 공시, 2025 |
| 가동률 | 93.5%, 월 100만장(8인치 환산) 초과 | 상동 |
| 매출 구성 | 90%가 28nm+ 성숙노드, 14nm 이하 10% 미만 | 산업 리포트, 2026 |
| 2026 가격 동향 | 성숙노드 up-cycle 진입(전력 관련 10%+ 인상) but 구조적 과잉 병존 | TrendForce, 2026-05 |

**평가**: SMIC의 위협은 **선단 노드가 아니라 성숙 노드 가격**이다. 수출규제로 EUV 접근이 막혀 7nm 이하 대량 양산이 구조적으로 불가능하다. 대신 성숙노드 대규모 증설로 글로벌 성숙노드 가격을 압박한다 — 이것은 TSM의 성숙노드 마진에 드래그이지만, TSM 매출의 77%가 7nm 이하이므로 **영향은 제한적**이다. 오히려 UMC/GF/VIS 같은 성숙노드 전업 파운드리가 더 큰 타격. **멍거의 판정: SMIC는 TSM의 해자(선단)를 건드리지 못하는, 다른 연못의 물고기.** 단 지정학적 와일드카드로서 감시 가치는 있다.

### 위협 종합

**★★★★☆** — 세 위협 모두 현시점 TSM 선단 해자에 실질 균열을 내지 못함. 다만 삼성의 "2번째 소스" 성숙과 中의 성숙노드 압박이 **가격 결정력의 완만한 천장**으로 작용할 수 있어 별 하나 감점.

---

## 4. 세그먼트별 구도

| 세그먼트 | TSM 포지션 | 경쟁 강도 | 평가 |
|----------|-----------|----------|------|
| **선단 로직(≤5nm)** | 90%+ 독점, $30K 2nm 웨이퍼 | 낮음 (삼성 유일 대안) | ★★★★★ 가장 강한 해자 |
| **첨단 패키징(CoWoS)** | 사실상 유일 대량 공급자, 2026 완판·2027 대기 52–78주 | 낮음 (Amkor/삼성 미미) | ★★★★★ AI 병목 = 통행세 |
| **성숙노드(≥28nm)** | 존재감 있으나 저마진, 中 과잉 노출 | 높음 (SMIC/UMC/GF) | ★★★☆☆ 유일한 약한 고리 |

### CoWoS — 멍거가 주목할 "숨은 독점"

CoWoS는 TSM 스토리에서 가장 멍거적인 부분이다. 총 CoWoS 수요는 2026년 **~100만 웨이퍼**(2024년 37만의 3배 수준)로 폭증. TSM은 capacity를 연 80% 증설(2024말 35K wpm → 2025말 75K → 2026말 목표 125–130K wpm)해도 **여전히 부족**. 2027까지 완판, 리드타임 52–78주. NVIDIA가 TSM 첨단패키징의 60%, 상위 3사(NVDA·Broadcom·AMD)가 85%+ 점유. **이것이 진짜 병목이자 가격 결정력의 원천** — AI 붐 전체가 이 한 회사의 한 공정을 통과해야 한다.

**반대로(하지만):** 병목은 양날이다. (1) 완판은 곧 **추가 성장의 상한**이다 — 팔 물건이 없으면 더 못 판다. (2) 고객 3사 집중(85%)은 **협상력 역전** 리스크 — NVDA가 자체 패키징이나 삼성/Amkor로 일부 이원화하면? (3) 병목 해소를 위한 초고속 증설은 **자본 리스크** — AI 수요가 꺾일 때 125K wpm 설비가 부담이 된다.

**★★★★★** — 선단 로직 + CoWoS의 이중 독점이 핵심 해자. 성숙노드 약점은 매출 비중상 경미.

---

## 5. 산업 트렌드

| 트렌드 | 방향 | TSM 영향 |
|--------|------|----------|
| 미세화 한계(무어의 법칙 둔화) | 노드당 비용·난이도 급증 | **유리** — 진입장벽↑, 후발주자 추격 비용 폭증. TSM만 감당 가능 |
| 첨단 패키징 부상(칩렛/CoWoS/SoIC) | 성능 향상의 새 축 | **유리** — TSM이 패키징까지 장악, 해자 확장 |
| 지정학·수출규제 | 美中 디커플링, 中 EUV 차단 | **혼합** — SMIC 선단 차단은 유리, 대만 집중 리스크는 불리 |
| 온쇼어링(美 AZ, 日 구마모토, 獨 드레스덴) | 지역 분산 강제 | **양날** — 리스크 헤지 but 마진 희석·자본 급증 |

### 온쇼어링 — 멍거의 "invert" 포인트

TSM은 애리조나에 누적 투자 $65B+ 이미 집행, 계획 총 $165B(11개 팹 프레임워크에선 $465B 언급). 2번째 팹 건설 완료, Q3 2026 장비 설치. 문제는 **미국 팹의 원가가 대만 대비 높다**는 점 — TSM이 스스로 인정한 마진 희석 요인. 한 분석의 표현대로 "TSM은 경제성이 아니라 지정학적 계산 때문에 자신의 해자를 정의하는 능력을 수출하고 있다."

**멍거식 invert:** "무엇이 TSM을 망칠까"를 뒤집어 물으면 — 대만 유사시가 아니라, **평시의 점진적 마진 희석**이 더 현실적 위협이다. 정치가 강제하는 비효율적 자본 배치(고원가 미국·일본·독일 팹)가 20년에 걸쳐 ROIC를 갉아먹는 시나리오. 대만 침공 같은 극단 시나리오는 확률은 낮고 발생 시 포트폴리오 전체가 문제이므로 개별 종목 분석에서 과대평가하면 안 된다.

**★★★★☆** — 기술 트렌드는 압도적으로 TSM에 유리. 지정학·온쇼어링만 감점 요인.

---

## 6. 밸류체인 가치 배분 — 이익은 어디에 집중되는가

멍거의 핵심 질문: **"이 산업에서 만들어진 이익을 결국 누가 가져가는가?"**

| 구간 | 대표 기업 | 마진 (2026) | 자본집약도 | 가격 결정력 |
|------|-----------|------------|-----------|------------|
| **EDA(설계도구)** | SNPS, CDNS | GM 65–80% | **매우 낮음** | 사실상 복점, 최강 |
| **팹리스(설계)** | NVDA | GM ~75%, OM 매우 높음 | 낮음 | AI 가속기 독점 |
| **장비** | ASML | GM 52–54% | 중간 | EUV 독점(ASML) |
| **장비** | AMAT | GM 49.9%, OM 31.9% | 중간 | 과점 |
| **장비** | KLAC | GM 60.9%, OM 38.2% | 중간 | 검사 과점 |
| **파운드리** | **TSM** | **GM 67.7%, OM 60.3%** (Q2 2026) | **극도로 높음(capex $64B/2026)** | 선단 독점 |

*출처: 각사 Q1–Q2 2026 실적. NVDA·EDA 마진은 산업 컨센서스.*

### 멍거의 판정: "TSM은 훌륭하지만, 가장 좋은 자리는 아닐 수 있다"

밸류체인에서 **가장 순수한 이익**은 자본이 거의 안 드는 EDA(SNPS/CDNS, GM 65–80%)와 팹리스(NVDA)에 있다. 이들은 "설계도와 소프트웨어"를 팔 뿐 팹을 짓지 않는다. ASML은 EUV 독점으로 장비 구간의 왕. **TSM은 OM 60%로 마진 자체는 최상위권이지만, 그 이익의 상당 부분을 매년 $64B capex로 재투자해야 한다.** 즉 TSM의 회계상 이익과 주주가 실제 가져가는 잉여현금(FCF) 사이엔 거대한 자본지출이 놓여 있다.

**멍거 어록의 렌즈**: 멍거는 "자본을 거의 안 쓰고 성장하는 사업(See's Candies형)"을 최고로 쳤다. 그 기준에선 **EDA > 팹리스 > TSM** 순이다. TSM은 "필수불가결하지만 자본을 게걸스럽게 먹는(indispensable but capital-hungry)" 사업이다.

**반대로(하지만):** TSM의 자본집약도야말로 **해자의 원천**이기도 하다. 아무나 $64B/년을 쓸 수 없기에 경쟁이 없다. NVDA·ASML의 고마진은 결국 **TSM 없이는 실현 불가능**하다 — NVDA 칩도 ASML 장비도 TSM 팹에서 웨이퍼가 돌아야 매출이 된다. TSM은 밸류체인의 "물리적 병목"이다. 이익률은 EDA가 높아도 **없어서는 안 되는 정도(criticality)**는 TSM이 최상.

**★★★★☆** — 이익 집중도만 보면 EDA/NVDA/ASML이 자본효율 우위. TSM은 마진은 최상위나 자본집약이 순수 이익을 희석. 단 대체불가성은 최강.

---

## 7. 멍거식 역발상 — TSM 지배력이 무너질 수 있는 경로

멍거: *"Invert, always invert."* TSM이 어떻게 몰락할 수 있는가를 정직하게 나열한다.

| 붕괴 경로 | 메커니즘 | 확률 | 시계 |
|-----------|---------|------|------|
| A. 대만 유사시 | 中 침공/봉쇄로 팹 가동 중단 | 낮음 but 치명적 | 테일 리스크 |
| B. 고객 수직통합 | Apple/NVDA/구글이 자체 파운드리 or 삼성 이원화 | 낮음 | 5–10년 |
| C. 삼성/Intel 수율 캐치업 | 2nm 이하에서 수율 동등화 → 가격 경쟁 | 중간 | 3–5년 |
| D. AI capex 붕괴 | 하이퍼스케일러 지출 급감 → HPC 66% 직격 | 중간 | 1–3년(사이클) |
| E. 온쇼어링 마진 잠식 | 정치 강제 고원가 팹 확대로 ROIC 하락 | 중간-높음 | 10–20년(완만) |
| F. 패러다임 전환 | 실리콘 포토닉스/양자/신소재가 미세화 무의미화 | 매우 낮음 | 10년+ |

### "이번엔 다르다"의 함정은 어디에 있는가?

멍거가 가장 경계한 표현이 "this time it's different"다. TSM 강세론에서 이 함정이 숨을 수 있는 곳:

1. **"AI 수요는 구조적이라 사이클이 없다"** — 가장 위험한 가정. 모든 반도체 사이클은 "이번엔 구조적"이라며 시작해 과잉투자로 끝났다. CoWoS 2026 완판·리드타임 78주는 **공급 부족의 증거이자 과잉 발주(double ordering)의 온상**일 수 있다. 고객 3사 85% 집중은 이들 중 하나만 발주를 조정해도 병목이 순식간에 풀릴 수 있음을 의미. **역사적으로 "완판"은 사이클 정점 근처에서 자주 목격됐다.**

2. **"TSM 독점은 영원하다"** — 반도체 역사에서 영원한 독점은 없었다. Intel도 2010년대 초 압도적이었다. TSM의 우위는 **실행(execution) 우위**이지 특허·네트워크 락인이 아니다. 실행은 한 세대(2–3 노드)의 헛발질로 무너질 수 있다 — Intel이 정확히 그렇게 무너졌다. 삼성이 2nm 수율을 3배 올린 것은 "따라잡을 수 없다"는 명제에 대한 첫 반증 데이터다.

3. **"가격 결정력이 무한하다"** — $30K 2nm 웨이퍼는 강력하나, 인상폭이 루머(50%)보다 훨씬 낮은 실제 10–20%였다는 점(TrendForce 2025-10)은 **고객 저항의 존재**를 시사. 진짜 독점이면 50% 올렸을 것. TSM은 고객(특히 Apple)과의 장기 관계를 위해 스스로 자제한다 — 이는 순수 독점이 아니라 **"규율 있는 준독점"**임을 뜻한다.

### 멍거의 최종 반론 정리

- **낙관 함정 방어**: TSM 강세론은 "AI 영구성장 + 독점 영구성 + 가격 무한"의 3중 가정 위에 서 있다. 셋 다 부분적으로만 참이다.
- **그러나 비관도 과장 금물**: 붕괴 경로 A–F 중 단기(1–3년)에 유의미한 건 D(AI capex 사이클)뿐이다. B·C·E·F는 모두 5년+ 시계이고 저확률. **TSM의 해자는 향후 3–5년 실질적으로 견고하다.**

**★★★★☆** — 붕괴 경로는 정직하게 존재하나 대부분 저확률·장기. 유일한 실질 단기 리스크는 AI 사이클. "이번엔 다르다" 함정은 TSM 자체보다 **AI 수요 영속성 가정**에 있다.

---

## 종합 결론

### 멍거의 3문답으로 요약

**Q1. TSM은 이해 가능하고 예측 가능한 사업인가?**
그렇다. 파운드리 = "AI·컴퓨팅 시대의 유정(oil well)". 선단 노드 90%+, CoWoS 병목 독점. 사업 모델은 단순하고 해자는 눈에 보인다.

**Q2. 지속 가능한 경쟁우위(해자)가 있는가?**
있다. 그것도 **이중 해자**(선단 로직 + 첨단 패키징) + **자기강화 플라이휠**(물량→수율→고객→물량). 삼성·Intel·SMIC 어느 쪽도 3–5년 내 이 해자를 뚫지 못한다. 이것은 멍거가 사랑한 "moat that widens over time"에 가깝다.

**Q3. 그렇다면 완벽한가? — 아니다. 두 가지 흠이 있다.**
1. **자본집약도**: OM 60%의 화려한 마진 뒤에 $64B/년 capex. 순수 이익 효율은 EDA·NVDA·ASML이 더 높다. TSM은 "위대하지만 배고픈" 사업.
2. **지정학**: 대만 집중(테일 리스크) + 온쇼어링 마진 희석(완만한 구조적 드래그). 사업의 질과 무관한 외생 변수가 밸류에이션에 상시 할인 요인.

### 산업 구도 관점 최종 평점: ★★★★☆ (4.5/5)

> **멍거라면**: "이것은 See's Candies가 아니다 — 자본을 게걸스럽게 먹으니까. 하지만 이것은 **파나마 운하**다. AI 시대의 모든 것이 이 좁은 수로를 통과해야 하고, 다른 운하는 없다. 나라면 '완판'과 'AI 영구성장'이라는 단어에 취한 가격이 아니라, **AI 사이클이 한 번 꺾인 뒤의 가격**에 사겠다. 사업의 질은 의심하지 않는다. 의심하는 것은 지금 시장이 붙인 가격표다."

**핵심 감시 지표(향후 12개월):**
1. CoWoS 리드타임 변화 — 단축 시작 = 사이클 정점 경고
2. 삼성 2nm 수율의 70% 돌파 여부 — 돌파 시 가격 결정력 천장 하락
3. HPC 매출 비중 추이 — 66%에서 정체/하락 = AI capex 사이클 전환 신호
4. 애리조나 팹 마진 희석폭 — 온쇼어링 ROIC 드래그의 실측치

---

### 참고 출처 (기준일 명기)

- TSMC Q2 2026 실적 (2026-07-16): 매출 $40.2B, GM 67.7%, OM 60.3%, HPC 66%, 노드별 매출 — [Hardware Busters](https://hwbusters.com/news/tsmc-q2-2026-the-best-quarter-in-its-history-and-two-thirds-of-it-was-ai/), [Investing.com](https://www.investing.com/news/company-news/tsmc-q2-2026-slides-ai-demand-drives-record-margins-hpc-surges-20-93CH-4794789)
- 파운드리 점유율 Q1 2026: TSM 72.3% — [TelecomLead](https://telecomlead.com/semiconductor/global-foundry-market-hits-record-47-95-bn-in-q1-2026-as-ai-chip-demand-drives-growth-tsmc-expands-share-to-72-126247), [Counterpoint](https://counterpointresearch.com/en/insights/global-semiconductor-foundry-market-share), [Taipei Times 2026-03](https://www.taipeitimes.com/News/biz/archives/2026/03/14/2003853777)
- 파운드리 TAM/CAGR: [Global Market Insights](https://www.gminsights.com/industry-analysis/semiconductor-foundry-market), [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/semiconductor-foundry-market), [Fortune Business Insights](https://www.fortunebusinessinsights.com/semiconductor-foundry-market-110068)
- CoWoS 완판·수요: [AI Weekly](https://aiweekly.co/node/6826), [Silicon Analysts](https://siliconanalysts.com/analysis/foundry-allocation-status-q1-2026), [SemiWiki](https://semiwiki.com/forum/threads/cowos-capacity-set-to-skyrocket-by-2026-massive-growth-in-advanced-packaging.21773/)
- 삼성 2nm/Tesla: [Design-Reuse/TrendForce](https://www.design-reuse.com/news/202529730-samsung-reportedly-hits-55-60-2nm-yields-eyeing-an-edge-through-early-gaa-deployment/), [TrendForce 2026-04](https://www.trendforce.com/news/2026/04/14/news-samsung-2nm-yields-reportedly-at-55-below-mass-production-threshold-qualcomm-may-opt-for-tsmc/), [TrendForce Tesla](https://www.trendforce.com/news/2025/07/28/news-samsung-scores-massive-17b-foundry-win-ignites-rumors-on-potential-clients/)
- Intel 18A/14A: [Electronics Weekly](https://www.electronicsweekly.com/foundry/intel-foundry-the-last-chance-2026-05/), [TechPowerUp](https://www.techpowerup.com/350487/intel-solves-18a-yield-issues-production-reaches-30-000-wafers-per-month), [Borecraft](https://borecraft.com/2026/06/17/intels-post-18a-roadmap-hangs-on-landing-14a-foundry-customers/)
- SMIC/성숙노드: [TrendForce 2026-05](https://www.trendforce.com/news/2026/05/22/news-smic-hua-hong-reportedly-lift-prices-amid-ai-driven-capacity-shifts-hua-hong-expects-more-12-inch-hikes-in-2026/), [SemiWiki](https://semiwiki.com/forum/threads/ramp-up-of-chinese-foundry-capacity-in-2025-may-intensify-price-competition-in-mature-process-nodes.22755/)
- 2nm 가격/capex: [Phemex](https://phemex.com/academy/tsmc-2nm-wafer-pricing-nvda-avgo-amd-ai-stack), [TrendForce 2025-10](https://www.trendforce.com/news/2025/10/08/news-tsmc-2nm-reportedly-up-10-20-far-below-rumored-50-3-7nm-to-rise-single-digit-in-2026/), [BigGo capex](https://finance.biggo.com/news/5784aaf1-fcbc-4f76-8856-491b9e7175f6)
- 밸류체인 마진: [Applied Materials Q2 2026](https://ir.appliedmaterials.com/news-releases/news-release-details/applied-materials-announces-second-quarter-2026-results/), [ASML Q1 2026](https://www.asml.com/en/news/press-releases/2026/q1-2026-financial-results), [장비 비교](https://fffinstill.com/blog/semiconductor-equipment-asml-lrcx-amat-klac-compared)
- 지정학/온쇼어링: [Stimson Center](https://www.stimson.org/2025/why-taiwan-fears-america-first-risks-eroding-its-silicon-shield/), [FourWeekMBA](https://fourweekmba.com/ai-tsmc-265-billion-arizona-fdi-sovereignty-ai-stack/)
- SEC 6-K (TSMC 2Q26): [SEC EDGAR](https://www.sec.gov/Archives/edgar/data/0001046179/000104617926000451/a2q26e_withguidancexfinal.htm)
