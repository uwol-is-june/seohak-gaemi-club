# TASK

**모델**: `(O)` Opus · `(S)` Sonnet · `(H)` Haiku
**상태**: `[ ]` 예정 · `[~]` 진행중 · `[x]` 완료

---

> **운영 방식: 로컬 전용** (`npm run dev`). 배포 안 함 — 토스 IP 허용목록에
> 실행 PC의 공인 IP만 등록하면 됨. 네트워크/자리 바뀌면 IP 재등록 필요.

---

## 예정

_(없음)_

---

## 완료

### 대시보드: 보고서 유형 구분 + 개요 미리보기 `(S)`

**배경**: `/quality-screen`(열등주 제거) 결과가 파일로 저장되면서(`reports/{회사}/{회사}-quality-screen-{날짜}.md`) 종목별 보고서(investment-team, 체크리스트 등)와 한 폴더에 섞임. 대시보드에서 구분이 안 되고, 열기 전에는 합격/불합격 여부도 알 수 없었음.

- [x] **① 열등주 스크리닝 보고서 배지 추가** — [dashboard/app/page.tsx](dashboard/app/page.tsx) `getFileBadge()`에 `-quality-screen-` 규칙 추가. fuchsia 색 "열등주스크리닝" 배지로 다른 유형과 시각 구분.
- [x] **② 열기 전 합격/불합격 개요 노출** — [dashboard/lib/github.ts](dashboard/lib/github.ts)에서 열등주 스크리닝 보고서 본문을 파싱(`parseQualityScreenResult`)해 `ReportFile.summary`(탈락/통과/면제 통과)로 목록에 첨부. 클라이언트는 `getResultPill()`로 색상 pill 표시.
- [x] **③ 한눈에 보이는 카드 레이아웃** — 파일명 칩 나열 → 유형 배지 + 결과 pill + 파일명(날짜 포함)이 정돈된 2열 카드 그리드로 재구성.

**완료 기준 충족**: 열등주 스크리닝 보고서가 investment-team 보고서와 배지·색으로 즉시 구분되고, 클릭 없이 "탈락" 등 결과 개요가 보임. `npx tsc --noEmit` 통과.

> **참고**: 대시보드는 GitHub `main` 트리에서 보고서를 읽음. 로컬에 저장한 QUBT 보고서는 push해야 대시보드에 나타남.
