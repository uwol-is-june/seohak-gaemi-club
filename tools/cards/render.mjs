#!/usr/bin/env node
/**
 * 아티클 카드뉴스 렌더러 — 카드 데이터(JSON) + 템플릿(HTML) -> PNG 1080x1350
 *
 *   node tools/cards/render.mjs tools/cards/spcx-20260810.json
 *   node tools/cards/render.mjs tools/cards/spcx-20260810.json --out assets/cards/spcx
 *
 * 사전 준비 (1회):  cd tools/cards && npm install
 * 브라우저는 설치된 Chrome을 그대로 쓴다 (playwright-core는 브라우저를 내려받지 않는다).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const CARD_W = 1080;
const CARD_H = 1350;

const argv = process.argv.slice(2);
const dataPath = argv.find((a) => !a.startsWith("--"));
if (!dataPath) {
  console.error("사용법: node tools/cards/render.mjs <카드데이터.json> [--out <디렉토리>]");
  process.exit(1);
}
const outIdx = argv.indexOf("--out");
const slug = basename(dataPath).replace(/\.json$/, "");
const outDir = resolve(outIdx >= 0 ? argv[outIdx + 1] : `assets/cards/${slug}`);

const data = JSON.parse(readFileSync(resolve(dataPath), "utf8"));
const template = readFileSync(resolve(HERE, "template.html"), "utf8");

// 데이터는 setContent 시점에 주입한다 — file:// 에서 fetch가 막히는 걸 피한다
const html = template.replace(
  "<script>",
  `<script>window.CARD_DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>\n<script>`,
);

// 표지에 종목명이 없으면 무슨 글인지 모른 채 넘어간다 — 조용히 넘기지 않는다.
if (data.cards?.some((c) => c.type === "cover") && !data.company) {
  console.error(
    `⚠ company 가 없다 — 표지에 티커(${data.ticker})만 뜬다.\n` +
      `  한글 종목명을 넣어라: "company": "스페이스X", "exchange": "NASDAQ"`
  );
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: CARD_W, height: CARD_H },
  deviceScaleFactor: 2, // 2160x2700 — SNS 업로드 재압축에 견디게
});
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

const cards = await page.locator(".card").all();
if (cards.length !== data.cards.length) {
  console.error(`렌더된 카드 수(${cards.length})가 데이터(${data.cards.length})와 다르다 — 템플릿 확인 필요`);
  await browser.close();
  process.exit(1);
}

for (const [i, card] of cards.entries()) {
  const n = String(i + 1).padStart(2, "0");
  const file = resolve(outDir, `${data.ticker}-${n}.png`);
  await card.screenshot({ path: file });
  console.log(`  ${data.ticker}-${n}.png`);
}

await browser.close();

// 게시 본문(캡션) — 이미지만 있으면 붙여넣을 때 결국 손으로 쓰게 된다.
// 카드와 같은 JSON에서 나와야 문구와 이미지가 어긋나지 않는다.
if (data.caption) {
  const tags = (data.hashtags ?? []).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  const body = [
    data.caption.trim(),
    tags,
    data.disclaimer?.trim() ?? "투자 권유가 아닙니다. 모든 판단의 책임은 투자자 본인에게 있습니다.",
    `소재: ${data.source ?? "(미기재)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  writeFileSync(resolve(outDir, "caption.md"), body + "\n", "utf8");
  console.log(`  caption.md (${[...body].length}자)`);
} else {
  console.log("  ⚠ caption 없음 — 게시 본문 없이 이미지만 나갑니다");
}

console.log(`\n카드 ${cards.length}장 -> ${outDir}`);
console.log(`소재: ${data.source ?? "(미기재)"}`);
