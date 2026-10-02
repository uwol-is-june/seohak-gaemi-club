// 콜 트랙레코드 라우트 (TASK-38 Phase 3). 원장(data/calls.jsonl)을 파일시스템에서
// 읽어 Yahoo 시세로 채점해 돌려준다. 원장은 git 추적 append-only 단일 소스이고
// 대시보드는 로컬 전용(npm run dev)이라 파일시스템을 직접 읽는다(보고서도 동일).
// (콜의 불변성 원칙: 채점은 매 요청마다 라이브로 하되 원장 값은 절대 수정하지 않는다.)

import { readFile } from "node:fs/promises";
import { requireAuth } from "@/lib/api-auth";
import {
  BENCHMARK_TICKER,
  aggregate,
  dedupeCalls,
  scoreBenchmark,
  scoreCall,
  type ClosePoint,
  type RawCall,
} from "@/lib/calls";
import { mapLimit } from "@/lib/map-limit";
import { repoPath } from "@/lib/repo-root";
import { createTtlCache } from "@/lib/ttl-cache";
import { fetchQuote, toYahooSymbol, type RawQuote } from "@/lib/yahoo";

// Yahoo 응답 캐시(TASK-169). 원장은 매 요청 새로 읽으므로 새 콜은 즉시 보이고,
// 재사용하는 건 외부 시세뿐이다. 실패는 저장하지 않고 직전 성공값으로 폴백한다.
const quoteCache = createTtlCache<RawQuote>(60 * 1000, (q) => q.price != null); // 1분 — quotes 라우트와 동일
const historyCache = createTtlCache<ClosePoint[] | null>(30 * 60 * 1000, (h) => h != null); // 30분 — 일봉
const benchmarkCache = createTtlCache<BenchmarkSeries | null>(30 * 60 * 1000, (s) => s != null);

// 브라우저 휴리스틱 캐시가 이전 채점을 재사용하지 않게 한다(reports 라우트와 동일).
const NO_STORE = { "Cache-Control": "no-store" } as const;

// 원장 경로는 repoPath() 로 푼다(TASK-157) — 보고서·설정과 같은 루트 해석을 써야
// 실행 위치가 바뀌어도 한쪽만 못 찾는 일이 없다.
async function readLedger(): Promise<string | null> {
  try {
    return await readFile(repoPath("data", "calls.jsonl"), "utf-8");
  } catch {
    return null;
  }
}

// jsonl 파싱 — 깨진 줄은 건너뛴다(원장 전체를 못 읽는 것보다 낫다).
function parseCalls(raw: string): RawCall[] {
  const calls: RawCall[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj.ticker === "string" && typeof obj.priceAtCall === "number") {
        calls.push(obj as RawCall);
      }
    } catch {
      // 손상된 줄 무시
    }
  }
  return calls;
}

// 콜 이후 일별 종가 — hold 터치·호라이즌 동결 판정용(TASK-141). 티커의 가장 이른 콜부터 받는다.
// 미조정 종가(quote.close)를 쓴다: priceAtCall 이 미조정 시세이고 fill_probability.py 도 같은 값을 본다.
// 실패하면 null — scoreCall 이 현재가만으로 폴백한다(tools/score_calls.py fetch_close_history 와 동일).
async function fetchCloseHistory(ticker: string, since: string): Promise<ClosePoint[] | null> {
  const start = Date.parse(`${since}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  const period1 = Math.floor(start / 1000);
  const period2 = Math.floor(Date.now() / 1000) + 86_400;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}?period1=${period1}&period2=${period2}&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const ts: unknown = result?.timestamp;
    const closes: unknown = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(ts) || !Array.isArray(closes)) return null;
    const out: ClosePoint[] = [];
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      const c = closes[i];
      if (typeof t === "number" && typeof c === "number" && Number.isFinite(c)) {
        out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: c });
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

// 벤치마크(SPY) 일별 **미조정** 종가. 기회비용 채점(TASK-100)의 기준선 —
// "안 샀으면 그 돈이 있었을 곳"이 현금이 아니라 시장이기 때문이다.
// 콜마다 부르지 않고 한 번만 받아 날짜로 조회한다(콜 23건 → 요청 1건).
// 🔴 종목이 미조정 가격이라 SPY 도 미조정(가격수익률)으로 맞춘다(TASK-152). SPY 만 배당조정이면
// SPY 수익률이 연 ~1.3%p 부풀어 hold/avoid 쪽으로 채점이 기운다. tools/score_calls.py 와 같은 기준.
type BenchmarkSeries = { ts: number[]; closes: number[] };

async function fetchBenchmarkSeries(): Promise<BenchmarkSeries | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${BENCHMARK_TICKER}?range=5y&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const ts: unknown = result?.timestamp;
    const raw: unknown = result?.indicators?.quote?.[0]?.close;
    const series = Array.isArray(raw) ? raw : null;
    if (!Array.isArray(ts) || !series || ts.length !== series.length) return null;

    // 결측 종가(휴장·데이터 공백)는 버린다 — 그대로 두면 인덱스가 어긋난다.
    const outTs: number[] = [];
    const outClose: number[] = [];
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      const c = series[i];
      if (typeof t === "number" && typeof c === "number" && Number.isFinite(c)) {
        outTs.push(t);
        outClose.push(c);
      }
    }
    return outTs.length >= 2 ? { ts: outTs, closes: outClose } : null;
  } catch {
    return null;
  }
}

/**
 * 콜 시점부터 지금까지의 벤치마크 수익률(%).
 * 콜 당일이 휴장이면 **직전 거래일** 종가를 쓴다(그날 살 수 있었던 마지막 가격).
 * 시계열 시작보다 오래된 콜은 기준선이 없으므로 null — 0 으로 뭉개지 않는다.
 */
function benchmarkReturnSince(series: BenchmarkSeries | null, callDate: string): number | null {
  if (!series) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(callDate) ? Date.parse(`${callDate}T23:59:59Z`) : NaN;
  if (Number.isNaN(parsed)) return null;
  const cutoff = parsed / 1000;

  let idx = -1;
  for (let i = series.ts.length - 1; i >= 0; i--) {
    if (series.ts[i] <= cutoff) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null; // 콜이 시계열보다 이전 — 비교 불가

  const at = series.closes[idx];
  const now = series.closes[series.closes.length - 1];
  if (!(at > 0)) return null;
  return ((now - at) / at) * 100;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const raw = await readLedger();
  if (raw == null) {
    // 원장 파일이 아직 없으면 빈 상태로(에러 아님) — 콜이 기록되면 채워진다.
    return Response.json({ calls: [], aggregate: aggregate([]) }, { headers: NO_STORE });
  }

  // 같은 스킬을 같은 날 다시 돌려 같은 id 가 두 줄 쌓인 경우만 접는다(TASK-104).
  // 같은 날 다른 스킬의 콜은 서로 다른 판단이라 그대로 둔다 — 그 불일치가 논제 충돌 판정의 재료다.
  const calls = dedupeCalls(parseCalls(raw));
  const today = new Date();

  // 티커별로 한 번씩만 시세 조회(중복 콜 절약).
  const tickers = Array.from(new Set(calls.map((c) => c.ticker)));
  // 아웃바운드 동시성 제한(TASK-70). 벤치마크 시계열은 콜 수와 무관하게 1건이라 같이 태운다.
  const firstDate = new Map<string, string>();
  for (const c of calls) {
    const prev = firstDate.get(c.ticker);
    if (!prev || c.date < prev) firstDate.set(c.ticker, c.date);
  }
  const [quoteEntries, pathEntries, benchmark] = await Promise.all([
    mapLimit(tickers, 6, async (t) => [t, await quoteCache.get(t, () => fetchQuote(t))] as const),
    mapLimit(tickers, 6, async (t) => {
      const since = firstDate.get(t) ?? "";
      // 키에 시작일을 넣는다 — 더 이른 콜이 추가되면 이력을 새로 받아야 한다.
      return [t, await historyCache.get(`${t}:${since}`, () => fetchCloseHistory(t, since))] as const;
    }),
    benchmarkCache.get(BENCHMARK_TICKER, fetchBenchmarkSeries),
  ]);
  const quoteMap = new Map(quoteEntries);
  const pathMap = new Map(pathEntries);
  // 같은 날짜 콜이 여러 건이므로 날짜별로 한 번만 계산해 재사용한다.
  const benchmarkByDate = new Map<string, number | null>();

  const scored = calls
    .map((c) => {
      const q = quoteMap.get(c.ticker);
      const scoredCall = scoreCall(c, q?.price ?? null, today, pathMap.get(c.ticker));
      // 전일 대비는 채점 뒤에 얹는다 — scoreCall 의 입출력을 건드리지 않아야
      // tools/score_calls.py 와의 파리티 테스트가 그대로 유효하다.
      const price = q?.price ?? null;
      const prevClose = q?.prevClose ?? null;
      const dayChange = price != null && prevClose != null ? price - prevClose : null;
      if (!benchmarkByDate.has(c.date)) {
        benchmarkByDate.set(c.date, benchmarkReturnSince(benchmark, c.date));
      }
      const bmReturn = benchmarkByDate.get(c.date) ?? null;

      return {
        ...scoredCall,
        prevClose,
        dayChange,
        dayChangePct:
          dayChange != null && prevClose != null && prevClose !== 0
            ? (dayChange / prevClose) * 100
            : null,
        ...scoreBenchmark(scoredCall, bmReturn),
      };
    })
    // 최신 콜이 위로. 같은 날짜면 recordedAt(기록 시각) 최신순으로 확정 —
    // 종목당 최신 콜을 접을 때 같은 날 콜의 순서가 안정적이어야 한다.
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const ra = a.recordedAt ?? "";
      const rb = b.recordedAt ?? "";
      return ra < rb ? 1 : ra > rb ? -1 : 0;
    });

  return Response.json({ calls: scored, aggregate: aggregate(scored) }, { headers: NO_STORE });
}
