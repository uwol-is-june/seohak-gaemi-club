// TTL 캐시 테스트 (TASK-169).
// 막는 회귀: ① 실패 결과가 캐시돼 빈칸이 TTL 동안 굳는 것 ② 일시 실패 때 직전 값을 버리는 것
//
// 실행:  node --test dashboard/lib/ttl-cache.test.ts   (또는 dashboard 에서 npm test)
import test from "node:test";
import assert from "node:assert/strict";
import { createTtlCache } from "./ttl-cache.ts";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

test("TTL 안에서는 load 를 다시 부르지 않는다", async () => {
  const c = clock();
  const cache = createTtlCache<number | null>(1000, (v) => v != null, c.now);
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await cache.get("a", load), 1);
  c.advance(999);
  assert.equal(await cache.get("a", load), 1);
  c.advance(1);
  assert.equal(await cache.get("a", load), 2);
});

test("실패 결과는 저장하지 않는다 — 다음 요청이 바로 재시도한다", async () => {
  const cache = createTtlCache<number | null>(1000, (v) => v != null, clock().now);
  assert.equal(await cache.get("a", async () => null), null);
  assert.equal(await cache.get("a", async () => 7), 7);
});

test("만료 후 재조회가 실패하면 직전 성공값으로 폴백한다", async () => {
  const c = clock();
  const cache = createTtlCache<number | null>(1000, (v) => v != null, c.now);
  await cache.get("a", async () => 5);
  c.advance(5000);
  assert.equal(await cache.get("a", async () => null), 5);
  assert.equal(
    await cache.get("a", async () => {
      throw new Error("network");
    }),
    5
  );
});

test("직전 값이 없는 throw 는 그대로 던진다", async () => {
  const cache = createTtlCache<number>(1000, () => true, clock().now);
  await assert.rejects(cache.get("a", async () => {
    throw new Error("boom");
  }));
});

test("같은 키 동시 요청은 load 를 한 번만 부른다", async () => {
  const cache = createTtlCache<number>(1000, () => true, clock().now);
  let calls = 0;
  const load = () => new Promise<number>((r) => setTimeout(() => r(++calls), 10));
  const [a, b] = await Promise.all([cache.get("k", load), cache.get("k", load)]);
  assert.equal(calls, 1);
  assert.equal(a, 1);
  assert.equal(b, 1);
});
