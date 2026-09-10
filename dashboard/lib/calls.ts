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
  /**
   * 퀄리티 티어(skills/quality-tier.md). 요구 안전마진이 티어별로 다르므로
   * "T1에 관대한 MOS를 준 판단이 옳았는가"를 사후 채점하려면 원장에 남아야 한다.
   */
  tier?: "T1" | "T2" | "T3";
  /** 이 콜이 요구한 안전마진(%). T1 0~15 · T2 15~30 · T3 30~40. */
  requiredMosPct?: number;
  target?: {
    low?: number;
    high?: number;
    horizonMonths?: number;
    /** 분할 진입 래더 원문(차수별 1줄). 예: "1차 ≤$185 (25%) — 계약화 60%+ 공시" */
    tranches?: string[];
    /** 추격 금지선(USD). 현재가가 이 위면 어떤 차수도 활성화되지 않는다. */
    noChaseAbove?: number;
    /**
     * 이 밴드가 호라이즌 안에 체결될 확률(%) — 과거 낙폭 베이스레이트(tools/fill_probability.py).
     * "unknown" 은 상장 이력이 짧아 산출 불가라는 뜻이며, 0% 와 구분해야 한다.
     * 25% 미만이면 밴드가 실행 계획이 아니라 장식이다(TASK-99).
     */
    fillProbability?: number | "unknown";
    /** 체결확률 25% 미만일 때 택한 대응. record_call.py 가 셋 중 하나를 강제한다. */
    lowFillPlan?: "starter" | "catalyst-wait" | "widen-horizon";
  };
  loadBearing?: string[];
  invalidation?: string[];
  reason?: string; // 이 콜을 낸 사유 (관망/대기 이유 등). 채점에 영향 없는 설명 메타데이터.
}

/**
 * 같은 콜이 두 줄 이상 들어온 경우 최신 1건만 남긴다 (TASK-104).
 *
 * 원장은 append-only 라서 **같은 스킬을 같은 날 다시 돌리면 같은 id 로 한 줄이 더 쌓인다**
 * (record_call.py 는 경고만 하고 이력 보존을 위해 추가한다). 그대로 채점하면 그 판단이
 * 두 번 세어져 적중률·기회비용 분모가 왜곡된다.
 *
 * 🔴 키는 `id`(= 티커-날짜-스킬)다. **같은 날 다른 스킬이 낸 콜은 중복이 아니다** —
 * 예: NVDA 2026-08-06 의 investment-team($172)과 thesis-tracker($205)는 서로 다른 판단이고,
 * 그 불일치를 드러내는 것이 논제 충돌 판정(thesis-groups.ts)의 목적이다. 합치면 안 된다.
 *
 * 남기는 기준은 `recordedAt` 최신 — 늦게 기록된 쪽이 정정본이다. recordedAt 이 없으면
 * 파일에 나중에 나온 줄을 남긴다(원장은 시간순 append 이므로).
 */
export function dedupeCalls(calls: RawCall[]): RawCall[] {
  const latest = new Map<string, RawCall>();
  for (const c of calls) {
    const prev = latest.get(c.id);
    if (!prev) {
      latest.set(c.id, c);
      continue;
    }
    const a = prev.recordedAt ?? "";
    const b = c.recordedAt ?? "";
    // b >= a 이면 뒤에 온 줄로 교체 — 동률(둘 다 없음 포함)이면 나중 줄이 정정본이다.
    if (b >= a) latest.set(c.id, c);
  }
  return Array.from(latest.values());
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
  tier?: "T1" | "T2" | "T3";
  requiredMosPct?: number;
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
    /**
     * 이 밴드가 호라이즌 안에 체결될 확률(%) — 과거 낙폭 베이스레이트(tools/fill_probability.py).
     * "unknown" 은 상장 이력이 짧아 산출 불가라는 뜻이며, 0% 와 구분해야 한다.
     * 25% 미만이면 밴드가 실행 계획이 아니라 장식이다(TASK-99).
     */
    fillProbability?: number | "unknown";
    /** 체결확률 25% 미만일 때 택한 대응. record_call.py 가 셋 중 하나를 강제한다. */
    lowFillPlan?: "starter" | "catalyst-wait" | "widen-horizon";
  };
  loadBearing: string[]; // 논제 핵심 가정(참이어야 콜이 유효). 채점엔 미반영, 진행중 콜 상세용.
  invalidation: string[];
  reason?: string;
  // 전일 대비(표시 전용, TASK-97). **채점에 쓰지 않는다** — 그래서 scoreCall 이 아니라
  // /api/calls 가 시세를 받을 때 채운다(현재가와 같은 Yahoo 응답에 들어 있어 추가 호출 없음).
  // 옵셔널로 둬야 tools/score_calls.py 와의 채점 파리티가 이 필드에 영향받지 않는다.
  prevClose?: number | null;
  dayChange?: number | null;
  dayChangePct?: number | null;
  // 벤치마크(SPY) 대비 채점 — 기회비용(TASK-100). scoreCall 밖에서 얹는다(위 prevClose 와 같은 이유).
  benchmarkReturnPct?: number | null;
  excessReturnPct?: number | null;
  benchmarkHit?: boolean | null;
  opportunityCostPct?: number | null;
}

/** 기회비용 채점의 벤치마크. 현금이 아니라 '안 샀으면 넣었을 곳'이 올바른 대안이다. */
export const BENCHMARK_TICKER = "SPY";

/**
 * 벤치마크 대비 채점 (TASK-100).
 *
 * 왜 필요한가 — 기존 채점은 밴드 터치 여부만 봤다. `hold` 걸어두고 주가가 +30% 도망가도
 * 손실로 잡히지 않아, **"안 사서 잃은 것"이 트랙레코드에서 보이지 않았다**(2026-09-10 진단).
 * 기다림에도 비용이 있고, 그 비용의 기준선은 "안 샀으면 SPY에 있었을 돈"이다.
 *
 * 콜별 반사실(counterfactual)과 적중 조건:
 *   buy   샀다      ↔ 안 사고 SPY  → 종목이 SPY 를 **초과**해야 적중
 *   keep  계속 보유  ↔ 팔고 SPY    → 종목이 SPY 를 **초과**해야 적중
 *   hold  관망      ↔ 안 사고 SPY  → 종목이 SPY 에 **미달**해야 적중 (안 산 게 이득)
 *   avoid 회피      ↔ 안 사고 SPY  → 종목이 SPY 에 **미달**해야 적중
 *
 * 초과수익 정확히 0은 우위가 실증되지 않은 것이므로 적중으로 치지 않는다.
 */
export function scoreBenchmark(
  call: Pick<ScoredCall, "call" | "returnPct">,
  benchmarkReturnPct: number | null
): {
  benchmarkReturnPct: number | null;
  excessReturnPct: number | null;
  benchmarkHit: boolean | null;
  opportunityCostPct: number | null;
} {
  if (benchmarkReturnPct == null || call.returnPct == null) {
    return {
      benchmarkReturnPct,
      excessReturnPct: null,
      benchmarkHit: null,
      opportunityCostPct: null,
    };
  }
  const excess = call.returnPct - benchmarkReturnPct;
  const wantsUpside = call.call === "buy" || call.call === "keep";
  const hit = wantsUpside ? excess > 0 : excess < 0;
  return {
    benchmarkReturnPct,
    excessReturnPct: excess,
    benchmarkHit: hit,
    // "이 판단 때문에 포기한 상대수익(pp)". 적중이면 0 — 포기한 게 없다.
    opportunityCostPct: hit ? 0 : Math.abs(excess),
  };
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
  // ── 벤치마크(SPY) 대비 집계 (TASK-100) ──────────────────────────────
  /** 벤치마크 수익률까지 계산된 확정 콜 수. 시세 실패 시 resolvedCount 보다 작을 수 있다. */
  benchmarkResolvedCount: number;
  benchmarkHits: number;
  /** SPY 대안 대비 적중률. 방향 적중률이 높아도 이게 낮으면 "맞았지만 무의미했다". */
  benchmarkHitRate: number | null;
  benchmarkCi95: [number, number];
  /** 확정 콜의 평균 초과수익(pp). 콜 방향과 무관한 raw 값. */
  avgExcessReturnPct: number | null;
  /** 확정된 관망(hold) 콜이 평균 몇 pp 를 포기했는가 — 보수성 편향의 직접 지표. */
  holdOpportunityCostAvgPct: number | null;
  holdResolvedCount: number;
  /**
   * **진행중** 관망 콜의 잠정 기회비용(pp). 호라이즌이 12~24M 이라 확정 집계는 1년 뒤에나
   * 채워지는데, "지금 얼마나 놓치고 있나"는 그때 보면 늦다 — 그래서 잠정치를 따로 낸다.
   * 확정치가 아니므로 적중률 분모에는 절대 넣지 않는다.
   */
  inProgressHoldOpportunityCostAvgPct: number | null;
  inProgressHoldCount: number;
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
    tier: call.tier,
    requiredMosPct: call.requiredMosPct,
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
  // 벤치마크 집계는 확정 콜 중 **초과수익이 계산된 것**만 분모로 쓴다.
  // (시세 실패·벤치마크 시계열 결측이면 null 이고, 그걸 0 으로 뭉개면 적중률이 왜곡된다.)
  const withBm = resolved.filter((s) => typeof s.excessReturnPct === "number");
  const bmHits = withBm.filter((s) => s.benchmarkHit === true).length;
  const excesses = withBm.map((s) => s.excessReturnPct as number);
  // 관망(hold)이 포기한 상대수익 — 2026-09-10 진단(밴드가 닿지 않는 사이 주가가 도망감)의 직접 지표.
  const holdResolved = withBm.filter((s) => s.call === "hold");
  const holdCosts = holdResolved
    .map((s) => s.opportunityCostPct)
    .filter((v): v is number => typeof v === "number");
  // 진행중 관망의 **잠정** 기회비용 — 호라이즌 12~24M 을 다 기다리면 편향을 못 본다.
  const runningHold = scored.filter(
    (s) => s.call === "hold" && s.status === "진행중" && typeof s.opportunityCostPct === "number"
  );
  const runningHoldCosts = runningHold.map((s) => s.opportunityCostPct as number);

  return {
    resolvedCount: n,
    directionHits: hits,
    directionHitRate: n ? hits / n : null,
    ci95: wilsonInterval(hits, n),
    avgTargetErrorPct: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null,
    inProgress: scored.filter((s) => s.status === "진행중").length,
    unknown: scored.filter((s) => s.status === "unknown").length,
    smallSample: n < 10,
    benchmarkResolvedCount: withBm.length,
    benchmarkHits: bmHits,
    benchmarkHitRate: withBm.length ? bmHits / withBm.length : null,
    benchmarkCi95: wilsonInterval(bmHits, withBm.length),
    avgExcessReturnPct: excesses.length
      ? excesses.reduce((a, b) => a + b, 0) / excesses.length
      : null,
    holdOpportunityCostAvgPct: holdCosts.length
      ? holdCosts.reduce((a, b) => a + b, 0) / holdCosts.length
      : null,
    holdResolvedCount: holdResolved.length,
    inProgressHoldOpportunityCostAvgPct: runningHoldCosts.length
      ? runningHoldCosts.reduce((a, b) => a + b, 0) / runningHoldCosts.length
      : null,
    inProgressHoldCount: runningHold.length,
  };
}
