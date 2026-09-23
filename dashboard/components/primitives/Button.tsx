/**
 * Button — 액션.
 *
 * 🔴 primary fill 은 `--color-primary-press`(#1B64DA)를 쓴다.
 *    토스 공개값 #3182F6 위에 흰 글자는 3.71:1이라 본문 크기 라벨에서 AA 미달이다.
 *    같은 파랑 계열을 유지하면서 대비만 5.41:1로 끌어올린 값이다.
 *
 * 터치 타깃은 최소 44px(min-h-11) — 아이콘 전용도 동일.
 */

import type { ReactNode } from "react";

const VARIANT = {
  /** 한 화면에 하나. 지금 해야 할 일. */
  primary: "bg-primary-press text-on-primary hover:brightness-110",
  /** 기본 — 어두운 면 위 한 단 밝은 블록 */
  secondary: "bg-canvas-soft text-ink hover:bg-canvas-mid",
  /** 배경 없이 글자만 */
  ghost: "text-body hover:bg-canvas-soft hover:text-ink",
  /** 외곽선 — 보조 액션이 여러 개 나란히 설 때 */
  outline: "border border-border-control text-body hover:bg-canvas-soft hover:text-ink",
  /** 파괴적 액션 */
  danger: "bg-danger/10 text-danger hover:bg-danger/20",
} as const;

const SIZE = {
  sm: "min-h-9 px-3.5 text-[13px]",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-[15px]",
} as const;

export function Button({
  variant = "secondary",
  size = "md",
  pill = false,
  full = false,
  icon,
  className = "",
  children,
  ...rest
}: {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  /** 필터 칩처럼 완전 둥근 모양이 필요할 때 */
  pill?: boolean;
  full?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center gap-2 font-bold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        pill ? "rounded-full" : "rounded-xl",
        full ? "w-full" : "",
        VARIANT[variant],
        SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  ...rest
}: {
  /** 아이콘 전용 버튼은 접근 가능한 이름이 반드시 필요하다. */
  label: string;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-canvas-soft hover:text-ink active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
