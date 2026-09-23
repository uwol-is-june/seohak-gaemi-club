/**
 * StatusChip — 판정·상태 칩.
 *
 * 🔴 판정 축은 등락 축과 다르다. `success/danger/warn` 은 콜이 맞았는지,
 *    조건이 충족됐는지를 말한다. 가격이 올랐는지(`up/down`)와 섞으면
 *    "빗나감"이 "상승"으로 읽힌다 — 그래서 톤 이름을 분리해 둔다.
 *
 * 칩은 항상 라벨 텍스트를 갖는다. 색은 보조이고 글자가 주다.
 */

import type { ReactNode } from "react";

export type ChipTone = "success" | "danger" | "warn" | "neutral" | "up" | "down" | "info";

const TONE: Record<ChipTone, { text: string; bg: string; dot: string }> = {
  success: { text: "text-success", bg: "bg-success/15", dot: "bg-success" },
  danger: { text: "text-danger", bg: "bg-danger/15", dot: "bg-danger" },
  warn: { text: "text-warn", bg: "bg-warn/15", dot: "bg-warn" },
  neutral: { text: "text-mute", bg: "bg-canvas-soft", dot: "bg-canvas-mid" },
  up: { text: "text-up", bg: "bg-up/15", dot: "bg-up" },
  down: { text: "text-down", bg: "bg-down/15", dot: "bg-down" },
  info: { text: "text-twilight", bg: "bg-twilight/15", dot: "bg-twilight" },
};

const SIZE = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-[11px] px-2 py-0.5 gap-1.5",
  lg: "text-xs px-2.5 py-1 gap-1.5",
} as const;

export function StatusChip({
  tone = "neutral",
  size = "md",
  dot = false,
  icon,
  title,
  children,
  className = "",
}: {
  tone?: ChipTone;
  size?: keyof typeof SIZE;
  /** 색 외에 형태 단서가 필요할 때. 아이콘을 주면 점 대신 아이콘이 나간다. */
  dot?: boolean;
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center rounded-full font-medium ${SIZE[size]} ${t.text} ${t.bg} ${className}`}
    >
      {icon ?? (dot && <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />)}
      {children}
    </span>
  );
}

/**
 * 외곽선만 있는 변형 — 한 줄에 칩이 여러 개 붙어 배경 블록이 뭉쳐 보일 때 쓴다.
 */
export function OutlineChip({
  size = "md",
  title,
  children,
  className = "",
}: {
  size?: keyof typeof SIZE;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center rounded-full border border-hairline font-medium text-mute ${SIZE[size]} ${className}`}
    >
      {children}
    </span>
  );
}
