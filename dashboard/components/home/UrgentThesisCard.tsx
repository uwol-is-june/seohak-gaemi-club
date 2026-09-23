"use client";

/**
 * 홈 히어로 — "오늘 볼 건 하나" (TASK-137).
 *
 * 포트폴리오 탭은 "얼마인가"를 답한다. 그런데 앱을 열었을 때 먼저 필요한 건
 * **"오늘 뭘 봐야 하나"** 다. 그 답이 트랙레코드 탭 안에 묻혀 있으면 안 들어가 보게 된다.
 *
 * 🔴 여기는 **한 건만** 띄운다. 목록을 또 만들면 트랙레코드 탭과 같은 화면이 두 개가 되고,
 *    둘이 어긋나기 시작한다. 이 카드는 입구일 뿐 목록이 아니다.
 *
 * 급한 것의 정의(순서대로):
 *   1) 갱신 필요 플래그가 붙었거나 건강도 6 미만 — 논제 자체가 흔들리는 중
 *   2) 그중 집행까지 가장 가까운 종목
 *   해당이 없으면 그냥 집행까지 가장 가까운 종목을 중립 문구로 띄운다.
 */

import { useEffect, useMemo, useState } from "react";
import { readJsonSafe } from "@/lib/fetch-json";
import type { ScoredCall } from "@/lib/calls";
import { groupTheses, entryTopPrice, type ThesisGroup } from "@/lib/thesis-groups";
import { parseTranches, pricedTranches, topTranchePrice } from "@/lib/tranche";
import { parseHealth, healthTone, initials, fmtPrice } from "../track-record/meta";
import { Delta, TierBadge } from "../primitives";

const HEALTH_ALERT_BELOW = 6;

type Pick = {
  group: ThesisGroup;
  lead: ScoredCall;
  gapPct: number | null;
  health: number | null;
  gated: { withCond: number; total: number } | null;
  alarmed: boolean;
};

function goalPrice(lead: ScoredCall): number | null {
  if (lead.call === "hold") return entryTopPrice(lead);
  if (lead.call === "buy" || lead.call === "keep") {
    return topTranchePrice(parseTranches(lead.target?.tranches)) ?? lead.target?.high ?? null;
  }
  return null;
}

export function UrgentThesisCard({ onOpen }: { onOpen: () => void }) {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/calls")
      .then(readJsonSafe)
      .then((d) => alive && setCalls(Array.isArray(d.calls) ? d.calls : []))
      .catch(() => alive && setCalls([]));
    return () => {
      alive = false;
    };
  }, []);

  const pick = useMemo<Pick | null>(() => {
    if (!calls || calls.length === 0) return null;
    const cands: Pick[] = [];
    for (const g of groupTheses(calls)) {
      const lead = g.active[0];
      if (!lead) continue; // 채점이 끝난 종목은 '오늘 볼 것'이 아니다
      const price = goalPrice(lead);
      const gapPct =
        price != null && lead.priceNow != null && lead.priceNow > 0
          ? ((price - lead.priceNow) / lead.priceNow) * 100
          : null;
      const health = parseHealth(lead.conviction);
      const all = g.active.flatMap((c) => pricedTranches(parseTranches(c.target?.tranches)));
      const withCond = all.filter((t) => t.condition).length;
      cands.push({
        group: g,
        lead,
        gapPct,
        health,
        gated: all.length > 0 && withCond > 0 ? { withCond, total: all.length } : null,
        alarmed: g.refresh.length > 0 || (health != null && health < HEALTH_ALERT_BELOW),
      });
    }
    if (cands.length === 0) return null;
    const near = (c: Pick) => (c.gapPct == null ? Number.POSITIVE_INFINITY : Math.abs(c.gapPct));
    const alarmed = cands.filter((c) => c.alarmed).sort((a, b) => near(a) - near(b));
    if (alarmed.length > 0) return alarmed[0];
    return [...cands].sort((a, b) => near(a) - near(b))[0];
  }, [calls]);

  if (!pick) return null;

  const { group, lead, gapPct, health, gated, alarmed } = pick;
  const price = goalPrice(lead);

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-col gap-1">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">
          {alarmed ? "오늘 볼 건 하나예요" : "집행에 가장 가까운 종목이에요"}
        </h2>
        <p className="text-[13px] text-mute">
          {alarmed
            ? "논제가 흔들리는 중인데 집행 거리도 가까워요. 가격보다 이게 먼저예요."
            : "논제 건강도에 경보는 없어요. 거리만 지켜보면 돼요."}
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-canvas-card p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {alarmed && (
              <span className="rounded-[7px] bg-up/15 px-2.5 py-1 text-[12px] font-bold text-up">
                {group.refresh.length > 0 ? "갱신 필요" : "건강도 경보"}
              </span>
            )}
            <span className="text-[13px] text-mute">
              {group.refresh.length > 0
                ? group.refresh.map((f) => `/${f.skill}`).join(", ") + " 다시 돌려야 해요"
                : health != null
                  ? `논제 건강도 ${health}/10`
                  : "집행까지 가장 가까움"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-[13px] font-bold text-body">
              {initials(group.ticker)}
            </span>
            <span className="font-mono text-[28px] font-bold tracking-[-0.02em] text-ink">{group.ticker}</span>
            <TierBadge tier={lead.tier ?? null} ticker={group.ticker} />
            {health != null && (
              <span className={`text-[13px] font-bold ${healthTone(health)}`}>건강도 {health}/10</span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-5">
            <span className="flex flex-col gap-0.5">
              <span className="text-[12px] text-mute">현재가</span>
              <span className="font-mono text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">
                {lead.priceNow != null ? fmtPrice(lead.priceNow) : "—"}
              </span>
            </span>
            {gapPct != null && price != null && (
              <span className="flex flex-col gap-0.5 pb-1">
                <span className="text-[12px] text-mute">
                  {lead.call === "hold" ? "진입까지" : "증액까지"} · {fmtPrice(price)}
                </span>
                <Delta value={gapPct} size="lg" />
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 rounded-xl bg-canvas-soft p-5 lg:w-[300px]">
          <span className="text-[12px] font-bold text-mute">집행 조건</span>
          {gated ? (
            <>
              <span className="text-[14px] font-medium text-ink">
                차수 {gated.total}개 중 <span className="text-warn">{gated.withCond}개</span>에 조건
              </span>
              <span className="text-[13px] leading-relaxed text-body">
                가격이 닿아도 조건이 안 채워졌으면 <b className="text-warn">집행하지 않아요.</b> 조건은 논제
                안에 적혀 있어요.
              </span>
            </>
          ) : (
            <span className="text-[13px] leading-relaxed text-body">
              걸린 조건이 없어요. 가격이 닿으면 계획대로 집행하면 돼요.
            </span>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-canvas-mid text-[14px] font-bold text-ink transition-colors hover:brightness-110 active:scale-[0.98]"
          >
            트랙레코드에서 보기
          </button>
        </div>
      </div>
    </section>
  );
}
