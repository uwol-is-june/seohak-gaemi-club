import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// 로그인 쿠키 이름
export const AUTH_COOKIE = "dash_auth";

// 세션 유효기간(초). 쿠키 maxAge 이자 토큰에 박히는 서버측 만료값이기도 하다.
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30일

// 서명·검증에 쓰는 상수. 토큰은 평문 비밀번호가 아니라 서명 페이로드를 담는다(TASK-52).
const PEPPER = "reality-escape-device.auth.v1";

// 서버 프로세스 수명 동안 유지되는 세션 epoch. 로그아웃 시 증가시켜 그 전에 발급된
// 모든 토큰을 서버측에서 무효화한다(서버 재시작 시 자연 초기화 → 전체 로그아웃).
// 주의: 로컬 단일 프로세스 전제. 여러 워커/인스턴스면 공유 저장소가 필요하다.
let sessionEpoch = 0;

export function invalidateAllSessions(): void {
  sessionEpoch += 1;
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
 * 로그인 성공 시 발급하는 서명 토큰: `${exp}.${epoch}.${sig}`.
 *   exp   = 만료 시각(epoch 초) — 서버가 강제(쿠키 위조로도 연장 불가).
 *   epoch = 발급 시점 sessionEpoch — 로그아웃으로 무효화 가능.
 *   sig   = HMAC-SHA256(secret, `${exp}.${epoch}`).
 * SITE_PASSWORD 미설정 시 null.
 */
export function issueToken(): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S;
  const payload = `${exp}.${sessionEpoch}`;
  return `${payload}.${sign(payload, key)}`;
}

/**
 * 토큰 검증: 서명 일치 + 미만료 (+ 옵션으로 현재 epoch 일치).
 * @param checkEpoch 라우트 핸들러(권위 검증)는 true — 로그아웃 무효화를 반영한다.
 *   미들웨어는 false — 런타임 간 epoch 불일치로 정상 토큰을 오거부하지 않게 한다
 *   (권위 있는 fail-closed 검증은 각 라우트의 requireAuth 가 담당).
 */
export function verifyToken(token: string | undefined | null, checkEpoch = true): boolean {
  if (!token) return false;
  const key = secret();
  if (!key) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, epochStr, sig] = parts;
  const expected = sign(`${expStr}.${epochStr}`, key);
  // 상수 시간 비교(길이 다르면 즉시 실패).
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  if (checkEpoch && Number(epochStr) !== sessionEpoch) return false;
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
