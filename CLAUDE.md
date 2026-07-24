# AI Berkshire US Edition — 프로젝트 지침

## 프로젝트 개요

Claude Code 기반 미국 주식 가치투자 리서치 Skill 모음.
4대가 프레임워크: 버핏(Buffett), 멍거(Munger), 단융핑(Duan Yongping), 리루(Li Lu).
GitHub: uwol-is-june/reality-escape-device

## 프로젝트 구조

```
skills/          — 투자 리서치 Skill 정의 (.md), ~/.claude/commands/ 에 복사해서 사용
tools/           — 보조 도구 (financial_rigor.py 정밀 계산)
reports/         — 투자 리서치 보고서 출력
assets/          — 이미지 등 정적 자산
data/            — 관심 종목 목록, 재무 데이터
proj_report/     — 프로젝트 자체 분석 문서
```

## 보고서 디렉토리 구조

모든 보고서는 **미국 주식 티커**로 폴더를 만들고 관련 보고서를 그 안에 저장.

> **폴더 명명 규칙 (필수)**: 한 종목의 폴더명은 **미국 상장 티커로 통일**하며 **하나로 고정**한다
> (예: `AAPL`, `NVDA`, `QUBT`, `SPCX`). 티커·영문명(`QuantumComputing`)·한글명(`퀀텀컴퓨팅`)을
> 섞어 쓰면 대시보드 보고서 탭에서 별개 종목으로 분리 표시된다. 폴더 안 파일명 접두사도
> 동일 티커를 사용한다(예: `SPCX/SPCX-checklist-20260723.md`). 기존 폴더가 티커가 아닌
> 이름으로 있으면 티커로 정리하고, 부득이하게 폴더명이 갈린 경우 대시보드
> `dashboard/lib/github.ts`의 `COMPANY_ALIAS_GROUPS`에 별칭을 등록해 병합한다.

```
reports/
├── AAPL/
│   ├── FinalReport.md
│   ├── AAPL-earnings-2025Q4.md
│   └── AAPL-thesis.md
├── NVDA/
│   ├── FinalReport.md
│   └── NVDA-checklist-20260627.md
├── AI-Semiconductors-industry-20260627.md   — 섹터 보고서 (루트)
├── SP500-funnel-20260627.md                 — 스크리닝 보고서 (루트)
└── portfolio-latest.md                      — 포트폴리오 보고서 (루트)
```

## 보고서 파일명 규칙

| Skill | 파일명 형식 | 예시 |
|-------|-----------|------|
| /investment-team | `{티커}/` 폴더 내 README + 4개 서브보고서 + FinalReport | `reports/AAPL/` |
| /investment-checklist | `{티커}/{티커}-checklist-{YYYYMMDD}.md` | `reports/NVDA/NVDA-checklist-20260627.md` |
| /industry-research | `{섹터명}-industry-{YYYYMMDD}.md` (루트) | `reports/AI-Semiconductors-industry-20260627.md` |
| /industry-funnel | `{섹터명}-funnel-{YYYYMMDD}.md` (루트) | `reports/SP500-Fintech-funnel-20260627.md` |
| /earnings-review | `{티커}/{티커}-earnings-{기간}.md` | `reports/AAPL/AAPL-earnings-2025Q4.md` |
| /thesis-tracker | `{티커}/{티커}-thesis.md` (장기 유지) | `reports/AAPL/AAPL-thesis.md` |
| /portfolio-review | `portfolio-latest.md` (루트, 지속 업데이트) | `reports/portfolio-latest.md` |

## /investment-team 파일 구조

```
reports/{티커}/
├── README.md                               — 리서치 프레임워크 개요 + 핵심 결론
├── 01-BusinessModel-DYP-Perspective.md
├── 02-FinancialValuation-Buffett-Perspective.md
├── 03-IndustryCompetition-Munger-Perspective.md
├── 04-RiskManagement-LiLu-Perspective.md
└── FinalReport.md                          — Team Lead 종합 보고서
```

## 투자 분석 핵심 원칙 (최우선)

- **객관성, 객관성, 객관성** — 모든 분석은 사실과 데이터 기반. 주관적 추측 금지
- 사실과 의견을 엄격히 구분: 사실은 데이터로 뒷받침, 의견은 반드시 "추정" 명시
- **입장 선입견 금지**: 강세/약세 전제 없이 데이터 → 논리 → 결론 순서로
- "I think", "obviously" 같은 주관적 표현 대신 "데이터에 따르면", "증거는"으로
- **양면 제시**: 모든 핵심 판단에 반대 근거 첨부 ("하지만 반대로...")
- 불확실한 사항은 솔직하게 "불확실" 또는 "데이터 부족"으로 표기

## 데이터 소스 (미국 주식)

| 우선순위 | 소스 | URL | 용도 |
|---------|------|-----|------|
| 1순위 (주) | macrotrends | macrotrends.net/stocks/charts/{TICKER} | 재무 데이터 10년 추이 |
| 2순위 (부) | stockanalysis | stockanalysis.com/stocks/{ticker}/financials | 재무제표 교차검증 |
| 원문 공시 | SEC EDGAR | sec.gov/cgi-bin/browse-edgar | 10-K, 10-Q, 8-K 원문 |
| 스크리닝 | Finviz | finviz.com/screener | 종목 스크리닝 |
| 뉴스 | Yahoo Finance | finance.yahoo.com | 뉴스·실적 발표 |
| 뉴스/분석 | Seeking Alpha | seekingalpha.com | 심층 분석 기사 |

## 보고서 언어와 스타일

- 보고서 언어: **한국어** (기본), 영어 (선택)
- 스타일: 직접적, 간결, 불필요한 표현 배제
- 데이터는 반드시 출처 명시, 핵심 데이터는 최소 2개 소스 교차 검증
- 추정값은 반드시 "(추정)" 표기
- 평점은 ★ 기호 사용 (★1-5), 반 별점 없음
- 재무 용어는 영어 그대로 사용 가능 (PER, EPS, ROE, FCF, EBITDA 등)
- 버핏/멍거/단융핑/리루 어록 인용으로 포인트 강조

## 보고서 저장소 = Supabase (대시보드 소스 오브 트루스)

보고서는 이제 **Supabase**에 저장되고 대시보드는 거기서 읽는다. GitHub push는 더 이상
보고서 반영 경로가 아니다(코드/스킬 변경에만 git 사용).

- **자동 발행**: 세션 종료(Stop) 훅이 `reports/` 변경 .md를 감지해 `tools/publish_report.py`로
  Supabase에 upsert한다. 발행 후 로컬 git 커밋(변경 감지/백업용, **push 없음**).
- **수동 발행**: `python tools/publish_report.py reports/{티커}/{파일}.md`
- **일괄 이관(1회)**: `python tools/migrate_reports_to_supabase.py`
- **자격증명**: `dashboard/.env.local`의 `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`
  (service_role 키 — 서버 전용, 절대 커밋 금지). 스키마는 `dashboard/supabase/schema.sql`.
- summary(스크리닝 판정)·confidence(신뢰도)는 발행 시점에 파싱돼 컬럼으로 저장된다.

## GitHub 운영 (코드 전용)

- 로컬 클론 경로: `~/Desktop/reality-escape-device/`
- 원격 저장소: `https://github.com/uwol-is-june/reality-escape-device.git`
- 푸시 전 반드시 `git pull --rebase origin main`
- 커밋 메시지: 영어 또는 한국어, 변경 내용 명확히 기술
- git push는 **코드(skills/tools/dashboard) 변경용**. 보고서는 Supabase로 발행.

## 자주 쓰는 명령어

```bash
# Skills 설치 (최초 1회)
mkdir -p ~/.claude/commands
cp ~/Desktop/reality-escape-device/skills/*.md ~/.claude/commands/

# 보고서 Supabase에 발행 (수동)
cd ~/Desktop/reality-escape-device
python tools/publish_report.py reports/AAPL/AAPL-checklist-20260101.md
```

## 주의사항

- 시가총액 반드시 수동 검산: 주가 × 발행주식수, 보고서 수치와 비교
- 통화 단위 USD로 명확히 표기
- PER/ROE 등 지표 계산은 tools/financial_rigor.py 사용
- 보고서 작성 후 Supabase 발행 여부 확인(Stop 훅이 자동 처리 — 실패 시 수동 발행)
