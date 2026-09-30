/**
 * 트랙레코드 화면의 표시 메타데이터와 순수 포맷터.
 *
 * TrackRecordView 본체는 상태와 화면만 들고, "이 값을 어떤 라벨·색으로 보여줄
 * 것인가" 같은 규칙은 여기로 모은다. 판정 규칙 자체(적중/빗나감 계산)는
 * lib/calls.ts scoreCall 이 정본이고 여기는 표시만 맡는다.
 */

import type { CallStatus, CallType } from "@/lib/calls";

export const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-success bg-success/15", dot: "bg-success" },
  빗나감: { label: "빗나감", color: "text-danger bg-danger/15", dot: "bg-danger" },
  진행중: { label: "진행중", color: "text-warn bg-warn/15", dot: "bg-warn" },
  unknown: { label: "미채점", color: "text-mute bg-canvas-soft", dot: "bg-canvas-mid" },
};

// 밴드는 콜 종류에 따라 의미가 정반대다 — hold 밴드는 '내려오길 기다리는 진입가'이고
// buy/keep 밴드는 '도달해야 할 목표가'다. 콜 종류를 화면에서 뺐으므로 이 라벨이
// 그 의미를 대신 진다(판정 규칙 자체는 lib/calls.ts scoreCall).
export const BAND_META: Record<CallType, { short: string; long: string; why: string }> = {
  hold: { short: "진입", long: "진입 대기 밴드", why: "이 구간으로 내려오면 적중 — 밴드가 곧 채점 기준" },
  buy: { short: "목표", long: "도달 목표가", why: "채점은 방향(상승)으로 하고, 밴드 도달은 보조 지표" },
  keep: { short: "목표", long: "도달 목표가", why: "상단을 넘겨도 적중 — 보유 유지는 상방이 열려 있음" },
  avoid: { short: "참고", long: "참고 밴드", why: "채점(하락 방향)에 쓰이지 않는 적정가 추정" },
};

// 래더가 비어 있을 때 띄우는 산출 방법. 화면이 결측을 지적만 하고 "그래서 뭘 치면 되나"를
// 안 알려주면 빈칸은 영원히 빈칸으로 남는다.
// 툴팁 줄바꿈. title 속성은 개행을 그대로 렌더하지만, 소스에 이스케이프를 흩어 두면
// 편집할 때마다 깨져서 상수로 뽑아 쓴다.
export const NL = String.fromCharCode(10);

export const TRANCHE_HOWTO =
  'python3 tools/record_call.py ... --tranche "1차 ≤$X (25%) — AND 조건" "2차 ≤$Y (35%)" ... --no-chase Z';

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
export function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-up" : "text-down";
}

export function fmtPrice(v: number): string {
  return `$${v.toFixed(2)}`;
}

/**
 * 논제 건강도 — **하위호환 폴백 전용**. `conviction` 자유 텍스트에서 "건강도 N/10" 을 긁는다.
 *
 * 원장에 `health` 숫자 필드가 생긴 뒤로 새 콜은 이 경로를 타지 않는다. 옛 콜에 섞여 있는
 * 표기는 이랬다: "★★★☆☆ (논제 건강도 5/10)" · "건강도 3/10 (7/10에서 하락)" ·
 * "논제 건강도 7/10 (데이터 신뢰도 높음)".
 *
 * 🔴 이 함수를 직접 부르지 말고 {@link callHealth} 를 쓴다 — 숫자 필드를 건너뛰면
 * 새로 기록한 건강도가 화면에 안 뜬다.
 */
export function parseHealth(conviction: string | undefined | null): number | null {
  if (!conviction) return null;
  const m = conviction.match(/건강도\s*(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
}

/**
 * 콜 한 건의 건강도 — **숫자 필드 우선, 자유 텍스트는 폴백.**
 *
 * `record_call.py --health` 로 기록한 값이 있으면 그것이 정답이다. 없으면 옛 콜이므로
 * `conviction` 을 파싱한다. 둘 다 없으면 null 로 두고 화면에서 □로 드러낸다
 * (빈칸으로 숨기면 영원히 안 채워진다).
 *
 * ⚠️ 정본은 reports/track-record.md 다. 여기 값은 콜을 기록할 때 같이 박아둔 스냅샷이라
 * 마크다운을 나중에 고쳤으면 뒤처질 수 있다.
 */
export function callHealth(c: { health?: number; conviction?: string }): number | null {
  if (typeof c.health === "number" && Number.isFinite(c.health) && c.health >= 0 && c.health <= 10) {
    return c.health;
  }
  return parseHealth(c.conviction);
}

/** 건강도 색 — 6 미만이면 논제가 흔들리는 중이다. */
export function healthTone(v: number | null): string {
  if (v == null) return "text-mute";
  if (v < 4) return "text-danger";
  if (v < 6.5) return "text-warn";
  return "text-ink";
}

/** 티커 이니셜 — 아바타 원에 넣는 두 글자. */
export function initials(ticker: string): string {
  return ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase();
}

/**
 * 종목 단위 건강도.
 *
 * 🔴 건강도는 종목 하나의 상태인데 **어느 콜에 적혀 있을지는 그때그때다.**
 * 대표 콜 하나만 보면 CEG 처럼 다른 논제에 적힌 값을 통째로 놓친다(실제로 놓쳤다).
 * 살아있는 논제를 전부 훑어 먼저 나오는 값을 쓴다.
 */
export function groupHealth(calls: { health?: number; conviction?: string }[]): number | null {
  for (const c of calls) {
    const h = callHealth(c);
    if (h != null) return h;
  }
  return null;
}

/**
 * 종목 단위 건강도 + **그 값이 언제 것인지.**
 *
 * 🔴 살아있는 논제(active)에 값이 없으면 지나간 콜(history)까지 뒤져 **날짜를 달아** 보여준다.
 * 근거: 건강도는 채점되는 예측이 아니라 상태 서술이라, 최신 콜이 값을 안 적었다는 이유로
 * 과거에 측정한 값까지 없는 척할 이유가 없다. 다만 **날짜 없이 보여주면 안 된다** —
 * 2026-08-12 CEG 5/10 을 오늘 값으로 읽으면 안 되기 때문이다.
 *
 * `stale: true` 는 "이 숫자는 지금 논제가 말한 게 아니다"라는 뜻이고, 화면은 날짜를 함께 진다.
 *
 * 🔴 active 와 history 를 **날짜순(최신 먼저)으로 합쳐** 첫 값을 고른다(TASK-147). 예전엔
 * active 를 먼저 다 훑어서, 다른 스킬의 옛 콜(active 에 남아 있는 7월 investment-team)의 값이
 * history 의 더 최근 값을 가리고 `stale:false · 날짜 없음` 으로 오늘 값처럼 보였다.
 * 최신 콜 자신의 값이 아니면 전부 stale — 날짜를 단다.
 */
export function groupHealthDated(
  active: HealthSource[],
  history: HealthSource[],
): { value: number; date: string | null; stale: boolean } | null {
  const all = [...active, ...history].sort(newestFirst);
  const newest = all[0];
  for (const c of all) {
    const h = callHealth(c);
    if (h == null) continue;
    return c === newest ? { value: h, date: null, stale: false } : { value: h, date: c.date, stale: true };
  }
  return null;
}

type HealthSource = { health?: number; conviction?: string; date: string; recordedAt?: string };

// 날짜 내림차순, 같은 날이면 기록 시각 내림차순. Array#sort 는 안정 정렬이라 동률이면 입력 순서를 지킨다.
function newestFirst(a: HealthSource, b: HealthSource): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ra = a.recordedAt ?? "";
  const rb = b.recordedAt ?? "";
  return ra < rb ? 1 : ra > rb ? -1 : 0;
}
