# 서학개미클럽 (seohak-gaemi-club) — 프로젝트 지침

> 원본 오픈소스 "AI Berkshire"(xbtlin)의 포크. 저작권 표기는 LICENSE 참조.

## 프로젝트 개요

Claude Code 기반 미국 주식 가치투자 리서치 Skill 모음.
4대가 프레임워크: 버핏(Buffett), 멍거(Munger), 단융핑(Duan Yongping), 리루(Li Lu).
GitHub: uwol-is-june/seohak-gaemi-club

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
> `dashboard/lib/report-meta.ts`의 `COMPANY_ALIAS_GROUPS`에 별칭을 등록해 병합한다.

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
| /earnings-team | `{티커}/{티커}-earnings-{기간}.md` + 서브보고서 6종(`-연구초안`·`-단용평`·`-버핏`·`-멍거`·`-이루`·`-독자검토`) | `reports/AMZN/AMZN-earnings-2026Q2.md` |
| /thesis-tracker | `{티커}/{티커}-thesis.md` (장기 유지) | `reports/AAPL/AAPL-thesis.md` |
| /portfolio-review | `portfolio-latest.md` (루트, 지속 업데이트) | `reports/portfolio-latest.md` |
| /article-cards | **보고서가 아니다** — 카드 데이터는 `tools/cards/{slug}.json`, 산출물은 `assets/cards/{slug}/` (PNG + `caption.md`) | `assets/cards/spcx-20260810/` |

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
| `/earnings-team` (종목 1개·1분기) | **1~3M** (2026-08-07 AMZN 실측: 서브에이전트 6개 합계 **609K** + 본체) |
| `/investment-checklist` (종목 1개) | 2~5M |
| `/quality-screen` · `/thesis-tracker` · `/news-pulse` (종목 1개) | 1~3M |
| `/article-cards` (아티클 1건 → 카드뉴스) | **300K 이하** (변환기 — 웹 조사 없음) |

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

## 보고서 저장소 = 파일시스템 + git (대시보드 소스 오브 트루스)

보고서는 **`reports/` 아래의 .md 파일 그 자체**가 원본이고, 대시보드가 그 파일을 직접 읽는다.
**보고서를 쓰면 그 순간 대시보드에 반영된다** — 발행이라는 별도 단계가 없다.
(2026-08-10 Supabase 폐지. 대시보드는 토스 API가 IP 허용목록을 요구해 구조적으로 로컬 전용이라,
DB가 주는 유일한 이점인 원격 접근이 성립하지 않았다. 이력·백업은 git이 이미 하고 있다.)

- **자동 커밋**: **매 응답 종료 시**(Stop) 훅(`.claude/settings.json`)이 `tools/commit_reports.py`를
  실행한다 — `git status`로 `reports/` 변경 .md를 감지해 로컬 커밋(**push 없음**).
  화면 반영이 목적이 아니라 **이력·백업**이 목적이다(실수로 지워도 `git checkout`으로 복구).
  훅은 어떤 경우에도 세션을 막지 않는다(항상 exit 0).
  > 확인: `git log --oneline -3` 또는 `python3 tools/commit_reports.py --dry-run`(대상 0건).
- **수동 커밋**: `python3 tools/commit_reports.py`
- **파일 유실 복구**: `git checkout -- reports/{경로}` (git이 유일한 백업이다 —
  중요한 산출물은 커밋된 상태로 둔다).
- **파생 메타데이터**: summary(스크리닝 판정)·confidence(신뢰도)·섹터 자동 맵은 전부
  **읽는 시점에 본문에서 파싱**한다(`dashboard/lib/report-meta.ts`, `lib/sector-auto-map.ts`).
  별도 저장이 없어 원본과 어긋날 일이 없다.
- **as-of(신선도) 시각**: 파일의 마지막 git 커밋 시각. 미커밋 파일은 mtime으로 폴백한다.
- **앱 설정**: 섹터 그룹·분야 그룹은 `data/sector-groups.json` · `data/sector-domain-groups.json`
  (대시보드 그룹 편집 UI가 쓴다. git으로 이력·공유가 따라온다).
- **내부 산출물 제외**: `_`로 시작하는 파일·폴더(`_data.md`, `_q2-primary/`)는 보고서가
  아니라 원자료 캐시라 목록에서 자동 제외된다.
- ⚠️ 이 환경에는 `python`이 없다 — 반드시 `python3`을 쓴다.

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
- 파싱은 `dashboard/lib/sector-auto-map.ts` 가 **요청 시점에** 보고서를 스캔해 수행한다 —
  동기화 명령이 없고 마커를 고치면 새로고침만으로 반영된다.
- 🔴 **마커는 파일 머리 12줄 안에서만 인식된다.** 본문에서 마커 규칙을 *설명*할 때는
  백틱으로 감싸도 소용없으니(HTML 주석 형태 자체를 찾는다) 머리말에 두지 않는다.

## 트랙레코드 = 콜 원장 (판단 이력의 소스 오브 트루스)

투자 판단은 **낼 때마다 원장에 박제**해 사후에 Yahoo 실측으로 채점한다. 기록하지 않은 판단은
없던 판단이다(생존편향 방지).

| 대상 | 역할 | 갱신 |
|------|------|------|
| `data/calls.jsonl` | **채점 원본** (append-only·수정 금지). 대시보드 '트랙레코드' 탭이 여기서 읽어 자동 채점 | `python3 tools/record_call.py ...` |
| `reports/track-record.md` | 사람이 읽는 요약 — 보유 포지션 / **관찰 논제(관망)** / 매매 로그 / 청산 | 두 표는 **자동 생성**(`tools/render_track_record.py`) · 매매 로그·서술만 손 편집 |

- 콜을 내는 스킬: `/thesis-tracker`, `/investment-team`, `/investment-checklist`, `/earnings-team`.
  각 스킬 문서의 "트랙레코드 기록(필수)" 절차를 보고서 저장 직후 실행한다.
- 🔴 **`track-record.md` 의 '보유 포지션'·'관찰 논제' 표는 손으로 고치지 않는다**(TASK-172).
  `<!-- auto:positions|watchlist:begin/end -->` 마커 사이를 `record_call.py` 가 기록 직후,
  Stop 훅이 매 응답 끝에 판단 기록부에서 다시 그린다 — 손으로 고친 내용은 덮어써진다.
  보유/관망은 '매매 로그'의 매수·매도 행으로만 정해진다. 확인: `python3 tools/render_track_record.py --check`.
- **종목의 '현재 판단'** = 스킬별 최신 콜 중 종목 최신 판단에서 **7일 안쪽**만(TASK-170).
  그보다 오래된 다른 스킬의 콜은 자동으로 이력으로 내려간다 — 7일 안에서 출처가 갈려야 충돌로 뜬다.
- **콜 종류**: `buy`(매수) · `keep`(보유 중 계속 보유) · `hold`(**관망** — 미보유·진입가 대기) · `avoid`(회피).
  ⚠️ `keep`과 `hold`는 **정반대를 예측**한다(전자는 하락 없음이 적중, 후자는 호라이즌 안에 최저 종가가 밴드 상단 이하로 **터치**하면 적중 — 호라이즌이 끝난 콜은 종료일 종가로 동결).
  실제 보유 여부로만 판단한다.
- `hold`의 목표 밴드는 목표가가 아니라 **진입 대기가**(시점가보다 아래)다.
- `priceAtCall`은 도구가 Yahoo에서 실측해 박제한다 — **모델 기억값 금지**.
- 🔴 **논제 건강도는 `--health {0~10}` 숫자 플래그로 넘긴다** — `--conviction` 자유 텍스트에
  "건강도 N/10"이라고 적는 옛 방식은 폴백일 뿐이다. 별점(확신도)과 건강도(가정·레드라인의
  현재 상태)는 다른 축이므로 **둘 다** 넘기고, 값이 그대로여도 매 콜에 다시 넘긴다.
  (2026-09-23 실측: 일괄 재검토 콜 7건이 별점만 적어 10종목 중 8종목의 건강도 칸이 빈칸이 됐다.
  대시보드는 살아있는 논제에 값이 없으면 지난 콜의 값을 **날짜를 달아** 보여준다.)
- 🔴 **건강도의 근거는 `--health-check "조건 | 충족|미충족|미정"` 으로 조건마다 넘긴다**(TASK-167).
  대시보드가 펼친 논제에 번호를 붙여 "왜 N/10인지"를 보여준다. 빼면 '근거 미기록'이 뜬다.

### 🔴 보유 상태의 기본값은 항상 "미보유 · 관망"

- 논제를 수립하면 **기본은 `hold`(관망)** 이며 `track-record.md`의 '관찰 논제' 표에 자동으로 들어간다.
  주가가 진입 밴드에 왔다는 이유로, 사업이 훌륭하다는 이유로 **보유로 추측하지 않는다.**
- `buy` 콜은 "현재가에 매수 권고"라는 **분석 결론일 뿐 사용자 보유를 뜻하지 않는다** —
  콜만 근거로 '보유 포지션' 표에 올리지 않는다.
- **사용자가 매수를 알렸을 때만** 보유로 전환한다 (예: `GOOGL 매수 $250에 3주`):
  매수가·수량은 **사용자 입력 그대로** 쓰고(추정·역산 금지),
  **매매 로그에 매수 행을 먼저 추가**한 뒤 `buy` 콜을 **새로 append**하되 **기존 `hold` 콜은 지우지 않는다**
  (관망 판단도 채점 대상). 표는 그 순간 '관찰 논제' → '보유 포지션'으로 자동으로 옮겨진다.
  논제 파일의 앵커가는 실제 매수가로 교체한다.

### 🔴 논제를 만들거나 고쳤으면 트랙레코드까지 가야 끝난다 (필수)

**논제 수립·재수립·분기검토는 `track-record.md` 반영까지가 한 작업이다.** 논제 파일만 쓰고
멈추면 미완성이며, 사용자가 따로 요청하지 않아도 **자동으로** 아래를 수행한다:

1. `python3 tools/record_call.py ...` 로 **콜 원장 append** (append-only · 과거 콜 수정·삭제 금지)
   — 표에 보일 값(래더·추격금지·티어·체결확률·건강도·내재가치·사유)은 **전부 플래그로** 넘긴다
2. `track-record.md` 표는 도구가 자동으로 다시 그린다 — 손대지 않는다(서술은 마커 밖에 적어도 된다)

### 🔴 진입 밴드는 "래더"로 쓴다 — 양끝 두 숫자는 실행할 수 없다

`--tranche` 없이 **`$X~$Y` 밴드만 넘기지 않는다.** 관찰 논제 표를 보는 목적은
"얼마부터 순차적으로 살 것인가"를 아는 것이므로 **차수별로 전부 적는다**:

| 반드시 적을 것 | 예 |
|---|---|
| **차수 · 가격 · 비중** | `1차 ≤$185 (25%) · 2차 ≤$165 (35%) · 3차 ≤$148 (40%)` |
| **차수별 AND 조건** | `1차: 10-Q 매출 YoY +8% 이상 · 2차: 가이던스 하향 없음 · 3차: 조건 없음` |
| **추격 금지선** | `>$237 (현재 17.5% 초과 → 전 차수 미활성)` |
| **호라이즌** | `24M` |

> (예시는 가상 종목 `XYZ` 다.) AND 조건은 **회사가 정기 공시하는 지표**로만 건다 — 분기마다
> 확인할 수 없는 조건은 영원히 미충족으로 남아 그 차수를 죽인다(아래 "밴드 상단은 «조건을
> 감시할 수 있는» 최상단 차수" 참조).

- **AND 조건이 붙은 차수는 가격만 닿아도 집행하지 않는다** — 조건 미충족이면 조건 없는
  최하단 차수까지 기다린다. 이 규칙을 표에 명시해야 나중에 가격만 보고 오집행하지 않는다.
- 🔴 **1차 차수는 퀄리티 티어가 정한다**(`skills/quality-tier.md`):
  **T1 컴파운더는 1차를 "스타터"로 둔다** — 현재가 ~ 매수 상한 사이, 비중 10~20%,
  **조건 없음(즉시 집행 가능)**. T2는 매수 상한 이하에서 25~35%, T3는 밴드 하단 위주에
  사이클 확인 조건 필수. 최상급 컴파운더는 가격이 아니라 사업 품질이 방어선이라,
  완벽한 가격을 기다리다 영영 못 사는 쪽의 비용이 더 크다(2026-07-24 ADBE 1주 토우인이
  유일하게 옳았던 패턴).
  단서: **절대 고평가 게이트 통과가 전제**이고(현재가 > 낙관목표 / 25x PER 연환산 <10% /
  하방>상방 중 하나라도 걸리면 스타터 없음), **남은 80~90%는 반드시 아래로 래더를 깐다**
  (1차에 절반 이상을 실으면 스타터가 아니라 그냥 매수다).
- 아직 차수를 나누지 않았거나 추격금지선을 안 정했으면 **⬛로 남기고 "다음 검토 때 산출"이라고
  적는다** — 임의로 지어내지 않는다.
- 🔴 **보유 종목에도 래더를 적는다 — 이름만 '증액 래더'다.** 관망 논제만 래더를 갖고
  보유 포지션은 `증액선 ≤$215` 처럼 **숫자 하나**로 끝내던 관행을 금지한다(2026-09-23).
  그 가격에 **얼마를 · 무슨 조건에서** 사는지가 없으면 주가가 내려와도 주문을 낼 수 없다.
  규격은 관망 래더와 같고, **비중의 분모만 증액 예산(목표 비중 − 현 보유)** 으로 바뀐다.
  `keep` 콜에 `--tranche`·`--no-chase` 를 함께 넘기되 **`--target-low/high` 는 도달 목표가
  그대로 둔다**(래더는 `target.tranches` 에만 들어간다 — 채점 축이 다르다).
- 🔴 **`--tranche` 한 줄은 ①가격이 있는 차수이거나 ②`AND:` 로 시작하는 공통조건이어야 한다.**
  둘 다 아닌 자유 서술은 래더 파서가 아무것도 못 건져 화면에 안 그려진다
  (`dashboard/lib/tranche.test.ts` 가 원장 전수로 막는다).
- 논제 파일(A4.5 진입 래더 · A4.6 증액 래더)과 판단 기록부가 **어긋나면 논제 파일이 진실**이다 — 콜을 다시 기록한다.
- **표 셀 안 줄바꿈은 `<br>`를 쓴다** — 차수를 한 줄에 하나씩 놓으면 훨씬 잘 읽힌다.
  대시보드 렌더러가 `rehype-raw`+`rehype-sanitize`로 이를 지원한다(2026-08-12 적용).
  마크다운에는 표 셀 줄바꿈 문법이 없어 `<br>`가 유일한 방법이다.

> 🔴 **래더는 반드시 `data/calls.jsonl`에 넣는다** — 대시보드와 `track-record.md` 표가 **둘 다 여기서** 만들어진다.
> 플래그를 빼면 **화면과 표 모두 `$148~185` 두 숫자만 뜬다**(2026-08-12 실제 발생).
> `record_call.py` 호출 시 아래 두 플래그를 **항상 함께** 넘긴다:
>
> ```bash
> # 가상 종목 XYZ — 조건은 전부 10-Q/실적발표로 분기마다 확인 가능한 것만 건다
> python3 tools/record_call.py --ticker XYZ --skill thesis-tracker --call hold \
>   --conviction "★★★★☆" --health 7 \
>   --health-check "10-Q 매출 YoY +8% 이상 | 충족" "가이던스 하향 없음 | 미정" \
>   --tier T2 --required-mos 25 \
>   --target-low 148 --target-high 185 --horizon-months 24 \
>   --fill-probability 18 --low-fill-plan catalyst-wait \
>   --tranche "1차 ≤\$185 (25%) — AND 10-Q 매출 YoY +8% 이상" \
>            "2차 ≤\$165 (35%) — AND 가이던스 하향 없음" \
>            "3차 ≤\$148 (40%) — 조건 없음" \
>   --no-chase 237
> ```
>
> `--target-high` 는 1차 가격과 **같은 숫자**다(게이트 4). `--health` 는 값이 그대로여도 매번 넘긴다.
>
> 차수를 아직 안 나눴으면 `--tranche`를 생략한다(빈 값·추정 금지). 화면에는 밴드만 뜬다.

### 🔴 `hold` 밴드에는 체결확률이 필수다 (2026-09-10)

밴드만 적고 **"호라이즌 안에 닿을 확률"을 안 적으면 닿을 리 없는 밴드도 계획처럼 보인다.**
실측 진단: `hold` 14건 중 12건이 밴드 상단조차 시점가보다 10~34% 아래였고, CEG $185 밴드의
과거 베이스레이트 체결확률은 **0%**, AXP $250은 **12%**였다 — 종목 판단이 아니라 마켓타이밍
베팅이었다.

```bash
# ① 베이스레이트로 체결확률 산출 (감으로 쓰지 않는다)
python3 tools/fill_probability.py --ticker CEG --target 185 --horizon-months 24
# ② 그 값을 콜에 실어 기록 — record_call.py 가 누락을 에러로 막는다
```

- **25% 미만이면 밴드가 실행 계획이 아니라 장식이다.** `--low-fill-plan` 으로 대응을 강제한다:
  `starter`(1차를 현재가 근처 소액으로 · T1 컴파운더만) · `catalyst-wait`(포지션 없음·촉매 대기) ·
  `widen-horizon`(호라이즌 연장).
- **요구 안전마진은 종목 종류마다 다르다** — `skills/quality-tier.md` 참조.
  T1 컴파운더 0~15% · T2 우량 안정 15~30% · T3 시클리컬·턴어라운드·저품질 30~40%.
  티어는 **감으로 매기지 말고 `python3 tools/quality_tier.py {티커} --moat {★}` 로 판정**하고
  (5개 축 중 4개를 기계가 확정한다), 콜에 `--tier`/`--required-mos` 를 함께 박제한다.
- 🔴 **체결확률이 낮다고 밴드를 주가에 맞춰 올리지 않는다.** 내재가치는 그대로 두고 진입
  방식을 바꾼다. 밴드를 올리는 건 논제가 아니라 추격이다.

### 🔴 밴드가 멀면 두 병 중 하나다 — 처방이 다르다 (2026-09-23)

관망 종목의 밴드가 주가에서 멀 때 "시장이 비싸다"로 뭉개지 않는다. **원인을 산술로 가른다**
(`skills/quality-tier.md` 2.5단계):

```
실할인 = 1 − (1차 가격 / 내재가치)
```

| 병 | 조건 | 처방 |
|---|---|---|
| ① **중복 차감** | 실할인 > 티어 요구 MOS **상한** | **산술로 즉시 교정** — `1차 = 내재가치 × (1 − 요구MOS상한)`. 재조사 불필요 |
| ② **밸류에이션 괴리** | **현재가 / 내재가치 > 100%** | 산술로 못 고친다 → 🔴 **스킬 재실행 필요로 표기**하고 `/thesis-tracker` 모드 B 재실행 |

- **재산출 강제 트리거는 티어 상대다**: `이탈률 > 원장에 기록된 요구 MOS`
  (없으면 티어 상한 T1 15%·T2 30%·T3 40%). 이탈률은 원장 `target.high` 기준으로 잰다.
  기존 "+20% 고정"은 폐기 — 그 자체가 "전부 똑같이 보수적"이라는 같은 병이었다.
  대시보드가 이 판정을 자동으로 하고 **'갱신 필요 /스킬'** 칩으로 띄운다(`dashboard/lib/thesis-groups.ts` `bandDrift`).
  🔴 **최근 30일 내 재산출한 밴드는 제외**한다 — 재산출 결론이 `catalyst-wait`면 밴드는 여전히
  멀고, 가드가 없으면 방금 끝낸 검토를 즉시 다시 요구한다(`FRESH_BAND_DAYS`).
- 🔴 **`--target-high` 와 래더 1차 가격은 반드시 같은 숫자다** — 다르면 화면(원장 기준)과
  문서(1차 기준)가 같은 종목을 정반대로 표시한다. `record_call.py` 게이트 4가 경고한다.
- 🔴 **밴드 상단은 «조건을 감시할 수 있는» 최상단 차수**여야 한다. 회사가 구조적으로 공시하지
  않는 지표에 걸린 차수는 래더에서 빼고 **「IV 재산정 트리거」로 옮긴다**(2026-09-23 CEG:
  그 차수를 상단으로 쓴 탓에 이탈률이 +42.4%로 잡혔으나 실제는 **+78.0%**였다).
- **기회비용선(고평가 게이트의 거울)**: 관망 3M+ · 체결 0 · 건강도 7+ · **SPY 초과 +15pp**가
  전부 참이면 재산출 강제. 매수 지시가 아니라 **재검산 지시**다.
- 관망 표에는 **`SPY 대비 초과 __pp`를 숫자로** 남긴다. 안 적으면 기다린 비용이 안 보인다.

### ⚠️ 스킬 설치본 동기화

콜 기록 단계는 `skills/`에만 있고 `~/.claude/commands/`가 구버전이면 **실행되지 않는다**
(2026-07-31 실제 누락 발생). 스킬을 수정하면 반드시 재설치한다:

```bash
cp skills/*.md ~/.claude/commands/
rm -f ~/.claude/commands/{financial-data,data-confidence,token-budget,quality-tier}.md
```

> 🔴 **두 번째 줄을 빼지 말 것.** `skills/` 의 이 4개는 실행 스킬이 아니라 **공용 표준 문서**다
> (다른 스킬이 `skills/xxx.md` 경로로 참조한다). 슬래시 커맨드로 설치하면 호출해도 하는 일이
> 없으면서 오발동 대상만 늘린다. 설치 대상은 **실행 스킬 13개**다.

## GitHub 운영 (코드 전용)

- 로컬 클론 경로: **머신마다 다르다** — 문서에 하드코딩하지 않는다(아래 "경로 규칙" 참조)
- 원격 저장소: `https://github.com/uwol-is-june/seohak-gaemi-club.git`
- 푸시 전 반드시 `git pull --rebase origin main`
- 커밋 메시지: 영어 또는 한국어, 변경 내용 명확히 기술
- git push는 **코드(skills/tools/dashboard) 변경용**. 보고서도 git에 커밋되지만 push는 선택.

## 경로 규칙 (필수)

> 🔴 **모든 명령·문서·서브Agent 프롬프트는 저장소 루트 기준 상대경로만 쓴다.**
> 클론 위치는 머신마다 다르다(`~/Desktop/...`, `~/dev/...`, WSL, macOS 등). 절대경로를
> 문서에 박으면 **다른 머신에서 전부 깨진다** — 2026-07-31 `/investment-team` 실행 시
> 실제 발생(스킬 문서의 `~/Desktop/{저장소이름}` 이 하드코딩돼 존재하지 않아 첫 명령 실패,
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
# Skills 설치 / 재설치 (실행 스킬 13개만 — 공용 표준 문서 4종 제외)
mkdir -p ~/.claude/commands
cp skills/*.md ~/.claude/commands/
rm -f ~/.claude/commands/{financial-data,data-confidence,token-budget,quality-tier}.md

# 퀄리티 티어 판정 (SEC XBRL · 5개 축 중 4개를 기계 확정) — 밸류에이션보다 먼저 돌린다
python3 tools/quality_tier.py GOOGL --moat 4

# 진입 밴드 체결확률(과거 낙폭 베이스레이트) 산출 — hold 콜 기록 전 필수
python3 tools/fill_probability.py --ticker CEG --target 185 --horizon-months 24

# track-record.md 보유·관찰 표를 판단 기록부에서 다시 그리기 (record_call·Stop 훅이 자동 실행)
python3 tools/render_track_record.py
python3 tools/render_track_record.py --check   # 어긋나면 종료코드 1

# 변경된 보고서 로컬 커밋 (Stop 훅과 동일 동작 — 표 갱신 + data/calls.jsonl 포함)
python3 tools/commit_reports.py
python3 tools/commit_reports.py --dry-run   # 대상만 확인

# 지운 보고서 복구
git checkout -- reports/AAPL/AAPL-checklist-20260101.md

# 테스트 — 코드(tools/·dashboard/)를 고쳤으면 둘 다 돌린다
python3 tools/run_tests.py          # tools/test_*.py (pytest 불필요)
cd dashboard && npm test            # lib/·components/ 의 *.test.ts (node --test)

# 대시보드 실행 (로컬 전용)
cd dashboard && npm run dev
```

> ⚠️ 토스 API는 **실행 PC의 공인 IP**를 허용목록에 등록해야 응답한다.
> 네트워크나 자리가 바뀌면 IP를 다시 등록해야 잔고 조회가 살아난다.

## 주의사항

- 시가총액 반드시 수동 검산: 주가 × 발행주식수, 보고서 수치와 비교
- 통화 단위 USD로 명확히 표기
- PER/ROE 등 지표 계산은 tools/financial_rigor.py 사용
- 보고서는 파일로 쓰는 즉시 대시보드에 반영된다(발행 단계 없음). 커밋은 Stop 훅이 자동 처리
