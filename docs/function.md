# 함수·Skill 전체 목록 및 위험 요소 분석

> 모든 Skill과 Python Tool의 동작 방식, 수동 입력 필요 여부, 의존성, 잠재적 장애 지점을 정리한 기술 문서.

---

## 목차

1. [Skills — 전체 목록 및 위험 분석](#1-skills--전체-목록-및-위험-분석)
2. [Python Tools — 전체 목록 및 위험 분석](#2-python-tools--전체-목록-및-위험-분석)
3. [공통 위험 요소 요약](#3-공통-위험-요소-요약)
4. [우선순위별 대응 권고](#4-우선순위별-대응-권고)

---

## 1. Skills — 전체 목록 및 위험 분석

### 범례

| 기호 | 의미 |
|------|------|
| ✅ | 정상 동작, 큰 위험 없음 |
| ⚠️ | 잠재적 위험 존재, 주의 필요 |
| 🔴 | 높은 위험, 언제든 막힐 수 있음 |
| 🤚 | 수동 입력 필요 |
| 🔧 | Agent SDK 기능 의존 (팀/태스크 구조) |

---

### 1-1. `/investment-research` ⚠️

**동작**: 8단계 순차 분석 (데이터 수집 → 사업분석 → MOAT → 리스크 → 경영진 → 트렌드 → 밸류에이션 → 종합)

**의존성**:
- WebSearch → macrotrends.net, stockanalysis.com, SEC EDGAR, Yahoo Finance, Seeking Alpha
- `tools/financial_rigor.py` (Bash 호출)
- `tools/report_audit.py` (보고서 발행 전 데이터 검증)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 사이트 접근 차단 | macrotrends.net, Seeking Alpha는 봇 접근 차단 가능 | ⚠️ 중간 |
| report_audit.py Step 2 | 보고서 검증 2단계는 사람이 직접 값을 채워야 함 (자동화 불가) | 🤚 수동 |

---

### 1-2. `/investment-team` ⚠️ 🔧

**동작**: 4개 Agent(business-analyst, financial-analyst, industry-researcher, risk-assessor) 병렬 실행 → Team Lead 통합 보고서

**의존성**:
- Claude Agent SDK: `TeamCreate`, `TaskCreate`, `SendMessage`, `TeamDelete`
- 4개 병렬 WebSearch (각 Agent가 독립적으로 수행)
- `tools/financial_rigor.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Agent SDK 제한 | TeamCreate/TaskCreate는 Claude Agent SDK 전용 기능 — 일반 대화 모드에서 실행 불가 | 🔴 높음 |
| 실행 시간 | 4개 병렬 Agent 완료까지 3~10분 소요, 타임아웃 위험 | ⚠️ 중간 |

---

### 1-3. `/industry-research` ⚠️

**동작**: 섹터 가치사슬 전체 스캔 → TAM, 주요 플레이어, 기술 트렌드, 포트폴리오 배분 제안

**의존성**: WebSearch (finviz, Yahoo Finance, Seeking Alpha, WSJ, SEC EDGAR)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 사이트 접근 차단 | Seeking Alpha, WSJ는 구독 벽(paywall) 존재 → 일부 기사 접근 제한 가능 | ⚠️ 중간 |
| 데이터 최신성 | WebSearch 결과에 최신 데이터가 포함되지 않을 수 있음 | ⚠️ 중간 |

---

### 1-4. `/industry-funnel` ⚠️

**동작**: 전체 시장(30~60종목) → 5개 지표 스크리닝(≤10종목) → 정밀 분석 → 최종 3종목

**의존성**: WebSearch (finviz screener, macrotrends, stockanalysis, SEC)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| finviz 스크리닝 제한 | finviz.com Elite가 아니면 일부 필터 제한 | ⚠️ 중간 |
| 종목 누락 | 소형주나 ADR 종목은 WebSearch에서 자동으로 누락될 수 있음 | ⚠️ 중간 |

---

### 1-5. `/quality-screen` ✅

**동작**: 7가지 하드 기준 (ROE, FCF, 이자커버리지, Gross Margin, OCF/NI, Net Margin, 주식희석)으로 열등주 필터링

**의존성**: WebSearch (macrotrends, stockanalysis)

**위험 요소**: 사이트 접근 차단 외 특이 위험 없음. 결과를 파일로 저장하지 않으므로 재실행 필요.

---

### 1-6. `/investment-checklist` ⚠️ 🔧

**동작**: 각 종목마다 독립 백그라운드 Agent 실행 → 버핏 6-게이트 순차 검증

**의존성**:
- Claude Agent SDK: `Task` 도구
- WebSearch (macrotrends, stockanalysis, finviz, Yahoo Finance, SEC)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Agent SDK 제한 | Task 도구 필요 — 일반 대화에서 단일 분석으로 대체될 수 있음 | ⚠️ 중간 |

---

### 1-7. `/management-deep-dive` ⚠️ 🔧

**동작**: CEO/경영진 공개 발언 추적, 자본 배분 결정 수익률 분석, 직원·고객 피드백 측면 검증

**의존성**:
- 백그라운드 Agent 병렬 실행 (Task 도구)
- WebSearch (LinkedIn, Glassdoor, SEC proxy statement, 뉴스)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Glassdoor/LinkedIn 차단 | 이 사이트들은 봇 탐지가 강함 | 🔴 높음 |
| 경영진 발언 원문 접근 | Earnings call 트랜스크립트는 Seeking Alpha 유료 장벽 가능 | ⚠️ 중간 |

---

### 1-8. `/earnings-review` ⚠️

**동작**: SEC 10-K/10-Q 원문 독해 → 재무 데이터 추출·검증 → 경영진 어조 분석 → 주석 발굴

**의존성**:
- WebSearch (SEC EDGAR, Seeking Alpha earnings call transcript)
- `tools/financial_rigor.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Seeking Alpha 유료 장벽 | 어닝스 콜 녹취록 전문이 유료 구독 필요한 경우 존재 | ⚠️ 중간 |
| SEC EDGAR 응답 지연 | 특정 시간대 EDGAR 서버 느림 | ⚠️ 낮음 |
| 상대경로 사용 | `tools/financial_rigor.py` 상대경로 사용 — 프로젝트 루트 외에서 실행 시 실패 | ⚠️ 낮음 |

---

### 1-9. `/earnings-team` ⚠️ 🔧

**동작**: 4대 거장 병렬 실적 해석(단융핑/버핏/멍거/리루) → 편집 Agent → 독자 검토 Agent → 최종 아티클

**의존성**: Agent SDK (TeamCreate, TaskCreate), WebSearch, financial_rigor.py

**위험 요소**: `/investment-team` + `/earnings-review`의 위험 중첩. 가장 복잡한 파이프라인.

---

### 1-10. `/news-pulse` ⚠️ 🔧

**동작**: 4개 탐색 Agent 병렬 실행 (기업 이벤트 / 규제 / 동종업계 / 시장 심리) → 10분 원인 분석

**의존성**:
- Agent SDK: TeamCreate, TaskCreate, SendMessage
- WebSearch (Yahoo Finance, WSJ, Seeking Alpha, SEC 8-K)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Agent SDK 제한 | 팀 구조 필요 | ⚠️ 중간 |
| 실시간성 한계 | 탐색 결과는 수분 지연, 진짜 실시간 아님 | ⚠️ 중간 |

---

### 1-11. `/thesis-tracker` ⚠️

**동작**: 투자 논제 수립(최초) / 분기별 논제 건강도 점검(이후)

**의존성**:
- 선행 조건: `reports/{회사}/{회사}-thesis.md` 파일 존재 (재실행 시)
- WebSearch (주가, 밸류에이션, 뉴스, SEC Form 4)
- `tools/financial_rigor.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 선행 파일 의존 | `/investment-research` 또는 `/investment-team` 먼저 실행해야 함 | 🤚 수동 의존 |

---

### 1-12. `/portfolio-review` ⚠️ 🔧

**동작**: 보유 종목 현재 밸류에이션 병렬 수집 → 집중도·상관관계·기회비용·스트레스 테스트 → 리밸런싱 제안

**의존성**:
- Agent SDK: Task 도구 (각 종목 병렬 수집)
- WebSearch (현재 주가, 밸류에이션 지표)
- `tools/financial_rigor.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 실시간 주가 미반영 | WebSearch로 수집되는 주가는 실시간이 아닐 수 있음 | ⚠️ 중간 |

---

### 1-13. `/bottleneck-hunter` ⚠️ 🔧

**동작**: 메가트렌드 공급망을 Layer 0~4로 분해 → 병목 고리 식별 → 관련 상장 기업 발굴 → 밸류에이션 확인

**특이사항**: 시간별 스캔 모드 지원 (매 시간 실행 용도). 가장 복잡한 보고서 구조 생성.

```
reports/bottleneck-map/
├── master-map.md
├── watchlist.md
└── YYYY-MM-DD/
    └── HH-MM-{티커}.md
```

**의존성**: WebSearch, Agent SDK (Task 병렬)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 복잡한 디렉토리 구조 | 시간별 폴더 자동 생성 — 파일 관리 복잡 | ⚠️ 중간 |
| 소형 공급업체 데이터 부족 | Layer 2/3 기업은 데이터 소스가 거의 없을 수 있음 | ⚠️ 중간 |
| CLAUDE.md 경로 규칙과 충돌 | reports/bottleneck-map/ 구조가 CLAUDE.md 보고서 규칙 밖에 있음 | ⚠️ 낮음 |

---

### 1-14. `/deep-company-series` ⚠️

**동작**: 단일 기업 8편 장문 시리즈 작성 (합계 ~120,000자 이상)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 컨텍스트 한계 | 120,000자 이상 작업 → 단일 세션에서 완료 불가, 여러 번 나눠야 함 | 🔴 높음 |
| 보고서 경로 미정 | Skill 내 저장 경로가 `reports/{기업명}/《{기업명} 완전 해부》/` 로 되어있어 CLAUDE.md 규칙과 상충 | ⚠️ 중간 |

---

### 1-15. `/dyp-ask` ✅

**동작**: 단융핑 본인으로서 어떤 질문에도 답변 (순수 추론, 외부 의존 없음)

**위험 요소**: 없음. 파일도 생성하지 않음.

---

### 1-16. `/investment-article` ⚠️

**동작**: 기존 리서치 보고서 또는 주제를 블로그/뉴스레터 아티클로 변환

**의존성**:
- 선행 조건: 관련 보고서 파일 존재 (없으면 WebSearch로 대체 수집)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 보고서 미존재 | 보고서 없이 실행 시 WebSearch 데이터로만 작성 → 품질 저하 | ⚠️ 중간 |

---

### 1-17. `/financial-data` ✅

**동작**: 재무 데이터 수집·교차검증 기준 참조 문서. 실행이 아닌 표준 정의용.

**위험 요소**: 없음.

---

## 2. Python Tools — 전체 목록 및 위험 분석

---

### 2-1. `financial_rigor.py` ⚠️

**목적**: LLM 암산 오류 방지용 정밀 재무 계산 (Python stdlib Decimal 사용)

**기능**:
| 명령어 | 설명 |
|--------|------|
| `verify-market-cap` | 주가 × 주식수 vs 보고된 시가총액 검증 |
| `verify-valuation` | PER, PBR, ROE, FCF Yield 정밀 계산 |
| `cross-validate` | 여러 출처 데이터 교차 검증 (오차 >2% 경고) |
| `benford` | 벤포드 법칙으로 재무 데이터 조작 탐지 |
| `calc` | 안전 산술 표현식 계산 |
| `three-scenario` | 낙관/중립/비관 3시나리오 목표주가 계산 |

**의존성**: Python stdlib 전용 (외부 패키지 없음) ✅

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| benford 기능 실용성 | 50개 이상의 숫자가 있어야 동작. 단일 보고서에서는 표본 수 부족 가능 | ⚠️ 낮음 |

---

### 2-2. `report_audit.py` ⚠️ 🤚

**목적**: 보고서 내 재무 데이터를 15% 무작위 샘플링 → 외부 소스와 대조 → 통과/반려 판정

**워크플로우**:
```
Step 1: python3 report_audit.py extract --report {파일}
        → 검증 목록 JSON 자동 출력 (fetched_value 항목은 비어있음)

Step 2: [수동] 각 항목을 macrotrends.net, stockanalysis.com, SEC에서 직접 조회해서 JSON에 채워넣기

Step 3: python3 report_audit.py verdict --results '{채운 JSON}'
        → 통과/반려 판정
```

**의존성**: Python stdlib 전용 (외부 패키지 없음) ✅

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 🤚 Step 2 완전 수동 | 중간 단계가 완전히 사람 의존 — 자동화 불가. 보고서 1개당 15~30분 소요 예상 | 🤚 수동 |
| 숫자 파싱 한계 | 복잡한 표 구조나 비표준 수 형식은 파싱 실패 가능 | ⚠️ 낮음 |

---

### 2-3. `stock_screener.py` 🔴

**목적**: 모멘텀 발굴(60일 신고가 + 거래량) + 가치검증(6차원 점수) 복합 스크리너

**기능**:
- Layer 1: 60일 신고가 + 거래량 확인 → 후보 풀
- Layer 2: 6차원 점수 ≥ 3/6 → 매수 신호 (3/6=3%, 4/6=5%, 5~6/6=8% 비중 제안)
- data/fundamentals.json에서 재무 데이터 읽음
- data/watchlist.json에 종목 목록 관리

**의존성**:
- Yahoo Finance Chart API (비공식, 역엔지니어링)
- `curl` 시스템 명령어

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 🔴 Yahoo Finance 비공식 API | `https://query1.finance.yahoo.com/v8/finance/chart/` 는 공개 공식 API가 아님. Yahoo가 언제든 차단·변경 가능 | 🔴 치명 |
| 🤚 fundamentals.json 수동 관리 | 재무 데이터(EPS, 매출성장률 등)를 수동으로 파일에 입력해야 함 | 🤚 수동 |
| HK 종목 불안정 | `0700.HK` 형식 HK 종목은 Yahoo 응답이 불안정 | ⚠️ 중간 |

---

### 2-4. `morningstar_fair_value.py` 🔴

**목적**: Morningstar 스크리너에서 Fair Value 추정치가 있는 종목 전체 추출 → Top 100 저가 종목 출력

**의존성**: Morningstar 비공식 API (역엔지니어링), `curl`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 🔴 하드코딩된 API 키 | URL에 `klr5zyak8x` 세션 키가 박혀있음. Morningstar 서버 측에서 무효화하면 즉시 동작 불가 | 🔴 치명 |
| 🔴 비공식 엔드포인트 | `lt.morningstar.com/api/rest.svc/...` 는 내부 API — 언제든 URL 구조 변경 가능 | 🔴 치명 |
| 데이터 지연 | Morningstar Fair Value는 실시간이 아닌 분석가 추정치 | ⚠️ 중간 |

---

### 2-5. `momentum_backtest.py` / `momentum_backtest_v2.py` ⚠️

**목적**: NVDA/AMD/MU AI 칩 3종목으로 모멘텀+가치 프레임워크 백테스트 (2022~2025)

**의존성**: Yahoo Finance Chart API (비공식), Python urllib

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Yahoo Finance 비공식 API | stock_screener.py와 동일 위험 | 🔴 치명 |
| 백테스트 고정 종목 | NVDA/AMD/MU 3종목에만 최적화된 코드 — 다른 종목에 일반화 어려움 | ⚠️ 낮음 |
| 연구용 도구 | 실전 운용 도구가 아닌 연구용 — Skills에서 직접 호출되지 않음 | ✅ 낮음 |

---

## 3. 공통 위험 요소 요약

### 🔴 위험 1: 역엔지니어링된 비공식 API 3개

| 도구 | API | 위험 내용 |
|------|-----|----------|
| `stock_screener.py` | Yahoo Finance Chart API | 비공식 엔드포인트, 언제든 차단 가능 |
| `momentum_backtest.py` | Yahoo Finance Chart API | 동일 |
| `morningstar_fair_value.py` | Morningstar 내부 API | 하드코딩된 세션 키 `klr5zyak8x` — 키 만료 시 즉시 사용 불가 |

**대체 방향**: Yahoo Finance 공식 API (`yfinance` 라이브러리) 또는 유료 데이터 소스(Polygon.io, Alpha Vantage) 고려.

---

### ⚠️ 위험 2: Agent SDK 전용 기능 의존

`/investment-team`, `/earnings-team`, `/news-pulse`, `/investment-checklist`, `/portfolio-review`는 Claude Agent SDK의 `TeamCreate`, `TaskCreate`, `SendMessage` 기능을 사용. Claude Code CLI나 특정 환경에서만 동작하며, 일반 API 호출로는 실행 불가.

---

### ⚠️ 위험 3: 외부 사이트 접근 제한

| 사이트 | 위험 |
|--------|------|
| Seeking Alpha | 유료 구독 필요한 기사 존재 (어닝스 콜 트랜스크립트 등) |
| WSJ.com | 유료 구독 기사 다수 |
| macrotrends.net | 상대적으로 안정적, 무료 접근 가능 |
| SEC EDGAR | 공식 서비스, 안정적 |
| finviz.com | 무료이나 일부 Elite 전용 필터 |
| Glassdoor / LinkedIn | 봇 탐지 강함 |

---

### 🤚 위험 4: 수동 개입 필요한 단계들

| 도구/Skill | 수동 단계 |
|------------|---------|
| `report_audit.py` Step 2 | 검증 목록 각 항목을 사람이 직접 사이트에서 조회해서 JSON 채우기 |
| `stock_screener.py` | `data/fundamentals.json`에 종목별 재무 데이터 수동 입력 |
| `/thesis-tracker` | 선행 투자 분석 보고서가 먼저 존재해야 함 |
| `/investment-article` | 소재 보고서가 먼저 존재해야 좋은 출력 가능 |

---

## 4. 우선순위별 대응 권고

### 단기 대응 권고 (언제든 막힐 수 있는 것)

**1. `morningstar_fair_value.py` API 키 점검**

현재 하드코딩된 `klr5zyak8x` 키가 유효한지 주기적으로 확인 필요. 무효화 시 스크리너 전체 동작 불가. 장기적으로 Morningstar 공식 API 또는 대체 소스 검토.

**2. `stock_screener.py` Yahoo Finance API 대체 검토**

`yfinance` 라이브러리 (pip install yfinance)로 전환 시 Yahoo Finance 비공식 API 의존도 제거 가능. 단, 외부 패키지 도입 필요.

---

### 장기 개선 사항

**3. `report_audit.py` Step 2 반자동화**

현재 완전 수동인 Step 2를 WebSearch 또는 공개 API로 자동화하면 감사 프로세스가 실용적으로 변함.

---

> **핵심 요약** (2026-06-27 기준): Skills 17개 설치 완료. 모든 Skills 절대경로 통일 완료. 중국 관련 도구(`ashare_data.py`, `xueqiu_scraper.py`) 제거. 가장 큰 위험은 비공식 API 역엔지니어링이며, `morningstar_fair_value.py`의 하드코딩 세션 키 `klr5zyak8x`가 가장 취약한 지점.
