# AI 반도체 산업 퍼널 스크리닝

> 전체 시장 스캔 → 5개 가치지표 스크리닝 → 정밀 분석 → 최종 3종목
> 작성 스킬: `/industry-funnel`

**데이터 기준일: 2026-07-24**
(개별 수치의 세부 기준일은 각 표·문장에 출처와 함께 표기)

**선행 보고서 재사용**: 같은 날짜(`reports/AI-Semiconductors-industry-20260724.md`, `/industry-research`) 결과를 입력으로 사용. 데이터 기준일이 **당일(0개월)**이므로 가치사슬 구도·TAM·병목 판단·기업 재무는 **노후화 없이 그대로 재사용**한다. 본 퍼널은 그 위에서 "개별 종목 정선"에 집중한다.

---

## ⓪ 데이터 소스 접근 확인

`site_preflight.py`(industry-funnel): Finviz·stockanalysis·SEC EDGAR 접근 가능, **macrotrends.net 봇 차단** → stockanalysis.com으로 대체. 차단 여부와 무관하게 스크리닝 진행. 핵심 지표는 stockanalysis + finviz + 각 사 IR로 교차검증.

---

## 1단계: 전체 시장 스캔 (A∪B∪C)

> A=거래 활성도, B=수익률 상위(30일·90일), C=시총 상위. 선행 리서치 4개 세그먼트 스캔 + SEC EDGAR SIC(3674 반도체) + ETF(SMH/SOXX/XSD) 구성종목 + Finviz/stockanalysis 교차. 순수도(해당 산업 매출 비중) 30% 미만은 "비순수"로 표기.

### 1.1 스캔 풀 (설계·컴퓨트)

| 기업 | 티커 | 거래소 | 시총(USD) | 핵심 사업 한 줄 | 산업 매출 비중 | 카테고리 |
|---|---|---|---|---|---|---|
| Nvidia | NVDA | NASDAQ | ~$5.06T | GPU+CUDA 풀스택 AI 컴퓨트 | ~92%(DC) 순수 | A·B·C |
| Broadcom | AVGO | NASDAQ | ~$1.87T | 커스텀 AI ASIC+네트워킹+SW | 혼합(AI 급증) | A·B·C |
| AMD | AMD | NASDAQ | ~$900B | GPU 2위+서버 CPU | 중(AI 성장) | A·C |
| Marvell | MRVL | NASDAQ | ~$183B | 커스텀 ASIC 2위+옵틱스 | 중~높음 | A·B |
| Cerebras | CBRS | NASDAQ | ~$56B(추정) | 웨이퍼스케일 가속기 | 순수(적자) | B |

### 1.2 스캔 풀 (파운드리·장비·EDA/IP)

| 기업 | 티커 | 거래소 | 시총 | 핵심 사업 | 산업 비중 | 카테고리 |
|---|---|---|---|---|---|---|
| TSMC | TSM | NYSE ADR | ~$2.2T | 선단 파운드리+CoWoS 병목 | 순수 | A·C |
| ASML | ASML | NASDAQ | ~$690B | EUV 노광 100% 독점 | 순수 | A·C |
| Applied Materials | AMAT | NASDAQ | ~$552B | WFE 최대 종합 | 순수 | A·C |
| Intel | INTC | NASDAQ | ~$500~530B | IDM+파운드리 재건 | 혼합(턴어라운드) | A·B·C |
| Lam Research | LRCX | NASDAQ | ~$399B | 식각·증착(HBM 수혜) | 순수 | A·C |
| KLA | KLAC | NASDAQ | ~$300~360B | 공정 검사 준독점 | 순수 | C |
| ARM Holdings | ARM | NASDAQ | ~$252B | CPU IP 라이선스 | 순수 | B·C |
| Synopsys | SNPS | NASDAQ | ~$80B+ | EDA 복점 1위 | 순수 | C |
| Cadence | CDNS | NASDAQ | ~$80B+ | EDA 복점 2위 | 순수 | C |
| GlobalFoundries | GFS | NASDAQ | ~$36B | 성숙 노드 파운드리 | 낮음(AI) | — |
| UMC | UMC | NYSE ADR | ~$20B대(추정) | 성숙 노드 파운드리 | 낮음(AI) | B |

### 1.3 스캔 풀 (메모리·네트워킹·테스트·소재)

| 기업 | 티커 | 거래소 | 시총 | 핵심 사업 | 산업 비중 | 카테고리 |
|---|---|---|---|---|---|---|
| Micron | MU | NASDAQ | ~$1.10T | HBM·DRAM(미국 유일 순수 메모리) | 높음 | A·B·C |
| Arista Networks | ANET | NYSE | ~$222B | AI 백엔드 이더넷 스위칭 | 높음 | A·C |
| Coherent | COHR | NYSE | ~$82B | 광 트랜시버·InP 레이저 | 높음 | B |
| Astera Labs | ALAB | NASDAQ | ~$56B | PCIe/CXL 커넥티비티 | 순수 | B |
| Credo | CRDO | NASDAQ | ~$44B | AEC·SerDes 인터커넥트 | 순수 | B |
| Lumentum | LITE | NASDAQ | 중형 | 광 트랜시버·CPO | 높음 | B |
| MKS Instruments | MKSI | NASDAQ | ~$22B | 진공·RF파워·소재 | 중 | C |
| Entegris | ENTG | NASDAQ | ~$20.6B | 공정 소재 소모품 | 순수 | C |
| Teradyne | TER | NASDAQ | ~$58B | ATE 테스트 복점 | 중상 | A·C |
| Advanced Energy | AEIS | NASDAQ | ~$14.4B | 정밀 전력변환 | 중 | B |
| FormFactor | FORM | NASDAQ | ~$8.8B | 프로브카드 1위(HBM) | 순수 | B |

### 1.4 미국 외 상장 / 비상장 (참고 — 미국 투자자 직접 노출 제한)

| 기업 | 코드 | 상태 | 비고 |
|---|---|---|---|
| SK Hynix | 000660 / OTC HXSCL | KRX·OTC | HBM 압도적 1위. NASDAQ ADR 상장 추진(미확정) → **미래 재평가 후보** |
| Samsung Electronics | 005930 / OTC SSNLF | KRX·OTC | 종합반도체, HBM 후발 회복 |
| Tokyo Electron | 8035 | TSE | WFE 2~3위, 미국 미상장 |
| Ibiden / Shinko | 4062 / 6967 | TSE | ABF 기판 과점, 미국 미상장 |
| SambaNova / Tenstorrent / Groq | — | 비상장 | AI 가속기 스타트업. Groq는 NVDA가 기술 흡수 → 사실상 소멸. **IPO 후보(SambaNova·Tenstorrent)** |

> **스캔 풀 합계**: 미국 상장 27개(설계 5·파운드리장비EDA 12·메모리네트워크테스트소재 10) + 참고 5개. 소형 니치(CRDO·ALAB·FORM·AEIS·CBRS)를 대형주 편향 없이 포함. GFS/UMC는 AI 직접 노출 낮아 카테고리 진입은 제한적이나 스캔에 기록.

---

## 2단계: 가치투자 5개 지표 1차 스크리닝 → ≤10

*(정밀 스크리닝 지표(ROE·D/E·FCF/순이익·PEG) 수집 에이전트 결과 취합 후 확정)*

---

## 3단계: 정밀 분석 (생존 종목)

*(2단계 통과 종목 확정 후)*

---

## 4단계: 4대 투자 대가 심층 분석 (최종 3종목)

*(3단계 후 확정)*

---

## 5단계: 종합 출력

*(전 단계 종합 후 확정)*
