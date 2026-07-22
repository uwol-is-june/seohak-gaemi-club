import { createHash, timingSafeEqual } from "node:crypto";

// 로그인 쿠키 이름
export const AUTH_COOKIE = "dash_auth";

// 쿠키에 평문 비밀번호 대신 해시 토큰을 저장한다.
// 클라이언트가 쿠키를 위조(dash_auth=1 등)해도 통과하지 못하도록,
// SITE_PASSWORD를 아는 사람만 만들 수 있는 sha256 해시를 사용.
const PEPPER = "reality-escape-device.auth.v1";

/**
 * SITE_PASSWORD로부터 기대 토큰(해시)을 계산한다.
 * SITE_PASSWORD가 설정돼 있지 않으면 null → 아무도 통과 못 함(fail-closed).
 */
export function expectedToken(): string | null {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(pw + PEPPER).digest("hex");
}

/**
 * 두 비밀 문자열을 상수 시간에 비교한다 (타이밍 공격 방지).
 * 길이 차이로 인한 조기 종료도 막기 위해 양쪽을 먼저 sha256(32B)로 해시한 뒤 비교.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
