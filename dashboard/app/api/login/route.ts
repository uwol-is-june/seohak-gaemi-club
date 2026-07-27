import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_MAX_AGE_S, issueToken, safeEqual } from "@/lib/auth";

// ─── 간이 브루트포스 억제 (모듈 메모리, 로컬 단일 인스턴스 전용) ──────────
// 요청자(IP)별 카운터 + 전역 카운터를 함께 둔다:
//  - 요청자별: 전역만 있으면 미인증 요청자 1명이 정당 사용자를 락아웃시킬 수 있음.
//  - 전역:     x-forwarded-for 는 클라이언트가 조작·회전할 수 있어(키를 매 요청 바꾸면
//              요청자별 제한을 무력화) 요청자별 제한만으론 무제한 추측이 가능하다.
//              전역 실패 상한으로 총 시도 횟수 자체를 묶는다(TASK-49).
const MAX_FAILS = 5; // 요청자별 연속 실패 허용치
const BASE_LOCK_MS = 60_000; // 첫 잠금 60초, 이후 지수 증가(TASK-70)
const MAX_LOCK_MS = 60 * 60_000; // 잠금 상한 1시간
const GLOBAL_MAX_FAILS = 50; // 창(window) 내 전역 실패 허용치
const GLOBAL_WINDOW_MS = 10 * 60_000; // 전역 카운터 창 10분
const MAX_TRACKED_KEYS = 1_000; // Map 무한 증식(키 회전) 방지

type Attempt = { fails: number; lockedUntil: number; lockCount: number; seen: number };
const attempts = new Map<string, Attempt>();

let globalFails = 0;
let globalWindowStart = 0;
let globalLockedUntil = 0;

// 프록시 헤더에서 클라이언트 식별자를 뽑는다. 없으면 로컬 단일 키로 폴백.
// 주의: x-forwarded-for 는 신뢰할 수 없다(조작 가능) — 전역 상한이 실질 방어선이다.
function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

// 오래된/해제된 항목을 정리해 Map 이 무한히 커지지 않게 한다(키 회전 공격 대비).
function pruneAttempts(now: number) {
  if (attempts.size <= MAX_TRACKED_KEYS) return;
  for (const [k, v] of attempts) {
    if (v.lockedUntil < now && v.fails === 0) attempts.delete(k);
  }
  if (attempts.size > MAX_TRACKED_KEYS) {
    // 그래도 넘치면 가장 오래 안 쓰인 것부터 제거.
    const sorted = [...attempts.entries()].sort((a, b) => a[1].seen - b[1].seen);
    for (let i = 0; i < sorted.length && attempts.size > MAX_TRACKED_KEYS; i++) {
      attempts.delete(sorted[i][0]);
    }
  }
}

const tooMany = (secs: number) =>
  NextResponse.json(
    { error: `로그인 시도가 너무 많습니다. ${secs}초 후 다시 시도하세요.` },
    { status: 429 }
  );

export async function POST(request: Request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { error: "서버에 SITE_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const now = Date.now();

  // 전역 잠금 우선 확인 — 헤더 회전으로도 우회 불가.
  if (now < globalLockedUntil) {
    return tooMany(Math.ceil((globalLockedUntil - now) / 1000));
  }

  const key = clientKey(request);
  const rec = attempts.get(key) ?? { fails: 0, lockedUntil: 0, lockCount: 0, seen: now };
  rec.seen = now;
  if (now < rec.lockedUntil) {
    return tooMany(Math.ceil((rec.lockedUntil - now) / 1000));
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!safeEqual(password, pw)) {
    // 요청자별 카운터 — 잠금 때마다 잠금 시간을 지수적으로 늘린다(TASK-70).
    rec.fails += 1;
    if (rec.fails >= MAX_FAILS) {
      rec.lockCount += 1;
      rec.lockedUntil = now + Math.min(BASE_LOCK_MS * 2 ** (rec.lockCount - 1), MAX_LOCK_MS);
      rec.fails = 0;
    }
    attempts.set(key, rec);
    pruneAttempts(now);

    // 전역 카운터(창 기반) — 총 시도 횟수 상한.
    if (now - globalWindowStart > GLOBAL_WINDOW_MS) {
      globalWindowStart = now;
      globalFails = 1;
    } else {
      globalFails += 1;
    }
    if (globalFails >= GLOBAL_MAX_FAILS) {
      globalLockedUntil = now + BASE_LOCK_MS;
      globalFails = 0;
    }

    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  // 성공 → 해당 요청자 카운터 제거.
  attempts.delete(key);

  const token = issueToken();
  if (!token) {
    return NextResponse.json({ error: "서버 설정 오류." }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });

  return NextResponse.json({ ok: true });
}
