// Yahoo Finance(무키 v8 chart) 공용 헬퍼 — server-only.
//
// 같은 정규화·같은 메타 파싱이 라우트 4곳(calls·quotes·history·earnings-calendar)에 복사돼 있었다
// (TASK-157). 한쪽만 고치면 같은 티커가 화면마다 다른 심볼로 조회되므로 한 곳에 둔다.
// 캐시 정책은 라우트마다 다르므로(quotes 1분 · calls 매 요청) 여기서는 캐시하지 않는다.

const UA = { "User-Agent": "Mozilla/5.0" } as const;

/**
 * 토스/보고서 티커 → Yahoo 심볼. Yahoo 는 클래스주에 대시를 쓴다(BRK.B / BRK B → BRK-B).
 * tools/score_calls.py · record_call.py 의 to_yahoo_symbol 과 같은 규칙.
 */
export function toYahooSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[.\s]/g, "-");
}

export interface RawQuote {
  price: number | null; // 현재가 (USD)
  prevClose: number | null; // 전일 종가 (USD)
}

/** 현재가 + 전일 종가. 둘 다 같은 chart 메타에 있어 요청 1건이면 된다. 실패는 null 필드로 graceful. */
export async function fetchQuote(ticker: string): Promise<RawQuote> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}?range=1d&interval=1d`,
      { headers: UA, cache: "no-store" }
    );
    if (!res.ok) return { price: null, prevClose: null };
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const prevClose =
      typeof meta?.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta?.previousClose === "number"
          ? meta.previousClose
          : null;
    return { price, prevClose };
  } catch {
    return { price: null, prevClose: null };
  }
}
