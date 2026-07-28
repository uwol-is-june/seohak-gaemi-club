# TASK

**모델**: `(O)` Opus · `(S)` Sonnet · `(H)` Haiku
**상태**: `[ ]` 예정 · `[~]` 진행중 · `[x]` 완료
**번호**: 각 태스크에 `[TASK-N]` 부여 (지칭용, 완료돼도 번호 재사용 안 함)

---

> **운영 방식: 로컬 전용** (`npm run dev`). 배포 안 함 — 토스 IP 허용목록에
> 실행 PC의 공인 IP만 등록하면 됨. 네트워크/자리 바뀌면 IP 재등록 필요.

---

## 예정

_(없음)_

---

## 완료

> **포트폴리오·트랙레코드 개선 (2026-07-27, TASK-73~80 일괄 완료)**
> 방향: ① 파편화 정리(탭 2개 역할 재정의) ② 포트폴리오 "판단 레이어" ③ 트랙레코드 "살아있게".
> 검증: `npx tsc --noEmit` + `next build` 통과. 관련: [[report-folder-ticker-naming]]

### A. 구조 정리 (파편화 해소)

- [x] [TASK-73] (S) **"포트폴리오 점검" 탭을 "포트폴리오" 탭으로 흡수**
  - 배경: nav에 `포트폴리오`(개요 그룹)와 `포트폴리오 점검`(리서치 프로세스 그룹)이 따로 있어 라벨 중복·혼동.
  - 범위: `navGroups`에서 `portfolio`(점검) flow 항목 제거 → 포트폴리오 탭(`portfolio-overview`) 안에
    "분기 점검 실행" 카드 ROW(`/portfolio-review`) + 최신 `portfolio-latest.md` 패널을 병합.
    분기 카드/`FlowModal` 진입은 포트폴리오 탭 안에서 유지.
  - 완료 기준: nav에 포트폴리오 관련 항목 1개만. 포트폴리오 탭에서 점검 실행·최신 점검 보고서 열람 가능.
  - 참고: `HomeView.tsx` navGroups·flowTab 분기, `lib/flows.ts`의 `portfolio` flow.

- [x] [TASK-74] (S) **수기 매매기록(`track-record.md`)을 포트폴리오 탭으로 이동**
  - 배경: 트랙레코드 탭은 "콜=예측 채점"인데 그 밑에 실보유 수기표가 붙어 예측/실보유 개념이 섞임
    (코드 주석 스스로 "원장은 매매기록 아니라 판단기록"이라 강조).
  - 범위: `track-record.md` 인라인 렌더를 트랙레코드 탭에서 제거 → 포트폴리오 탭 하단으로 이동.
    `ROOT_NON_SECTOR`·`trackRecordDoc` 로직 위치만 조정.
  - 완료 기준: 트랙레코드 탭 = 콜 채점만. 포트폴리오 탭에서 보유 포지션·매매로그 확인.

### B. 포트폴리오 강화 (판단 레이어)

- [x] [TASK-75] (O) **보유 종목 카드에 판단 pill 부착 (숫자 → 판단)**
  - 범위: `HoldingsBanner`가 `/api/calls`를 직접 로드(티커별 최신 콜) + HomeView에서
    `screenByCompany` prop 수신. 각 카드 하단에 판단 스트립 추가 — 최신 콜(라벨+★+상태점),
    스크리닝 판정(SCREEN_GROUPS 재사용), 목표밴드(현재가 위/아래/밴드내). 데이터 없으면 "분석 기록 없음".
  - 구현 메모: 논제 건강도(7/10)는 thesis 마크다운 내부 값이라 구조화 안 됨 → 제외(현재 API로 불가).
    콜 상태점/목표밴드 위치로 대체 표현.

- [x] [TASK-76] (O) **집중도·섹터 편중 위젯 + 리밸런싱 신호**
  - 범위: `HoldingsBanner`에 `sectorOf` prop 추가. KPI 아래 위젯 — 최대 비중/상위 3종목/종목수 +
    섹터별 비중 바(sectorGroups 기반) + 과대비중(≥30%) 종목 pill("집중 리스크" 배지).

- [x] [TASK-77] (O) **보유 종목 → 종목 상세 드릴다운 (티커 축 통합)**
  - 범위: `HoldingsBanner` 카드에 `reportedTickers`/`onDrill` prop. 보고서 있는 종목만 클릭 가능
    (role=button+키보드). 클릭 시 HomeView `drillToTicker` → 섹터·종목 선택 후 `reports` 탭으로 이동.

### C. 트랙레코드 강화 (살아있게 + 정직성)

- [x] [TASK-78] (S) **빈 상태 개선 (확정 0건 안내)**
  - 범위: `agg.resolvedCount === 0`일 때 KPI 위에 안내 배너 — "모든 콜 채점 기준일 미경과" +
    진행중 콜의 예상 첫 채점일 중 가장 이른 날짜(`expectedResolveDate` 근사) 표시.

- [x] [TASK-79] (O) **진행중 콜 상세 — 목표밴드/horizon/무효화 조건 노출**
  - 범위: 콜 행 클릭 시 확장 패널(Fragment) — 콜시점가/현재가/목표밴드/horizon 경과율 요약 +
    핵심 가정(loadBearing) + 무효화 레드라인(invalidation) 리스트. `lib/calls.ts` ScoredCall에
    `loadBearing` 필드 추가(passthrough).

- [x] [TASK-80] (O) **콜 유형별 분리 집계 + skill별 성적표**
  - 범위: `TrackRecordView`에서 클라이언트 집계(`tallyBy`) — 유형별(buy/keep/hold/avoid)·스킬별
    총건수/확정/적중/진행중. KPI 아래 2단 카드. **API 계약(`CallAggregate`)은 미변경** →
    `tools/score_calls.py` 동기화 부담 없음(분해만 클라이언트에서).

---

_(마지막 사용 번호: TASK-80, 다음은 TASK-81부터)_
