/**
 * NavItem / NavChip — 사이드바 항목과 모바일 탭 칩.
 *
 * 🔴 선택 상태를 흰 pill(`bg-white text-canvas`)로 뒤집던 것이 xAI 어휘였다.
 *    토스는 같은 어두운 면 안에서 **한 단 밝은 배경 + 굵은 글자**로 현재 위치를
 *    말한다. 반전은 한 화면에 하나뿐인 primary 액션에만 남긴다.
 */

import type { ReactNode } from "react";

export function NavItem({
  label,
  active,
  onClick,
  icon,
  count,
  chevron,
  className = "",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  /** 우측 개수 배지 — 값이 0이어도 보여준다(0건인 것과 모르는 것은 다르다). */
  count?: number | null;
  chevron?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm transition-colors ${
        active ? "bg-canvas-soft font-bold text-ink" : "font-medium text-body hover:bg-canvas-card hover:text-ink"
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 truncate text-left">{label}</span>
      {count != null && (
        <span className={`shrink-0 text-xs font-bold tabular-nums ${active ? "text-body" : "text-faint"}`}>
          {count}
        </span>
      )}
      {chevron && (
        <span className="shrink-0 text-xs text-mute" aria-hidden="true">
          &rsaquo;
        </span>
      )}
    </button>
  );
}

export function NavChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`min-h-9 shrink-0 rounded-full px-3.5 text-xs transition-colors active:scale-95 ${
        active ? "bg-ink font-bold text-canvas" : "bg-canvas-soft font-medium text-body hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
