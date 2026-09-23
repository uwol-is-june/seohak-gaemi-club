/**
 * 디자인 프리미티브 — 토스증권 레퍼런스 (다크).
 *
 * 기준 토큰은 app/globals.css 의 @theme 이 유일한 출처다.
 * 여기 어느 파일에서도 hex 를 직접 쓰지 않는다.
 *
 * 두 축을 섞지 말 것:
 *   등락(가격 방향) → Delta · ChipTone "up"/"down"   — 한국 관례(상승 빨강/하락 파랑)
 *   판정(맞았나)   → StatusChip "success"/"danger"/"warn"
 */

export { Delta } from "./Delta";
export { StatusChip, OutlineChip, type ChipTone } from "./StatusChip";
export { TierBadge, TIER_META, type Tier } from "./TierBadge";
export { Card, CardHeader } from "./Card";
export { NavItem, NavChip } from "./NavItem";
export { Button, IconButton } from "./Button";
