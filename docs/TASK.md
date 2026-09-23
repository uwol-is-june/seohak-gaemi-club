# TASK

**모델**: `(O)` Opus · `(S)` Sonnet · `(H)` Haiku
**상태**: `[ ]` 예정 · `[~]` 진행중 · `[x]` 완료
**번호**: 각 태스크에 `[TASK-N]` 부여 (지칭용, 완료돼도 번호 재사용 안 함)

---

> **운영 방식: 로컬 전용** (`npm run dev`). 배포 안 함 — 토스 IP 허용목록에
> 실행 PC의 공인 IP만 등록하면 됨. 네트워크/자리 바뀌면 IP 재등록 필요.

---

## 예정

### 대시보드 UI/UX 리뉴얼 — 토스증권 레퍼런스 (다크)

> 브랜치 `redesign/toss-dark` · 1단계 완료 `96f2c97`
> 시안이던 캔버스 아티팩트 2건은 **삭제되어 더 이상 열리지 않는다**. 기준은
> `dashboard/app/globals.css` 주석과 1단계 커밋 메시지에만 남아 있다 → TASK-128로 문서화.

- [ ] **[TASK-125] (O) 2단계 — 프리미티브 신설**
  `Delta`(등락 ±기호+삼각형+색) · `StatusChip`(판정) · `TierBadge` · `Card` · `NavItem`.
  색 단독 의존 제거를 컴포넌트에 내장해 호출부가 실수할 수 없게 만든다.
- [ ] **[TASK-126] (O) 3단계 — 화면 4종 재구성**
  홈 · 관찰 논제 · 종목 상세(진입 래더 차트) · 보고서 뷰어.
  카드 반경을 토스 값(12/16px)으로 — 지금은 `rounded-lg`(8px)만 쓴다.
  로그인 `입장` 버튼이 회색으로 떠 있는 것도 여기서 primary fill로 교체.
- [ ] **[TASK-127] (O) 4단계 — 렌더링 구조**
  `use client` 20/21 → 인터랙티브 잎사귀로 강등 · `HomeView` 1157줄 ·
  `TrackRecordView` 785줄 분해 · 표에 가로 스크롤 래퍼.

### 1단계에서 미룬 것 · 작업 중 발견

- [ ] **[TASK-128] (O) 🔴 DESIGN 기준 문서 교체**
  `docs/DESIGN-x.ai.md`가 여전히 UI/UX 단일 소스인데 **코드는 이미 토스 토큰이다** —
  문서와 구현이 정면으로 어긋나 있다(문서: "볼드 금지 · 그림자 없음 · 시맨틱 팔레트 없음").
  토스 기준 문서를 신설하고 x.ai 문서는 아카이브. **공개 확인값과 파생값을 반드시 구분해
  적는다** (토스증권이 공개한 건 라이트 테마까지 — 다크·등락 hex는 미공개라 파생했다).
- [ ] **[TASK-129] (S) 🔴 `.env.local` 키 노출 점검**
  토스 Open API 키·`SITE_PASSWORD`·`GITHUB_TOKEN`이 들어 있다. 저장소가 public이므로
  gitignore 적용 여부와 과거 커밋 이력에 섞여 들어간 적 없는지 확인.
- [ ] **[TASK-130] (S) Pretendard 교체 검토**
  Toss Product Sans는 비공개라 Noto Sans KR로 대체했으나 Pretendard가 더 가깝다.
  Google Fonts에 없어 `next/font/local` + woff2 동봉이 필요 — 용량과 맞바꿀지 판단.
- [ ] **[TASK-131] (S) 토큰 오용 방지 장치**
  `--color-primary`(#3182F6)는 **fill 전용** — 카드 위 4.46:1이라 본문 텍스트 금지.
  `--color-faint`(#6B7684)는 **UI 전용** — 3.59:1이라 본문 금지.
  주석에만 적혀 있어 지켜질 보장이 없다. 린트 규칙이나 래퍼로 강제할지 검토.
- [ ] **[TASK-132] (S) `tabular-nums` 전역 적용 범위 재검토**
  `body`에 한 번에 걸었다. 한글·라틴 혼용 본문에서 자간이 어색하면 데이터 표시
  컴포넌트로 범위를 좁힌다.
- [ ] **[TASK-133] (H) 토큰 전환 잔재 정리**
  `.eyebrow`를 안 쓰고 uppercase를 하드코딩한 곳(로그인 페이지 등).
  `ArticlesView`의 카테고리 칩 4종은 의미 토큰(success/twilight)을 빌려 쓰는 중 —
  categorical 스케일이 따로 필요한지 판단.
- [ ] **[TASK-134] (S) 내부 화면 시각 검증**
  로그인 게이트 때문에 1단계는 로그인 화면만 눈으로 확인했다. 나머지 탭은
  빌드 통과로만 검증된 상태 — `SITE_PASSWORD`로 실제 렌더 확인 필요.

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

---

_(마지막 사용 번호: TASK-134, 다음은 TASK-135부터)_
