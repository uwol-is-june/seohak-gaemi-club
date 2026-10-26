# BWXT 산업·경쟁 분석 — 멍거 관점 (해군 핵추진 + 민수 원자력)
<!-- meta sector: Nuclear-Power -->

> 작성일 2026-10-26 · 역할: industry-researcher(태스크 #3) · 정보 풍부도 A (반론·비컨센서스 중심)
> 기준 데이터: `reports/BWXT/_data.md`(SEC XBRL 🟢) · BWXT FY2025 10-K(2026-02-23 제출) · 2Q26 8-K Ex.99.1 · CRS · DOE FY2027 예산 정당화서
> 표기: 🟢 SEC 원문/독립 2출처 · 🟡 단일 출처/검색 경유 · 🔴 추정 근거 약함 · ⬛ 데이터 없음

> "Invert, always invert." — 찰리 멍거
> 이 보고서는 "BWXT가 왜 이기는가"가 아니라 **"BWXT는 어떻게 실패하는가"**부터 묻는다.

---

## 0. 결론 먼저 (요약)

| 차원 | 평점 | 한 줄 판정 |
|---|---|---|
| 1. 산업 매력도·성장 | ★★★★☆ | 해군 수요는 수십 년 단위로 고정되어 있고 예산은 늘고 있다. 대신 구매자가 한 명뿐이다 |
| 2. 해군 핵추진 경쟁 포지션 | ★★★★★ | 원자로 노심·연료를 만드는 곳이 사실상 한 곳뿐이다. 진입장벽은 이 산업에서 가장 높다 |
| 3. 가치 포착력(교섭력) | ★★☆☆☆ | 독점 공급자와 독점 구매자가 마주 앉은 쌍방독점이다. 이윤율 상한은 구매자(해군)가 정한다 |
| 4. 민수 원자력 경쟁 포지션 | ★★★☆☆ | CANDU 증기발생기는 니치 우위를 갖고 있다. 나머지 민수 시장은 Westinghouse·Framatome·Doosan과 겨루는 경쟁 시장이다 |
| 5. 연료·SMR·농축(옵션) | ★★★☆☆ | TRISO는 BWXT가 선행하고 있지만 TRISO-X가 NRC 면허를 받아 독점이 깨졌다. DUECE 농축은 국방 전용 단독 계약이다 |
| 6. 밸류체인 위치 | ★★★★☆ | 원자력 밸류체인에서 ROIC가 가장 높은 계층(기기·부품)에 있다 |
| **종합 경쟁 포지션** | **★★★★☆** | **진입장벽은 ★5다. 다만 그 해자가 만드는 초과이익을 가져가는 쪽은 구매자다. 해자가 넓다는 것과 이익을 많이 번다는 것은 다른 문제다** |

**비컨센서스 발견 3가지**
1. **10-K는 "단독 공급"이라고 쓰지 않는다.** 회사 공식 연차보고서는 해군 사업을 "1950년대부터 해군 함대에 부품·연료를 공급해 온 가치 있는 공급자(a valued supplier)"라고 표현한다. "sole manufacturer"는 경영진 인터뷰와 채용 페이지에만 나온다 🟢[사실]. 실질적으로 독점인 것은 맞다 🟡[추정]. 그래도 투자 논제의 핵심 문구를 회사가 법적 문서에서는 쓰지 않는다는 점을 기록해 둔다.
2. **Government Ops는 원가가산이 아니라 "주로 고정가격 인센티브(FPIF)" 계약이다** 🟢[사실, 10-K]. 기존 체크리스트(2026-10-23)는 "원가가산이라 손실을 거의 보지 않는다"고 적었다. 10-K 원문은 이와 다르다. 원가가산은 첨단기술(advanced technology) 계약에만 해당한다. 원가가 초과되면 인센티브 공유비율에 따라 BWXT도 손실을 나눠 진다. 실제로 Gov Ops 세그먼트 이익률은 FY24 17.3% → FY25 16.8% → 2Q26 17.6%(전년 18.6%)로 내려가는 중이다 🟢.
3. **성장 동력은 민수인데, 민수 이익률은 해군의 절반 이하다.** Commercial Ops 이익률은 FY25 6.8%, YTD26 8.3%다. Gov Ops는 16.8%다 🟢. 민수 성장의 상당 부분은 인수(Kinectrics 2025-05, PCG 2026-07)로 만든 것이다. 성장이 빨라질수록 전사 이익률은 희석된다. _data.md에서 영업이익률이 15.1%(FY16)에서 12.6%(FY25)로 내려간 흐름과 같은 방향이다.

---

## 1. 산업 규모와 성장 (TAM)

### 1.1 BWXT 매출 구성 (FY2025, SEC 10-K 세그먼트)

| 세그먼트 | FY2024 매출 | FY2025 매출 | YoY | FY2025 세그먼트 이익 | 이익률 | 신뢰도 |
|---|---|---|---|---|---|---|
| Government Operations | $2,183.0M | $2,350.1M | +7.7% | $394.9M | 16.8% (FY24 17.3%) | 🟢[사실] |
| Commercial Operations | $524.0M | $853.1M | +62.8% | $57.7M | 6.8% (FY24 8.9%) | 🟢[사실] |
| 지분법 이익(JV) | $55.9M | $74.9M | +33.9% | — | — | 🟢[사실] |
| 미 정부 매출 비중 | 76% | **68%** | −8pp | — | — | 🟢[사실, 10-K] |

- 연결 영업이익 $404.5M(_data.md)에는 지분법 JV 이익 $74.9M이 들어 있다. JV 이익을 빼면 약 $329.6M이다 [추정 산술]. Yahoo 값($324.6M)과의 19.75% 불일치는 대부분 이 정의 차이로 설명된다 🟡.
- Gov Ops 세그먼트 이익에 JV(NNSA 사이트 관리 등) 이익이 얼마나 들어 있는지는 이번 조사에서 분해하지 못했다 ⬛.

### 1.2 최근 분기 추세 (2Q26 8-K Ex.99.1)

| 항목 | 2Q25 | 2Q26 | 변화 | 신뢰도 |
|---|---|---|---|---|
| Gov Ops 매출 | $589.0M | $601.3M | +2% | 🟢 |
| Gov Ops 이익 / 이익률 | $109.4M / 18.6% | $105.7M / 17.6% | −3% / −1.0pp | 🟢 |
| Commercial 매출 | $176.1M | $302.5M | +72% | 🟢 |
| Commercial 이익 / 이익률 | $6.9M / 3.9% | $24.3M / 8.0% | +254% / +4.1pp | 🟢 |
| **수주잔고 Gov Ops** | $4,435.6M | **$6,797.6M** | **+53%** | 🟢 |
| 수주잔고 Commercial | $1,579.6M | $1,600.5M | +1% | 🟢 |
| 수주잔고 합계 | $6,015.2M | $8,398.1M | +40% | 🟢 |
| 2026 가이던스 | — | 매출 ~$3.8B · 조정 EBITDA $662~672M · Non-GAAP EPS $4.70~4.80 · FCF $345~360M (상향) | — | 🟢 |

- 회사 설명: Gov Ops 성장은 해군 추진 물량이 이끌었고, "첨단 원자력(advanced nuclear) 물량 감소"가 일부 상쇄했다 🟢[사실]. **SMR·마이크로원자로 계열이 줄고 있다는 뜻**이다. 시장의 "원자력 르네상스" 서사와 반대 방향이다.
- 하지만 반대로: Commercial 이익률은 2Q26에 8.0%까지 회복했다. Kinectrics(서비스 사업)가 1년간 통합된 효과일 수 있다 🔴[추정].
- Gov Ops 수주잔고 +53%의 근원은 2026-05 해군 핵추진 장납기 자재 계약 $1.285B다. 2030년까지 이어지는 5년 연례 태스크오더 중 첫 해분이다. 같은 시기 Ford급 항모 장납기 부품 계약 $165M도 있었다 🟡[사실, BWXT 보도자료·Baird Maritime].

### 1.3 세그먼트별 시장 규모

| 시장 | 규모·성장 지표 | 신뢰도 | BWXT 노출 |
|---|---|---|---|
| **해군 핵추진(NNPP)** | DOE Naval Reactors 예산 FY26 $2.13B → **FY27 요청 $2.39B(+12%)** · FY28~31 외연 $10.09B | 🟢[사실, CRS R48946 + DOE 예산서] | 핵심 |
| 잠수함 조달 | FY27 요청 SSBN+SSN **≥$14.9B** · Virginia 선행조달 $5.8B(재량 $4.1B + "의무" $1.4B) · Columbia SSBN 약 $9.3B(선행조달 약 $5B 포함) | 🟡[Janes, 단일] | 원자로는 함정 조선예산(SCN)에서 조달된다. 원자로가 함정 원가에서 차지하는 비중은 ⬛ |
| Columbia급 | FY26 3번함부터 연 1척 체제 · 프로그램 지연 12~16개월 | 🟡[CRS·USNI] | 원자로·연료 BWXT 🟡 |
| Virginia급 | 목표 연 2.0척 → 2.33척(AUKUS 포함) · 실제 2022년 이후 **1.1~1.3척/년** | 🟢[CRS RL32418 2026-01 + USNI] | 원자로 BWXT 🟡 |
| AUKUS Pillar 1 | 2025-12 국방부 재검토 완료, 지지 · Virginia 3척(최대 5척) 호주 판매, 2032년부터 | 🟡[USNI·하원 의원실] | 간접(생산률 2.33척 목표에 반영) |
| 국방 농축(DUECE) | NNSA $1.5B 단독 계약(2025-08) · Erwin 파일럿 → 본시설 ~2035 | 🟢[ORNL·ANS·BWXT] | 신규 |
| CANDU 수명연장 | Pickering 증기발생기 48기 CAD 9.6억(7년) · Bruce MCR | 🟡[WNN·NS Energy] | Commercial 핵심 |
| 미국 신규 대형로 | Westinghouse AP1000 정부 파트너십 $80B(2025-10) · DOE 장납기 기기 대출 약정 $17.5B(AP1000 10기) | 🟡[NEI Mag·WNN] | **BWXT 수주 미확정** 🟡 |
| TRISO·HALEU·SMR | 시장 규모 ⬛ · 2026년 "정부 주도 → 상업 증설 경쟁"으로 전환 | 🟡 | 옵션 |

- 해군 핵추진 TAM의 "BWXT가 가져갈 수 있는 부분"(노심·원자로 기기·연료)을 따로 분리한 공개 수치는 찾지 못했다 ⬛. BWXT Gov Ops 매출 $2.35B를 사실상의 시장 규모 대리값으로 볼 수 있지만, 이 값에는 NNSA 사이트 관리·기술 서비스가 섞여 있다 🔴[추정].

**차원 1 결론 ★★★★☆** — 해군 수요는 예산(+12%), 수주잔고(+53%), Columbia 연 1척 전환으로 확인된다. 2030년까지 가시성은 높다 🟢. 하지만 반대로: 함정 생산 병목(Virginia 1.1~1.3척)이 풀리지 않으면 원자로 납품도 결국 조선소 속도에 맞춰진다. 민수 성장은 인수가 섞인 성장이라 유기적 성장률은 ⬛이다. ★5가 아닌 이유는 구매자가 하나뿐이라 성장의 질을 구매자가 정하기 때문이다.

---

## 2. 경쟁 구도 — "사실상 단독 공급"을 검증한다

### 2.1 해군 핵추진: 누가 경쟁자이고 누가 고객인가

| 주체 | 역할 | BWXT와의 관계 | 신뢰도 |
|---|---|---|---|
| **미 해군 Naval Reactors(NNSA·해군 공동)** | 유일한 구매자·설계 권한자 | **고객(독점 구매자)** | 🟢 |
| General Dynamics Electric Boat | Virginia·Columbia 주계약 조선소 | 고객/하류(원자로를 받아 함정에 설치) | 🟡[추정 — 계약 경로 미확인] |
| Huntington Ingalls(HII) | Virginia 공동 건조 · Ford급 항모 단독 건조 | 하류 파트너. **단 10-K는 HII를 Gov Ops 경쟁자 명단에 올린다**(NNSA 사이트 관리·환경정화 입찰 경쟁) | 🟢[10-K] |
| Bechtel National · Fluor · Amentum · Leidos · Honeywell · Northrop · AtkinsRéalis · Westinghouse | 10-K 기재 Gov Ops 경쟁사 | 주로 **NNSA·DOE 사이트 관리·기술 서비스** 입찰 경쟁사로 보인다. 원자로 노심 제조 경쟁사라는 증거는 없다 | 🟢[명단 사실] / 🔴[역할 해석 추정] |
| Bechtel Plant Machinery Inc.(BPMI) · Fluor Marine Propulsion(해군원자력연구소 운영) | 해군 추진 설계·조달 관련 기관 | 경쟁자라기보다 프로그램 구조의 일부로 추정. 이번 조사로 확인하지 못함 | ⬛ |
| Curtiss-Wright | 해군 추진 펌프·밸브 등 부품 | 부품 수준 공급자. 노심·원자로 용기와는 겹치지 않는 것으로 추정 | 🟡[퍼널 보고서] / 🔴 |

**검증 결과**
- "단독 공급" 문구는 BWXT 경영진(Nuclear Operations Group 사장) 발언, 채용 프로필, Motley Fool 기사에 나온다. FY2025 10-K 본문에는 없다 🟢[사실]. 10-K는 경쟁이 "제한적(limited)"이며 그 이유가 기술·규제 기준과 진입장벽, 그리고 설계·공정·제품 다수가 기밀인 점이라고 쓴다(FY16·17 10-K) 🟡.
- BWXT는 NNPP에 원자로 노심 420기 이상을 납품했다. Ohio·Virginia·Seawolf·Los Angeles급 잠수함과 Nimitz·Ford급 항모가 모두 BWXT 연료·원자로로 움직이고, Columbia급도 그렇다 🟡[BWXT 2023 보도자료].
- **판정: 원자로 노심·핵연료 제조는 실질적으로 단독 공급이다** 🟡[추정 — 독립 2출처 이상이 일관되게 말하지만 법적 문서에는 없다]. 다만 Gov Ops 세그먼트 전체를 독점 사업으로 보면 안 된다. NNSA 사이트 관리 같은 서비스 부분은 대형 엔지니어링사와 경쟁 입찰한다 🟢[10-K 경쟁자 명단].

### 2.2 민수 원자력

| 시장 | 주요 경쟁사(10-K 기재 + 조사) | BWXT 위치 | 신뢰도 |
|---|---|---|---|
| CANDU 증기발생기 | Doosan · Framatome · Westinghouse | 업계지 표현으로 "CANDU 증기발생기 시장 장악" · Pickering 48기 · Bruce 6호기 | 🟡[Energy Intelligence 단일] |
| CANDU 정비·수명연장 서비스 | AtkinsRéalis(Candu Energy) · Aecon · Framatome | Kinectrics 인수로 수명주기 서비스 진출. **AtkinsRéalis·Aecon은 CanAtom JV로 BWXT의 고객이면서 10-K상 경쟁사** | 🟢[10-K] / 🟡 |
| 원전 기기(미국) | Curtiss-Wright(RCP·밸브) · Doosan · 일본 단조사 · Westinghouse 자체 | PCG 인수(2026-07-01)로 "미국 내 민수 부품 제조 거점"을 확보 | 🟢[8-K] |
| 핵연료(CANDU 연료) | Cameco | 캐나다 연료 공급 | 🟢[10-K 명단] |
| 의료 동위원소 | Curium · SHINE · Jubilant DraxImage | **매각 발표**(약 $750M, 종결 예정 2026년 말~2027년 1분기 🟡) | 🟢[8-K] |
| TRISO 연료 | **TRISO-X(X-energy)** · **Standard Nuclear(STDN)** | 선행자 — DOE 프로그램에서 Antares 원자로 첫 임계용 연료를 제조(2026-06-04) | 🟡[BWXT·ExchangeMonitor] |
| HALEU 공급 | Centrus(LEU) · Orano · Urenco | BWXT는 농축사가 아니다. 다운블렌딩·가공 단계(NNSA 스크랩 재료로 HALEU 공급원료 가공) | 🟡 |

### 2.3 포터 5 Forces (해군 / 민수 분리)

| 힘 | 해군 핵추진 | 민수 원자력 |
|---|---|---|
| 신규 진입 위협 | **매우 낮음** — HEU 취급 면허·보안 인가·기밀 설계·70년 이력 🟢/🟡 | 중간 — TRISO-X NRC 40년 면허(2026-02), STDN 상장, 일본·한국 단조사 🟡 |
| 대체재 | 없음 — 해군 원자로를 대체할 기술 없음 🟡 | 가스·재생에너지(발전원 수준) |
| **구매자 교섭력** | **매우 높음** — 구매자 1명. 원가 감사(DCAA 등)와 FPIF 협상이 이윤 상한을 정한다 🟡[추정] | 높음 — OPG·Bruce Power 등 소수 발전사 · CanAtom 같은 EPC JV를 거쳐 하청 🟡 |
| 공급자 교섭력 | 중간 — "단일 공급원(single-source) 자재 공급자 다수"가 10-K 위험요인에 기재 🟢 | 중간 — 대형 단조는 JSW·Doosan이 병목(산업 보고서) 🟡 |
| 기존 경쟁 강도 | 낮음(노심) / 중간(사이트 관리 입찰) | 중~높음 |

**차원 2 결론 ★★★★★(해군)** — 노심·연료 제조에서 경쟁자는 보이지 않는다. 가장 큰 리스크는 경쟁사가 아니라 구매자다.
**차원 3 결론 ★★☆☆☆(가치 포착력)** — 쌍방독점 구조에서 이윤율은 협상으로 정해진다. 10년 Gross Margin이 29.9%에서 23.0%로 하락했다는 사실(_data.md 기준 정의)은 해자가 넓어도 마진이 오르지 않았음을 보여준다 🟢.

---

## 3. 핵심 경쟁사 위협 평가 (개별)

| 경쟁사 | 상장 | 겹치는 영역 | 위협도 | 근거 | 신뢰도 |
|---|---|---|---|---|---|
| **Curtiss-Wright (CW)** | NYSE | 해군 추진 부품 · AP1000 RCP · 미국 민수 기기 | **중** | 해군 노심에서는 경쟁하지 않는다. 미국 신규 대형로 기기에서는 CW가 AP1000 RCP 원천 공급자 지위를 갖고 있어, 민수에서 BWXT보다 유리할 수 있다. 같은 해군 예산에 노출된다(상관 위험) | 🟡 |
| **Westinghouse** | 비상장(Brookfield 51%·Cameco 49%, IPO 추진) | 원전 기기·연료·정비 · 10-K상 Gov·Comm 양쪽 경쟁사 | **중~고(민수)** | $80B 정부 파트너십의 설계 주체다. AP1000 기기 발주권을 쥔 고객이자 경쟁자다. 자체 부품 내재화가 BWXT 민수 성장 상한을 정할 수 있다 | 🟡 |
| **Framatome** | 비상장(EDF) | CANDU·PWR 기기·연료 · Isogen JV 파트너 | 중 | 캐나다·미국 기기 경쟁사이자 JV 파트너(Isogen: Framatome·Kinectrics) | 🟢[10-K] |
| **Doosan Enerbility** | 한국 상장 | 증기발생기·원자로 용기·대형 단조 | **중~고(민수)** | 대형 단조를 직접 가진 수직계열 경쟁자다. AP1000 대형 기기 수주 1순위 후보로 추정된다 | 🔴[추정] |
| **Centrus Energy (LEU)** | NYSE Am. | HALEU·농축 | **저(현재)** / 중(잠재) | DUECE는 국방 전용이라 지금은 직접 경쟁하지 않는다. 다만 Centrus AC100M도 미국 원천기술이라 국방 농축 2번째 공급자 후보가 될 수 있다 | 🔴[추정] |
| **X-energy / TRISO-X** | 상장(XE) | TRISO 연료 | **중** | 2026-02 첫 NRC Category II 상업 첨단연료시설 면허(TX-1·TX-2) · Xe-100 55기분 설계 용량 · 자사 원자로 연료를 내재화 | 🟡 |
| **Standard Nuclear (STDN)** | NYSE(2026-07) | TRISO 연료 | 중 | DOE 조건부 선정(2025-08) · HALEU 공급원료 수령(2026-01) · Oklo 제휴 | 🟡 |
| **HII · GD Electric Boat** | NYSE | 조선 | 위협 아님(하류 고객) | 생산 병목이 BWXT 납품 속도를 제약한다. 리스크 원천이지 경쟁사는 아니다 | 🟡 |

- **비컨센서스 시각(TRISO)**: 업계 분석 일부는 "TRISO 연료는 공유 공급 기반으로 바뀌고 있어 해자가 아니다"라고 본다 🟡[Sacra, 단일 의견]. BWXT의 TRISO 선행 우위는 독점 지대가 아니라 **경쟁 시장의 초기 점유율**로 봐야 한다 [의견].

---

## 4. 세부 시장 세그먼트별 구도

| 세그먼트 | 구조 | BWXT 점유율 | 이익률 단서 | 판정 |
|---|---|---|---|---|
| 해군 원자로 노심·기기 | 쌍방독점 | 사실상 100% 🟡[추정] | Gov Ops 16.8~17.6% 🟢 | 해자 ★5 / 가격결정력 ★2 |
| 해군 연료(Erwin NFS) | 쌍방독점 | 사실상 100% 🟡 | Gov Ops 안에 포함 ⬛ | 동일 |
| 국방 농축(DUECE) | 단독 계약 | 100%(계약) 🟢 | 개발 단계 — 원가가산 성격으로 추정 🔴 | 장기 해자 확장(2035~) |
| NNSA 사이트 관리·기술 서비스 | 과점 입찰 | ⬛ | JV 지분법 $74.9M 🟢 | 경쟁 시장 |
| 마이크로원자로(Pele·BANR) | 정부 시범 | ⬛ | "advanced nuclear 물량 감소" 🟢 | 옵션, 일정 지연 |
| CANDU 증기발생기 | 니치 과점 | "장악" 🟡 | Commercial 6.8~8.3% 🟢 | 우위 ★4 |
| CANDU 서비스(Kinectrics) | 경쟁 | ⬛ | 동일 | ★3 |
| 미국 민수 기기(PCG) | 경쟁 | 신규 | ⬛ | ★2(미입증) |
| TRISO 연료 | 3사 경쟁 초기 | 선행 | ⬛ | ★3 |

- **Pele 일정**: 2024년 계획은 2026년 INL 운송·시험이었다. 2025년 보도는 발전 개시를 빨라야 2028년으로 봤다. 2026년 현황은 확인하지 못했다 ⬛. 행정명령 14299는 2028-09-30까지 군 기지에서 원자로 가동을 요구한다 🟡.

---

## 5. 산업 트렌드

| 트렌드 | 방향 | BWXT 영향 | 신뢰도 |
|---|---|---|---|
| 해군 예산 증액(NR +12%, SSN/SSBN ≥$14.9B) | ⬆ | 긍정 | 🟢/🟡 |
| **NNSA 예산 의회 삭감 위험** — 하원 세출안 $27.07B(요청 대비 −17%) | ⬇ | NNSA 계약·DUECE 속도에 부정적일 수 있다 | 🟢[CRS] |
| 함정 생산 병목(Virginia 1.1~1.3척/년) | ⬇ | 원자로 납품 속도의 상한 | 🟢 |
| AUKUS 재검토 통과(2025-12) | ⬆ | 생산률 2.33척 목표 유지 | 🟡 |
| "의무(mandatory)" 예산 $1.4B(예산조정 경유) | ? | 정치 의존 — 불확실 | 🟡 |
| 미국 대형로 재개($80B · DOE $17.5B 대출) | ⬆ | 수혜 후보지만 **수주 미확정**. 대형 단조는 해외 의존 | 🟡 |
| TRISO 상업화·면허 경쟁 | ⬆ 수요 / ⬇ 독점 | 중립 | 🟡 |
| 러시아 농축 웨이버 종료(2027 말)·HALEU 부족 | ⬆ | 간접(BWXT는 농축사 아님) | 🟡[산업 보고서] |
| 국방 농축 국산화(DUECE) | ⬆ | 장기 해자 확장. NRC 면허 지연 위험이 공시 위험요인으로 기재됨 | 🟢 |

---

## 6. 밸류체인과 BWXT 위치

```
[업스트림]  우라늄 채굴(CCJ·Kazatomprom) → 변환(CCJ·Orano) → 농축(Urenco·Orano·Centrus · 국방: DUECE=BWXT ◀ 2035~)
[미드스트림] 연료 가공(해군 HEU 연료=BWXT ◀ / TRISO=BWXT·TRISO-X·STDN / 상업 LEU=Westinghouse·Framatome)
             원자로 기기(해군 노심·용기=BWXT ◀ / CANDU 증기발생기=BWXT ◀ / AP1000 RCP=CW / 대형 단조=Doosan·JSW)
[다운스트림] 조선(GD EB·HII) · 원자로 설계(Westinghouse·GEV) · 발전사(OPG·Bruce·CEG) · 고객: 미 해군
```

| 계층 | 10년 ROIC 중위(산업 보고서 실측) | 가치 배분 판단 | 신뢰도 |
|---|---|---|---|
| 우라늄 광산 | −11.2% | 사이클 정점에서만 이익 | 🟡[`Nuclear-Power-industry-20261008.md` 인용, 원자료 SEC] |
| 농축 | 상장 대표 LEU TTM ROIC 0.4% · GM 39.5%→26.2% | 물리적 병목이지만 지대는 비상장(Urenco·Orano)이 가져간다 | 🟡[동] |
| **원자로 기기·부품** | **13.4%** (BWXT 21.4%) | 계층 중 유일하게 두 자릿수 | 🟡[동] |
| SMR 개발사 | 음수 | 매출 없음 | 🟡[동] |

- BWXT는 **가장 수익성 높은 계층에, 가장 강한 니치(해군)로** 자리 잡고 있다 🟡.
- 하지만 반대로: 민수에서 BWXT의 위치는 EPC JV(CanAtom) 아래 **하청 제조사**다. 미국 AP1000에서도 설계사(Westinghouse)가 발주권을 쥔다. 민수 르네상스의 지대는 설계 플랫폼과 대형 단조에 몰리고, BWXT 민수는 하청 마진(6.8~8.3%)에 머무를 수 있다 [의견].

**차원 6 결론 ★★★★☆**

---

## 7. 멍거식 역발상 — "BWXT는 어떻게 실패하는가"

| # | 실패 경로 | 메커니즘 | 가능성 | 관측 지표 | 신뢰도 |
|---|---|---|---|---|---|
| 1 | **FPIF 원가 초과로 해군 마진이 서서히 잠식** | 노동·자재 인플레이션 + Columbia·Virginia 동시 증산 → 고정가 계약의 원가 초과분을 일부 부담 | **중** (이미 진행 중: 18.6%→17.6%) | Gov Ops 세그먼트 이익률 분기 추이 | 🟢 사실 / 🔴 지속 여부 추정 |
| 2 | **민수 확장이 "다각화가 아닌 악화(diworsification)"가 됨** | 차입 인수(장기부채 $1.04B→$2.02B 🟢)로 저마진 민수를 사들임 → 전사 ROIC 하락 | 중 | Commercial 이익률 10% 미만 고착 · ROIC | 🟢/🔴 |
| 3 | 조선 병목이 장기화되며 원자로 발주가 이연 | 조선소가 연 1.3척에 갇히면 해군이 장납기 발주 속도를 늦출 수 있다 | 저~중 | 5년 태스크오더 2~3년차 금액 · CRS 생산률 | 🟡 |
| 4 | 예산 정치(CR·NNSA 삭감·"의무" 예산 무산) | 하원 NNSA −17% · 계속결의(CR) 위험이 10-K에 명시 | 중(단기 변동) / 저(장기) | 세출 법안 | 🟢 |
| 5 | 단일 사이트 사고·면허 사건 | Lynchburg·Erwin 집중. HEU 시설 사고는 회복이 긴 영구 손상 | 저 / 손상 극대 | NRC 조치 | 🔴[추정] |
| 6 | 테마 가격 | 해자는 넓은데 이윤 상한이 있는 사업을 PER 33x에 산다 → 수익률은 배수 수축에 좌우 | 높음(가격 위험) | PER vs 10년 분포 | 🟡[퍼널 보고서] |
| 7 | 해군 핵추진 프로그램 축소 | 사실상 불가능 — 전략핵(Columbia)은 국가 최우선 | 매우 낮음 | — | 🟡[의견] |

> 멍거: "모든 걸 다 알 필요는 없다. 어디서 죽는지만 알면 거기 안 가면 된다."
> BWXT가 죽는 자리는 7번(해군 소멸)이 아니라 **1·2·6번의 조합**이다. 서서히 낮아지는 해군 마진, 차입으로 산 저마진 성장, 그리고 그 위에 얹힌 높은 배수다.

**반대 근거(강세 측)**: ① Gov Ops 수주잔고 +53%와 5년 태스크오더는 2030년까지 물량을 계약으로 확보했다는 뜻이다 🟢. ② DUECE는 2035년 이후 해군 HEU 공급망 상류까지 단독으로 확보한다. 해자를 수직으로 넓히는 것이다 🟢. ③ Commercial 이익률이 3.9%에서 8.0%로 회복 중이다 🟢. ④ 의료 사업 매각($750M 🟡)은 저마진·비핵심 사업을 정리하는 합리적 자본배분이다. 이 4가지는 실패 경로 1·2의 반증 후보다. 3Q26 실적(11-02)에서 Gov Ops 이익률이 반등하는지가 첫 시험대다.

---

## 8. 종합 결론

- **해자 판정**: 진입장벽 ★5는 유지한다. **해자가 이익으로 바뀌는 정도(가치 포착)는 ★2**다. 종합 경쟁 포지션은 **★4**다. 산업 보고서(2026-10-08)의 "해자 ★5"보다 한 단계 낮다. 이유는 쌍방독점 구조, Gov Ops 계약이 원가가산이 아닌 FPIF라는 10-K 확인, 그리고 민수 확장에 따른 마진 희석이다.
- **기존 판단과의 충돌**: 체크리스트(10-23)의 "원가가산이라 손실을 거의 보지 않는다"는 10-K 원문과 다르다. 변동성이 낮다는 결론 자체(10년 매출 역성장 0회)는 유효하다. 다만 메커니즘은 "원가가산 보호"가 아니라 "독점 구매자의 장기 물량 보장"으로 고쳐 써야 한다.
- **10년 후**: 해군 사업은 거의 확실히 남는다 🟡. 민수·SMR·TRISO에서는 BWXT가 "유일한 자"가 아니라 "여럿 중 하나"가 된다 [의견].
- **양면**: 강세 측 핵심 근거는 수주잔고 +53%, 예산 +12%, DUECE다. 약세 측 핵심 근거는 마진 하락 추세, 민수 저마진, 차입 인수다. 어느 쪽이 맞는지는 Gov Ops 이익률이 향후 2~4분기 동안 17%를 지키는지로 판별할 수 있다.

> 멍거: "훌륭한 기업을 적당한 가격에 사는 것이 적당한 기업을 훌륭한 가격에 사는 것보다 낫다."
> BWXT는 훌륭한 **해자**를 가졌다. 그 해자의 소유권 일부는 미 해군에 있다.

---

## 출처

- SEC: [BWXT FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1486957/000148695726000007/bwxt-20251231.htm) · [2Q26 8-K Ex.99.1](https://www.sec.gov/Archives/edgar/data/0001486957/000148695726000041/bwxt_63026xerexhibit991.htm) · `reports/BWXT/_data.md`(XBRL)
- 정부·의회: [CRS R48946 NNSA FY2027](https://www.everycrsreport.com/reports/R48946.html) · [DOE FY2027 Naval Reactors 예산서](https://www.energy.gov/documents/doe-fy-2027-volume-1-nr) · [CRS RL32418 Virginia/AUKUS 2026-01](https://www.everycrsreport.com/reports/RL32418.html) · [CRS R41129 Columbia](https://www.congress.gov/crs_external_products/R/PDF/R41129/R41129.282.pdf) · [ORNL DUECE](https://www.ornl.gov/news/duece-restore-us-uranium-enrichment-capability)
- 업계·보도: [BWXT $1.4B NNPP 계약](https://investors.bwxt.com/news-releases/news-release-details/bwxt-announces-14-billion-contracts-naval-nuclear-propulsion) · [Baird Maritime](https://www.bairdmaritime.com/security/naval/naval-ships/bwx-technologies-secures-14b-in-naval-nuclear-propulsion-contracts) · [Janes FY2027 잠수함](https://www.janes.com/defence-intelligence-insights/defence-news/industry/pentagon-budget-2027-us-navy-seeks-nearly-usd15-billion-in-submarine-investments) · [USNI Virginia/AUKUS](https://news.usni.org/2026/01/27/report-to-congress-on-the-virginia-class-submarine-program-and-aukus-pillar-i) · [ANS CMDF](https://www.ans.org/news/2026-01-27/article-7710/bwxts-centrifuge-manufacturing-development-facility-opens-in-oak-ridge/) · [BWXT TRISO Antares](https://www.bwxt.com/bwxt-manufactures-triso-fuel-enabling-first-new-reactor-criticality-under-doe-program/) · [ANS TRISO-X](https://www.ans.org/news/tag-triso-x/) · [WNN OPG 계약](https://world-nuclear-news.org/articles/major-contracts-awarded-for-opg-smr-and-life-extension-projects) · [NS Energy Pickering](https://www.nsenergybusiness.com/news/bwxt-wins-690m-contracts-for-pickering-nuclear-life-extension-and-darlington-smr-projects/) · [Neutron Bytes $80B](https://neutronbytes.com/2025/10/28/feds-in-80-billion-partnership-with-westinghouse-to-build-ap1000s/) · [WNN DOE AP1000 대출](https://www.world-nuclear-news.org/articles/us-federal-loan-to-jumpstart-ap1000-reactor-supply-chain) · [Power Mag Pele](https://www.powermag.com/project-pele-dods-htgr-mobile-nuclear-microreactor-breaks-ground) · [Motley Fool 2026-10-04](https://fool.com/investing/2026/10/04/bwx-technologies-already-builds-reactors-for-the-n)
- 내부: `reports/Nuclear-Power-industry-20261008.md` · `reports/Nuclear-Power-funnel-20261023.md` · `reports/BWXT/BWXT-checklist-20261023.md`

## ⬛ 데이터 공백

1. 원자로가 함정 원가에서 차지하는 비중(해군 TAM 중 BWXT 몫)
2. Gov Ops 세그먼트 이익 중 JV 지분법 이익 분해
3. 계약 유형별 매출 비중(FPIF vs 원가가산 vs 고정가)
4. Commercial 유기적 성장률(인수 효과 제외)
5. Pele·BANR 2026년 진행 현황
6. CANDU 증기발생기·서비스 시장 규모와 점유율 수치
7. AP1000 장납기 기기 BWXT 수주 여부
8. BPMI·Fluor Marine Propulsion과 BWXT의 계약 관계

<!-- discount-ledger
role: 산업·경쟁(멍거)
items:
  - name: 해자 ★5→★4 하향 (가치 포착력 ★2 — 쌍방독점·FPIF)
    pct: ⬛
    reason: 10-K상 Gov Ops는 주로 고정가격 인센티브 계약이며 단독 공급 문구가 없다 [사실 🟢] · 구매자 1명이 이윤 상한을 정함 [추정]
    overlapsWith: 재무(버핏) Gross Margin·ROIC 평가 / 리스크(리루) 고객 집중
  - name: 민수 비중 확대에 따른 전사 마진 희석 (세그먼트 혼합 이익률 −0.8pp 가정)
    pct: 3
    reason: Commercial 6.8~8.3% vs Gov 16.8% [사실 🟢] · 민수 비중 27%→35% 시 혼합 14.1%→13.3%(약 −6%), 2Q26 민수 마진 회복을 감안해 절반만 반영 [추정]
    overlapsWith: 재무(버핏) 영업이익률 가정
  - name: FPIF 원가 초과로 Gov Ops 이익률 하락 지속
    pct: 2
    reason: Gov Ops 이익률 FY24 17.3%→FY25 16.8%, 2Q 18.6%→17.6% [사실 🟢] · 지속 여부 [추정]
    overlapsWith: 리스크(리루) 계약 리스크
  - name: TRISO·SMR 점유율 가정 하향 (독점 → 3사 경쟁)
    pct: ⬛
    reason: TRISO-X NRC 면허 2026-02 · STDN 상장 [사실 🟡] · advanced nuclear 물량 감소 [사실 🟢]
    overlapsWith: 사업모델(단융핑) 성장 옵션
total: 5
-->

<!-- confidence-summary
high: 22
medium: 24
low: 9
gap: 8
verdict: 보통
-->
