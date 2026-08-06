# 재무 데이터 수집 및 교차 검증 기준

본 기준은 기업 재무 데이터를 다루는 모든 투자 리서치에 적용된다. **핵심 데이터는 반드시 2개 이상의 독립 출처에서 확인하며, 오차 >1%인 경우 반드시 표시한다.**

---

## 0단계: 연간 핵심 재무는 도구로 먼저 뽑는다 (필수 · TASK-39/40)

**웹 페이지를 긁기 전에** 아래를 실행한다. 연간 핵심 재무는 여기서 끝난다.

```bash
python3 tools/fetch_financials.py {티커} --years 10 --cross
```

- 산출: `reports/{티커}/_data.md`(요약표 — **읽는 것은 이것**) + `_data.json`(provenance 감사용)
- 수집 항목: 매출·매출총이익·영업이익·순이익·희석EPS·영업현금흐름·CAPEX·희석주식수·
  총자산·총부채·자기자본·현금성자산·장기부채 + 파생(FCF·마진 3종·ROE·부채비율)
- **SEC EDGAR XBRL 원문을 기계로 직접** 읽는다 → 사람이 HTML을 눈으로 옮겨적을 때 생기는
  전사 오류가 원천 제거된다. 아래 표의 "원본 1차"에 해당하며 **🟢[사실]** 등급이다.
- `--cross` 는 SEC(1차) vs Yahoo Finance(2차)를 자동 대조해 아래 2단계 오차 규칙을 적용한다.

**이 도구가 대체하지 않는 것** (반드시 별도 수집):
분기 데이터, Non-GAAP 지표, 세그먼트·지역별 분해, 유동비율, 주가·밸류에이션 배수,
가이던스, 경쟁사 비교.

**정확도 가드**: ⚠️ 교차검증 미완료 · ❌ 중대 불일치(>5%) · 🔴 신선도 경고가 표시된 항목은
**원문으로 직접 확인한 뒤** 사용한다. ⬛(SEC에 태그 없음)은 **추정으로 채우지 않는다**.
도구 실패 시(외국기업 XBRL 미제출·신규 상장 등) 아래 웹 출처 경로로 그대로 진행한다 —
**토큰 절감은 정확도보다 우선하지 않는다.**

멀티 Agent 스킬은 이 파일을 **팀 생성 전에 1회만** 만들고 모든 Agent가 공유한다.
Agent마다 같은 숫자를 다시 긁으면 토큰 낭비일 뿐 아니라 Agent 간 수치가 어긋나는 원인이다.

---

## 데이터 출처 우선순위

### 미국 주식 (NYSE / NASDAQ — S&P 500 전 종목)

| 우선순위 | 출처 | URL | 접근 방법 |
|----------|------|-----|-----------|
| **0 (연간 핵심 재무)** | **SEC XBRL 추출기** | `tools/fetch_financials.py` → `_data.md` | **가장 먼저 실행 — 아래는 보완용** |
| 1 (주) | **Stock Analysis** | stockanalysis.com/stocks/{ticker}/financials | 무료 직접 접근, 회원가입 불필요 |
| 2 (부) | **Macrotrends** | macrotrends.net/stocks/charts/{TICKER} | ⚠️ **상시 봇 차단(403)** — `site_preflight.py`가 열렸다고 보고할 때만 사용 |
| 원본 1차 | **SEC EDGAR** | sec.gov/cgi-bin/browse-edgar | 10-K / 10-Q / 8-K 원문 |
| 스크리닝 | **Finviz** | finviz.com/screener | 초기 종목 필터링 및 밸류에이션 스냅샷 |
| 뉴스·논평 1 | **Yahoo Finance** | finance.yahoo.com/quote/{TICKER} | 실적, 애널리스트 목표주가·레이팅 변동 (`/analyst-insights/`, `/analysis/`) |
| 뉴스·논평 2 | **CNBC** | cnbc.com/quotes/{TICKER} | 실적 반응, 셀사이드 코멘트 인용 |
| 뉴스·논평 3 | **Seeking Alpha / Bloomberg** | seekingalpha.com / bloomberg.com | 심층 분석 — ⚠️ 직접 접근 차단, **WebSearch 경유만** |

### 🔴 접근 차단 사이트 — "못 쓴다"와 "직접 못 연다"는 다르다

403은 **직접 열기(WebFetch·curl)만 막힌 것**이고 WebSearch 색인은 살아 있다. 2026-08 실측에서
macrotrends·Seeking Alpha·Glassdoor·Bloomberg 모두 검색으로 실제 수치·본문을 확인했다.

| 대응 | 방법 | 신뢰도 상한 |
|------|------|-----------|
| 직접 접근 가능 | WebFetch로 원문 확인 | 🟢 (교차검증 시) |
| 403 (검색은 가능) | `WebSearch(allowed_domains=['해당도메인'])` | **🟡** — 원문 직접 확인이 아니고 색인이 오래됐을 수 있음 |
| 크롤러 차단 | 없음 — 소스에서 제외 | — |

#### 🔴 검색 경유는 **연도별 시계열 표를 주지 않는다** (2026-08-06 실측)

검색이 돌려주는 것은 페이지의 **메타 설명·요약 문장**이지 본문 HTML 표가 아니다. 그래서
데이터 성격에 따라 성패가 갈린다:

| 데이터 성격 | 검색 경유 | 실측 |
|------------|----------|------|
| 서술형 콘텐츠 (기사 논지, 애널리스트 코멘트, 직원 리뷰 평점) | ✅ 충분 | Seeking Alpha·Bloomberg·Glassdoor 모두 성공 |
| 최신값 + 전년비 1~3개 | ✅ 대체로 가능 | "AAPL 2025 매출 $416.161B (+6.43%)" 확보 |
| **연도별 시계열 표** | ❌ **불가** | AAPL 10년 ROE — 질의를 4번 바꿔도 값 0건. COST 5년 GM/OCF — TTM만 |

**따라서 `/quality-screen`의 7개 지표(10년 ROE·5년 FCF·5년 GM 추세 등)를 macrotrends 검색으로
채우려 하지 말 것** — 헛돈다. 시계열은 **0순위 `tools/fetch_financials.py`(SEC XBRL)** 와
**1순위 stockanalysis.com(직접 접근)** 이 담당한다. 검색 경유 macrotrends는 단일 시점 값
확인용 보조일 뿐이다.

> **제거된 출처 (사용 금지)**
> - **WSJ · Reuters · MarketWatch · Barron's** — Anthropic 크롤러를 robots.txt로 차단해
>   **WebFetch도 WebSearch도 통하지 않는다**(2026-08-06 실측). 이 중 WSJ·MarketWatch·
>   Barron's는 같은 Dow Jones/News Corp 계열이라 계열 내 대체도 불가. 대체는
>   **Yahoo Finance(1순위·직접 접근) + CNBC(직접+검색) + Bloomberg/Seeking Alpha(검색 경유)**.
> - aastocks.com, eastmoney.com (동방재부), cninfo.com.cn, xueqiu.com (설구), hkexnews.hk
>   — 미국 주식 리서치에는 해당 없음

---

## 실행 절차

### 1단계: 데이터 수집

각 재무 지표(매출, 순이익, 매출총이익률, 영업현금흐름, 부채비율 등)를 **출처 1 (Stock Analysis)**과 **출처 2 (Macrotrends)**에서 각각 수집한다. Macrotrends가 차단돼 있으면 **SEC EDGAR 원문**을 두 번째 출처로 쓴다(교차검증 자체를 생략하지 않는다).

수집 대상 핵심 지표:

| 지표 | 영문 약어 | 비고 |
|------|-----------|------|
| 매출 | Revenue | GAAP 기준 |
| 영업이익 | Operating Income | GAAP 기준 |
| 순이익 | Net Income | GAAP 기준 |
| 주당순이익 | EPS | Diluted EPS 기준 |
| 매출총이익률 | Gross Margin % | — |
| 영업이익률 | Operating Margin % | — |
| 순이익률 | Net Margin % | — |
| 자기자본이익률 | ROE | — |
| 잉여현금흐름 | FCF | Operating CF − CapEx |
| 총부채 | Total Debt | 단기 + 장기 |
| 자기자본 | Shareholders' Equity | — |
| 주당장부가치 | Book Value per Share | — |

### 2단계: 오차 계산 및 표시

```
오차율 = |출처1 수치 − 출처2 수치| / 출처1 수치 × 100%
```

| 오차 범위 | 처리 방법 |
|-----------|-----------|
| ≤ 1% | ✅ 일치 — 출처1 수치 사용, 두 출처 모두 표기 |
| 1% ~ 5% | ⚠️ "데이터 불일치" 표시 — 두 수치를 병기하고 원인 설명 (환율/회계 기준 차이 등) |
| > 5% | ❌ "중대한 데이터 불일치" 표시 — SEC 원본 재무제표로 반드시 검증, 미검증 수치는 사용 금지 |

### 3단계: 데이터 표기 형식

핵심 데이터는 반드시 다음 형식으로 표기한다:

**일치 사례:**
```
매출: $383.3B ✅
  - Macrotrends: $383.3B
  - Stock Analysis: $383.1B
  - 오차: 0.05%
  - 출처: AAPL FY2023 10-K
```

**불일치 사례:**
```
순이익: $97.0B ⚠️ 데이터 불일치
  - Macrotrends: $97.0B (GAAP)
  - Stock Analysis: $113.7B (Non-GAAP 조정 후)
  - 오차: 17.2% — 원인: GAAP vs Non-GAAP (주식보상비용, 상각 제외 여부)
  - → SEC 10-K 원문 확인 필요
```

---

## 자주 발생하는 불일치 원인

| 원인 | 설명 |
|------|------|
| GAAP vs Non-GAAP | 가장 흔한 원인. 특히 이익 관련 지표에서 빈번. 주식보상(SBC), 상각(D&A), 구조조정 비용 처리 방식 차이 |
| 회계연도 정의 | 자연년도(1~12월) vs 회계연도 (예: Apple FY는 9월 마감, Microsoft FY는 6월 마감) |
| 희석 주식수 | Basic EPS vs Diluted EPS, 스톡옵션·전환사채 포함 여부 |
| 소수지분 처리 | 연결 기준 포함 여부 (비지배지분 포함/제외) |
| 데이터 업데이트 지연 | 실적 발표 직후 일부 플랫폼이 수치를 아직 반영하지 못한 경우 |
| 분기 vs 연간 집계 | TTM (Trailing Twelve Months) 계산 방식 차이 |

---

## 특별 규칙

1. **비상장 기업** (SpaceX, Stripe 등): 단일 출처만 존재하는 경우 수치 앞에 `[추정]` 표기, 교차 검증 생략 가능
2. **분기 데이터 vs 연간 데이터**: 교차 검증은 연간 데이터 기준 우선. 분기 데이터는 일부 플랫폼에서 업데이트 지연이 발생할 수 있음
3. **원본 재무제표 우선**: 두 출처 모두 SEC 원본과 불일치할 경우, SEC 10-K / 10-Q를 최우선 기준으로 삼고 플랫폼 오류로 표기
4. **통화 단위**: USD 단일 기준. 금액 표기는 B (십억 달러 / billion), T (조 달러 / trillion) 사용. CNY / HKD 표기 금지
5. **거래소 표기**: NYSE 또는 NASDAQ 명시. 홍콩증권거래소(HKEX) / 상하이·선전 거래소(A주) 참조 금지

---

## 빠른 참조 색인 — 주요 종목

| 종목 | 티커 | 주요 출처 (직접 접근·🟢) | 보조 (⚠️ 차단·WebSearch 경유·🟡) |
|------|------|-----------|-----------|
| Apple | AAPL | stockanalysis.com/stocks/aapl | macrotrends.net/stocks/charts/AAPL |
| Microsoft | MSFT | stockanalysis.com/stocks/msft | macrotrends.net/stocks/charts/MSFT |
| Alphabet (Google) | GOOGL | stockanalysis.com/stocks/googl | macrotrends.net/stocks/charts/GOOGL |
| Amazon | AMZN | stockanalysis.com/stocks/amzn | macrotrends.net/stocks/charts/AMZN |
| NVIDIA | NVDA | stockanalysis.com/stocks/nvda | macrotrends.net/stocks/charts/NVDA |
| Meta | META | stockanalysis.com/stocks/meta | macrotrends.net/stocks/charts/META |
| Berkshire Hathaway | BRK.B | stockanalysis.com/stocks/brk.b | macrotrends.net/stocks/charts/BRK.B |
| JPMorgan Chase | JPM | stockanalysis.com/stocks/jpm | macrotrends.net/stocks/charts/JPM |
| Visa | V | stockanalysis.com/stocks/v | macrotrends.net/stocks/charts/V |
| Costco | COST | stockanalysis.com/stocks/cost | macrotrends.net/stocks/charts/COST |
| Netflix | NFLX | stockanalysis.com/stocks/nflx | macrotrends.net/stocks/charts/NFLX |
| Tesla | TSLA | stockanalysis.com/stocks/tsla | macrotrends.net/stocks/charts/TSLA |
| UnitedHealth | UNH | stockanalysis.com/stocks/unh | macrotrends.net/stocks/charts/UNH |

---

## SEC EDGAR 활용 가이드

원본 재무제표가 필요한 경우 아래 절차를 따른다:

```
1. sec.gov/cgi-bin/browse-edgar 접속
2. "Company name" 또는 티커 입력 후 검색
3. Filing type 선택:
   - 10-K  → 연간 보고서 (가장 중요)
   - 10-Q  → 분기 보고서
   - 8-K   → 중요 공시 (실적 발표, M&A, 경영진 변경 등)
   - DEF 14A → 주주총회 위임장 (경영진 보수, 주요 안건)
4. 해당 보고서 → "Documents" 탭 → 10-K.htm 또는 10-K.pdf 열기
5. Ctrl+F로 "Revenue", "Net income", "Cash flows from operations" 검색하여 수치 직접 확인
```

---

## tools/financial_rigor.py 연동

교차 검증 후 수집된 수치는 `tools/financial_rigor.py`를 통해 다음 지표를 정밀 계산한다:

- PER (주가수익비율)
- ROE (자기자본이익률)
- FCF Yield (잉여현금흐름 수익률)
- EV/EBITDA
- 부채비율 (Debt-to-Equity)
- 내재가치 (DCF 기반 추정)

> **주의:** 플랫폼 제공 비율 지표(PER, ROE 등)는 계산 기준이 서로 다를 수 있다. 반드시 원본 수치를 수집한 뒤 직접 계산하여 사용한다.

---

## 관련 표준 — 데이터 신뢰도 표기

본 문서는 데이터를 **어떻게 수집·교차검증하는가**를 정의한다. 그 결과 나온 각 주장의 **신뢰도를 어떻게 표기하는가**는 자매 표준 [data-confidence.md](data-confidence.md)를 따른다:

- 주장 단위 등급(🟢높음/🟡보통/🔴낮음/⬛데이터부족) + 유형 태그(`[사실]`/`[추정]`/`[주장]`/`[의견]`)
- 보고서 말미 기계 판독용 요약 블록(`<!-- confidence-summary ... verdict: 높음|보통|낮음 -->`)

본 문서의 교차검증 결과(오차율·출처 수)가 곧 그 등급 판정의 근거다: 오차 ≤1% 2개 출처 또는 SEC 원문 = 🟢, 단일 출처·1~5% 편차 = 🟡, 추정·미검증 = 🔴. 회사 IR·보도자료와 집계 사이트는 상호 독립이 아니므로(둘 다 회사 공시 파생) 이 조합만으로는 🟢을 주지 않는다.
