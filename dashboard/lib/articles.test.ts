// 아티클 소재 판정 테스트.
// 여기서 틀리면 대가가 크다: 소재가 아닌 파일(열등주 스크리닝 등)을 소재로 내놓으면
// 사용자가 그 명령을 복사해 실행하고, 재료가 모자란 스킬은 웹 수집 경로로 빠진다
// (skills/investment-article.md:23) — 검증 없는 데이터가 대외 공개용 글로 나간다.
// 그 경계를 고정한다.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/articles.test.ts
import { buildArticleIndex, classifySource, isArticlePath, parseArticle } from "./articles.ts";

const failures: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) failures.push(`${label}\n      got:  ${g}\n      want: ${w}`);
}

// 종목 폴더 파일 / 루트 파일 입력 헬퍼.
const co = (company: string, name: string) => ({ path: `reports/${company}/${name}`, name, company });
const root = (name: string) => ({ path: `reports/${name}`, name, company: null });

// ─── 아티클 산출물 판정 ─────────────────────────────────────────────────────
eq("아티클: 종목", isArticlePath("reports/GOOGL/GOOGL-article-20260806.md"), true);
eq("아티클: 루트 주제", isArticlePath("reports/Defense-article-20260806.md"), true);
eq("아티클: 아닌 것", isArticlePath("reports/GOOGL/FinalReport.md"), false);
eq("아티클: 날짜 없으면 아님", isArticlePath("reports/GOOGL/GOOGL-article.md"), false);
eq(
  "아티클 파싱: 종목",
  parseArticle(co("GOOGL", "GOOGL-article-20260806.md")),
  { path: "reports/GOOGL/GOOGL-article-20260806.md", name: "GOOGL-article-20260806.md", subject: "GOOGL", date: "2026-08-06" }
);
eq(
  "아티클 파싱: 루트 주제(섹터명 복원)",
  parseArticle(root("Fintech-Payments-article-20260806.md"))?.subject,
  "Fintech-Payments"
);

// ─── Tier A: 재료 4가지가 다 있는 것 ────────────────────────────────────────
eq("A: FinalReport", classifySource(co("GOOGL", "FinalReport.md"))?.tier, "A");
eq("A: FinalReport shape", classifySource(co("GOOGL", "FinalReport.md"))?.shape, "deep");
eq("A: FinalReport subject", classifySource(co("GOOGL", "FinalReport.md"))?.subject, "GOOGL");
eq("A: 퍼널", classifySource(root("Defense-funnel-20260730.md"))?.tier, "A");
eq("A: 퍼널 shape", classifySource(root("Defense-funnel-20260730.md"))?.shape, "compare");
eq("A: 퍼널 subject", classifySource(root("Defense-funnel-20260730.md"))?.subject, "Defense");
eq("A: 산업리서치", classifySource(root("Copper-industry-20260804.md"))?.tier, "A");
eq("A: 산업리서치 shape", classifySource(root("Copper-industry-20260804.md"))?.shape, "market");
eq(
  "A: 하이픈 섹터명 보존",
  classifySource(root("Fintech-Payments-funnel-20260729.md"))?.subject,
  "Fintech-Payments"
);
eq(
  "A: 명령 문자열",
  classifySource(co("GOOGL", "FinalReport.md"))?.command,
  "/investment-article reports/GOOGL/FinalReport.md"
);

// ─── Tier B: 일부 재료만 ────────────────────────────────────────────────────
eq("B: 투자논제", classifySource(co("ADBE", "ADBE-thesis.md"))?.tier, "B");
eq("B: 체크리스트", classifySource(co("NOC", "NOC-checklist-20260730.md"))?.tier, "B");
eq("B: 실적", classifySource(co("AMZN", "AMZN-earnings-2026Q2.md"))?.tier, "B");
eq("B: 날짜 없는 논제", classifySource(co("ADBE", "ADBE-thesis.md"))?.date, null);

// ─── 제외 대상 (여기가 이 테스트의 핵심) ────────────────────────────────────
eq("제외: 열등주 스크리닝", classifySource(co("NOC", "NOC-quality-screen-20260730.md")), null);
eq("제외: 급변동", classifySource(co("ADBE", "ADBE-news-20260731.md")), null);
eq("제외: 관점 조각(01)", classifySource(co("GOOGL", "01-BusinessModel-DYP-Perspective.md")), null);
eq("제외: 관점 조각(04)", classifySource(co("GOOGL", "04-RiskManagement-LiLu-Perspective.md")), null);
eq("제외: README", classifySource(co("GOOGL", "README.md")), null);
eq("제외: 원자료 캐시", classifySource(co("AAPL", "_data.md")), null);
eq("제외: 포트폴리오(개인자산)", classifySource(root("portfolio-latest.md")), null);
eq("제외: 트랙레코드", classifySource(root("track-record.md")), null);
eq("제외: 아티클 자신", classifySource(co("GOOGL", "GOOGL-article-20260806.md")), null);
eq("제외: reports 밖", classifySource({ path: "skills/investment-article.md", name: "investment-article.md", company: null }), null);

// ─── 인덱스 조립 ────────────────────────────────────────────────────────────
const index = buildArticleIndex([
  co("GOOGL", "FinalReport.md"),
  co("GOOGL", "GOOGL-quality-screen-20260728.md"),
  co("ADBE", "FinalReport.md"),
  co("ADBE", "ADBE-article-20260805.md"),
  root("Defense-funnel-20260730.md"),
  root("Copper-industry-20260804.md"),
  co("NOC", "NOC-checklist-20260730.md"),
]);
eq("인덱스: 아티클 수", index.articles.length, 1);
// GOOGL·ADBE 의 FinalReport 2건 + 퍼널 1건 + 산업리서치 1건.
eq("인덱스: Tier A 수", index.tierA.length, 4);
eq("인덱스: Tier B 수", index.tierB.length, 1);
eq("인덱스: 스크리닝은 제외됨", index.sources.some((s) => s.name.includes("quality-screen")), false);
// 이미 아티클이 있는 소재는 표시돼야 한다(중복 발행 방지) — 그리고 뒤로 밀린다.
eq(
  "인덱스: ADBE는 아티클 보유 표시",
  index.tierA.find((s) => s.subject === "ADBE")?.hasArticle,
  true
);
eq(
  "인덱스: GOOGL은 미보유",
  index.tierA.find((s) => s.subject === "GOOGL")?.hasArticle,
  false
);
eq("인덱스: 미보유가 먼저 온다", index.tierA[index.tierA.length - 1].subject, "ADBE");

// ─── 결과 ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✗ ${failures.length}건 실패\n\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log("✓ articles.ts 테스트 통과");
