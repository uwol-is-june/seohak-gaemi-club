import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, expectedToken, safeEqual } from "@/lib/auth";

// ─── 간이 브루트포스 억제 (모듈 메모리, 로컬 단일 인스턴스 전용) ──────────
// 실패가 누적되면 잠깐 잠근다. 성공하면 즉시 초기화.
const MAX_FAILS = 5;
const LOCK_MS = 60_000;
let fails = 0;
let lockedUntil = 0;

export async function POST(request: Request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { error: "서버에 SITE_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const now = Date.now();
  if (now < lockedUntil) {
    const secs = Math.ceil((lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `로그인 시도가 너무 많습니다. ${secs}초 후 다시 시도하세요.` },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!safeEqual(password, pw)) {
    fails += 1;
    if (fails >= MAX_FAILS) {
      lockedUntil = Date.now() + LOCK_MS;
      fails = 0;
    }
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  // 성공 → 카운터 초기화.
  fails = 0;
  lockedUntil = 0;

  const token = expectedToken();
  if (!token) {
    return NextResponse.json({ error: "서버 설정 오류." }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
  });

  return NextResponse.json({ ok: true });
}
