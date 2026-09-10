// 콜 트랙레코드 라우트 (TASK-38 Phase 3). 원장(data/calls.jsonl)을 파일시스템에서
// 읽어 Yahoo 시세로 채점해 돌려준다. 원장은 git 추적 append-only 단일 소스이고
// 대시보드는 로컬 전용(npm run dev)이라 파일시스템을 직접 읽는다(보고서도 동일).
// (콜의 불변성 원칙: 채점은 매 요청마다 라이브로 하되 원장 값은 절대 수정하지 않는다.)

import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "@/lib/api-auth";
import { aggregate, scoreCall, type RawCall } from "@/lib/calls";
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

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const raw = await readLedger();
  if (raw == null) {
    // 원장 파일이 아직 없으면 빈 상태로(에러 아님) — 콜이 기록되면 채워진다.
    return Response.json({ calls: [], aggregate: aggregate([]) });
  }

  const calls = parseCalls(raw);
  const today = new Date();

  // 티커별로 한 번씩만 시세 조회(중복 콜 절약).
  const tickers = Array.from(new Set(calls.map((c) => c.ticker)));
  // 아웃바운드 동시성 제한(TASK-70).
  const quoteEntries = await mapLimit(tickers, 6, async (t) => [t, await fetchQuote(t)] as const);
  const quoteMap = new Map(quoteEntries);

  const scored = calls
    .map((c) => {
      const q = quoteMap.get(c.ticker);
      const scoredCall = scoreCall(c, q?.price ?? null, today);
      // 전일 대비는 채점 뒤에 얹는다 — scoreCall 의 입출력을 건드리지 않아야
      // tools/score_calls.py 와의 파리티 테스트가 그대로 유효하다.
      const price = q?.price ?? null;
      const prevClose = q?.prevClose ?? null;
      const dayChange = price != null && prevClose != null ? price - prevClose : null;
      return {
        ...scoredCall,
        prevClose,
        dayChange,
        dayChangePct:
          dayChange != null && prevClose != null && prevClose !== 0
            ? (dayChange / prevClose) * 100
            : null,
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
