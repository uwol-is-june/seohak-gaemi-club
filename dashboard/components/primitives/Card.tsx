/**
 * Card — 토스식 서페이스.
 *
 * 🔴 이전 xAI 시스템은 "그림자 없음 · 헤어라인이 모든 elevation"이었는데,
 *    그 헤어라인이 1.26:1이라 실제로는 아무 구조도 못 지고 있었다.
 *    여기서는 **서페이스 단차(배경 밝기)** 가 위계를 지고 보더는 장식이다.
 *
 * 반경은 토스 공개값을 따른다 — 12px(rounded-xl) 내부 블록, 16px(rounded-2xl) 카드.
 */

import type { ElementType, ReactNode } from "react";

const LEVEL = {
  /** 캔버스 위 기본 카드 */
  base: "bg-canvas-card",
  /** 카드 안의 블록 — 한 단 더 밝게 */
  inset: "bg-canvas-soft",
  /** 강조 블록 — 가장 밝은 단 */
  raised: "bg-canvas-mid",
  /** 배경 없음 — 보더만 필요한 자리 */
  ghost: "bg-transparent border border-hairline",
} as const;

const PAD = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  xl: "p-6",
} as const;

const RADIUS = {
  /** 내부 블록 */
  inner: "rounded-xl",
  /** 카드 */
  outer: "rounded-2xl",
} as const;

export function Card({
  as: Tag = "div",
  level = "base",
  padding = "lg",
  radius = "outer",
  interactive = false,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  level?: keyof typeof LEVEL;
  padding?: keyof typeof PAD;
  radius?: keyof typeof RADIUS;
  /** 누를 수 있는 카드에만. hover/active 피드백이 붙는다. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag
      className={[
        LEVEL[level],
        PAD[padding],
        RADIUS[radius],
        interactive
          ? "cursor-pointer text-left transition-colors hover:bg-canvas-soft active:scale-[0.995]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * 섹션 머리 — 카드 안에서 제목 + 우측 보조 액션을 잡는 자리.
 */
export function CardHeader({
  title,
  aside,
  sub,
  className = "",
}: {
  title: ReactNode;
  aside?: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center gap-2.5 ${className}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[17px] font-bold text-ink">{title}</span>
        {sub && <span className="truncate text-[13px] text-mute">{sub}</span>}
      </div>
      {aside && <div className="ml-auto flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}
