// 티커별 실적 발표일 라우트. 실적 점검 탭에서 "언제 실적을 점검할지"
// (다가오는 실적일 D-day)와 "지금 점검해야 할 것"(직전 발표일 D+day)을 안내한다.
//
// 🔴 두 모듈이 필요한 이유: calendarEvents 는 **다음 예정일만** 준다 — 실적이 지나가면
// 그 날짜가 다음 분기로 즉시 갱신돼 방금 끝난 실적이 화면에서 사라진다(실측 2026-08-06:
// AAPL 은 07-30 발표 직후 D-84(10-29)로 넘어갔다). 정작 점검은 발표 **직후**에 하는 것이라
// 이게 제일 필요한 순간에 사라지는 셈이다. 그래서 earnings 모듈의
// earningsChart.quarterly[].reportedDate(실제 발표 이력)에서 직전 발표일을 함께 가져온다.
//
// quotes 라우트(Yahoo v8 chart, 무키)와 달리 실적일은 quoteSummary/calendarEvents
// 모듈에서 나오며, 이 엔드포인트는 crumb+cookie 인증을 요구한다(2024년 이후 강화).
// 그래서 (1) fc.yahoo.com에서 쿠키를 받고 (2) getcrumb으로 crumb을 받은 뒤
// (3) 그 자격으로 quoteSummary를 호출한다. 실패는 date=null로 graceful degrade —
// 화면은 "발표일 미상"으로 표시하고 앱은 계속 동작한다.

import { requireAuth } from "@/lib/api-auth";
import { mapLimit } from "@/lib/map-limit";
// 응답 타입·파서는 화면과 공유한다(lib/earnings-day.ts, 테스트도 거기 붙어 있다).
import { emptyEarnings, parseEarnings, type EarningsInfo } from "@/lib/earnings-day";

const TTL_MS = 6 * 60 * 60 * 1000; // 6시간 — 실적일은 자주 바뀌지 않는다
const MAX_TICKERS = 50;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const cache = new Map<string, { info: EarningsInfo; expiresAt: number }>();

// crumb+cookie는 한 번 받아 재사용한다(호출마다 받으면 느리고 차단당하기 쉽다).
let creds: { cookie: string; crumb: string; expiresAt: number } | null = null;
const CREDS_TTL_MS = 60 * 60 * 1000; // 1시간

function toYahooSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[.\s]/g, "-");
}

// Yahoo 쿠키 + crumb 획득. 실패 시 null(→ 호출부는 date=null로 graceful).
async function getCreds(): Promise<{ cookie: string; crumb: string } | null> {
  if (creds && creds.expiresAt > Date.now()) return creds;
  try {
    // 1) 쿠키 획득. fc.yahoo.com은 404를 주기도 하지만 Set-Cookie는 내려준다.
    const cRes = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": UA },
      redirect: "manual",
      cache: "no-store",
    });
    const setCookies = cRes.headers.getSetCookie?.() ?? [];
    const cookie = setCookies.map((s) => s.split(";")[0]).filter(Boolean).join("; ");
    if (!cookie) return null;

    // 2) crumb 획득(위 쿠키 필요). 성공 시 짧은 토큰 문자열, 실패 시 HTML/빈 문자열.
    const crRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookie },
      cache: "no-store",
    });
    const crumb = (await crRes.text()).trim();
    if (!crumb || crumb.length > 40 || crumb.includes("<")) return null;

    creds = { cookie, crumb, expiresAt: Date.now() + CREDS_TTL_MS };
    return creds;
  } catch {
    return null;
  }
}

async function fetchEarnings(ticker: string): Promise<EarningsInfo> {
  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) return cached.info;

  const empty = emptyEarnings(ticker);
  const c = await getCreds();
  if (!c) return empty;

  try {
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(toYahooSymbol(ticker))}` +
      `?modules=calendarEvents,earnings&crumb=${encodeURIComponent(c.crumb)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: c.cookie },
      cache: "no-store",
    });
    if (res.status === 401) {
      // crumb 만료 — 다음 호출에서 재발급하도록 무효화.
      creds = null;
      return empty;
    }
    if (!res.ok) throw new Error(`quoteSummary ${res.status}`);
    const info = parseEarnings(ticker, await res.json());
    // 유효한 날짜를 하나라도 얻었을 때만 캐시(일시 실패를 6시간 고정하지 않도록).
    if (info.date != null || info.lastDate != null) {
      cache.set(ticker, { info, expiresAt: Date.now() + TTL_MS });
    }
    return info;
  } catch {
    return empty;
  }
}

export async function GET(request: Request) {
  // 금융/보유 데이터와 함께 쓰이므로 로그인 쿠키를 검증한다(quotes 라우트와 동일).
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("tickers") ?? "";
  const tickers = Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, MAX_TICKERS);

  if (tickers.length === 0) return Response.json({ earnings: [] });

  // 아웃바운드 동시성 제한(TASK-70).
  const earnings = await mapLimit(tickers, 6, fetchEarnings);
  return Response.json({ earnings });
}
