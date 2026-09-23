/**
 * Delta — 등락·변화량 표시.
 *
 * 🔴 이 컴포넌트의 존재 이유는 "색으로만 말하지 않기"를 호출부가 실수할 수 없게
 *    강제하는 것이다. 색(한국 관례: 상승 빨강/하락 파랑) + 부호(+/−/±) +
 *    도형(▲/▼/─) 세 겹을 항상 함께 낸다. 적록색약이나 흑백 출력에서도 뜻이 남는다.
 *
 * 색 규칙은 skills 문서가 아니라 app/globals.css 의 --color-up / --color-down 이
 * 유일한 출처다. 여기서 hex 를 쓰지 않는다.
 */

type DeltaFormat = "percent" | "currency" | "plain";
type DeltaSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<DeltaSize, { text: string; icon: number; gap: string }> = {
  sm: { text: "text-[11px]", icon: 9, gap: "gap-1" },
  md: { text: "text-sm", icon: 11, gap: "gap-1.5" },
  lg: { text: "text-lg", icon: 13, gap: "gap-1.5" },
  xl: { text: "text-3xl tracking-[-0.02em]", icon: 18, gap: "gap-2" },
};

function shape(dir: "up" | "down" | "flat", px: number) {
  if (dir === "flat") {
    return (
      <svg width={px} height={px} viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
        <rect x="1.5" y="5.75" width="11" height="2.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={px} height={px} viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <path d={dir === "up" ? "M7 2 L12.5 11.5 L1.5 11.5 Z" : "M7 12 L12.5 2.5 L1.5 2.5 Z"} fill="currentColor" />
    </svg>
  );
}

export function Delta({
  value,
  format = "percent",
  size = "md",
  digits = 2,
  showShape = true,
  bold = true,
  emptyLabel = "—",
  className = "",
}: {
  value: number | null | undefined;
  format?: DeltaFormat;
  size?: DeltaSize;
  digits?: number;
  /** 공간이 아주 좁은 인라인 자리에서만 끈다. 끄면 색+부호 두 겹만 남는다. */
  showShape?: boolean;
  bold?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const s = SIZE[size];

  if (value == null || Number.isNaN(value)) {
    return <span className={`text-mute ${s.text} ${className}`}>{emptyLabel}</span>;
  }

  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const tone = dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-mute";
  const sign = dir === "up" ? "+" : dir === "down" ? "−" : "±";
  const abs = Math.abs(value);

  const body =
    format === "percent"
      ? `${sign}${abs.toFixed(digits)}%`
      : format === "currency"
        ? `${sign}$${abs.toFixed(digits)}`
        : `${sign}${abs.toFixed(digits)}`;

  return (
    <span className={`inline-flex items-center ${s.gap} ${tone} ${s.text} ${bold ? "font-bold" : ""} ${className}`}>
      {showShape && shape(dir, s.icon)}
      <span className="tabular-nums">{body}</span>
    </span>
  );
}
