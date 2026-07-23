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

> **후속 후보**(TASK-38 피드백 루프 구현): Phase 1 원장 기록(스킬 append) → Phase 2 채점
> 스코어러(`tools/score_calls.py`) → Phase 3 대시보드 트랙레코드 탭. 설계는
> [proj_report/feedback-loop-design.md](../proj_report/feedback-loop-design.md) 참조.

---

## 완료

> **TASK-33~38**: 2026-07-23 프로젝트 논리적 허점·위험성 분석에서 도출한 최고 레버리지 6개.
> 핵심 메타 결함 = "모든 검증이 결국 보고서를 쓴 LLM으로 회귀, 독립 검증 지점 부재".

- `[x]` **[TASK-38] (O)** thesis 콜 피드백 루프 — **설계 완료**
  - 외부 실측(주가/실적) 대조로 과거 콜·목표가 적중을 채점하는 시스템 설계.
    설계 문서: [proj_report/feedback-loop-design.md](../proj_report/feedback-loop-design.md)
  - 원장 스키마(`data/calls.jsonl`, 콜 시점값 불변·append-only), 채점 규칙(방향/목표/무효화),
    대시보드 트랙레코드 뷰, 안티-게이밍(회피 콜도 기록·look-ahead 방지) 정의
  - 구현은 Phase 1→3 후속(위 '예정' 후속 후보 참조). 이 태스크 범위는 설계까지

- `[x]` **[TASK-37] (S)** 티커 정규화 + 보고서 as-of 날짜(git commit) 표시
  - 티커: `quotes/route.ts`에 `toYahooSymbol`(클래스주 `.`/공백 → `-`), `github.ts`
    `normalizeCompanyKey`에 점(`.`) 무시 추가(`BRK.B`/`BRK-B`/`BRKB` 병합)
  - 신선도: `github.ts` `getReportCommitDate`(GitHub commits API) 신설 → content 라우트가
    커밋 시각 반환 → `ReportContentView`에 AS-OF 배너(90일 초과 시 "오래된 분석" 경고)
  - `tsc --noEmit` 통과

- `[x]` **[TASK-36] (S)** 신뢰도 verdict에 materiality(중대성) 가중
  - `data-confidence.md`: 핵심 가정(⚑ load-bearing) 개념 도입, verdict 1차 결정자를 "핵심
    가정 최저 등급"으로, 개수 임계값은 2차로 격하. 요약 블록에 `load_bearing` 필드 추가

- `[x]` **[TASK-35] (S)** "차단돼도 진행 + 필수표" → 빈칸(⬛) 허용 hard rule
  - `quality-screen.md`·`investment-checklist.md`: fetch 실패/차단 셀은 ⬛로 남기고 추측 금지,
    표 완성 압박 문구 완화(hard rule 명시). `data-confidence.md` 원칙 4와 정합

- `[x]` **[TASK-34] (H)** "에이전트 수렴 = 신뢰↑" 규칙 반전
  - `data-confidence.md` L102-103: 4대가 페르소나는 상관된 오류이므로 수렴은 등급을 못 올림.
    신뢰 상향 근거를 "계보가 다른 독립 출처 fetch"로 한정

- `[x]` **[TASK-33] (H)** 정직한 재라벨링 — "검증" 과대표현 완화
  - `financial_rigor.py`: "✅ Verified"/"no floating-point error"에 "산술 검증일 뿐 사실
    정확성 보장 아님" 명시. `report_audit.py`: `[APPROVED]` → "자가 감사 통과(독립 감사 아님)"
  - 대시보드 신뢰도 pill은 이미 "데이터 신뢰도(투자 매력도 아님)" 툴팁 보유 → 유지

- `[x]` **[TASK-32] (S)** 보고서 본문 문장 끝마다 줄바꿈 렌더 — 가독성 향상
  - 문제: 보고서 원문은 한 문단에 여러 문장이 한 줄로 이어짐 → 마크다운이 한 덩어리로 렌더돼 읽기 어려움
  - 해법: 렌더 단계 remark 플러그인(`dashboard/lib/remark-sentence-breaks.ts`)으로 **문단(paragraph) 텍스트**의 문장 끝(`. ! ? …` + 공백) 뒤에 `<br>` 삽입
  - 안전장치: 소수점(`7.91`, `1.4B`, `1,408.9M`)은 뒤에 공백이 없어 자동 제외, 제목·표 셀·코드·링크 텍스트는 부모가 paragraph가 아니라 미적용
  - `page.tsx`의 `remarkPlugins`에 추가(`[remarkGfm, remarkSentenceBreaks]`), 보고서/스킬 원문은 그대로 유지, `tsc --noEmit` 통과, 분해 로직 단위 검증 통과

- `[x]` **[TASK-31] (H)** 보고서 유형에 '급변동 분석'(news-pulse) 추가
  - `/news-pulse` 산출물 `{회사}-news-{YYYYMMDD}.md`가 기존엔 "기타/MD"로 미분류 → 전용 유형 신설
  - `getReportCategory`에 `-news-` → `"news"` 규칙, `REPORT_SECTIONS`에 `급변동 분석` 구획(투자 논제 다음), `getFileBadge`에 `급변동` 배지(sunset) 추가
  - `dashboard/app/page.tsx` 수정, `tsc --noEmit` 통과
  - 주의: 대시보드는 GitHub에서 목록을 읽으므로 보고서를 **커밋+푸시**해야 탭에 노출됨

- `[x]` **[TASK-30] (S)** 포트폴리오 점검 보고서를 '포트폴리오 점검' 탭에서 표시
  - `portfolio-latest.md` 링크를 '포트폴리오' 탭에서 제거 → '포트폴리오 점검' 플로우 탭(분기 카드 위)에 이동
  - '포트폴리오' 탭은 보유 현황(HoldingsBanner) 전용으로 정리
  - `dashboard/app/page.tsx` 수정, 타입체크 통과
