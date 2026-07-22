// USD→KRW 환율 라우트. 보유 배너의 통화 토글(TASK-22)에서 사용.
// 무료·무키 API(frankfurter.app, ECB 기준)에서 가져오고, 실패 시 폴백 상수.
// 라우트 핸들러는 기본 비캐시이므로 모듈 메모리에 12시간 캐시한다
// (toss.ts의 토큰 캐시와 동일한 방식).

const FX_API = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW";
const FALLBACK_RATE = 1450; // API 실패 시 대략치. 필요하면 수동으로 갱신.
const TTL_MS = 12 * 60 * 60 * 1000; // 12시간

let cache: { rate: number; source: "api" | "fallback"; asOf: string; expiresAt: number } | null =
  null;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return Response.json({ rate: cache.rate, source: cache.source, asOf: cache.asOf });
  }

  try {
    const res = await fetch(FX_API, { cache: "no-store" });
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.KRW;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error("FX 응답에 KRW 환율이 없습니다.");
    }
    const asOf = typeof data?.date === "string" ? data.date : new Date().toISOString().slice(0, 10);
    cache = { rate, source: "api", asOf, expiresAt: Date.now() + TTL_MS };
    return Response.json({ rate, source: "api", asOf });
  } catch (err) {
    console.error("환율 조회 실패, 폴백 사용:", (err as Error).message);
    // 폴백은 짧게 캐시해 다음 요청에서 실제 API를 다시 시도한다.
    const asOf = new Date().toISOString().slice(0, 10);
    cache = { rate: FALLBACK_RATE, source: "fallback", asOf, expiresAt: Date.now() + 60_000 };
    return Response.json({ rate: FALLBACK_RATE, source: "fallback", asOf });
  }
}
