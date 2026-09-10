"use client";
import { pricedTranches, noteTranches, type Tranche } from "@/lib/tranche";

// 분할 진입 래더를 **가격 축 위의 그림**으로 그린다(TASK-97).
//
// 텍스트 목록("1차 ≤$185 (25%) — AND ...")은 주문서로는 정확하지만,
// "지금 가격이 어느 차수 근처인가 · 어디가 잠겨 있나"에 눈으로 답하지 못한다.
// 이 차트가 답해야 하는 것은 딱 셋이다:
//   1) 현재가가 래더의 어디쯤인가          → 밝은 현재가 라인의 위치
//   2) 각 차수에 얼마씩 넣나                → 차수별 비중 막대
//   3) 가격이 닿아도 못 사는 차수는 어디인가 → 조건 표시 + 추격금지선
//
// 축은 위가 비싸다(주가 차트와 같은 방향). 값이 하나뿐이거나 파싱이 안 된 래더는
// 그리지 않고 원문 목록으로 폴백한다 — 그리다 실패해서 정보가 사라지면 안 된다.

const H = 188; // 차트 높이(px). 차수 3~4개 + 가격 마커가 겹치지 않는 최소치.
const AXIS_X = 66; // 좌측 게이지(현재가·매수가 라벨) 폭
const LABEL_GAP = 21; // 차수 라벨끼리 최소 세로 간격(px)

function fmt(v: number): string {
  return `$${v.toFixed(v < 100 ? 2 : 0)}`;
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
  const priced = pricedTranches(tranches);
  const notes = noteTranches(tranches);
  const bandLow = typeof band?.low === "number" ? band.low : null;
  const bandHigh = typeof band?.high === "number" ? band.high : null;

  const values = [
    ...priced.map((t) => t.price as number),
    priceNow,
    avgPrice,
    noChaseAbove,
    bandLow,
    bandHigh,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  // 값이 하나 이하면 축을 만들 수 없다 — 원문을 그대로 보여주는 편이 정직하다.
  if (values.length < 2) {
    return <LadderFallback tranches={tranches} bandLabel={bandLabel} band={band} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const pad = span * 0.12;
  const lo = min - pad;
  const hi = max + pad;
  const y = (v: number) => ((hi - v) / (hi - lo)) * H;

  // 차수 라벨은 실제 가격 위치에 두되, 가까운 차수끼리 겹치면 아래로 밀어낸다.
  // 밀린 라벨은 축 위 실제 위치와 얇은 선으로 이어 어디 값인지 잃지 않게 한다.
  const rows = priced
    .map((t) => ({ t, trueY: y(t.price as number), labelY: y(t.price as number) }))
    .sort((a, b) => a.trueY - b.trueY);
  if (rows.length > 0) {
    rows[0].labelY = Math.max(9, rows[0].labelY);
    for (let i = 1; i < rows.length; i++) {
      rows[i].labelY = Math.max(rows[i].labelY, rows[i - 1].labelY + LABEL_GAP);
    }
    const overflow = rows[rows.length - 1].labelY - (H - 9);
    if (overflow > 0) for (const r of rows) r.labelY = Math.max(9, r.labelY - overflow);
  }

  // 추격금지선을 넘었으면 어떤 차수도 활성화되지 않는다 — 래더 전체를 죽여서 보여준다.
  const chaseBreached = noChaseAbove != null && priceNow != null && priceNow > noChaseAbove;

  return (
    <div>
      <div className={`relative ${chaseBreached ? "opacity-45" : ""}`} style={{ height: H }}>
        {/* 목표·진입 밴드 음영 — 차수가 어느 구간에 놓였는지의 배경 */}
        {bandLow != null && bandHigh != null && (
          <div
            className="absolute rounded-sm bg-white/[0.035] border-y border-hairline"
            style={{ left: AXIS_X, right: 0, top: y(bandHigh), height: Math.max(2, y(bandLow) - y(bandHigh)) }}
          />
        )}

        {/* 가격 축 */}
        <div className="absolute top-0 bottom-0 w-px bg-hairline" style={{ left: AXIS_X }} />

        {/* 추격 금지선 — 이 위로는 전 차수 미활성 */}
        {noChaseAbove != null && (
          <div className="absolute flex items-center" style={{ left: 0, right: 0, top: y(noChaseAbove) }}>
            <span className="font-mono text-[9px] text-red-300 text-right" style={{ width: AXIS_X - 6 }}>
              {fmt(noChaseAbove)}
            </span>
            <span className="ml-1.5 flex-1 border-t border-dashed border-red-400/60" />
            <span className="eyebrow text-[8px] text-red-300 pl-1">추격금지</span>
          </div>
        )}

        {/* 매수가(평단가) — 실제 진입가. 미보유면 없다. */}
        {avgPrice != null && (
          <div className="absolute flex items-center" style={{ left: 0, right: 0, top: y(avgPrice) }}>
            <span className="font-mono text-[9px] text-breeze text-right" style={{ width: AXIS_X - 6 }}>
              {fmt(avgPrice)}
            </span>
            <span className="ml-1.5 flex-1 border-t border-dashed border-breeze/50" />
            <span className="eyebrow text-[8px] text-breeze pl-1">매수가</span>
          </div>
        )}

        {/* 현재가 — 가장 밝게. 이 선이 차수 위에 있으면 아직 살 때가 아니라는 뜻이다. */}
        {priceNow != null && (
          <div className="absolute flex items-center" style={{ left: 0, right: 0, top: y(priceNow) }}>
            <span className="font-mono text-[10px] text-ink text-right" style={{ width: AXIS_X - 6 }}>
              {fmt(priceNow)}
            </span>
            <span className="ml-1.5 flex-1 border-t border-white/50" />
            <span className="eyebrow text-[8px] text-ink pl-1">현재가</span>
          </div>
        )}

        {/* 차수가 없는 논제(밴드만 있는 콜)는 축에 표시할 것이 없어 그림이 비어 보인다.
            밴드 양끝을 눈금으로 찍어 "어느 가격대를 말하는가"가 축에서 읽히게 한다. */}
        {priced.length === 0 &&
          bandLow != null &&
          bandHigh != null &&
          ([
            { v: bandHigh, name: "상단" },
            { v: bandLow, name: "하단" },
          ] as const).map(({ v, name }) => (
            <div
              key={name}
              className="absolute flex items-center gap-1.5 whitespace-nowrap"
              style={{ left: AXIS_X, top: y(v), transform: "translateY(-50%)" }}
            >
              <span className="w-1.5 h-px bg-mute" />
              <span className="eyebrow text-[9px] text-mute ml-1">{name}</span>
              <span className="font-mono text-[11px] text-body">{fmt(v)}</span>
            </div>
          ))}

        {/* 차수 — 축 위 실제 위치의 눈금 + (필요하면 밀린) 라벨 */}
        {rows.map(({ t, trueY, labelY }, i) => (
          <div key={i}>
            <span className="absolute w-1.5 h-px bg-mute" style={{ left: AXIS_X, top: trueY }} />
            {Math.abs(labelY - trueY) > 1.5 && (
              <span
                className="absolute w-px bg-hairline"
                style={{ left: AXIS_X + 1, top: Math.min(trueY, labelY), height: Math.abs(labelY - trueY) }}
              />
            )}
            <div
              className="absolute flex items-center gap-1.5 whitespace-nowrap"
              style={{ left: AXIS_X + 8, top: labelY, transform: "translateY(-50%)" }}
            >
              <span className="eyebrow text-[9px] text-mute">{t.label}</span>
              <span className="font-mono text-[11px] text-body">{fmt(t.price as number)}</span>
              {t.weightPct != null && (
                <>
                  {/* 비중 막대는 0~100% 고정 스케일 — 차수끼리 눈으로 비교되게 */}
                  <span className="inline-block w-11 h-1.5 rounded-full bg-canvas-mid overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-twilight"
                      style={{ width: `${Math.min(100, t.weightPct)}%` }}
                    />
                  </span>
                  <span className="font-mono text-[9px] text-mute">{Math.round(t.weightPct)}%</span>
                </>
              )}
              {t.weightPct == null && t.weightNote && (
                <span className="font-mono text-[9px] text-mute">{t.weightNote}</span>
              )}
              {t.condition && (
                <span
                  title={t.condition}
                  className="rounded-full border border-amber-400/40 px-1.5 py-px text-[8px] text-amber-300"
                >
                  조건
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 차트 아래 — 그림으로 못 담는 '언제 집행 가능한가'의 원문 */}
      <div className="mt-2 flex flex-col gap-1">
        {chaseBreached && (
          <p className="text-[10px] text-red-300 leading-snug">
            추격금지선 {fmt(noChaseAbove as number)} 초과 — 전 차수 미활성. 가격이 닿아도 집행하지 않는다.
          </p>
        )}
        {bandLow != null && bandHigh != null && (
          <p className="text-[10px] text-mute leading-snug">
            <span className="text-mute">{bandLabel}</span>{" "}
            <span className="font-mono text-body">
              {fmt(bandLow)}~{fmt(bandHigh)}
            </span>
          </p>
        )}
        {priced
          .filter((t) => t.condition || t.caveat)
          .map((t, i) => (
            <p key={i} className="text-[10px] text-mute leading-snug">
              <span className="eyebrow text-[9px] text-amber-300">{t.label}</span>{" "}
              {t.condition ? <span className="text-body">AND {t.condition}</span> : null}
              {t.caveat ? <span className="text-mute"> {t.caveat}</span> : null}
            </p>
          ))}
        {notes.map((t, i) => (
          <p key={`n${i}`} className="text-[10px] text-mute leading-snug">
            {t.condition ? (
              <>
                <span className="eyebrow text-[9px] text-amber-300">공통</span>{" "}
                <span className="text-body">{t.condition}</span>
              </>
            ) : (
              t.raw
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

// 축을 만들 수 없을 때(값 부족·파싱 실패)의 폴백. 원문을 그대로 보여준다.
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
    <div className="flex flex-col gap-1 py-1">
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
