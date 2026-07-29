// 섹터 → 분야(도메인) 매핑 테스트 (TASK-83).
// 실제 매핑 표(flows.ts DISCOVERY_SECTOR_GROUPS)를 그대로 먹여, 보고서 파일명 표기와
// 섹터 피커 라벨의 표기 차이가 흡수되는지 확인한다.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/sector-domains.test.ts
// (sector-domains.ts·flows.ts 는 import 가 없어 @/ 별칭 해석 없이 바로 돌아간다.)
import { DISCOVERY_SECTOR_GROUPS } from "./flows.ts";
import {
  deriveDomainGroups,
  domainOfSector,
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
eq("key: 한글은 빈 키", normalizeSectorKey("테크/AI"), "ai");

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
  sectorsInDomain(groups, ["Quantum-Foo", "Cybersecurity", "양자컴퓨터"], UNCLASSIFIED_DOMAIN),
  ["Quantum-Foo", "양자컴퓨터"]
);
eq("sectorsInDomain: 없는 분야는 빈 배열", sectorsInDomain(groups, ["Cybersecurity"], "에너지"), []);

// ── 종목 축 위계: 종목 → 섹터(사용자 종목 그룹) → 분야 (TASK-84) ──────────────
// 종목별 보고서 탭은 sectorOfWith(종목→섹터)의 결과를 그대로 domainOfSector 에 먹인다.
// report-helpers 는 @/ 별칭 때문에 여기서 import 할 수 없으므로 동일 규칙을 인라인으로 둔다.
const tickerGroups = [
  { id: "t0", name: "반도체·AI", tickers: ["NVDA", "TSM", "INTC"] },
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
// 한글 섹터 그룹명은 매칭 키가 비어(또는 너무 짧아) 미분류로 떨어진다 — 사용자가
// 분야 그룹 편집으로 직접 넣어줘야 한다는 뜻. '우선 미분류' 정책의 근거.
eq("종목: NVDA → 미분류 (한글 그룹명)", domainOfTicker("NVDA"), UNCLASSIFIED_DOMAIN);
// 어느 종목 그룹에도 없는 티커도 미분류.
eq("종목: 미배정 티커 → 미분류", domainOfTicker("ZZZZ"), UNCLASSIFIED_DOMAIN);

// 한글 그룹명을 분야 그룹에 등록하면 정상 분류된다(편집으로 해소 가능함을 확인).
const withKorean: DomainGroup[] = [
  ...groups,
  { id: "kr", name: "테크/AI-추가", tickers: ["반도체·AI"] },
];
eq(
  "종목: 한글 그룹명을 분야에 등록하면 분류됨",
  domainOfSector(withKorean, sectorOfTicker("NVDA")),
  "테크/AI-추가"
);

if (failures.length > 0) {
  console.error(`❌ 섹터→분야 매핑 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 섹터→분야 매핑 테스트 통과");
