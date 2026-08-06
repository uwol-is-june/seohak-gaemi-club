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

## 토큰 예산 (리서치 스킬 공용 표준)

**소비 토큰 ≈ Σ(요청마다의 전체 컨텍스트)** — 도구 호출 1회 = 컨텍스트 전량 재전송이므로
총 비용은 **호출 횟수의 제곱**으로 는다. 상세 규칙은 `skills/token-budget.md`(TB-1~TB-7).

핵심 3가지:
- 🔴 **서브에이전트는 하위 에이전트를 스폰하지 않는다** (TB-1) — 팬아웃은 본체만, 깊이는 1단계.
  이 금지는 **에이전트 프롬프트에 인라인으로** 박아야 한다(에이전트는 스킬 문서를 안 읽는다).
- 🔴 **재시도는 역할당 1회** (TB-2) — 재시도 전에 산출물 파일부터 확인하고,
  2회차도 실패하면 "제외하고 진행". 웨이브 통째 재실행 금지.
- 🔴 **7일 이내 산출물이 있으면 전체 재실행하지 않는다** (TB-7) — 갱신 모드로 묻는다.

| 스킬 | 1회 실행 정상 범위 |
|------|------|
| `/investment-team` | 5~10M |
| `/industry-research` · `/industry-funnel` | 5~12M |
| `/investment-checklist` (종목 1개) | 2~5M |
| `/quality-screen` · `/thesis-tracker` · `/news-pulse` (종목 1개) | 1~3M |

범위를 크게 넘고 있으면 재시도 루프나 손자 에이전트가 도는 것이다 — 멈추고 원인을 본다.
(근거: 2026-07-31 실측. `/investment-team CEG` 1회에 50.4M, 그중 58%가 재시도 폐기분.
같은 스킬이 07-24 ADBE에서는 5.9M이었고 산출물 품질은 사실상 같았다.)

## 데이터 소스 (미국 주식)

| 우선순위 | 소스 | URL | 용도 |
|---------|------|-----|------|
| 1순위 (주) | stockanalysis | stockanalysis.com/stocks/{ticker}/financials | 재무제표·10년 추이 |
| 2순위 (부) | macrotrends | macrotrends.net/stocks/charts/{TICKER} | 교차검증 — ⚠️ **상시 봇 차단**, 열리면 사용 |
| 원문 공시 | SEC EDGAR | sec.gov/cgi-bin/browse-edgar | 10-K, 10-Q, 8-K 원문 |
| 스크리닝 | Finviz | finviz.com/screener | 종목 스크리닝 |
| 뉴스 1순위 | Yahoo Finance | finance.yahoo.com/quote/{TICKER} | 뉴스·실적, 애널리스트 목표주가(`/analyst-insights/`) |
| 뉴스 2순위 | CNBC | cnbc.com/quotes/{TICKER} | 실적 반응·셀사이드 코멘트 |
| 뉴스/분석 | Seeking Alpha · Bloomberg | seekingalpha.com · bloomberg.com | 심층 분석 — ⚠️ **WebSearch 경유만** |

> **🔴 403은 "못 쓴다"가 아니다** — 직접 열기(WebFetch)만 막힌 것이고 WebSearch 색인은 살아 있다.
> `WebSearch(allowed_domains=['해당도메인'])`로 우회하되, 원문 직접 확인이 아니므로
> 신뢰도는 **🟡가 상한**이다(`skills/data-confidence.md`).
>
> ⚠️ **단, 검색 경유는 연도별 시계열 표를 주지 않는다**(메타 설명만 색인됨 — 실측: 10년 ROE
> 질의 4회 재시도에도 값 0건). 기사·리뷰 같은 서술형과 최신 단일값은 나오지만,
> **10년 추이가 필요하면 `tools/fetch_financials.py`(SEC XBRL) 또는 stockanalysis.com 직접 접근**으로 간다.
>
> **사용 금지 (완전 차단)**: WSJ · Reuters · MarketWatch · Barron's — Anthropic 크롤러를
> robots.txt로 차단해 WebFetch·WebSearch 모두 불가(2026-08-06 실측). 이 중 WSJ·MarketWatch·
> Barron's는 동일 Dow Jones 계열이라 계열 내 대체도 불가. 접근성 확인은
> `python3 tools/site_preflight.py <프로파일>`.

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

- **자동 발행**: **매 응답 종료 시**(Stop) 훅(`.claude/settings.json`)이 `tools/publish_changed_reports.py`를
  실행한다 — `git status`로 `reports/` 변경 .md를 감지해 `tools/publish_report.py`로 upsert하고,
  발행 성공한 파일만 로컬 git 커밋(변경 감지/백업용, **push 없음**). 발행 실패 시 커밋하지 않아
  다음 턴에 재시도된다. 훅은 어떤 경우에도 세션을 막지 않는다(항상 exit 0).
  > ⚠️ Stop 훅은 **Claude가 한 응답을 마칠 때마다** 돈다 — 창을 닫을 때가 아니다.
  > 따라서 보고서를 쓴 응답이 끝나는 즉시 발행되며, 사용자가 별도로 할 일은 없다.
  > 발행 여부는 `git log --oneline -3`(발행 커밋 존재) 또는
  > `python3 tools/publish_changed_reports.py --dry-run`(대상 0건)으로 확인한다.
- **수동 발행**: `python3 tools/publish_report.py reports/{티커}/{파일}.md`
  (변경분 일괄: `python3 tools/publish_changed_reports.py`, 대상 확인만: `--dry-run`)
- **로컬 복구(역방향)**: `python3 tools/pull_reports_from_supabase.py`
  Supabase에는 있는데 로컬 파일이 유실됐을 때 되받는다. 기본은 없는 파일만 생성하고,
  내용이 다른 파일은 건드리지 않는다(`--overwrite`로 DB 버전 강제 적용).
- **섹터 자동 배정**: 발행 직후 `tools/sync_sector_map.py` 가 보고서의 섹터 마커를 스캔해
  '티커 → 섹터' 맵을 `app_config('sector_auto_map')` 에 저장한다(아래 "섹터 마커" 참조).
- **일괄 이관(1회)**: `python3 tools/migrate_reports_to_supabase.py`
- ⚠️ 이 환경에는 `python`이 없다 — 반드시 `python3`을 쓴다.
- **자격증명**: `dashboard/.env.local`의 `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`
  (service_role 키 — 서버 전용, 절대 커밋 금지). 스키마는 `dashboard/supabase/schema.sql`.
- summary(스크리닝 판정)·confidence(신뢰도)는 발행 시점에 파싱돼 컬럼으로 저장된다.

## 섹터 마커 (분야·섹터 자동 정리)

대시보드 '종목별 보고서' 탭의 위계는 **분야 → 섹터 → 종목**이다. 이 중 섹터 → 분야는
`dashboard/lib/sector-domains.ts` 가 자동 판정하고, **티커 → 섹터는 보고서의 HTML 주석
마커에서 자동으로 온다** — 그룹 편집 UI를 손댈 필요가 없다.

| 마커 | 넣는 곳 | 형식 |
|------|--------|------|
| 퍼널 최종 선정 | `/industry-funnel` 산출물 H1 다음 줄 | `<!-- funnel sector: Defense \| finalists: NOC, GD, PLTR -->` |
| 종목 섹터 | 종목 보고서(`/investment-team`·`/investment-checklist`·`/quality-screen`·`/thesis-tracker`) H1 다음 줄 | `<!-- meta sector: Defense -->` |

- 섹터명은 **퍼널 보고서 파일명의 섹터 토큰과 정확히 같은 표기**를 쓴다
  (`Defense-funnel-20260730.md` → `Defense`). 표기가 갈리면 대시보드에서 섹터가 둘로 나뉜다.
- 우선순위: 종목 마커 > 퍼널 마커(같은 티어면 최신 날짜). **수동 그룹 편집이 자동보다 항상 우선** —
  자동 맵은 어느 수동 그룹에도 없는 티커의 빈칸만 채운다.
- 수동 실행/확인: `python3 tools/sync_sector_map.py --dry-run` (저장은 `--dry-run` 없이).

## 트랙레코드 = 콜 원장 (판단 이력의 소스 오브 트루스)

투자 판단은 **낼 때마다 원장에 박제**해 사후에 Yahoo 실측으로 채점한다. 기록하지 않은 판단은
없던 판단이다(생존편향 방지).

| 대상 | 역할 | 갱신 |
|------|------|------|
| `data/calls.jsonl` | **채점 원본** (append-only·수정 금지). 대시보드 '트랙레코드' 탭이 여기서 읽어 자동 채점 | `python3 tools/record_call.py ...` |
| `reports/track-record.md` | 사람이 읽는 요약 — 보유 포지션 / **관찰 논제(관망)** / 매매 로그 / 청산 | 직접 편집 |

- 콜을 내는 스킬: `/thesis-tracker`, `/investment-team`, `/investment-checklist`.
  각 스킬 문서의 "트랙레코드 기록(필수)" 절차를 보고서 저장 직후 실행한다.
- **콜 종류**: `buy`(매수) · `keep`(보유 중 계속 보유) · `hold`(**관망** — 미보유·진입가 대기) · `avoid`(회피).
  ⚠️ `keep`과 `hold`는 **정반대를 예측**한다(전자는 하락 없음이 적중, 후자는 진입 밴드로 회귀가 적중).
  실제 보유 여부로만 판단한다.
- `hold`의 목표 밴드는 목표가가 아니라 **진입 대기가**(시점가보다 아래)다.
- `priceAtCall`은 도구가 Yahoo에서 실측해 박제한다 — **모델 기억값 금지**.

### 🔴 보유 상태의 기본값은 항상 "미보유 · 관망"

- 논제를 수립하면 **기본은 `hold`(관망)** 이며 `track-record.md`의 '관찰 논제' 표로 들어간다.
  주가가 진입 밴드에 왔다는 이유로, 사업이 훌륭하다는 이유로 **보유로 추측하지 않는다.**
- `buy` 콜은 "현재가에 매수 권고"라는 **분석 결론일 뿐 사용자 보유를 뜻하지 않는다** —
  콜만 근거로 '보유 포지션' 표에 올리지 않는다.
- **사용자가 매수를 알렸을 때만** 보유로 전환한다 (예: `GOOGL 매수 $250에 3주`):
  매수가·수량은 **사용자 입력 그대로** 쓰고(추정·역산 금지),
  `buy` 콜을 **새로 append**하되 **기존 `hold` 콜은 지우지 않는다**(관망 판단도 채점 대상),
  '관찰 논제' → '보유 포지션' 이동 + 매매 로그 추가 + 논제 파일의 앵커가를 실제 매수가로 교체.

### ⚠️ 스킬 설치본 동기화

콜 기록 단계는 `skills/`에만 있고 `~/.claude/commands/`가 구버전이면 **실행되지 않는다**
(2026-07-31 실제 누락 발생). 스킬을 수정하면 반드시 재설치한다:

```bash
cp skills/*.md ~/.claude/commands/
rm -f ~/.claude/commands/{financial-data,data-confidence,token-budget}.md
```

> 🔴 **두 번째 줄을 빼지 말 것.** `skills/` 의 이 3개는 실행 스킬이 아니라 **공용 표준 문서**다
> (다른 스킬이 `skills/xxx.md` 경로로 참조한다). 슬래시 커맨드로 설치하면 호출해도 하는 일이
> 없으면서 오발동 대상만 늘린다. 설치 대상은 **실행 스킬 14개**다.

## GitHub 운영 (코드 전용)

- 로컬 클론 경로: **머신마다 다르다** — 문서에 하드코딩하지 않는다(아래 "경로 규칙" 참조)
- 원격 저장소: `https://github.com/uwol-is-june/reality-escape-device.git`
- 푸시 전 반드시 `git pull --rebase origin main`
- 커밋 메시지: 영어 또는 한국어, 변경 내용 명확히 기술
- git push는 **코드(skills/tools/dashboard) 변경용**. 보고서는 Supabase로 발행.

## 경로 규칙 (필수)

> 🔴 **모든 명령·문서·서브Agent 프롬프트는 저장소 루트 기준 상대경로만 쓴다.**
> 클론 위치는 머신마다 다르다(`~/Desktop/...`, `~/dev/...`, WSL, macOS 등). 절대경로를
> 문서에 박으면 **다른 머신에서 전부 깨진다** — 2026-07-31 `/investment-team` 실행 시
> 실제 발생(스킬 문서의 `~/Desktop/reality-escape-device` 가 존재하지 않아 첫 명령 실패,
> 그 경로가 4개 서브Agent 프롬프트에 그대로 복사됨).

| 상황 | 쓸 것 | 쓰지 말 것 |
|------|-------|-----------|
| 도구 실행 | `python3 tools/record_call.py ...` | `python3 ~/Desktop/.../tools/record_call.py` |
| 보고서 경로 | `reports/{티커}/FinalReport.md` | 절대경로 |
| 훅·스크립트 내부 | `${CLAUDE_PROJECT_DIR:-.}/tools/...` | 절대경로 |
| 서브Agent 프롬프트 | "작업 디렉토리는 저장소 루트" + 상대경로 | 하드코딩된 절대경로 |

- Claude Code의 작업 디렉토리는 **저장소 루트로 설정돼 있다** — 상대경로가 그대로 동작한다.
- 절대경로가 꼭 필요하면 `git rev-parse --show-toplevel` 로 **런타임에 구한다**.
- 예외는 `~/.claude/commands/` 뿐이다(사용자 홈의 고정 위치라 `~` 사용이 맞다).

## 자주 쓰는 명령어

> 아래 명령은 전부 **저장소 루트에서** 실행한다.

```bash
# Skills 설치 / 재설치 (실행 스킬 14개만 — 공용 표준 문서 3종 제외)
mkdir -p ~/.claude/commands
cp skills/*.md ~/.claude/commands/
rm -f ~/.claude/commands/{financial-data,data-confidence,token-budget}.md

# 보고서 Supabase에 발행 (수동)
python3 tools/publish_report.py reports/AAPL/AAPL-checklist-20260101.md

# 변경된 보고서 일괄 발행 + 로컬 커밋 (Stop 훅과 동일 동작)
python3 tools/publish_changed_reports.py

# Supabase → 로컬 복구 (유실 파일 되받기)
python3 tools/pull_reports_from_supabase.py --dry-run
```

## 주의사항

- 시가총액 반드시 수동 검산: 주가 × 발행주식수, 보고서 수치와 비교
- 통화 단위 USD로 명확히 표기
- PER/ROE 등 지표 계산은 tools/financial_rigor.py 사용
- 보고서 작성 후 Supabase 발행 여부 확인(Stop 훅이 자동 처리 — 실패 시 수동 발행)
