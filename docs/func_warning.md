# 함수·Skill 해결된 위험 요소 / 완화 조치 기록

> `docs/function.md`에서 분리한, 이미 해결되었거나 완화 조치가 적용된 위험 요소 모음. 미해결 위험은 `function.md` 참조.

---

## 목차

1. [완료된 대응 조치](#1-완료된-대응-조치)
2. [플로우별 완화된 위험 요소](#2-플로우별-완화된-위험-요소)
3. [외부 사이트 접근 제한 — 완화 전체 요약](#3-외부-사이트-접근-제한--완화-전체-요약)

---

## 1. 완료된 대응 조치

### 사이트 접근 차단 사전 점검 도구 추가 ✅

[T3] `tools/site_preflight.py` 신설 — [A1] `/industry-research`, [A2] `/industry-funnel`, [A3] `/quality-screen`, [A5] `/investment-research`, [B1] `/earnings-review`, [S1] `/management-deep-dive` 6개 Skill의 실행 0단계에 사전 접근 점검을 삽입. macrotrends, Seeking Alpha, WSJ, finviz, Glassdoor, LinkedIn 등 차단 가능 사이트를 HTTP 상태 코드로 사전 확인하고, 차단 시 대체 소스를 즉시 안내한다.

---

## 2. 플로우별 완화된 위험 요소

### [A1] `/industry-research`

| 위험 | 내용 | 상태 |
|------|------|------|
| 사이트 접근 차단 | Seeking Alpha, WSJ는 구독 벽(paywall) 존재 → 일부 기사 접근 제한 가능 | ✅ 완화됨 — `site_preflight.py` 사전 점검 추가, 차단 시 대체 소스 자동 안내 |
| 데이터 최신성 | WebSearch 결과에 최신 데이터가 포함되지 않을 수 있음 | 🔶 부분 완화됨 — 보고서 상단·핵심 수치마다 "데이터 기준일(YYYY-MM)" 표기 의무화 (출력 요건 #10). 후속 Step 2가 이 기준일을 읽어 3개월 초과 시 재검색·갱신 |

### [A2] `/industry-funnel`

| 위험 | 내용 | 상태 |
|------|------|------|
| 사이트 접근 차단 | macrotrends, finviz 등 봇 접근 차단 가능 | ✅ 완화됨 — `site_preflight.py` 사전 점검 추가, 차단 시 대체 소스 자동 안내 |
| 선행 데이터 노후화 | Step 1(`/industry-research`) 보고서의 가치사슬·TAM 데이터를 그대로 재사용 시 오래된 수치를 쓸 위험 | ✅ 완화됨 — ⓪-2 단계에서 선행 보고서 기준일 확인, 3개월 초과 시 자동 재검색·갱신 |

### [A3] `/quality-screen`

| 위험 | 내용 | 상태 |
|------|------|------|
| 사이트 접근 차단 | macrotrends, stockanalysis 봇 차단 가능 | ✅ 완화됨 — `site_preflight.py` 사전 점검 추가 |

### [B1] `/earnings-review`

| 위험 | 내용 | 상태 |
|------|------|------|
| Seeking Alpha 유료 장벽 | 어닝스 콜 녹취록 전문이 유료 구독 필요한 경우 존재 | ✅ 완화됨 — `site_preflight.py` 사전 점검 추가, 차단 시 SEC 8-K 대체 경로 자동 안내 |

### [S1] `/management-deep-dive`

| 위험 | 내용 | 상태 |
|------|------|------|
| Earnings call 트랜스크립트 | Seeking Alpha 유료 장벽 가능 | ✅ 완화됨 — 사전 점검으로 차단 여부 확인 후 대체 소스 안내 |

---

## 3. 외부 사이트 접근 제한 — 완화 전체 요약

| 사이트 | 위험 | 영향 플로우 | 상태 |
|--------|------|------------|------|
| Seeking Alpha | 유료 구독 필요 기사 존재 | 종목 발굴, 실적 점검 | ✅ 완화됨 (대체 소스 자동 안내) |
| WSJ.com | 유료 구독 기사 다수 | 종목 발굴 | ✅ 완화됨 |
| macrotrends.net | 봇 탐지 가능 (상대적으로 안정) | 종목 발굴, 실적 점검 | ✅ 완화됨 |
| SEC EDGAR | 공식 서비스, 안정적 | 전 플로우 | ✅ (원래 위험 낮음) |

> **완화의 한계**: `site_preflight.py`는 차단 자체를 우회하지 않고, HTTP 상태 코드로 차단 여부를 탐지해 대체 소스를 안내하는 수준이다. finviz.com(Elite 전용 필터 제한)과 Glassdoor/LinkedIn(봇 탐지 빈도 높음)은 이 방식으로 완전히 해소되지 않아 `docs/function.md`에 미해결 위험으로 남아있다.

---

> 최종 갱신: 2026-06-27. 향후 새로운 위험이 완화되면 `docs/function.md`에서 이 파일로 옮겨 기록한다.
