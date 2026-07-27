import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "./auth";

/**
 * 라우트 핸들러 공통 인증 가드 (심층방어).
 *
 * proxy.ts 미들웨어가 이미 /api/* 를 보호하지만, Next.js 문서 권고대로
 * "Proxy를 인가 유일 수단으로 쓰지 않고" 각 라우트에서도 직접 검증한다.
 * matcher 수정·리네임·라우팅 특이케이스로 미들웨어가 빠져도 fail-closed.
 *
 * 인증 실패 시 401 Response를 반환하고, 성공 시 null을 반환한다.
 * 사용: `const unauth = await requireAuth(); if (unauth) return unauth;`
 */
export async function requireAuth(): Promise<Response | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE)?.value;
  // 권위 있는 검증: 서명 + 만료 + 현재 epoch(로그아웃 무효화 반영).
  if (!verifyToken(cookie)) {
    return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return null;
}
