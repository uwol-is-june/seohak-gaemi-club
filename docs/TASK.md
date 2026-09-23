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

_(완료 항목은 정리했다. 이력은 git 로그에서 본다 — `git log -p docs/TASK.md`)_

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

> **2026-09-23 · 대시보드 UI/UX 리뉴얼 (토스증권 다크) + 주가 이력** (TASK-125~136)
> 기준 문서 `docs/DESIGN-toss.md` — `DESIGN-x.ai.md` 폐기
>
> | 남은 산출물 | 위치 |
> |---|---|
> | 색 토큰 3축(등락·판정·분류) · 실측 대비값 | `dashboard/app/globals.css` `@theme` |
> | 재사용 부품 6종 | `dashboard/components/primitives/` |
> | 토큰 오용 검사기 | `python3 tools/check_design_tokens.py` |
> | 주가 이력 API · 진입 구간 차트 | `dashboard/app/api/history/` · `dashboard/components/track-record/PriceHistoryChart.tsx` |
> | 에이전트용 요약 | `dashboard/AGENTS.md` |

---

_(마지막 사용 번호: TASK-136, 다음은 TASK-137부터)_
