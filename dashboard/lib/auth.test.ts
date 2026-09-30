// 세션 토큰 테스트 (TASK-145 · TASK-156).
// 막는 회귀: ① 재시작 뒤 로그아웃된 토큰 부활(메모리 epoch 가 0 으로 되돌아가던 버그)
//            ② 서명·만료 우회 ③ 미들웨어(checkEpoch=false)가 정상 토큰을 거부
//
// 실행:  node --test dashboard/lib/auth.test.ts   (또는 dashboard 에서 npm test)
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { invalidateAllSessions, issueToken, safeEqual, verifyToken } from "./auth.ts";

process.env.SITE_PASSWORD = "test-password";
const g = globalThis as typeof globalThis & { __dashSessionTag?: string };

test("발급 직후 토큰은 라우트·미들웨어 모두 통과", () => {
  const t = issueToken();
  assert.ok(t);
  assert.equal(verifyToken(t), true);
  assert.equal(verifyToken(t, false), true);
});

test("로그아웃(전역 무효화) 뒤 옛 토큰은 라우트에서 거부 · 새 토큰은 통과", () => {
  const old = issueToken();
  invalidateAllSessions();
  assert.equal(verifyToken(old), false);
  // 미들웨어는 태그를 보지 않는다(런타임 간 불일치 방지) — 권위 검증은 라우트 requireAuth.
  assert.equal(verifyToken(old, false), true);
  assert.equal(verifyToken(issueToken()), true);
});

test("재시작(세션 태그 소실) 뒤 옛 토큰은 부활하지 않는다", () => {
  const before = issueToken();
  g.__dashSessionTag = undefined; // 새 프로세스 = 새 부팅 nonce
  assert.equal(verifyToken(before), false);
});

test("변조·형식 오류·만료 토큰 거부", () => {
  const t = issueToken()!;
  const [exp, tag, sig] = t.split(".");
  assert.equal(verifyToken(`${Number(exp) + 999}.${tag}.${sig}`), false, "만료 연장 변조");
  assert.equal(verifyToken(`${exp}.${tag}.${"0".repeat(sig.length)}`), false, "서명 변조");
  assert.equal(verifyToken("a.b"), false);
  assert.equal(verifyToken(""), false);
  assert.equal(verifyToken(null), false);

  // 서명은 맞지만 만료된 토큰 — 같은 비밀로 직접 서명해 만든다.
  const key = createHash("sha256").update("test-password" + "reality-escape-device.auth.v1").digest("hex");
  const pastPayload = `${Math.floor(Date.now() / 1000) - 10}.${tag}`;
  const expired = `${pastPayload}.${createHmac("sha256", key).update(pastPayload).digest("hex")}`;
  assert.equal(verifyToken(expired), false, "만료");
});

test("비밀번호가 바뀌면 기존 토큰 전부 무효", () => {
  const t = issueToken();
  process.env.SITE_PASSWORD = "changed";
  assert.equal(verifyToken(t), false);
  process.env.SITE_PASSWORD = "test-password";
});

test("SITE_PASSWORD 미설정이면 fail-closed", () => {
  delete process.env.SITE_PASSWORD;
  assert.equal(issueToken(), null);
  assert.equal(verifyToken("1.2.3"), false);
  process.env.SITE_PASSWORD = "test-password";
});

test("safeEqual", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});
