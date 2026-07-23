import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, expectedToken, safeEqual } from "@/lib/auth";

// ─── 간이 브루트포스 억제 (모듈 메모리, 로컬 단일 인스턴스 전용) ──────────
// 실패가 누적되면 잠깐 잠근다. 성공하면 즉시 초기화.
// 카운터는 요청자(IP)별로 분리한다 — 전역 카운터면 미인증 요청자가 5회 실패로
// 정당 사용자를 락아웃시킬 수 있으므로.
const MAX_FAILS = 5;
const LOCK_MS = 60_000;
type Attempt = { fails: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();

// 프록시 헤더에서 클라이언트 식별자를 뽑는다. 없으면 로컬 단일 키로 폴백.
function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export async function POST(request: Request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { error: "서버에 SITE_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const key = clientKey(request);
  const now = Date.now();
  const rec = attempts.get(key) ?? { fails: 0, lockedUntil: 0 };
  if (now < rec.lockedUntil) {
    const secs = Math.ceil((rec.lockedUntil - now) / 1000);
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
    rec.fails += 1;
    if (rec.fails >= MAX_FAILS) {
      rec.lockedUntil = Date.now() + LOCK_MS;
      rec.fails = 0;
    }
    attempts.set(key, rec);
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  // 성공 → 해당 요청자 카운터 제거.
  attempts.delete(key);

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
