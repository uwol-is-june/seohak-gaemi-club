// 논제 묶기·충돌 판정 테스트 (TASK-97).
//
// 합성 케이스로 규칙 셋을 하나씩 확인하고, 마지막에 **실제 원장**을 통과시켜
// 충돌 임계값이 과·소검출하지 않는지 눈으로 볼 수 있게 요약을 찍는다
// (임계값 튜닝의 근거를 사람이 확인하는 용도 — 개수 자체를 단정하지는 않는다).
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/thesis-groups.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scoreCall, type RawCall, type ScoredCall } from "./calls.ts";
import { detectConflict, groupTheses } from "./thesis-groups.ts";

const failures: string[] = [];
function check(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`[${name}] 기대 ${JSON.stringify(want)} ≠ 실제 ${JSON.stringify(got)}`);
  }
}

const TODAY = new Date("2026-08-28T00:00:00Z");

// 채점을 거친 ScoredCall 을 만든다 — 화면이 받는 것과 같은 형태여야 의미가 있다.
function call(over: Partial<RawCall> & { skill: string }, priceNow = 200): ScoredCall {
  const raw: RawCall = {
    id: `${over.ticker ?? "TST"}-${over.date ?? "2026-08-01"}-${over.skill}`,
    ticker: "TST",
    date: "2026-08-01",
    skill: over.skill,
    call: "hold",
    priceAtCall: 200,
    ...over,
  };
  return scoreCall(raw, priceNow, TODAY);
}

// ── 규칙 1: 방향이 갈린다 ────────────────────────────────────────────────
{
  const c = detectConflict([
    call({ skill: "investment-team", call: "buy", target: { high: 300, low: 250, horizonMonths: 12 } }),
    call({ skill: "thesis-tracker", call: "avoid", target: { high: 300, low: 250, horizonMonths: 12 } }),
  ]);
  check("방향 충돌 감지", c != null, true);
  check("방향 충돌 사유", c?.reasons[0]?.includes("판단 방향이 갈린다"), true);
}
{
  // keep(계속 보유)과 hold(관망)는 정반대를 예측한다 — 반드시 충돌로 잡혀야 한다.
  const c = detectConflict([
    call({ skill: "a", call: "keep", target: { low: 190, high: 210, horizonMonths: 12 } }),
    call({ skill: "b", call: "hold", target: { low: 190, high: 210, horizonMonths: 12 } }),
  ]);
  check("keep vs hold 충돌", c != null, true);
}

// ── 규칙 2: 밴드가 겹치지 않는다 ──────────────────────────────────────────
{
  const c = detectConflict([
    call({ skill: "a", call: "hold", target: { low: 100, high: 120, horizonMonths: 12 } }),
    call({ skill: "b", call: "hold", target: { low: 150, high: 180, horizonMonths: 12 } }),
  ]);
  check("밴드 미교차 충돌", c?.reasons.some((r) => r.includes("겹치지 않는다")), true);
}
{
  // 겹치면 충돌이 아니다 — 상단 간격도 15% 이내로 둔다.
  const c = detectConflict([
    call({ skill: "a", call: "hold", target: { low: 100, high: 130, horizonMonths: 12 } }),
    call({ skill: "b", call: "hold", target: { low: 120, high: 140, horizonMonths: 12 } }),
  ]);
  check("밴드 교차 시 충돌 없음", c, null);
}

// ── 규칙 3: 첫 집행 지점(최상단 차수) 간격 ────────────────────────────────
{
  // 밴드는 겹치지만 래더 시작가가 크게 다르다 → 충돌.
  const c = detectConflict([
    call({
      skill: "a",
      call: "hold",
      target: { low: 100, high: 200, horizonMonths: 12, tranches: ["1차 ≤$200 (50%)", "2차 ≤$150 (50%)"] },
    }),
    call({
      skill: "b",
      call: "hold",
      target: { low: 100, high: 200, horizonMonths: 12, tranches: ["1차 ≤$150 (50%)", "2차 ≤$120 (50%)"] },
    }),
  ]);
  check("진입 시작가 간격 충돌", c?.reasons.some((r) => r.includes("진입 시작가")), true);
}
{
  // 래더가 없는 논제와도 비교돼야 한다(밴드 상단으로 폴백).
  const c = detectConflict([
    call({ skill: "a", call: "hold", target: { low: 100, high: 205, horizonMonths: 12, tranches: ["1차 ≤$205 (100%)"] } }),
    call({ skill: "b", call: "hold", target: { low: 100, high: 172, horizonMonths: 12 } }),
  ]);
  check("래더 없는 논제와도 비교", c?.reasons.some((r) => r.includes("진입 시작가")), true);
}
check("논제 1건이면 충돌 없음", detectConflict([call({ skill: "a" })]), null);

// ── 묶기 ────────────────────────────────────────────────────────────────
{
  // 같은 스킬의 옛 콜은 '갱신'이라 충돌이 아니라 이력으로 가야 한다.
  const groups = groupTheses([
    call({ skill: "thesis-tracker", date: "2026-08-20", call: "hold", target: { low: 150, high: 180, horizonMonths: 12 } }),
    call({ skill: "thesis-tracker", date: "2026-07-01", call: "buy", target: { low: 250, high: 300, horizonMonths: 12 } }),
  ]);
  check("스킬별 최신 1건", groups[0].active.length, 1);
  check("옛 콜은 이력", groups[0].history.length, 1);
  check("같은 스킬끼리는 충돌 아님", groups[0].conflict, null);
}
{
  // 채점이 끝난 종목도 사라지지 않는다.
  const resolved = call(
    { skill: "a", date: "2026-01-01", call: "buy", target: { low: 250, high: 300, horizonMonths: 1 } },
    100
  );
  check("종료된 콜 상태", resolved.status, "빗나감");
  const groups = groupTheses([resolved]);
  check("종료 종목도 남는다", groups[0].active.length, 1);
  check("resolvedOnly 표시", groups[0].resolvedOnly, true);
}

// ── 실제 원장 ────────────────────────────────────────────────────────────
const ledgerPath = fileURLToPath(new URL("../../data/calls.jsonl", import.meta.url));
try {
  const raw = readFileSync(ledgerPath, "utf-8");
  const rows: RawCall[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.ticker === "string" && typeof o.priceAtCall === "number") rows.push(o);
    } catch {
      /* 깨진 줄 무시 — 라우트와 동일 */
    }
  }
  // 시세 없이(priceNow=null) 채점하면 전부 unknown = 전부 '살아있음'이 되어
  // 묶기·충돌 로직이 최대 부하로 돌아간다(가장 많은 논제가 병렬로 서는 경우).
  const scored = rows
    .map((r) => scoreCall(r, null, TODAY))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const groups = groupTheses(scored);
  const multi = groups.filter((g) => g.active.length > 1);
  const conflicting = groups.filter((g) => g.conflict != null);
  console.log(`   원장 ${rows.length}콜 → ${groups.length}종목, 논제 2건 이상 ${multi.length}종목, 충돌 ${conflicting.length}종목`);
  for (const g of conflicting) {
    console.log(`   · ${g.ticker}: ${g.conflict!.reasons.join(" / ")}`);
  }
  if (groups.some((g) => g.active.length === 0)) {
    failures.push("[원장] 살아있는 논제가 0건인 종목이 생겼다 — 종목이 화면에서 사라진다");
  }
} catch (e) {
  failures.push(`[원장] 읽기 실패: ${String(e)}`);
}

if (failures.length > 0) {
  console.error(`❌ 논제 묶기 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 논제 묶기·충돌 판정 통과");
