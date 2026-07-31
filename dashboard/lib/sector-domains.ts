// '섹터 리서치' 탭의 1차 구분 = 분야(도메인) 그룹. 루트 보고서 파일명에서 파싱한 섹터명
// (AI-Semiconductors, GLP-1-Obesity …)을 테크/AI·금융·헬스케어 같은 유관 분야로 묶는다.
//
// 기본 매핑은 프로세스 가이드 1단계 '섹터 구조 파악'의 섹터 피커와 같은 표
// (flows.ts DISCOVERY_SECTOR_GROUPS)에서 파생한다 — 사용자가 리서치를 시작할 때 본
// 분류와 결과물을 보는 분류가 어긋나지 않게. 사용자가 그룹 편집 UI로 덮어쓸 수 있고,
// 저장된 값이 있으면 그게 기본 매핑을 대체한다(/api/sector-domain-groups).
//
// ⚠️ 이 모듈은 의도적으로 import 가 없다 — 경로 별칭(@/)이 없어야 plain node 로
// sector-domains.test.ts 를 바로 실행할 수 있다(report-helpers 는 @/ 때문에 불가).

// 그룹 편집 모달(SectorGroupEditor)을 '종목 그룹'과 공유하기 위해 필드 형태를
// report-helpers 의 SectorGroup 과 동일하게 맞춘다(구조적 타이핑으로 그대로 호환).
// 주의: `tickers` 에 들어가는 값은 티커가 아니라 **섹터명**이다.
export type DomainGroup = { id: string; name: string; tickers: string[] };

export const UNCLASSIFIED_DOMAIN = "미분류";

// 접두 일치를 허용할 최소 키 길이. 너무 짧은 키(ai, oil…)가 아무 데나 붙는 것을 막는다.
const PREFIX_MIN = 4;

// 표기 차이를 흡수하는 매칭 키. 보고서 파일명은 하이픈, 피커 라벨은 공백·슬래시를 쓴다:
//   'AI-Semiconductors' ↔ 'AI Semiconductors'     → aisemiconductors (완전 일치)
//   'GLP-1-Obesity'     ↔ 'GLP-1 / Obesity Drugs' → glp1obesity ⊂ glp1obesitydrugs (접두 일치)
// 한글은 **보존한다**(TASK-85) — 종목별 보고서 탭의 섹터 그룹명은 사용자가 한글로 짓는 경우가
// 많아('반도체·AI', '우주·항공', '양자컴퓨터'), 한글을 버리면 키가 비어 절대 매칭되지 않는다.
// 구분기호(·, /, 공백, 하이픈)만 제거하므로 '우주·항공' ↔ '우주 항공'도 같은 키가 된다.
export function normalizeSectorKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

// 섹터가 속한 분야명. 어느 그룹에도 없으면 '미분류'.
export function domainOfSector(groups: DomainGroup[], sector: string): string {
  const key = normalizeSectorKey(sector);
  if (!key) return UNCLASSIFIED_DOMAIN;
  // 1) 완전 일치 우선 — 'Insurance'(금융)가 'Health Insurance'(헬스케어)로 새지 않게,
  //    접두 일치보다 항상 먼저 모든 그룹을 훑는다.
  for (const g of groups) {
    if (g.tickers.some((m) => normalizeSectorKey(m) === key)) return g.name;
  }
  // 2) 접두 일치 — 파일명이 라벨의 축약형(또는 그 반대)인 경우.
  if (key.length >= PREFIX_MIN) {
    for (const g of groups) {
      const hit = g.tickers.some((m) => {
        const mk = normalizeSectorKey(m);
        if (mk.length < PREFIX_MIN) return false;
        return mk.startsWith(key) || key.startsWith(mk);
      });
      if (hit) return g.name;
    }
  }
  return UNCLASSIFIED_DOMAIN;
}

// 보고서가 존재하는 섹터 기준으로 노출할 분야 탭 목록(그룹 배열 순서 유지, 빈 분야 숨김,
// 미분류는 해당 섹터가 있을 때만 맨 끝). 분야명 중복 시 첫 항목만 남긴다.
// (종목별 보고서 탭의 orderedSectors 와 같은 정책 — 두 탭의 1차 탭 동작을 통일한다.)
export function orderedDomains(groups: DomainGroup[], sectors: string[]): string[] {
  const present: string[] = [];
  for (const g of groups) {
    if (!present.includes(g.name) && sectors.some((s) => domainOfSector(groups, s) === g.name)) {
      present.push(g.name);
    }
  }
  if (sectors.some((s) => domainOfSector(groups, s) === UNCLASSIFIED_DOMAIN)) {
    present.push(UNCLASSIFIED_DOMAIN);
  }
  return present;
}

// 선택된 분야에 속한 섹터만 추린다(입력 순서 유지). '섹터 리서치' 탭의 2차 탭과
// '종목별 보고서' 탭의 2차 탭이 공유한다 — 두 탭이 같은 분야 판정을 쓰도록(TASK-84).
export function sectorsInDomain(
  groups: DomainGroup[],
  sectors: string[],
  domain: string
): string[] {
  return sectors.filter((s) => domainOfSector(groups, s) === domain);
}

// 분야 시드에 덧붙이는 **섹터명 별칭**(TASK-85).
// 섹터 피커(DISCOVERY_SECTOR_GROUPS)는 영문 섹터명이지만, 종목별 보고서 탭의 섹터 그룹명은
// 사용자가 한글·약어로 짓는다('반도체·AI', '우주·항공', 'Enterprise SW'…). 두 탭이 같은 분야
// 표를 공유하므로(TASK-84) 이런 이름들도 기존 분야에 붙도록 시드에 넣는다. 여기에 없는 새
// 그룹명은 '미분류'로 남고, 사용자가 '분야 그룹' 편집으로 넣으면 된다.
//
// ⚠️ 섹터 피커 표(flows.ts)에는 넣지 않는다 — 그건 리서치를 시작할 때 쓰는 영문 섹터명
//    목록이라, 한글 그룹명을 섞으면 /industry-research 입력값이 오염된다.
// 실제 종목 그룹명 중 피커 표와 자동으로 붙지 않는 것만 넣는다. 자동으로 붙는 이름
// ('AI Infra' ⊂ 'AI Infrastructure', 'Fintech' ⊂ 'Fintech Payments', 'E-commerce',
// 'Cloud Computing')은 여기 없어도 매칭되므로 넣지 않는다 — 가상의 이름을 미리 채우지 않는다.
export const DOMAIN_MEMBER_ALIASES: Record<string, string[]> = {
  "테크/AI": ["반도체·AI", "양자컴퓨터", "Enterprise SW"],
  헬스케어: ["헬스케어"],
  산업재: ["우주·항공"],
};

// ─── 티커 → 섹터 자동 배정(TASK-90) ────────────────────────────────────────
// 보고서 마커에서 파생된 자동 맵(app_config 'sector_auto_map', tools/sync_sector_map.py).
// 키 = 티커(대문자), 값 = 섹터명(퍼널 보고서 파일명의 섹터 토큰과 같은 표기).
export type AutoSectorMap = Record<string, string>;

// 자동 맵을 사용자의 수동 종목 그룹에 합친다. **수동 우선, 빈 곳만 자동**:
//   · 이미 어느 수동 그룹에 든 티커는 손대지 않는다(사용자가 옮긴 분류가 되돌아가지 않게).
//   · 어느 그룹에도 없어 '미분류'로 떨어질 티커만 자동 맵의 섹터에 넣는다.
// 자동 섹터명이 기존 그룹명과 같거나 접두 일치하면(예: 'Fintech-Payments' ↔ 'Fintech')
// 그 그룹에 덧붙이고, 아니면 새 그룹을 뒤에 만든다.
// 반환값은 **표시 전용** — 그룹 편집 모달에는 수동 그룹 원본을 그대로 넘겨야 한다.
export function mergeAutoSectorGroups(
  manual: DomainGroup[],
  autoMap: AutoSectorMap | null | undefined
): DomainGroup[] {
  const merged = manual.map((g) => ({ ...g, tickers: [...g.tickers] }));
  if (!autoMap) return merged;
  const taken = new Set(merged.flatMap((g) => g.tickers.map((t) => t.trim().toUpperCase())));
  for (const [rawTicker, rawSector] of Object.entries(autoMap)) {
    const ticker = String(rawTicker).trim().toUpperCase();
    const sector = String(rawSector ?? "").trim();
    if (!ticker || !sector || taken.has(ticker)) continue;
    taken.add(ticker);
    const key = normalizeSectorKey(sector);
    let target = merged.find((g) => keyMatches(normalizeSectorKey(g.name), key));
    if (!target) {
      target = { id: `auto-${key || merged.length}`, name: sector, tickers: [] };
      merged.push(target);
    }
    target.tickers.push(ticker);
  }
  return merged;
}

// 두 매칭 키가 domainOfSector 기준으로 같은 것으로 취급되는가(완전 일치 또는 접두 일치).
// 별칭 중복 삽입을 막는 데 쓴다 — 이미 붙는 이름을 멤버로 또 넣을 필요는 없다.
function keyMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < PREFIX_MIN || b.length < PREFIX_MIN) return false;
  return a.startsWith(b) || b.startsWith(a);
}

// 섹터 피커 표(flows.ts DISCOVERY_SECTOR_GROUPS) → 기본 분야 그룹 시드(+ 위 별칭).
// 저장된 사용자 설정이 없을 때만 쓰인다.
export function deriveDomainGroups(
  picker: readonly { label: string; sectors: readonly string[] }[]
): DomainGroup[] {
  return picker.map((g, i) => {
    const members = [...g.sectors];
    for (const alias of DOMAIN_MEMBER_ALIASES[g.label] ?? []) {
      const ak = normalizeSectorKey(alias);
      if (!members.some((m) => keyMatches(normalizeSectorKey(m), ak))) members.push(alias);
    }
    return { id: `domain-${i}`, name: g.label, tickers: members };
  });
}
