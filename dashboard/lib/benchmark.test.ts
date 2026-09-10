// 벤치마크(SPY) 대비 채점 테스트 (TASK-100).
// 핵심은 **콜 종류마다 적중 방향이 뒤집힌다**는 것 — hold/avoid 는 종목이 벤치마크에
// 미달해야 옳은 판단이었다. 이게 뒤집히면 "안 사서 잃은 것"이 다시 안 보이게 된다.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/benchmark.test.ts
import { aggregate, scoreBenchmark, type ScoredCall } from "./calls.ts";

const failures: string[] = [];

function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) failures.push(`[${name}] 기대 ${w} ≠ 실제 ${g}`);
}

// ── 방향 반전 ────────────────────────────────────────────────────────
// 종목 +30%, SPY +8% → 초과 +22pp.
check("buy 초과 → 적중", scoreBenchmark({ call: "buy", returnPct: 30 }, 8).benchmarkHit, true);
check("keep 초과 → 적중", scoreBenchmark({ call: "keep", returnPct: 30 }, 8).benchmarkHit, true);
check("hold 초과 → 빗나감", scoreBenchmark({ call: "hold", returnPct: 30 }, 8).benchmarkHit, false);
check("avoid 초과 → 빗나감", scoreBenchmark({ call: "avoid", returnPct: 30 }, 8).benchmarkHit, false);

// 종목 -5%, SPY +8% → 초과 -13pp.
check("hold 미달 → 적중", scoreBenchmark({ call: "hold", returnPct: -5 }, 8).benchmarkHit, true);
check("buy 미달 → 빗나감", scoreBenchmark({ call: "buy", returnPct: -5 }, 8).benchmarkHit, false);

// ── 기회비용 = 이 판단 때문에 포기한 상대수익(pp) ─────────────────────
check(
  "hold 이 22pp 놓침",
  scoreBenchmark({ call: "hold", returnPct: 30 }, 8).opportunityCostPct,
  22
);
check("적중이면 기회비용 0", scoreBenchmark({ call: "hold", returnPct: -5 }, 8).opportunityCostPct, 0);

// ── 우위 0은 적중이 아니다 (실증되지 않음) ────────────────────────────
check("초과 0 → buy 빗나감", scoreBenchmark({ call: "buy", returnPct: 8 }, 8).benchmarkHit, false);
check("초과 0 → hold 빗나감", scoreBenchmark({ call: "hold", returnPct: 8 }, 8).benchmarkHit, false);

// ── 데이터 결측은 0 이 아니라 null ────────────────────────────────────
check("벤치마크 없음 → null", scoreBenchmark({ call: "hold", returnPct: 30 }, null).benchmarkHit, null);
check("수익률 없음 → null", scoreBenchmark({ call: "hold", returnPct: null }, 8).excessReturnPct, null);

// ── 집계: 결측 콜은 분모에서 빠진다 ───────────────────────────────────
function mk(partial: Partial<ScoredCall>): ScoredCall {
  return {
    id: "x",
    ticker: "X",
    call: "hold",
    date: "2026-01-01",
    skill: "s",
    priceAtCall: 100,
    priceNow: 100,
    elapsedDays: 400,
    horizonMonths: 12,
    horizonProgress: 1,
    horizonElapsed: true,
    directionHit: true,
    returnPct: 0,
    targetReached: null,
    targetErrorPct: null,
    status: "적중",
    loadBearing: [],
    invalidation: [],
    ...partial,
  };
}

const agg = aggregate([
  mk({ id: "a", call: "hold", returnPct: 30, ...scoreBenchmark({ call: "hold", returnPct: 30 }, 8) }),
  mk({ id: "b", call: "hold", returnPct: -5, ...scoreBenchmark({ call: "hold", returnPct: -5 }, 8) }),
  // 벤치마크 결측 — 분모에서 빠져야 한다.
  mk({ id: "c", call: "buy", returnPct: 12 }),
  // 진행중은 확정이 아니라 분모에서 빠진다.
  mk({ id: "d", status: "진행중", returnPct: 50, ...scoreBenchmark({ call: "hold", returnPct: 50 }, 8) }),
]);

check("벤치마크 분모 = 결측·진행중 제외", agg.benchmarkResolvedCount, 2);
check("벤치마크 적중 1건", agg.benchmarkHits, 1);
check("확정 hold 2건", agg.holdResolvedCount, 2);
check("hold 평균 기회비용 = (22+0)/2", agg.holdOpportunityCostAvgPct, 11);
check("평균 초과수익 = (22 + -13)/2", agg.avgExcessReturnPct, 4.5);
// 진행중 hold(d)는 확정 집계에서 빠지지만 잠정 기회비용에는 잡혀야 한다 —
// 호라이즌 12~24M 을 다 기다리면 보수성 편향을 볼 시점이 1년 뒤가 된다.
check("진행중 관망 1건", agg.inProgressHoldCount, 1);
check("진행중 관망 잠정 기회비용 42pp", agg.inProgressHoldOpportunityCostAvgPct, 42);

if (failures.length > 0) {
  console.error(`❌ 벤치마크 채점 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 벤치마크 대비 채점 통과 (18 케이스)");

// ── 중복 접기 (TASK-104) ─────────────────────────────────────────────
// 같은 id(티커-날짜-스킬)만 접는다. 같은 날 **다른 스킬**의 콜은 서로 다른 판단이므로
// 남아야 한다 — 그 불일치가 논제 충돌 판정의 재료다.
import { dedupeCalls, type RawCall } from "./calls.ts";

const dedupeFailures: string[] = [];
function dcheck(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) dedupeFailures.push(`[${name}] 기대 ${w} ≠ 실제 ${g}`);
}

const raw = (over: Partial<RawCall>): RawCall => ({
  id: "X-20260101-thesis-tracker",
  ticker: "X",
  date: "2026-01-01",
  skill: "thesis-tracker",
  call: "hold",
  priceAtCall: 100,
  ...over,
});

// 같은 id 재기록 → 최신 recordedAt 만 남는다.
const reRun = dedupeCalls([
  raw({ recordedAt: "2026-01-01T01:00:00Z", priceAtCall: 100 }),
  raw({ recordedAt: "2026-01-01T09:00:00Z", priceAtCall: 111 }),
]);
dcheck("같은 id 재기록 → 1건", reRun.length, 1);
dcheck("최신 정정본이 남는다", reRun[0].priceAtCall, 111);

// 같은 날 다른 스킬 → 중복이 아니다(실제 원장의 NVDA 2026-08-06 패턴).
const twoSkills = dedupeCalls([
  raw({ id: "NVDA-20260806-investment-team", ticker: "NVDA", skill: "investment-team" }),
  raw({ id: "NVDA-20260806-thesis-tracker", ticker: "NVDA", skill: "thesis-tracker" }),
]);
dcheck("같은 날 다른 스킬 → 2건 유지", twoSkills.length, 2);

// recordedAt 이 없으면 나중 줄이 정정본(원장은 시간순 append).
const noTs = dedupeCalls([raw({ priceAtCall: 100 }), raw({ priceAtCall: 222 })]);
dcheck("recordedAt 없으면 나중 줄", noTs[0].priceAtCall, 222);

if (dedupeFailures.length > 0) {
  console.error(`❌ 중복 접기 실패 (${dedupeFailures.length}건):`);
  for (const f of dedupeFailures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 중복 접기 통과 (4 케이스)");
