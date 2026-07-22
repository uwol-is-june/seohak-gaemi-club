import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function POST(request: Request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { error: "서버에 SITE_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (password !== pw) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

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
