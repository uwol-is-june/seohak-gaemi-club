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

// horizon(목표 기간)이 명시되지 않은 콜의 최소 확정 대기일(TASK-44).
// 콜 당일의 하루 등락으로 즉시 적중/빗나감이 확정돼 트랙레코드가 오염되는 것을 막는다.
// tools/score_calls.py 의 MIN_RESOLVE_DAYS 와 반드시 같은 값이어야 한다.
const MIN_RESOLVE_DAYS = 30;

// data/calls.jsonl 한 줄 = 콜 하나. record_call.py 가 기록한 불변 스냅샷.
export interface RawCall {
  id: string;
  ticker: string;
  date: string; // 콜 시점 YYYY-MM-DD (불변)
  recordedAt?: string; // 기록 시각 ISO (같은 날짜 콜의 최신순 판별용)
  skill: string;
  call: CallType;
  priceAtCall: number; // 콜 시점 주가 USD (불변)
  conviction?: string;
  report?: string;
  target?: {
    low?: number;
    high?: number;
    horizonMonths?: number;
    /** 분할 진입 래더 원문(차수별 1줄). 예: "1차 ≤$185 (25%) — 계약화 60%+ 공시" */
    tranches?: string[];
    /** 추격 금지선(USD). 현재가가 이 위면 어떤 차수도 활성화되지 않는다. */
    noChaseAbove?: number;
  };
  loadBearing?: string[];
  invalidation?: string[];
  reason?: string; // 이 콜을 낸 사유 (관망/대기 이유 등). 채점에 영향 없는 설명 메타데이터.
}

export type CallStatus = "진행중" | "적중" | "빗나감" | "unknown";

export interface ScoredCall {
  id: string;
  ticker: string;
  call: CallType;
  date: string;
  recordedAt?: string; // 기록 시각 ISO — 같은 날짜 콜의 최신 판별(종목당 최신 콜 접기).
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
  target?: {
    low?: number;
    high?: number;
    horizonMonths?: number;
    /** 분할 진입 래더 원문(차수별 1줄). 예: "1차 ≤$185 (25%) — 계약화 60%+ 공시" */
    tranches?: string[];
    /** 추격 금지선(USD). 현재가가 이 위면 어떤 차수도 활성화되지 않는다. */
    noChaseAbove?: number;
  };
  loadBearing: string[]; // 논제 핵심 가정(참이어야 콜이 유효). 채점엔 미반영, 진행중 콜 상세용.
  invalidation: string[];
  reason?: string;
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
  // today 를 UTC 자정으로 정규화한다(TASK-72). callDate 는 UTC 자정인데 today 에
  // 시각대가 섞여 있으면 경과일·horizon 경과가 하루 어긋날 수 있어, 라우트가 어떤
  // 시각을 넘기든 안전하도록 여기서 자정으로 맞춘다.
  const todayMid = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  // 포맷뿐 아니라 유효성까지 확인 — "2026-13-45" 같은 값은 Invalid Date 를 만들고
  // 이후 계산이 전부 NaN 으로 흘러가므로 today(자정)로 폴백한다(TASK-45).
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(call.date)
    ? new Date(`${call.date}T00:00:00Z`)
    : null;
  const callDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : todayMid;
  const elapsedDays = daysBetween(callDate, todayMid);
  const target = call.target ?? {};
  // 0 은 유효한 horizon 이므로 truthiness 대신 명시적 null 검사(TASK-44).
  const horizonMonths =
    typeof target.horizonMonths === "number" && Number.isFinite(target.horizonMonths)
      ? target.horizonMonths
      : null;
  const horizonEnd = horizonMonths != null ? addMonths(callDate, horizonMonths) : null;
  const horizonElapsed = !!(horizonEnd && todayMid >= horizonEnd);
  const horizonProgress =
    horizonMonths != null && horizonMonths > 0
      ? Math.max(0, Math.min(elapsedDays / (horizonMonths * DAYS_PER_MONTH), 1))
      : null;

  const base: ScoredCall = {
    id: call.id,
    ticker: call.ticker,
    call: call.call,
    date: call.date,
    recordedAt: call.recordedAt,
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
    loadBearing: call.loadBearing ?? [],
    invalidation: call.invalidation ?? [],
    reason: call.reason,
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

  // buy/avoid 는 '방향' 예측이라 의도적으로 문턱을 두지 않는다(TASK-72): 오르면 buy 적중,
  // 내리면 avoid 적중. 정확히 보합(0%)은 방향이 실현되지 않았으므로 빗나감으로 본다.
  // (움직임 크기·목표가 도달은 targetReached/targetErrorPct 로 따로 채점.)
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
  // mid === 0 은 '목표 없음'이 아니라 목표가 0 — 나눗셈 방지 겸 의도 명시(TASK-72).
  if (mid != null && mid !== 0) base.targetErrorPct = ((priceNow - mid) / mid) * 100;

  // 상태 판정(TASK-44):
  //  - horizon 명시: 미경과=진행중, 경과 후 방향으로 확정.
  //  - horizon 없음: 최소 대기일(MIN_RESOLVE_DAYS) 전엔 진행중(당일 확정 오염 방지),
  //                  이후 방향으로 확정.
  if (horizonMonths != null) {
    if (!horizonElapsed) base.status = "진행중";
    else if (base.directionHit === true) base.status = "적중";
    else if (base.directionHit === false) base.status = "빗나감";
  } else if (elapsedDays < MIN_RESOLVE_DAYS) {
    base.status = "진행중";
  } else if (base.directionHit === true) base.status = "적중";
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
