# GOOGL Q3 2026 — 1차 수집 메모 (팀 리드 1회 수집 · 2026-10-29)

> 4개 Agent 공유 자료. **재수집 금지.** 원문 재무제표는 같은 폴더 `ex99-1.txt`(SEC 8-K Ex-99.1, 10/28 공시 · 🟢).

## 자료 확보 등급: **B**
| 자료 | 상태 |
|---|---|
| 8-K Ex-99.1 (손익·BS·CF·세그먼트·FCF·지역) | ✅ SEC 원문 (`ex99-1.txt`) 🟢 |
| 10-Q Q3'26 | ❌ 미제출(10/29 기준) — 공정가치 레벨·우발부채·관련당사자·RPO 세부·세그먼트 자산 **⬛ (추정 금지)** · "10-Q 발간 후 재검토 필요" |
| 어닝콜 전문 | ❌ 미확보 — Investing.com 트랜스크립트 기사 요약(WebFetch) + Yahoo CFO 발언 요약 🟡. Seeking Alpha 403 |
| 연간 기준선 | `reports/GOOGL/_data.md` (SEC XBRL, 10/28 추출) 🟢 |
| 직전 논제·래더 | `reports/GOOGL/GOOGL-thesis.md`, `reports/GOOGL/FinalReport.md`(10/28, 실적 직전) |

## 주가
- 10/27 종가 $320.58 · 10/28 정규장 종가 **$324.89** (Yahoo chart meta 🟢; Investing.com 은 $322.22로 표기 — 불일치 🟡)
- 시간외: Investing.com −10.42% → **$288.35** · Yahoo 기사 "8% 넘게" · Fortune "11% 넘게, 시총 $280B+ 증발" → **약 −8~11% (🟡, 정규장 미확정)**

## 컨센서스 vs 실적 (Yahoo Finance 기사 10/29 🟡)
| 항목 | 실제 | 예상 |
|---|---|---|
| EPS | $2.12 | $3.01 (Investing $3.02) |
| 매출 | $127.58B | $127.93B (Investing $127.22B — 소스별 상이) |
| 매출 ex-TAC | $111.21B | $111.29B |
| 광고 | $82.01B | $83.5B |
| Cloud | $30.71B | $29.1B |
| Search & other 성장률 | +12% | +15% (Fortune) |
- EPS 미스의 $0.55 는 지분증권 평가손 $8.7B (주로 **SpaceX 미실현 손실**, CFO) — Ex-99.1 각주: 세후 순이익 −$6.7B, EPS −$0.55 🟢. 이를 제외하면 EPS ≈ $2.67 (계산, 컨센서스 대비 여전히 미달 — 컨센서스가 평가익을 넣었는지 ⬛)

## 콜 요지 (Investing.com 트랜스크립트 기사 요약 🟡 — 직접인용 금지, 따옴표 문구는 기사 기재분)
- **Cloud 백로그 $561B** (Q2 $514B). 약 55%가 향후 24개월 내 매출 인식 예상. 대부분 통상 GCP 계약
- **capex**: 2026 가이던스 $195~205B **유지**. 2027 "significantly increase" — 상세는 Q4 콜. (Fortune은 "2027 $300B"로 기술 — 회사 공식 수치인지 미확인 🔴)
- Q3 capex $51.4B: 서버·네트워크 약 65%(내용연수 6년) / 데이터센터 약 35%(7~40년)
- **제3자 컴퓨트**: Q3 말부터 사용 시작, Q4 확대 → **Q4 Cloud 마진 역풍** 예고. Q3 영향은 제한적
- **TPU 시스템 판매**: 계약 → 백로그 → 재고 적재 → 인도 시 현금. CFO "전통적 capex 아님", 2027 "meaningful revenue ramp". Kurian: TPU 재고는 전부 확정 계약 연동, **TPU 마진 미공개**. Cloud 성장률 ex-TPU 질문(Bernstein)에 "very strong"만 — **수치 미공개**
- TPU 고객 언급: Anthropic(직접·Broadcom 경유), Apple, Citadel Securities, Jump Trading, Oracle(첫 외부 데이터센터 구매) 등 · "100개 이상 유의미 고객"
- 비용(CFO, Yahoo 요약): 기타 매출원가 $35.1B +32% — **TPU 시스템 판매 하드웨어 원가**·감가상각·콘텐츠·인프라. R&D +36%(AI 인재 보상·감가상각), S&M +22%(Gemini), G&A −17%(전년 법률비용 기저)
- **Q4 가이던스성 발언**: FX 역풍 Q3보다 약간 확대(Search·YouTube). Search는 2025말 가속 기저로 Q4 약 2pt 압박(Q3 약 3pt). TPU 판매 계속 확대. FCF는 TPU 재고·capex로 압박, ROIC는 자본비용 상회 기대
- Search: 쿼리 성장률 5년 최고. AI Mode 쿼리 길이 3배, **AI Mode 수익화는 전통 검색보다 낮음**(Schindler). Search 감속(Q2 대비) 최대 요인은 FX라고 답변(JPM 질문)
- YouTube 광고 $11.2B **+9%** (컨센서스 대비 미달 추정 🟡). 리빙룸 비중 1/3+. Premium/Music 1.5억+
- API 토큰 분당 ~320억(전분기 대비 +40%) · Gemini 앱 10억 사용자 · Gemini 4 Argon/Carbon
- 자사주 매입 Q3 **$0** (전년 $11.5B). ATM: Q3 Class A 1,200만주($4.3B)+Class C 2,400만주($8.1B) 발행, 잔여 $27.6B. Q3 회사채 순조달 $28.7B
- Fortune: 6월 $84.8B 지분조달(버크셔 $10B 포함)이라 기술 — CF상 YTD 보통주 $42.9B + 우선주 $19.1B = $62.0B와 불일치 🔴 (정의 차이 가능, 10-Q 확인 필요)

## 애널리스트 반응 (🟡)
- Dan Ives: Cloud 성장+마진 확대가 capex 수요 논쟁을 정리
- David Wagner(Aptus): Cloud는 했다, 문제는 나머지(Search AI 잠식 우려)
- Luke Lango: 평가손은 회계 노이즈, 문제는 "어떻게 조달하나"(주주 돈으로 건설)
- Meta Muse 에이전트 1천만 사용자 — 검색 장기 위협 거론(BofA Post)

## 출처
- SEC 8-K 0001652044-26-000080 Ex-99.1 (2026-10-28)
- investing.com/news/transcripts/earnings-call-transcript-alphabet-q3-2026-profit-miss-sparks-10-afterhours-drop-93CH-4981037
- finance.yahoo.com/technology/article/google-to-report-q3-results-...-191624324.html (10/29)
- finance.yahoo.com/video/alphabet-cfo-walks-through-the-companys-q3-results-213801069.html
- fortune.com/2026/10/28/alphabet-google-stock-drops-cloud-revenue-doubles-free-cash-flow-negative
- CNBC 10/28 기사: 403 (검색 요약만: −10%, 2026 capex 유지)
