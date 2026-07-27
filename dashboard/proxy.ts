import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// 로그인 없이 접근 가능한 경로 (로그인 화면 + 인증 API)
const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // 인증됨 → 통과. 미들웨어는 epoch 를 검사하지 않는다(런타임 간 epoch 불일치로 정상
  // 토큰을 오거부하지 않기 위해) — 로그아웃 무효화는 각 라우트 requireAuth 가 강제한다.
  if (verifyToken(token, false)) {
    return NextResponse.next();
  }

  // 미인증 API 요청 → 401 (리다이렉트 대신)
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 미인증 페이지 요청 → 로그인 화면으로
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 자원은 제외하고 모든 경로에 적용 (/api 포함 → API도 보호)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
