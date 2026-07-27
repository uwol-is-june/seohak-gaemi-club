# AI 인프라(AI Infrastructure) 산업 퍼널 스크리닝

> 전체 시장 스캔 → 5대 가치지표 → 정밀분석 → 최종 3종목 정선
> 작성 스킬: `/industry-funnel`
> 선행 보고서: `AI-Infrastructure-industry-20260727.md` (동일 기준일 — 가치사슬·TAM 그대로 재사용)

**데이터 기준일: 2026-07-27** (시총·밸류에이션 스냅샷 2026-07-24~25 stockanalysis.com)

---

## ⓪-2 선행 보고서 데이터 신선도

- 선행 `/industry-research` 보고서(`AI-Infrastructure-industry-20260727.md`)가 **오늘(2026-07-27) 작성** → 3개월 이내, **가치사슬 구도·TAM·병목 순위·검증 이벤트를 그대로 재사용**한다.
- 재사용 핵심 결론: ① 4사 2026 capex ~$725B(+77%), ② **병목이 칩→전력·냉각으로 이동**(그리드 접속 ~2.6TW 대기, 대형변압기 36~48개월), ③ 다운스트림 ROIC 미검증이 최대 리스크, ④ 1990s 광섬유 유추 = "인프라는 과잉건설이 기본값".
- 본 퍼널은 그 위에서 **개별 종목을 5대 가치지표로 정선**하는 데 집중한다.

---

## 1단계: 전체 시장 스캔 (스캔 풀)

> 선행 research의 Tier 1~4 스캔을 재사용하고, 퍼널 관점에서 누락 방지를 위해 엔지니어링/건설(PWR·EME·STRL), 그리드(HUBB) 등을 보강했다.
> **A**=거래활성/시총 상위, **B**=최근 수익률 상위, **C**=시총 상위. 산업 매출 비중 <30%는 "비순수(indirect)"로 표기.

### 1.1 스캔 풀 (섹터별)

**① 전력 장비·냉각·그리드 (병목 1순위 수혜)**

| 기업 | 티커 | 거래소 | 시총 | 한 줄 요약 | AI인프라 비중 | 카테고리 |
|------|------|--------|------|-----------|-------------|---------|
| Vertiv | VRT | NYSE | $111.5B | 데이터센터 냉각(액랭)+전력 | ~75%+ | A·B·C |
| Eaton | ETN | NYSE | $156.9B | 전기 스위치기어·배전(grid-to-chip) | ~16~20% | A·C |
| GE Vernova | GEV | NYSE | $270B | 가스터빈+그리드 장비 | 중(성장동력 DC) | A·C |
| Trane | TT | NYSE | $106.3B | HVAC+DC 열관리 | ~10~15% 비순수 | A·C |
| nVent | NVT | NYSE | $24.6B | 액랭 매니폴드·부스바 | ~20~25% | A·B |
| Powell | POWL | NASDAQ | $8.5B | 커스텀 스위치기어 | 증가중 | B |
| Modine | MOD | NYSE | $12.8B | Airedale DC 냉각·CDU | ~35%+ | B |
| Hubbell | HUBB | NYSE | (중대형) | 그리드·배전 커넥터 | 비순수 | C |
| Quanta Services | PWR | NYSE | (대형) | 전력망 건설·EPC | 중(전력망 수혜) | A·C |
| Comfort Systems | FIX | NYSE | $60.9B | DC 기계설비·모듈러 건설 | ~50%+ | A·B |
| Bloom Energy | BE | NYSE | $52.6B | 고체산화물 연료전지 | 신규수주 다수 | B |
| Generac | GNRC | NYSE | $11.9B | 백업 젠셋 | 소액 비순수 | C |

**② 발전·원전·우라늄 (전력이 병목이면 발전이 남는다)**

| 기업 | 티커 | 거래소 | 시총 | 한 줄 요약 | AI인프라 비중 | 카테고리 |
|------|------|--------|------|-----------|-------------|---------|
| Constellation | CEG | NASDAQ | $98.0B | 美 최대 원전 IPP(무탄소) | 중(DC PPA 수혜) | A·C |
| Vistra | VST | NYSE | $55.1B | 머천트 발전+원전 | 중 | A·B·C |
| Talen | TLN | NASDAQ | $17.2B | IPP+원전(Amazon PPA) | 중 | B |
| NRG Energy | NRG | NYSE | $29.8B | 머천트 발전·리테일 | 중 | A·C |
| Cameco | CCJ | NYSE | $38.3B | 우라늄 채굴·정련 | 간접 | B·C |
| Oklo | OKLO | NYSE | $7.0B | SMR 개발(프리레비뉴) | 미래 | B |

**③ 네트워킹·광 인터커넥트**

| 기업 | 티커 | 거래소 | 시총 | 한 줄 요약 | AI인프라 비중 | 카테고리 |
|------|------|--------|------|-----------|-------------|---------|
| Arista | ANET | NYSE | $219B | 고성능 이더넷 스위칭 | 높음 | A·C |
| Broadcom | AVGO | NASDAQ | ~$1.5T | 스위치 ASIC+커스텀 XPU | 중(반도체 복합) 비순수 | A·C |
| Marvell | MRVL | NASDAQ | $181B | 커스텀 XPU+광DSP(76% DC) | 높음 | A·C |
| Ciena | CIEN | NYSE | $58B | 코히어런트 DCI | 중 | A·B |
| Coherent | COHR | NYSE | $55B | 광트랜시버·EML레이저 | 높음(DC 75%) | A·B |
| Astera Labs | ALAB | NASDAQ | $50B | PCIe/CXL 리타이머 | 순수 | A·B |
| Credo | CRDO | NASDAQ | $40B | AEC·SerDes | 순수 | B |

**④ 서버·시스템·데이터센터 REIT**

| 기업 | 티커 | 거래소 | 시총 | 한 줄 요약 | AI인프라 비중 | 카테고리 |
|------|------|--------|------|-----------|-------------|---------|
| Equinix | EQIX | NASDAQ | $106.9B | 글로벌 코로케이션 REIT | 높음 | A·C |
| Digital Realty | DLR | NYSE | $75.0B | 하이퍼스케일 DC REIT | 높음 | A·C |
| Iron Mountain | IRM | NYSE | $38.2B | 기록물→DC 전환 REIT | 중 | B |
| Dell | DELL | NYSE | $282.7B | AI 서버(ISG)+PC | 중 비순수 | A·C |
| HPE | HPE | NYSE | $63.2B | 서버·Cray·Juniper | 중 | A·C |
| Super Micro | SMCI | NASDAQ | $19.5B | AI 서버·랙(액랭) | 높음 | A·B |
| Celestica | CLS | NYSE | (중형) | AI 하드웨어 ODM | 높음 | A·B |

**⑤ 클라우드 (하이퍼스케일러·네오클라우드)** — *대부분 "비순수"(복합 대기업) 또는 다운스트림 ROIC 미검증. 퍼널 5대 지표 적용 시 별도 취급.*

| 기업 | 티커 | 시총 | 비고 |
|------|------|------|-----|
| Microsoft/Alphabet/Amazon/Meta | MSFT/GOOGL/AMZN/META | $1.5~3.9T | AI인프라 비중 <30%인 복합 대기업 → 순수 스크린 제외(테마 노출은 있음) |
| Oracle | ORCL | $331B | OCI 고성장이나 OpenAI 54% 집중·FCF 마이너스 |
| CoreWeave | CRWV | $39.2B | 순수 GPU클라우드, 적자·부채 $24.9B |
| Nebius / IREN | NBIS/IREN | $67B/$19B | 순수 네오클라우드, 초고성장·적자 |

**미래 IPO 후보 (비상장)**: OpenAI, Anthropic(→Google/Amazon 지분), Databricks, Lambda, Crusoe, Nscale — GPU 클라우드/모델 계층. AI 인프라 다운스트림 수요의 실체지만 직접 투자 불가.

**비미국(접근 제약)**: 대만 ODM(폭스콘 2317·콴타 2382·위스트론 3231 — AI서버 조립 ~90%), 中 광모듈(InnoLight 300308·Eoptolink 300502 — CR2). 가치사슬 핵심이나 미국 계좌 접근 난이도 높음.

### 1.2 스캔 자가 점검
- 대형주 편향 방지: 소형(POWL $8.5B·MOD·CRDO·OKLO)도 병목 노출로 풀에 포함.
- 스토리 편향 방지: AI인프라 매출 비중 <30% 종목(TT·GNRC·HUBB·AVGO·DELL·MSFT류)은 "비순수" 명시.
- ETF 교차: GRID(Eaton·Schneider·Quanta·GEV), DTCR/SRVR(DC REIT), URA/URNM(우라늄) 구성 종목과 대조 완료.

---

*[2~5단계는 5대 가치지표 데이터(ROE·D/E·FCF/순이익) 수집 완료 후 작성]*
