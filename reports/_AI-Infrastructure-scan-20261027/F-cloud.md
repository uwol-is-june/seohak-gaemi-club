# F. 클라우드·컴퓨트 운영 계층 — 상장사 목록 (2026-10-27)

> 범위: 하이퍼스케일러 · 네오클라우드(GPU 임대) · 비트코인 채굴→AI/HPC 전환사 · (참고) 해외 ADR.
> 이 계층은 AI capex의 **지출자**이자 최종수요 수익화(ROIC)의 시험대다.
> 목록·분류 단계 — 심층 분석 아님. 못 구한 값은 ⬛. 추정값은 "(추정)" 표기.
> 조사 사용량: WebSearch 10/10 · WebFetch 8/8 (상한 도달, 이후 조사 중단).

## 0. 데이터 기준

| 항목 | 출처 | 기준 |
|---|---|---|
| 시가총액 (대형 5사) | stockanalysis.com `/list/biggest-companies/` | 2026-10-27 조회 · 페이지에 타임스탬프 없음 🟡 |
| 시가총액 (APLD·CIFR·GDS·VNET) | stockanalysis.com `/stocks/industry/information-technology-services/` | 2026-10-27 조회 · 타임스탬프 없음 🟡 |
| 시가총액 (IREN·WULF·HUT·GLXY·CLSK·MARA·RIOT·HIVE) | stockanalysis.com `/stocks/industry/capital-markets/` | 2026-10-27 조회 · 타임스탬프 없음 🟡 |
| CRWV·NBIS·CORZ·BTDR 시총 | 직접 조회 실패 (개별 페이지 403/미수록) | ⬛ — 주가 스냅샷만 보조 표기 |
| 계약 MW | Bernstein 집계(2026-07-23 보도) | 단일 2차 출처 🟡 |
| 실적·백로그 | 회사 발표 2차 인용(platformonomics, DCD, 247wallst, Oracle IR) | 각 행에 표기 |

## 1. 종목 목록

### 1-A. 하이퍼스케일러 + ORCL (Tier 4 — 관련 사업부를 가진 대형 복합 기업)

| 기업 | 티커 | 거래소 | 시총(USD) | 역할(가치사슬) | 순수 | Tier | 핵심지표 1줄 |
|---|---|---|---|---|---|---|---|
| Microsoft | MSFT | NASDAQ | 3.96T | Azure — 최대 AI 클라우드 판매자 겸 네오클라우드 최대 고객(용량 외주) | 아니오 | 4 | CY26 capex 표면 ~$175B(7월, ~$15B 금융→운용리스 재분류 · 실질 ~$190B 유지), Q2'26 capex $41B(금융리스 포함) [platformonomics, 2026-07] · Azure 성장률 ⬛ |
| Amazon | AMZN | NASDAQ | 2.69T | AWS — 클라우드 1위, 자체칩(Trainium)+GPU 임대, 채굴사 부지 임차(CIFR) | 아니오 | 4 | 2026 capex ~$220B(1월 $200B→7월 $220B), Q2'26 capex $54.77B 중 AWS $48.6B(88%) [platformonomics, 2026-07] · AWS 백로그 ⬛ |
| Alphabet | GOOGL | NASDAQ | 3.87T | Google Cloud + TPU — 클라우드 판매자·자체칩 공급자 | 아니오 | 4 | 2026 capex $195~205B(1월 $175~185B→4월 $180~190B→7월), Q2'26 FCF **−$5.9B** [platformonomics, 2026-07] |
| Meta Platforms | META | NASDAQ | 1.61T | 순수 **내부 소비형 지출자**(클라우드 미판매) · 네오클라우드(CRWV·NBIS) 대형 고객 | 아니오 | 4 | 2026 capex $130~145B(금융리스 원금 포함), Q2'26 FCF $0.78B, BlackRock 부외 DC 딜 [platformonomics, 2026-07] |
| Oracle | ORCL | NYSE | 382.15B | OCI — OpenAI 등 대형 AI 학습 용량 공급, 레버리지형 확장 | 아니오(OCI 비중 확대 중) | 4 | RPO **$664B**(FQ1'27, 분기 중 +$30B), OCI 매출 $7.4B +121%, FQ1 capex $28.5B, FCF −$5B [Oracle IR, 2026-09-10] |

### 1-B. 네오클라우드 (GPU 임대 순수 플레이)

| 기업 | 티커 | 거래소 | 시총(USD) | 역할 | 순수 | Tier | 핵심지표 1줄 |
|---|---|---|---|---|---|---|---|
| CoreWeave | CRWV | NASDAQ | ⬛ (참고: 2026-09-14 ~$49B, 다른 판본 $41B — 출처 불일치 · 10-16 주가 $63.25) | 최대 독립 GPU 클라우드 — MSFT·Meta·OpenAI 용량 공급 | 예 | 1 | 백로그 $104B(6/30) + 분기 후 >$25B, Q2 매출 $2.575B +112%, 2026 capex $35~39B, D/E 8.94, 이자비용 Q2 $640M→Q3 가이던스 $860~940M [DCD·247wallst, 2026-08/10] |
| Nebius Group | NBIS | NASDAQ | ⬛ (10-16 주가 $172.32) | 유럽·미국 GPU 클라우드 — MSFT·Meta 대형 계약 | 예(AI Cloud 매출 비중 ~98.7%) | 1 | Q2 매출 $582.3M +454%, 백로그 $37.49B(단일출처), H1 전환사채 $4.34B 조달 [DCD·247wallst, 2026-08/10] |
| DigitalOcean | DOCN | NYSE | ⬛ | 중소기업형 클라우드 + GPU Droplet | 부분 | 3 | ⬛ (이번 조사 미수집) |
| WhiteFiber | WYFI | NASDAQ | ⬛ | 소형 GPU 클라우드·HPC 코로케이션 (Bit Digital 계열) | 예 | 3 | ⬛ |

### 1-C. 비트코인 채굴 → AI/HPC 전환사 (부지·전력 임대 / 일부 GPU 클라우드 직영)

계약 MW = Bernstein 집계 "계약 IT 용량"(2026-07-23 보도, 🟡 단일 2차 출처).

| 기업 | 티커 | 거래소 | 시총(USD) | 역할 | 순수 | Tier | 핵심지표 1줄 |
|---|---|---|---|---|---|---|---|
| IREN | IREN | NASDAQ | 10.02B | 자가 전력부지 + **GPU 클라우드 직영**(네오클라우드형) | 전환 중(높음) | 2 | MSFT ~$9.7B 계약(2025-11), 신규 $2.8B 계약 후 2026말 AI Cloud ARR 목표 $3.7B→**>$4B** [The Block/Cointelegraph, 2026-08] |
| Applied Digital | APLD | NASDAQ | 5.39B | AI 전용 DC 개발·임대(CoreWeave 등 테넌트) | 높음 | 2 | 계약 IT 용량 **1,410MW**(채굴 전환군 1위) [Bernstein, 2026-07-23] · 부채 ⬛ |
| Hut 8 | HUT | NASDAQ | 7.76B | DC 개발·임대 (텍사스 Beacon Point 1GW) | 전환 중 | 2 | 계약 949MW · 2차 15년 **$9.8B** 리스로 1GW 캠퍼스 완전 상업화 [The Block, 2026-08] |
| TeraWulf | WULF | NASDAQ | 5.98B | AI/HPC 코로케이션 임대 | 전환 중 | 2 | 계약 839MW · Anthropic 20년 ~401MW ~$19B(2026-07-06 발표, 가동 2027 하반기) [Sandmark 2026-08-18] |
| Core Scientific | CORZ | NASDAQ | ⬛ | HPC 코로케이션 (CoreWeave 주요 임대인 → AMD 리스 추가) | 전환 중(높음) | 2 | 계약 590MW · AMD 15년 ~530MW >$14B, 파이프라인 >$24B [Sandmark 2026-08] |
| Galaxy Digital | GLXY | NASDAQ | 6.13B | 텍사스 Helios 캠퍼스 DC 임대 + 크립토 금융 | 부분 | 2 | 계약 526MW [Bernstein, 2026-07-23] · 계약가치 ⬛ |
| Cipher Digital(구 Cipher Mining) | CIFR | NASDAQ | 3.20B | HPC 코로케이션 — AWS·Fluidstack/Google 테넌트 | 전환 중 | 2 | 계약 493MW · AWS 15년 $5.5B 300MW(2025-11 발표, 2026 4Q까지 단계 인도) · Fluidstack/Google 10년 168MW [The Block·S&P] |
| Bitdeer | BTDR | NASDAQ | ⬛ | 채굴+ASIC, 노르웨이 Tydal 부지 AI/HPC 리스 | 부분 | 3 | Tydal 16년 $4.7B 리스(최대 $8.0B), 테넌트 Volta 자회사 [회사 공시, 날짜 ⬛] |
| Riot Platforms | RIOT | NASDAQ | 4.72B | 대형 전력부지(텍사스) AI/HPC 전환 추진 | 아니오(채굴 중심) | 3 | AI 테넌트 계약 ⬛ |
| MARA Holdings | MARA | NASDAQ | 2.64B | 채굴 중심, 전력·부지 기반 AI 옵션 | 아니오 | 3 | AI 계약 ⬛ |
| CleanSpark | CLSK | NASDAQ | 2.00B | 채굴 중심, AI DC 전환 탐색 | 아니오 | 3 | AI 계약 ⬛ |
| Bitfarms | BITF | NASDAQ | ⬛ | 워싱턴 부지 HPC/AI 전환 계획 발표 | 아니오 | 3 | 계약 ⬛ |
| HIVE Digital | HIVE | NASDAQ | 0.52B | 채굴 + 소형 GPU 클라우드 | 부분 | 3 | ⬛ |

### 1-D. 참고 — 해외 ADR (이 계층 경계)

| 기업 | 티커 | 거래소 | 시총(USD) | 역할 | 순수 | Tier | 비고 |
|---|---|---|---|---|---|---|---|
| Alibaba | BABA | NYSE(ADR) | ⬛ | 알리클라우드 — 중국 최대 클라우드·AI capex 지출자 | 아니오 | 4 | 미국 수요와 분리된 별도 시장 |
| Baidu | BIDU | NASDAQ(ADR) | ⬛ | Baidu AI Cloud | 아니오 | 4 | 〃 |
| GDS Holdings | GDS | NASDAQ(ADR) | 4.57B | 중국 IDC/코로케이션 | 높음 | 3 | 엄밀히는 데이터센터(부동산) 계층 |
| VNET Group | VNET | NASDAQ(ADR) | 1.12B | 중국 IDC | 높음 | 3 | 〃 |

**비상장(목록 제외, 맥락용)**: Lambda · Crusoe · Nscale · Fluidstack · OpenAI · Anthropic.
**경계 사례**: Cerebras(2026 Q2 실적 공개된 상장사 — 칩+추론 클라우드, 칩 계층으로 분류 권장) · Akamai(추론 클라우드 부업, Tier 4).

**집계**: 핵심 목록 24종목 (1-A 5 · 1-B 4 · 1-C 13 · 1-D 4 중 ADR 2개는 경계 — 표 기준 26행).

## 2. 하이퍼스케일러 + ORCL capex 가이던스 (최신)

> 2026-10-27 현재 **Q3(9월 분기) 실적은 아직 미발표**로 판단(검색에서 10월 발표치 0건).
> MSFT·GOOGL·META·AMZN은 통상 10월 말 발표 — **정확한 발표일 ⬛(이번 조사 미확인)**. 아래는 7월 말 Q2 발표치.

| 기업 | 2026 capex 가이던스 (발표 시점) | 경로 | 2027 코멘트 | 출처 |
|---|---|---|---|---|
| MSFT | CY2026 ~$175B 표면치 (2026-07, FY26 Q4) — ~$15B 금융리스→운용리스 재분류 효과, 실질 ~$190B(부품가 상승분 $25B 포함) 유지 | $190B → $175B(회계 재분류) | FY27 capex 전년 대비 증가, FY27 FCF 흑자 유지 | platformonomics Q2 2026 Scoreboard · Yahoo Finance |
| AMZN | ~$220B (2026-07-30 전후) | $200B(1월) → $200B(4월) → $220B(7월) — 메모리 가격 상승 반영 | "2026에도 2027에도 수요 대비 용량 부족" | platformonomics |
| GOOGL | $195~205B (2026-07) | $175~185B(1월) → $180~190B(4월) → $195~205B(7월) | 2027 capex "**significantly** 증가", 세부는 추후 | platformonomics · webull |
| META | $130~145B (금융리스 원금 포함, 2026-07) | $125~140B(또는 $125~145B, 출처 불일치) → $130~145B | 2026·2027 용량 극대화 지향 · BlackRock 부외 DC 딜로 실지출은 더 큼 | platformonomics |
| ORCL | FY27(2026-06~2027-05) capex $90~95B, 순 현금 capex ≤$70B — 🟡 2차 출처, IR 원문 미확인 | FQ1 실적 2026-09-10, FQ1 capex $28.5B | ⬛ | fourweekmba · Oracle IR(2026-09-10) |

- 4사 합계 2026: $720~750B (출처별 차이). Evercore·BofA는 2027 4사 합계 **>$1T** 모델링 (2026-07, 2차 인용).
- ⚠️ **하지만 반대로**: Q2 FCF가 GOOGL −$5.9B · META +$0.78B · ORCL FQ1 −$5B — capex가 영업현금을 이미 넘어서기 시작했고, MSFT(운용리스 재분류)·META(BlackRock JV)처럼 **부외화**가 늘고 있다. 표면 capex는 실제 약정보다 작게 보일 수 있다.

## 3. 2026-07~10 실제 이벤트

### 지지 (수요·계약 확장) — 4건

| 날짜 | 이벤트 | 출처 |
|---|---|---|
| 2026-07-06 | TeraWulf–Anthropic 20년 ~401MW ~$19B 리스 (가동 2027 하반기) | Sandmark 2026-08-18 (2차) |
| 2026-07 말 | 하이퍼스케일러 Q2 실적에서 2026 capex 일제 상향(AMZN $220B, GOOGL $195~205B, META $130~145B), GOOGL 2027 "대폭 증가" 예고 | platformonomics Q2 2026 Scoreboard |
| 2026-08 (중순) | CoreWeave 백로그 $104B + 분기 후 >$25B 신규 · Nebius 백로그 $37.5B · 채굴사 AI 리스 누적 >$114B, 직전 6주에만 $44B(Hut 8 $9.8B, IREN $2.8B 포함) | DCD(Q2 neocloud results) · Sandmark 2026-08-18 · The Block |
| 2026-09-10 | Oracle FQ1'27: AI 클라우드 계약 >$30B 추가, RPO $664B, OCI +121% · (보조) Nebius 10-01부터 온디맨드 GPU 임대가 **인상** 발표 | Oracle IR 2026-09-10 · 2차 검색 인용 |

### 반증 (신용·자금조달·구조 리스크) — 4건

| 날짜 | 이벤트 | 출처 |
|---|---|---|
| 2026-10-14~16 | **CoreWeave 무담보채 수익률 15%**(2031년물 >16% 보도), CDS >1,000bp(🟡 2차) · CRWV −9%($63.25)·NBIS −9%($172.32), 주간 −22% · CNN 공포탐욕지수 28 | 247wallst 2026-10-16 · letsdatascience(Reuters 인용) |
| 2026-10 | CoreWeave 이자비용 Q2 $640M(전년 $267M) → Q3 가이던스 $860~940M, D/E 8.94, 창업자 지분 $3.3B 매도(Bloomberg 인용) · CRWV 10월 누적 −38%(10-26 헤드라인) | 247wallst 2026-10-16 |
| 2026-07~09 | 지출자 현금흐름 악화: GOOGL Q2 FCF −$5.9B, ORCL FQ1 FCF −$5B, META Q2 FCF $0.78B · MSFT/META 부외 리스·JV 확대 — capex 자금이 영업현금에서 차입·부외로 이동 | platformonomics · Oracle IR |
| 2026-07~08 | 구조적 미스매치 경고: 네오클라우드는 15년 DC 리스 vs 고객 계약은 시간~1~3년, 최대 고객인 하이퍼스케일러는 "자체 용량 완공 전 임시 수요"(Haynes Boone, 2026-07, 의견) · 채굴사 $114B 리스 중 **완공·가동은 ~1/4**, 최근 4건 모두 2027 전 매출 없음(Sandmark 2026-08-18) · 7월 말 네오클라우드 급락 — 메모리·서버·칩 가격 상승 우려(invezz 2026-07-25) | Haynes Boone/Bisnow · Sandmark · invezz |

**반증 검색 수행함** (cancel · scale back · digestion · default · financing · GPU rental price):
- **계약 취소·축소**: 2026-07~10 기간 해당 없음. (창 밖: 2026-03 OpenAI·Oracle 철수로 MSFT 텍사스 리스 무산 보도, 2025-02 MSFT 수백 MW 리스 취소 TD Cowen.)
- **GPU 임대가 하락**: 해당 없음 — 오히려 H100 임대가는 2023 고점 대비 64~75% 하락 후 **2026년 반등**, Nebius 10월 인상(🟡 2차).
- **디폴트**: 해당 없음 — 신용 스프레드 확대(위 1번)까지가 관측된 최대치.

## 4. 분류 메모 (목록 단계 관찰, 판단 아님)

- 이 계층의 리스크는 **수요(계약)가 아니라 자금조달(신용)** 쪽에서 먼저 신호가 나왔다 — 2026-10 기준 계약·백로그 지표는 전부 증가, 반면 CRWV 채권은 부실 구간 수익률.
- 채굴 전환사는 계약 MW는 크지만 매출 인식이 2027 이후로 몰려 있다(Sandmark) — 퍼널 단계에서 "계약 MW ÷ 가동 MW"를 공통 척도로 쓸 것을 권고.
- Q3 실적(10월 말)에서 4사 2026 capex 재상향/2027 첫 수치가 나오면 이 표의 2절을 갱신해야 한다.

## 출처
- [Follow the CAPEX: Q2 2026 Scoreboard — platformonomics](https://platformonomics.com/?p=41900)
- [Yahoo Finance — Magnificent 7 earnings rush, hyperscaler capex $725B](https://finance.yahoo.com/markets/article/magnificent-7-earnings-rush-reveals-ai-spending-surge-with-hyperscaler-capex-set-to-reach-725-billion-in-2026-224901707.html)
- [Oracle Q1 FY27 press release (2026-09-10)](https://www.oracle.com/news/announcement/q1fy27-earnings-release-2026-09-10/)
- [fourweekmba — Oracle Q1 FY2027 backlog/capex](https://fourweekmba.com/ai-oracle-q1-fy2027-backlog-capex-analysis/)
- [DCD — neocloud results Q2 2026](https://www.datacenterdynamics.com/en/news/neocloud-results-q2-2026-coreweave-nebius-cerebras/)
- [pulse2 — CoreWeave backlog $104B](https://pulse2.com/coreweave-revenue-backlog-reaches-104-billion-before-another-25-billion-of-new-commitments/)
- [247wallst — CoreWeave and Nebius sink 9% (2026-10-16)](https://247wallst.com/investing/2026/10/16/coreweave-and-nebius-sink-9-as-sentiment-index-closes-in-on-extreme-fear/)
- [letsdatascience — CoreWeave shares and bonds slide](https://letsdatascience.com/news/coreweave-shares-and-bonds-slide-as-debt-fears-grip-ai-build-b082a38e)
- [invezz — neocloud stocks falling (2026-09-14)](https://invezz.com/news/2026/09/14/iren-nebius-coreweave-heres-why-these-neocloud-stocks-are-falling/)
- [invezz — CoreWeave, Nebius, IREN plunging (2026-07-25)](https://invezz.com/news/2026/07/25/why-are-nvidia-backed-coreweave-nebius-and-iren-stocks-plunging/)
- [Sandmark — Bitcoin miners signed $114bn of AI leases (mirror)](https://san-1510.aid.brainsum.com/news/features/bitcoin-miners-have-signed-114bn-ai-leases-and-built-quarter-it)
- [The Block — Hut 8 $9.8B lease, IREN $2.8B contracts](https://theblock.co/post/408920/hut-8-fully-commercializes-1-gw-texas-ai-campus-with-second-9-8b-lease-as-iren-signs-2-8b-in-contracts-shares-climb-double-digits)
- [The Block — Cipher $5.5B AWS deal](https://ru.tradingview.com/news/the_block%3Aaad25235a094b%3A0-cipher-mining-shares-jump-33-on-5-5-billion-aws-ai-deal-new-1-gw-texas-site)
- [Haynes Boone/Bisnow — AI startups concern data center executives](https://www.haynesboone.com/news/articles/moerdler-in-bisnow-booming-ai-startups-concern-some-data-center-executives)
- [cxodigitalpulse — Microsoft loses Texas lease (2026-03)](https://www.cxodigitalpulse.com/microsoft-loses-texas-data-centre-lease-as-oracle-and-openai-step-away-from-project/)
- stockanalysis.com — `/list/biggest-companies/`, `/stocks/industry/information-technology-services/`, `/stocks/industry/capital-markets/` (2026-10-27 조회)
