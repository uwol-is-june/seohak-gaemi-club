# Backlog

> 지금 당장 처리하지 않고 보류한 항목을 정리하는 곳. `docs/function.md`(미해결 위험)와는 별개로, "언젠가 할 만한 개선"을 기록한다.

---

## [T2] `report_audit.py` Step 2 부분 자동화

**현황**: `extract`로 뽑은 검증 목록의 각 항목(샘플 15%)을 macrotrends.net / stockanalysis.com / SEC에서 사람이 직접 조회해 JSON에 채워야 한다. 보고서 1개당 15~30분 소요, 완전 수동.

**영향도**: 낮음~중간. `/investment-team` 작성 단계에서 이미 핵심 재무 데이터를 두 개 독립 출처(macrotrends + stockanalysis)로 교차검증하고 오차 1% 초과 시 표기하도록 지침이 들어가 있다 (`skills/investment-team.md`). report_audit.py Step 2는 그 위에 얹는 사후 2차 검증(15% 무작위 재확인)일 뿐 유일한 방어선이 아니다. 다만 두 출처가 같은 오류를 공유하거나 연도/단위를 착각하는 경우는 1차 방어선을 통과하므로, 실거래 의사결정에 쓰는 보고서라면 핵심 수치(매출/EPS/FCF 등) 정도는 한 번 더 확인할 가치가 있다.

**자동화 방향 검토**:
- SEC 표준 재무 항목(매출, 순이익, EPS, 총자산 등) → SEC의 공식 구조화 API `data.sec.gov/api/xbrl/companyfacts/CIK##########.json` (XBRL)로 조회 가능. 무료, 공식, 봇 차단 위험 없음 — 자동화 난이도 낮음.
- macrotrends/stockanalysis의 가공 수치(FCF, 멀티이어 트렌드 등) → 공식 API 없음. HTML 스크래핑이 필요한데, 이는 이 프로젝트가 다른 도구(`stock_screener.py`, `morningstar_fair_value.py` 등)에서 이미 🔴로 분류해온 "비공식 엔드포인트/봇 차단" 리스크를 다시 끌고 들어오는 것 — 자동화 난이도/위험 높음.
- `report_audit.py extract`는 현재 어떤 항목을 어느 소스로 검증해야 하는지 매핑 정보가 없음 — 자동화하려면 이 매핑 로직부터 새로 만들어야 함.

**결정**: 우선순위 낮음으로 보류 (2026-06-27). 추후 필요해지면 SEC XBRL로 처리 가능한 항목만 우선 자동화하는 절충안부터 검토.
