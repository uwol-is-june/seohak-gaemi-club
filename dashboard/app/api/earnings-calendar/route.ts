// 티커별 다음 실적 발표 예정일 라우트. 실적 점검 탭에서 "언제 실적을 점검할지"
// (보유 종목의 다가오는 실적일 D-day)를 안내하는 데 쓴다.
//
// quotes 라우트(Yahoo v8 chart, 무키)와 달리 실적일은 quoteSummary/calendarEvents
// 모듈에서 나오며, 이 엔드포인트는 crumb+cookie 인증을 요구한다(2024년 이후 강화).
// 그래서 (1) fc.yahoo.com에서 쿠키를 받고 (2) getcrumb으로 crumb을 받은 뒤
// (3) 그 자격으로 quoteSummary를 호출한다. 실패는 date=null로 graceful degrade —
// 화면은 "발표일 미상"으로 표시하고 앱은 계속 동작한다.

import { requireAuth } from "@/lib/api-auth";
import { mapLimit } from "@/lib/map-limit";

interface EarningsInfo {
  ticker: string;
  date: string | null; // 다음(또는 최근) 실적 발표일 "YYYY-MM-DD", 불명 시 null
  epochMs: number | null; // 같은 값의 epoch(ms) — 화면에서 D-day 계산용
  // Yahoo가 확정일 대신 추정 범위(예: "Feb 1 – Feb 5")로 준 경우 true.
  // 이때 date는 범위의 시작일이다. 확정 임박할수록 단일 확정일로 바뀐다.
  estimate: boolean;
}

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

// calendarEvents.earnings.earningsDate → EarningsInfo.
// earningsDate는 [{raw, fmt}] 배열: 길이 1이면 확정에 가깝고, 2면 추정 범위다.
function parseEarnings(ticker: string, json: unknown): EarningsInfo {
  const empty: EarningsInfo = { ticker, date: null, epochMs: null, estimate: false };
  try {
    const result = (json as { quoteSummary?: { result?: unknown[] } })?.quoteSummary?.result?.[0];
    const earnings = (
      result as {
        calendarEvents?: {
          earnings?: { earningsDate?: { raw?: number }[]; isEarningsDateEstimate?: boolean };
        };
      }
    )?.calendarEvents?.earnings;
    const arr = earnings?.earningsDate;
    if (!Array.isArray(arr) || arr.length === 0) return empty;
    const raws = arr.map((d) => d?.raw).filter((n): n is number => typeof n === "number");
    if (raws.length === 0) return empty;
    const first = Math.min(...raws); // 범위면 가장 이른 날
    // Yahoo의 명시적 추정 플래그를 우선 사용하고, 없으면 범위(배열 길이>1)로 추론.
    const est = earnings?.isEarningsDateEstimate;
    return {
      ticker,
      date: new Date(first * 1000).toISOString().slice(0, 10),
      epochMs: first * 1000,
      estimate: typeof est === "boolean" ? est : raws.length > 1,
    };
  } catch {
    return empty;
  }
}

async function fetchEarnings(ticker: string): Promise<EarningsInfo> {
  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) return cached.info;

  const empty: EarningsInfo = { ticker, date: null, epochMs: null, estimate: false };
  const c = await getCreds();
  if (!c) return empty;

  try {
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(toYahooSymbol(ticker))}` +
      `?modules=calendarEvents&crumb=${encodeURIComponent(c.crumb)}`;
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
    // 유효한 날짜를 얻었을 때만 캐시(일시 실패를 6시간 고정하지 않도록).
    if (info.date != null) cache.set(ticker, { info, expiresAt: Date.now() + TTL_MS });
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
