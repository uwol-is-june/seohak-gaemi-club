# AMZN 재무·가치평가 분석 — 워런 버핏 관점

> **분석 대상**: Amazon.com, Inc. (NASDAQ: AMZN)
> **기준 주가**: $232.11 (2026-07-24 종가) · **시가총액**: ~$2.498조 · **발행주식**: 10.76B
> **분석 렌즈**: 재무 품질 · 현금창출력 · 밸류에이션 · 안전마진 (Warren Buffett)
> **작성일**: 2026-07-27 · **통화**: USD

---

## 0. 시가총액 검산 (financial_rigor.py)

```
============================================================
Market Cap Verification
============================================================
  Price:              232.11 USD
  Shares:             10.76
  Calculated Cap:     2,497.50 USD
  Reported Cap:       2,498.00 USD
  Deviation:          0.02%

  ✅ 산술 일치 — 편차 0.02% (주의: 입력값이 옳다는 전제하의 계산 검증일 뿐, 사실 정확성 보장 아님)
```

$232.11 × 10.76B = **$2,497.5B**, 보고 시총 $2,498B 대비 편차 0.02%. 시총 수치 검증 통과.

---

## 1. 매출·순이익·영업이익 추세 (3–5년) — "무슨 일이 있었나"

| 연도 | 매출($B) | YoY | 영업이익($B) | 영업이익률 | 순이익($B) | 순이익률 | EPS |
|------|---------|-----|------------|----------|----------|---------|-----|
| 2021 | 469.8 | +21.7% | 24.9 | 5.3% | **33.4** | 7.1% | ~3.24 |
| 2022 | 514.0 | +9.4% | 12.2 | 2.4% | **-2.7** | -0.5% | -0.27 |
| 2023 | 574.8 | +11.8% | 36.9 | 6.4% | **30.4** | 5.3% | ~2.90 |
| 2024 | 638.0 | +11.0% | 68.6 | 10.8% | **59.2** | 9.3% | ~5.53 |
| 2025 | 716.9 | +12.4% | 79.98 | 11.2% | **77.7** | 10.9% | 7.17 |
| TTM(~Q1'26) | ~742.8 | +14.2% | — | — | ~91* | — | ~8.4* |

\* TTM 순이익에는 Q1 2026의 **Anthropic 투자평가익 세전 $16.8B**(비영업·비반복)이 포함되어 왜곡. 정상화 시 실질 EPS는 ~$7 초중반대.

**무슨 일이 있었나 (핵심 서사):**
1. **2022년 바닥 → 2년 만의 이익 2배 재평가.** 2022년은 Rivian 평가손·과잉 물류설비·인건비 급증으로 순손실. 이후 (a) 물류망 지역화(권역 배송)로 배송원가 절감, (b) 광고사업 고마진 확대, (c) AWS 회복이 겹치며 영업이익률이 **6.4%(FY23) → 11.2%(FY25)로 정확히 2배**. 매출은 12% 성장인데 영업이익은 2년간 $36.9B→$80.0B로 **2.2배** — 전형적 오퍼레이팅 레버리지.
2. **성장 재가속.** 매출 YoY가 FY24 +11.0% → FY25 +12.4% → TTM +14.2%로 대형주치고 가속. Q1 2026 매출 $181.5B(+17%)는 AWS +28% 재가속이 견인.

출처: 시드 데이터(macrotrends/stockanalysis 교차검증), [AMZN Q1 2026 Earnings Release](https://s2.q4cdn.com/299287126/files/doc_earnings/2026/q1/earnings-result/AMZN-Q1-2026-Earnings-Release.pdf), [Amazon Q4 2025 8-K (SEC)](https://www.sec.gov/Archives/edgar/data/1018724/000101872426000002/amzn-20251231xex991.htm)

---

## 2. 수익성 — 세그먼트 마진이 진짜 이야기 (SEARCH 완료)

### 전사 수익성 지표

| 지표 | FY23 | FY24 | FY25 | 판단 |
|------|------|------|------|------|
| Gross margin | 46.9% | 48.9% | 50.3% | 사상 첫 50% 돌파 |
| Operating margin | 6.4% | 10.8% | 11.2% | 2년 2배 |
| Net margin | 5.3% | 9.3% | 10.9% | 견조 |
| ROE | 17.5% | 24.3% | 22.4% | 5년 평균 18.2% |
| ROA | ~5% | ~9% | ~10% | 자산집약 사업치고 양호 |
| ROIC | — | — | **13.5%** | WACC(~8–9%) 초과 → 가치창출 중 |

### ★핵심★ 세그먼트별 영업마진 — "두 개의 회사"

| 세그먼트 | FY25 매출($B) | YoY | 영업이익($B) | 영업마진 | 전사 영업이익 기여 |
|---------|-------------|-----|------------|---------|-----------------|
| **AWS (클라우드)** | 128.7 | +20% | **45.6** | **35.4%** | **57%** |
| North America (리테일) | 426.3 | +10% | 29.6 | 6.9% | 37% |
| International (리테일) | ~161.9 | — | 4.7 | ~2.9% | 6% |
| **합계** | 716.9 | +12.4% | 79.98 | 11.2% | 100% |

**해석 (버핏 관점):** Amazon은 하나의 기업이 아니라 **매출 18%로 영업이익 57%를 버는 초고수익 클라우드 유틸리티(AWS, 35% 마진)** + **매출 82%에 영업이익 43%를 버는 초저마진 리테일(NA 6.9%, 국제 2.9%)**의 합성체다. 버핏이 좋아하는 "적은 자본으로 높은 이익"의 성질은 **AWS에만** 온전히 존재한다. 리테일은 규모·해자는 압도적이나 마진 구조는 코스트코형 박리다매(WMT 영업마진 ~4%와 유사한 계열).

**Q1 2026 업데이트 — AWS 마진 신기록:** AWS 매출 $37.6B(+28%, 15분기 내 최고 성장), 영업이익 $14.2B, **영업마진 37.7%(사상 최고)**. AWS 수주잔고(backlog) **$364B** — 여기에 최근 체결된 **Anthropic $100B+ 계약은 제외**된 수치. 즉 계약된 미래 매출이 향후 10년 가까이 쌓여 있음.

출처: [Amazon operating income by segment (Statista)](https://www.statista.com/statistics/241835/amazon-operating-income-annual-by-segment/), [Futurum: Amazon Q1 FY2026](https://futurumgroup.com/insights/amazon-q1-fy-2026-aws-momentum-builds-as-ai-infrastructure-spend-surges/), [Seeking Alpha: AWS $364B backlog](https://seekingalpha.com/news/4582330-amazon-outlines-q2-net-sales-of-194b-199b-as-aws-reaches-364b-backlog)

---

## 3. 현금흐름 심층 분석 — FCF 붕괴는 적신호인가, 성장투자인가?

| 연도 | OCF($B) | Capex($B) | FCF($B) | FCF마진 |
|------|--------|----------|--------|--------|
| 2021 | 46.3 | 61.1 | -14.7 | -3.1% |
| 2022 | 46.8 | 63.6 | -16.9 | -3.3% |
| 2023 | 84.9 | 52.7 | **+32.2** | +5.6% |
| 2024 | 115.9 | 83.0 | **+32.9** | +5.2% |
| 2025 | 139.5 | 131.8 | **+7.7** | +1.1% |
| **TTM(~Q1'26)** | ~148.5 | **147.3** | **+1.2** | +0.16% |

**팩트:** TTM FCF가 1년 전 $25.9B → **$1.2B로 사실상 붕괴**. 원인은 전적으로 capex — "부동산·설비 순취득이 YoY로 $59.3B 증가"했고 이는 "주로 AI 인프라 투자"라고 회사가 명시. OCF 자체는 오히려 $139.5B로 사상 최대이며 **순이익($77.7B)의 1.8배** → 이익의 현금 전환은 최상급(감가상각 큰 자본집약 사업 특유). 즉 **이익의 질(quality of earnings)에는 문제가 없다. 문제는 전량 재투자되고 있다는 것**.

**AI/데이터센터 Capex 정량화:**
- FY25 capex $131.8B, TTM $147.3B — 대부분 AWS 데이터센터·AI 칩(자체 Trainium/Inferentia + Nvidia GPU)·전력 확보.
- **2026 가이던스: capex 약 $200B** (FY25 대비 +50%). Jassy: "대부분 AWS에 투입 — 수요가 매우 높기 때문". AI 인프라 + 예상보다 빠르게 성장하는 non-AI 코어 워크로드 + 물류 로보틱스 자동화 포함.

**적신호 vs 성장투자 판정:** 이것은 **성장투자다. 단, 검증 조건부.**
- **성장투자 근거:** capex가 지출되는 AWS backlog가 $364B(+Anthropic $100B) 계약 확보 상태 → 수요 없는 투기적 증설이 아님. 감가상각으로 미래 FCF는 자연 회복. ROIC 13.5% > WACC이므로 증분 투자가 자본비용 이상 회수하는 한 owner value 창출.
- **적신호 리스크:** ① GPU/AI칩 자산 수명은 3–6년으로 짧아 감가상각 폭탄이 향후 손익을 눌러 마진 하방 압력. ② 수요 에어포켓(AI 자본지출 사이클 둔화) 발생 시 $200B가 좌초자산화. ③ 현재 주가는 FCF가 아니라 "이익 + 미래 backlog"에 베팅하는 것 → FCF 기준 밸류에이션(P/FCF 2000배+)은 무의미할 만큼 왜곡.

출처: [24/7 Wall St: FCF collapse $26B→$1.2B](https://247wallst.com/investing/2026/05/05/amazons-free-cash-flow-just-collapsed-from-26-billion-to-1-2-billion-the-market-barely-blinked/), [DCD: Amazon 2026 capex $200bn](https://www.datacenterdynamics.com/en/news/amazon-capex-to-hit-200bn-in-2026-will-mostly-fund-aws-data-centers/), [Industrial Info: Amazon boosts 2026 capex to $200B](https://www.industrialinfo.com/news/article/amazon-boosts-2026-capex-to-200-billion-amid-data-center-surge--353118)

---

## 4. 재무 건전성

| 지표 | 값 | 판단 |
|------|-----|------|
| 현금·현금성자산 | $86.8B (2025말) | 두꺼운 유동성 |
| 총부채 D/E | 0.53 | 보수적, 순현금 근접 |
| 이자비용(FY25) | $2.274B | — |
| 이자보상배율 | ~35x (EBIT $80B / 이자 $2.3B) | 매우 안전 |
| 유동비율 | 1.05 (FY25) | **얇음** — 유동자산 $229.1B / 유동부채 $218.0B |
| 운전자본 | ~+$11.1B | 소폭 플러스 |
| 무배당 | 배당 없음, 자사주매입 소규모 | 전액 재투자 |

**판단:** 이자보상배율 35배, D/E 0.53, 현금 $86.8B로 **레버리지 리스크는 낮다.** 다만 (1) 유동비율 1.05는 아슬아슬하며 — Amazon은 공급업체 외상매입(payables)을 무이자 자금으로 활용하는 음(-)의 운전자본 모델이라 구조적으로 낮게 나오나, 완충은 얇다. (2) $200B capex를 OCF($~148B)만으로는 못 대므로 **2026년 순부채 증가·회사채 발행 확대가 예상됨** — D/E 상승 압력. 버핏 기준 "요새 같은 대차대조표"까지는 아니나 위험 수위는 아니다.

출처: [Amazon current ratio (macrotrends)](https://www.macrotrends.net/stocks/charts/AMZN/amazon/current-ratio), [Amazon 2025 Annual Report](https://s2.q4cdn.com/299287126/files/doc_financials/2026/ar/Amazon-2025-Annual-Report.pdf)

---

## 5. 밸류에이션 — 자체 역사 및 동종업계 비교

### AMZN 현재 vs 자체 역사

| 지표 | 현재 | AMZN 역사 평균 | 판단 |
|------|------|--------------|------|
| P/E (TTM) | 27.7x (FY25 EPS 기준 32.4x) | 5년 평균 ~51x, 10년 평균 ~42x | **역사 대비 저평가** |
| Forward P/E | ~23–27.8x | — | 역사 하단 |
| P/S | 3.36x | 3–5x 밴드 | 밴드 하단 |
| P/B | 7.2x | — | 높음(무형 성장주) |
| EV/EBITDA | 16x | ~20x+ | 역사 대비 할인 |
| PEG | 1.30 | — | 합리적 |

**핵심:** Amazon은 이익 급증으로 P/E가 역사적 고점(FY22 흑자전환 직후 수백 배, 5년 평균 51배)에서 **27~32배로 대폭 정상화**됐다. 즉 이익이 밸류에이션을 "따라잡는" 재평가가 진행 중. 자기 역사 기준으로는 **비싸지 않다.**

### 동종업계 비교 (2026 중반)

| 기업 | Forward P/E | EV/EBITDA | 클라우드/사업 성격 |
|------|------------|-----------|------------------|
| **AMZN** | ~23–27.8x | **16x** | AWS 35% + 리테일 7% |
| MSFT | 20.6x | 16.5x | Azure, SW 고마진 |
| GOOGL | ~29x | 18.5x | GCP + 광고 |
| WMT | ~46x (TTM) | 25.0x | 순수 리테일 |

**해석:** AMZN의 EV/EBITDA 16배는 MSFT(16.5)·GOOGL(18.5)보다 낮고, 리테일 피어 WMT(25배, P/E 46배)보다 **현저히 싸다.** Forward P/E는 MSFT보다 높으나 GOOGL보다 낮은 중간. AMZN은 "WMT 규모의 리테일 + MSFT급 클라우드"를 동시에 보유하는데 밸류에이션은 클라우드 순수주보다 할인, 리테일 순수주보다 대폭 할인 — **합성 할인(conglomerate discount)** 이 존재. 버핏이 즐기는 "훌륭한 기업을 적정가에" 조건에 근접.

출처: [MSFT Statistics (stockanalysis)](https://stockanalysis.com/stocks/msft/statistics/), [Alphabet P/E (TIKR)](https://www.tikr.com/blog/alphabets-p-e-ratio-current-levels-historical-trends-and-outlook), [Walmart EV/EBITDA (valueinvesting.io)](https://valueinvesting.io/WMT/valuation/ev_ebitda-multiples), [AMZN P/E history (TIKR)](https://www.tikr.com/blog/amazon-pe-ratio)

---

## 6. 안전마진 — 3-시나리오 모델 (financial_rigor.py)

```
============================================================
Three-Scenario Valuation Model
============================================================
  Current Price:  232.11 USD
  Current EPS:    7.17
  Forecast Years: 5

  Scenario               Growth  Target PE   Target EPS  Target Price   Upside
  -------------------- -------- ---------- ------------ ------------- --------
  Bull (Optimistic)         18%        32x        16.40        524.9   +126.1%
  Base (Neutral)            12%        26x        12.64        328.5    +41.5%
  Bear (Pessimistic)         6%        18x         9.60        172.7    -25.6%

  ✅ All calculations use exact decimal arithmetic — results are auditable
```

| 시나리오 | 5년 EPS성장 | 목표 PE | 5년후 목표가 | 상승/하락 | 확률(추정) |
|---------|-----------|--------|------------|---------|----------|
| Bull | 18% | 32x | $524.9 | +126% | 25% |
| Base | 12% | 26x | $328.5 | +41.5% | 50% |
| Bear | 6% | 18x | $172.7 | -25.6% | 25% |

**확률가중 기대 5년후 가치(추정):** (0.25×524.9)+(0.50×328.5)+(0.25×172.7) = **$338.7** → 5년 CAGR ~7.8%. 현 시점 할인 시 내재가치 **~$300 부근**으로 추정.

**안전마진 판단:** 현 주가 $232는 base 목표($328)에 41% 상승 여지를 남기나, 이는 5년에 걸친 12% EPS 성장을 요구. **Bear 시나리오에서 -26% 하방**이 실재하므로 안전마진은 "두툼함"이 아니라 **"보통"**. 버핏식 "50센트에 1달러" 수준의 명백한 헐값은 아니며, "좋은 기업을 공정가~약간 매력적인 가격에" 사는 국면. 명확한 저가 매수 트리거는 $200 이하(bear 목표 근접, EV/EBITDA ~14배)에서 형성.

---

## 7. 버핏식 비합의 관점(Non-Consensus) — AI Capex는 owner value를 파괴하는가, 세우는가?

시장의 합의 서사는 두 갈래다: (A) "$200B capex는 규율 없는 군비경쟁, FCF를 태워 없앤다" (약세) vs (B) "AI는 무한 수요, 무조건 더 쓰는 자가 이긴다" (강세). **버핏이라면 둘 다 거부하고 자본배분의 산수를 볼 것이다.**

**버핏의 계산:**
- Owner earnings = 순이익 + 감가상각 − **유지(maintenance) capex**. Amazon의 $147B capex 중 상당 부분은 **성장 capex**이지 유지 capex가 아니다. 즉 헤드라인 FCF $1.2B는 owner earnings를 극심하게 과소평가한다. 실제 유지 capex를 매출 대비 3–4%(~$25–30B)로 보면 **정상화 owner earnings는 $90B+** 수준 — P/OE ~28배로 P/FCF 2000배의 착시와 전혀 다른 그림.
- 핵심 질문은 **"증분 투하자본이 자본비용 이상을 버는가"**. 증거: (1) AWS ROIC 및 전사 ROIC 13.5% > WACC ~8–9%. (2) $364B backlog + Anthropic $100B는 capex가 **선(先)계약된 수요를 향한다**는 증거 — 버핏이 코카콜라 병입 설비 증설을 "이미 팔린 콜라를 위한 것"으로 봤던 것과 같은 논리. (3) AWS 마진이 capex 급증 와중에도 **37.7% 사상 최고** → 규모의 경제가 마진을 침식하지 않고 오히려 확대.

**결론(추정):** 현시점 증거는 **"owner value 건설" 쪽에 무게**가 실린다. capex는 자본비용 이상을 회수하는 사업(AWS 35%+ 마진, 계약된 backlog)에 투입되고 있어, 회계상 FCF 붕괴는 "가치 파괴"가 아니라 **"미래 이익의 선지출"**이다. 버핏의 씨즈캔디 격언 — "훌륭한 기업은 성장에 자본을 재투자해도 높은 수익률을 유지한다" — 에 부합.

**단, 파괴로 뒤집힐 3가지 반대 근거(양면 제시):**
1. **감가상각 시한폭탄** — AI칩 3–6년 수명. 향후 2–3년 감가상각비가 급증하며 AWS 마진과 EPS를 눌러 base 시나리오(12% 성장) 자체가 위협받을 수 있음.
2. **수요 사이클 리스크** — backlog는 계약이나 취소·재협상 여지 존재. AI capex 사이클이 2027–28에 냉각되면 $200B/년 증설은 좌초자산.
3. **자본배분 규율 상실 신호** — capex가 OCF를 초과($200B vs OCF ~$150B)해 부채로 자금을 대기 시작하면, 버핏이 경계하는 "성장을 위한 성장"으로 변질될 위험. 2026년 D/E 추이와 AWS 마진 유지 여부가 리트머스.

---

## 8. 종합 평가 (★1–5) 및 밸류에이션 판정

| 차원 | 평점 | 근거 요약 |
|------|------|----------|
| ① 매출·이익 성장·추세 | ★★★★★ | 매출 12→14% 가속, 영업이익 2년 2배, AWS 재가속 +28% |
| ② 수익성·마진 | ★★★★☆ | AWS 35% 초우량 / 리테일 7% 박리, ROE 22%·ROIC 13.5%. 전사 마진은 아직 순수 소프트웨어 해자에 못 미침 |
| ③ 현금흐름 품질 | ★★★☆☆ | OCF $139B 사상최대·순이익 1.8배 전환은 최상급이나, FCF는 capex로 붕괴($1.2B). 정상화 owner earnings는 양호하나 헤드라인 FCF는 신뢰 불가 |
| ④ 재무 건전성 | ★★★★☆ | 이자보상 35x·현금 $86.8B·D/E 0.53로 견고. 유동비율 1.05·capex발 부채증가 압력이 감점 |
| ⑤ 밸류에이션·안전마진 | ★★★☆☆ | 자체 역사·클라우드 피어 대비 싸나(EV/EBITDA 16x), bear -26% 하방 상존. 안전마진 "보통" |

**종합 별점: ★★★★☆ (4.0 / 5.0)** — 재무 품질 우수, 밸류에이션 공정, 현금흐름은 성장투자로 일시 왜곡.

### 최종 밸류에이션 판정: **공정가 (FAIR)** — (자체 역사 기준 약간 저평가, FCF 기준 프리미엄)

| 구분 | 값 |
|------|-----|
| 현재가 | $232.11 |
| **적정 목표가 밴드 (12개월)** | **$260 – $300** (Base 진행 반영, forward P/E 26–28x × 정상화 EPS ~$8.5–10) |
| 5년 확률가중 기대가치(추정) | ~$328 (base) / 기대값 ~$339 |
| 적극 매수 구간(안전마진 확보) | **≤ $200** (bear 목표 근접, EV/EBITDA ~14x) |
| 하방 리스크(bear) | $173 (-26%) |

**버핏식 한 줄 결론(추정):** *"훌륭한 두 개의 기업(초우량 클라우드 + 압도적 리테일)을 공정한 가격에 살 수 있는 구간이다. 명백한 헐값은 아니므로 서두를 이유는 없다. AI capex는 현재 증거상 owner value를 파괴가 아니라 건설하고 있으나, 이 판정은 향후 2년 AWS 마진 유지와 감가상각 흡수 여부에 걸려 있다. $200 이하로 눌리면 안전마진이 두툼해진다."*

---

### 데이터 출처 (교차검증)
- 1차 공시: [AMZN Q1 2026 Earnings Release (PDF)](https://s2.q4cdn.com/299287126/files/doc_earnings/2026/q1/earnings-result/AMZN-Q1-2026-Earnings-Release.pdf) · [Amazon Q4 2025 8-K (SEC EDGAR)](https://www.sec.gov/Archives/edgar/data/1018724/000101872426000002/amzn-20251231xex991.htm) · [Amazon 2025 Annual Report](https://s2.q4cdn.com/299287126/files/doc_financials/2026/ar/Amazon-2025-Annual-Report.pdf)
- 세그먼트: [Statista — 세그먼트 영업이익](https://www.statista.com/statistics/241835/amazon-operating-income-annual-by-segment/) · [Futurum — Q1 FY2026](https://futurumgroup.com/insights/amazon-q1-fy-2026-aws-momentum-builds-as-ai-infrastructure-spend-surges/)
- Capex/FCF: [24/7 Wall St](https://247wallst.com/investing/2026/05/05/amazons-free-cash-flow-just-collapsed-from-26-billion-to-1-2-billion-the-market-barely-blinked/) · [DCD — $200bn capex](https://www.datacenterdynamics.com/en/news/amazon-capex-to-hit-200bn-in-2026-will-mostly-fund-aws-data-centers/)
- 밸류에이션: [MSFT (stockanalysis)](https://stockanalysis.com/stocks/msft/statistics/) · [Alphabet P/E (TIKR)](https://www.tikr.com/blog/alphabets-p-e-ratio-current-levels-historical-trends-and-outlook) · [WMT EV/EBITDA](https://valueinvesting.io/WMT/valuation/ev_ebitda-multiples) · [AMZN P/E 역사 (TIKR)](https://www.tikr.com/blog/amazon-pe-ratio)
- 재무건전성: [Macrotrends — 유동비율](https://www.macrotrends.net/stocks/charts/AMZN/amazon/current-ratio)
- 백로그: [Seeking Alpha — AWS $364B backlog](https://seekingalpha.com/news/4582330-amazon-outlines-q2-net-sales-of-194b-199b-as-aws-reaches-364b-backlog)

*본 보고서는 사실·데이터 기반 분석이며, "(추정)" 표기 항목은 가정에 기반한 추정치임. 투자 권유가 아님.*
