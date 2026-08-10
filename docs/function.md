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
| **A3** | `/quality-screen` | **S6** | `/investment-article` |
| **A4** | `/investment-checklist` | | |
| **A5+** | `/investment-team` | **T1** | `financial_rigor.py` |
| **A6** | `/thesis-tracker` (논제 수립 모드) | **T2** | `report_audit.py` |
| **B1** | `/earnings-team` | **T3** | `site_preflight.py` |
| **B1+** | `/earnings-team` (B1 심화 대안) | **T4** | `stock_screener.py` |
| **B2** | `/thesis-tracker` (분기검토 모드) | **T5** | `morningstar_fair_value.py` |
| **C1** | `/portfolio-review` | | |
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

### Step 1 [B1] — `/earnings-team` ⚠️ 🔧

**동작**: SEC XBRL 재무 기준선 1회 확보(`_data.md`) → 4대 거장 병렬 실적 해석 → Team Lead 합성 → 편집·독자검토

**왜 `/earnings-review` 를 폐지했나** (2026-08-07, AMZN 2026Q2 A/B 실측 후):

> ⚠️ **처음 제시했던 "정확도 격차" 논거는 과장이었다 — 기록해 둔다.**
> 교체 당시 근거는 "`/earnings-review` 스킬 문서에 `fetch_financials.py` 언급이 0건"이었다.
> 그러나 **실제 산출물**(AMZN 2026Q2, 2026-07-31 작성, 428줄)을 열어보니 자료 등급표에
> `SEC XBRL 시계열 ✅ data.sec.gov 직접 조회 — 등급 A` 라고 적혀 있었다 —
> **XBRL을 직접 쓰고 있었다.** 도구가 문서에 명시되지 않아 매 실행 재량에 맡겨질 뿐,
> 구조적 정확도 열위가 아니었다.
>
> A/B 대조 실측(같은 종목·분기): `/earnings-review` 도 순환 구조·FCF 마이너스·백로그·
> 조정 EPS·PER 을 **모두** 잡았다. 못 잡은 것은 Level 3 와 장부가 세부 2가지뿐인데,
> 그건 **10-Q 미발간 시점에 돌렸기 때문**이며 보고서가 그 한계를 스스로 명시하고
> 종합등급 A− 를 매겼다.
>
> 원본 428줄은 git 히스토리에 보존돼 있다(검증 완료):
> `git show 06052ca:reports/AMZN/AMZN-earnings-2026Q2-review.md`

**실제 폐지 사유 (검증된 것만)**:

| 사유 | 근거 |
|---|---|
| **커버리지 상위집합** | A/B 대조 결과 `/earnings-review` 가 잡은 항목(순환 구조·FCF·백로그·조정 EPS·PER)을 `/earnings-team` 이 전부 포함하고, **동기간 경쟁사 비교**와 **4관점 모순점 추출**이 추가된다 |
| **출력 파일명 충돌** | 두 스킬의 최종 산출물이 `{티커}-earnings-{기간}.md` 로 **동일** — 같은 종목·분기에 둘 다 돌리면 덮어쓴다. 공존 자체가 불가능 |
| **가벼운 경로는 이미 존재** | "논제 깨졌나만 확인"은 `/thesis-tracker {티커} 분기검토`(1~3M)가 담당. `/earnings-review` 가 낄 자리가 없다 |
| 유지보수 | 실적 스킬 1개 > 2개 |

**폐지 전 이식한 것**: `/earnings-review` 의 **⓪ 자료 확보 등급 판정(A/B/C)** 을 `/earnings-team`
1단계로 옮겼다. 그 절차가 "10-Q 미발간 → 주석 분석 범위 제한"을 **선언하게 만들어** 원본 보고서를
정직하게 유지시킨 장치였고, `/earnings-team` 에는 그 처리가 약했다.

**의존성**:
- `tools/fetch_financials.py` (0번째 단계 · fetch-once)
- WebSearch (SEC EDGAR, Seeking Alpha earnings call transcript)
- `tools/financial_rigor.py`, `tools/report_audit.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 6-Agent 팬아웃 | 산출물 7종. 가벼운 분기 점검엔 과하다 → `/thesis-tracker 분기검토` 사용 | ⚠️ 중간 |
| **10-Q 미발간 시점 실행** | 실적 발표 당일~D+2 가 가장 흔한 실행 시점인데 주석이 없다 → **자동 B등급**, Level 3·우발부채·RPO 세부는 ⬛ | ⚠️ 중간 |
| 분기 수치는 수작업 | `_data.md` 는 **연간(10-K/20-F)만** 제공 — 분기치는 8-K/10-Q에서 별도 수집 | ⚠️ 중간 |
| SEC EDGAR 응답 지연 | 특정 시간대 EDGAR 서버 느림 | ⚠️ 낮음 |

**2026-08-07 첫 실행 실측** (AMZN 2026Q2):
토큰 서브에이전트 6개 합계 **609K**(4대가 486K + 편집 59K + 검토 64K) — 당초 5~10M 추정의 1/10.
소요 시간 4대가 병렬 약 10분, 3단계 약 5분. `_data.md` SEC vs Yahoo **32/32 일치**.
**발견된 결함 4건은 이 실행 직후 수정 완료**(3단계 순차화 · 합성 시 원문 재대조 · 서브보고서
confidence 블록 · SEC UA 문서화).

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

**언제**: 메가트렌드에서 공급망 병목 고리를 찾아 차익거래 기회를 발굴할 때.
섹터명을 이미 아는 경우는 [A1] `/industry-research` 가 낫다 — 이쪽은 **섹터가 아니라 트렌드만
있을 때의 진입점**이고, 시총 $100B 미만을 우선해 대형주를 의도적으로 뒤로 미룬다.

**동작**: 공급망을 Layer 0~4로 분해 → 병목 고리 식별 → 관련 상장 기업 발굴 → 밸류에이션 확인

**자동 실행 (2026-08-06 설정)**: Windows 작업 스케줄러가 **매일 09:00 KST**에
`tools/schedule_bottleneck_scan.ps1` 을 돌린다(작업명 `AI-Berkshire-Bottleneck-Scan`).
새 신호가 없으면 파일을 만들지 않으며, 산출물은 대시보드 **'병목 신호' 탭**에 모인다.
세션 크론·클라우드 루틴을 쓰지 않는 이유는 스크립트 헤더 주석 참조(요약: 대시보드가
읽는 것은 이 PC의 `reports/` 파일이라 클라우드에서 돌려봐야 산출물이 도달하지 않는다).

**의존성**: WebSearch, `claude` CLI 헤드리스(`-p`), `tools/commit_reports.py`

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| PC 전원 의존 | 09:00에 PC가 꺼져 있으면 그날 스캔은 건너뛴다(누락 알림 없음) | ⚠️ 중간 |
| 소형 공급업체 데이터 부족 | Layer 2/3 기업은 데이터 소스가 거의 없을 수 있음 | ⚠️ 중간 |
| 미검증 스킬 | 2026-08-06 기준 실행 이력 0건 — 자동 스캔 2주 후 산출물로 존폐 판단 | ⚠️ 중간 |

---

### [S5] `/dyp-ask` — ❌ 제거됨 (2026-08-07)

데이터를 조회하지 않는 롤플레이 스킬이라 제거했다. 근거:

- 외부 데이터 미조회 · 파일 저장 없음 → `skills/data-confidence.md` 기준 🔴[의견]에도 못 미침(출처 없음)
- 어떤 스킬도 `dyp-ask.md` 를 참조하지 않아 파이프라인에서 고립돼 있었음
- 프로젝트 최우선 원칙("사실과 데이터 기반, 주관적 추측 금지")과 충돌
- 생존 인물의 1인칭 발언을 데이터 없이 생성 — 대가를 *인용*하는 다른 스킬과 성격이 다름

> 단융핑 관점을 **실제 데이터 위에서** 돌리는 것은 `/investment-team` 의
> `01-BusinessModel-DYP-Perspective.md` 다. 관점 자체는 거기 살아 있다.
>
> S5 코드는 재사용하지 않는다(과거 보고서·로그의 코드 참조가 어긋나지 않도록).

---

### [S6] `/investment-article` ⚠️

**언제**: 완성된 리서치 보고서를 블로그/뉴스레터 아티클로 변환할 때

**의존성**: 선행 조건: 관련 보고서 파일 존재 (없으면 WebSearch로 대체 수집)

**위험 요소**:
| 위험 | 내용 | 심각도 |
|------|------|--------|
| 보고서 미존재 | 보고서 없이 실행 시 WebSearch 데이터로만 작성 → 품질 저하 | ⚠️ 중간 |

---

## 4-1. 공용 표준 문서 (슬래시 커맨드 아님)

`skills/` 에 있으나 **실행 스킬이 아니다** — 위 스킬들이 참조하는 규칙집이다.
`~/.claude/commands/` 에 설치하지 않는다(호출해도 산출물이 없고 오발동 대상만 늘린다).

| 문서 | 정의하는 것 | 참조 스킬 |
|------|-----------|----------|
| `skills/data-confidence.md` | 신뢰도 4등급(🟢🟡🔴⬛) · 유형 태그 · `<!-- confidence-summary -->` 블록 규격 | 11개 |
| `skills/financial-data.md` | 출처 우선순위 · 교차검증 오차 규칙(1%/5%) · SEC 공시 유형 | 10개 |
| `skills/token-budget.md` | 하드 규칙 TB-1~TB-7 (손자 에이전트 금지 · 재시도 1회 · 7일 내 산출물 재사용) | 8개 |

> ⚠️ `data-confidence.md` 의 요약 블록 규격은 **대시보드가 파싱하는 기계 계약**이다
> (`dashboard/lib/report-helpers.ts`). 형식을 바꾸면 신뢰도 pill이 깨진다.

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