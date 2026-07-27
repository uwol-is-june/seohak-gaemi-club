import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, invalidateAllSessions } from "@/lib/auth";

export async function POST() {
  // 서버측 무효화: epoch 를 올려 그전에 발급된 모든 토큰을 죽인다(TASK-52).
  invalidateAllSessions();
  const cookieStore = await cookies();
  // 설정 때와 같은 path 로 삭제해야 일부 클라이언트에서 확실히 지워진다(TASK-69).
  cookieStore.delete({ name: AUTH_COOKIE, path: "/" });
  return NextResponse.json({ ok: true });
}
