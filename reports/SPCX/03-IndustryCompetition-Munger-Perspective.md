# SpaceX (SPCX) — 산업 구도·경쟁 포지션 분석 (멍거 관점)
<!-- meta sector: Space -->

> 작성: industry-researcher (찰리 멍거 관점) · 기준일 2026-10-06 · 정보 풍부도 **B등급**(상장 2026-06-12, 10-K 없음)
> 재무·세그먼트 수치는 `reports/SPCX/_data.md`(2026-10-06 수집)를 그대로 사용. 경쟁·산업 수치만 신규 조사(WebSearch 10회).
> 표기: 🟢 원문/복수 독립출처 · 🟡 단일 2차 출처·검색 경유 · 🔴 추정·출처 상충 · ⬛ 데이터 없음 / `[사실]` `[추정]` `[주장]`(회사·경영진 발언) `[의견]`

> "Show me the incentive and I'll show you the outcome." — Charlie Munger
> 이 보고서의 질문은 하나다: **SpaceX의 각 사업에서 경쟁자는 무엇을 하고 싶어하고, 그걸 할 수 있는가?**

---

## 0. 요약 (한 장)

| 사업 | 2026 Q2 매출(연환산) | 산업 내 위치 | 해자 판정 | ★ |
|---|---|---|---|---|
| Space (발사) | $0.96B (~$3.8B) 🟢 | 글로벌 상업 발사 점유율 82%(2025) 🟡 — 사실상 독점 | 원가·재사용·발사 빈도 = **규모의 경제 + 학습곡선**. 강함 | ★★★★★ |
| Connectivity (Starlink) | $4.3B (~$17B) 🟢 | LEO 브로드밴드 압도적 1위(가입자 ~1,200만) 🟡 | 자체 발사로 위성 배치 원가 우위 + 선점 스펙트럼·궤도. 강함, 단 D2D는 경합 | ★★★★☆ |
| AI (xAI·X·클라우드) | $2.6B (~$10.4B) 🟢 | neocloud/모델 시장 후발 다수 중 1 | 해자 근거 약함 — 자본 집약·상품화 위험 | ★★☆☆☆ |
| **종합 경쟁 포지션** | $7.81B (~$31B) | 우주 인프라는 독점적, AI는 경쟁 시장 | **우량 사업 2개 + 판단 불가 사업 1개의 결합** | **★★★★☆** |

**한 줄 결론 [의견]**: 발사·Starlink는 멍거가 말하는 "넓고 깊어지는 해자"의 교과서적 사례이나, 자본(Q2 capex $18.4B 중 AI $15.8B 🟢)의 대부분이 해자가 가장 약한 AI 컴퓨트로 흘러가고 있다. **경쟁 포지션은 ★4, 자본 배분 대상의 경쟁 구도는 ★2** — 이 괴리가 핵심 리스크다.

---

## 1. 산업 규모 & 성장

### 1-1. 우주 경제 전체

| 항목 | 값 | 출처 | 신뢰도 |
|---|---|---|---|
| 글로벌 우주 경제 2025 | $686B (Space Foundation) / $626B (Novaspace) | payloadspace · newspaceeconomy | 🟡 [사실] — 정의 차이로 $60B 괴리 |
| 성장률 | +12% YoY(2025), 5년 CAGR ~10% | payloadspace | 🟡 [사실] |
| 정부 우주 예산 | $141B (53개국, +7.4%) | payloadspace | 🟡 [사실] |
| 상업 비중 | ~78% | payloadspace | 🟡 [사실] |
| $1조 돌파 시점 | 2032~2034 | newspaceeconomy | 🔴 [추정] 업계 전망 |

**시사점 [의견]**: SpaceX 회사 목표 "2030년 매출 $1조"(🟡 [주장], `_data.md`)는 **2025년 전 세계 우주 경제 합계($626~686B)를 넘는 숫자**다. 이 목표가 우주만으로는 산술적으로 불가능하며 AI 컴퓨트·모바일 통신 같은 **지상 시장 잠식**을 전제로 한다는 뜻이다. 그 순간 SpaceX는 독점 시장(우주)에서 경쟁 시장(클라우드·통신)으로 걸어 들어간다.

### 1-2. 세그먼트별 TAM·성장·침투율

| 세그먼트 | TAM / 시장 규모 | 성장률 | SpaceX 위치·침투율 | 신뢰도 |
|---|---|---|---|---|
| **발사 서비스** | $10~12B/년 (외부 판매 기준) | 발사 횟수 기준 고성장(2025 전 세계 329회 시도 신기록) | SpaceX 2025년 165회, 상업 점유율 82% · Space 매출 연환산 ~$3.8B ≈ 외부 시장의 **32~38%**(매출 기준, Starlink 자체 발사는 내부거래라 미포함) | 🟡 / 🔴 [추정] 매출 점유율은 필자 산술 |
| **위성 브로드밴드(소비자)** | 리서치 기관 추정 $6.3B(2025) → $34B(2035), CAGR 18% (Spherical Insights) | 18%+ | ⚠️ **이 TAM 추정은 무의미하다** — Starlink 단독 연환산 매출 ~$17B가 이미 "시장 전체"의 2.7배. 리서치 기관 정의가 현실을 못 따라감 | 🔴 TAM 수치 신뢰 불가 |
| 기업·항공·해운 | ⬛ 독립 TAM 미확보 | ⬛ | Starlink 매출 내 비중 ⬛(회사 미공시) | ⬛ |
| **D2D(위성-스마트폰 직접)** | 2026: $0.56B(Fortune BI) ~ $0.97B(GMI) ~ **$7.6B(TrendForce, 스마트폰 직접연결 +49%)** | 23~36% CAGR | Starlink D2C(T-Mobile T-Satellite·Boost) 선발주자, 매출 분리 ⬛ | 🔴 기관 간 13배 괴리 |
| **정부·국방 우주** | 정부 우주 예산 $141B · NSSL Phase 3 총 $13.7B(SpaceX·ULA·Blue Origin) | +7.4% | NSSL Lane 2 FY26: SpaceX 5건 $714M vs ULA 2건 $428M vs Blue 0건 → **건수 71%, 금액 63%** | 🟢 (Space Systems Command 원문 + SatelliteToday) |
| **AI 컴퓨트(neocloud)** | ⬛ 단일 TAM 합의 없음. 비교점: CoreWeave 2026 매출 가이던스 $12.4~13.2B, 백로그 $104B(6/30) | 3자리 성장(CoreWeave) | SpaceX AI 매출 연환산 ~$10.4B — 단 대부분 xAI·X 광고·내부/관계사 성격, Google 계약 월 ~$920M×32개월(10월 인식 개시) | 🟢 CoreWeave(SEC 8-K) / 🟡 SPCX |

> **D2D TAM의 교훈 [의견]**: 같은 해 시장을 $0.56B와 $7.6B로 부르는 산업에서 "TAM × 점유율" 방식의 가치평가는 숫자 놀이다. 멍거식으로는 **TAM을 믿지 말고 단위경제(ARPU·위성당 원가·스펙트럼 보유량)를 비교**해야 한다.

**차원 결론 — 산업 매력도: ★★★★☆**
- 근거: 우주 경제 10% CAGR, 발사·브로드밴드는 공급 과점 🟡
- 하지만 반대로: 발사 외부 시장은 $10~12B로 작고, 회사 성장의 대부분은 **TAM이 불명확하거나(D2D) 경쟁이 치열한(AI)** 영역에서 와야 한다.

---

## 2. 경쟁 구도

### 2-1. 발사

| 사업자 | 주력 | 2025~26 현황 | 재사용 | SpaceX 대비 위협 | 신뢰도 |
|---|---|---|---|---|---|
| **SpaceX** | Falcon 9/Heavy, Starship | 2025년 165회(사상 최다). Starship Flight 14 첫 궤도 도달(9-28), 10-01 13시간 내 3회 발사 | 1단 완전 재사용 상용화, Starship 완전 재사용 목표 | — | 🟡 / `_data.md` |
| Rocket Lab (RKLB) | Electron(300kg), Neutron(13t, 재사용) | Neutron 첫 비행 2026 목표. Iridium 인수(EV ~$8B, 주당 $54, 2027 중반 종결) | Neutron 부분 재사용 | 중형 시장 진입, **수직계열화(발사+위성+통신) 복제 시도** | 🟡 |
| Blue Origin | New Glenn | 2026-05 New Glenn **발사대 폭발**. NASA 달 로버 $188M 수주. NSSL FY26 배정 0건 | 1단 재사용 설계 | 자본은 무한(베조스)이나 실행 지연 | 🟡 |
| ULA | Vulcan | NSSL FY26 2건 $428M | 비재사용 | 국방 이중화 수혜자, 원가 경쟁 불가 | 🟢 |
| Arianespace | Ariane 6 | Amazon Leo 발사(Ariane 64) | 비재사용 | 유럽 주권 수요 한정 | 🟡 |
| 중국 (CASC·민영) | Long March 계열 | Guowang ~190기, Qianfan 218기 배치(2026 중반) | 민영사 재사용 시험 단계 ⬛ | 서방 시장 접근 불가 — **직접 경쟁 아님, 지정학적 경쟁** | 🟡 |

**판단 [의견]**: 발사는 경쟁 시장이 아니다. 2위 그룹은 (a) 아직 비행하지 않았거나(Neutron), (b) 폭발했거나(New Glenn), (c) 원가 구조로 경쟁할 수 없다(ULA·Ariane). 이 격차는 **자본이 아니라 누적 비행 횟수(학습곡선)** 에서 나온다 — 베조스의 자본으로도 사지 못한 것이 증거다 🟡.
- 하지만 반대로: 미 정부는 **의도적으로 2·3번째 공급자를 키운다**(NSSL 이중화). 국방 매출은 점유율 상한이 정책으로 막혀 있다(FY26 금액 기준 63%). Starship이 지연되면 Falcon 9 원가 우위만으로 10년 뒤 New Glenn/Neutron을 막을 수 있는지는 ⬛.

### 2-2. 위성통신 (브로드밴드 + D2D)

| 사업자 | 위성 수 | 가입자·매출 | 전략 | 최근 이벤트 | 신뢰도 |
|---|---|---|---|---|---|
| **Starlink** | ~10,000기 근접(2026 초) | 누적 ~1,200만, Q2 분기 순증 170만+, ARPU $66/월, 연환산 매출 ~$17B | 소비자+기업+항공해운+정부(Starshield)+D2C, **Starlink Mobile로 통신사 직접 공략 선언**(8월) | FCC가 EchoStar 스펙트럼 65MHz 인수 승인(2026-05-12) | 🟡 |
| **Amazon Leo** (Kuiper) | 396기(2026-07-02) / 목표 3,200기(2029) | 가입자 ⬛ — 2026 가을 베타 | Prime·AWS 번들, **Globalstar 인수($11.57B, 주당 $90) + Apple iPhone/Watch 위성 연결 공급 계약** | FCC 1,600기 배치 시한(2026-07-30) 미달 예상 → 연장 신청 | 🟡 |
| Eutelsat OneWeb | 654기(Gen1) + 440기 추가 계획 | LEO 매출 €297M(FY 6월 결산, +69.5%), 그룹 매출의 25% | B2B·정부·항공, 유럽 주권 수요(우크라이나) | 마진 전망 실망에 주가 하락(8월) | 🟡 |
| AST SpaceMobile (ASTS) | 목표 45~60기(2026말) | 2026 매출 가이던스 $150~200M | **기존 통신사 스펙트럼 위 D2D 도매 — AT&T(2030까지 확정계약)·Verizon(850MHz)** | BlueBird 11~13 ~200Mbps D2D 시연(뉴스 메모) | 🟢 (SEC 8-K) / 🟡 |
| Globalstar | — | Apple SOS 텍스트 | → Amazon 인수 | 2026-04 발표 | 🟡 |
| Iridium | 66기+ | — | → Rocket Lab 인수(2027 중반 종결) | 2026-06 발표 | 🟡 |
| EchoStar/Hughes | GEO | — | 스펙트럼 SpaceX에 매각($17B + AWS-3 $2.6B 주식) → Hughes Chapter 11 | Boost Mobile, Starlink D2C 장기 파트너 | 🟡 |
| 중국 Guowang·Qianfan | ~190 / 218기 | ⬛ | 국가 주도, 일대일로 시장 | Qianfan 2027 1,300기 목표 | 🟡 |

**구조 해석 [의견]**: 2026년 상반기에 통신위성 산업은 **3개 블록으로 재편**됐다.
1. **SpaceX 블록**: 자체 발사 + Starlink + EchoStar 스펙트럼 + T-Mobile·Boost. → 수직계열화 완성형.
2. **Amazon 블록**: Leo + Globalstar(스펙트럼·Apple 관계) + AWS + 외부 발사(SpaceX·Ariane·Blue). → 자본·고객 보유, 발사 원가 열위.
3. **통신사 연합 블록**: AT&T·Verizon + ASTS(+Google·Vodafone 투자 ⬛). → 스펙트럼·가입자 보유, 위성 규모 열위.
4. (주변) Rocket Lab+Iridium: 국방·IoT 니치.

### 2-3. AI 컴퓨트

| 사업자 | 규모 지표 | 전략 | SpaceX 대비 | 신뢰도 |
|---|---|---|---|---|
| 하이퍼스케일러(AWS·Azure·GCP) | ⬛(이번 조사 범위 외) | 자체 칩·고객 기반·소프트웨어 생태계 | 자본·고객·소프트웨어 모두 우위 | ⬛ |
| Oracle OCI | ⬛ | 대형 장기계약(OpenAI 등) | ⬛ | ⬛ |
| CoreWeave | 2026 매출 $12.4~13.2B, 백로그 $104B + Q3 초 $25B 추가 | 순수 GPU 임대, 레버리지 높음 | SpaceX AI 매출(~$10.4B 연환산)과 **같은 체급** | 🟢 SEC 8-K |
| **SpaceX AI** | Q2 $2.6B(+247%), adj. EBITDA $1.1B 첫 흑자, Q2 AI capex $15.8B | xAI 모델(Grok) + X 광고 + 외부 컴퓨트 임대(Google 월 ~$920M) + 우주 데이터센터(Suncatcher TPU 위성) + Terafab(칩 제조, Tesla 공동) | 차별점: 자체 전력·발사·우주 DC 옵션. 약점: 고객 다변화 ⬛, 매출 중 관계사 비중 ⬛ | 🟡 |

**판단 [의견]**: AI 컴퓨트는 **"누가 GPU를 더 많이 사서 꽂는가"** 시장이며, 공급자(NVIDIA)가 이익의 대부분을 가져간다(아래 6장). CoreWeave와 SpaceX AI가 비슷한 매출 체급이라는 사실은 이 사업에서 SpaceX가 **특별하지 않다**는 증거다 🟡. Google 계약은 "SpaceX의 컴퓨트를 Google이 산다"는 수요 검증이지만, 동시에 **고객이 하이퍼스케일러 자신**이라는 것은 하이퍼스케일러가 자체 용량을 확보하면 이탈할 수 있다는 뜻이다(32개월 계약 이후 ⬛).
- 하지만 반대로: 궤도 데이터센터(전력·냉각 무제한)가 실제로 원가 우위를 내면, 이는 **발사 원가 독점이 AI로 전이**되는 유일한 경로다. 현재 근거는 시연 수준(Suncatcher)이며 단위경제 ⬛.

---

## 3. 핵심 경쟁사 위협 개별 평가

| 위협 | 대상 사업 | 위협 강도 | 시점 | 근거 | 신뢰도 |
|---|---|---|---|---|---|
| **Amazon Leo + Globalstar + Apple** | Starlink 소비자·D2D | **높음** | 2027~2029 | 자본 무제한, Prime 번들 유통, **Apple 기기 위성연결 독점 공급권 확보** | 🟡 |
| **AST SpaceMobile + AT&T·Verizon** | Starlink D2C/Mobile | 중~높음 | 2026말~2028 | 미국 1·2위 통신사 확정계약, 광대역 D2D(~200Mbps) 시연 | 🟡 |
| 통신 3사(채널 충돌) | Starlink Mobile | 중 | 2027~ | Starlink Mobile이 통신사 **경쟁자**로 전환 → T-Mobile 파트너십 긴장 가능 | 🔴 [추정] |
| Rocket Lab (+Iridium) | 발사 중형·국방 | 낮음~중 | 2027~ | Neutron 미비행, Iridium 종결 2027 | 🟡 |
| Blue Origin | 발사 대형·NSSL | 낮음(단기) / 중(장기) | 2028~ | New Glenn 폭발(2026-05), 자본은 충분 | 🟡 |
| 중국 Guowang·Qianfan | 해외 브로드밴드(신흥국) | 중 | 2027~ | 국가 보조, 비서방 시장 우선권 | 🟡 |
| CoreWeave·하이퍼스케일러 | AI 컴퓨트 | **높음** | 현재 | 가격 경쟁, 고객 다변화 우위 | 🟡 |

### 3-1. Amazon Leo — 가장 진지한 경쟁자
- **사실**: 396기(7월) vs Starlink ~10,000기 → 위성 수 기준 Starlink의 ~4% 🟡. 가을 베타, 극지방부터 서비스 시작 🟡. FCC 시한 미달 예상 🟡. 발사를 **SpaceX에게도 맡긴다**(경쟁자가 고객) 🟡.
- **강점 [의견]**: (1) 소매 유통·번들(Prime), (2) AWS 기업 고객 관계, (3) Apple — Globalstar 인수와 동시에 iPhone/Watch 위성연결 공급 계약을 가져간 것은 **D2D의 최대 단일 유통 채널(iPhone)을 Starlink로부터 선점**한 것이다.
- **약점 [의견]**: 발사 원가를 경쟁사(SpaceX)·저빈도 사업자(Ariane·Blue)에 의존. 5년 늦게 출발한 학습곡선.
- **판정**: Starlink 소비자 시장 점유율은 **하락 방향이 확실**, 폭은 ⬛. 과점 2자 구도에서 ARPU($66, QoQ 보합 🟢) 하방 압력 [추정 🔴].
- 하지만 반대로: 브로드밴드 수요가 공급을 크게 초과하는 국면(Q2 순증 170만 🟡)에서는 2위 진입이 1위 가격을 즉시 깎지 않을 수 있다.

### 3-2. AST SpaceMobile D2D vs Starlink Direct-to-Cell / Starlink Mobile

| 항목 | ASTS | Starlink D2C → Starlink Mobile |
|---|---|---|
| 모델 | 통신사 **도매**(통신사 스펙트럼 사용, 수익 분배) | 현재 도매(T-Mobile), 향후 **자체 소매 통신사**(Starlink Mobile) |
| 스펙트럼 | 파트너 통신사 저대역(AT&T·Verizon 850MHz 등) | **자체 보유**: EchoStar AWS-4·H-block 65MHz(FCC 승인 2026-05-12) + AWS-3 |
| 위성 | 대형 안테나 BlueBird, 45~60기(2026말 목표) | 기존 D2C 위성 수백 기 ⬛ + 차세대 2027 발사 · "100배" 성능 2027말 목표 [주장] |
| 통신사 관계 | AT&T·Verizon 확정 | T-Mobile·Boost(EchoStar) |
| 매출 | 2026 가이던스 $150~200M 🟢 | 분리 공시 ⬛ |
| 인센티브 | 통신사와 이해 일치(통신사 가입자 유지) | 통신사와 **이해 충돌**(가입자 탈취 가능) |

**멍거식 인센티브 분석 [의견]**: AT&T·Verizon이 ASTS를 택한 이유는 기술이 아니라 **인센티브**다. ASTS는 통신사의 고객을 빼앗을 수 없는 구조(자체 스펙트럼 없음)이고, SpaceX는 자체 스펙트럼을 사들이고 "Starlink Mobile"을 선언함으로써 **잠재적 경쟁자임을 스스로 공표**했다. 결과적으로 Starlink는 미국 D2D 도매 시장에서 T-Mobile 외의 대형 파트너를 얻기 어려워졌을 가능성이 높다 🔴[추정].
- 하지만 반대로: 자체 스펙트럼 + 자체 발사를 가진 쪽만이 **도매 수수료가 아닌 소매 마진 전체**를 가질 수 있다. SpaceX는 파트너십 일부를 포기하고 더 큰 경제적 지분을 노리는 선택을 했다. 성공하면 ASTS보다 훨씬 큰 이익 풀이다.
- 기술 리스크: Starlink Mobile 본격 성능은 2027말 목표 [주장], ASTS는 2026 내 연속 서비스 목표 [주장] — **둘 다 아직 증명 전**.

### 3-3. 통신 3사와의 관계
| 통신사 | 현재 관계 | 방향 |
|---|---|---|
| T-Mobile | Starlink D2C 파트너(T-Satellite) 🟡 | Starlink Mobile 출시 시 협력→경쟁 전환 위험 🔴[추정] |
| AT&T | ASTS 확정계약(~2030) 🟡 | Starlink와 대립 진영 |
| Verizon | ASTS 파트너(850MHz) 🟡 | Starlink와 대립 진영 |
| Boost(EchoStar) | Starlink D2C 장기 파트너 🟡 | 스펙트럼 매각 대가로 결속 |

**차원 결론 — 경쟁 위협 강도: ★★★☆☆(중간)** — 발사는 위협 거의 없음, 브로드밴드는 Amazon이 실질 위협, D2D는 진영 싸움, AI는 위협 높음.

---

## 4. 세부 시장 세그먼트별 구도

| 세그먼트 | 구조 | SpaceX 지위 | 경쟁자 | 해자 원천 | ★ |
|---|---|---|---|---|---|
| 상업 발사(외부) | 사실상 1강 | 점유율 82%(2025) 🟡 | RKLB, Ariane, (Blue) | 재사용·발사빈도 원가 | ★★★★★ |
| 국방 발사(NSSL) | 정책적 과점 | Lane 2 FY26 건수 5/7 🟢 | ULA, Blue Origin | 신뢰성 + 원가 / 단 정책이 상한 | ★★★★☆ |
| 소비자 LEO 브로드밴드 | 1강 → 2강 전환 중 | ~1,200만 가입자 🟡 | Amazon Leo, 중국(해외) | 배치 선점·원가 | ★★★★☆ |
| 기업·항공·해운 | 1강 + 니치 | 점유율 ⬛ | OneWeb(€297M), Viasat·SES(GEO) ⬛ | 저지연·커버리지 | ★★★★☆ |
| 정부 통신(Starshield) | 경합 | 매출 ⬛ | OneWeb(유럽 주권), RKLB+Iridium | 보안 인증·배치 규모 | ★★★☆☆ |
| D2D | 3진영 전쟁 | 선발이나 대형 통신사 2곳 경쟁진영 | ASTS+AT&T/VZ, Amazon+Globalstar+Apple | 스펙트럼 자체 보유 | ★★★☆☆ |
| AI 모델·광고(xAI·X) | 다자 경쟁 | 점유율 ⬛ | OpenAI, Google, Anthropic, Meta | ⬛ 근거 부족 | ★★☆☆☆ |
| AI 컴퓨트 임대 | 다자 경쟁 | CoreWeave와 동급 매출 🟡 | 하이퍼스케일러, CoreWeave, Oracle | 전력·우주 DC 옵션(미증명) | ★★☆☆☆ |

---

## 5. 산업 트렌드

| 트렌드 | 내용 | SpaceX 영향 | 신뢰도 |
|---|---|---|---|
| **Starship·완전 재사용** | Flight 14 첫 궤도 도달(9-28), 13시간 내 3회 발사(10-01) | 성공 시 kg당 원가 추가 급락 → 경쟁사와의 격차가 **좁혀지지 않고 벌어지는** 구조. Starlink V3·D2C 차세대 배치의 전제 | 🟡 `_data.md` |
| **스펙트럼 규제(FCC)** | SpaceX EchoStar 65MHz 승인(05-12), Amazon 배치 시한 연장 신청 예상 | FCC가 **SpaceX에 유리한 결정**을 이어감. 단 정치 환경 변화 시 반전 가능(머스크-정부 관계) | 🟡 / 🔴[추정] 정치 리스크 |
| **국방 조달 분산(NSSL)** | Phase 3 총 $13.7B, Lane 1 상한 $11.4B 증액(7월), Lane 2 FY26 SpaceX 5·ULA 2·Blue 0 | 점유율은 높으나 정책적으로 **2·3번째 공급자 육성** → 장기 상한 존재 | 🟢 / 🟡 |
| **우주 데이터센터** | Google Suncatcher TPU 위성 발사(10-01) | 발사 독점이 AI로 이어지는 유일한 구조적 경로. 단위경제 ⬛ | 🟡 / ⬛ |
| **수직 통합·M&A 붐** | Amazon←Globalstar($11.57B), RKLB←Iridium(~$8B), SpaceX←EchoStar 스펙트럼(~$19.6B), SpaceX←Cursor($60B 주식) | 경쟁자들이 SpaceX 모델(발사+위성+스펙트럼+서비스)을 **복제**하는 중 | 🟡 |
| **신규 진입자** | 중국 2대 메가컨스텔레이션(합계 ~400기), 유럽 IRIS² ⬛ | 비서방 시장 상실 위험 | 🟡 |
| **Terafab(칩 제조)** | Tesla 공동, TX, 1단계 $16.8B | 업스트림 진출 — 자본 수요 추가 확대 | 🟡 `_data.md` |

> "It's not supposed to be easy. Anyone who finds it easy is stupid." — Munger
> 트렌드 대부분이 SpaceX의 우주 해자를 **강화**한다. 그러나 M&A 붐은 경쟁자들이 "SpaceX를 이기는 방법"을 찾았다는 신호이기도 하다 — **SpaceX의 발사 서비스를 구매하면서 SpaceX의 위성 사업과 경쟁하는 것**.

---

## 6. 밸류체인 — 가치는 어디에 쌓이는가

| 단계 | 구성 | 대표 기업 | 이익 풀 집중도 | SpaceX 위치 | 신뢰도 |
|---|---|---|---|---|---|
| 업스트림: 부품·칩 | 우주급 전자·RF·태양전지 / **AI GPU** / 파운드리 | NVIDIA(AI), 자체(Starlink 칩) | **AI: 업스트림이 이익 대부분 흡수**(GPU 공급자 가격결정력) [의견] | Starlink 하드웨어는 내재화. AI는 GPU **구매자** → Terafab으로 탈출 시도 | 🔴[추정] |
| 미드스트림: 발사 | 외부 판매 $10~12B 시장 | SpaceX, ULA, RKLB, Ariane | 1강 독점 | **독점자 — 가격 결정력 보유** | 🟡 |
| 미드스트림: 위성 제조 | 자체 대량생산 vs 외주 | SpaceX(자체), Amazon(자체), ASTS(자체), Airbus·Thales | 분산 | 세계 최대 위성 제조자(누적 ~10,000기) | 🟡 |
| 다운스트림: 서비스 | 브로드밴드·D2D·정부·클라우드 | Starlink, Amazon, 통신사, 하이퍼스케일러 | 우주 경제의 대부분(상업 78%) | Starlink 연환산 ~$17B — 가장 큰 단일 이익원(Q2 영업이익 $1.7B 🟢) | 🟢 |

**판단 [의견]**: 우주 밸류체인에서 SpaceX는 **미드스트림 독점(발사)을 다운스트림 이익(Starlink)으로 전환**하는 데 성공한 유일한 기업이다 — 경쟁자가 1kg을 올릴 때 낼 돈을 SpaceX는 내부 원가로 처리한다. 반면 AI 밸류체인에서 SpaceX는 업스트림(GPU)에 이익을 내주는 **가격 수용자**이며, Terafab은 이 위치를 바꾸려는 시도지만 반도체 제조는 SpaceX에게 학습곡선이 0인 영역이다.

**차원 결론 — 밸류체인 지위: ★★★★☆** (우주 ★5, AI ★2의 가중)

---

## 7. 멍거 체크: 반전(Invert) 사고

> "Invert, always invert." — 무엇이 SpaceX의 경쟁 포지션을 망가뜨릴 수 있는가?

1. **AI 자본 배분 실패** — 해자가 약한 사업에 연 수백억 달러(TTM capex $42.4B 🟢)를 쏟고 회수 실패. 가장 가능성 높은 실패 경로 [의견].
2. **Apple·통신사 연합의 D2D 봉쇄** — iPhone(Amazon/Globalstar) + AT&T/Verizon(ASTS)로 미국 스마트폰 유통의 대부분이 Starlink 반대 진영에 묶임 🔴[추정].
3. **정치 리스크** — FCC·국방 조달이 머스크 개인에 대한 정치적 판단으로 바뀌는 경우(⬛ 정량 불가).
4. **Starship 장기 지연** — 차세대 Starlink·D2C(2027) 일정이 밀리면 Amazon과의 격차 축소.
5. **경영 주의력 분산** — 발사·Starlink·xAI·X·Cursor·Terafab을 한 경영진이 관리.

반대 근거(포지션이 더 강해지는 경로): Starship 완전 재사용이 성공하면 1·2·4번의 리스크가 동시에 줄어든다 — 원가 격차가 경쟁자의 자본 우위를 무력화.

---

## 8. 종합 결론

| 차원 | ★ | 근거 요약 |
|---|---|---|
| 산업 매력도 | ★★★★☆ | 우주 경제 10% CAGR, 그러나 발사 외부 시장 작고 D2D TAM 불확실 |
| 발사 경쟁 포지션 | ★★★★★ | 82% 점유율, 2위권 미비행·폭발·고원가 |
| 위성통신 경쟁 포지션 | ★★★★☆ | 압도적 1위, Amazon·D2D 진영 싸움으로 점유율 하락 방향 |
| AI 경쟁 포지션 | ★★☆☆☆ | CoreWeave와 동급, 업스트림 종속, 해자 근거 부족 |
| 경쟁 위협 강도(역) | ★★★☆☆ | 사업별 편차 큼 |
| 밸류체인 지위 | ★★★★☆ | 우주 미드→다운 수직통합 독점, AI는 가격수용자 |
| **종합** | **★★★★☆** | **우주 인프라 해자는 세계 최강급, 그러나 자본이 향하는 AI의 경쟁 구도는 평범** |

**객관적 종합 [의견]**:
- 데이터에 따르면 SpaceX는 발사·LEO 브로드밴드에서 **경쟁자가 따라잡기 어려운 구조적 원가 우위**를 가진다(발사 82%, 위성 ~10,000기 vs Amazon 396기) 🟡.
- 하지만 반대로, (1) Amazon이 Globalstar·Apple로 D2D 핵심 유통을 확보했고, (2) 미국 1·2위 통신사가 ASTS 진영에 섰고, (3) SpaceX 자본의 대부분(Q2 capex의 86%)이 해자가 증명되지 않은 AI로 가고 있다 🟢.
- 시가총액 $2.32T 🟢는 우주 경제 전체(2025 $626~686B)의 3배 이상이다. 이 가격은 **우주 독점의 가치가 아니라 AI·통신 시장에서의 승리를 선반영**한다 [의견]. 경쟁 포지션 분석의 결론은 "좋은 사업이 있다"이지 "모든 사업이 좋다"가 아니다.

> "A great business at a fair price is superior to a fair business at a great price." — Munger
> SpaceX의 우주 사업은 great business다. AI 사업은 현재로선 fair business다. 두 사업은 한 주식 안에 묶여 있다.

---

## 9. 정보 갭 선언

| 항목 | 상태 |
|---|---|
| Starlink 세부 매출(소비자/기업/항공해운/정부/D2C) | ⬛ 회사 미공시 |
| Space 세그먼트 수익성 | ⬛ |
| AI 매출 중 관계사·내부(xAI·X) vs 외부 고객 비중 | ⬛ — 경쟁력 판단의 최대 공백 |
| Amazon Leo 가입자·가격 | ⬛ (가을 베타) |
| 하이퍼스케일러·Oracle AI 클라우드 점유율 | ⬛ (조사 상한 도달로 미확보) |
| D2D TAM | 🔴 기관 간 13배 괴리 — 사용 불가 수준 |
| 우주 데이터센터 단위경제 | ⬛ |
| 통신 3사의 Starlink Mobile 대응(공식 발언) | ⬛ |
| 2026 연간 발사 횟수·점유율(최신) | ⬛ 2025 수치로 대체 |

출처: [Space Systems Command NSSL Lane 2 FY26](https://www.ssc.spaceforce.mil/Newsroom/Article/4348694/space-systems-command-releases-national-security-space-launch-phase-3-lane-2-fy) · [SatelliteToday NSSL FY26](https://www.satellitetoday.com/government-military/2025/10/03/spacex-to-launch-five-ussf-nro-missions-in-fy-2026-ula-two/) · [CoreWeave 2Q26 8-K](https://www.sec.gov/Archives/edgar/data/0001769628/000176962826000362/coreweave2q26earningspress.htm) · [AST SpaceMobile 8-K](https://www.sec.gov/Archives/edgar/data/1780312/000178031226000005/asts-ex99_1.htm) · [Zacks ASTS 2026 revenue](https://www.zacks.com/stock/news/2980384/can-asts-turn-its-bluebird-launch-push-into-meaningful-2026-revenues) · [Yahoo Finance — Amazon/Globalstar $11.57B](https://finance.yahoo.com/markets/stocks/articles/amazon-pays-11-57b-globalstar-151824465.html) · [Fierce Network — Amazon/Globalstar](https://www.fierce-network.com/wireless/amazon-acquire-globalstar-1157-billion) · [Rocket Lab/Iridium (Bloomberg Law)](https://news.bloomberglaw.com/tech-and-telecom-law/rocket-lab-to-buy-iridium-for-8-billion-to-expand-network-1) · [Advanced Television — Amazon Leo 396기](https://www.advanced-television.com/2026/07/03/success-for-amazon-leo-launch/) · [MacRumors — Starlink Mobile](https://macrumors.com/2026/08/05/starlink-mobile-service) · [SatelliteInternet — Starlink Mobile/EchoStar](https://www.satelliteinternet.com/resources/starlink-mobile/) · [ISPreview — OneWeb €297M](https://www.ispreview.co.uk/index.php/2026/08/oneweb-broadband-satellites-help-lift-leo-revenues-69-5-percent-at-eutelsat.html) · [OrbitalRadar — Guowang/Qianfan](https://orbitalradar.com/satellite-internet/guowang-qianfan) · [Motley Fool — SpaceX competitors](https://www.fool.com/investing/how-to-invest/stocks/spacex-competitors/) · [Payload — $686B space economy](https://payloadspace.com/breaking-down-the-686b-space-economy/) · [Fortune BI D2D](https://www.fortunebusinessinsights.com/direct-to-device-satellite-connectivity-market-118206) · [GMI D2D](https://www.gminsights.com/industry-analysis/direct-to-device-d2d-satellite-connectivity-market) · [TrendForce](https://www.trendforce.com/presscenter/news/Telecommunications) · [Spherical Insights](https://www.sphericalinsights.com/blogs/top-25-companies-in-global-commercial-satellite-broadband-market-strategic-overview-and-future-trends-2026-2035)

---

## 할인 명세 (Discount Ledger)

이 역할은 내재가치를 직접 산정하지 않는다. 아래는 **해자·경쟁 가정에서 깎은 것**이며, 밸류에이션 담당(버핏)이 반영 여부를 결정한다.

| 항목 | 폭 | 근거 |
|---|---|---|
| AI 세그먼트 해자 ★ 하향(★2) → 장기 마진 가정 하향 권고 | ⬛ 정성 | CoreWeave와 동급 매출, GPU 업스트림 종속, 관계사 매출 비중 미공시 [추정] |
| Starlink 소비자 점유율 가정 하향(독점 → 2강) | ⬛ 정성 | Amazon Leo 서비스 개시(2026 가을) + Globalstar·Apple 확보 [사실]/[추정] |
| D2D 점유율 가정 하향 | ⬛ 정성 | AT&T·Verizon의 ASTS 확정계약, Apple의 Amazon 진영 합류 [사실] |
| 국방 발사 점유율 상한 | ⬛ 정성 | NSSL 이중화 정책(FY26 금액 63%) [사실] |

<!-- discount-ledger
role: 산업·경쟁(멍거)
items:
  - name: AI 세그먼트 해자 ★2 하향 → 장기 마진 가정 하향
    pct: ⬛
    reason: CoreWeave(2026 가이던스 $12.4~13.2B)와 동급 체급, GPU 업스트림에 이익 흡수, 관계사 매출 비중 미공시 · [추정]
    overlapsWith: 리스크(리루)의 AI capex 회수 실패 할인 · 재무(버핏)의 AI 마진 가정
  - name: Starlink 소비자 브로드밴드 점유율·ARPU 가정 하향(독점→2강)
    pct: ⬛
    reason: Amazon Leo 396기·2026 가을 베타, Globalstar $11.57B 인수 + Apple 공급계약 · [사실] 이벤트 / [추정] 영향 폭
    overlapsWith: 재무(버핏)의 Starlink 성장률·ARPU 가정
  - name: D2D(Starlink Mobile) 점유율 가정 하향
    pct: ⬛
    reason: AT&T·Verizon의 ASTS 확정계약, Starlink Mobile 선언으로 통신사와 이해 충돌 · [사실]/[추정]
    overlapsWith: 사업모델(단융핑)의 Starlink Mobile 옵션 가치
  - name: 국방 발사 점유율 상한(정책적 이중화)
    pct: ⬛
    reason: NSSL Lane 2 FY26 SpaceX 금액 기준 63%, Blue Origin 육성 정책 · [사실]
    overlapsWith: none
total: ⬛
-->

<!-- confidence-summary
high: 9
medium: 52
low: 14
gap: 17
verdict: 보통
-->
