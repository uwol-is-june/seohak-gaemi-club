import { pricedTranches, noteTranches, type Tranche } from "@/lib/tranche";

// 분할 진입 래더를 **차수별 목록**으로 그린다(TASK-97 → 2026-10-02 개편).
//
// 이전 판은 가격 축 위에 절대 위치로 라벨을 찍었는데, 현재가·매수가·추격금지선이
// 서로 가까우면 라벨이 겹쳐 읽을 수 없었고, 차수의 AND 조건은 그림 아래로 떨어져
// "어느 차수의 조건인가"를 눈으로 짝지어야 했다. 가격 축 그림은 바로 아래
// PriceHistoryChart 가 이미 맡고 있으므로, 여기서는 목록 한 장이 셋에 답한다:
//   1) 현재가가 래더의 어디쯤인가          → 차수 사이에 끼워 넣은 현재가 구분선 + 차수별 거리(%)
//   2) 각 차수에 얼마씩 넣나                → 차수별 비중 막대(0~100% 고정 스케일)
//   3) 가격이 닿아도 못 사는 차수는 어디인가 → 차수 바로 밑의 AND 조건 + 추격금지선
//
// 위가 비싸다(주가 차트와 같은 방향). 가격 있는 차수가 없으면 원문 목록으로 폴백한다.

function fmt(v: number): string {
  return `$${v.toFixed(v < 100 ? 2 : 0)}`;
}

function pct(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;
}

export function LadderChart({
  tranches,
  band,
  bandLabel,
  priceNow,
  avgPrice,
  noChaseAbove,
}: {
  tranches: Tranche[];
  band: { low?: number; high?: number } | null;
  /** 이 밴드가 '진입 대기'인지 '도달 목표'인지 — 콜 종류에 따라 정반대라 반드시 붙인다. */
  bandLabel: string;
  priceNow: number | null;
  /** 포트폴리오(토스) 평단가. 미보유면 null — 그리지 않는다. */
  avgPrice: number | null;
  noChaseAbove: number | null;
}) {
  const priced = [...pricedTranches(tranches)].sort((a, b) => (b.price as number) - (a.price as number));
  const notes = noteTranches(tranches);
  const bandLow = typeof band?.low === "number" ? band.low : null;
  const bandHigh = typeof band?.high === "number" ? band.high : null;

  if (priced.length === 0) {
    return <LadderFallback tranches={tranches} bandLabel={bandLabel} band={band} />;
  }

  // 추격금지선을 넘었으면 어떤 차수도 활성화되지 않는다 — 래더 전체를 죽여서 보여준다.
  const chaseBreached = noChaseAbove != null && priceNow != null && priceNow > noChaseAbove;
  // 현재가 구분선이 들어갈 자리 = 현재가보다 비싼 차수의 개수(가격 내림차순 기준).
  const nowIdx = priceNow == null ? -1 : priced.filter((t) => (t.price as number) > priceNow).length;

  const nowDivider = priceNow != null && (
    <div className="flex items-center gap-2 py-1" aria-label={`현재가 ${fmt(priceNow)}`}>
      <span className="eyebrow text-[9px] text-ink">현재가</span>
      <span className="font-mono text-[11px] text-ink">{fmt(priceNow)}</span>
      <span className="flex-1 border-t border-ink/40" />
    </div>
  );

  return (
    <div className="mt-3 mb-3">
      {/* 기준 가격 — 매수가·추격금지선. 현재가는 목록 안 제자리에 끼워 넣는다. */}
      {(avgPrice != null || noChaseAbove != null) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          {avgPrice != null && (
            <span className="text-mute">
              매수가 <span className="font-mono text-breeze">{fmt(avgPrice)}</span>
            </span>
          )}
          {noChaseAbove != null && (
            <span className="text-mute">
              추격금지 <span className="font-mono text-warn">&gt;{fmt(noChaseAbove)}</span>
              {priceNow != null && !chaseBreached && (
                <span className="font-mono text-mute"> (여유 {pct((noChaseAbove / priceNow - 1) * 100)})</span>
              )}
            </span>
          )}
        </div>
      )}

      {chaseBreached && (
        <p className="mb-1.5 rounded-md bg-warn/10 px-2 py-1 text-[10px] leading-snug text-warn">
          추격금지선 {fmt(noChaseAbove as number)} 초과 — 전 차수 미활성. 가격이 닿아도 집행하지 않는다.
        </p>
      )}

      <div className={`flex flex-col ${chaseBreached ? "opacity-45" : ""}`}>
        {priced.map((t, i) => {
          const price = t.price as number;
          const dist = priceNow != null ? (price / priceNow - 1) * 100 : null;
          const reached = priceNow != null && priceNow <= price;
          return (
            <div key={i}>
              {i === nowIdx && nowDivider}
              <div
                className="rounded-xl bg-canvas-soft px-3 py-2 mb-1"
              >
                {/* 1줄: 차수 · 가격 · 거리 ··· 비중 */}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="eyebrow w-7 text-[10px] text-mute">{t.label}</span>
                  <span className="font-mono text-[13px] text-ink">≤{fmt(price)}</span>
                  {dist != null && (
                    <span className={`font-mono text-[10px] ${reached ? "text-success" : "text-down"}`}>
                      {reached ? "도달" : pct(dist)}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5">
                    {t.weightPct != null ? (
                      <>
                        <span className="inline-block w-14 h-1.5 rounded-full bg-canvas-mid overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-down"
                            style={{ width: `${Math.min(100, t.weightPct)}%` }}
                          />
                        </span>
                        <span className="font-mono w-8 text-right text-[10px] text-body">
                          {Math.round(t.weightPct)}%
                        </span>
                      </>
                    ) : t.weightNote ? (
                      <span className="font-mono text-[10px] text-mute">{t.weightNote}</span>
                    ) : null}
                  </span>
                </div>
                {/* 2줄: 그 차수의 집행 조건 — 차수와 붙어 있어야 짝짓기 실수가 없다 */}
                {(t.condition || t.caveat) && (
                  <p className="mt-1 pl-9 text-[10px] leading-snug">
                    {t.condition && (
                      <>
                        <span className="font-medium text-warn">AND</span>{" "}
                        <span className="text-body">{t.condition}</span>
                      </>
                    )}
                    {t.caveat && <span className="text-mute">{t.condition ? " · " : ""}{t.caveat}</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {nowIdx === priced.length && nowDivider}
      </div>

      {/* 래더 아래 — 공통 조건과 채점 밴드 */}
      <div className="mt-1 flex flex-col gap-1">
        {notes.map((t, i) => (
          <p key={`n${i}`} className="text-[10px] text-mute leading-snug">
            {t.condition ? (
              <>
                <span className="eyebrow text-[9px] text-warn">공통</span>{" "}
                <span className="text-body">{t.condition}</span>
              </>
            ) : (
              t.raw
            )}
          </p>
        ))}
        {bandLow != null && bandHigh != null && (
          <p className="text-[10px] text-mute leading-snug">
            {bandLabel}{" "}
            <span className="font-mono text-body">
              {fmt(bandLow)}~{fmt(bandHigh)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// 가격 있는 차수가 없을 때(밴드만 있는 콜·파싱 실패)의 폴백. 원문을 그대로 보여준다.
function LadderFallback({
  tranches,
  band,
  bandLabel,
}: {
  tranches: Tranche[];
  band: { low?: number; high?: number } | null;
  bandLabel: string;
}) {
  const hasBand = typeof band?.low === "number" || typeof band?.high === "number";
  if (tranches.length === 0 && !hasBand) {
    return (
      <p className="text-[11px] text-mute leading-snug py-3">
        진입 래더가 아직 없습니다 — 차수·비중은 다음 검토 때 산출합니다.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 py-1 mb-2">
      {hasBand && (
        <p className="text-[11px]">
          <span className="text-[10px] text-mute">{bandLabel}</span>{" "}
          <span className="font-mono text-body">
            {typeof band?.low === "number" ? fmt(band.low) : "?"}~
            {typeof band?.high === "number" ? fmt(band.high) : "?"}
          </span>
        </p>
      )}
      {tranches.map((t, i) => (
        <p key={i} className="font-mono text-[10px] text-body leading-snug">
          {t.raw}
        </p>
      ))}
    </div>
  );
}
