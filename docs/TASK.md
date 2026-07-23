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

- `[x]` **[TASK-31] (H)** 보고서 유형에 '급변동 분석'(news-pulse) 추가
  - `/news-pulse` 산출물 `{회사}-news-{YYYYMMDD}.md`가 기존엔 "기타/MD"로 미분류 → 전용 유형 신설
  - `getReportCategory`에 `-news-` → `"news"` 규칙, `REPORT_SECTIONS`에 `급변동 분석` 구획(투자 논제 다음), `getFileBadge`에 `급변동` 배지(sunset) 추가
  - `dashboard/app/page.tsx` 수정, `tsc --noEmit` 통과
  - 주의: 대시보드는 GitHub에서 목록을 읽으므로 보고서를 **커밋+푸시**해야 탭에 노출됨

- `[x]` **[TASK-30] (S)** 포트폴리오 점검 보고서를 '포트폴리오 점검' 탭에서 표시
  - `portfolio-latest.md` 링크를 '포트폴리오' 탭에서 제거 → '포트폴리오 점검' 플로우 탭(분기 카드 위)에 이동
  - '포트폴리오' 탭은 보유 현황(HoldingsBanner) 전용으로 정리
  - `dashboard/app/page.tsx` 수정, 타입체크 통과
