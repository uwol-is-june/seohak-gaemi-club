// quarter-due.ts 판정 테스트. import 가 없어 @/ 별칭 해석 없이 바로 돌아간다
// (sector-domains.test.ts 와 같은 방식): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { quarterDue, quarterDueDate, quarterBadge, fmtDue } from "./quarter-due.ts";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

test("기준일 당일이면 '지금 할 차례'", () => {
  const q = quarterDue(8, 15, d("2026-08-15"), null);
  assert.equal(q.state, "due");
  assert.equal(q.daysUntil, 0);
  assert.equal(quarterBadge(q), "지금 할 차례");
});

test("기준일 7일 전(lead 경계)이면 due", () => {
  const q = quarterDue(8, 15, d("2026-08-08"), null);
  assert.equal(q.state, "due");
  assert.equal(q.daysUntil, 7);
});

test("기준일 8일 전이면 아직 upcoming(D-8)", () => {
  const q = quarterDue(8, 15, d("2026-08-07"), null);
  assert.equal(q.state, "upcoming");
  assert.equal(quarterBadge(q), "D-8");
});

test("기준일 지난 뒤 유예기간 안이면 due(D+)", () => {
  const q = quarterDue(8, 15, d("2026-08-20"), null);
  assert.equal(q.state, "due");
  assert.equal(q.daysUntil, -5);
  assert.equal(quarterBadge(q), "지금 할 차례 · D+5");
});

test("유예기간을 넘기면 내년 기준일로 롤오버된다", () => {
  const due = quarterDueDate(8, 15, d("2026-10-30")); // 8/15 + 45일 < 10/30
  assert.equal(fmtDue(due), "2027-08-15");
});

test("창 안에 점검 보고서가 있으면 완료", () => {
  const q = quarterDue(8, 15, d("2026-08-20"), d("2026-08-18"));
  assert.equal(q.state, "done");
  assert.equal(quarterBadge(q), "점검 완료");
});

test("창보다 오래된 보고서는 완료로 치지 않는다", () => {
  const q = quarterDue(8, 15, d("2026-08-20"), d("2026-05-20"));
  assert.equal(q.state, "due");
});

test("연말 기준일(3월 1일)도 롤오버가 맞다", () => {
  // 2026-06-01 은 3/1 + 45일(4/15)을 넘겼으므로 2027-03-01 로 넘어간다.
  assert.equal(fmtDue(quarterDueDate(3, 1, d("2026-06-01"))), "2027-03-01");
  // 2026-02-20 은 아직 3/1 전이므로 올해가 유지된다.
  assert.equal(fmtDue(quarterDueDate(3, 1, d("2026-02-20"))), "2026-03-01");
});

test("오늘(2026-08-12) 기준 2분기 점검은 할 차례다", () => {
  const q = quarterDue(8, 15, d("2026-08-12"), null);
  assert.equal(q.state, "due");
  assert.equal(q.daysUntil, 3);
});
