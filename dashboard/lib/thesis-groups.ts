// 종목별 '살아있는 논제' 묶기 + 논제 간 충돌 판정 (TASK-97).
//
// 지금까지 트랙레코드는 종목당 **최신 콜 1건**만 남기고 나머지를 이력으로 접었다.
// 그러면 보고서가 여러 개 나와도 화면에는 하나만 살아 있어서, 서로 다른 보고서가
// 서로 다른 진입 계획을 말하고 있다는 사실 자체가 보이지 않는다.
// (실제로 NVDA 는 investment-team 과 thesis-tracker 의 논제가 동시에 살아 있다.)
//
// 여기서는 **스킬 하나당 최신 1건**을 살아있는 논제로 보고, 그것들을 나란히 세운 뒤
// 서로 어긋나는지를 판정한다. 같은 스킬의 더 최신 콜은 앞선 판단을 '갱신'한 것이므로
// 충돌이 아니라 이력이다 — 충돌은 **서로 다른 출처끼리**만 성립한다.

// node 로 직접 돌리는 테스트가 있어 값 import 는 확장자를 붙인다(lib/*.test.ts 규약).
import type { ScoredCall, CallType } from "./calls";
import { parseTranches, topTranchePrice } from "./tranche.ts";

/** 최상단 차수 가격이 이만큼 벌어지면 "어디부터 사기 시작하는가"가 다른 것으로 본다(%). */
const TOP_PRICE_GAP_PCT = 15;

export interface ThesisGroup {
  ticker: string;
  /** 살아있는 논제(스킬별 최신 1건). 최신순. */
  active: ScoredCall[];
  /** 갱신·종료된 나머지 콜 전부. 펼침 이력용. */
  history: ScoredCall[];
  /** 살아있는 논제가 여럿이고 서로 어긋날 때, 무엇이 갈리는지. 아니면 null. */
  conflict: { reasons: string[] } | null;
  /** 판단을 다시 내려야 하는 논제(= 그 스킬을 다시 돌려야 한다). 없으면 빈 배열. */
  refresh: RefreshFlag[];
  /** 살아있는 논제가 없어 최신 1건으로 폴백한 경우(채점이 끝난 종목). */
  resolvedOnly: boolean;
}

// 콜은 '포지션'이 아니라 예측이라, 세 갈래로 갈린다:
//   bull  buy/keep — 지금 사거나 계속 들고 간다
//   bear  avoid    — 피한다
//   wait  hold     — 아직 사지 않고 진입가로 내려오길 기다린다
// keep 과 hold 는 특히 정반대를 예측한다(전자는 하락 없음이 적중, 후자는 하락이 적중).
type Stance = "bull" | "bear" | "wait";
const STANCE: Record<CallType, Stance> = { buy: "bull", keep: "bull", avoid: "bear", hold: "wait" };
const STANCE_LABEL: Record<Stance, string> = { bull: "매수·보유", bear: "회피", wait: "관망" };

/** 아직 결론이 안 난 콜인가. 시세를 못 받아온 unknown 도 '살아있다'로 본다(네트워크 문제로 논제가 사라지면 안 된다). */
function isLive(c: ScoredCall): boolean {
  return c.status === "진행중" || c.status === "unknown";
}

/**
 * 이 논제가 말하는 '첫 집행 지점' — 최상단 차수 가격, 없으면 **진입 밴드** 상단.
 *
 * 🔴 밴드 폴백은 `hold` 에만 쓴다(TASK-114). hold 의 밴드는 '내려오길 기다리는 진입가'라
 * 집행 지점과 같은 축이지만, buy·keep 의 밴드는 **올라가야 할 목표가**라 축이 정반대다.
 * 가르지 않으면 같은 종목의 목표가와 증액 차수를 맞대고 "진입 시작가가 33% 벌어진다"는
 * 허위 충돌이 뜬다(실측: ADBE earnings-team $308(목표) vs thesis-tracker $231(증액 1차)).
 * 래더가 없는 buy·keep 논제는 **집행 지점을 모르는 것**이 맞다 — null 이 정답이다.
 */
export function entryTopPrice(c: ScoredCall): number | null {
  const top = topTranchePrice(parseTranches(c.target?.tranches));
  if (top != null) return top;
  if (c.call !== "hold") return null;
  return typeof c.target?.high === "number" ? c.target.high : null;
}

function bandOf(c: ScoredCall): [number, number] | null {
  const lo = c.target?.low;
  const hi = c.target?.high;
  return typeof lo === "number" && typeof hi === "number" ? [Math.min(lo, hi), Math.max(lo, hi)] : null;
}

function fmt(n: number): string {
  return `$${n.toFixed(n < 10 ? 2 : 0)}`;
}

/**
 * 살아있는 논제들이 서로 어긋나는지. 어긋나는 이유를 사람이 읽을 수 있게 돌려준다.
 * 규칙 셋 — 하나라도 걸리면 충돌:
 *   1) 방향이 다르다 (매수·보유 / 회피 / 관망은 서로 다른 행동을 요구한다)
 *   2) 목표·진입 밴드가 겹치지 않는다 (같은 가격대를 말하고 있지 않다)
 *   3) 첫 집행 지점이 15% 넘게 벌어진다 (같은 방향이어도 '언제 사냐'가 다르다)
 */
export function detectConflict(active: ScoredCall[]): { reasons: string[] } | null {
  if (active.length < 2) return null;
  const reasons: string[] = [];

  // 1) 방향
  const stances = new Map<Stance, string[]>();
  for (const c of active) {
    const s = STANCE[c.call];
    stances.set(s, [...(stances.get(s) ?? []), c.skill]);
  }
  if (stances.size > 1) {
    const parts = Array.from(stances.entries()).map(
      ([s, skills]) => `${STANCE_LABEL[s]}(${skills.join(", ")})`
    );
    reasons.push(`판단 방향이 갈린다 — ${parts.join(" vs ")}`);
  }

  // 2) 밴드 미교차 — 밴드가 있는 논제끼리만 비교한다.
  const banded = active.filter((c) => bandOf(c) != null);
  for (let i = 0; i < banded.length; i++) {
    for (let j = i + 1; j < banded.length; j++) {
      const a = bandOf(banded[i])!;
      const b = bandOf(banded[j])!;
      if (a[1] < b[0] || b[1] < a[0]) {
        reasons.push(
          `가격대가 겹치지 않는다 — ${banded[i].skill} ${fmt(a[0])}~${fmt(a[1])} vs ${banded[j].skill} ${fmt(b[0])}~${fmt(b[1])}`
        );
      }
    }
  }

  // 3) 첫 집행 지점 간격
  const tops = active
    .map((c) => ({ skill: c.skill, top: entryTopPrice(c) }))
    .filter((x): x is { skill: string; top: number } => x.top != null);
  if (tops.length >= 2) {
    const lo = tops.reduce((m, x) => (x.top < m.top ? x : m));
    const hi = tops.reduce((m, x) => (x.top > m.top ? x : m));
    const gap = lo.top !== 0 ? ((hi.top - lo.top) / lo.top) * 100 : 0;
    if (gap > TOP_PRICE_GAP_PCT) {
      reasons.push(
        `진입 시작가가 ${gap.toFixed(0)}% 벌어진다 — ${hi.skill} ${fmt(hi.top)} vs ${lo.skill} ${fmt(lo.top)}`
      );
    }
  }

  return reasons.length > 0 ? { reasons } : null;
}

/** 이 논제(스킬)는 다시 판단해야 한다 — 어느 스킬을 왜 돌려야 하는지. */
export interface RefreshFlag {
  /** 다시 돌려야 할 스킬(= 그 결론을 낸 보고서의 출처). */
  skill: string;
  /** 그 스킬이 마지막으로 판단한 날. */
  date: string;
  /** 갱신이 필요한 이유. 사람이 그대로 읽는다. */
  reasons: string[];
}

/** 논제 재검토 주기(일). 분기 검토를 안 거친 논제는 사실관계가 한 번은 바뀌었다고 본다. */
const REVIEW_CYCLE_DAYS = 90;

/** 이 기간 안에 기록된 콜의 밴드는 '재산출 직후'로 보고 이탈 판정에서 제외한다. */
const FRESH_BAND_DAYS = 30;

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : 0;
}

/**
 * 살아있는 논제 중 **다시 판단해야 하는 것**. 충돌 배너가 "무엇이 갈리는지"를 말한다면
 * 이건 "그래서 어느 스킬을 돌려야 하는지"를 말한다 — 충돌을 봐도 다음 행동을 모르면 소용없다.
 *
 * 두 가지만 본다:
 *   1) 충돌 중 뒤처진 논제 — 더 최신 판단이 이미 있는데 옛 결론이 같이 살아 있다.
 *      (실측: NVDA investment-team 08-06 이 thesis-tracker 08-28 옆에 그대로 남아 있었다)
 *   2) 분기 검토 미경과 — 충돌이 없어도 90일이 지났으면 그 자체로 갱신 대상이다.
 */
/**
 * 밴드 이탈 판정 — skills/quality-tier.md 2.5단계 · thesis-tracker B4.5 (2026-09-23 개정).
 *
 * 관망(`hold`) 중인데 주가가 진입 밴드 상단에서 **그 종목의 요구 MOS보다 더** 멀어졌으면,
 * 틀린 쪽은 시장이 아니라 우리 내재가치 계산일 가능성이 높다 — 재산출을 강제한다.
 *
 * 기준이 요구 MOS인 이유: `이탈률 > MOS ⟺ 현재가 > 내재가치 × (1 − MOS²)`,
 * 즉 "시장이 내 내재가치보다 비싸게 매기고 있다"를 티어별로 자동 보정해 잡아낸다.
 * 종전의 +20% 고정 기준은 T1(요구 15%)을 놓치고 T3(요구 35%)를 과잉 발동시켰다.
 *
 * 실측(2026-09-23 관망 8종목): 체결확률 25% 기준과 **8건 중 7건 일치**.
 * 불일치 1건(TSM)은 이 기준이 더 엄격한 쪽이라 보수적으로 잡힌다.
 *
 * 🔴 **신선도 가드**: 최근 {@link FRESH_BAND_DAYS}일 안에 기록된 콜은 보지 않는다.
 * 재산출의 결론이 "밴드는 그대로 두고 촉매를 기다린다"(catalyst-wait)인 경우가 실제로 있고,
 * 그때 밴드는 여전히 주가에서 멀다 — 가드가 없으면 **방금 끝낸 검토를 즉시 다시 요구**한다
 * (2026-09-23 QLYS 재산출 직후 경과 0일에 재지목되어 발견). 그 이후의 이탈만 '드리프트'다.
 */
export function bandDrift(
  c: ScoredCall
): { driftPct: number; requiredMosPct: number } | null {
  if (c.call !== "hold") return null;
  if (c.elapsedDays < FRESH_BAND_DAYS) return null;
  const high = c.target?.high;
  const mos = c.requiredMosPct;
  if (c.priceNow == null || typeof high !== "number" || high <= 0) return null;
  if (typeof mos !== "number" || !Number.isFinite(mos)) return null;
  const driftPct = (c.priceNow / high - 1) * 100;
  return driftPct > mos ? { driftPct, requiredMosPct: mos } : null;
}

export function detectRefresh(active: ScoredCall[], conflicted: boolean): RefreshFlag[] {
  if (active.length === 0) return [];
  const newest = active.reduce((m, c) => (c.date > m.date ? c : m));

  const flags: RefreshFlag[] = [];
  for (const c of active) {
    const reasons: string[] = [];
    if (conflicted && c.id !== newest.id && c.date < newest.date) {
      reasons.push(
        `${newest.skill} ${newest.date}보다 ${daysBetween(c.date, newest.date)}일 뒤처짐`
      );
    }
    if (c.elapsedDays > REVIEW_CYCLE_DAYS) {
      reasons.push(`분기 검토(${REVIEW_CYCLE_DAYS}일) 경과 — ${c.elapsedDays}일째`);
    }
    const drift = bandDrift(c);
    if (drift != null) {
      reasons.push(
        `밴드 이탈 +${drift.driftPct.toFixed(1)}% > 요구 MOS ${drift.requiredMosPct}% — 재산출 강제`
      );
    }
    if (reasons.length > 0) flags.push({ skill: c.skill, date: c.date, reasons });
  }
  return flags;
}

/**
 * 콜 원장(최신순 정렬 전제) → 종목별 논제 묶음.
 * 정렬은 /api/calls 가 이미 date·recordedAt 최신순으로 해서 준다.
 */
export function groupTheses(calls: ScoredCall[]): ThesisGroup[] {
  const byTicker = new Map<string, ScoredCall[]>();
  for (const c of calls) {
    const k = c.ticker.trim().toUpperCase();
    byTicker.set(k, [...(byTicker.get(k) ?? []), c]);
  }

  const groups: ThesisGroup[] = [];
  for (const [ticker, list] of byTicker) {
    // 스킬별 최신 1건 = 그 출처가 현재 말하고 있는 것. 같은 스킬의 옛 콜은 갱신됐다.
    const latestPerSkill = new Map<string, ScoredCall>();
    for (const c of list) if (!latestPerSkill.has(c.skill)) latestPerSkill.set(c.skill, c);

    const candidates = Array.from(latestPerSkill.values());
    const live = candidates.filter(isLive);
    // 전부 채점이 끝났으면 종목을 숨기지 않고 최신 1건으로 남긴다 — 추적 대상에서
    // 조용히 사라지면 "그 종목은 어떻게 됐나"를 볼 길이 없어진다.
    const resolvedOnly = live.length === 0;
    const active = resolvedOnly ? candidates.slice(0, 1) : live;
    const activeIds = new Set(active.map((c) => c.id));

    const conflict = detectConflict(active);
    groups.push({
      ticker,
      active,
      history: list.filter((c) => !activeIds.has(c.id)),
      conflict,
      // 채점이 끝난 종목(resolvedOnly)은 추적 대상이 아니라 이력이라 갱신을 요구하지 않는다.
      refresh: resolvedOnly ? [] : detectRefresh(active, conflict != null),
      resolvedOnly,
    });
  }

  // 살아있는 논제가 있는 종목 먼저, 그 안에서는 최근 갱신순.
  return groups.sort((a, b) => {
    if (a.resolvedOnly !== b.resolvedOnly) return a.resolvedOnly ? 1 : -1;
    const da = a.active[0]?.date ?? "";
    const db = b.active[0]?.date ?? "";
    return da < db ? 1 : da > db ? -1 : a.ticker.localeCompare(b.ticker);
  });
}
