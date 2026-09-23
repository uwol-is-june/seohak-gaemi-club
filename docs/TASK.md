# TASK

**모델**: `(O)` Opus · `(S)` Sonnet · `(H)` Haiku
**상태**: `[ ]` 예정 · `[~]` 진행중 · `[x]` 완료
**번호**: 각 태스크에 `[TASK-N]` 부여 (지칭용, 완료돼도 번호 재사용 안 함)

---

> **운영 방식: 로컬 전용** (`npm run dev`). 배포 안 함 — 토스 IP 허용목록에
> 실행 PC의 공인 IP만 등록하면 됨. 네트워크/자리 바뀌면 IP 재등록 필요.

---

## 예정

- [ ] **[TASK-136] (S) 주가 이력 API — 있어야 그릴 수 있는 것들**
  지금 `app/api/quotes` 는 **현재가만** 준다. 이력이 없어서 못 만든 것:
  - 래더를 신뢰구간 선그래프로(과거에 이 구간에 왔었는지 = 체결확률의 근거)
  - 스파크라인 · 논제 수립 시점 대비 궤적
  `tools/fill_probability.py` 가 이미 Yahoo 이력으로 베이스레이트를 뽑으므로
  같은 소스를 API로 열면 된다. **차트가 아니라 데이터가 선행 과제다.**

---

## 완료

_(완료 항목은 정리했다. 이력은 git 로그에서 본다 — `git log -p docs/TASK.md`)_

> **2026-09-23 · 대시보드 UI/UX 리뉴얼 — 토스증권 레퍼런스 다크** (TASK-125~134)
> 브랜치 `redesign/toss-dark` · 기준 문서 `docs/DESIGN-toss.md`(신설, x.ai 폐기)
>
> | 남은 산출물 | 위치 |
> |---|---|
> | 색 토큰 3축(등락·판정·분류) · 실측 대비값 | `dashboard/app/globals.css` `@theme` |
> | 재사용 부품 6종 | `dashboard/components/primitives/` |
> | 토큰 오용 검사기 | `tools/check_design_tokens.py` |
> | 에이전트용 요약 | `dashboard/AGENTS.md` |
>
> 정정 기록: 초기 진단 중 **3건이 실재하지 않는 문제**였다 — `use client` 20/21(19개는
> 훅을 실제로 씀) · 표 가로 스크롤(이미 래퍼 있음) · "트랙레코드가 11열 마크다운 표"
> (그건 보고서 문서고 대시보드는 이미 카드형). 파일 개수만 세고 내용을 안 본 탓이다.
> 반대로 검사기는 `lib/` 전체가 정리에서 빠진 25건을 잡아냈다.
>
> 판단 기록: 서체는 **Noto Sans KR 유지**(Pretendard가 더 가깝지만 Google Fonts에 없어
> woff2 동봉이 필요 — public 저장소 용량과 맞바꿀 만큼의 차이가 아니라고 봤다).
> `tabular-nums` 는 **전역 유지**(로그인·홈·트랙레코드·보고서에서 한글 자간 이상 없음).

> **2026-09-23 · 트랙레코드 접힌 줄 보강** (TASK-135)
> 거리 게이지(40%를 '멀다' 기준) + 조건부 차수 칩 + 전일 대비를 `<Delta>` 로 통일.
> `dashboard/components/TrackRecordView.tsx`
>
> 하지 않기로 한 것:
> · **홈 히어로** — 트랙레코드 탭이 이미 "지금 뭘 봐야 하나"를 답한다. 포트폴리오
>   홈은 "얼마인가"라는 다른 질문을 맡는다. 긴급도를 두 곳에 두면 어긋난다.
> · **AND 조건 n/m 충족 카운터** — 데이터에 없다. `Tranche.condition` 은 조건 텍스트고
>   충족 여부는 어디에도 기록되지 않는다. '조건이 붙은 차수 수'까지만 표시했다.
> · **신뢰구간 선그래프** — 주가 이력 API가 없다 → TASK-136.

> **2026-09-10~14 · 트랙레코드 보수성 편향 교정** (TASK-98~106)
> 기준 `skills/quality-tier.md` · 도구 `tools/quality_tier.py`·`tools/fill_probability.py` ·
> 적용 결과 `proj_report/band-audit-20260914.md`

> **2026-09-22~23 · 밴드 산술 검증 + 관망 종목 전수 재실행** (TASK-107~124)
> 스냅샷: `git show d112ec2:docs/TASK.md`
>
> | 남은 산출물 | 위치 |
> |---|---|
> | 밴드 산술 검증 · 진단 분기 · 역산 검증 · 기회비용선 · 밴드 정합성 검사 | `skills/quality-tier.md` 2.5 / 2.55 / 2.6 / 3.5단계 |
> | 밴드 이탈 트리거(티어 상대) · 밴드 상단 적격 규칙 · 3시나리오 확률 열 필수 | `skills/thesis-tracker.md` B4.5 · A4.6 · A4-1.5 |
> | 퀄리티 티어 축③ 교정(횟수→깊이, `TH_DECLINE_PCT`) | `tools/quality_tier.py` |
> | 밴드 상단 ≠ 래더 1차 경고(게이트 4) | `tools/record_call.py` |
> | 대시보드 밴드 이탈 자동 판정 + 신선도 가드 | `dashboard/lib/thesis-groups.ts` (`bandDrift`·`FRESH_BAND_DAYS`) |
> | 관망 6종목 전수 재실행 결과 · 감사 오류 정정 이력 | `reports/track-record.md` + 각 `{티커}-thesis.md` |

---

_(마지막 사용 번호: TASK-136, 다음은 TASK-137부터)_
