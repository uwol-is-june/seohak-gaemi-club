# Alphabet(GOOGL) — 산업·경쟁 구도 분석 (Charlie Munger 시각)

> **역할**: industry-researcher · 정신모델·인버전·경쟁파괴 렌즈
> **정보 등급**: A (컨센서스 반복 금지, 반론 검증 집중)
> **작성일**: 2026-10-28 · **데이터 기준**: Q2'26 실적 + 10/28까지의 2차 보도. **🔴 Q3'26 실적(10/28 장 마감 후) 발표 전 스냅샷**
> **직전판**: 2026-07-28 (본 파일 덮어씀). 이번 판은 그 이후 3개월의 변화에 집중한다.
> **현재가**: $320.58 (team-lead 제공)

---

## 0. 결론 먼저

> "Invert, always invert." — Charlie Munger

| 질문 | 07-28 판 | **10-28 판** |
|---|---|---|
| 핵심 긴장 | 검색 단일 해자 침식 vs 복합 해자(TPU→Cloud→모델→유통) 강화 | **동일. 단 침식 쪽에 "가격표가 붙은 경쟁자"가 처음 등장했다** — OpenAI 광고(2026 목표 $2.5B 🟡), Meta 광고 +26% |
| 가장 큰 구조 리스크 | AdX 강제분할 | **AdX 분할은 9/2 기각으로 소멸** → 리스크가 **검색(DC Circuit 교차항소: Chrome 매각)** 과 **자본효율(FCF 음수·증자)** 로 이동 |
| 종합 ★ | ★★★★☆ | **★★★★☆ (유지)** — 하위 항목 재배치: 검색 해자 하향, TPU 외부판매로 밸류체인 상향 |

**한 줄**: 경쟁에서 지는 회사가 아니라, **이기는 데 드는 비용(capex·증자)이 급등한 회사**다. 멍거식 위험은 "해자가 무너지는 것"보다 "해자를 지키는 값이 해자가 주는 현금보다 비싸지는 것"이다. [의견]

---

## 1. 산업 규모·성장 (TAM)

| 시장 | 규모 | 성장 | 출처·측정 방식 | 신뢰도 |
|---|---|---|---|---|
| 글로벌 디지털 광고 | **≈$0.91T (2026E)** — Google $239.54B ÷ 26.4% 역산 | Google +11.9% · Meta +24.1% (2026E) | eMarketer 2026-04 예측(순광고매출 기준·TAC 차감) | 🟡[추정·역산] |
| 3사 집중도 | Meta+Google+Amazon **62.3%** (2026E) | 2028년까지 상승 예측 | eMarketer | 🟡[사실·예측치] |
| 검색 광고(Google) | ≈$224B (연) | — | ppc.land 헤드라인(측정 기준 미공개) | 🔴[주장] |
| 클라우드 인프라 | **Q2'26 분기 $143B** (연환산 ≈$572B) | **+43% YoY — 8년 내 최고** | Synergy Research 1차 릴리스(IaaS·PaaS·호스티드 프라이빗) | 🟢[사실] |
| AI 가속기 | NVIDIA 출하 점유 >80% | — | 2차 분석(측정기관 미상) | 🔴[주장] |
| 로보택시(Waymo) | 주 50만+ 유료 운행(2026 중반) · 목표 연말 주 100만 | 2→3개월마다 2배(2026 초 보도) | Waymo 발표 인용 2차 보도 | 🟡[사실] |

**관찰 [의견]**: 07-28 판의 클라우드 TAM "~$400B 런레이트"는 **과소 추정이었다** — Synergy 1차 데이터로 연환산 $572B, 성장률 +43%. 반면 광고 TAM은 성숙(전체 ~10%대)인데 **그 안에서 Meta가 Google보다 2배 빨리 큰다**. 성장 무게중심의 이동(광고→클라우드)은 07-28 판 판단 그대로 강화됐다.

**반대 근거**: 클라우드 +43%는 AI 학습·추론 수요가 **차입·지분 조달로 지탱되는 구간**의 숫자다(AI-Infrastructure 보고서 1.4: ORCL BBB-, CRWV 스프레드 15%, Meta 외부 지분 조달). 수요가 아니라 조달이 먼저 꺾이면 TAM 성장률이 급감한다. [추정]

**★ 산업 규모·성장: ★★★★☆** — 클라우드 TAM 상향은 플러스, 광고 성숙 + 조달 의존 성장은 감점.

---

## 2. 경쟁 구도

### 2-1. 검색 — "점유율"이라는 숫자가 세 개다

| 측정치 | 값 | 측정 방식 | 신뢰도 |
|---|---|---|---|
| StatCounter 미국 검색엔진 점유 | **85.76%** (10/21 월누적) · 9월 85.19% · 8월 86.01% · Bing 9.55% | 페이지뷰 기반 검색엔진 리퍼럴 | 🔴[주장 — 예측시장 페이지 인용, StatCounter 원문 미확인] |
| 선호 검색엔진 응답 | 70%(저점) → **78%**(2026-08) | 설문 | 🟡[논제 §A6.2] |
| AI 리퍼럴 트래픽 내 점유 | ChatGPT 86.7% → **64.5%** · Gemini 5.7% → **21.5%** (1년) | AI 챗봇발 리퍼럴 | 🟡[2차 집계] |
| AI 검색 전체의 검색 리퍼럴 비중 | **<1%** | BrightEdge | 🟡[사실] |
| "모든 디지털 쿼리" 중 ChatGPT | ≈17% | 정의 불명 | 🔴[주장] |

> ⚠️ 위 수치들은 서로 다른 분모를 쓴다. "Google 점유 70% 후반 회복"(설문)과 "85%대"(StatCounter)는 모순이 아니라 **측정 대상이 다르다**. 어느 숫자도 **상업적 의도 쿼리(광고 단가가 붙는 쿼리)의 이탈**을 직접 재지 않는다 — 이것이 진짜 공백이다. ⬛

**비컨센서스 관찰 [의견]**: 시장은 "AI 검색이 Google 쿼리를 빼앗는가"를 묻는다. 데이터는 **쿼리는 거의 안 빠졌다**(StatCounter 85%대 안정, AI 리퍼럴 <1%)고 말한다. 그러나 이것은 **잘못된 질문**이다. 위협은 쿼리 수가 아니라 **광고주 예산의 대안이 생긴 것**이다 — OpenAI는 2026-02 광고 파일럿, 05-05 Ads Manager 셀프서브, 4월 CPC 입찰 도입 🟡. 경쟁자가 "검색 대체재"에서 **"검색 광고 대체 매체"**로 바뀌는 순간이 2026년이다.

**반대 근거**: OpenAI 2026 광고 목표 $2.5B 🟡는 Google 검색 광고(연 ~$224B 🔴)의 **약 1%**. CPM이 $60 → $25로 떨어지고 최소 집행액이 $200K → $50K로 낮아진 것 🟡은 **수요가 아니라 공급 과잉의 신호**로 읽을 수 있다. 2030년 $100B 목표는 투자자 대상 전망 [주장]이며 검증 불가.

### 2-2. 디지털 광고 — Meta와의 성장 격차가 벌어지고 있다

| 플레이어 | 2026E 순광고매출 | 점유 | 성장 | 최신 분기 실측 |
|---|---:|---:|---:|---|
| **Meta** | $243.46B | 26.8% | +24.1% | **Q3'26 매출 ≈$64.6B +26%, 노출 +10% · 단가 +14%** 🟡(10/21 발표, 2차 요약) |
| **Google** | $239.54B | 26.4% | +11.9% | Q2'26 검색 +17% 🟡 · YouTube 광고 $11.1B +13% 🟡 · Q3 ⬛(미발표) |
| **Amazon** | $82.07B | 9% | +19.6% | Q3 ⬛(10/29 발표 예정) |

출처: eMarketer 2026-04 예측 🟡 (Reuters 신디케이트 경유 — Reuters 원문은 사용 금지라 MediaPost·TheNextWeb 경유 확인).

**멍거식 해석 [의견]**: Meta의 Q3 **단가 +14%**가 핵심이다. 단가 상승은 광고주가 "Meta의 AI 타게팅이 전환을 더 잘 만든다"고 투표한 것이다. Google의 무기는 "의도(intent)"였고 Meta의 무기는 "예측"이었는데, **AI가 예측의 품질을 의도의 품질에 근접시키고 있다**. 이것이 Google 광고 해자에 대한 가장 과소평가된 위협이다 — OpenAI보다 Meta다.

**반대 근거**: Meta는 같은 분기 FCF **−$2.1B**, capex $34.9B, 주정부 합의 비용 $9.9B 🟡. Meta의 성장도 공짜가 아니다. 또 eMarketer 예측은 Google 검색 +17%(Q2 실측)보다 낮은 +11.9%를 잡아 **Google을 과소 예측했을 가능성**이 있다 [추정]. 1위 역전 폭(1.6%p)은 작아 Q3·Q4 실측으로 뒤집힐 수 있다.

### 2-3. 클라우드 — Synergy 1차 데이터

| 플레이어 | Q2'26 점유 | Q2'25 점유 | 분기 매출 성장 | 비고 |
|---|---:|---:|---:|---|
| AWS | **28%** | 30% | +37% 🟡 | 1위 유지, 점유 −2%p |
| Azure | **20%** | 20% | +43% 🟡 · Q1 FY27 가이던스 **+45%(cc)** 🟡 | **오늘(10/28) 장 후 발표 — 미반영** ⬛ |
| Google Cloud | **15% (사상 최고)** | 13% | +81.8% (회사 보고) | 영업이익률 35.6% · 백로그 $514B |
| Oracle · CoreWeave | ⬛ | ⬛ | ⬛ | Synergy 릴리스 미분리. ORCL BBB-·CRWV 스프레드 15%(AI-Infra 보고서) 🟡 |

출처: Synergy Research 2026-07-30 🟢 (점유) · 성장률은 2차 집계 🟡.

> ⚠️ **두 숫자를 섞지 말 것**: Alphabet의 "Google Cloud 매출 +81.8%"에는 Workspace 등 SaaS가 포함되고, Synergy의 15%는 IaaS·PaaS 인프라만 잰다. GCP 인프라만의 성장률은 ⬛.

**관찰 [의견]**: 3위가 1위보다 2배 이상 빨리 크며 점유를 매년 2%p 가져온다. 07-28 판의 "lollapalooza 후보 1번" 판단은 1차 데이터로 확인됐다.

**반대 근거**: CFO가 Q3 **외부 임차 용량 확대 → 단기 마진 압박**을 예고 🟡(논제 §A8.1). 즉 Google도 자체 용량이 부족해 **남의 데이터센터를 빌리고 있다** — "TPU 원가우위"가 모든 매출에 적용되지는 않는다. 백로그 $514B 중 단일 고객(Anthropic 등) 집중도는 ⬛.

### 2-4. AI 모델·어시스턴트

| 지표 | 값 | 출처 | 신뢰도 |
|---|---|---|---|
| ChatGPT WAU | 9억+ (2026-02) | OpenAI 발표 인용 | 🟡 |
| Gemini의 AI 리퍼럴 점유 | 5.7% → 21.5% (1년) | 2차 집계 | 🟡 |
| Gemini MAU 최신치 | ⬛ (07-28 판 6.5억은 2025-11 수치) | — | ⬛ |

**관찰**: 07-28 판의 "선발주자 프리미엄 붕괴" 판단 유지. 다만 **증권 집단소송**(Gemini 3.5 Pro 진척 허위표시 주장, 대표원고 마감 12/1) 🟡[원고측 보도자료]은 모델 경쟁에서 Google이 "따라잡는 쪽"이었다는 시장 인식을 보여준다 — 주장 단계.

**★ 경쟁 구도: ★★★★☆** — 클라우드 점유 상승(🟢 확인)이 광고 성장 격차 확대(Meta 2배)를 상쇄.

---

## 3. 핵심 경쟁사별 위협 평가 (★ = 위협 크기, 높을수록 위협)

| 경쟁사 | 주 전선 | 위협 | 07-28 대비 | 근거 |
|---|---|:-:|:-:|---|
| **Meta** | 광고 예산 | ★★★★☆ | ➖ | Q3 +26%, 단가 +14% 🟡. Google 대비 성장 2배. 단 검색·클라우드 부재, FCF 음수 |
| **OpenAI** | 검색 광고 · 상업 쿼리 | ★★★☆☆ | ⬆ (매체화) | 9억 WAU + 광고 셀프서브 출시. 매출 규모는 Google 검색의 ~1% 🟡. 자금 의존(비상장·지속 조달) |
| **Microsoft** | Azure · Copilot · Bing | ★★★☆☆ | ⬇ | Bing 미국 9.55% 🔴 정체. Azure 점유 20% 정체(Synergy) — Google이 Azure보다 점유를 더 빨리 가져온다. Copilot 유료 3천만석+ 🟡은 Workspace에 위협 |
| **Amazon** | 리테일미디어 · AWS | ★★★☆☆ | ➖ | AWS 점유 −2%p(최대 수혜자는 Google). 광고 +19.6%E. Anthropic 주 학습 파트너는 여전히 AWS 🟡 |
| **Perplexity** | 답변 엔진 | ★☆☆☆☆ | ⬇ | AI 리퍼럴 전체가 <1% |
| **TikTok** | 동영상·숏폼 광고 | ★★☆☆☆ | ⬛ | 신규 데이터 미확보 |
| **NVIDIA** | 가속기(공급자 겸 경쟁자) | ★★☆☆☆ | ⬇ | Google의 TPU **외부 판매** 개시 보도 🟡 — 공급자 협상력을 약화시키는 쪽은 Google |
| **Apple** | 기본검색 배분 · 디바이스 | ★★★☆☆ | ⬛ | Siri-Gemini 출시 상태 미확인 ⬛. DC Circuit 교차항소가 기본검색 지불 금지를 다시 요구 🟡 |

**비컨센서스 [의견]**: Citizens JMP(10/22, 목표가 $515→$450, Outperform 유지 🔴 단일출처)는 "AI 에이전트 검색 경쟁"을 이유로 들었다. 데이터로 보면 **쿼리 측 위협(OpenAI·Perplexity)은 아직 수치에 안 잡히고, 예산 측 위협(Meta)은 이미 수치에 잡힌다**. 시장이 경계하는 대상과 실제로 돈을 가져가는 대상이 다르다.

**★ 경쟁사 위협 종합(방어력 기준): ★★★★☆** — 4개 전선 전체를 위협하는 단일 경쟁자 없음(07-28 판 유지).

---

## 4. 세부 시장별 구도

| 시장 | Alphabet 위치 | 3개월 변화 | ★(포지션) | 핵심 리스크 |
|---|---|---|:-:|---|
| **검색** | 쿼리 지배(StatCounter 85%대 🔴) | 점유 안정, OpenAI 광고 매체화 | ★★★★☆ (⬇ from 5) | 상업 쿼리의 에이전트 이전 · Chrome 매각 항소 |
| **YouTube/동영상** | 美 TV 시청 1위(Nielsen, 07-28 판) | 신규 데이터 없음 | ★★★★☆ | eMarketer가 언급한 YouTube 대상 판결(내용 ⬛) |
| **Cloud** | 3위·점유 15% 사상 최고 🟢 | +2%p YoY | ★★★★★ | 외부 임차 마진 압박 · 고객 집중 ⬛ |
| **AI 모델(Gemini)** | 리퍼럴 점유 21.5% 🟡 | 상승 지속 | ★★★★☆ | 증권소송(주장 단계) · 모델 세대 교체 경쟁 |
| **TPU/반도체** | 자체 설계(Broadcom 제조) | **외부 판매 개시**(TPU 8t/8i) 🟡 · Anthropic 3.5GW(2027~, Broadcom 공시) 🟡 · Meta 계약(확정/잠정 보도 상충) 🔴 | ★★★★★ | 고객 집중 · Anthropic은 Trainium·NVIDIA 병행 |
| **Android/디바이스** | 모바일 OS 지배 | EU DMA €890M 중 Play €430M 🟡 | ★★★★☆ | 앱 유통 규제 |
| **Waymo** | 美 로보택시 선두, 주 50만+ 🟡 · 10개 도시 | Apollo Go와 규모 비슷(~50만/주) 🟡 | ★★★★☆ | 2026-05 SW 리콜 🟡 · 연말 100만 목표 미달 가능 |

---

## 5. 산업 트렌드

### 5-1. AI 답변·에이전트 검색 → 쿼리 수 · 광고 단가

| 경로 | 쿼리 수 영향 | 단가 영향 | 현재 증거 |
|---|---|---|---|
| AI Overviews(자기잠식) | 중립~증가 | 불확실 | Q2 검색 +17% 🟡 — 단 쿼리/단가 분해 미공시 ⬛ |
| 외부 챗봇(ChatGPT) | 정보성 쿼리 일부 이탈 | 상업 쿼리는 아직 Google | AI 리퍼럴 <1% 🟡 |
| 에이전트 커머스(대리 구매) | **상업 쿼리 자체가 사라질 수 있음** | 광고 → 수수료 모델로 전환 압력 | 수치 증거 ⬛ |

**핵심 [의견]**: Google은 쿼리 수와 단가를 분리 공시하지 않는다(유료 클릭·CPC 성장률 공시 중단 여부 확인 필요 ⬛). 따라서 **"검색 +17%"가 쿼리 증가인지 단가 인상(가격결정력 소진)인지 외부에서 구분할 수 없다**. 후자라면 해자의 수확기(harvesting)이고, 멍거식으로는 경고 신호다. 이 공백은 Q3 콜에서 확인할 1순위 질문이다.

### 5-2. 규제 — 리스크가 광고에서 검색으로 이동

| 사건 | 상태 | 영향 | 신뢰도 |
|---|---|---|---|
| AdX 구조분할 | **9/2 기각**, 행태적 시정만 | 레드라인 #4 영구 미발동(지방법원) | 🟡[논제 §A6] |
| 검색 사건 DC Circuit | Google 1월 항소 · DOJ·주정부 **2/3 교차항소(Chrome 매각·기본검색 지불 금지 재요구)** · 판결까지 ~1년 | **현재 최대 구조 리스크** | 🟡[다수 2차] |
| EU DMA | **€890M 벌금**(검색 €460M + Play €430M), 60일 내 시정 미이행 시 매출 최대 5% 추가 | 금액은 비중요(연 매출 $403B의 ~0.25%), 시정 명령이 실질 | 🟡[2차 다수] |
| EU 검색데이터 공유 | 2027-01 시행 전 | 가정 #7 | 🟡 |

### 5-3. 신규 진입자
- **OpenAI 광고**(위 2-1). **Anthropic**은 경쟁자이자 TPU 최대 고객 — 경쟁자의 성장이 Google Cloud 매출이 되는 구조 [사실 구조 · 규모 🟡].

**★ 산업 트렌드 대응: ★★★★☆** — 규제 리스크 축소(AdX)와 신규 광고 경쟁자 등장이 상쇄.

---

## 6. 밸류체인 — 가치는 어디에 쌓이는가

```
[전력·DC]          [반도체]                 [클라우드]           [모델]            [앱·유통]
CEG 3,590MW 🟡  →  NVIDIA(>80% 🔴)      →  AWS 28/Azure 20/  →  OpenAI·Gemini·  →  검색·YouTube·
외부 임차 용량       vs TPU(외부판매 개시)     GCP 15% 🟢           Anthropic·Meta       Android·Chrome
병목·조달 의존       Broadcom 제조            +43% 시장            가격 하락 경쟁       광고·구독 수익
```

| 층 | 현재 가치 축적 | 근거 |
|---|---|---|
| 전력·DC | **병목 → 높음** | AI-Infra 보고서: 전력장비가 최적 섹터. Google이 CEG와 장기 PPA 🟡 |
| 반도체 | **최고 (NVIDIA)** | 가속기 출하 >80% 🔴. TPU 외부판매는 이 층의 마진을 일부 Google로 이전하려는 시도 |
| 클라우드 | 높음·상승 | GCP 마진 35.6%. 단 조달 비용 상승 |
| 모델 | **낮음·하락** | 경쟁 6~7개 진영, 가격 하락. 독자 모델 업체는 FCF 음수 |
| 앱·유통 | 높음(기존 해자) | 검색·YouTube 현금흐름이 전 층의 자금원 |

**멍거식 판단 [의견]**: 가치가 쌓이는 곳은 **양 끝(전력·반도체 / 유통)** 이고 가운데(모델)는 상품화 중이다. Alphabet은 **양 끝 모두에 발을 걸친 유일한 기업**이다 — 칩(TPU)과 유통(검색·Android). 3개월 사이 가장 중요한 변화는 TPU가 **원가 절감 도구 → 외부 판매 상품**으로 바뀐 것이다 🟡. 성공하면 NVIDIA가 가져가던 층의 가치 일부를 직접 확보한다.

**반대 근거**: 외부 판매 보도는 2차 출처뿐이고, Meta 계약은 "확정"과 "잠정"이 상충한다 🔴. Anthropic 계약(3.5GW, 2027~)은 Broadcom 공시 🟡로 확인되나 Anthropic은 AWS Trainium·NVIDIA를 병행한다 — **TPU가 표준이 아니라 "제2 공급원"** 일 가능성 [추정]. 또 TPU를 외부에 팔면 Google Cloud가 독점하던 원가우위를 경쟁 클라우드·고객에게 나눠 준다.

**★ 밸류체인: ★★★★★** — 양 끝 동시 보유 + TPU 상품화.

---

## 7. 멍거식 인버전 — "Alphabet이 2036년에 실패했다면 왜인가?"

| # | 실패 경로 | 현재 증거 (지지) | 현재 증거 (반박) | 진행도 |
|:-:|---|---|---|:-:|
| 1 | **자본 소각**: AI capex의 ROIC < 자본비용. "복리 기계 → 인프라 건설사" 전환 후 회수 실패 | H1'26 조달 $105.8B · 자사주 $0 · Q2 FCF −$5.9B 🟡 · 2026 capex $195~205B 🟡 · FY27 "대폭 증가" 🔴 | Cloud 백로그 $514B · 마진 35.6% · 버크셔 $10B 인수(§A0) | 🟠 **가장 진행됨** |
| 2 | **상업 쿼리의 에이전트 이전**: 사람이 검색하지 않고 에이전트가 구매 → 광고 경매가 수수료로 대체 | OpenAI 광고·CPC 입찰 🟡 · Citizens JMP 하향 🔴 | AI 리퍼럴 <1% · 검색 +17% · StatCounter 85%대 | 🟡 초기 |
| 3 | **광고 예산의 Meta 이동**: AI 예측 타게팅이 의도 기반 검색을 대체 | Meta 단가 +14%, 성장 2배, 광고 1위 역전 예측 🟡 | Google 절대 이익 규모·검색 +17% | 🟡 진행 중 |
| 4 | **규제 해체**: Chrome 매각·기본검색 지불 금지 | DOJ 교차항소 계류 🟡 · EU DMA €890M + 시정 명령 🟡 | AdX 분할 기각(9/2) · 지방법원은 Chrome 매각 거부 | 🟡 ~1년 내 결론 |
| 5 | **인센티브 실패**: 창업자 의결권 지배 하에서 "모든 층을 다 하겠다"는 제국 건설이 자본규율을 이김 | 자사주 중단 + ATM $40B 승인 🟢(논제 §A0, SEC 원문) | 버크셔가 동일 자금조달에 동참 | 🟡 감시 |
| 6 | 상품화: Gemini가 모델 경쟁에서 낙오, TPU는 NVIDIA에 밀림 | 증권소송 주장 🟡 | Gemini 리퍼럴 점유 급등 · TPU 외부 수요 | ⚪ 약함 |

**인버전 결론 [의견]**: 07-28 판은 "가장 큰 리스크는 규제"라 했다. **이번 판은 순위를 바꾼다 — 1위는 경로 #1(자본 소각)이다.** 경쟁 경로(#2·#3)는 "아직 숫자에 덜 잡혔다", 규제 경로(#4)는 "가장 큰 다리가 잘렸다". 반면 자본 경로는 **이미 숫자(FCF 음수·증자·자사주 0)로 진행 중**이고 반증은 아직 미래 현금흐름(백로그)뿐이다.

> "Show me the incentive and I will show you the outcome." — 하이퍼스케일러 4사가 모두 "덜 지으면 진다"는 인센티브 아래 있다. 개별적으로 합리적인 결정의 합이 산업 전체의 과잉설비가 되는 것은 멍거가 말한 전형적 집단 오판 구조다. [의견]

**반대 근거**: 1990년대 광섬유 빌드아웃의 교훈(AI-Infra 보고서)은 "공급자는 망했지만 **인프라를 싸게 쓴 사용자(Google)** 는 승자"였다. 이번에 Google은 공급자이자 사용자다 — 과잉설비가 오면 Google 자신의 검색·YouTube·Gemini가 그 설비를 흡수할 수 있는 **유일한 최종 수요처**를 가졌다는 점에서 순수 공급자(CRWV·ORCL)보다 훨씬 안전하다. [추정]

---

## 8. Q3'26 실적(오늘 장 후)이 이 판단을 바꿀 수 있는 지점

1. **Search & other 성장률** — Meta +26% 대비 격차. 쿼리/단가 분해 언급 여부
2. **Cloud 영업이익률** — 외부 임차 압박 크기(35.6% 기준)
3. **2027 capex 공식 언급** — 인버전 경로 #1
4. **TPU 외부 판매·Meta 계약** 회사 측 확인 여부 (현재 🔴/🟡)
5. 경쟁사: MSFT Azure(오늘 · 가이던스 +45%), AMZN AWS·광고(10/29) — 둘 다 ⬛

---

## 종합 결론

| 차원 | ★ | 07-28 대비 | 핵심 근거 |
|---|:-:|:-:|---|
| 1. 산업 규모·성장 | ★★★★☆ | ➖ | 클라우드 TAM 상향(+43% 🟢) · 광고 성숙 · 조달 의존 |
| 2. 경쟁 구도 | ★★★★☆ | ➖ | GCP 점유 15% 사상 최고 🟢 vs Meta 성장 2배 🟡 |
| 3. 경쟁사 위협(방어력) | ★★★★☆ | ➖ | 전 전선 위협자 없음. 실제 예산 이동은 Meta |
| 4. 세부 시장(검색 해자) | ★★★★☆ | ⬇ (검색 ★5→★4) | OpenAI 광고 매체화 · Chrome 항소 |
| 5. 산업 트렌드 대응 | ★★★★☆ | ➖ | AdX 리스크 소멸 ↔ 검색 규제·에이전트 경쟁 |
| 6. 밸류체인 | ★★★★★ | ➖ (내용 강화) | 양 끝 보유 + TPU 외부판매 🟡 |

### 종합 산업·경쟁 ★: **★★★★☆**

**한 줄 요약**: *"경쟁 해자는 여전히 넓다(GCP 점유 +2%p, 검색 쿼리 안정). 위험은 경쟁자가 아니라 해자를 넓히는 비용 — 10년 실패 시나리오 1순위는 규제에서 자본 소각으로 바뀌었다."*

**충돌 지점 (다른 역할과 조율 필요)**:
- 버핏(재무) 역할과: 인버전 경로 #1(자본 소각)은 FCF·ROIC 판단과 겹친다 — 같은 리스크를 두 번 할인하지 않도록 할인 명세에서 정성으로만 표기
- 논제 §A6.2의 "검색 점유 78% 반등"은 설문 기준이며, StatCounter 85%대와 분모가 다르다 — 반등의 근거로 쓸 때 측정 방식 명기 필요
- AI-Infra 보고서 4.8의 "GOOGL 해자 ★5"보다 이 보고서의 검색 해자는 한 단계 낮다(★4). 종합 해자 ★5는 Cloud·TPU 덕분이다

> "It's not supposed to be easy. Anyone who finds it easy is stupid." — Charlie Munger

---

## 출처

- [Synergy Research — Q2 Cloud Market Passes $143 Billion (2026-07-30)](https://www.srgresearch.com/articles/q2-cloud-market-passes-143-billion-highest-growth-rate-in-eight-years) 🟢
- [shattered.io — AWS 28%, Google Cloud record 15%](https://shattered.io/aws-falls-28-percent-google-cloud-record-15-2026/) 🟡
- [MediaPost — Meta Set To Surpass Google In 2026 Ad Revenue](https://www.mediapost.com/publications/article/414285/meta-set-to-surpass-google-in-2026-ad-revenue.html) 🟡
- [TheNextWeb — Meta to overtake Google (eMarketer)](https://thenextweb.com/news/meta-surpass-google-digital-ad-revenue-emarketer-2026) 🟡
- [Hargreaves Lansdown — Meta Q3 results](https://www.hl.co.uk/shares/share-research/meta-q3-results-strong-quarter-spending-still-a-question) 🟡
- [Benzinga — Meta Q3](https://benzinga.com/z/48513171) 🟡
- [Manifold — Google US search market share (StatCounter 인용)](https://manifold.markets/Terminator2/what-will-googles-us-search-market) 🔴
- [MediaPost — Google holding on to market share in search](https://www.mediapost.com/publications/article/410094/google-holding-on-to-market-share-in-search.html) 🟡
- [DEV — AI search market share 2026](https://dev.to/searchless_ai/ai-search-market-share-2026-chatgpt-drops-below-65-as-gemini-and-claude-surge-31bf) 🟡
- [coincentral — Citizens JMP cut to $450](https://coincentral.com/?p=215520) 🔴
- [INMA — OpenAI accelerating ad business](https://www.inma.org/blogs/advertising-initiative/post.cfm/openai-is-accelerating-its-ad-business-plans) 🟡
- [Gigazine — OpenAI ad revenue](https://gigazine.net/gsc_news/en/20260410-openai-ad-revenue) 🟡
- [ppc.land — ChatGPT targets Google's $224bn search ad business](https://ppc.land/chatgpt-targets-googles-224bn-search-ad-business-with-102bn-bet/) 🔴
- [Data Center Knowledge — Anthropic multi-GW TPU deal](https://www.datacenterknowledge.com/data-center-chips/anthropic-secures-multi-gigawatt-tpu-deal-with-google-broadcom) 🟡
- [ITPro — Anthropic/Google/Broadcom](https://www.itpro.com/infrastructure/anthropic-pens-multi-gigawatt-tpu-deal-with-google-broadcom-as-claude-demand-picks-up) 🟡
- [rallies.ai — Google to sell TPUs (Anthropic, Meta)](https://rallies.ai/news/google-will-sell-tpu-chips-to-select-customers-under-multi-gigawatt-anthropic-meta-pacts) 🔴
- [Finviz — DOJ challenges refusal to force Chrome sale](https://finviz.com/news/299016/doj-reignites-antitrust-fight-against-google-challenges-courts-refusal-to-force-chrome-sale) 🟡
- [fintool — DOJ Google appeal Chrome Apple](https://fintool.com/news/doj-google-antitrust-appeal-chrome-apple) 🟡
- [Crowdfund Insider — EU DMA €890M](https://www.crowdfundinsider.com/2026/07/293311-eu-fines-google-under-digital-markets-act-cma-his-tech-firm-with-e890-million-penalty/) 🟡
- [Claims Journal — Waymo path to 1M weekly trips](https://amp.claimsjournal.com/news/national/2026/02/12/335668.htm) 🟡
- [noqta — Waymo 500k weekly rides](https://noqta.tn/en/news/waymo-500k-weekly-rides-robotaxi-10-cities-2026) 🟡
- [stocktwits — Azure analyst preview](https://stocktwits.com/news-articles/markets/equity/microsoft-s-azure-business-draws-praise-from-analysts-retail-eyes-exponential-growth/cZN5bcuRJcj) 🟡
- 내부: `reports/GOOGL/_data.md`(SEC XBRL 🟢) · `reports/GOOGL/GOOGL-thesis.md` §A0·§A6·§A8 · `reports/AI-Infrastructure-industry-20261027.md` · 07-28 판 본 파일

## AI 리서치 한계
- Q3'26 실적(Alphabet·MSFT·AMZN) 미반영. 검색 점유·TPU 계약 다수가 2차 출처. 상업 쿼리 이탈률·GCP 인프라 단독 성장률·백로그 고객 집중도는 공개 데이터 부재(⬛).

<!-- discount-ledger
role: 산업·경쟁(멍거)
items:
  - name: 검색 해자 ★5→★4 (OpenAI 광고 매체화 · Chrome 매각 교차항소)
    pct: ⬛
    reason: OpenAI Ads Manager·CPC 입찰 출시 [사실 🟡] · DOJ 교차항소 계류 [사실 🟡] · 상업 쿼리 이탈 규모 미확인 [추정]
    overlapsWith: 리루(리스크) 규제 할인 · 단융핑(사업모델) 검색 지속성 판단
  - name: Cloud 마진 경쟁·임차 압박 감시 (정량 할인 없음)
    pct: ⬛
    reason: CFO 외부 임차 마진 압박 예고 [사실 🟡] — Q3 실측 전이라 수치 미반영
    overlapsWith: 버핏(재무) Cloud 마진 가정
total: 0
-->

<!-- confidence-summary
high: 3
medium: 34
low: 9
gap: 14
verdict: 보통
-->
