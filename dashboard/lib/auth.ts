import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// 로그인 쿠키 이름
export const AUTH_COOKIE = "dash_auth";

// 세션 유효기간(초). 쿠키 maxAge 이자 토큰에 박히는 서버측 만료값이기도 하다.
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30일

// 서명·검증에 쓰는 상수. 토큰은 평문 비밀번호가 아니라 서명 페이로드를 담는다(TASK-52).
const PEPPER = "reality-escape-device.auth.v1";

// 세션 세대 태그 — 토큰에 박혀 서명되고, 라우트 검증 때 현재 값과 같아야 통과한다.
//
// 🔴 예전엔 메모리 정수 epoch(0부터)였다. 재시작하면 0 으로 되돌아가 **로그아웃으로 죽인
// 토큰(epoch 0 발급분)이 부활**했다(TASK-145). 이제 부팅마다 randomBytes nonce 로 시작하고
// 로그아웃 때 새 nonce 로 교체한다 → 재시작도 로그아웃도 이전 토큰을 전부 무효화한다.
//
// globalThis 에 두는 이유: dev 서버는 라우트 번들마다 모듈 인스턴스가 따로 생길 수 있는데,
// 인스턴스마다 nonce 가 다르면 /api/login 이 발급한 토큰을 다른 라우트가 거부한다.
// 주의: 로컬 단일 프로세스 전제. 여러 워커/인스턴스면 공유 저장소가 필요하다.
const g = globalThis as typeof globalThis & { __dashSessionTag?: string };
function sessionTag(): string {
  g.__dashSessionTag ??= randomBytes(12).toString("hex");
  return g.__dashSessionTag;
}

export function invalidateAllSessions(): void {
  g.__dashSessionTag = randomBytes(12).toString("hex");
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
