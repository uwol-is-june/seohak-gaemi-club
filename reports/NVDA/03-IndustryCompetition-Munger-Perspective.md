# NVDA — 산업 구도 및 경쟁 포지션 분석 (멍거 관점)
<!-- meta sector: AI-Semiconductors -->

> **분석 차원**: AI 가속컴퓨팅 산업 구도 · 경쟁우위의 지속성 · 밸류체인 가치 배분 · 수요의 질
> **분석 관점**: 찰리 멍거 — 인센티브 · 뒤집어 생각하기(invert) · lollapalooza
> **작성일**: 2026-10-23 (이전판 2026-09-23 전면 개정) · 기준 분기: Q2 FY2027(2026-07-26 종료)
> **정보 풍부도**: A등급 — 컨센서스 반복을 피하고 반론 검증에 집중

> *"Show me the incentive and I'll show you the outcome."* — Charlie Munger

---

## 0. 요약 — 이번 판에서 바뀐 것

이전판(09-23)의 핵심 주장은 "가격 결정력이 NVDA에서 메모리·TSMC로 넘어가고 있으며, 그 증거가
매출총이익률 하락(FY2025 75.0% → FY2026 71.1%)"이었다. **새 데이터로 다시 재보니 이 주장은 절반만 맞다.**

| 검증 항목 | 이전판 판단 | 새 데이터 | 판정 |
|---|---|---|---|
| GM 하락 = 해자 균열 | 균열의 1차 증거 | Q2 FY27 GM **75.0%**로 회복, Q4 71~72% 저점 후 **"이미 발표한 가격 인상"으로 FY28 72~73% 회복** 가이드 🟡[주장] | **수정** — 원가 상승을 고객에게 넘기는 중. 이건 균열이 아니라 가격 결정력의 *증거*에 가깝다 |
| 가치가 공급사로 이동 | 진행 중 | GW당 NVDA 매출 Hopper ~$18B → Vera Rubin **~$40B**(GW당 DC 투자 ~$60B 중) 🟡[주장] | **반박됨** — NVDA가 데이터센터 1달러 중 가져가는 몫은 오히려 커졌다 |
| 진짜 경쟁자는 Broadcom | 주장 | AVGO AI 매출 Q3 $16.7B(**+221% YoY**), FY28 **~$230B** 시사 🟡[주장] | **강화** — 규모가 NVDA DC의 ~19%까지 왔다 |
| (신규) 수요를 NVDA가 스스로 금융 | 언급 수준 | 지분투자 합계(상장 포함) **~$99B**(1월 $22.3B) + OpenAI 캠퍼스 임대 보증 **최대 $105B** + 기타 보증 $3.5B 🟡[사실, 10-Q 2차 인용] | **🔴 이번 판의 핵심 발견** |

**이번 판의 단 하나의 주장:**

> **NVDA의 해자는 칩 경쟁에서 아직 무너지지 않았다. 대신 NVDA는 자기 제품의 수요를 점점 더
> 자기 대차대조표로 떠받치고 있다.** 투자·보증·클라우드 약정 합계(~$237B, 추정 합산)가 FY2026 연매출
> ($215.94B 🟢)을 넘었다. 멍거가 가장 경계한 인센티브 구조 — 판매자가 구매자에게 돈을 대는 구조 — 가
> 반도체 역사상 가장 큰 규모로 만들어지고 있다.

| 차원 | ★ | 한 줄 |
|---|---|---|
| 산업 규모·성장 | ★5 | 상위 5사 CAPEX 2026 ~$700B+ 🟡 — 논쟁 여지 없음 |
| 성장의 질(누가 돈을 대는가) | ★2 | 증가분 상당 부분이 부채·벤더 파이낸싱(NVDA 자신 포함) |
| 현재 경쟁우위 폭 | ★4 | 매출·GM·GW당 몫 모두 우위 유지. ASIC 성장률은 2배 |
| 5년 지속성 | ★3 | 프론티어 랩(Anthropic·OpenAI)의 이중 조달이 현실화 |
| 산업 구조 매력도 | ★3 | 공급 제약이 만든 희소성 지대 — 공급이 따라잡으면 정상화 |
| 밸류체인 협상력 | ★4 | 메모리 원가를 가격 인상으로 전가 (이전판 ★3 → 상향) |
| **종합** | **★4** | 사업의 질 최상급, 그러나 **수요의 자기금융**이 새 리스크 축 |

**멍거의 세 바구니: "Yes"와 "Too tough"의 경계선 — 이전판과 같다. 다만 이유가 바뀌었다.**
이전엔 "마진이 새고 있어서"였고, 이번엔 "NVDA가 자기 고객의 신용 위험을 떠안기 시작해서"다.

---

## 1. 산업 규모 & 성장 — 천장은 CAPEX, 바닥은 신용

### 1-1. 하이퍼스케일러 CAPEX (CY2026 가이던스, 2026년 7월 실적 기준)

> ⚠️ CY2026 3분기(10월 말 발표) 실적은 아직 나오지 않았다. 아래는 7월 Q2 실적 시점 가이던스다.

| 기업 | CY2026 가이던스 | 이전(4월) | 신뢰도 | 비고 |
|---|---|---|---|---|
| Alphabet (GOOGL) | **$195~205B** | $180~190B | 🟡[주장] | 단일 2차 출처 |
| Amazon (AMZN) | **~$200B** (일부 보도 $220B) | ~$200B | 🟡/🔴[주장] | $220B는 단일 출처 — 미확정 |
| Meta (META) | **$130~145B** | $125~145B | 🟡[주장] | Statista·2차 출처 2곳 일치 |
| Microsoft (MSFT) | ⬛ (보도 $175B vs $190B 충돌) | — | ⬛ | 회계연도 기준 차이로 추정, 미해결 |
| Oracle (ORCL) | ~$50B | — | 🔴[주장] | 단일 출처 |
| **4사 합계(MSFT 포함)** | **~$700~740B** | ~$660~700B | 🟡[추정·산술] | 집계 보도 "$725B"와 정합 |
| NVDA 경영진 인용(상위 5사) | **2026 ~$800B → 2027 ~$1.3T** | — | 🟡[주장] | 회사 주장, 독립 검증 안 됨 |

**[사실 🟢]** NVDA FY2026 매출 $215.94B(+65.5%), 영업이익률 60.4% — SEC XBRL.
**[사실 🟡]** Q2 FY27 매출 $96.2B(+106% YoY), DC $89.0B(+117%), Q3 가이드 $108.0B ±2% — Quartr·Nasdaq·Webull 등 다수 일치(회사 발표 원천, 상호 독립 아님).
**[주장 🟡]** CFO: FY2028 매출 **~+70%**, "공급 제약된(supply-constrained) 전망". 셀사이드 기대는 40%대 초반~60%.

### 1-2. 뒤집어 보기 — 이 CAPEX는 어디서 오는가

멍거라면 "얼마를 쓰는가"가 아니라 "그 돈이 누구 돈인가"를 묻는다.

| 증거 | 값 | 신뢰도 |
|---|---|---|
| NVDA 지분투자 합계(비상장 $47.9B + 상장 $47.7B + 지분법 ~$3.3B) | **$99B** (2026-07-26) ← $22.3B (2026-01-25) | 🟡[사실] 10-Q, 2차 인용 |
| 지분투자 추가 약정 | $25B | 🟡[사실] |
| SB Energy PORTS 캠퍼스(OpenAI 전용 4.25GW) 임대 보증 | **상한 $105B, 20년** | 🟡[사실] — EDGAR 8-K(2026-08-17, Item 1.01·2.03) 존재 🟢 확인, 금액은 2차 출처 2곳 일치 |
| AI 클라우드 토지·전력·쉘 보증 | $3.5B | 🟡[사실] |
| 클라우드 서비스 약정(NVDA가 고객 용량을 되사는 구조) | $29B ← $13.7B | 🟡[사실] |
| 추가 3.8GW 신용보강 옵션 | NVDA 보유 | 🟡[사실] |
| **합계 (지분 ~$99B·상장 포함 + 보증 $108.5B + 클라우드 약정 $29B)** | **~$236.5B** | [추정·산술합] — 성격이 다른 항목의 단순합 |
| 대조: FY2026 연매출 / 자기자본 | $215.94B / $157.29B | 🟢[사실] |

> ⚠️ **정정(2026-10-23 team-lead)**: "$99B"는 Hudson Labs 요약 문구를 옮긴 값으로, 10-Q 원문 기준 **비상장 $47.9B + 상장 $47.7B = $95.6B**(지분법 ~$3.3B 포함 시 $98.9B)다. "비상장사·인프라금융사" 명칭은 틀렸다(상장 지분 포함). 신용 노출로 보는 비상장 지분은 **$47.9B** 🟢(01·04 원문 확인).

- 총부채 $33.4B(1월 $8.5B), 6월 $25B 무담보채 발행 🟡[사실]. `_data.md` FY2026 장기부채 $7.47B 🟢와 정합.
- 매출채권 $63.1B(1월 $38.5B), 재고 $31.6B(1월 $21.4B) 🟡[사실].

**[의견]** 이 숫자들이 말하는 것: NVDA 매출의 실질 상한은 "AI 수요"가 아니라 **"수요자의 자금조달 능력"**이고,
NVDA는 이제 그 조달 능력의 일부를 *직접 공급*한다. 이는 1999~2001년 통신장비사(루슨트·노텔)의
벤더 파이낸싱과 **구조는 같다**. 차이는 규모 대비 NVDA의 현금창출력(FY2026 FCF $96.68B 🟢)이
압도적이라는 점이다.

> *"I think it's undeniable that a lot of business goes wrong when people get blinded by incentives."* — Charlie Munger

**반대 근거 (강함)**: ① 지분투자 $99B에는 평가이익이 섞여 있다(Q2 지분평가이익 $7.8B 🟡) — 투자한 회사들이
실제로 가치가 오르고 있다는 뜻이기도 하다. ② OpenAI 보증은 20년에 걸쳐 임대료 납부에 따라 줄어드는
구조이고, 한 번에 $105B가 손실 나는 시나리오는 OpenAI가 완전히 망하고 캠퍼스 재임대도 불가능해야 한다.
③ 하이퍼스케일러 클라우드 백로그 >$2T 🟡[주장]는 최종 수요가 실재한다는 증거다.
④ 보증·투자는 공급 부족 국면에서 *배분 우선권*을 사는 행위일 수도 있다 — 경쟁사가 못 하는 일이다.

**결론**: 산업 규모·성장 **★5** / 성장의 질 **★2** (두 별점은 다른 질문이므로 합치지 않는다).

---

## 2. 경쟁 구도 — 누가 몇 %를 갖는가

### 2-1. 데이터센터 가속기 진영별 위치 (CY2026)

| 진영 | 최신 실적/규모 | 성장률 | 점유율(추정) | 신뢰도 |
|---|---|---|---|---|
| **NVIDIA** | DC $89.0B/분기 (compute 추정 ~$71.6B) | +117% YoY | 매출 기준 **70~80%** (일부 출처 ">90%"는 근거 없음) | 🟡[추정] |
| **Broadcom (XPU+네트워킹)** | AI 반도체 $16.7B/분기 (XPU 73%) | **+221% YoY** | — | 🟡[사실] AVGO 8-K 원천 |
| AMD | 회사 전체 Q2 $11.5B, GM 54% · DC GPU 분리치 ⬛ | — | 5~8% | 🟡[추정] |
| Google TPU | AVGO 경유 · 외부 직판 시작 | TPU 출하 +40%↑ (2026, TrendForce 예측) | ⬛ | 🟡[추정] |
| AWS Trainium · Meta MTIA · MSFT Maia | 개별 분해 불가 | — | ⬛ | ⬛ |
| Huawei Ascend (중국) | 950PR 2026 ~75만개 출하 계획 | — | 중국 내 1위(아래 4-5) | 🟡[주장] |

> ⚠️ 점유율은 전부 조사기관·언론 추정이며 정의(매출/출하/배포 FLOPS)가 제각각이다. 🟡 상한.

### 2-2. 🔴 핵심 비교 — NVDA DC 대비 Broadcom AI 매출의 상대 규모

| 지표 | 값 | 산출 |
|---|---|---|
| AVGO AI 매출 Q3 FY26 (8/2 종료) | $16.7B | 🟡[사실] |
| NVDA DC 매출 Q2 FY27 (7/26 종료) | $89.0B | 🟡[사실] |
| **상대 규모** | **~18.8%** | [추정·산술] — 거의 같은 분기 |
| AVGO AI Q4 가이드 | $21.7B (+236%) | 🟡[주장] |
| AVGO AI FY26 / FY27 / FY28 | $58B / ~$115B / **~$230B** | 🟡[주장] 경영진 시사 |
| NVDA DC 성장률 vs AVGO AI 성장률 | 117% vs 221% → **AVGO가 ~1.9배 빠름** | [추정·산술] |

이전판(09-23)은 AVGO를 NVDA DC의 ~12%로 봤다. **한 분기 만에 ~19%가 됐다.** 이 속도가 이어지면
"NVDA가 산업 성장의 대부분을 가져간다"는 전제는 FY2028에 깨진다.

**[추정]** NVDA FY2028 매출을 CFO 가이드(+70%)로 단순 외삽하면 AVGO FY28 AI $230B는 NVDA 전체 매출의
대략 1/3 수준이다(NVDA FY27 매출 자체가 ⬛ — Q1 미확인, 외삽 오차 큼).

### 2-3. 뒤집어 보기 — "커스텀 칩은 자가소비뿐"이라는 방어 논리의 붕괴

| 사건 | 내용 | 신뢰도 |
|---|---|---|
| Anthropic × Google/Broadcom | 2027~28년 **~15GW** TPU 용량 추가 예상, AVGO 최대 XPU 고객 될 전망 | 🟡[주장] 단일 2차 출처(TIKR) |
| OpenAI × Broadcom | 자체 가속기("Jalapeno") 출하 지속 — 실적 콜 언급 | 🟡[주장] |
| OpenAI × AMD | 6GW 계약, 첫 1GW MI450 2026 하반기 | 🟡[사실] |
| Anthropic × AMD | 2027 상반기부터 최대 2GW MI450, AMD 최대 $5B 투자 | 🔴[주장] 단일 출처 |
| Google TPU 외부 직판 | 고객 자체 데이터센터 설치용 판매 개시, "NVDA DC 매출의 최대 10%" 목표 | 🟡[주장] |
| Meta × Google TPU | 다수 보도, 최종 계약 조건은 출처 간 충돌 | 🔴[주장] |

**[의견]** NVDA의 가장 큰 두 독립 프론티어 랩 고객이 **둘 다 3원 조달(NVDA + AMD + 커스텀/TPU)**로 가고 있다.
그리고 여기서 인센티브가 드러난다: NVDA가 OpenAI 캠퍼스에 $105B 보증을 선 바로 그 시기에,
OpenAI는 AMD 6GW와 Broadcom 자체칩을 동시에 진행한다. **NVDA의 금융 지원은 독점을 사지 못했다 —
배분 순위만 샀다.**

**반대 근거**: ① GW당 NVDA 매출이 $18B→$40B로 늘었다면 같은 GW 경쟁에서 NVDA 1GW = ASIC 여러 GW의
매출 가치다. GW 점유율과 매출 점유율은 다르다. ② 프론티어 모델 구조가 매년 바뀌는 한 범용 GPU의
유연성 프리미엄은 남는다. ③ AVGO도 XPU 비중 증가로 GM이 210bp 하락(75%)했다 🟡 — 커스텀 칩도
메모리 원가 압박을 똑같이 받는다.

**결론: 현재 경쟁우위 폭 ★4 / 5년 지속성 ★3.**

---

## 3. 핵심 경쟁사별 위협 평가

| 경쟁자 | 무기 | 약점 | 위협(1~5) | 시점 | 근거 |
|---|---|---|---|---|---|
| **Broadcom (+Google TPU)** | 고객이 설계 주도권을 가짐 · 네트워킹(Tomahawk) 동시 보유 · 프론티어 랩 고객 확보 | 고객 수가 적어 집중 리스크 · 메모리 원가 전가력 낮음(GM -210bp) | **5** | 진행 중, FY28 정점 | 🟡 AVGO 실적 |
| **AMD (MI450/Helios)** | 랙스케일(Helios) 완성 · OpenAI·Anthropic 2대 랩 계약 · 지분 워런트로 고객을 주주화 | 회사 GM 54% vs NVDA 75% — 같은 랙을 더 싸게 파는 구조 · ROCm 생태계 열위 | **3** | 2026H2~2027 램프 | 🟡 |
| **Marvell (AWS Trainium·MSFT)** | AWS 커스텀 | 이번 조사에서 최신 수치 미확보 | ⬛ | — | ⬛ |
| **Huawei Ascend** | 중국 내 정책 보호 · CUDA 호환성 개선(950PR) | SMIC 공정 한계 · HBM 조달 제약 | 중국 **5** / 글로벌 **1** | 이미 진행 | 🟡 |
| **스타트업 (Groq·Cerebras 등)** | 추론 특화 | NVDA가 Groq 기술을 흡수해 "Groq 3 LPX" 플랫폼 출시 🟡[주장] | **1~2** | — | 🟡 |
| **Intel** | — | 데이터센터 AI 가속기 사실상 부재 | **1** | — | 🟡 |

**[의견] 멍거식 해석**: AMD의 진짜 무기는 칩이 아니라 **인센티브 설계**다 — OpenAI에 AMD 지분 최대 ~10%
워런트를 준 것은 고객을 "AMD가 성공해야 돈 버는 사람"으로 만든 것이다 🟡[사실, 계약 구조]. NVDA는 같은
게임을 *지분투자 $99B·보증 $105B*로 더 크게 하고 있다. 업계 전체가 **"고객에게 돈을 줘서 칩을 사게 하는"**
균형으로 가고 있다는 것 — 이것이 개별 칩 사양보다 중요한 산업 구조 변화다.

---

## 4. 세부 세그먼트

### 4-1. 학습 vs 추론

| 항목 | 값 | 신뢰도 |
|---|---|---|
| 추론 매출 비중 (NVDA 공시) | ⬛ 미공시 | ⬛ |
| 에이전트 AI 연산량 | 단순 질의 대비 15~100배 (경영진) | 🟡[주장] |
| "NVDA 추론 점유율 90%+ → 2028년 20~30%" | 출처 애널리스트 미상 | 🔴[주장] — 신뢰 불가, 참고만 |
| NVDA의 추론 대응 | Groq 3 LPX 플랫폼 출시, Rubin CPX(메모리 경량형) | 🟡[주장] |

**[의견]** 추론은 모델이 고정된 뒤의 반복 연산이라 ASIC이 구조적으로 유리하다. 그런데 NVDA가 Groq를
흡수한 것은 **위협을 무시하지 않고 자기 잠식(cannibalize)을 선택했다**는 뜻이다 — 멍거가 높이 사는 행동이다.
반대로, 추론용 저가 SKU 비중이 커지면 혼합 ASP와 GM이 낮아진다.

### 4-2. 네트워킹 — NVDA 해자의 가장 과소평가된 층

| 항목 | 값 | 신뢰도 |
|---|---|---|
| 네트워킹 매출 Q2 FY27 | **~$17.45B** (+~141% YoY), DC의 ~19.6% | 🔴[추정] Next Platform 역산치, 회사 공시 금액 아님 |
| ├ InfiniBand | ~$7.5B | 🔴[추정] |
| ├ Ethernet(Spectrum-X 포함) | ~$5.5B | 🔴[추정] |
| ├ NVSwitch/NVLink | ~$4.5B | 🔴[추정] |
| Spectrum-X 성장 | **2.6배 YoY** | 🟡[주장] 회사 발표 |
| 네트워킹 QoQ | +18% (분기 최고) | 🟡[주장] |

**[의견]** 이더넷이 InfiniBand를 대체한다는 "NVDA 네트워킹 위기론"은 데이터가 지지하지 않는다 — NVDA가
**이더넷에서도 이기고 있다**(Spectrum-X 2.6배). 반대로 경쟁의 진짜 전선은 Broadcom Tomahawk 계열과의
스케일아웃 이더넷이며, ASIC 진영이 커질수록 그 랙에는 NVDA 네트워킹이 들어가지 않는다.

### 4-3. 고객 구성 — "나머지 절반"이 더 빨리 큰다

| 고객군 | Q2 FY27 매출 | YoY | 신뢰도 |
|---|---|---|---|
| 하이퍼스케일 | $48.71B | +102% | 🟡[사실] |
| AI 클라우드·산업·엔터프라이즈(소버린·네오클라우드 포함, "ACIE") | $40.31B | **+138%** | 🟡[사실] |
| 네오클라우드 파트너 용량 | 3GW(2025말) → 8GW(2026말 예상) | — | 🟡[주장] |
| 직접 고객 집중도 | Q2 단일 고객 16% · 상반기 3사 16%/15%/13% (합 44%) | — | 🟡[사실] 10-Q 2차 인용 |

**[의견] 이번 판의 두 번째 비컨센서스 지점**: 더 빨리 크는 쪽(ACIE +138%)은 **신용도가 더 낮은 쪽**이다.
하이퍼스케일러는 자체 현금흐름으로 사지만, 네오클라우드·소버린 프로젝트는 부채와 — 이번 10-Q가 보여주듯 —
NVDA 자신의 지분·보증에 더 많이 기댄다. 다각화로 보이는 것이 실은 **신용 위험의 이전**일 수 있다.

**반대 근거**: 소버린 AI는 정부 예산이 원천이라 경기 둔감형이며, 하이퍼스케일러 의존도(=ASIC 대체 위험)를
낮추는 유일한 경로다. 네오클라우드는 ASIC을 쓸 수 없어 NVDA 고정 고객이다.

### 4-4. 엔터프라이즈

⬛ 별도 공시 없음(ACIE에 합산). 정량 판단 불가.

### 4-5. 중국

| 항목 | 값 | 신뢰도 |
|---|---|---|
| NVDA Q3 가이드 중 중국 DC compute | **$0 가정** | 🟡[사실] 회사 가이던스 |
| Q2 중국향 Hopper(H200) 출하 | DC 매출의 1% 미만 (미국 정부 라이선스) | 🟡[사실] |
| 2025 중국 AI 칩 출하 (IDC) | NVDA ~220만개(~55%) · Huawei 81.2만 · 알리바바 평두거 26.5만 | 🟡[추정] 2차 인용 |
| 2026 Huawei 950PR 출하 계획 | ~75만개 | 🟡[주장] Reuters 경유 Yahoo 보도 |
| "Ascend 중국 점유율 50% 돌파, NVDA 8%" | 출처 불명 | 🔴[주장] |

**[의견]** 중국은 더 이상 NVDA의 "옵션 가치"가 아니다. 가이던스가 이미 0을 가정하므로 **하방 리스크는 소진**됐고,
대신 Huawei가 정책 보호 아래 규모의 경제를 쌓는 시간을 벌고 있다 — 이것은 5~10년 뒤 글로벌 경쟁자 문제다.

---

## 5. 산업 트렌드

| 트렌드 | 데이터 | NVDA 영향 | 신뢰도 |
|---|---|---|---|
| 공급 제약 | FY28 +70%가 "공급 제약된" 수치 · 공급·용량 약정 **$279B**(전분기 $119B) — 남은 FY27 $92B / 2028 $87B / 2029 $88B | 단기 + (희소성 지대), 장기 − (공급 정상화 시 가격 정상화) | 🟡[사실] |
| 메모리 원가 급등 | 경영진 "극단적 가격 조건", Q4 GM 71~72% 저점 | − 단기 마진, 가격 인상으로 FY28 회복 시사 | 🟡[주장] |
| 전력 제약 → GW 단위 판매 | GW당 매출 $18B(Hopper)→$40B(Rubin) | + 전력이 제약이면 와트당 성능이 왕 — NVDA 유리 | 🟡[주장] |
| 랙스케일 시스템화 | Vera Rubin 8월 양산, Q3 DC의 ~20% 예상 | + 지갑 점유율 확대 / − 재고·매출채권 부담 증가 | 🟡[주장] |
| 수출 규제 | 중국 0 가정 | 하방 소진, Huawei 육성 | 🟡 |
| 벤더 파이낸싱 확산 | NVDA·AMD 모두 고객 지분·보증 | − 수요의 질 저하, 순환 리스크 | 🟡[사실] |
| TSMC 장기 전망 | AI 가속기 수요 **2029년까지 CAGR 40%대 중반** | + 산업 성장 지속 (단, NVDA 몫 아님) | 🟡[주장] |

> *"Invert, always invert."* — Charlie Munger

**뒤집어 보기**: "공급 제약된 +70%"는 강세 논거로 읽히지만, 뒤집으면 **현재 마진의 일부가 희소성 지대**라는 뜻이다.
TSMC가 2026 CAPEX를 $60~64B로 올리고(7월, $52~56B에서) CoWoS를 늘리는 이유는 그 지대를 없애기 위해서다.
공급이 수요를 따라잡는 순간(시점 ⬛), 가격 결정력은 공급 부족이 아니라 순수 기술 격차로만 정당화돼야 한다.

---

## 6. 밸류체인 — 가치는 어디에 있고, 병목은 어디인가

| 단계 | 대표 기업 | 최신 데이터 | 협상력 | 병목 여부 | 신뢰도 |
|---|---|---|---|---|---|
| 파운드리·패키징 | TSMC | Q3 매출 $46.7~46.9B(출처 간 0.4% 차) · 순이익 NT$763.1B(+69%) · HPC 68% · Q4 가이드 $52.3~54.3B | 높음 | CoWoS — 2027 "심각한 부족" 전망(증권사, 실적 전 발표) | 🟡 |
| HBM | SK하이닉스 · 삼성 · 마이크론 | Rubin HBM4 배분 SK ~70% / 삼성 ~30%(보도) · 마이크론 "2027 HBM 가격 2026보다 크게 높다" · HBM4 단가 HBM3E 대비 +50%↑ 보도 | **가장 높음(현재)** | **최대 병목** — NVDA 약정 $279B 대부분이 메모리 | 🔴~🟡 |
| 가속기 설계 | NVDA · AVGO · AMD | NVDA GM 75.0% · AVGO GM 75%(-210bp) · AMD GM 54% | 높음 | — | 🟡 |
| 네트워킹 | NVDA · AVGO | 위 4-2 | 중상 | — | 🔴~🟡 |
| 전력·냉각·부지 | 유틸리티 · SB Energy 등 | GW당 총 DC 투자 ~$60B 중 비칩 ~$20B (Rubin 기준, 회사 주장에서 역산) | 상승 중 | 전력 인입 — 장기 병목 | 🟡[추정] |
| 최종 수요 | 하이퍼스케일러 · 프론티어 랩 · 네오클라우드 | CAPEX ~$700B+ · 일부를 NVDA가 금융 | 약함(공급 부족기) → 강해짐(정상기) | **신용** — 숨은 병목 | 🟡 |

**[의견] 가치 이동 판정**
- **현재**: 가치는 **NVDA와 HBM 3사**에 집중. NVDA는 메모리 원가 상승을 가격 인상으로 전가 중이며(FY28 GM 회복 가이드),
  GW당 몫은 오히려 늘었다 → 이전판의 "가치가 NVDA에서 빠져나간다" 판단은 **철회**.
- **2027~28**: 병목이 CoWoS·HBM(공급 측)에서 **전력과 최종 수요자의 신용(수요 측)**으로 이동할 가능성이 크다 [추정].
  공급 병목은 협상력을 공급사에 주지만, 신용 병목은 협상력을 **돈을 대는 쪽**에 준다 — 그래서 NVDA가 돈을 대기 시작했다.

---

## 7. 반론 검증표 — 컨센서스 vs 데이터

| 컨센서스 | 데이터가 말하는 것 | 판정 |
|---|---|---|
| "NVDA 마진은 정점을 지났다" | Q2 75.0%, 원가 상승을 가격 인상으로 전가, FY28 72~73% 가이드 | **과장**. 정점 대비 2~3pp 하락이지 붕괴 아님 |
| "ASIC은 자가소비라 위협 제한적" | Anthropic·OpenAI·Meta가 TPU/커스텀 채택, AVGO FY28 $230B 시사 | **틀림** |
| "이더넷이 NVDA 네트워킹을 잠식" | Spectrum-X 2.6배 — NVDA가 이더넷도 판다 | **틀림** |
| "중국 상실은 큰 리스크" | 가이던스 0 가정, 이미 반영 | **이미 가격 반영된 과거 리스크** |
| "수요는 하이퍼스케일러 현금흐름이 뒷받침" | NVDA 지분 $99B·보증 $108.5B·클라우드 약정 $29B | **부분적으로 틀림** — 수요의 일부를 NVDA가 댄다 |
| "AMD가 2위 도전자" | AMD GM 54%·위협 3 vs AVGO 성장 221% | **2위 위협은 AMD가 아니라 AVGO** |

---

## 8. 종합 결론

**종합 ★4 — 해자는 건재하나, 해자를 지키는 방식이 바뀌었다.**

1. **기술·제품 해자 ★4~5 유지.** GM 75.0%, GW당 매출 2배 이상, 네트워킹에서 이더넷까지 장악. 이전판의
   "마진 균열" 진단은 메모리 원가 타이밍을 과대 해석한 것이었다 — 정정한다.
2. **경쟁의 실체는 Broadcom이다.** 분기 AI 매출이 NVDA DC의 ~19%, 성장률 ~1.9배. 프론티어 랩들의 3원 조달이
   현실이 됐다. 점유율은 FY2027~28에 걸쳐 완만히 하락할 가능성이 크다 [추정].
3. **🔴 새 리스크 축: 수요의 자기금융.** 지분투자 $99B(반년 만에 4.4배)·OpenAI 캠퍼스 보증 최대 $105B는
   NVDA가 고객 신용 위험을 떠안기 시작했다는 뜻이다. 이건 칩 경쟁 문제가 아니라 **사이클이 꺾일 때 손실이
   증폭되는 구조(lollapalooza)** 문제다 — 매출 감소 + 투자 평가손 + 보증 손실이 동시에 온다.
4. **관찰할 숫자(다음 분기 10-Q)**: ① 지분투자 잔액과 신규 보증 ② ACIE 성장률 vs 하이퍼스케일 ③ AVGO AI ÷ NVDA DC
   비율(현재 ~19%, 25% 돌파 시 경고) ④ Q4 GM이 가이드 71~72%를 지키는지 ⑤ 매출채권·재고 증가율 vs 매출 증가율.

**멍거의 세 바구니: "Yes"와 "Too tough"의 경계.** 사업은 Yes다. 그러나 최종 수요의 지불 능력이 자본시장의
인내심에 달려 있고, 그 인내심의 일부를 NVDA 자신이 대고 있어 — 사이클의 끝을 예측하는 일은 Too tough다.

> *"The first rule of compounding: never interrupt it unnecessarily."* — Charlie Munger
> (반대로 읽으면 — 복리를 끊는 것은 대개 경쟁이 아니라 레버리지다.)

---

## 출처

- SEC EDGAR XBRL companyfacts — `reports/NVDA/_data.md` (FY2017~FY2026 연간 재무) 🟢
- SEC EDGAR 전문검색 — NVDA 8-K 2026-08-17(Items 1.01·2.03, `sbeoainvidia-portsrelease.htm`), 10-Q 2026-08-26 존재 확인 🟢 (본문 금액은 미열람)
- [Quartr — NVDA Q2 FY27 요약](https://quartr.com/events/nvidia-corporation-nvda-q2-2027_33dRoFp6)
- [Hudson Labs — NVDA Q2 2027 10-Q 분석](https://www.hudson-labs.com/research/nvidia-q2-2027-earnings)
- [StockHub — NVDA Q2 FY27 실적 콜](https://stockhub.kr/en/insights/view_1787778662493_qnf75rbqx)
- [The Next Platform — NVDA 네트워킹 추정](https://www.nextplatform.com/compute/2026/08/27/the-network-is-more-of-nvidias-computer-than-it-ever-was-at-sun/5292807)
- [Nasdaq — NVDA Q2 실적](https://www.nasdaq.com/articles/nvidia-q2-earnings-beat-blackwell-ultra-data-center-strength)
- [SEC — Broadcom 8-K FY2026 Q3](https://www.sec.gov/Archives/edgar/data/0001730168/000173016826000076/avgo-08022026x8kxex99.htm) · [TIKR — AVGO Q3](https://www.tikr.com/blog/google-anthropic-and-openai-just-locked-in-broadcoms-q3-earnings-through-2028) · [Pulse2 — AVGO Q3](https://pulse2.com/broadcom-q3-fiscal-2026-revenue-jumps-86-to-29-6-billion-as-ai-semiconductor-revenue-reaches-16-7-billion/)
- [Yahoo Finance — 하이퍼스케일러 $700B](https://finance.yahoo.com/sectors/technology/articles/hyperscalers-hit-700-billion-2026-111243744.html) · [Sherwood](https://sherwood.news/tech/alphabet-amazon-microsoft-meta-plan-more-than-700-billion-on-capex-this-year/) · [Statista](https://www.statista.com/chart/35046/)
- [StorageNewsletter — AMD Q2 2026](https://storagenewsletter.com/2026/08/06/amd-fiscal-2q26-financial-results) · [CXO Digital Pulse — Helios](https://www.cxodigitalpulse.com/amd-says-helios-ai-servers-are-in-full-production-with-openai-deployment-planned-later-this-year/)
- [Yahoo Finance — Huawei 950PR (Reuters 경유)](https://finance.yahoo.com/sectors/technology/articles/exclusive-huaweis-ai-chip-favour-065327884.html) · [HuaweiCentral — IDC 2025](https://www.huaweicentral.com/huawei-gave-tough-spot-to-nvidia-in-2025-chinese-ai-chip-sales-race/)
- [KSL/AP — TSMC Q3](https://www.ksl.com/article/51636529/tsmc-expected-to-report-sixth-straight-quarter-of-record-profit-thanks-to-ai-boom) · [investingLive — TSMC Q3](https://investinglive.com/stocks/tsmc-set-for-sixth-straight-record-profit-as-ai-demand-lifts-q3-earnings/)
- [TrendForce — Rubin HBM4 공급사](https://www.trendforce.com/news/2026/03/09/news-samsung-sk%E2%80%AFhynix-reportedly-tapped-as-nvidia-rubin-hbm4-suppliers-shipments-could-start-in-march) · [SiliconANGLE — Google·Meta TPU](https://siliconangle.com/2026/02/26/google-meta-reportedly-strike-new-multibillion-dollar-ai-chip-deal/) · [AIMultiple — TrendForce ASIC +44.6%](https://aimultiple.com/ai-companies)

**⬛ 데이터 공백**: MSFT CY2026 CAPEX(출처 충돌) · NVDA 추론 매출 비중 · NVDA FY27 Q1 매출(이번 조사 미확인) ·
Marvell 최신 AI 매출 · AMD DC GPU 분리 매출 · Meta MTIA/MSFT Maia/AWS Trainium 개별 점유율 · 엔터프라이즈 매출 ·
공급 정상화 시점. **NVDA 10-Q 원문(지분투자·보증 금액)은 직접 열람하지 못했다** — 2차 출처 2곳(Hudson Labs·StockHub)
일치로 🟡 처리. 후속 단계에서 10-Q 원문 대조 권장.

<!-- discount-ledger
role: 산업·경쟁(멍거)
items:
  - name: 경쟁·원가 압박에 따른 매출총이익률 하향 (Q2 75.0% → FY28 가이드 72~73%, 약 2~3pp)
    pct: 3
    reason: 회사 가이던스 기반 산술 — GM 2pp 하락은 영업이익률 ~60% 기준 영업이익 약 3% 감소 [사실(가이던스)·추정(환산)]
    overlapsWith: 재무·밸류에이션(버핏) 마진 가정
  - name: Broadcom/TPU 커스텀 ASIC에 의한 점유율 하향
    pct: ⬛
    reason: AVGO AI 매출이 NVDA DC의 ~19%, 성장률 ~1.9배 [사실·산술]. 점유율 하락 폭은 정량화 근거 부족 [추정]
    overlapsWith: 사업모델(단융핑) 성장률 가정
  - name: 수요의 자기금융(지분투자 $99B·보증 최대 $108.5B) — 수요의 질 하향
    pct: ⬛
    reason: 10-Q 2차 인용 [사실]. 사이클 하강 시 손실 증폭 규모는 정량화 불가 [의견]
    overlapsWith: 리스크관리(리루) 하방 시나리오
total: 3
-->

<!-- confidence-summary
high: 7
medium: 48
low: 13
gap: 10
verdict: 보통
-->
