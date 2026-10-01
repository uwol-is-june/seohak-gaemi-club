import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// 로그인 쿠키 이름
export const AUTH_COOKIE = "dash_auth";

// 세션 유효기간(초). 쿠키 maxAge 이자 토큰에 박히는 서버측 만료값이기도 하다.
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30일

// 서명·검증에 쓰는 상수. 토큰은 평문 비밀번호가 아니라 서명 페이로드를 담는다(TASK-52).
const PEPPER = "reality-escape-device.auth.v1";

// 세션 세대 태그 — 토큰에 박혀 서명되고, 라우트 검증 때 현재 값과 같아야 통과한다.
//
// 🔴 예전엔 메모리 정수 epoch(0부터)였다. 재시작하면 0 으로 되돌아가 **로그아웃으로 죽인
// 토큰(epoch 0 발급분)이 부활**했다(TASK-145). 이제 randomBytes 태그를 쓰고 로그아웃 때
// 새 태그로 교체한다 → 로그아웃한 토큰은 재시작 뒤에도 무효다.
//
// globalThis 에 두는 이유: dev 서버는 라우트 번들마다 모듈 인스턴스가 따로 생길 수 있는데,
// 인스턴스마다 nonce 가 다르면 /api/login 이 발급한 토큰을 다른 라우트가 거부한다.
// 주의: 로컬 단일 프로세스 전제. 여러 워커/인스턴스면 공유 저장소가 필요하다.
//
// 🔴 태그는 파일(dashboard/.session-tag, git 제외)에도 남긴다. 메모리에만 두면 **dev 서버를
// 재시작할 때마다 전원 로그아웃**되는데, 미들웨어는 태그를 안 보므로(아래 verifyToken 참조)
// 페이지는 열리고 API 만 전부 401 이 나 화면이 빈 채로 멈췄다(2026-09-30 실측). 파일에 두면
// 재시작은 세션을 유지하고, 로그아웃만 태그를 교체해 이전 토큰을 죽인다 — TASK-145 의 목표
// ("로그아웃한 토큰이 재시작으로 부활하지 않는다")는 그대로 지켜진다.
const g = globalThis as typeof globalThis & { __dashSessionTag?: string };

function tagFile(): string {
  return process.env.DASH_SESSION_TAG_FILE ?? path.join(process.cwd(), ".session-tag");
}

function sessionTag(): string {
  if (g.__dashSessionTag) return g.__dashSessionTag;
  try {
    const saved = readFileSync(tagFile(), "utf-8").trim();
    if (/^[0-9a-f]{24}$/.test(saved)) return (g.__dashSessionTag = saved);
  } catch {
    // 파일 없음 → 새로 만든다
  }
  return rotateTag();
}

function rotateTag(): string {
  const tag = randomBytes(12).toString("hex");
  g.__dashSessionTag = tag;
  try {
    writeFileSync(tagFile(), tag + "\n", "utf-8");
  } catch (err) {
    // 저장 실패는 치명적이지 않다 — 메모리 태그로 계속 동작하고, 재시작 시 재로그인만 필요하다.
    console.error("세션 태그 저장 실패:", err);
  }
  return tag;
}

export function invalidateAllSessions(): void {
  rotateTag();
}

// 서명 비밀: SITE_PASSWORD 기반이라 비밀번호를 바꾸면 기존 토큰이 전부 무효가 된다.
// 미설정 시 null → 아무도 통과 못 함(fail-closed).
function secret(): string | null {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(pw + PEPPER).digest("hex");
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

/**
 * 로그인 성공 시 발급하는 서명 토큰: `${exp}.${tag}.${sig}`.
 *   exp = 만료 시각(epoch 초) — 서버가 강제(쿠키 위조로도 연장 불가).
 *   tag = 발급 시점 세션 태그(부팅 nonce) — 재시작·로그아웃으로 무효화된다.
 *   sig = HMAC-SHA256(secret, `${exp}.${tag}`).
 * SITE_PASSWORD 미설정 시 null.
 */
export function issueToken(): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S;
  const payload = `${exp}.${sessionTag()}`;
  return `${payload}.${sign(payload, key)}`;
}

/**
 * 토큰 검증: 서명 일치 + 미만료 (+ 옵션으로 현재 세션 태그 일치).
 * @param checkEpoch 라우트 핸들러(권위 검증)는 true — 재시작·로그아웃 무효화를 반영한다.
 *   미들웨어는 false — 런타임 간 태그 불일치로 정상 토큰을 오거부하지 않게 한다
 *   (권위 있는 fail-closed 검증은 각 라우트의 requireAuth 가 담당).
 */
export function verifyToken(token: string | undefined | null, checkEpoch = true): boolean {
  if (!token) return false;
  const key = secret();
  if (!key) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, tag, sig] = parts;
  const expected = sign(`${expStr}.${tag}`, key);
  // 상수 시간 비교(길이 다르면 즉시 실패).
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  if (checkEpoch && tag !== sessionTag()) return false;
  return true;
}

/**
 * 두 비밀 문자열을 상수 시간에 비교한다 (타이밍 공격 방지).
 * 로그인 시 입력 비밀번호와 SITE_PASSWORD 비교에 쓴다.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
