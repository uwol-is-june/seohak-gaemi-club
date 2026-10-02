// 실험실 라우트 (TASK-186) — '이번 주 추천 종목' 탭의 데이터 한 벌.
//
//   data/_lab/screen-*.json  — tools/lab_screen.py 의 주간 기계 순위(가장 최근 것 + 후보 이탈 판정용 이력)
//   data/lab-calls.jsonl     — tools/lab_record.py 의 실험실 판단 기록부(픽·대조군·없음·수락)
//   data/calls.jsonl         — 기존 시스템 판단. **읽기만** 한다(픽 카드의 일치/엇갈림 배지용)
//
// 실험실은 기존 시스템과 독립이라 기존 판단 기록부에 쓰지도, 기존 채점에 섞이지도 않는다.

import { readdir, readFile, stat } from "node:fs/promises";
import { requireAuth } from "@/lib/api-auth";
import type { ClosePoint } from "@/lib/calls";
import {
  cumulativeSeries,
  extractCautions,
  groupStats,
  parseLabRows,
  scoreLabCall,
  type LabCall,
  type LabDecision,
  type LabNone,
  type LabRepeat,
  type ScreenMark,
} from "@/lib/lab";
import { mapLimit } from "@/lib/map-limit";
import { repoPath } from "@/lib/repo-root";
import { createTtlCache } from "@/lib/ttl-cache";
import { toYahooSymbol } from "@/lib/yahoo";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const BENCHMARK = "SPY";
const TOP_N = 10;

// 깔때기 단계 ↔ 제외 사유 코드 (LAB-SPEC 3절). score_missing 은 순위 계산 뒤 E7 단계에서 함께 빠진다.
const STEP_OF_CODE: Record<string, string> = {
  sector: "E1",
  no_data: "E2",
  stale: "E3",
  short_history: "E4",
  fcf_negative: "E5",
  momentum: "E6",
  upside: "E7",
  score_missing: "E7",
};

const historyCache = createTtlCache<ClosePoint[] | null>(30 * 60 * 1000, (h) => h != null);
// 스크리닝 파일은 실행 후 바뀌지 않는다 — 파일명+mtime 으로 파싱 결과를 재사용한다.
const screenCache = new Map<string, { mtime: number; data: ScreenFile }>();

type StockRow = {
  ticker: string;
  name: string;
  sector: string;
  excluded: { code: string; detail: string } | null;
  metrics: Record<string, unknown> & {
    price?: number;
    target?: number | null;
    upside?: number | null;
    momentum?: number;
    yieldNow?: number | null;
    medianYield?: number | null;
    spinoffSuspect?: { date: string; ratio: number }[];
    imputed?: string[];
    historyYears?: number;
    latestPeriodEnd?: string;
  };
  score?: { quality: number; value: number; total: number; qualityGauge: number; valueGauge: number };
  rank?: number;
  plan?: { target: number; stopLoss: number; horizonMonths: number };
};

type ScreenFile = {
  ruleVersion: string;
  runDate: string;
  generatedAt: string;
  universe: { source: string; fetchedAt: string; count: number };
  coverage: { afterSector: number; historyOk: number };
  funnel: { step: string; code?: string; label?: string; remaining: number }[];
  momentumCut: number | null;
  candidates: string[];
  control: { ticker: string; seed: number } | null;
  nearMiss: string | null;
  stocks: Record<string, StockRow>;
};

async function readText(...seg: string[]): Promise<string | null> {
  try {
    return await readFile(repoPath(...seg), "utf-8");
  } catch {
    return null;
  }
}

async function loadScreens(): Promise<ScreenFile[]> {
  let names: string[] = [];
  try {
    names = (await readdir(repoPath("data", "_lab"))).filter((n) => /^screen-\d{8}\.json$/.test(n)).sort();
  } catch {
    return [];
  }
  const out: ScreenFile[] = [];
  for (const n of names) {
    const p = repoPath("data", "_lab", n);
    try {
      const mtime = (await stat(p)).mtimeMs;
      const hit = screenCache.get(n);
      if (hit && hit.mtime === mtime) {
        out.push(hit.data);
        continue;
      }
      const data = JSON.parse(await readFile(p, "utf-8")) as ScreenFile;
      screenCache.set(n, { mtime, data });
      out.push(data);
    } catch (e) {
      // 깨진 파일은 건너뛰되 조용히 넘기지 않는다 — 2026-10-02 Infinity 하나로 탭 전체가
      // '실행 기록 없음'으로 떴는데 원인이 안 보였다.
      console.error(`[api/lab] ${n} 읽기 실패:`, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

// 콜 이후 일별 **미조정** 종가 — calls 라우트와 같은 기준(priceAtCall 이 미조정 시세다).
async function fetchCloses(ticker: string, since: string): Promise<ClosePoint[] | null> {
  const start = Date.parse(`${since}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  const period1 = Math.floor(start / 1000) - 7 * 86_400; // 콜 당일이 휴장이어도 직전 종가가 잡히게
  const period2 = Math.floor(Date.now() / 1000) + 86_400;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(ticker))}?period1=${period1}&period2=${period2}&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const result = (await res.json())?.chart?.result?.[0];
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
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function summarizeStock(s: StockRow) {
  const m = s.metrics ?? {};
  return {
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    rank: s.rank ?? null,
    price: m.price ?? null,
    target: s.plan?.target ?? m.target ?? null,
    stopLoss: s.plan?.stopLoss ?? null,
    upsidePct: m.upside != null ? m.upside * 100 : null,
    momentumPct: m.momentum != null ? m.momentum * 100 : null,
    yieldNowPct: m.yieldNow != null ? m.yieldNow * 100 : null,
    medianYieldPct: m.medianYield != null ? m.medianYield * 100 : null,
    historyYears: m.historyYears ?? null,
    latestPeriodEnd: m.latestPeriodEnd ?? null,
    spinoffSuspect: (m.spinoffSuspect ?? []).length > 0,
    imputed: m.imputed ?? [],
    score: s.score ?? null,
  };
}

function buildFunnel(screen: ScreenFile) {
  const byStep = new Map<string, { ticker: string; name: string; detail: string; code: string }[]>();
  for (const s of Object.values(screen.stocks)) {
    if (!s.excluded) continue;
    const step = STEP_OF_CODE[s.excluded.code] ?? "E7";
    const list = byStep.get(step) ?? [];
    list.push({ ticker: s.ticker, name: s.name, detail: s.excluded.detail, code: s.excluded.code });
    byStep.set(step, list);
  }
  let prev = screen.funnel[0]?.remaining ?? 0;
  return screen.funnel.map((f) => {
    const removed = f.step === "universe" ? 0 : prev - f.remaining;
    prev = f.remaining;
    const excluded = (byStep.get(f.step) ?? []).sort((a, b) => a.ticker.localeCompare(b.ticker));
    return { step: f.step, label: f.label ?? "S&P 500", code: f.code ?? null, remaining: f.remaining, removed, excluded };
  });
}

type ExistingCall = {
  ticker: string;
  date: string;
  skill: string;
  call: string;
  recordedAt?: string;
  target?: { low?: number; high?: number; fairValue?: number };
};

function latestExisting(raw: string | null): Map<string, ExistingCall> {
  const map = new Map<string, ExistingCall>();
  for (const line of (raw ?? "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as ExistingCall;
      if (typeof o.ticker !== "string" || typeof o.date !== "string") continue;
      const prev = map.get(o.ticker);
      const key = (c: ExistingCall) => `${c.date}|${c.recordedAt ?? ""}`;
      if (!prev || key(o) > key(prev)) map.set(o.ticker, o);
    } catch {
      // 손상된 줄 무시
    }
  }
  return map;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const [screens, labRaw, existingRaw] = await Promise.all([
    loadScreens(),
    readText("data", "lab-calls.jsonl"),
    readText("data", "calls.jsonl"),
  ]);
  const latest = screens[screens.length - 1] ?? null;
  const rows = parseLabRows(labRaw ?? "");
  const calls = rows.filter((r): r is LabCall => r.kind === "call");
  const decisions = new Map(
    rows.filter((r): r is LabDecision => r.kind === "decision").map((d) => [d.ref, d.decision] as const)
  );
  const marks: ScreenMark[] = screens.map((s) => ({ runDate: s.runDate, candidates: s.candidates }));
  const existing = latestExisting(existingRaw);
  const today = new Date().toISOString().slice(0, 10);

  // 시세 — 실험실 콜 종목 + SPY. 콜이 없으면 요청 0건.
  const since = new Map<string, string>();
  for (const c of calls) {
    const p = since.get(c.ticker);
    if (!p || c.date < p) since.set(c.ticker, c.date);
  }
  const firstDate = calls.map((c) => c.date).sort()[0];
  const [closeEntries, spy] = await Promise.all([
    mapLimit(Array.from(since.keys()), 6, async (t) => {
      const s = since.get(t) as string;
      return [t, await historyCache.get(`${t}:${s}`, () => fetchCloses(t, s))] as const;
    }),
    firstDate ? historyCache.get(`${BENCHMARK}:${firstDate}`, () => fetchCloses(BENCHMARK, firstDate)) : null,
  ]);
  const closesByTicker = new Map(closeEntries);

  const scored = calls
    .map((c) => scoreLabCall(c, closesByTicker.get(c.ticker) ?? null, spy, marks, today, decisions.get(c.id) ?? null))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const picks = scored.filter((c) => c.skill === "lab-pick");
  const controls = scored.filter((c) => c.skill === "lab-control");

  // 이번 주 상태 — 최신 스크리닝 실행일에 기록이 있으면 pick/none, 없으면 기계 순위만 있는 pending.
  let week: Record<string, unknown> = { status: "empty" };
  if (latest) {
    const runRows = rows.filter(
      (r): r is LabCall | LabNone | LabRepeat => r.kind !== "decision" && r.date === latest.runDate
    );
    const pickRow = runRows.find((r) => r.skill === "lab-pick") as LabCall | LabRepeat | undefined;
    const noneRow = runRows.find((r) => r.kind === "none") as LabNone | undefined;
    if (pickRow) {
      const ref = pickRow.kind === "repeat" ? pickRow.ref : pickRow.id;
      const scoredPick = scored.find((c) => c.id === ref) ?? null;
      // 반대 근거는 검증 보고서가 원본이다(기록부는 append-only 라 나중에 덧붙일 수 없다).
      const reportPath = pickRow.report ?? scoredPick?.report ?? null;
      const reportMd = reportPath && /^reports\/lab\/[\w.-]+\.md$/.test(reportPath)
        ? await readText(...reportPath.split("/"))
        : null;
      week = {
        cautions: reportMd ? extractCautions(reportMd) : [],
        status: "pick",
        repeat: pickRow.kind === "repeat",
        pick: scoredPick,
        rejected: pickRow.rejected ?? [],
        report: pickRow.report ?? null,
        existing: scoredPick ? existing.get(scoredPick.ticker) ?? null : null,
      };
    } else if (noneRow) {
      week = { status: "none", rejected: noneRow.rejected ?? [], report: noneRow.report ?? null };
    } else {
      week = { status: "pending" };
    }
  }

  const screen = latest && {
    runDate: latest.runDate,
    ruleVersion: latest.ruleVersion,
    generatedAt: latest.generatedAt,
    universe: latest.universe,
    coverage: latest.coverage,
    momentumCutPct: latest.momentumCut != null ? latest.momentumCut * 100 : null,
    candidateCount: latest.candidates.length,
    candidates: latest.candidates.slice(0, TOP_N).map((t) => {
      const s = summarizeStock(latest.stocks[t]);
      return { ...s, existing: existing.get(t) ?? null };
    }),
    control: latest.control?.ticker ?? null,
    nearMiss: latest.nearMiss ? summarizeStock(latest.stocks[latest.nearMiss]) : null,
    funnel: buildFunnel(latest),
  };

  return Response.json(
    {
      screen,
      week,
      history: rows
        .filter((r) => r.kind === "none" || r.kind === "repeat" || (r.kind === "call" && r.skill === "lab-pick"))
        .map((r) => (r.kind === "call" ? scored.find((c) => c.id === r.id) ?? r : r))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      controls,
      stats: { lab: groupStats(picks), control: groupStats(controls) },
      series: cumulativeSeries(picks, controls, closesByTicker, spy, today),
    },
    { headers: NO_STORE }
  );
}
