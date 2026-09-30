// 그룹 설정 검증 테스트 (TASK-156 · TASK-157). /api/sector-groups · /api/sector-domain-groups 공용.
//
// 실행:  node --test dashboard/lib/group-sanitize.test.ts   (또는 dashboard 에서 npm test)
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_GROUPS, MAX_MEMBERS_PER_GROUP, MAX_STR, sanitizeGroups } from "./group-sanitize.ts";

test("티커 그룹은 대문자 정규화 · 섹터명 그룹은 표기 보존", () => {
  const input = [{ id: "a", name: " 기술 ", tickers: [" nvda ", "AI Semiconductors", ""] }];
  assert.deepEqual(sanitizeGroups(input, { upper: true }), [
    { id: "a", name: "기술", tickers: ["NVDA", "AI SEMICONDUCTORS"] },
  ]);
  assert.deepEqual(sanitizeGroups(input, { upper: false }), [
    { id: "a", name: "기술", tickers: ["nvda", "AI Semiconductors"] },
  ]);
});

test("id 가 없으면 순번 id 를 부여", () => {
  assert.deepEqual(sanitizeGroups([{ name: "x", tickers: [] }, { name: "y", tickers: [] }], { upper: true }), [
    { id: "g-0", name: "x", tickers: [] },
    { id: "g-1", name: "y", tickers: [] },
  ]);
});

test("문자열 아닌 멤버·너무 긴 멤버는 버린다(그룹은 유지)", () => {
  const out = sanitizeGroups([{ name: "x", tickers: ["A", 3, null, "B".repeat(MAX_STR + 1)] }], { upper: true });
  assert.deepEqual(out?.[0].tickers, ["A"]);
});

test("형태가 틀리거나 상한을 넘으면 null(→400)", () => {
  assert.equal(sanitizeGroups(null, { upper: true }), null);
  assert.equal(sanitizeGroups({}, { upper: true }), null);
  assert.equal(sanitizeGroups([null], { upper: true }), null);
  assert.equal(sanitizeGroups([{ name: 1, tickers: [] }], { upper: true }), null);
  assert.equal(sanitizeGroups([{ name: "x", id: 5, tickers: [] }], { upper: true }), null);
  assert.equal(sanitizeGroups([{ name: "x", tickers: "A" }], { upper: true }), null);
  assert.equal(sanitizeGroups([{ name: "x".repeat(MAX_STR + 1), tickers: [] }], { upper: true }), null);
  assert.equal(
    sanitizeGroups(Array.from({ length: MAX_GROUPS + 1 }, () => ({ name: "x", tickers: [] })), { upper: true }),
    null,
  );
  assert.equal(
    sanitizeGroups([{ name: "x", tickers: Array.from({ length: MAX_MEMBERS_PER_GROUP + 1 }, () => "A") }], {
      upper: true,
    }),
    null,
  );
});
