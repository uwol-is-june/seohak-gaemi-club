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
