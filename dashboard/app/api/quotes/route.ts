// 티커별 당일 등락 시세 라우트. Daily check(TASK-29)에서 pulse 대상 선별에 사용.
// 토스 holdings의 profitLossPct는 '평균 매입가 대비 누적 손익률'이라 당일 등락을
// 알 수 없으므로, 무키 시세 API(Yahoo v8 chart)에서 현재가 + 전일 종가를 가져와
// 당일 등락률을 계산한다. 라우트 핸들러는 기본 비캐시이므로 모듈 메모리에 짧게
// 캐시한다(fx 라우트와 동일 방식).

import { requireAuth } from "@/lib/api-auth";

interface Quote {
  ticker: string;
  price: number | null; // 현재가 (USD)
  prevClose: number | null; // 전일 종가 (USD)
  changePct: number | null; // 당일 등락률 (%), 계산 불가 시 null
}

const TTL_MS = 60 * 1000; // 1분 — 온디맨드 버튼용이라 짧게
const MAX_TICKERS = 50;
const cache = new Map<string, { quote: Quote; expiresAt: number }>();

// 토스/보고서 티커 → Yahoo 심볼 형식으로 정규화.
// Yahoo는 클래스주에 대시를 쓴다(BRK.B/BRK B → BRK-B). 대소문자·공백 정리 포함.
function toYahooSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[.\s]/g, "-");
}

// 티커 하나의 시세를 Yahoo chart 메타에서 뽑아 온다. 실패는 null 필드로 graceful.
async function fetchQuote(ticker: string): Promise<Quote> {
  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const empty: Quote = { ticker, price: null, prevClose: null, changePct: null };
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}?range=1d&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`quote ${res.status}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const prevClose =
      typeof meta?.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta?.previousClose === "number"
          ? meta.previousClose
          : null;
    const changePct =
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null;
    const quote: Quote = { ticker, price, prevClose, changePct };
    // 유효값을 얻었을 때만 캐시(일시적 실패를 1분 고정하지 않도록).
    if (changePct != null) cache.set(ticker, { quote, expiresAt: Date.now() + TTL_MS });
    return quote;
  } catch {
    return empty;
  }
}

export async function GET(request: Request) {
  // 심층방어: proxy.ts 미들웨어 + 라우트 내 인증(TASK-23).
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

  if (tickers.length === 0) {
    return Response.json({ quotes: [] });
  }

  const quotes = await Promise.all(tickers.map(fetchQuote));
  return Response.json({ quotes });
}
