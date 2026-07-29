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

### 한글 섹터 그룹명도 기존 분야로 자동 분류 (TASK-85)

**배경 / 문제**
TASK-84 직후 21종목 중 **14개가 미분류**로 떨어졌다. 원인은 `normalizeSectorKey`가
**한글을 전부 제거**해서 매칭 키가 빈 문자열이 되는 것 — `헬스케어`·`양자컴퓨터`·`우주·항공`은
키가 `""`, `반도체·AI`는 `"ai"`(2자, 접두 최소 4자 미달)라 **어떤 별칭을 넣어도 매칭 불가**였다.

**해결**
1. **매칭 키가 한글을 보존**하도록 수정(`[^a-z0-9]` → `[^a-z0-9가-힣]`). 이 앱은 UI가 한국어이고
   사용자가 섹터 그룹명을 한글로 짓기 때문에, 한글은 버릴 게 아니라 1급 매칭 대상이다.
   구분기호(`·`, `/`, 공백, 하이픈)만 제거하므로 `우주·항공` ↔ `우주 항공`도 같은 키가 된다.
2. **별칭 표** `DOMAIN_MEMBER_ALIASES`를 분야 시드에 덧붙인다(`deriveDomainGroups` 안에서).

- [x] **(O) [TASK-85] 한글·약어 섹터 그룹명을 기존 분야에 배정**
  - 별칭: `테크/AI ← 반도체·AI, 양자컴퓨터, Enterprise SW` · `헬스케어 ← 헬스케어` ·
    `산업재 ← 우주·항공`. **자동으로 붙는 이름은 넣지 않았다** —
    `AI Infra` ⊂ `AI Infrastructure`, `Fintech` ⊂ `Fintech Payments`, `E-commerce`,
    `Cloud Computing`은 기존 접두/완전 일치로 이미 매칭된다. 가상의 이름을 미리 채우지 않음.
  - 별칭 dedup을 **접두 일치까지 고려**(`keyMatches`) — 이미 붙는 이름을 멤버로 또 넣지 않는다.
  - 별칭 표는 `sector-domains.ts`(import 없는 순수 모듈)에 둬서 plain node 테스트로 커버.
    `report-helpers.ts`의 `DEFAULT_DOMAIN_GROUPS`는 다시 한 줄로 축소.
  - ⚠️ 섹터 피커 표(`flows.ts DISCOVERY_SECTOR_GROUPS`)에는 넣지 **않았다** — 그건 리서치를
    시작할 때 쓰는 영문 섹터명 목록이라, 한글 그룹명을 섞으면 `/industry-research` 입력이 오염된다.
  - **`sector_groups`에 PYPL 추가**(Supabase `app_config` 직접 upsert): 종목 그룹 자체가 없어
    미분류였던 유일한 티커 → `Fintech`(금융). 저장값이 코드 기본값을 덮으므로 DB 수정이 유일한 경로.
    한글 그룹명 라운드트립 무손상 확인.
  - `reports/AAPL/`은 `_data.json`/`_data.md`만 있고 **Supabase에 발행된 보고서가 없어**
    대시보드 종목 목록(21개)에 애초에 없다 → 분류 대상 아님.
  - 결과(실제 저장값 시뮬레이션): **미분류 0** — 테크/AI 11 · 금융 2 · 헬스케어 3 · 소비 3 · 산업재 2.
  - 검증: 유닛 테스트 통과(한글 키 보존 · 별칭 전수 · dedup · 사용자 그룹이 시드를 대체) ·
    `npx tsc --noEmit` 0 에러 · `next build` 성공.

### 종목별 보고서 탭에도 분야 위계 적용 (TASK-84)

**배경 / 문제**
TASK-81~83으로 섹터 리서치 탭은 `분야 → 섹터`로 정리됐는데, 종목별 보고서 탭은 여전히
`섹터 → 종목` 2단이라 두 결과물 탭의 1차 구분이 어긋났다. 종목 섹터 그룹이 9개까지 늘어
1차 칩 나열도 길어졌다.

**해결**
종목 축을 `분야(1차) → 섹터(2차) → 종목(3차) → 보고서 유형 → 생성일자` 5단으로 만들고,
**분야 표(`sector_domain_groups`)를 두 탭이 공유**하게 했다. 분야 판정은 기존 두 매핑의
합성이다 — `종목 → 섹터`(사용자 종목 그룹, `sector_groups`) → `섹터 → 분야`(공유 분야 그룹).

- [x] **(O) [TASK-84] 종목별 보고서 1차 탭에 '분야' 위계 추가**
  - 판정 = `domainOfSector(domainGroups, sectorOfWith(sectorGroups, ticker))`. 어느 단계든
    매칭 실패 시 `미분류`로 떨어진다(종목이 종목 그룹에 없거나, 그 섹터가 분야 그룹에 없는 경우).
    한글 섹터 그룹명은 매칭 키가 비거나 너무 짧아 자연히 미분류 — 사용자가 분야 그룹 편집으로
    직접 넣어야 한다(요청대로 **'우선 미분류'** 정책).
  - `sectorsInDomain(groups, sectors, domain)` 헬퍼를 [sector-domains.ts](../dashboard/lib/sector-domains.ts)에
    추가하고 **두 탭이 공유** — 섹터 리서치 탭에 인라인돼 있던 같은 filter를 이 헬퍼로 대체.
    `domainOf` 판정 콜백도 위쪽에 한 번만 정의해 두 축이 함께 쓴다(중복 제거).
  - reconciliation: 분야 목록 변경 → 1차 선택 보정, 분야 변경 → 2차(섹터) 선택 보정
    (현재 섹터가 그 분야에 속하면 유지). 기존 2단 이펙트의 대상을 `domainReportSectors`로 교체.
  - `drillToTicker`(포트폴리오 카드 → 종목 보고서)도 분야까지 함께 맞춘다 — 안 맞추면 섹터 탭이
    목록에 없어 reconciliation이 선택을 되돌려버린다.
  - 편집 버튼 2개로 분리: **`분야 그룹`**(공유 표, 섹터 리서치 탭과 동일 모달) + **`종목 그룹`**(기존).
    분야 편집 모달의 칩 목록은 `루트 보고서 섹터명 ∪ 사용자 종목 그룹명` 합집합 —
    그래야 `반도체·AI` 같은 종목 그룹명도 분야에 배정할 수 있다.
  - 테스트 확장: `sectorsInDomain` + 종목→섹터→분야 2단 합성(영문 그룹명 매칭 / 한글 그룹명
    미분류 / 미배정 티커 미분류 / 분야 등록 시 해소)을 추가.
  - 검증: `node dashboard/lib/sector-domains.test.ts` 통과 · `npx tsc --noEmit` 0 에러 ·
    `next build` 성공. 실제 저장값으로 시뮬레이션해 위계 출력 확인(테크/AI 4 · 금융 1 · 소비 3 ·
    미분류 14 — 미분류 안에 종목 그룹 5개 + 그룹 미배정 2종목).
  - 남은 near-miss: `Enterprise SW` ⊄ `Enterprise Software`(접두 일치 실패, 약어라 어느 쪽도
    상대의 접두가 아님) → 미분류. 매칭 알고리즘을 토큰 단위로 바꾸면 오분류 위험이 커서
    그룹 편집으로 해소하는 쪽을 택했다.

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

_(마지막 사용 번호: TASK-85, 다음은 TASK-86부터)_
