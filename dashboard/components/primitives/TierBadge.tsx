/**
 * TierBadge — 퀄리티 티어(skills/quality-tier.md).
 *
 * 티어를 모르면 "이 할인율이 타당한가"를 판단할 수 없다. 요구 안전마진이
 * 티어별로 다르기 때문이다. 그래서 미기록(`null`)을 빈칸이 아니라 □로 드러낸다 —
 * 안 보이는 결측은 영원히 안 채워진다.
 */

export type Tier = "T1" | "T2" | "T3";

export const TIER_META: Record<Tier, { label: string; mos: string; mosShort: string }> = {
  T1: { label: "T1 컴파운더", mos: "요구 MOS 0~15%", mosShort: "15%" },
  T2: { label: "T2 우량 안정", mos: "요구 MOS 15~30%", mosShort: "25%" },
  T3: { label: "T3 시클리컬·턴어라운드·저품질", mos: "요구 MOS 30~40%", mosShort: "35%" },
};

export function TierBadge({
  tier,
  ticker,
  showMos = true,
  className = "",
}: {
  tier: Tier | null | undefined;
  /** 미기록일 때 안내에 넣을 티커 — 어떤 명령을 돌려야 하는지까지 말해준다. */
  ticker?: string;
  showMos?: boolean;
  className?: string;
}) {
  if (!tier) {
    return (
      <span
        title={`퀄리티 티어 미기록 — 요구 안전마진의 기준이 없다.\npython3 tools/quality_tier.py ${ticker ?? "{티커}"} --moat {★}`}
        className={`inline-flex shrink-0 items-center rounded-md border border-hairline px-2 py-0.5 text-[11px] font-medium text-mute ${className}`}
      >
        □ 티어 미기록
      </span>
    );
  }

  const m = TIER_META[tier];
  return (
    <span
      title={`${m.label} — ${m.mos}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md bg-canvas-soft px-2 py-0.5 text-[11px] font-bold text-body ${className}`}
    >
      <span className="text-ink">{tier}</span>
      {showMos && <span className="font-medium text-mute tabular-nums">MOS {m.mosShort}</span>}
    </span>
  );
}
