# 투자 리서치 팀: 4역할 병렬 분석 프레임워크

$ARGUMENTS 에 대해 팀 기반 투자 리서치 분석을 수행합니다. Team 도구를 사용해 실제 멀티 Agent 병렬 리서치 팀을 구성합니다.

## 실행 절차

### 1단계: 팀 구조 제시

아래 팀 구조를 사용자에게 보여주고 확인 후 시작합니다:

| 역할 | 담당 업무 | 분석 프레임워크 |
|------|----------|----------------|
| **team-lead** (본인) | 총괄 조율, 보고서 통합, 최종 보고서 출력 | 4대 거장 종합 프레임워크 |
| **business-analyst** | 비즈니스 모델 & MOAT 분석 | 단융핑(Duan Yongping) 시각 |
| **financial-analyst** | 재무제표 & 밸류에이션 분석 | 워런 버핏(Warren Buffett) 시각 |
| **industry-researcher** | 산업 구도 & 경쟁 구도 분석 | 찰리 멍거(Charlie Munger) 시각 |
| **risk-assessor** | 리스크 평가 & 경영진 판단 | 리루(Li Lu) 시각 |

### 1.5단계: AI 리서치 편향 평가

팀을 구성하기 전에, 해당 기업의 "AI 리서치 가능성" 평가를 사용자에게 먼저 보여줍니다:

**정보 풍부도 등급** (리서치 전략 결정):
| 등급 | 특징 | 리서치 전략 조정 |
|------|------|----------------|
| A등급 (정보 충분) | 상장 다년, 애널리스트 커버리지 풍부 | 각 Agent는 **반론 검증**과 **비컨센서스 시각** 발굴에 집중. 시장 컨센서스와 동일한 "정확하지만 무의미한" 결론 회피 |
| B등급 (정보 보통) | 상장 기간 짧음, 커버리지 제한적 | 각 Agent의 추정 데이터에 신뢰도를 반드시 표기. team-lead는 통합 시 "데이터 충분도"를 명시 |
| C등급 (정보 희소) | 비주류/신규 상장/틈새 기업 | 팀 전체가 "퍼스트 프린시플 모드"로 전환: 보고서 완성도보다 비즈니스 본질의 핵심 질문 몇 가지에 집중 |

**핵심 경고**: 자료가 많다고 확실성이 높은 것이 아니고, 자료가 적다고 확실성이 낮은 것도 아닙니다. AI가 출력할 수 있는 신뢰도 ≠ 투자의 실제 확실성. 확실성은 비즈니스 모델 자체에서 나오지, 자료의 양에서 나오지 않습니다.

각 Agent에게 등급 결과를 공유하여 리서치 방식에 반영하도록 합니다.

### 2단계: 팀 생성

TeamCreate를 사용해 팀을 생성합니다:
- team_name: `{기업명}-research` (영문 소문자, 예: `apple-research`)
- agent_type: `team-lead`

**TeamCreate 실패 시**: 이 도구는 Claude Agent SDK 전용이라 일반 대화 모드(API 단독 호출 등)에서는 호출 자체가 실패한다. 실패하면 즉시 사용자에게 "Claude Code CLI 환경에서 실행 중인지" 확인을 요청하고, 대체 실행 경로 없이 중단한다.

### 3단계: 4개 태스크 생성

TaskCreate를 사용해 아래 4개 태스크를 생성합니다 (각각 subject, description, activeForm 포함):

#### 태스크 1: 비즈니스 모델 분석
- subject: `{기업명}의 비즈니스 모델, MOAT, 고객 가치 분석`
- description 포함 내용:
  1. 비즈니스 모델 본질: 핵심 사업 정의, 매출 구조 분해
  2. 플라이휠 효과(flywheel effect)가 어떻게 작동하는지
  3. MOAT 분석: 브랜드/전환 비용/네트워크 효과/규모의 경제/기술 장벽을 각각 검증
  4. 고객/파트너 가치: 각 이해관계자에게 어떤 독자적 가치를 제공하는지
  5. 사업 포트폴리오와 시너지 효과
  6. 단융핑의 "좋은 사업" 기준 평가: 차별화, 가격 결정력(pricing power), 지속 가능한 경쟁 우위
  7. 최신 IR 자료, 10-K, 산업 리포트 등 공개 정보를 반드시 검색할 것
  8. 데이터 출처: macrotrends.net, stockanalysis.com, SEC EDGAR (10-K/10-Q), finance.yahoo.com, seekingalpha.com

#### 태스크 2: 재무 & 밸류에이션 분석
- subject: `{기업명}의 재무 데이터, 수익성, 밸류에이션 분석`
- description 포함 내용:
  1. 최근 3~5년 매출(Revenue), 순이익(Net Income), 영업이익(Operating Income) 추이
  2. 수익성 지표: ROE, ROA, 매출총이익률(Gross Margin), 영업이익률(Operating Margin)
  3. 현금흐름 분석: 영업현금흐름(Operating Cash Flow), FCF(Free Cash Flow), CAPEX
  4. 재무건전성: 현금 보유량, 부채비율(Debt/Equity), 유동성(Current Ratio)
  5. 밸류에이션: PER(P/E), P/S, P/B, EV/EBITDA 등 — 과거 평균 및 동종 기업 대비
  6. 안전마진(Margin of Safety) 평가: 내재가치(Intrinsic Value) vs 현재 주가
  7. **금융 정확성 검증 (반드시 Bash로 도구 실행, 암산 금지)**:
     - 시가총액 검증: `python3 ~/Desktop/reality-escape-device/tools/financial_rigor.py verify-market-cap --price {주가} --shares {발행주식수} --reported {보고된 시가총액} --currency USD`
     - 밸류에이션 검증: `python3 ~/Desktop/reality-escape-device/tools/financial_rigor.py verify-valuation --price {주가} --eps {EPS} --bvps {BPS}`
     - 핵심 데이터 교차검증: `python3 ~/Desktop/reality-escape-device/tools/financial_rigor.py cross-validate --field {항목} --values '{JSON}' --unit {단위}`
     - 3시나리오 밸류에이션: `python3 ~/Desktop/reality-escape-device/tools/financial_rigor.py three-scenario --price {주가} --eps {EPS} --shares {발행주식수(B)} --growth {낙관} {중립} {비관} --pe {낙관PER} {중립PER} {비관PER}`
     - 도구 출력 결과를 보고서에 그대로 삽입하여 검증 기록으로 남길 것
  8. 데이터 출처: macrotrends.net/stocks/charts/{TICKER}, stockanalysis.com/stocks/{ticker}/financials, SEC EDGAR 10-K/10-Q

#### 태스크 3: 산업 & 경쟁 분석
- subject: `{산업명} 산업 구도 및 {기업명}의 경쟁 포지션 분석`
- description 포함 내용:
  1. 산업 규모 & 성장: TAM(Total Addressable Market), 성장률, 침투율
  2. 경쟁 구도: 주요 경쟁사 시장점유율, 경쟁 전략 비교
  3. 핵심 경쟁사 위협 평가: 주요 경쟁사별 개별 분석
  4. 세부 시장 세그먼트별 구도
  5. 산업 트렌드: 기술 변화, 규제 영향, 신규 진입자(disruptors)
  6. 밸류체인 분석: 업스트림/미드스트림/다운스트림 가치 배분
  7. 최신 산업 데이터 및 경쟁 동향 반드시 검색할 것
  8. 데이터 출처: finviz.com/screener, wsj.com, seekingalpha.com, finance.yahoo.com, SEC EDGAR 8-K

#### 태스크 4: 리스크 & 경영진 평가
- subject: `{기업명}의 투자 리스크 및 경영진 자질 평가`
- description 포함 내용:
  1. 경영진 평가: CEO 역량 범위(circle of competence), 신뢰성, 전략적 비전, 자본 배분 능력, 과거 의사결정 품질
  2. 규제 리스크: 현재 및 잠재적 규제 리스크 (SEC, FTC, DOJ 등 미국 규제기관 포함)
  3. 경쟁 리스크: 각 경쟁사의 위협 수준 평가
  4. 사업 리스크: 신사업 적자, 확장 불확실성, 기술 파괴 리스크
  5. 거시경제 리스크: 경기 사이클, 금리 환경, 인플레이션 영향
  6. 지배구조(Corporate Governance): 주주 구조, 이해충돌 여부, 주주환원 정책(배당/자사주 매입)
  7. 장기 확실성: 10년 후 이 기업은 어떤 모습일까? 무엇이 비즈니스 모델을 무너뜨릴 수 있는가?
  8. 최신 규제 동향, 경영진 발언(earnings call 등) 반드시 검색할 것
  9. 데이터 출처: SEC EDGAR (8-K, proxy statement), finance.yahoo.com, wsj.com, seekingalpha.com

### 4단계: 4개 Agent 동시 실행

4개 Agent를 시작하기 직전에 `date`를 실행해 리서치 시작 시각을 기록합니다 (경과 시간 계산의 기준점).

Task 도구를 사용해 4개 Agent를 동시에 시작합니다 (**반드시 같은 메시지에서 병렬 호출**):

각 Agent 설정:
- `subagent_type`: `general-purpose`
- `run_in_background`: `true`
- `team_name`: 해당 팀 이름
- `name`: 해당 역할명 (business-analyst / financial-analyst / industry-researcher / risk-assessor)

각 Agent의 프롬프트 템플릿:

```
당신은 {기업명} 투자 리서치 팀의 "{역할명}"으로, {거장 이름}의 투자 시각에서 {기업명}을 분석합니다.

태스크 #{번호}를 완수해 주세요: {태스크 subject}

세부 요구사항:
{태스크 description 내용}

**리서치 방법**:
- WebSearch를 사용해 최신 공개 정보를 검색합니다 (10-K, 10-Q, 8-K, IR 자료, 산업 리포트, 뉴스)
- **재무 데이터는 반드시 두 개의 독립 출처**에서 확인합니다:
  - 1차 출처: macrotrends.net/stocks/charts/{TICKER}
  - 2차 출처: stockanalysis.com/stocks/{ticker}/financials
  - SEC 공시: sec.gov/cgi-bin/browse-edgar (10-K, 10-Q, 8-K)
  - 두 출처 간 오차가 1% 초과 시 반드시 표기
- 데이터 정확성 확보: 핵심 데이터에 출처를 명기
- 표면적 분석에 그치지 말고 심층 분석을 수행합니다

**출력 요구사항**:
- 보고서는 상세하게 작성하며, 핵심 데이터는 Markdown 표로 표현합니다
- 각 분석 차원마다 명확한 결론과 ★ 평점(1~5)을 부여합니다
- 보고서 말미에 해당 차원의 종합 결론을 작성합니다

**완료 후**:
1. 완성된 분석 보고서를 아래 경로에 파일로 저장합니다:
   - business-analyst  → `reports/{기업명}/01-BusinessModel-DYP-Perspective.md`
   - financial-analyst → `reports/{기업명}/02-FinancialValuation-Buffett-Perspective.md`
   - industry-researcher → `reports/{기업명}/03-IndustryCompetition-Munger-Perspective.md`
   - risk-assessor     → `reports/{기업명}/04-RiskManagement-LiLu-Perspective.md`
   (회사 폴더가 없으면 먼저 생성)
2. TaskUpdate로 태스크 #{번호}를 completed로 표시합니다
3. SendMessage로 완성된 분석 보고서 전체를 team-lead에게 전송합니다 (type: "message", recipient: "team-lead")
```

### 5단계: 보고서 수신 및 진행 상황 추적

- 사용자에게 실시간으로 진행 상황 표를 보여줍니다 (완료된 Agent, 아직 분석 중인 Agent)
- 보고서를 받을 때마다, 또는 사용자와 상호작용이 발생할 때마다 `date`를 다시 실행해 4단계 시작 시각과 비교한 **경과 시간(분)**을 계산하고 진행 상황 표에 함께 표시합니다 (예: "경과 8분 / 완료 3, 대기 1")
- 4개의 보고서가 모두 도착할 때까지 대기합니다

**부분 실패 가드**: 경과 시간이 10분을 넘었는데 특정 Agent로부터 SendMessage가 도착하지 않았다면(무응답·에러 추정), 대기를 멈추고 사용자에게 "{역할명} Agent 무응답 (경과 N분)" 상태를 알린 뒤 다음 중 하나를 선택하도록 묻습니다:
1. **재시도** — 해당 Agent만 TaskCreate로 다시 시작
2. **제외하고 진행** — 해당 관점 없이 나머지 보고서로 7단계 통합 진행 (FinalReport.md에 "⚠️ {역할명} 관점 누락 (Agent 무응답)" 명시, 종합 평점에서 해당 차원은 "데이터 부족"으로 표기)
3. **전체 중단**

### 6단계: 팀원 종료

모든 보고서를 수신한 후, 4개 Agent에게 shutdown_request를 전송합니다 (SendMessage 사용, type: "shutdown_request").

### 7단계: 최종 보고서 통합

4개의 분석 보고서를 통합하여 아래 구조의 최종 보고서를 출력합니다:

---

#### 1. 한 문장 결론
> 투자 가치 여부와 핵심 논리를 2~4문장으로 요약

#### 2. 4차원 평점 총괄표
| 차원 | 프레임워크 | 평점(★1-5) | 핵심 판단 |
|------|-----------|-----------|---------|

종합 평점: X / 5

#### 3. 핵심 데이터 요약
주요 재무 및 운영 지표 표 (최근 2년 비교)

#### 4. 차원별 분석 요약
각 차원에서 가장 중요한 발견 3~5가지

#### 5. 투자 논지 (Bull vs Bear)
- 매수 논리 — Bull Case (5~7가지)
- 매도/회피 논리 — Bear Case (5~7가지)

#### 6. 버핏 매수 전 Checklist
| # | 체크 항목 | 통과? | 설명 |
핵심 체크 항목 10가지를 각각 평가

#### 7. 최종 투자 의견
- 정성 판단표 (사업 품질 / 경영진 / 밸류에이션 / 타이밍)
- 투자 성향별 운용 제안표 (공격형 / 안정형 / 보수형 → 제안 + 목표 주가 구간)
- 핵심 트리거 (매수 추가 신호 3~5가지 / 매도 신호 3~5가지)

#### 8. 결론 단락
최종 종합 결론 (200~300자 내외)

---

### 8단계: 보고서 저장

완성된 최종 보고서를 `reports/{기업명}/FinalReport.md` 에 저장합니다.

추가로 `reports/{기업명}/README.md` 를 생성합니다. 포함 내용:
- 리서치 수행 날짜
- 4개 서브 보고서 링크 (01-04.md)
- 4차원 평점 총괄표 (한 눈에 핵심 확인용)
- 최종 결론 1~2문장

이로써 `reports/{기업명}/` 폴더 구조가 완성됩니다:
```
reports/{기업명}/
├── README.md                                  ← 개요 + 핵심 결론
├── 01-BusinessModel-DYP-Perspective.md        ← business-analyst 저장
├── 02-FinancialValuation-Buffett-Perspective.md ← financial-analyst 저장
├── 03-IndustryCompetition-Munger-Perspective.md ← industry-researcher 저장
├── 04-RiskManagement-LiLu-Perspective.md     ← risk-assessor 저장
└── FinalReport.md                             ← team-lead 최종 통합 보고서
```

### 9단계: 데이터 검수 (준출 프로세스)

```bash
# Step 1 — 검수 목록 추출 (15% 무작위 샘플링)
python3 ~/Desktop/reality-escape-device/tools/report_audit.py extract \
  --report <보고서 파일 경로>

# Step 2 — 목록의 각 항목을 신뢰할 수 있는 출처에서 직접 확인
#           (macrotrends.net, stockanalysis.com, SEC EDGAR)

# Step 3 — 준출/반려 판정 출력
python3 ~/Desktop/reality-escape-device/tools/report_audit.py verdict \
  --results '<완성된 JSON>' \
  --report <보고서 파일명>
```

**[준출]** 전체 통과 → 보고서 게시 가능; **[반려]** 불통과 항목 있음 → 수정 후 재심사.

### 10단계: 팀 정리

TeamDelete를 사용해 팀 리소스를 정리합니다.

## 중요 유의사항

1. **4개 Agent는 반드시 병렬 실행** — 같은 메시지에서 Task 도구를 4번 동시에 호출합니다
2. **Agent 보고는 SendMessage로** — 파일 협업이 아니라 메시지 커뮤니케이션입니다
3. **데이터 정확성** — Agent가 WebSearch로 최신 데이터를 검색하도록 요구하고, 핵심 데이터는 교차검증합니다
4. **결론은 명확하게** — 매수/관망/회피 의견과 구체적인 목표 주가 구간 제시를 회피하지 않습니다
5. **모든 분석은 데이터 기반** — 출처를 명기합니다
6. **인내심을 가지고 대기** — 4개 Agent의 리서치에는 몇 분이 소요됩니다. 사용자에게 실시간으로 진행 상황을 업데이트합니다
7. **편향 방지 의식** — team-lead는 통합 시 반드시 점검합니다: 각 Agent의 분석이 정보 충분도에 제한되어 있지 않은지? 시장 컨센서스와 과도하게 일치하지 않는지? 최종 보고서에 "정보 풍부도 등급"과 "AI 리서치 한계 선언"을 반드시 포함합니다
8. **정보 부족 시 정직의 원칙** — 프레임워크를 추측으로 채워 확실성을 위장하기보다, 보고서에 "데이터 불충분"으로 공백을 남기는 것이 낫습니다

## 미러 테스트 (결정 검증)

최종 보고서를 작성하기 전에 아래 질문으로 자기검증을 수행합니다:

- 만약 이 보고서를 반대편(매도측 또는 공매도 측)에서 쓴다면, 어떤 데이터를 강조했을까?
- 내가 내린 결론은 데이터에서 자연스럽게 도출된 것인가, 아니면 미리 결론을 정해두고 데이터를 꿰맞춘 것인가?
- "확실하다"고 표현한 항목들이 실제로 데이터로 뒷받침되는가, 아니면 추측인가?
- 4개 Agent 중 서로 상충하는 의견이 있다면, 그것을 최종 보고서에서 솔직하게 드러냈는가?

## 데이터 신뢰도 표기 (필수)

**각 Agent 프롬프트와 team-lead의 최종 보고서 모두** [data-confidence.md](data-confidence.md) 표준을 적용한다:

- 핵심 수치·판단 옆에 **신뢰도 등급 + 유형 태그**를 단다 — 🟢높음(2+독립출처 교차검증 또는 SEC 원문 직접 확인) / 🟡보통(단일출처·경미편차·해석여지) / 🔴낮음(추정·미확정주장·구데이터) / ⬛데이터부족(공백 유지) + `[사실]`/`[추정]`/`[주장]`/`[의견]`. 특히 리스크 관점은 **공시 확인 사실(🟢)과 공매도·소송 등 미확정 주장(🔴[주장])을 엄격히 분리**한다.
- **출처 독립성 주의**: 회사 IR·보도자료와 집계 사이트는 둘 다 회사 공시 파생이라 상호 독립이 아니다 → 🟢은 SEC 원문 직접 확인 또는 계보가 다른 두 출처를 요구한다.
- 각 서브 보고서(01~04)와 FinalReport 모두 **말미에 기계 판독용 신뢰도 요약 블록**을 포함한다(대시보드가 파싱). team-lead는 FinalReport에서 4개 관점의 수치를 합산한다:

      <!-- confidence-summary
      high: N
      medium: N
      low: N
      gap: N
      verdict: 높음|보통|낮음
      -->

- ⚠️ verdict는 **"데이터 신뢰도"이며 "투자 매력도"가 아니다.** 두 축은 독립이며 자주 어긋난다(예: 데이터는 견고한데 투자 의견은 회피). `[의견]` 태그(★평점·매수회피 판단)는 verdict 계산 분모에서 제외하고, 그 판단을 떠받치는 [사실]/[추정]/[주장]의 신뢰도로 계산한다.
