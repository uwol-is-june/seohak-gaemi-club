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

### 섹터 리서치 탭: 분야(도메인) 그룹으로 묶기 (TASK-81~83)

**배경 / 문제**
섹터 리서치 탭의 1차 탭이 루트 보고서 파일명에서 파싱한 **섹터명 그대로**를 알파벳순으로
나열해(`AI-Infrastructure`, `Cloud-Computing`, `E-commerce`, `GLP-1-Obesity` …), 섹터가
늘어날수록 칩 나열이 길어지고 유관 분야(테크/AI vs 헬스케어)가 섞여 보였다.

**해결**
프로세스 가이드 1단계 '섹터 구조 파악'의 섹터 피커와 **같은 분야 분류**로 1차 묶음을 만들고
(테크/AI · 금융 · 헬스케어 · 소비 · 에너지 · 산업재 · 소재), 거기에 없는 주제는 종목별 보고서
탭처럼 사용자가 그룹을 편집할 수 있게 했다.

- [x] **(O) [TASK-81] 섹터 리서치 1차 탭에 '분야' 위계 추가**
  - 위계: `분야(1차) → 섹터(2차) → 보고서 유형(3차) → 생성일자(4차)`.
  - 판정·정렬 헬퍼는 [sector-domains.ts](../dashboard/lib/sector-domains.ts) 신규 모듈
    (`normalizeSectorKey` / `domainOfSector` / `orderedDomains` / `deriveDomainGroups`).
    **import 없는 순수 모듈**로 유지 — 그래야 plain node 로 테스트를 바로 돌릴 수 있다
    (report-helpers 는 `@/` 별칭 때문에 불가).
  - 기본 매핑 단일 소스 = [flows.ts](../dashboard/lib/flows.ts) `DISCOVERY_SECTOR_GROUPS`(export 로 변경)
    → `DEFAULT_DOMAIN_GROUPS`([report-helpers.ts](../dashboard/lib/report-helpers.ts))로 파생.
  - 표기 차이 흡수: 영문·숫자만 남긴 키로 완전 일치 → 실패 시 접두 일치(최소 4자).
    `AI-Semiconductors` ↔ `AI Semiconductors`, `GLP-1-Obesity` ⊂ `GLP-1 / Obesity Drugs`.
    **완전 일치를 항상 먼저 전체 그룹에 대해 시도** — `Insurance`(금융)가
    `Health Insurance`(헬스케어)로 새는 것을 막는다.
  - 매핑에 없는 섹터는 `미분류` 분야로 모아 맨 끝. 보고서 없는 분야 탭은 숨김.
  - UI는 종목별 보고서 탭의 '종목 선택' 카드와 동일 패턴('섹터 선택' 카드 안에 분야 → 섹터 2단).

- [x] **(S) [TASK-82] 분야 그룹 사용자 편집 + 서버 영속화**
  - [SectorGroupEditor.tsx](../dashboard/components/SectorGroupEditor.tsx)를 두 축이 공유하도록
    일반화(`title` / `eyebrow` / `itemNoun` / `namePlaceholder` / `upperCaseItems` prop).
    비교는 항상 대소문자·공백 무시, 저장은 축에 맞는 표기(티커=대문자, 섹터명=원표기 유지).
  - 신규 [/api/sector-domain-groups](../dashboard/app/api/sector-domain-groups/route.ts) GET/PUT —
    `app_config('sector_domain_groups')`. 종목 그룹(`sector_groups`)과 키 분리.
    `requireAuth` + 상한 sanitize + DB 에러 비노출은 기존 라우트와 동일.
  - 저장값이 있으면 기본 매핑을 덮어쓴다. 저장 실패 시 화면만 낙관적 갱신(기존 패턴 동일).
  - 검증(로컬 dev): 미인증 401 / 로그인 후 GET = 기본 7분야 / PUT 라운드트립(trim·빈값 제거·
    대문자 변환 없음 확인) / `{"groups":"nope"}` → 400. 테스트로 쓴 config 행은 삭제해 원복.

- [x] **(H) [TASK-83] 매핑 헬퍼 유닛 테스트**
  - [sector-domains.test.ts](../dashboard/lib/sector-domains.test.ts) — 실제 매핑 표를 먹여
    루트 보고서 7개 섹터 전부 + 완전 일치 우선 + 미분류 + 짧은 키 접두 제외 + 탭 순서/dedup +
    사용자 그룹 덮어쓰기를 검증.
  - 실행: `node dashboard/lib/sector-domains.test.ts` (Node 24+ 타입 스트리핑, `calls.fixture.test.ts`와 동일 방식)

---

_(마지막 사용 번호: TASK-83, 다음은 TASK-84부터)_
