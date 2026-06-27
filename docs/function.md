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
| **A1** | `/industry-research` | **S2** | `/news-pulse` |
| **A2** | `/industry-funnel` | **S3** | `/bottleneck-hunter` |
| **A3** | `/quality-screen` | **S5** | `/dyp-ask` |
| **A4** | `/investment-checklist` | **S6** | `/investment-article` |
| **A5+** | `/investment-team` | **S7** | `/financial-data` |
| **A6** | `/thesis-tracker` (논제 수립 모드) | **T1** | `financial_rigor.py` |
| **B1** | `/earnings-review` | **T2** | `report_audit.py` |
| **B1+** | `/earnings-team` (B1 심화 대안) | **T3** | `site_preflight.py` |
| **B2** | `/thesis-tracker` (분기검토 모드) | **T4** | `stock_screener.py` |
| **C1** | `/portfolio-review` | **T5** | `morningstar_fair_value.py` |
| **C2** | `/thesis-tracker` (분기검토, 종목별 반복) | | |

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

**위험 요소**: 해결됨 — [`func_warning.md`](func_warning.md) §1 "대시보드 가이드 플로우에 CLI 필수 경고 추가" 참조

---

### Step 5 [A5+] — `/investment-team` ✅ 🔧

**동작**: 4개 Agent 병렬 실행 (단융핑·버핏·멍거·리루 시각) → Team Lead가 통합 보고서 작성. 정보량은 단일 Agent 대비 4배, 3~10분 소요.

**의존성**:
- Claude Agent SDK: TeamCreate, TaskCreate, SendMessage
- WebSearch → macrotrends.net, stockanalysis.com, SEC EDGAR, Yahoo Finance, Seeking Alpha
- `tools/financial_rigor.py`, `tools/report_audit.py` (보고서 발행 전 데이터 검증)

> 해결·완화된 위험은 [`func_warning.md`](func_warning.md) §2 [A5+] 참조. report_audit.py Step 2 수동 입력은 [`backlog.md`](backlog.md)로 별도 보류.

---

### Step 6 [A6] — `/thesis-tracker` ✅ (논제 수립 모드)

**동작**: 매수 후 최초 실행 → 5문장 투자 논제 수립 + 핵심 가정 목록 + 레드라인 조건 설정

**의존성**:
- WebSearch (주가, 밸류에이션, 뉴스, SEC Form 4)
- `tools/financial_rigor.py`
- (선택) Step 5 [A5+]에서 생성된 리서치 보고서 — 있으면 우선 참조, 없으면 자체 데이터 수집

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

### [T1] `financial_rigor.py` ✅

**목적**: LLM 암산 오류 방지용 정밀 재무 계산 (Python stdlib Decimal 사용)

**사용 플로우**: 종목 발굴 Step 5 [A5+], 실적 점검 Step 1 [B1], 포트폴리오 점검 Step 1 [C1]에서 자동 호출

**기능**:
| 명령어 | 설명 |
|--------|------|
| `verify-market-cap` | 주가 × 주식수 vs 보고된 시가총액 검증 |
| `verify-valuation` | PER, PBR, ROE, FCF Yield 정밀 계산 |
| `cross-validate` | 여러 출처 데이터 교차 검증 (오차 >2% 경고) |
| `benford` | 벤포드 법칙으로 재무 데이터 조작 탐지 — **50개 이상 표본 필요, 단일 보고서가 아니라 한 종목의 다년치/다분기 누적 데이터(여러 10-K + 분기 실적)에만 사용** (`--help`와 코드 docstring에 명시) |
| `calc` | 안전 산술 표현식 계산 |
| `three-scenario` | 낙관/중립/비관 3시나리오 목표주가 계산 |

**의존성**: Python stdlib 전용 (외부 패키지 없음) ✅

---

### [T2] `report_audit.py` ✅

**목적**: 보고서 내 재무 데이터를 15% 무작위 샘플링 → 외부 소스와 대조 → 통과/반려 판정

**사용 플로우**: 종목 발굴 Step 5 [A5+] 완료 후 발행 전 필수 실행

**워크플로우**:
```
Step 1: python3 report_audit.py extract --report {파일}
        → 검증 목록 JSON 자동 출력 (fetched_value 항목은 비어있음)

Step 2: [수동] 각 항목을 macrotrends.net, stockanalysis.com, SEC에서 직접 조회해서 JSON에 채워넣기

Step 3: python3 report_audit.py verdict --results '{채운 JSON}'
        → 통과/반려 판정
```

**의존성**: Python stdlib 전용 ✅

**위험 요소**: 해결됨 — [`func_warning.md`](func_warning.md) §2 [T2] 참조

> Step 2 수동 입력 관련 자동화 검토는 [`backlog.md`](backlog.md) 참조 (보류, 우선순위 낮음).

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