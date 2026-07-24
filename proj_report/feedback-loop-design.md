# 설계: thesis 콜 피드백 루프 (TASK-38)

> **목적**: 과거 매수/보유/회피 콜과 목표가가 실제로 맞았는지를 **외부 실측(주가·실적)**으로
> 채점해 누적한다. 자기신고가 아닌 외부 대조가 핵심 — 시스템이 자기가 체계적으로 틀리는지
> 학습할 수 있게 하는 유일한 장치. (2026-07-23 프로젝트 위험성 분석에서 "가장 큰 구조적 공백"으로 지목.)

## 0. 원칙

1. **외부 실측 대조.** 채점 기준은 모델이 아니라 Yahoo 등 외부 시세/실적. 모델 자기평가 금지.
2. **콜 시점 값은 불변(immutable).** `priceAtCall`·목표가·시점은 콜을 낸 순간 기록하고
   이후 수정하지 않는다. 과거 콜 편집 = 트랙레코드 조작.
3. **정직한 결측.** 채점 불가(상장폐지·티커 변경·데이터 없음)는 `unknown`으로 남긴다.
4. **적중률은 성과가 아니라 규율 지표.** 표본이 작을 때 과대해석하지 않는다(신뢰구간 함께 표기).

## 1. 데이터 모델 — 콜 원장(ledger)

**위치**: `data/calls.jsonl` (git 추적, append-only, 1줄 = 1콜 JSON). 대시보드가 GitHub에서 읽는다.

```jsonc
{
  "id": "AAPL-20260723-checklist",     // {티커}-{YYYYMMDD}-{skill}
  "ticker": "AAPL",
  "date": "2026-07-23",                 // 콜 시점(불변)
  "skill": "investment-checklist",      // 콜을 낸 스킬
  "report": "reports/Apple/Apple-checklist-20260723.md",
  "call": "buy",                        // buy | hold | avoid
  "conviction": "★★★★☆",               // 또는 신뢰도 등급
  "priceAtCall": 214.30,                // 콜 시점 주가(USD, 불변)
  "target": { "low": 260, "high": 300, "horizonMonths": 24 },  // 목표가 밴드(선택)
  "loadBearing": ["광의 해자 지속", "iPhone 교체주기 안정"],   // 핵심 가정(⚑)
  "invalidation": ["ROE < 15% 2분기 연속", "서비스 매출 성장 둔화"]  // redline/무효화 조건
}
```

- 목표가·horizon 없는 콜(예: 단순 회피)은 `target` 생략 → 방향(direction)만 채점.
- `loadBearing`/`invalidation`은 [data-confidence.md](../skills/data-confidence.md)의 ⚑ 핵심 가정,
  [thesis-tracker](../skills/thesis-tracker.md)의 redline과 연결.

## 2. 기록 (Phase 1) — 스킬이 콜을 낼 때 원장에 append

- 대상 스킬: `investment-checklist`(매수 판정), `investment-team`(FinalReport 결론),
  `thesis-tracker`(논제 수립/갱신). 이들이 buy/hold/avoid + 목표가를 낼 때 원장에 1줄 추가.
- 티커는 [정규화 규칙](../dashboard/lib/github.ts)과 동일 형식(대문자, 클래스주 대시)으로 저장.
- `priceAtCall`은 그 시점 시세를 명시적으로 fetch해 박제(모델 기억값 금지).
- **중복 방지**: 같은 `id`가 있으면 새 콜은 append하되 이전 콜을 대체하지 않는다(이력 보존).

## 3. 채점 (Phase 2) — 외부 실측 스코어러

`tools/score_calls.py`(신규) 또는 대시보드 `/api/calls/score` 라우트:

| 항목 | 계산 | 비고 |
|------|------|------|
| 방향 적중 | buy→현재가 > priceAtCall / avoid→하락 / hold→밴드 내 | 경과기간 함께 |
| 목표 도달 | 현재가가 target 밴드 진입? | horizon 경과 여부 표시 |
| 목표 오차 | (현재가 − target중앙) / target중앙 | horizon 도달 콜만 확정 채점 |
| 무효화 발동 | invalidation 조건 트리거 여부 | 데이터로 판정 가능한 것만 |
| 경과/신선도 | 콜 이후 경과일, horizon 대비 진행률 | |

- 시세 소스: 기존 `/api/quotes`(Yahoo) 재사용. 과거 시점 비교가 필요하면 chart range 확장.
- **미확정 처리**: horizon 미도달 콜은 "진행 중"으로, 채점은 잠정(provisional)으로 표시.

## 4. 대시보드 뷰 (Phase 3) — "트랙레코드"

- 사이드바 nav에 **"트랙레코드"** 추가(Daily check 계열).
- 콜 목록 표: 티커 · 콜 · 콜 시점가 · 현재가 · 방향적중 · 목표진행 · 경과 · 상태(진행/적중/빗나감/무효화).
- 상단 집계: 확정 콜 기준 **방향 적중률**, 평균 목표 오차, 표본 수(+작은 표본 경고).
- 디자인: `docs/DESIGN-x.ai.md` 준수(표는 ex-data-table-cell, 화이트-필 pill, 손익 색은 한국식).

## 5. 안티-게이밍 / 한계

- 콜 시점 값 불변 + append-only 원장으로 사후 수정 차단.
- 적중률은 **표본이 커지기 전엔 규율 신호**로만 사용(성과 광고 금지). 신뢰구간 병기.
- 생존편향 방지: 회피(avoid) 콜도 반드시 기록해 "안 산 게 옳았는지"까지 채점.
- look-ahead 방지: 채점은 콜 이후 시계열만 사용(콜 시점 이전 데이터로 소급 정당화 금지).

## 6. 구현 순서

1. **Phase 1(기록)**: 원장 스키마 확정 + 3개 스킬에 append 지침 추가. (스킬 문서 작업, 가벼움)
2. **Phase 2(채점)**: `score_calls.py` — Yahoo 시세로 방향/목표/무효화 채점.
3. **Phase 3(뷰)**: 대시보드 트랙레코드 탭 + `/api/calls` 라우트.

> 본 문서는 **설계**다(TASK-38 범위).

## 7. 구현 노트 (완료)

Phase 1~3 구현 완료. 설계 이후 대시보드 저장소가 Supabase로 이관되어 다음을 조정했다:

- **원장 저장·읽기**: 설계는 "대시보드가 GitHub에서 읽는다"였으나, 콜의 **불변성 원칙**(§0.2)상
  Supabase upsert(가변)는 부적합하다. 원장(`data/calls.jsonl`)은 git 추적 append-only 파일로 두고,
  로컬 전용 대시보드가 **파일시스템에서 직접 읽어**(`/api/calls`) 매 요청 라이브 채점한다.
- **기록**: `tools/record_call.py` — priceAtCall을 Yahoo에서 fetch해 박제, 1콜=1줄 append.
- **채점**: `tools/score_calls.py`(CLI) + `dashboard/lib/calls.ts`(대시보드) — 동일 규칙 이중 구현.
- **뷰**: 사이드바 "트랙레코드" 탭(집계 KPI + 콜 목록 표 + Wilson CI·소표본 경고).
- **한계(추가 발견)**: 콜 이후 액면분할 시 시점가(분할 전)와 현재가(분할 조정)의 기준이 달라져
  수익률이 왜곡될 수 있다. 콜은 시점 기준 forward로 기록되므로 실사용 영향은 작으나, 뷰에 주석 표기.
