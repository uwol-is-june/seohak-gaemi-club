# A. 발전·연료 계층 — AI Infrastructure 가치사슬 스캔 (2026-10-27)

> 범위: 원전 IPP · 머천트 발전 · 천연가스 발전 · SMR/선진로 · 우라늄 채굴·농축 · 데이터센터(DC) 부하가 큰 규제 유틸리티.
> 성격: **목록·분류 단계**다. 심층 분석은 하지 않았다. 못 구한 값은 ⬛.
> 조사 사용량: WebSearch 10/10 · WebFetch 9회(상한 8회를 1회 초과: 첫 호출이 스크리너 메인 페이지로 잘못 나가 결과가 없었음).

## 0. 출처·기준 표기

| 코드 | 출처 | 기준 시점 |
|---|---|---|
| [SA-IPP] | stockanalysis.com/stocks/industry/utilities-independent-power-producers/ | 2026-10-27 조회 (종가 2026-10-26 기준) |
| [SA-U] | stockanalysis.com/stocks/industry/uranium/ | 2026-10-27 조회 |
| [SA-RE] | stockanalysis.com/stocks/industry/utilities-regulated-electric/ (상위 20) | 2026-10-27 조회 |
| [SA-SIM] | stockanalysis.com/stocks/industry/specialty-industrial-machinery/ | 2026-10-27 조회 |
| [SA-q] | stockanalysis.com/stocks/{ticker}/ 개별 시세 페이지 (OKLO·BWXT·TLN) | 2026-10-26 종가 |
| [기존] | 회사 발표(2024~2026 상반기). **이번 스캔에서 원문 재확인 안 함** → 신뢰도 🟡 | 표기된 연월 |

- 시가총액은 전부 stockanalysis 표시값을 그대로 옮겼다(USD). 2차 소스 교차검증은 하지 않았다(목록 단계).
- 거래소는 일반 상장 정보 기준. 신규 상장으로 확인하지 못한 곳은 ⬛.

---

## 1. 종목 목록

### 1-1. 원전·머천트 IPP (DC 직접 계약 주체)

| 기업명 | 티커 | 거래소 | 시총 (출처) | 가치사슬 내 역할 (1문장) | 순수 플레이 | Tier | DC 관련 계약/PPA 핵심 1줄 |
|---|---|---|---|---|---|---|---|
| Constellation Energy | CEG | Nasdaq | $89.46B [SA-IPP] | 미국 최대 원전 운영사로, 원전·가스 전력을 하이퍼스케일러에 장기 공급한다 | 예 | **1** | 2026-10-06~07 Google과 3,590MW 계약(원전 증출력 890MW 20년 PPA + PJM 2,700MW 장기공급), 투자 $4.3B+. Amazon 690MW(Calvert Cliffs 증출력 포함)도 함께 보도됨 (energyconnects 2026-10). 그 전 계약: Microsoft Crane(TMI-1) 20년(2024-09), Meta Clinton 20년(2025-06) [기존] |
| Vistra | VST | NYSE | $47.57B [SA-IPP] | 텍사스·PJM에서 원전·가스 머천트 발전을 운영하고 DC에 직접 공급한다 | 예 | **1** | 2026-09-21 자회사 Luminant가 New Era Energy & Digital과 20년 PPA 체결(가스 200~207MW, Odessa 1,180MW 가스발전소, 2027 3Q 공급 시작) (회사 PDF). Meta와 오하이오 원전 장기계약(약 2.6GW)은 2차 출처뿐 🟡 |
| Talen Energy | TLN | Nasdaq | $16.18B [SA-IPP/SA-q] | Susquehanna 원전을 보유한 PJM 머천트 발전사로, Amazon 캠퍼스에 원전 전력을 공급한다 | 예 | **2** | Amazon(AWS) Susquehanna 원전 장기 PPA(2025-06, 1,920MW) [기존]. 2026-08-05 2Q 실적에서 2026~28 가이던스 상향 [SA-q] |
| NRG Energy | NRG | NYSE | $19.68B [SA-IPP] | 가스 중심 발전과 대형 소매전력 사업을 함께 하는 IPP다 | 부분 (소매 비중 큼) | **2** | 텍사스 DC 2곳에 295MW 공급계약(2Q 실적 때 발표, 정확한 날짜 ⬛) (DCD·power-eng) |
| TransAlta | TAC | NYSE | $3.89B [SA-IPP] | 캐나다·미국 가스·수력·풍력 발전 IPP다(캐나다 본사, NYSE 상장) | 예 | **2** (소형) | ⬛ (이번 스캔에서 확인 못 함) |
| Kenon Holdings | KEN | NYSE | $3.49B [SA-IPP] | 지분 보유 지주사로, 자회사 OPC를 통해 미국 가스발전 지분을 갖고 있다 | 아니오 (지주사) | **3** | ⬛ |
| Hallador Energy | HNRG | Nasdaq | $0.52B [SA-IPP] | 인디애나 석탄발전소(Merom)와 석탄광을 운영하는 소형 발전사다 | 부분 | **3** | ⬛ (DC 계약 협상 보도가 있었지만 이번 스캔에서 확인 못 함) |
| Digi Power X | DGXX | ⬛ | $0.23B [SA-IPP] | 소형 발전 자산을 보유하고 AI·컴퓨팅 호스팅을 함께 하는 회사다 | 부분 | **3** | ⬛ |

### 1-2. SMR·선진로 (개발 단계)

| 기업명 | 티커 | 거래소 | 시총 (출처) | 가치사슬 내 역할 | 순수 플레이 | Tier | DC 관련 계약/PPA 핵심 1줄 |
|---|---|---|---|---|---|---|---|
| Oklo | OKLO | NYSE | $4.83B [SA-IPP/SA-q] (종가 $25.94, 2026-10-26) | Aurora 소형 고속로를 개발하며, 전력을 직접 파는 BOO 모델이다 | 예 | **3** | Meta 오하이오 캠퍼스 계약(2026-01) 🟡. Switch와 12GW 프레임워크(2024-12, 비구속) [기존]. 2026-10-13 DOE Launch Pad로 Groves 2 Forge 추진 [SA-q] |
| X-Energy | XE | ⬛ | $4.34B [SA-SIM] | Xe-100 고온가스로와 TRISO 연료를 개발한다 | 예 | **3** | Amazon이 투자하고 Energy North­west와 협력(2024-10) [기존]. 상장 시점은 ⬛ |
| NuScale Power | SMR | NYSE | $2.26B [SA-SIM] | NRC 설계인증을 받은 경수형 SMR(VOYGR) 모듈 설계사다 | 예 | **3** | TVA–ENTRA1 최대 6GW 협력은 **비구속**. 2026-07 기준 구속력 있는 PPA 없음. CEO는 2026년 말 체결을 기대 (Motley Fool·Simply Wall St) |
| newcleo | NWCL | ⬛ | $1.28B [SA-SIM] | 납냉각 고속로(LFR)와 MOX 연료를 개발하는 유럽계 회사다 | 예 | **3** | ⬛ |
| NANO Nuclear Energy | NNE | Nasdaq | $0.64B [SA-SIM] | KRONOS 마이크로리액터를 개발하고 연료 사업도 추진한다 | 예 | **3** | ⬛ |
| ONE Nuclear Energy | ONEN | ⬛ | $0.15B [SA-IPP] | 원전 개발사(세부 사업은 이번 스캔에서 확인 못 함) | ⬛ | **3** | ⬛ |
| Deep Fission | FISN | ⬛ | $0.13B [SA-SIM] | 시추공 지하 소형 원자로를 개발한다 | 예 | **3** | ⬛ |
| General Fusion | GFUZ | ⬛ | $0.37B [SA-SIM] | 핵융합 발전을 개발한다(원전 범위 밖, 참고용) | 예 | **3** | ⬛ |

### 1-3. 우라늄 채굴·농축·핵연료

| 기업명 | 티커 | 거래소 | 시총 (출처) | 가치사슬 내 역할 | 순수 플레이 | Tier | DC 관련 계약/PPA 핵심 1줄 |
|---|---|---|---|---|---|---|---|
| Cameco | CCJ | NYSE | $34.45B [SA-U] | 서방 최대 우라늄 생산·전환 회사이고 Westinghouse 지분 49%를 갖고 있다 | 예 (핵연료) | **1** | DC와는 간접적으로만 연결된다(원전 신·증설 수요 → 연료). 직접 DC 계약은 없다 [기존] |
| NexGen Energy | NXE | NYSE | $5.58B [SA-U] | 캐나다 Rook I(Arrow) 대형 우라늄 광산을 개발 중이다 | 예 | **3** | 간접 |
| Uranium Energy | UEC | NYSE American | $3.69B [SA-U] | 미국 ISR 우라늄 생산사이고 전환 사업도 추진한다 | 예 | **2** | 간접 |
| Centrus Energy | LEU | NYSE American | $2.01B [SA-U] | 미국 유일 HALEU 농축 실적 보유사이자 LEU 중개·농축 회사다 | 예 | **2** (세부 섹터 선두) | 간접 — HALEU는 차세대 SMR(Oklo·X-Energy 등) 연료 병목이다. 피켓턴 증설: 2025-09 발표, 신규 설비 가동 2029 목표 [기존] |
| Denison Mines | DNN | NYSE American | $2.00B [SA-U] | 캐나다 Wheeler River ISR 광산을 개발 중이다 | 예 | **3** | 간접 |
| Energy Fuels | UUUU | NYSE American | $1.89B [SA-U] | 미국 우라늄·희토류 생산사다(희토류 비중 확대 중) | 부분 | **3** | 간접 |
| Uranium Royalty | UROY | Nasdaq | $1.30B [SA-U] | 우라늄 로열티·현물 보유 회사다 | 예 | **3** | 간접 |
| IsoEnergy / Ur-Energy / enCore / Eagle Nuclear / Anfield / Jaguar | ISOU / URG / EU / NUCL / AEC / JAGU | ⬛ / NYSE American / ⬛ / ⬛ / ⬛ / ⬛ | $0.55B / $0.33B / $0.14B / $0.14B / $0.06B / $0.02B [SA-U] | 소형 채굴·탐사 회사들 | 예 | **3** | 간접 |

### 1-4. 원전 부품·연료 제조 (발전 계층과 장비 계층의 경계)

| 기업명 | 티커 | 거래소 | 시총 (출처) | 가치사슬 내 역할 | 순수 플레이 | Tier | DC 관련 계약/PPA 핵심 1줄 |
|---|---|---|---|---|---|---|---|
| BWX Technologies | BWXT | NYSE | $12.02B [SA-q] (종가 $131.20, 2026-10-26) | 해군 원자로·핵연료 독점 공급사로, 상업 원전 부품과 마이크로리액터(BANR) 사업도 한다 | 부분 (방산 비중 큼) | **2** | 2026-10-05 BANR이 캐나다 Prodigy 이동식 원전에 채택됨. 2026-09-29 Investor Day에서 2030년 매출 $5.5~6B 목표 제시 [SA-q]. DC 직접 계약은 없다 |
| Curtiss-Wright | CW | NYSE | ⬛ (이번 스캔에서 조회 못 함) | 원자로 냉각재 펌프 등 원전 핵심 부품을 공급하는 방산·산업 복합 기업이다 | 아니오 | **4** | 간접 (AP1000 부품) |
| Mirion Technologies | MIR | NYSE | $3.72B [SA-SIM] | 방사선 계측·원전 계장 장비를 만든다 | 부분 | **3** | 간접 |
| GE Vernova | GEV | NYSE | $227.75B [SA-SIM] | 가스터빈 세계 1위이고 GE-Hitachi BWRX-300 SMR을 갖고 있다(주 계층은 장비) | 아니오 | **4** | TVA Clinch River BWRX-300 추진 [기존]. 가스터빈 수주 잔고가 DC 가스발전 병목이다 — 상세는 장비 계층에서 다룬다 |

### 1-5. DC 부하 비중이 큰 규제 유틸리티 (Tier 4 — 발전 자산을 보유한 대형 복합 기업)

| 기업명 | 티커 | 거래소 | 시총 [SA-RE] | 가치사슬 내 역할 | 순수 플레이 | Tier | DC 관련 핵심 1줄 |
|---|---|---|---|---|---|---|---|
| NextEra Energy | NEE | NYSE | $172.06B | 미국 최대 재생에너지 개발사(NEER)와 FPL을 운영하고, Duane Arnold 원전 재가동을 추진한다 | 아니오 | **4** | Google–Duane Arnold 재가동 PPA(2025-10) [기존] |
| Southern Company | SO | NYSE | $106.49B | 동남부 수직통합 유틸리티로 Vogtle 원전을 보유한다 | 아니오 | **4** | Georgia Power 대형부하 파이프라인 50.9GW(2025 3Q 제출). 같은 분기 프로젝트 이탈로 순 6GW 감소 (Utility Dive) |
| Duke Energy | DUK | NYSE | $97.03B | 캐롤라이나 수직통합 유틸리티로 원전 비중이 크다 | 아니오 | **4** | ⬛ |
| American Electric Power | AEP | Nasdaq | $70.35B | 오하이오·텍사스 등 DC 밀집지 송전·발전 유틸리티다 | 아니오 | **4** | ⬛ |
| Dominion Energy | D | NYSE | $57.26B | 세계 최대 DC 밀집지(북버지니아)에 전력을 공급하는 유틸리티다 | 아니오 | **4** | ⬛ |
| Entergy | ETR | NYSE | $51.36B | 루이지애나·텍사스 유틸리티로 Meta Hyperion 캠퍼스용 가스발전을 신설한다 | 아니오 | **4** | Meta 루이지애나 캠퍼스용 가스발전 3기 승인(2025) [기존] |
| Xcel Energy | XEL | Nasdaq | $48.63B | 중서부·텍사스·콜로라도 유틸리티로 원전을 보유한다 | 아니오 | **4** | ⬛ |
| Exelon | EXC | Nasdaq | $45.98B | 송배전 전용 유틸리티다(발전 자산 없음). DC 연계 수요를 나타내는 지표 종목 | 아니오 | **4** | 2026 2Q에 DC 파이프라인을 크게 하향(아래 반증 1) |
| Public Service Enterprise Group | PEG | NYSE | $35.94B | 뉴저지 유틸리티로 원전 3기를 보유한다(머천트) | 아니오 | **4** | ⬛ |
| Brookfield Renewable | BEP | NYSE | ⬛ | 수력·풍력·태양광 IPP다 | 예 (재생) | ⬛ | Microsoft 10.5GW 프레임워크(2024-05), Google 수력 최대 3GW(2025-07) [기존] |

**종목 수**: 개별 행 기준 **39개**(1-3 소형 우라늄 6개를 개별로 셈). Tier 1: CEG·VST·CCJ (3) · Tier 2: TLN·NRG·TAC·UEC·LEU·BWXT (6) · Tier 3: 19 · Tier 4: 10 · 미분류: BEP 1.

> Tier 판정 메모: CCJ는 DC 노출이 **간접적**인데도(연료) 대형 순수 플레이 선두라 정의상 Tier 1로 분류했다. 하지만 반대로 보면 DC 수요 민감도는 CEG·VST보다 한 단계 낮다. LEU는 시총이 소형($2.0B)이지만 HALEU라는 세부 섹터 선두라 Tier 2로 분류했다. 시총 기준만 보면 Tier 3이다.

---

## 2. 2026-07~10월 이벤트

### 2-1. 지지 (DC 전력 수요 → 발전 계층 수혜) — 4건

| # | 날짜 | 이벤트 | 출처 | 신뢰도 |
|---|---|---|---|---|
| 1 | 2026-10-06~07 | **Google–Constellation 3,590MW 계약**: 원전 증출력 890MW 20년 PPA(일리노이·펜실베이니아·뉴저지 11기, 2028년부터 공급) + PJM 2,700MW 장기공급, CEG 투자 $4.3B+. 같은 기사에 Amazon 690MW 원전 구매(Calvert Cliffs 증출력)도 보도됨 | energyconnects.com 2026-10 · w.media · broadbandbreakfast (Reuters·Bloomberg 재전재) | 🟡 (원문 공시 미확인. 2,700MW 계약 기간은 매체마다 다름) |
| 2 | 2026-07-14 | **PJM 2028/29 용량경매가 상한 $325/MW-day에 체결**(3회 연속 상한). 신뢰도 기준보다 6,831MW 부족. 상한이 없었다면 $554.72였을 것 | pjm.com 2026-07-14 보도자료 · OPIS · power-eng | 🟢 (PJM 원문) |
| 3 | 2026-09-21 | **Vistra(Luminant)–New Era Energy & Digital 20년 가스 PPA** 200~207MW, Odessa 가스발전소, 2027 3Q 공급 시작 | New Era 보도자료 PDF (s25.q4cdn.com) · finviz | 🟡 |
| 4 | 2026-08-05 / 09-29 | **Talen 2Q 실적에서 2026~28 가이던스 상향**(조정 EBITDA $374M), 이어 09-29 $1.5B 가속 자사주매입과 매입 한도 $3.0B 확대 | stockanalysis.com/stocks/tln (뉴스 요약) | 🟡 |

### 2-2. 반증 (취소·지연·규제·과잉) — 반증 검색 수행함, 4건

| # | 날짜 | 이벤트 | 출처 | 신뢰도 |
|---|---|---|---|---|
| 1 | 2026-07 (2Q 실적) | **Exelon DC 파이프라인 대폭 하향**: 고확률 18→11GW, 2027년까지 43→25GW. 개발사에 송전서비스계약(TSA)으로 재무 약정을 요구하자 "투기성 프로젝트가 걸러졌다"(CFO). 지역 반대와 요금 인상 우려가 원인으로 거론됨 | energyconnects.com 2026-07 · Bloomberg Law (재전재) · ohiomfg.com | 🟡 |
| 2 | ~2026-10-01 (근사) | **FERC가 PJM 용량 확대 계획을 연기**하자 Talen 등 IPP 주가 하락 | stockanalysis.com/stocks/tln 뉴스 목록 (상대시각 환산) | 🟡 (원문 FERC 명령 미확인, 날짜 근사) |
| 3 | 2026-10-20~23 | **Oklo 목표주가 4건 연속 하향**(Piper $55→49 · Barclays $76→59 · Citi $57.5→33 · Truist $51→31, 등급 유지). 근거는 금리 상승·정책 불확실성·비용 상승. 주가는 2025-10 고점 대비 약 −83% | tikr.com · stockanalysis.com/stocks/oklo | 🟡 |
| 4 | ~2026-07 | **NuScale–TVA/ENTRA1: 구속력 있는 PPA가 여전히 없음**. 프로젝트 지연으로 7월 주가 −7.4%. Citi는 "TVA 계약이 단·중기에는 어렵다"며 Sell | fool.com 2026-08 · Simply Wall St (검색 요약) | 🟡 |

- 참고(창 밖이지만 배경): FERC는 Talen–Amazon Susquehanna 계량기 후단(BTM) 확대 ISA를 2024-11과 2025-04 두 차례 기각했다(ans.org · utilitydive). 그 뒤 업계는 전력망 연계(front-of-meter) PPA로 옮겨갔다.
- 참고: CEG는 2026-03 Investor Update에서 "신규 DC 계약 발표 없음"과 약한 가이던스로 −8.3% 하락했다(invezz 2026-03-31). 창 밖 사건이지만, 10월 Google 계약으로 그 우려가 일부 해소됐다.
- 추가 관찰: BWXT 목표주가 하향이 이어졌다(BofA $250→210, Truist $202→182, JPM $230→190, 2026-10). 원전 테마 전반의 밸류에이션 압축 신호다 [SA-q].
- **확인 못 한 것**: 2026-07~10 사이 하이퍼스케일러가 원전 PPA를 *취소*한 사례는 검색 범위 안에서 0건이었다. Cameco·Centrus의 2026-09~10 개별 이벤트도 검색 결과 0건(데이터 부족).

---

## 3. 다음 단계에서 쓸 메모 (분류 단계 관찰만, 판단 아님)

- 3Q 실적 일정: BWXT 11-02 · TLN 11-03 [SA-q]. CEG·VST·OKLO는 ⬛.
- 데이터 공백: CW·BEP 시총, TAC·KEN·HNRG·NNE의 DC 계약, 신규 상장사(XE·NWCL·ONEN·FISN·DGXX)의 거래소.
- 지지 이벤트는 대형 원전 IPP(CEG·VST·TLN)에 몰려 있고, 반증 이벤트는 SMR(OKLO·SMR)과 DC 수요 예측(EXC)에 몰려 있다. 같은 계층 안에서 "기존 원전 증출력·재계약"과 "신규 SMR"의 증거 방향이 다르다는 데이터 관찰이며, 해석은 퍼널 단계로 넘긴다.
