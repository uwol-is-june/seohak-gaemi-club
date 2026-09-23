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

// 퀄리티 티어 메타는 components/primitives/TierBadge.tsx 가 유일한 출처다
// (같은 정의가 두 곳에 있으면 한쪽만 고쳐져 어긋난다).

// 체결확률 25% 미만일 때 택한 대응(record_call.py 가 셋 중 하나를 강제한다).
export const LOW_FILL_PLAN_LABEL: Record<string, string> = {
  starter: "1차를 현재가 근처 스타터로",
  "catalyst-wait": "포지션 없음 · 촉매 대기",
  "widen-horizon": "호라이즌 연장",
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
 * 논제 건강도 — 원장(calls.jsonl)에 전용 필드가 없어 `conviction` 자유 텍스트에서 뽑는다.
 *
 * 실제로 섞여 있는 표기: "★★★☆☆ (논제 건강도 5/10)" · "건강도 3/10 (7/10에서 하락)" ·
 * "논제 건강도 7/10 (데이터 신뢰도 높음)". 없는 콜도 많다 — 그럴 땐 null 로 두고
 * 화면에서 □로 드러낸다(빈칸으로 숨기면 영원히 안 채워진다).
 *
 * ⚠️ 정본은 reports/track-record.md 다. 여기 값은 콜을 기록할 때 같이 적어둔 스냅샷이라
 * 마크다운을 나중에 고쳤으면 뒤처질 수 있다.
 */
export function parseHealth(conviction: string | undefined | null): number | null {
  if (!conviction) return null;
  const m = conviction.match(/건강도\s*(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
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
