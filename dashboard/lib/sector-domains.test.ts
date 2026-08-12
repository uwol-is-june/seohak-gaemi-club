// 섹터 → 분야(도메인) 매핑 테스트 (TASK-83).
// 실제 매핑 표(flows.ts DISCOVERY_SECTOR_GROUPS)를 그대로 먹여, 보고서 파일명 표기와
// 섹터 피커 라벨의 표기 차이가 흡수되는지 확인한다.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/sector-domains.test.ts
// (sector-domains.ts·flows.ts 는 import 가 없어 @/ 별칭 해석 없이 바로 돌아간다.)
import { DISCOVERY_SECTOR_GROUPS } from "./flows.ts";
import {
  canonicalSector,
  deriveDomainGroups,
  domainOfSector,
  mergeAutoSectorGroups,
  normalizeSectorKey,
  orderedDomains,
  sectorsInDomain,
  UNCLASSIFIED_DOMAIN,
  type DomainGroup,
} from "./sector-domains.ts";

const failures: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) failures.push(`[${label}] 기대 ${w} ≠ 실제 ${g}`);
}

const groups = deriveDomainGroups(DISCOVERY_SECTOR_GROUPS);

// ── 매칭 키 정규화 ──────────────────────────────────────────────────────────
eq("key: 하이픈 제거", normalizeSectorKey("AI-Semiconductors"), "aisemiconductors");
eq("key: 공백 제거", normalizeSectorKey("AI Semiconductors"), "aisemiconductors");
eq("key: 슬래시·공백 제거", normalizeSectorKey("GLP-1 / Obesity Drugs"), "glp1obesitydrugs");
// 한글은 보존한다(TASK-85) — 버리면 한글 섹터 그룹명이 절대 매칭되지 않는다.
eq("key: 한글 보존", normalizeSectorKey("테크/AI"), "테크ai");
eq("key: 중점(·) 제거", normalizeSectorKey("반도체·AI"), "반도체ai");
eq("key: 한글 구분기호 무시(중점 = 공백)", normalizeSectorKey("우주·항공"), normalizeSectorKey("우주 항공"));

// ── 실제 루트 보고서의 섹터명 (reports/*.md) ──────────────────────────────────
eq("AI-Semiconductors", domainOfSector(groups, "AI-Semiconductors"), "테크/AI");
eq("AI-Infrastructure", domainOfSector(groups, "AI-Infrastructure"), "테크/AI");
eq("Cloud-Computing", domainOfSector(groups, "Cloud-Computing"), "테크/AI");
eq("Cybersecurity", domainOfSector(groups, "Cybersecurity"), "테크/AI");
eq("Enterprise-Software", domainOfSector(groups, "Enterprise-Software"), "테크/AI");
eq("E-commerce", domainOfSector(groups, "E-commerce"), "소비");
// 파일명이 라벨의 축약형 → 접두 일치로 붙는다.
eq("GLP-1-Obesity (접두 일치)", domainOfSector(groups, "GLP-1-Obesity"), "헬스케어");
// 반대 방향(라벨이 축약형)도 붙는다.
eq("Copper (접두 일치 역방향)", domainOfSector(groups, "Copper"), "소재");

// ── 완전 일치가 접두 일치보다 우선 ───────────────────────────────────────────
// 'Insurance'(금융)가 'Health Insurance'(헬스케어)로 새면 안 된다.
eq("Insurance", domainOfSector(groups, "Insurance"), "금융");
eq("Health-Insurance", domainOfSector(groups, "Health-Insurance"), "헬스케어");

// ── 미분류 ──────────────────────────────────────────────────────────────────
eq("미지의 섹터", domainOfSector(groups, "Quantum-Foo"), UNCLASSIFIED_DOMAIN);
eq("빈 문자열", domainOfSector(groups, "   "), UNCLASSIFIED_DOMAIN);
// 너무 짧은 키는 접두 일치로 아무 데나 붙지 않는다('AI' ⊄ 'AI Semiconductors').
eq("짧은 키는 접두 일치 제외", domainOfSector(groups, "AI"), UNCLASSIFIED_DOMAIN);

// ── 분야 탭 목록: 그룹 순서 유지 · 빈 분야 숨김 · 미분류 맨 끝 ────────────────
eq(
  "orderedDomains: 순서 유지 + 빈 분야 숨김",
  orderedDomains(groups, ["E-commerce", "Cybersecurity", "GLP-1-Obesity"]),
  ["테크/AI", "헬스케어", "소비"]
);
eq(
  "orderedDomains: 미분류는 항상 맨 끝",
  orderedDomains(groups, ["Quantum-Foo", "Cybersecurity"]),
  ["테크/AI", UNCLASSIFIED_DOMAIN]
);
eq("orderedDomains: 보고서 없으면 빈 목록", orderedDomains(groups, []), []);

// ── 사용자 편집 그룹이 기본 매핑을 덮어쓴다 ──────────────────────────────────
const custom: DomainGroup[] = [
  { id: "d-0", name: "양자", tickers: ["Quantum-Foo"] },
  { id: "d-1", name: "테크/AI", tickers: ["Cybersecurity"] },
];
eq("사용자 그룹: 신규 분야", domainOfSector(custom, "Quantum-Foo"), "양자");
eq("사용자 그룹: 미등록 섹터는 미분류", domainOfSector(custom, "E-commerce"), UNCLASSIFIED_DOMAIN);
eq(
  "사용자 그룹: 탭 순서는 배열 순서",
  orderedDomains(custom, ["Cybersecurity", "Quantum-Foo", "E-commerce"]),
  ["양자", "테크/AI", UNCLASSIFIED_DOMAIN]
);

// 그룹명 중복 시 첫 항목만 남긴다(1차 탭이 중복 렌더되지 않도록).
eq(
  "orderedDomains: 중복 분야명 dedup",
  orderedDomains(
    [
      { id: "a", name: "테크/AI", tickers: ["Cybersecurity"] },
      { id: "b", name: "테크/AI", tickers: ["Cloud Computing"] },
    ],
    ["Cybersecurity", "Cloud-Computing"]
  ),
  ["테크/AI"]
);

// ── sectorsInDomain: 분야 안의 섹터만, 입력 순서 유지 (TASK-84) ───────────────
eq(
  "sectorsInDomain: 테크/AI",
  sectorsInDomain(groups, ["E-commerce", "Cybersecurity", "Cloud-Computing"], "테크/AI"),
  ["Cybersecurity", "Cloud-Computing"]
);
eq(
  "sectorsInDomain: 미분류만 골라냄",
  sectorsInDomain(groups, ["Quantum-Foo", "Cybersecurity", "Quantum-Computing"], UNCLASSIFIED_DOMAIN),
  ["Quantum-Foo"] // 'Quantum-Computing'은 별칭으로 테크/AI에 붙는다(TASK-91)
);
eq("sectorsInDomain: 없는 분야는 빈 배열", sectorsInDomain(groups, ["Cybersecurity"], "에너지"), []);

// ── 종목 그룹명 → 리서치 섹터명 정본화 (TASK-91) ─────────────────────────────
// 분야 탭에서 '섹터 리서치 보고서'와 '그 퍼널이 뽑은 종목'을 한 줄에 세우려면 두 축의
// 섹터명이 같은 문자열로 접혀야 한다. 정본은 리서치 섹터명(파일명 토큰) 쪽이다.
const research = ["AI-Infrastructure", "AI-Semiconductors", "GLP-1-Obesity", "Copper"];
eq("정본화: 완전 일치", canonicalSector(research, "AI-Semiconductors"), "AI-Semiconductors");
eq("정본화: 표기 차이 흡수(공백↔하이픈)", canonicalSector(research, "AI Infrastructure"), "AI-Infrastructure");
eq("정본화: 그룹명이 축약형", canonicalSector(research, "AI Infra"), "AI-Infrastructure");
eq("정본화: 리서치명이 축약형(역방향)", canonicalSector(research, "Copper / Mining"), "Copper");
// 대응하는 리서치 섹터가 없으면 그 이름 자체가 섹터가 된다(종목만 있는 섹터).
eq("정본화: 매칭 없으면 그대로", canonicalSector(research, "Quantum-Computing"), "Quantum-Computing");
// 짧은 키는 접두 일치로 아무 데나 붙지 않는다 — 'AI' 가 AI-Infrastructure 를 삼키면 안 된다.
eq("정본화: 짧은 키는 접두 일치 제외", canonicalSector(research, "AI"), "AI");
eq("정본화: 빈 문자열은 그대로", canonicalSector(research, "  "), "  ");

// ── 종목 축 위계: 종목 → 섹터(사용자 종목 그룹) → 분야 (TASK-84) ──────────────
// 종목별 보고서 탭은 sectorOfWith(종목→섹터)의 결과를 그대로 domainOfSector 에 먹인다.
// report-helpers 는 @/ 별칭 때문에 여기서 import 할 수 없으므로 동일 규칙을 인라인으로 둔다.
const tickerGroups = [
  // 종목 그룹명은 리서치 섹터명 표기로 통일한다(TASK-91) — 같은 섹터가 두 표기로 갈리면
  // 분야 탭에서 섹터 칩이 둘로 쪼개진다.
  { id: "t0", name: "AI-Semiconductors", tickers: ["NVDA", "TSM", "INTC"] },
  { id: "t1", name: "Cloud Computing", tickers: ["GOOGL"] },
  { id: "t2", name: "Fintech", tickers: ["AXP"] },
  { id: "t3", name: "E-commerce", tickers: ["AMZN"] },
];
const sectorOfTicker = (t: string) =>
  tickerGroups.find((g) => g.tickers.includes(t.toUpperCase()))?.name ?? UNCLASSIFIED_DOMAIN;
const domainOfTicker = (t: string) => domainOfSector(groups, sectorOfTicker(t));

// 영문 섹터 그룹명은 섹터 피커 표와 붙는다(완전/접두 일치).
eq("종목: GOOGL → 테크/AI", domainOfTicker("GOOGL"), "테크/AI");
eq("종목: AXP → 금융 (Fintech ⊂ Fintech Payments)", domainOfTicker("AXP"), "금융");
eq("종목: AMZN → 소비", domainOfTicker("AMZN"), "소비");
eq("종목: NVDA → 테크/AI", domainOfTicker("NVDA"), "테크/AI");
// 어느 종목 그룹에도 없는 티커는 여전히 미분류 — '정말로 없는 것'만 남긴다.
eq("종목: 미배정 티커 → 미분류", domainOfTicker("ZZZZ"), UNCLASSIFIED_DOMAIN);

// ── 별칭 표 전수 확인: 피커 표에 없는 섹터명 → 기존 분야 (TASK-85/91) ──────────
// 종목 그룹명을 리서치 섹터명으로 통일한 뒤(TASK-91) 대부분은 피커 표와 바로 붙는다.
// 별칭이 남아야 하는 건 '아직 퍼널을 돌린 적 없어 피커 표에 없는 섹터'뿐이다.
eq("별칭: Quantum-Computing → 테크/AI", domainOfSector(groups, "Quantum-Computing"), "테크/AI");
// 통일 후의 그룹명들은 별칭 없이 피커 표와 붙어야 한다(별칭을 지운 근거).
eq("통일: GLP-1-Obesity → 헬스케어", domainOfSector(groups, "GLP-1-Obesity"), "헬스케어");
eq("통일: Enterprise-Software → 테크/AI", domainOfSector(groups, "Enterprise-Software"), "테크/AI");
eq("통일: Aerospace → 산업재", domainOfSector(groups, "Aerospace"), "산업재");
// 지운 한글 별칭은 이제 붙지 않는다 — 실재하지 않는 이름이라 붙으면 오히려 착시다.
eq("지운 별칭: 반도체·AI → 미분류", domainOfSector(groups, "반도체·AI"), UNCLASSIFIED_DOMAIN);
eq("지운 별칭: 우주·항공 → 미분류", domainOfSector(groups, "우주·항공"), UNCLASSIFIED_DOMAIN);

// 자동으로 붙는 이름은 별칭 표에 없어도 매칭된다(별칭을 최소로 유지하는 근거).
eq("자동: AI Infra → 테크/AI", domainOfSector(groups, "AI Infra"), "테크/AI");
eq("자동: Fintech → 금융", domainOfSector(groups, "Fintech"), "금융");
eq("금융 멤버는 피커 4개 그대로", groups.find((g) => g.name === "금융")?.tickers.length, 4);
// 별칭 dedup: 이미 접두로 붙는 이름을 별칭에 넣어도 멤버가 늘지 않는다.
eq(
  "별칭 dedup: 접두로 이미 붙으면 추가 안 함",
  deriveDomainGroups([{ label: "테크/AI", sectors: ["AI Infrastructure"] }])[0].tickers,
  ["AI Infrastructure", "Quantum-Computing"]
);

// 사용자가 저장한 그룹은 여전히 시드를 완전히 대체한다(별칭도 함께 사라짐).
const custom2: DomainGroup[] = [{ id: "x", name: "내분야", tickers: ["Quantum-Computing"] }];
eq("사용자 그룹이 별칭 시드를 대체", domainOfSector(custom2, "Quantum-Computing"), "내분야");
eq("사용자 그룹에 없으면 미분류", domainOfSector(custom2, "GLP-1-Obesity"), UNCLASSIFIED_DOMAIN);

// ── 티커 → 섹터 자동 배정 병합 (TASK-90) ──────────────────────────────────────
// 정책: 수동 그룹이 항상 이기고, 어느 그룹에도 없는 티커만 자동 맵으로 채운다.
const manual: DomainGroup[] = [
  { id: "m0", name: "헬스케어", tickers: ["LLY", "NVO"] },
  { id: "m1", name: "Fintech", tickers: [] },
];
const auto = {
  LLY: "GLP-1-Obesity", // 수동에 이미 있음 → 무시
  WST: "GLP-1-Obesity", // 신규 → 새 그룹
  AXP: "Fintech-Payments", // 접두 일치 → 기존 'Fintech' 그룹에 합류
  NOC: "Defense",
  GD: "Defense",
};
const effective = mergeAutoSectorGroups(manual, auto);
const nameOf = (t: string) =>
  effective.find((g) => g.tickers.includes(t))?.name ?? UNCLASSIFIED_DOMAIN;

eq("자동병합: 수동 배정은 유지", nameOf("LLY"), "헬스케어");
eq("자동병합: 미배정 티커는 자동 섹터로", nameOf("WST"), "GLP-1-Obesity");
eq("자동병합: 접두 일치 그룹에 합류", nameOf("AXP"), "Fintech");
eq("자동병합: 같은 섹터는 한 그룹에", nameOf("NOC"), "Defense");
eq(
  "자동병합: Defense 멤버 2종목",
  effective.find((g) => g.name === "Defense")?.tickers,
  ["NOC", "GD"]
);
eq("자동병합: 원본 그룹 불변(수동 배열 오염 없음)", manual[0].tickers, ["LLY", "NVO"]);
eq("자동병합: 맵이 없으면 수동 그대로", mergeAutoSectorGroups(manual, null).length, 2);
// 자동 그룹명도 분야 판정에 그대로 들어간다 — 종목 축 위계가 자동으로 완성되는 근거.
eq("자동병합: 자동 그룹 → 분야", domainOfSector(groups, nameOf("NOC")), "산업재");
eq("자동병합: 자동 그룹 → 분야(헬스케어)", domainOfSector(groups, nameOf("WST")), "헬스케어");

if (failures.length > 0) {
  console.error(`❌ 섹터→분야 매핑 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 섹터→분야 매핑 테스트 통과");
