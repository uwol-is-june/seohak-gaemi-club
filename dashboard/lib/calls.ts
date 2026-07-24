// 콜 트랙레코드 채점 로직 (TASK-38 Phase 3). tools/score_calls.py 의 TS 포팅 —
// 두 곳의 채점 규칙은 동일해야 한다(원장 = data/calls.jsonl 단일 소스).
// 순수 함수만 둔다(파일/네트워크 없음). 시세 fetch·파일 읽기는 /api/calls 라우트에서.

// 콜 = '포지션'이 아니라 '예측'이다. keep 과 hold 는 정반대를 예측하므로 반드시 구분한다:
//   buy   매수     → 오른다
//   keep  보유 유지 → 이미 들고 있고, 계속 들고 가도 된다(의미 있는 하락 없음)
//   hold  관망     → 아직 안 샀고, 진입가로 내려오길 기다린다(목표 밴드 안으로 회귀)
//   avoid 회피     → 내린다
export type CallType = "buy" | "keep" | "hold" | "avoid";

// 방향 판정의 '의미 있는 움직임' 문턱(%). keep 은 하방만, hold 는 양방향으로 본다.
const DRIFT_TOLERANCE_PCT = 10;

// data/calls.jsonl 한 줄 = 콜 하나. record_call.py 가 기록한 불변 스냅샷.
export interface RawCall {
  id: string;
  ticker: string;
  date: string; // 콜 시점 YYYY-MM-DD (불변)
  skill: string;
  call: CallType;
  priceAtCall: number; // 콜 시점 주가 USD (불변)
  conviction?: string;
  report?: string;
  target?: { low?: number; high?: number; horizonMonths?: number };
  loadBearing?: string[];
  invalidation?: string[];
}

export type CallStatus = "진행중" | "적중" | "빗나감" | "unknown";

export interface ScoredCall {
  id: string;
  ticker: string;
  call: CallType;
  date: string;
  skill: string;
  conviction?: string;
  report?: string;
  priceAtCall: number;
  priceNow: number | null;
  elapsedDays: number;
  horizonMonths: number | null;
  horizonProgress: number | null; // 0~1
  horizonElapsed: boolean;
  directionHit: boolean | null;
  returnPct: number | null;
  targetReached: boolean | null;
  targetErrorPct: number | null;
  status: CallStatus;
  target?: { low?: number; high?: number; horizonMonths?: number };
  invalidation: string[];
}

export interface CallAggregate {
  resolvedCount: number;
  directionHits: number;
  directionHitRate: number | null;
  ci95: [number, number];
  avgTargetErrorPct: number | null;
  inProgress: number;
  unknown: number;
  smallSample: boolean;
}

const DAYS_PER_MONTH = 30.44;

function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const targetMonth = r.getUTCMonth() + months;
  const y = r.getUTCFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(r.getUTCDate(), lastDay)));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

// 이항 적중률 Wilson 95% 신뢰구간 — 작은 표본 과대해석 방지.
export function wilsonInterval(hits: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = hits / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function scoreCall(call: RawCall, priceNow: number | null, today: Date): ScoredCall {
  const callDate = /^\d{4}-\d{2}-\d{2}$/.test(call.date)
    ? new Date(`${call.date}T00:00:00Z`)
    : today;
  const elapsedDays = daysBetween(callDate, today);
  const target = call.target ?? {};
  const horizonMonths = typeof target.horizonMonths === "number" ? target.horizonMonths : null;
  const horizonEnd = horizonMonths ? addMonths(callDate, horizonMonths) : null;
  const horizonElapsed = !!(horizonEnd && today >= horizonEnd);
  const horizonProgress = horizonMonths
    ? Math.min(elapsedDays / (horizonMonths * DAYS_PER_MONTH), 1)
    : null;

  const base: ScoredCall = {
    id: call.id,
    ticker: call.ticker,
    call: call.call,
    date: call.date,
    skill: call.skill,
    conviction: call.conviction,
    report: call.report,
    priceAtCall: call.priceAtCall,
    priceNow,
    elapsedDays,
    horizonMonths,
    horizonProgress,
    horizonElapsed,
    directionHit: null,
    returnPct: null,
    targetReached: null,
    targetErrorPct: null,
    status: "unknown",
    target: call.target,
    invalidation: call.invalidation ?? [],
  };

  const priceAt = call.priceAtCall;
  if (priceNow == null || typeof priceAt !== "number" || priceAt === 0) return base;

  const ret = ((priceNow - priceAt) / priceAt) * 100;
  base.returnPct = ret;

  const low = target.low;
  const high = target.high;
  let mid: number | null = null;
  if (typeof low === "number" && typeof high === "number") mid = (low + high) / 2;
  else if (typeof low === "number") mid = low;
  else if (typeof high === "number") mid = high;

  if (call.call === "buy") base.directionHit = priceNow > priceAt;
  else if (call.call === "avoid") base.directionHit = priceNow < priceAt;
  else if (call.call === "keep") {
    // 보유 유지가 옳았나 = 계속 들고 있어도 손실이 없었나. 상방은 얼마든 열려 있으므로
    // 목표 밴드 상단을 넘겨도 적중이다(밴드는 targetReached 로 따로 채점).
    base.directionHit = ret >= -DRIFT_TOLERANCE_PCT;
  } else if (call.call === "hold") {
    // 관망이 옳았나 = 기다린 진입 밴드로 실제 내려왔나. 밴드가 없으면(회색지대 판정)
    // '크게 안 움직임'을 적중으로 본다.
    base.directionHit =
      typeof low === "number" && typeof high === "number"
        ? low <= priceNow && priceNow <= high
        : Math.abs(ret) <= DRIFT_TOLERANCE_PCT;
  }

  if (typeof low === "number" && typeof high === "number") {
    base.targetReached = low <= priceNow && priceNow <= high;
  }
  if (mid) base.targetErrorPct = ((priceNow - mid) / mid) * 100;

  if (horizonMonths && !horizonElapsed) base.status = "진행중";
  else if (base.directionHit === true) base.status = "적중";
  else if (base.directionHit === false) base.status = "빗나감";
  return base;
}

export function aggregate(scored: ScoredCall[]): CallAggregate {
  const resolved = scored.filter((s) => s.status === "적중" || s.status === "빗나감");
  const hits = resolved.filter((s) => s.directionHit === true).length;
  const n = resolved.length;
  const errs = resolved
    .map((s) => s.targetErrorPct)
    .filter((v): v is number => typeof v === "number");
  return {
    resolvedCount: n,
    directionHits: hits,
    directionHitRate: n ? hits / n : null,
    ci95: wilsonInterval(hits, n),
    avgTargetErrorPct: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null,
    inProgress: scored.filter((s) => s.status === "진행중").length,
    unknown: scored.filter((s) => s.status === "unknown").length,
    smallSample: n < 10,
  };
}
