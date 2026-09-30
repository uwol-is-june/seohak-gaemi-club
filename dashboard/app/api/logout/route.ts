import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, invalidateAllSessions, verifyToken } from "@/lib/auth";

// /api/logout 은 proxy.ts 의 공개 경로다(만료된 세션도 쿠키는 지울 수 있어야 한다).
// 🔴 그래서 전역 무효화는 **유효 토큰을 가진 요청에만** 한다(TASK-145) — 아니면 다른 사이트의
// 폼 POST 한 번(CSRF)으로 모든 세션이 죽는다. SameSite 쿠키가 막아주더라도 Origin 을 한 번 더 본다.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // 동일 출처 fetch 는 Origin 을 생략하기도 한다 — 토큰 검사가 1차 방어선
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (sameOrigin(request) && verifyToken(token)) {
    // 서버측 무효화: 세션 태그를 새로 뽑아 그전에 발급된 모든 토큰을 죽인다(TASK-52).
    invalidateAllSessions();
  }
  // 설정 때와 같은 path 로 삭제해야 일부 클라이언트에서 확실히 지워진다(TASK-69).
  cookieStore.delete({ name: AUTH_COOKIE, path: "/" });
  return NextResponse.json({ ok: true });
}
