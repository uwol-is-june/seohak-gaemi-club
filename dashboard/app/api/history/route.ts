// 티커별 주가 이력 라우트 (TASK-136).
//
// 왜 필요한가: 진입 밴드가 "닿을 만한 가격"인지는 **과거에 그 구간에 왔었는지**로만
// 판단할 수 있다. 체결확률(tools/fill_probability.py)이 이미 그 계산을 하지만
// 화면에는 숫자만 오고 근거가 없었다. 래더 차트가 주가 궤적 위에 밴드를 겹쳐
// 그리려면 이력이 필요하다.
//
// 🔴 **조정 종가(adjclose)를 쓴다.** 미조정 종가로 낙폭을 재면 액면분할이
// -50% 폭락으로 잡힌다. tools/fill_probability.py 와 같은 기준이어야
// 화면의 그림과 원장의 체결확률이 어긋나지 않는다.

import { requireAuth } from "@/lib/api-auth";
import { toYahooSymbol } from "@/lib/yahoo";
import { mapLimit } from "@/lib/map-limit";

export interface HistoryPoint {
  /** epoch 초 */
  t: number;
  /** 조정 종가 (USD) */
  c: number;
}

export interface History {
  ticker: string;
  /** 차트용 다운샘플 시리즈. 비어 있으면 조회 실패. */
  points: HistoryPoint[];
  /** 🔴 **전체 시리즈** 기준 최저/최고. 다운샘플이 저점을 건너뛰어도
   *  "밴드에 닿았나" 판정은 틀리지 않도록 원본에서 계산한다. */
  minClose: number | null;
  maxClose: number | null;
  /** 실제 적용된 범위 */
  range: string;
}

const TTL_MS = 30 * 60 * 1000; // 30분 — 일봉이라 자주 바뀌지 않는다
const MAX_TICKERS = 12; // 차트용이라 한 번에 많이 필요하지 않다
const MAX_POINTS = 160; // 폭 700px 차트에서 이 이상은 점이 겹친다
const ALLOWED_RANGES = new Set(["6mo", "1y", "2y", "5y"]);

const cache = new Map<string, { history: History; expiresAt: number }>();

/** 균등 간격으로 솎되 **첫 점과 마지막 점은 반드시 남긴다**(시작가·현재가가 잘리면 안 된다). */
function downsample(points: HistoryPoint[], max: number): HistoryPoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: HistoryPoint[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

async function fetchHistory(ticker: string, range: string): Promise<History> {
  const key = `${ticker}:${range}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.history;

  const empty: History = { ticker, points: [], minClose: null, maxClose: null, range };
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}` +
        `?range=${range}&interval=1d&includeAdjustedClose=true`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`history ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const stamps: unknown = result?.timestamp;
    // 조정 종가가 없으면 미조정 종가로 폴백한다 — 없는 것보다는 낫지만
    // 분할이 섞이면 낙폭이 과장되므로 우선순위는 조정 종가다.
    const series: unknown =
      result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close;

    if (!Array.isArray(stamps) || !Array.isArray(series)) throw new Error("shape");

    const all: HistoryPoint[] = [];
    for (let i = 0; i < stamps.length; i++) {
      const t = stamps[i];
      const c = series[i];
      // Yahoo는 휴장일·데이터 결손을 null 로 준다 — 그대로 그리면 선이 0으로 떨어진다.
      if (typeof t === "number" && typeof c === "number" && Number.isFinite(c)) all.push({ t, c });
    }
    if (all.length === 0) throw new Error("empty");

    const closes = all.map((p) => p.c);
    const history: History = {
      ticker,
      points: downsample(all, MAX_POINTS),
      minClose: Math.min(...closes),
      maxClose: Math.max(...closes),
      range,
    };
    cache.set(key, { history, expiresAt: Date.now() + TTL_MS });
    return history;
  } catch {
    return empty;
  }
}

export async function GET(request: Request) {
  // 심층방어: proxy.ts 미들웨어 + 라우트 내 인증(TASK-23).
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const rawRange = searchParams.get("range") ?? "2y";
  const range = ALLOWED_RANGES.has(rawRange) ? rawRange : "2y";

  const tickers = Array.from(
    new Set(
      (searchParams.get("tickers") ?? "")
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, MAX_TICKERS);

  if (tickers.length === 0) return Response.json({ histories: [] });

  // 아웃바운드 동시성 제한 — 한꺼번에 쏘면 Yahoo가 막는다(quotes 라우트와 같은 이유).
  const histories = await mapLimit(tickers, 4, (t: string) => fetchHistory(t, range));
  return Response.json({ histories });
}
