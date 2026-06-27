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

모든 보고서는 **회사명**으로 폴더를 만들고 관련 보고서를 그 안에 저장:

```
reports/
├── Apple/
│   ├── Apple-research-20260627.md
│   ├── Apple-earnings-2025Q4.md
│   └── Apple-thesis.md
├── NVIDIA/
│   ├── NVIDIA-research-20260627.md
│   └── NVIDIA-checklist-20260627.md
├── AI-Semiconductors-industry-20260627.md   — 섹터 보고서 (루트)
├── SP500-funnel-20260627.md                 — 스크리닝 보고서 (루트)
└── portfolio-latest.md                      — 포트폴리오 보고서 (루트)
```

## 보고서 파일명 규칙

| Skill | 파일명 형식 | 예시 |
|-------|-----------|------|
| /investment-team | `{회사명}/` 폴더 내 4개 분석 + 최종보고서 | `reports/Apple/` |
| /investment-research | `{회사명}-research-{YYYYMMDD}.md` | `reports/Apple/Apple-research-20260627.md` |
| /investment-checklist | `{회사명}-checklist-{YYYYMMDD}.md` | `reports/NVIDIA/NVIDIA-checklist-20260627.md` |
| /industry-research | `{섹터명}-industry-{YYYYMMDD}.md` (루트) | `reports/AI-Semiconductors-industry-20260627.md` |
| /industry-funnel | `{섹터명}-funnel-{YYYYMMDD}.md` (루트) | `reports/SP500-Fintech-funnel-20260627.md` |
| /earnings-review | `{회사명}-earnings-{기간}.md` | `reports/Apple/Apple-earnings-2025Q4.md` |
| /thesis-tracker | `{회사명}-thesis.md` (장기 유지) | `reports/Apple/Apple-thesis.md` |
| /portfolio-review | `portfolio-latest.md` (루트, 지속 업데이트) | `reports/portfolio-latest.md` |
| /management-deep-dive | `{회사명}-management-{YYYYMMDD}.md` | `reports/Apple/Apple-management-20260627.md` |

## /investment-team 파일 구조

```
reports/{회사명}/
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

## GitHub 운영

- 로컬 클론 경로: `~/Desktop/reality-escape-device/`
- 원격 저장소: `https://github.com/uwol-is-june/reality-escape-device.git`
- 푸시 전 반드시 `git pull --rebase origin main`
- 커밋 메시지: 영어 또는 한국어, 변경 내용 명확히 기술
- 중간 과정 파일 푸시 금지, 최종 보고서만 푸시

## 자주 쓰는 명령어

```bash
# Skills 설치 (최초 1회)
mkdir -p ~/.claude/commands
cp ~/Desktop/reality-escape-device/skills/*.md ~/.claude/commands/

# 보고서 GitHub에 푸시
cd ~/Desktop/reality-escape-device
git add reports/xxx.md
git commit -m "Add Apple investment research report"
git pull --rebase origin main
git push origin main
```

## 주의사항

- 시가총액 반드시 수동 검산: 주가 × 발행주식수, 보고서 수치와 비교
- 통화 단위 USD로 명확히 표기
- PER/ROE 등 지표 계산은 tools/financial_rigor.py 사용
- 보고서 작성 후 GitHub 푸시 여부 확인
