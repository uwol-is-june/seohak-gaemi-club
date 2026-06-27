# AI Berkshire US Edition — 사용 가이드

> 버핏·멍거·단융핑·리루 4대 투자 마스터의 방법론을 Claude Code Skill로 구현한 미국 주식 리서치 시스템.

---

## 목차

1. [최초 셋업](#1-최초-셋업)
2. [전체 투자 프로세스 플로우](#2-전체-투자-프로세스-플로우)
3. [단계별 Skill 상세 가이드](#3-단계별-skill-상세-가이드)
4. [파일 시스템 구조](#4-파일-시스템-구조)
5. [Tools 사용법](#5-tools-사용법)
6. [Skill 전체 목록 요약](#6-skill-전체-목록-요약)

---

## 1. 최초 셋업

### 1단계: Claude Code 설치

```bash
npm install -g @anthropic-ai/claude-code
```

### 2단계: Skills 설치 (1회만 실행)

```bash
mkdir -p ~/.claude/commands
cp ~/Desktop/reality-escape-device/skills/*.md ~/.claude/commands/
```

> Skills를 업데이트하면 위 명령어를 다시 실행한다.

### 3단계: 확인

Claude Code를 열고 `/` 를 입력하면 설치된 Skill 목록이 보여야 한다.

---

## 2. 전체 투자 프로세스 플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                      투자 프로세스 전체 흐름                          │
└─────────────────────────────────────────────────────────────────────┘

[시작점 A: 섹터/테마 아이디어가 있을 때]
         │
         ▼
┌─────────────────────────┐
│  /industry-research     │  섹터 전체 구조 이해 (밸류체인, TAM 등)
│  예: AI Semiconductors  │  → reports/{섹터}-industry-{날짜}.md
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  /industry-funnel       │  전체 시장(30~60종목) → 최종 3종목 압축
│  예: S&P500 AI Infra    │  → reports/{섹터}-funnel-{날짜}.md
└───────────┬─────────────┘
            │
            ▼ (3종목 선정됨)

[시작점 B: 특정 종목이 있을 때]
         │
         ▼
┌─────────────────────────┐
│  /quality-screen        │  7가지 하드 기준으로 열등주 먼저 탈락
│  예: Apple, MSFT, GOOGL │  → 화면 출력 (파일 저장 없음)
└───────────┬─────────────┘
            │ 통과한 종목만
            ▼
┌─────────────────────────┐
│  /investment-checklist  │  버핏 6-게이트 체크 (10분 의사결정)
│  예: AAPL, MSFT, GOOGL  │  → reports/{회사}/checklist-{날짜}.md
└───────────┬─────────────┘
            │ 관심 종목 압축
            ▼
            │
     ┌──────┴───────┐
     │              │
     ▼              ▼
┌──────────┐  ┌──────────────┐
│/investment│  │/investment   │
│-research  │  │-team         │
│(1인 분석) │  │(4Agent 병렬) │  ← 더 빠르고 상세
│빠른 분석  │  │심층 분석     │
└────┬─────┘  └──────┬───────┘
     └────────┬───────┘
              │
              ▼
       보고서 생성됨
 reports/{회사}/{회사}-research-{날짜}.md
 또는 reports/{회사}/ 폴더 (5개 파일)
              │
              │ 필요 시 심화 분석
              ├──────────────────────────────────────┐
              │                                      │
              ▼                                      ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  /management-deep-dive   │         │  /deep-company-series    │
│  경영진 심층 연구          │         │  8편 연재 완전 해부       │
│  → reports/{회사}/       │         │  → reports/{회사}/        │
│    management-{날짜}.md  │         └──────────────────────────┘
└──────────────────────────┘

              │
              │ 매수 결정 후 → 보유 기간 관리
              ▼
┌─────────────────────────┐
│  /thesis-tracker        │  투자 논제 수립 (최초 1회)
│  예: Apple              │  → reports/{회사}/{회사}-thesis.md
└───────────┬─────────────┘
            │ 분기마다 재실행
            │
     ┌──────┴──────────────────────────────────────┐
     │                  │                           │
     ▼                  ▼                           ▼
┌──────────┐   ┌─────────────────┐    ┌────────────────────┐
│/news-pulse│   │/earnings-review │    │/portfolio-review   │
│10분 뉴스  │   │실적 정밀 분석    │    │포트폴리오 점검       │
│원인 분석  │   │→ reports/{회사}/ │    │→ reports/          │
│           │   │  earnings-{기간} │    │  portfolio-latest  │
└──────────┘   └─────────────────┘    └────────────────────┘

[생각 도구 - 언제든 사용]
┌─────────────────────────┐
│  /dyp-ask               │  단융핑 방식으로 어떤 질문도 탐구
│  예: Apple의 진짜 해자는? │  → 화면 출력 (파일 저장 없음)
└─────────────────────────┘
```

---

## 3. 단계별 Skill 상세 가이드

### Phase 1: 발굴 & 스크리닝

---

#### `/industry-research {섹터명}`

**언제**: 특정 섹터에 투자 아이디어가 생겼을 때 전체 그림을 파악하고 싶을 때

**하는 일**:
- 섹터 밸류체인 전체 분석 (업스트림 → 미드스트림 → 다운스트림)
- TAM(총 유효 시장), 성장률, 기술 변화
- 주요 플레이어 비교

**생성 파일**:
```
reports/{섹터명}-industry-{YYYYMMDD}.md
예: reports/AI-Semiconductors-industry-20260627.md
```

**사용 예시**:
```
/industry-research AI Semiconductors
/industry-research US Fintech
/industry-research Cloud Computing
```

---

#### `/industry-funnel {섹터명 또는 시장}`

**언제**: 섹터 내에서 실제로 살 만한 종목 3개를 추려야 할 때

**하는 일**:
```
1단계: 전체 시장 스캔 (30~60개 종목)
    ↓
2단계: 5개 핵심 지표 1차 스크리닝 (≤10개)
    ↓
3단계: 정밀 분석 (300~500자씩)
    ↓
4단계: 4대 거장 시각 심층 분석 → 최종 3종목
```

**생성 파일**:
```
reports/{섹터명}-funnel-{YYYYMMDD}.md
예: reports/SP500-Fintech-funnel-20260627.md
```

**사용 예시**:
```
/industry-funnel S&P500 Fintech
/industry-funnel Nasdaq 100
/industry-funnel US AI Infrastructure
```

> **주의**: `/industry-research`로 구조 파악 먼저, `/industry-funnel`로 종목 압축이 권장 순서다.

---

#### `/quality-screen {종목 또는 섹터}`

**언제**: 후보 종목들 중 확실한 열등주를 빠르게 걸러내야 할 때

**하는 일**: 7가지 하드 기준 일괄 검증
| # | 기준 | 탈락 조건 |
|---|------|---------|
| 1 | 10년 평균 ROE | 8% 미만 |
| 2 | 5년 누적 FCF | 음수 |
| 3 | 이자커버리지 | 2배 미만 |
| 4 | 장기 Gross Margin | 15% 미만 |
| 5 | OCF/Net Income | 0.7 미만 |
| 6 | 장기 Net Margin | 5% 미만 |
| 7 | 5년 주식수 증가율 | 20% 초과 |

**생성 파일**: 없음 (화면 출력)

**사용 예시**:
```
/quality-screen Apple, Microsoft, NVIDIA
/quality-screen S&P 500 금융주
/quality-screen Nasdaq 100
```

---

### Phase 2: 심층 분석

---

#### `/investment-checklist {종목들}`

**언제**: 후보 종목이 3~5개로 좁혀졌고, 매수 전 최종 체크를 하고 싶을 때

**하는 일**: 버핏 방식 6-게이트 순서대로 검증
1. 이 사업을 이해할 수 있는가 (능력 범위)
2. 경제적 해자가 있는가
3. 경영진을 신뢰할 수 있는가
4. 재무 건전성
5. 밸류에이션 (안전마진)
6. 촉매 & 타이밍

**생성 파일**:
```
reports/{회사}/{회사}-checklist-{YYYYMMDD}.md
예: reports/NVIDIA/NVIDIA-checklist-20260627.md
```

**사용 예시**:
```
/investment-checklist AAPL, MSFT, GOOGL, AMZN
/investment-checklist NVIDIA
```

---

#### `/investment-research {종목명}`

**언제**: 특정 종목을 체계적으로 혼자 깊이 분석하고 싶을 때

**하는 일**: 8단계 순차 분석
```
사전: AI 리서치 편향 평가 (정보 풍부도 A/B/C)
1단계: 데이터 수집 + tools/financial_rigor.py 검증
2단계: 사업 본질 분석 (단융핑)
3단계: MOAT 평가 (버핏)
4단계: 역발상·리스크 목록 (멍거)
5단계: 경영진 평가 (단융핑+버핏)
6단계: 산업·문명적 트렌드 (리루)
7단계: 밸류에이션·안전마진 (버핏+단융핑)
8단계: 종합 투자 의사결정 메모
→ 데이터 표본 검사 (report_audit.py)
```

**생성 파일**:
```
reports/{회사}/{회사}-research-{YYYYMMDD}.md
예: reports/Apple/Apple-research-20260627.md
```

**사용 예시**:
```
/investment-research Apple
/investment-research NVIDIA
```

---

#### `/investment-team {종목명}`

**언제**: 가장 철저한 분석이 필요할 때 (가장 추천)

**하는 일**: 4개 Agent 병렬 실행 → Team Lead가 통합 보고서 작성
```
Agent 1 (business-analyst)    단융핑 시각: 비즈니스 모델·MOAT
Agent 2 (financial-analyst)   버핏 시각: 재무·밸류에이션
Agent 3 (industry-researcher) 멍거 시각: 산업구도·경쟁
Agent 4 (risk-assessor)       리루 시각: 리스크·경영진
        ↓ (병렬 실행, 수 분 소요)
Team Lead: 4개 보고서 통합 → 최종 보고서
```

**생성 파일** (5개 문서):
```
reports/{회사}/
├── README.md
├── 01-BusinessModel-DYP-Perspective.md
├── 02-FinancialValuation-Buffett-Perspective.md
├── 03-IndustryCompetition-Munger-Perspective.md
├── 04-RiskManagement-LiLu-Perspective.md
└── FinalReport.md
```

**사용 예시**:
```
/investment-team NVIDIA
/investment-team Apple
```

> `/investment-research` vs `/investment-team`:
> - 빠른 분석이 필요하면 → `/investment-research`
> - 가장 철저한 분석이 필요하면 → `/investment-team` (4배 정보량, 수 분 소요)

---

#### `/management-deep-dive {인물명 또는 회사명}`

**언제**: 경영진이 투자 논거의 핵심이거나, `/investment-research`에서 경영진 점수가 ★★★ 이하일 때

**하는 일**:
- CEO의 공개 발언 vs 실제 이행 비교 (약속 추적)
- 모든 주요 자본 배분 결정의 수익률 분석
- 어려운 시기의 결정으로 품성 추론
- 직원·고객·공급업체 피드백 측면 검증

**생성 파일**:
```
reports/{회사}/{회사}-management-{YYYYMMDD}.md
예: reports/Apple/Apple-management-20260627.md
```

**사용 예시**:
```
/management-deep-dive Tim Cook Apple
/management-deep-dive Jensen Huang NVIDIA
/management-deep-dive Apple
```

---

### Phase 3: 실적 & 뉴스 모니터링

---

#### `/earnings-review {종목명} {기간}`

**언제**: 실적 발표 후 원본 자료를 직접 분석하고 싶을 때

**하는 일**: 1차 자료 직접 독해 (SEC 10-K/10-Q, 어닝스 콜 녹취록)
- 핵심 재무 데이터 추출·검증
- 경영진 어조 분석 (솔직/모호/회피 신호 분류)
- 약속 이행 추적 (이전 분기 약속 vs 실제)
- 재무제표 주석의 숨겨진 정보 발굴

**생성 파일**:
```
reports/{회사}/{회사}-earnings-{기간}.md
예: reports/Apple/Apple-earnings-2025Q4.md
```

**사용 예시**:
```
/earnings-review Apple 2025Q4
/earnings-review NVIDIA FY2025
/earnings-review Microsoft 최신
```

---

#### `/news-pulse {종목명}`

**언제**: 보유 종목 주가가 급등락해서 10분 내에 원인을 파악하고 싶을 때

**하는 일**: 4개 Agent 병렬 탐색
- Agent 1: 기업 이벤트 (실적, M&A, 경영진 변경)
- Agent 2: 규제 정책 (SEC, FTC, DOJ)
- Agent 3: 동종업계 동향
- Agent 4: 시장 심리·매크로

출력: 이벤트 타임라인 + 변동 주요 원인 + thesis 재검토 필요 여부

**생성 파일**: 없음 (화면 출력)

**사용 예시**:
```
/news-pulse NVIDIA
/news-pulse Apple
```

> 주가 변동 폭과 기간을 같이 알려주면 더 정확한 분석 가능:
> `/news-pulse NVIDIA 3일간 -12%`

---

### Phase 4: 보유 기간 관리

---

#### `/thesis-tracker {종목명}`

**언제**:
- 주식을 사고 난 직후 → 투자 논제 수립 (최초 실행)
- 매 분기 실적 발표 후 → 논제 여전히 유효한지 점검

**하는 일**:
- **논제 수립 모드** (최초): 5개 문장으로 매수 이유 작성 + 핵심 가정 목록 + 레드라인 조건 설정
- **추적 검토 모드** (이후): 각 가정을 최신 데이터로 검증 → 논제 건강도 점수 (10점)

논제 건강도 점수 기준:
| 점수 | 의미 | 행동 |
|:----:|------|------|
| 9–10 | 논제 강화됨 | 추가 매수 검토 |
| 7–8 | 핵심 유효 | 보유 유지 |
| 5–6 | 일부 훼손 | 보유 + 경계 강화 |
| 3–4 | 다수 훼손 | 감량 검토 |
| 1–2 | 레드라인 발동 | 매도 강력 권고 |

**생성 파일** (장기 누적 관리):
```
reports/{회사}/{회사}-thesis.md
예: reports/Apple/Apple-thesis.md
```

**사용 예시**:
```
/thesis-tracker Apple          ← 첫 실행: 논제 수립, 이후: 추적 검토
/thesis-tracker Apple 분기검토  ← 최신 실적 기준 검토 강제 실행
```

---

#### `/portfolio-review {보유 내역}`

**언제**: 분기 1회 또는 포트폴리오 재조정이 필요할 때

**하는 일**:
- 보유 종목별 현재 밸류에이션 수집 (병렬)
- 개별 종목 건강 진단
- 집중도 분석 (상위 3종목 비중, 총 종목 수)
- 상관관계 점검 (숨겨진 리스크 동조화)
- 기회비용 분석 (예상 수익률 순위)
- 스트레스 테스트 (경기 침체, 금리 급등 등 5가지 시나리오)
- 리밸런싱 제안

**생성 파일**:
```
reports/portfolio-latest.md  ← 지속 업데이트 (덮어쓰기 아닌 누적)
```

**사용 예시**:
```
/portfolio-review Apple 30%, Microsoft 20%, NVIDIA 20%, Cash 30%
/portfolio-review AAPL 50주 @$195, MSFT 30주 @$415, NVDA 20주 @$890
/portfolio-review 내 포트폴리오   ← reports/portfolio-latest.md 파일이 있을 때
```

---

### 생각 도구

---

#### `/dyp-ask {질문}`

**언제**: 투자 아이디어나 결정에 대해 단융핑의 시각으로 검토받고 싶을 때

**하는 일**: 단융핑 본인이 되어 질문에 답변
- 비즈니스 모델의 본질 파고들기
- "10년 보유 가능한가" 관점
- 복잡한 것 단순화하는 제1원칙 사고

**생성 파일**: 없음 (대화)

**사용 예시**:
```
/dyp-ask Apple의 진짜 MOAT는 무엇인가?
/dyp-ask AI 버블이 터진다면 NVIDIA는 어떻게 될까?
/dyp-ask 지금 주식시장이 전반적으로 비싼가?
```

---

## 4. 파일 시스템 구조

### Skill이 생성하는 파일 위치

```
reality-escape-device/
│
├── reports/                          ← 모든 보고서의 루트
│   │
│   ├── {회사명}/                     ← 종목별 폴더
│   │   ├── README.md                 ← /investment-team 개요
│   │   ├── 01-BusinessModel-DYP-Perspective.md
│   │   ├── 02-FinancialValuation-Buffett-Perspective.md
│   │   ├── 03-IndustryCompetition-Munger-Perspective.md
│   │   ├── 04-RiskManagement-LiLu-Perspective.md
│   │   ├── FinalReport.md            ← /investment-team 최종
│   │   ├── {회사명}-research-YYYYMMDD.md  ← /investment-research
│   │   ├── {회사명}-checklist-YYYYMMDD.md ← /investment-checklist
│   │   ├── {회사명}-earnings-{기간}.md    ← /earnings-review
│   │   ├── {회사명}-management-YYYYMMDD.md← /management-deep-dive
│   │   └── {회사명}-thesis.md         ← /thesis-tracker (장기 누적)
│   │
│   ├── {섹터명}-industry-YYYYMMDD.md  ← /industry-research (루트)
│   ├── {섹터명}-funnel-YYYYMMDD.md    ← /industry-funnel (루트)
│   └── portfolio-latest.md           ← /portfolio-review (루트, 누적)
│
├── skills/                           ← Skill 정의 파일 (.md)
│   └── *.md                          → ~/.claude/commands/ 에 복사해서 사용
│
├── tools/                            ← 보조 Python 도구
│   ├── financial_rigor.py            ← 정밀 재무 계산
│   ├── report_audit.py               ← 보고서 데이터 검증
│   └── ...
│
└── data/                             ← 관심 종목·재무 데이터
    ├── watchlist.json
    └── fundamentals.json
```

### 실제 사용 예시 — Apple 분석 시 생성되는 파일들

```
/investment-team Apple 실행 후:
reports/Apple/
├── README.md
├── 01-BusinessModel-DYP-Perspective.md
├── 02-FinancialValuation-Buffett-Perspective.md
├── 03-IndustryCompetition-Munger-Perspective.md
├── 04-RiskManagement-LiLu-Perspective.md
└── FinalReport.md

/thesis-tracker Apple 실행 후:
reports/Apple/Apple-thesis.md

/earnings-review Apple 2025Q4 실행 후:
reports/Apple/Apple-earnings-2025Q4.md

/management-deep-dive Tim Cook Apple 실행 후:
reports/Apple/Apple-management-20260627.md
```

---

## 5. Tools 사용법

### financial_rigor.py — 정밀 재무 계산

LLM 암산 오류를 방지하기 위해 Python Decimal 정밀 연산을 사용한다.

**시가총액 검증**:
```bash
python3 tools/financial_rigor.py verify-market-cap \
  --price 189.30 --shares 15.4e9 --reported 2.915e12 --currency USD
```

**밸류에이션 지표 검산** (PER, PBR, FCF Yield 등):
```bash
python3 tools/financial_rigor.py verify-valuation \
  --price 189.30 --eps 6.57 --bvps 3.77 --fcf-per-share 7.12 --dividend 1.00
```

**다중 소스 교차 검증**:
```bash
python3 tools/financial_rigor.py cross-validate \
  --field revenue --values '{"macrotrends": 391035, "stockanalysis": 391035}' --unit M
```

**3시나리오 밸류에이션** (낙관/중립/비관):
```bash
python3 tools/financial_rigor.py three-scenario \
  --price 189.30 --eps 6.57 --shares 15.4 \
  --growth 0.12 0.08 0.03 \
  --pe 28 24 18 --years 3 --currency USD
```

---

### report_audit.py — 보고서 데이터 검증

보고서 저장 후 발행 전에 15% 무작위 샘플링으로 데이터 정확도를 검증한다.

```bash
# Step 1: 검증 목록 추출
python3 tools/report_audit.py extract \
  --report reports/Apple/Apple-research-20260627.md

# Step 2: 추출된 각 항목을 macrotrends, stockanalysis, SEC에서 직접 확인 후 JSON 채우기

# Step 3: 판정
python3 tools/report_audit.py verdict \
  --results '<완성된 JSON>' \
  --report Apple-research-20260627.md
# → [게시 가능] 또는 [반려]
```

---

## 6. Skill 전체 목록 요약

| 카테고리 | Skill | 입력 예시 | 생성 파일 |
|---------|-------|---------|---------|
| **스크리닝** | `/quality-screen` | `Apple, MSFT, GOOGL` | 없음 |
| **스크리닝** | `/industry-research` | `AI Semiconductors` | `{섹터}-industry-{날짜}.md` |
| **스크리닝** | `/industry-funnel` | `S&P500 Fintech` | `{섹터}-funnel-{날짜}.md` |
| **분석** | `/investment-checklist` | `AAPL, MSFT, GOOGL` | `{회사}/checklist-{날짜}.md` |
| **분석** | `/investment-research` | `Apple` | `{회사}/{회사}-research-{날짜}.md` |
| **분석** | `/investment-team` | `NVIDIA` | `{회사}/` 폴더 5개 파일 |
| **분석** | `/management-deep-dive` | `Tim Cook Apple` | `{회사}/{회사}-management-{날짜}.md` |
| **분석** | `/private-company-research` | `SpaceX` | `{회사}/` 폴더 |
| **분석** | `/deep-company-series` | `Apple` | `{회사}/` 폴더 8편 |
| **실적** | `/earnings-review` | `Apple 2025Q4` | `{회사}/{회사}-earnings-{기간}.md` |
| **실적** | `/earnings-team` | `Microsoft FY2025` | `{회사}/earnings-{기간}/` |
| **모니터링** | `/news-pulse` | `NVIDIA` | 없음 |
| **모니터링** | `/thesis-tracker` | `Apple` | `{회사}/{회사}-thesis.md` |
| **포트폴리오** | `/portfolio-review` | `AAPL 30%, MSFT 20%` | `portfolio-latest.md` |
| **생각 도구** | `/dyp-ask` | `Apple의 진짜 MOAT는?` | 없음 |
| **생각 도구** | `/financial-data` | (참조용) | 없음 |
