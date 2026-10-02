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
import {
  bandDrift,
  detectConflict,
  detectRefresh,
  goalGapKey,
  groupGoal,
  groupTarget,
  groupTheses,
  highLadderMismatch,
  chaseBreaches,
  externalGap,
  isExcluded,
  lowHealthStreak,
} from "./thesis-groups.ts";

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
  // 대체 규칙(TASK-170): 다른 스킬이라도 최신 판단보다 7일 넘게 앞서면 이력으로 내려간다.
  // (실측 ADBE: 9/30 thesis-tracker avoid 옆에 9/10 earnings-team keep 이 남아 있었다)
  const groups = groupTheses([
    call({ skill: "thesis-tracker", date: "2026-08-20", call: "avoid" }),
    call({ skill: "earnings-team", date: "2026-08-01", call: "keep", target: { low: 215, high: 308, horizonMonths: 12 } }),
  ]);
  check("대체: 옛 다른 스킬 콜은 이력", [groups[0].active.length, groups[0].history.length], [1, 1]);
  check("대체: 남는 것은 최신 판단", groups[0].active[0].skill, "thesis-tracker");
  check("대체: 충돌 아님", groups[0].conflict, null);
}
{
  // 7일 안쪽에서 출처가 갈리면 여전히 충돌이다 — 그건 진짜 불일치다.
  const groups = groupTheses([
    call({ skill: "thesis-tracker", date: "2026-08-20", call: "avoid" }),
    call({ skill: "earnings-team", date: "2026-08-15", call: "keep" }),
  ]);
  check("근접 시점 다른 스킬은 둘 다 살아 있음", groups[0].active.length, 2);
  check("근접 시점 방향 충돌", groups[0].conflict != null, true);
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

// ── 갱신 필요 판정 ───────────────────────────────────────────────────────
{
  // 더 최신 판단이 있는 옛 논제는 재실행 대상이 아니다(2026-10-02 폐지 — LLY 실측).
  // 최신 판단이 답이고, 옛 스킬을 다시 돌리면 같은 결론을 새 기준으로 확인할 뿐이다.
  const old = call({ skill: "investment-team", date: "2026-09-30", call: "hold", target: { low: 620, high: 712, horizonMonths: 12 } });
  const fresh = call({ skill: "thesis-tracker", date: "2026-10-02", call: "hold", target: { low: 800, high: 901, horizonMonths: 12 } });
  check("뒤처진 옛 판단 → 갱신 표기 없음", detectRefresh([fresh, old]).length, 0);
}
{
  // 충돌이 없으면 날짜 차이만으로는 갱신을 요구하지 않는다.
  const flags = detectRefresh([
    call({ skill: "a", date: "2026-08-28" }),
    call({ skill: "b", date: "2026-08-06" }),
  ]);
  check("합의 중이면 뒤처짐은 사유 아님", flags.length, 0);
}
{
  // 분기 검토(90일)를 넘기면 충돌이 없어도 갱신 대상이다.
  const flags = detectRefresh([call({ skill: "a", date: "2026-04-01" })]);
  check("분기 검토 경과 감지", flags[0]?.reasons[0]?.includes("분기 검토"), true);
}
{
  // 밴드 이탈 — 요구 MOS 기준(티어 상대). skills/quality-tier.md 2.5단계.
  // T1(요구 15%): 밴드 상단 $255 에 현재가 $354.97 → 이탈률 +39.2% > 15% → 발동.
  const t1 = call(
    { skill: "thesis-tracker", date: "2026-06-01", tier: "T1", requiredMosPct: 15,
      target: { low: 205, high: 255, horizonMonths: 12 } },
    354.97
  );
  check("밴드 이탈 감지(T1)", bandDrift(t1)?.driftPct.toFixed(1), "39.2");
  check("밴드 이탈 → 갱신 필요", detectRefresh([t1])[0]?.reasons.some((r) => r.includes("밴드 이탈")), true);

  // 같은 이탈률이라도 요구 MOS 가 크면 정상이다 — 이것이 "티어 상대"의 핵심.
  // T3(요구 35%): 밴드 상단 $50 에 현재가 $66.76 → 이탈률 +33.5% < 35% → 미발동.
  const t3 = call(
    { skill: "thesis-tracker", date: "2026-06-01", tier: "T3", requiredMosPct: 35,
      target: { low: 42, high: 50, horizonMonths: 12 } },
    66.76
  );
  check("요구 MOS 큰 티어는 같은 이탈률에서 미발동", bandDrift(t3), null);

  // 종전의 +20% 고정 기준이었다면 T3 도 발동했을 것이다(33.5% > 20%) — 회귀 방지.
  check("고정 20% 기준이면 오발동했을 케이스", t3.priceNow! / 50 - 1 > 0.20, true);

  // hold 가 아니면 보지 않는다(보유 중인 콜에 진입 밴드 규칙을 적용하면 안 된다).
  check("keep 콜은 밴드 이탈 대상 아님", bandDrift(call(
    { skill: "thesis-tracker", date: "2026-06-01", call: "keep", tier: "T1", requiredMosPct: 15,
      target: { low: 205, high: 255, horizonMonths: 12 } }, 354.97
  )), null);

  // 재산출 직후(30일 이내)는 보지 않는다 — 결론이 catalyst-wait 면 밴드는 여전히 멀다.
  // 가드가 없으면 방금 끝낸 검토를 즉시 다시 요구한다(2026-09-23 QLYS 에서 발견).
  check("재산출 직후는 이탈 판정 제외", bandDrift(call(
    { skill: "thesis-tracker", date: "2026-08-20", tier: "T2", requiredMosPct: 20,
      target: { low: 93, high: 106, horizonMonths: 12 } }, 183.32
  )), null);
  // 30일이 지나면 같은 콜이 잡힌다.
  check("30일 경과 후에는 이탈 판정 재개", bandDrift(call(
    { skill: "thesis-tracker", date: "2026-07-20", tier: "T2", requiredMosPct: 20,
      target: { low: 93, high: 106, horizonMonths: 12 } }, 183.32
  ))?.driftPct.toFixed(1), "72.9");

  // 요구 MOS 가 없으면 티어 상한으로 폴백한다(CLAUDE.md · TASK-148). 티어도 없으면 판정하지 않는다.
  const noMos = bandDrift(call(
    { skill: "thesis-tracker", date: "2026-06-01", tier: "T1", target: { low: 205, high: 255, horizonMonths: 12 } }, 354.97
  ));
  check("요구 MOS 결측 → 티어 상한 폴백", [noMos?.requiredMosPct, noMos?.mosFromTier], [10, true]);
  check("요구 MOS·티어 모두 결측이면 미판정", bandDrift(call(
    { skill: "thesis-tracker", date: "2026-06-01", target: { low: 205, high: 255, horizonMonths: 12 } }, 354.97
  )), null);

  // target.high ≠ 래더 1차(AXP 250 vs 280) → 이탈률이 아니라 재기록을 요구한다(record_call 게이트 4).
  const axp = call(
    { skill: "thesis-tracker", date: "2026-06-01", tier: "T2", requiredMosPct: 25,
      target: { low: 220, high: 250, horizonMonths: 12, tranches: ["1차 ≤$280 (1/3)", "2차 ≤$250 (1/3)", "3차 ≤$220 (1/3)"] } },
    345
  );
  check("high ≠ 래더 1차 감지", highLadderMismatch(axp), { high: 250, first: 280 });
  const axpReasons = detectRefresh([axp])[0]?.reasons ?? [];
  check("불일치면 재기록 사유", axpReasons.some((r) => r.includes("≠ 래더 1차")), true);
  check("불일치면 이탈 사유는 내지 않음(틀린 숫자)", axpReasons.some((r) => r.includes("밴드 이탈")), false);
  check("keep 은 목표가≠증액 래더가 정상", highLadderMismatch(call(
    { skill: "a", date: "2026-06-01", call: "keep", target: { high: 400, tranches: ["1차 ≤$280 (50%)"] } }, 345
  )), null);
}
check("종료 종목은 갱신 요구 없음", groupTheses([
  call({ skill: "a", date: "2026-01-01", call: "buy", target: { low: 250, high: 300, horizonMonths: 1 } }, 100),
])[0].refresh.length, 0);

// ── 집행 지점: 정렬 키와 표시가 같은 값을 쓴다 (TASK-146) ─────────────────
{
  // 관망 논제 둘 — lead 는 $170, 다른 논제는 $185. 표시·정렬 모두 가장 먼저 닿는 $185 여야 한다.
  const g = {
    active: [
      call({ skill: "thesis-tracker", call: "hold", target: { low: 150, high: 170, horizonMonths: 12 } }),
      call({ skill: "investment-team", call: "hold", target: { low: 160, high: 185, horizonMonths: 12 } }),
    ],
    history: [],
  };
  check("hold goal = 논제 전체 max", groupGoal(g)?.price, 185);
  check("hold 정렬 키 = 같은 값", goalGapKey(g), Math.abs((185 - 200) / 200));
}
{
  // 래더 없는 keep — 다음 매수가는 없다(null). 목표 상단은 목표가 칸으로 간다(TASK-163).
  const g = { active: [call({ skill: "a", call: "keep", target: { low: 250, high: 300, horizonMonths: 12 } })], history: [] };
  check("래더 없는 keep: 다음 매수가 없음", groupGoal(g), null);
  check("래더 없는 keep: 정렬 ∞", goalGapKey(g), Number.POSITIVE_INFINITY);
  check("래더 없는 keep: 목표가 = target.high", groupTarget(g)?.price, 300);
}
{
  const g = {
    active: [call({ skill: "a", call: "keep", target: { tranches: ["1차 ≤$180 (50%)", "2차 ≤$160 (50%)"] } })],
    history: [],
  };
  check("keep 증액 래더", [groupGoal(g)?.kind, groupGoal(g)?.price], ["add", 180]);
  check("keep 증액 정렬 키", goalGapKey(g), 0.1);
}
{
  // 관망의 밴드는 진입가라 목표가가 아니다 — 내재가치가 없으면 목표가 칸은 비고, 있으면 그 값(TASK-164).
  const bare = { active: [call({ skill: "a", call: "hold", target: { low: 150, high: 170 } })], history: [] };
  check("hold 목표가: 내재가치 없으면 null", groupTarget(bare), null);
  const withFv = {
    active: [
      call({ skill: "a", date: "2026-08-20", call: "hold", target: { low: 150, high: 170 } }),
      call({ skill: "b", date: "2026-08-01", call: "hold", target: { low: 150, high: 170, fairValue: 240 } }),
    ],
    history: [],
  };
  check("hold 목표가: 최근 내재가치", [groupTarget(withFv)?.price, groupTarget(withFv)?.source], [240, "fairValue"]);
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
  const needsRefresh = groups.filter((g) => g.refresh.length > 0);
  console.log(`   갱신 필요 ${needsRefresh.length}종목`);
  for (const g of needsRefresh) {
    console.log(`   · ${g.ticker}: ${g.refresh.map((f) => `${f.skill}(${f.date}) ${f.reasons.join(" · ")}`).join(" / ")}`);
  }
  if (groups.some((g) => g.active.length === 0)) {
    failures.push("[원장] 살아있는 논제가 0건인 종목이 생겼다 — 종목이 화면에서 사라진다");
  }
} catch (e) {
  failures.push(`[원장] 읽기 실패: ${String(e)}`);
}

// ── 추격 금지 분리: 현재가가 살아있는 논제의 추격 금지선을 넘었나 ──────────
{
  const mk = (active: ScoredCall[]) => ({ active });
  const nc = (line: number | undefined, priceNow: number, skill = "a") =>
    call({ skill, target: { low: 90, high: 100, ...(line != null ? { noChaseAbove: line } : {}) } } as Partial<RawCall> & { skill: string }, priceNow);
  check("현재가 > 추격금지선 → 초과", chaseBreaches(mk([nc(120, 130)])).length, 1);
  check("현재가 ≤ 추격금지선 → 정상", chaseBreaches(mk([nc(120, 120)])).length, 0);
  check("추격금지선 미기록 → 정상", chaseBreaches(mk([nc(undefined, 500)])).length, 0);
  check("논제 둘 중 하나만 넘어도 초과", chaseBreaches(mk([nc(150, 130, "a"), nc(120, 130, "b")])).map((h) => h.skill).join(","), "b");
}

// ── 외부 적정가 이탈 (TASK-175): 우리 IV 가 외부의 75~125% 밖이면 해명 필요 ──────────
{
  const ev = (fv: number | undefined, ext: number | undefined, src = "morningstar") =>
    call({ skill: "thesis-tracker", target: { low: 90, high: 100, fairValue: fv, extFairValue: ext, extSource: src } } as Partial<RawCall> & { skill: string }, 100);
  check("IV 69% of 모닝스타 → 보수 이탈", externalGap(ev(300, 433))?.side, "conservative");
  check("IV 92% → 정합", externalGap(ev(400, 433)), null);
  check("IV 139% → 낙관 이탈", externalGap(ev(600, 433))?.side, "optimistic");
  check("외부 미기록 → 판정 없음", externalGap(ev(300, undefined)), null);
  check("이탈 → 갱신 사유", detectRefresh([ev(300, 433)])[0]?.reasons.some((r) => r.includes("보수 이탈")), true);
}

// ── 제외 논제 (TASK-192): 살아있는 판단이 전부 avoid 면 제외 ──────────────────
{
  const mk = (active: ScoredCall[]) => ({ active });
  check("avoid 단독 → 제외", isExcluded(mk([call({ skill: "a", call: "avoid" })])), true);
  check("avoid 둘 → 제외", isExcluded(mk([call({ skill: "a", call: "avoid" }), call({ skill: "b", call: "avoid" })])), true);
  // 다른 출처가 아직 관망을 말하면 제외가 아니라 충돌이다.
  check("avoid + hold → 제외 아님", isExcluded(mk([call({ skill: "a", call: "avoid" }), call({ skill: "b", call: "hold" })])), false);
  check("hold → 제외 아님", isExcluded(mk([call({ skill: "a", call: "hold" })])), false);
  check("논제 없음 → 제외 아님", isExcluded(mk([])), false);
}

// ── 건강도 저하 연속 (TASK-192): 최근 2개 검토 '날짜'가 전부 4 이하 ──────────────
{
  const hc = (date: string, health: number | undefined, skill = "thesis-tracker", over: Partial<RawCall> = {}) =>
    call({ skill, date, id: `TST-${date}-${skill}`, ...(health != null ? { health } : {}), ...over });
  const hOf = (c: ScoredCall) => (typeof c.health === "number" ? c.health : null);
  const g = (calls: ScoredCall[]) => ({ active: calls.slice(0, 1), history: calls.slice(1) });

  check("4·3 연속 → 걸림", lowHealthStreak(g([hc("2026-08-20", 4), hc("2026-05-20", 3)]), hOf) != null, true);
  check("4 한 번 → 유예", lowHealthStreak(g([hc("2026-08-20", 4), hc("2026-05-20", 7)]), hOf), null);
  check("회복(5) 후 → 안 걸림", lowHealthStreak(g([hc("2026-08-20", 5), hc("2026-05-20", 3)]), hOf), null);
  check("검토 1회뿐 → 판정 없음", lowHealthStreak(g([hc("2026-08-20", 2)]), hOf), null);
  // 같은 날 두 스킬이 각각 4를 적어도 '2회 연속'이 아니다 — 날짜 단위로 센다.
  check(
    "같은 날 콜 둘 → 1회로 셈",
    lowHealthStreak(g([hc("2026-08-20", 4, "thesis-tracker"), hc("2026-08-20", 4, "investment-team"), hc("2026-05-20", 8)]), hOf),
    null,
  );
  check("건강도 미기록 콜은 건너뜀", lowHealthStreak(g([hc("2026-08-25", undefined), hc("2026-08-20", 4), hc("2026-05-20", 3)]), hOf) != null, true);
  check("avoid 콜은 건너뜀", lowHealthStreak(g([hc("2026-08-25", 9, "a", { call: "avoid" }), hc("2026-08-20", 4), hc("2026-05-20", 3)]), hOf) != null, true);
}

if (failures.length > 0) {
  console.error(`❌ 논제 묶기 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 논제 묶기·충돌 판정 통과");
