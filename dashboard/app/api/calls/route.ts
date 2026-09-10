// 콜 트랙레코드 라우트 (TASK-38 Phase 3). 원장(data/calls.jsonl)을 파일시스템에서
// 읽어 Yahoo 시세로 채점해 돌려준다. 원장은 git 추적 append-only 단일 소스이고
// 대시보드는 로컬 전용(npm run dev)이라 파일시스템을 직접 읽는다(보고서도 동일).
// (콜의 불변성 원칙: 채점은 매 요청마다 라이브로 하되 원장 값은 절대 수정하지 않는다.)

import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "@/lib/api-auth";
import { BENCHMARK_TICKER, aggregate, dedupeCalls, scoreBenchmark, scoreCall, type RawCall } from "@/lib/calls";
import { mapLimit } from "@/lib/map-limit";

// dev 서버 cwd는 dashboard/ 이지만, 실행 위치에 흔들리지 않게 후보 경로를 순서대로 시도한다.
const LEDGER_CANDIDATES = [
  path.join(process.cwd(), "..", "data", "calls.jsonl"),
  path.join(process.cwd(), "data", "calls.jsonl"),
];

async function readLedger(): Promise<string | null> {
  for (const p of LEDGER_CANDIDATES) {
    try {
      return await readFile(p, "utf-8");
    } catch {
      // 다음 후보 시도
    }
  }
  return null;
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

function toYahooSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[.\s]/g, "-");
}

// 현재가 + 전일 종가. 둘 다 같은 chart 메타에 들어 있어 전일 대비 표시(TASK-97)에
// 추가 요청이 필요 없다. 전일 종가는 표시 전용이고 채점(scoreCall)에는 쓰지 않는다.
// (같은 계산이 /api/quotes 에도 있다 — 그쪽은 daily check 용 별도 캐시 정책을 쓴다.)
async function fetchQuote(ticker: string): Promise<{ price: number | null; prevClose: number | null }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}?range=1d&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
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

// 벤치마크(SPY) 일별 조정종가. 기회비용 채점(TASK-100)의 기준선 —
// "안 샀으면 그 돈이 있었을 곳"이 현금이 아니라 시장이기 때문이다.
// 콜마다 부르지 않고 한 번만 받아 날짜로 조회한다(콜 23건 → 요청 1건).
type BenchmarkSeries = { ts: number[]; closes: number[] };

async function fetchBenchmarkSeries(): Promise<BenchmarkSeries | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${BENCHMARK_TICKER}?range=5y&interval=1d&includeAdjustedClose=true`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const ts: unknown = result?.timestamp;
    const adj: unknown = result?.indicators?.adjclose?.[0]?.adjclose;
    const raw: unknown = result?.indicators?.quote?.[0]?.close;
    const series = Array.isArray(adj) ? adj : Array.isArray(raw) ? raw : null;
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
    return Response.json({ calls: [], aggregate: aggregate([]) });
  }

  // 같은 스킬을 같은 날 다시 돌려 같은 id 가 두 줄 쌓인 경우만 접는다(TASK-104).
  // 같은 날 다른 스킬의 콜은 서로 다른 판단이라 그대로 둔다 — 그 불일치가 논제 충돌 판정의 재료다.
  const calls = dedupeCalls(parseCalls(raw));
  const today = new Date();

  // 티커별로 한 번씩만 시세 조회(중복 콜 절약).
  const tickers = Array.from(new Set(calls.map((c) => c.ticker)));
  // 아웃바운드 동시성 제한(TASK-70). 벤치마크 시계열은 콜 수와 무관하게 1건이라 같이 태운다.
  const [quoteEntries, benchmark] = await Promise.all([
    mapLimit(tickers, 6, async (t) => [t, await fetchQuote(t)] as const),
    fetchBenchmarkSeries(),
  ]);
  const quoteMap = new Map(quoteEntries);
  // 같은 날짜 콜이 여러 건이므로 날짜별로 한 번만 계산해 재사용한다.
  const benchmarkByDate = new Map<string, number | null>();

  const scored = calls
    .map((c) => {
      const q = quoteMap.get(c.ticker);
      const scoredCall = scoreCall(c, q?.price ?? null, today);
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

  return Response.json({ calls: scored, aggregate: aggregate(scored) });
}
