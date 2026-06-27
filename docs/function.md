# 함수·Skill 전체 목록 및 위험 요소 분석

> 모든 Skill과 Python Tool의 동작 방식, 수동 입력 필요 여부, 의존성, 잠재적 장애 지점을 정리한 기술 문서.
>
> **해결되었거나 완화된 위험 요소는 [`func_warning.md`](func_warning.md)로 분리해서 기록한다. 이 문서에는 미해결 위험만 남긴다.**

---

## 목차

1. [플로우 A: 종목 발굴](#1-플로우-a-종목-발굴)
2. [플로우 B: 실적 점검](#2-플로우-b-실적-점검)
3. [플로우 C: 포트폴리오 점검](#3-플로우-c-포트폴리오-점검)
4. [플로우 외 단독 Skills](#4-플로우-외-단독-skills)
5. [Python Tools](#5-python-tools)
6. [공통 위험 요소 요약](#6-공통-위험-요소-요약)
7. [우선순위별 대응 권고](#7-우선순위별-대응-권고)

---

### 범례

| 기호 | 의미 |
|------|------|
| ✅ | 정상 동작, 큰 위험 없음 |
| ⚠️ | 잠재적 위험 존재, 주의 필요 |
| 🔴 | 높은 위험, 언제든 막힐 수 있음 |
| 🤚 | 수동 입력 필요 |
| 🔧 | Agent SDK 기능 의존 (팀/태스크 구조) |

---

### 코드 빠른 참조

대화 중 스킬/도구를 짧게 지칭할 때 사용.

| 코드 | Skill/Tool | 코드 | Skill/Tool |
|------|-----------|------|-----------|
| **A1** | `/industry-research` | **S1** | `/management-deep-dive` |
| **A2** | `/industry-funnel` | **S2** | `/news-pulse` |
| **A3** | `/quality-screen` | **S3** | `/bottleneck-hunter` |
| **A4** | `/investment-checklist` | **S4** | `/deep-company-series` |
| **A5** | `/investment-research` | **S5** | `/dyp-ask` |
| **A5+** | `/investment-team` (A5 심화 대안) | **S6** | `/investment-article` |
| **A6** | `/thesis-tracker` (논제 수립 모드) | **S7** | `/financial-data` |
| **B1** | `/earnings-review` | **T1** | `financial_rigor.py` |
| **B1+** | `/earnings-team` (B1 심화 대안) | **T2** | `report_audit.py` |
| **B2** | `/thesis-tracker` (분기검토 모드) | **T3** | `site_preflight.py` |
| **C1** | `/portfolio-review` | **T4** | `stock_screener.py` |
| **C2** | `/thesis-tracker` (분기검토, 종목별 반복) | **T5** | `morningstar_fair_value.py` |
| | | **T6** | `momentum_backtest.py` / `_v2.py` |

---

## 1. 플로우 A: 종목 발굴

> 섹터 아이디어 → 후보 압축 → 논제 수립 (6단계)

---

### Step 1 [A1] — `/industry-research` ✅

**동작**: 섹터 가치사슬 전체 스캔 → TAM, 주요 플레이어, 기술 트렌드, 포트폴리오 배분 제안

**의존성**: WebSearch (finviz, Yahoo Finance, Seeking Alpha, WSJ, SEC EDGAR), `tools/site_preflight.py` (0단계 사전 접근 점검)

> 해결·완화된 위험은 [`func_warning.md`](func_warning.md) 참조

---

### Step 2 [A2] — `/industry-funnel` ✅

**동작**: 전체 시장(30~60종목) → 5개 지표 스크리닝(≤10종목) → 정밀 분석 → 최종 3종목

**의존성**: WebSearch (finviz screener, macrotrends, stockanalysis, SEC), `tools/site_preflight.py` (0단계 사전 접근 점검)

> 해결·완화된 위험은 [`func_warning.md`](func_warning.md) 참조

---

### Step 3 [A3] — `/quality-screen` ✅

**동작**: 7가지 하드 기준 (ROE, FCF, 이자커버리지, Gross Margin, OCF/NI, Net Margin, 주식희석)으로 열등주 필터링

**의존성**: WebSearch (macrotrends, stockanalysis), `tools/site_preflight.py` (0단계 사전 접근 점검)

**위험 요소**: 결과를 파일로 저장하지 않으므로 재실행 필요 (위험이라기보다 운영 특성).

---

### Step 4 [A4] — `/investment-checklist` ✅ 🔧

**동작**: 각 종목마다 독립 백그라운드 Agent 실행 → 버핏 6-게이트 순차 검증

**의존성**:
- Claude Agent SDK: `Task` 도구
- WebSearch (macrotrends, stockanalysis, finviz, Yahoo Finance, SEC)

**위험 요소**: 해결됨 — [`func_warning.md`](func_warning.md) §2 [A4] 참조

---

### Step 5 [A5] — `/investment-research` 🤚

**동작**: 8단계 순차 분석 (데이터 수집 → 사업분석 → MOAT → 리스크 → 경영진 → 트렌드 → 밸류에이션 → 종합)

**의존성**:
- WebSearch → macrotrends.net, stockanalysis.com, SEC EDGAR, Yahoo Finance, Seeking Alpha
- `tools/financial_rigor.py` (Bash 호출)
- `tools/report_audit.py` (보고서 발행 전 데이터 검증)
- `tools/site_preflight.py` (0단계 사전 접근 점검)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| report_audit.py Step 2 | 보고서 검증 2단계는 사람이 직접 값을 채워야 함 (자동화 불가) | 🤚 수동 |

> **심화 대안 [A5+] — `/investment-team` ⚠️ 🔧**: 4개 Agent 병렬 실행 → Team Lead 통합 보고서. 정보량은 4배이나 3~10분 소요, Agent SDK 필수.
>
> | 위험 | 내용 | 심각도 |
> |------|------|--------|
> | Agent SDK 제한 | TeamCreate/TaskCreate는 Claude Agent SDK 전용 — 일반 대화 모드 실행 불가 | 🔴 높음 |
> | 실행 시간 | 4개 병렬 Agent 완료까지 3~10분, 타임아웃 위험 | ⚠️ 중간 |

---

### Step 6 [A6] — `/thesis-tracker` ✅ (논제 수립 모드)

**동작**: 매수 후 최초 실행 → 5문장 투자 논제 수립 + 핵심 가정 목록 + 레드라인 조건 설정

**의존성**:
- WebSearch (주가, 밸류에이션, 뉴스, SEC Form 4)
- `tools/financial_rigor.py`
- (선택) Step 5 [A5]에서 생성된 리서치 보고서 — 있으면 우선 참조, 없으면 자체 데이터 수집

**위험 요소**: 해결됨 — [`func_warning.md`](func_warning.md) §2 [A6] 참조

---

## 2. 플로우 B: 실적 점검

> 실적 발표 후 → 원본 분석 → 논제 업데이트 (2단계)

---

### Step 1 [B1] — `/earnings-review` ⚠️

**동작**: SEC 10-K/10-Q 원문 독해 → 재무 데이터 추출·검증 → 경영진 어조 분석 → 주석 발굴

**의존성**:
- WebSearch (SEC EDGAR, Seeking Alpha earnings call transcript)
- `tools/financial_rigor.py`
- `tools/site_preflight.py` (0단계 사전 접근 점검)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| SEC EDGAR 응답 지연 | 특정 시간대 EDGAR 서버 느림 | ⚠️ 낮음 |
| 상대경로 사용 | `tools/financial_rigor.py` 상대경로 사용 — 프로젝트 루트 외에서 실행 시 실패 | ⚠️ 낮음 |

> **심화 대안 [B1+] — `/earnings-team` ⚠️ 🔧**: 4대 거장 병렬 실적 해석 → 편집 Agent → 최종 아티클. `/investment-team`(A5+) + `/earnings-review`(B1)의 위험이 중첩되는 가장 복잡한 파이프라인.

---

### Step 2 [B2] — `/thesis-tracker` 🤚 (분기검토 모드)

**동작**: 기존 논제의 각 가정을 최신 실적 데이터로 검증 → 논제 건강도 점수(10점) 업데이트

**논제 건강도 행동 기준**:
| 점수 | 행동 |
|:----:|------|
| 9–10 | 추가 매수 검토 |
| 7–8 | 보유 유지 |
| 5–6 | 보유 + 경계 강화 |
| 3–4 | 감량 검토 |
| 1–2 | 매도 강력 권고 |

**위험 요소**: A6에서 만든 `{종목명}-thesis.md` 파일이 먼저 존재해야 함 (B1 보고서와는 무관).

---

## 3. 플로우 C: 포트폴리오 점검

> 분기 1회 → 전체 점검 → 각 종목 논제 확인 (2단계)

---

### Step 1 [C1] — `/portfolio-review` ⚠️ 🔧

**동작**: 보유 종목 현재 밸류에이션 병렬 수집 → 집중도·상관관계·기회비용·스트레스 테스트 → 리밸런싱 제안

**의존성**:
- Agent SDK: Task 도구 (각 종목 병렬 수집)
- WebSearch (현재 주가, 밸류에이션 지표)
- `tools/financial_rigor.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 실시간 주가 미반영 | WebSearch로 수집되는 주가는 실시간이 아닐 수 있음 | ⚠️ 중간 |
| Agent SDK 제한 | Task 도구 필요 | 해결됨 — [`func_warning.md`](func_warning.md) §2 [C1] 참조 |

---

### Step 2 [C2] — `/thesis-tracker` ⚠️ (분기검토 모드, 종목별 반복)

**동작**: 각 보유 종목의 논제 건강도 점검. 보유 종목 수만큼 반복 실행.

**위험 요소**: 보유 종목마다 각각 실행해야 하므로 종목이 많을수록 시간 소요.

---

## 4. 플로우 외 단독 Skills

> 플로우에 속하지 않고 필요 시 단독으로 사용하는 Skills

---

### [S1] `/management-deep-dive` ⚠️ 🔧

**언제**: 경영진이 투자 논거의 핵심일 때, 또는 `/investment-research`에서 경영진 점수 ★★★ 이하일 때

**동작**: CEO/경영진 공개 발언 추적, 자본 배분 결정 수익률 분석, 직원·고객 피드백 측면 검증

**의존성**: 백그라운드 Agent 병렬 실행 (Task 도구), WebSearch (LinkedIn, Glassdoor, SEC proxy statement), `tools/site_preflight.py` (0단계 사전 접근 점검)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Glassdoor/LinkedIn 차단 | 봇 탐지가 강함. `site_preflight.py`가 차단을 사전 감지해 대체 경로를 안내하지만, 차단 자체는 해소되지 않음 | ⚠️ 중간 |

---

### [S2] `/news-pulse` ⚠️ 🔧

**언제**: 보유 종목 주가가 급등락해서 10분 내 원인을 파악해야 할 때

**동작**: 4개 탐색 Agent 병렬 실행 (기업 이벤트 / 규제 / 동종업계 / 시장 심리) → 원인 분석

**의존성**: Agent SDK (TeamCreate, TaskCreate, SendMessage), WebSearch (Yahoo Finance, WSJ, Seeking Alpha, SEC 8-K)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Agent SDK 제한 | 팀 구조 필요 | ⚠️ 중간 |
| 실시간성 한계 | 탐색 결과는 수분 지연, 진짜 실시간 아님 | ⚠️ 중간 |

---

### [S3] `/bottleneck-hunter` ⚠️ 🔧

**언제**: 메가트렌드에서 공급망 병목 고리를 찾아 차익거래 기회를 발굴할 때

**동작**: 공급망을 Layer 0~4로 분해 → 병목 고리 식별 → 관련 상장 기업 발굴 → 밸류에이션 확인

**의존성**: WebSearch, Agent SDK (Task 병렬)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 복잡한 디렉토리 구조 | 시간별 폴더 자동 생성 — 파일 관리 복잡 | ⚠️ 중간 |
| 소형 공급업체 데이터 부족 | Layer 2/3 기업은 데이터 소스가 거의 없을 수 있음 | ⚠️ 중간 |

---

### [S4] `/deep-company-series` 🔴

**언제**: 단일 기업을 8편 장문 시리즈로 완전히 해부할 때

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 컨텍스트 한계 | 120,000자 이상 → 단일 세션 완료 불가, 여러 번 나눠야 함 | 🔴 높음 |

---

### [S5] `/dyp-ask` ✅

**언제**: 투자 아이디어나 결정을 단융핑의 시각으로 검토받고 싶을 때

**동작**: 단융핑 본인으로서 어떤 질문에도 답변 (순수 추론, 외부 의존 없음, 파일 저장 없음)

---

### [S6] `/investment-article` ⚠️

**언제**: 완성된 리서치 보고서를 블로그/뉴스레터 아티클로 변환할 때

**의존성**: 선행 조건: 관련 보고서 파일 존재 (없으면 WebSearch로 대체 수집)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 보고서 미존재 | 보고서 없이 실행 시 WebSearch 데이터로만 작성 → 품질 저하 | ⚠️ 중간 |

---

### [S7] `/financial-data` ✅

**동작**: 재무 데이터 수집·교차검증 기준 참조 문서. 실행이 아닌 표준 정의용.

---

## 5. Python Tools

---

### [T1] `financial_rigor.py` ⚠️

**목적**: LLM 암산 오류 방지용 정밀 재무 계산 (Python stdlib Decimal 사용)

**사용 플로우**: 종목 발굴 Step 5 [A5], 실적 점검 Step 1 [B1], 포트폴리오 점검 Step 1 [C1]에서 자동 호출

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

### [T2] `report_audit.py` ⚠️ 🤚

**목적**: 보고서 내 재무 데이터를 15% 무작위 샘플링 → 외부 소스와 대조 → 통과/반려 판정

**사용 플로우**: 종목 발굴 Step 5 [A5] 완료 후 발행 전 필수 실행

**워크플로우**:
```
Step 1: python3 report_audit.py extract --report {파일}
        → 검증 목록 JSON 자동 출력 (fetched_value 항목은 비어있음)

Step 2: [수동] 각 항목을 macrotrends.net, stockanalysis.com, SEC에서 직접 조회해서 JSON에 채워넣기

Step 3: python3 report_audit.py verdict --results '{채운 JSON}'
        → 통과/반려 판정
```

**의존성**: Python stdlib 전용 ✅

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Step 2 완전 수동 | 중간 단계가 완전히 사람 의존 — 자동화 불가. 보고서 1개당 15~30분 소요 | 🤚 수동 |
| 숫자 파싱 한계 | 복잡한 표 구조나 비표준 수 형식은 파싱 실패 가능 | ⚠️ 낮음 |

---

### [T4] `stock_screener.py` 🔴

**목적**: 모멘텀 발굴(60일 신고가 + 거래량) + 가치검증(6차원 점수) 복합 스크리너

**사용 플로우**: 플로우와 무관, 독립 실행

**의존성**: Yahoo Finance Chart API (비공식, 역엔지니어링), `curl`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Yahoo Finance 비공식 API | 공식 API가 아님. Yahoo가 언제든 차단·변경 가능 | 🔴 치명 |
| fundamentals.json 수동 관리 | 재무 데이터(EPS, 매출성장률 등)를 수동으로 파일에 입력해야 함 | 🤚 수동 |

---

### [T5] `morningstar_fair_value.py` 🔴

**목적**: Morningstar 스크리너에서 Fair Value 추정치가 있는 종목 추출 → Top 100 저가 종목 출력

**사용 플로우**: 플로우와 무관, 독립 실행

**의존성**: Morningstar 비공식 API (역엔지니어링), `curl`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 하드코딩된 API 키 | URL에 `klr5zyak8x` 세션 키가 박혀있음. 무효화 시 즉시 동작 불가 | 🔴 치명 |
| 비공식 엔드포인트 | `lt.morningstar.com/api/rest.svc/...` 내부 API — URL 구조 언제든 변경 가능 | 🔴 치명 |

---

### [T6] `momentum_backtest.py` / `momentum_backtest_v2.py` ⚠️

**목적**: NVDA/AMD/MU AI 칩 3종목으로 모멘텀+가치 프레임워크 백테스트 (2022~2025). 연구용.

**사용 플로우**: 플로우와 무관, 독립 실행

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| Yahoo Finance 비공식 API | stock_screener.py와 동일 위험 | 🔴 치명 |
| 고정 3종목 | NVDA/AMD/MU에만 최적화 — 범용성 없음 | ⚠️ 낮음 |

---

## 6. 공통 위험 요소 요약

### 🔴 위험 1: 역엔지니어링된 비공식 API

| 도구 | API | 위험 |
|------|-----|------|
| `stock_screener.py` | Yahoo Finance Chart API | 비공식 엔드포인트, 언제든 차단 가능 |
| `momentum_backtest.py` | Yahoo Finance Chart API | 동일 |
| `morningstar_fair_value.py` | Morningstar 내부 API | 하드코딩 세션 키 `klr5zyak8x` — 키 만료 시 즉시 사용 불가 |

**대체 방향**: `yfinance` 라이브러리 또는 유료 데이터 소스(Polygon.io, Alpha Vantage) 고려.

---

### ⚠️ 위험 2: Agent SDK 전용 기능 의존

| 코드 | Skill | 사용 플로우 |
|------|-------|------------|
| A5+ | `/investment-team` | 종목 발굴 Step 5 (심화 대안) |
| B1+ | `/earnings-team` | 실적 점검 Step 1 (심화 대안) |
| S2 | `/news-pulse` | 단독 사용 |

> [A4] `/investment-checklist`, [C1] `/portfolio-review`는 해결됨 — 대시보드 가이드 플로우에서 `requiresCli` 경고("Claude Code CLI에서 직접 실행해야 합니다")로 사전 안내. [`func_warning.md`](func_warning.md) §2 참조.

Claude Code CLI 환경에서만 동작. 일반 API 호출로는 실행 불가.

---

### ⚠️ 위험 3: 외부 사이트 접근 제한 (잔여)

| 사이트 | 위험 | 영향 플로우 |
|--------|------|------------|
| finviz.com | Elite 전용 필터 일부 — 사전 접근 점검으로는 해소되지 않는 기능 자체의 제한 | 종목 발굴 [A2] |
| Glassdoor / LinkedIn | 봇 탐지 강함, 접근 차단 자체는 미해소 | 단독 `/management-deep-dive` [S1] |

> 완화 조치(접근 차단 사전 점검, `site_preflight.py`)와 이미 해소된 사이트 목록은 [`func_warning.md`](func_warning.md) §3 참조.

---

### 🤚 위험 4: 수동 개입 필요한 단계

| 코드 | 도구/Skill | 수동 단계 | 영향 플로우 |
|------|------------|----------|------------|
| T2 | `report_audit.py` Step 2 | 검증 목록 각 항목을 직접 조회해서 JSON 채우기 | 종목 발굴 Step 5 [A5] 후 |
| T4 | `stock_screener.py` | `data/fundamentals.json`에 재무 데이터 수동 입력 | 플로우 외 |
| B2/C2 | `/thesis-tracker` (추적검토 모드) | A6에서 만든 `{종목명}-thesis.md` 파일이 먼저 존재해야 함 — 리서치 보고서는 무관 | 실적/포폴 Step 2 |

---

## 7. 우선순위별 대응 권고

### 단기 (언제든 막힐 수 있는 것)

**1. [T5] `morningstar_fair_value.py` API 키 점검**

하드코딩된 `klr5zyak8x` 키가 유효한지 주기적으로 확인 필요. 무효화 시 스크리너 전체 동작 불가.

**2. [T4] `stock_screener.py` Yahoo Finance API 대체 검토**

`yfinance` 라이브러리로 전환 시 비공식 API 의존도 제거 가능. 외부 패키지 도입 필요.

**3. [A2] `/industry-funnel` finviz 스크리닝 제한 잔여 위험**

ETF 다변화·대체 스크리너 보강 절차는 추가했으나(`skills/industry-funnel.md` 1.2), 여전히 finviz Elite 미보유로 인한 부분 누락 가능성은 구조적으로 남아있다. 무료 대안 조합(① ETF 확대 ② stockanalysis ③ Yahoo Screener ④ 정성 키워드 검색 ⑤ SEC 13F)의 실효성을 주기적으로 재검토.

---

### 장기 개선

**4. [T2] `report_audit.py` Step 2 반자동화**

현재 완전 수동인 Step 2를 WebSearch 또는 공개 API로 자동화하면 감사 프로세스가 실용적으로 변함.

---

> **핵심 요약** (2026-06-27 기준): Skills 17개 설치 완료. 절대경로 통일 완료. 중국 관련 도구 제거. 외부 사이트 접근 차단 위험은 `tools/site_preflight.py`로 대부분 완화되었음 — 상세 내역은 [`func_warning.md`](func_warning.md) 참조. 남은 가장 큰 위험은 ① 비공식 API 역엔지니어링(`morningstar_fair_value.py`의 하드코딩 세션 키 `klr5zyak8x`가 가장 취약), ② finviz Elite 필터 제한으로 인한 [A2] 종목 풀 잔여 누락 가능성.
