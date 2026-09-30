"use client";

/**
 * 주가 궤적 위에 진입 구간을 겹쳐 그린다 (TASK-136).
 *
 * 왜: 밴드가 "닿을 만한 가격"인지는 **과거에 그 구간에 왔었는지**로만 판단할 수 있다.
 * 화면은 체결확률 숫자를 보여주지 않으므로(TASK-159) 이 그림이 그 판단의 근거다.
 * 숫자(tools/fill_probability.py 산출값)는 논제 파일과 원장에 남아 있다.
 *
 * 🔴 논제 파일의 체결확률과 그림이 어긋나면 그건 버그가 아니라 **읽어야 할 신호**다.
 *    (예: 2년 최저가가 1차 진입가보다 낮은데 체결확률이 0%로 적혀 있다면,
 *     체결확률을 재산출할 때가 됐다는 뜻이다.)
 *
 * 차트 형태는 ui-ux-pro-max 가 이 데이터 모양에 지정한 "Line with Confidence Band" 다.
 * 접근성: 색만으로 말하지 않도록 추격금지선은 점선 + 라벨, 구간은 농도 + 라벨을 쓰고
 * 요약은 aria-label 로 읽힌다.
 */

import { useEffect, useState } from "react";
import { readJsonSafe } from "@/lib/fetch-json";
import type { Tranche } from "@/lib/tranche";

interface HistoryPoint {
  t: number;
  c: number;
}
interface History {
  ticker: string;
  points: HistoryPoint[];
  minClose: number | null;
  maxClose: number | null;
  range: string;
}

const W = 720;
const H = 150;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 10;
const PAD_B = 18;

function fmt(v: number): string {
  return `$${v.toFixed(v >= 100 ? 0 : 1)}`;
}

export function PriceHistoryChart({
  ticker,
  tranches,
  priceNow,
  noChaseAbove,
  range = "2y",
}: {
  ticker: string;
  tranches: Tranche[];
  priceNow: number | null;
  noChaseAbove: number | null;
  range?: string;
}) {
  const [hist, setHist] = useState<History | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "empty">("loading");

  useEffect(() => {
    let alive = true;
    // 펼친 카드에서만 마운트되므로 여기서 불러도 접힌 종목까지 조회하지 않는다.
    fetch(`/api/history?tickers=${encodeURIComponent(ticker)}&range=${range}`)
      .then(readJsonSafe)
      .then((d) => {
        if (!alive) return;
        const h: History | undefined = d?.histories?.[0];
        if (h && h.points.length > 1) {
          setHist(h);
          setState("ok");
        } else {
          setState("empty");
        }
      })
      .catch(() => alive && setState("empty"));
    return () => {
      alive = false;
    };
  }, [ticker, range]);

  if (state === "loading") {
    return (
      <div className="mt-2 h-[150px] animate-pulse rounded-xl bg-canvas-soft" aria-hidden="true" />
    );
  }
  if (state === "empty" || !hist) {
    return (
      <p className="mt-2 text-[10px] text-mute">
        주가 이력을 불러오지 못했습니다 — 밴드가 닿을 만한 가격인지는 논제 파일의 체결확률로 판단하세요.
      </p>
    );
  }

  const priced = tranches.filter((t) => typeof t.price === "number");
  const tPrices = priced.map((t) => t.price as number);

  // y 도메인 — 이력 범위에 차수·현재가·추격금지선까지 포함해야 선이 잘리지 않는다.
  const candidates = [
    hist.minClose,
    hist.maxClose,
    priceNow,
    noChaseAbove,
    ...tPrices,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  let lo = Math.min(...candidates);
  let hi = Math.max(...candidates);
  const pad = (hi - lo) * 0.06 || 1;
  lo -= pad;
  hi += pad;

  const y = (v: number) => PAD_T + ((hi - v) / (hi - lo)) * (H - PAD_T - PAD_B);
  const x = (i: number) => PAD_L + (i / (hist.points.length - 1)) * (W - PAD_L - PAD_R);

  const line = hist.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`).join(" ");
  const area = `${line} L${x(hist.points.length - 1).toFixed(1)} ${(H - PAD_B).toFixed(1)} L${PAD_L} ${(H - PAD_B).toFixed(1)} Z`;

  // 🔴 진입 구간은 **하나의 띠**로 묶는다.
  // 차수별로 3~4개를 따로 그리면, 2년 가격 범위($111~$402)에 비해 차수 간격이
  // 좁아 선과 라벨이 서로 겹쳐 아무것도 못 읽는다(실제로 그랬다).
  // "어느 차수에 얼마씩"은 바로 위 LadderChart 가 이미 정확히 답한다 —
  // 이 그림의 일은 "저 구간까지 내려온 적 있나" 하나다.
  const sorted = [...tPrices].sort((a, b) => b - a);
  const zoneTop = sorted.length > 0 ? sorted[0] : null;
  const zoneBottom = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  // 🔴 이 그림이 말하려는 한 가지: 과거에 1차 구간까지 내려온 적이 있나.
  const topTranche = zoneTop;
  const everReached = topTranche != null && hist.minClose != null && hist.minClose <= topTranche;

  const label =
    `${ticker} ${hist.range} 주가 궤적. ` +
    `최저 ${hist.minClose != null ? fmt(hist.minClose) : "—"}, 최고 ${hist.maxClose != null ? fmt(hist.maxClose) : "—"}. ` +
    (topTranche != null
      ? everReached
        ? `1차 진입가 ${fmt(topTranche)} 구간에 이 기간 안에 도달한 적이 있습니다.`
        : `1차 진입가 ${fmt(topTranche)}에 이 기간 안에 도달한 적이 없습니다.`
      : "진입 차수가 산출되지 않았습니다.");

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        {/* 진입 구간 — 띠 하나 */}
        {zoneTop != null && zoneBottom != null && (
          <rect
            x={PAD_L}
            y={y(zoneTop)}
            width={W - PAD_L - PAD_R}
            height={Math.max(2, y(zoneBottom) - y(zoneTop))}
            fill="var(--color-down)"
            opacity="0.22"
          />
        )}

        {/* 축 눈금 — 최저·최고만. 촘촘한 격자는 이 크기에서 데이터를 가린다.
            이미 라벨이 붙은 선(추격금지·진입 상단)과 12px 안쪽이면 눈금을 건너뛴다 —
            겹쳐 찍히면 둘 다 못 읽는다. */}
        {[hi - pad, lo + pad]
          .filter((v) =>
            ![noChaseAbove, zoneTop, zoneBottom].some(
              (m) => typeof m === "number" && Math.abs(y(m) - y(v)) < 12
            )
          )
          .map((v) => (
            <g key={v}>
              <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--color-hairline)" strokeWidth="1" />
              <text x={PAD_L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-faint)">
                {fmt(v)}
              </text>
            </g>
          ))}

        {/* 주가 */}
        <path d={area} fill="var(--color-body)" opacity="0.06" />
        <path d={line} fill="none" stroke="var(--color-body)" strokeWidth="1.6" strokeLinejoin="round" />

        {/* 구간 상단선 + 라벨 하나. 하단선은 라벨 없이 경계만. */}
        {zoneTop != null && (
          <>
            <line x1={PAD_L} y1={y(zoneTop)} x2={W - PAD_R} y2={y(zoneTop)} stroke="var(--color-down)" strokeWidth="1.4" />
            <text x={PAD_L + 4} y={y(zoneTop) - 4} fontSize="10" fontWeight="700" fill="var(--color-down)">
              진입 {fmt(zoneTop)}
              {zoneBottom != null && zoneBottom !== zoneTop ? `~${fmt(zoneBottom)}` : ""}
            </text>
          </>
        )}
        {zoneBottom != null && zoneBottom !== zoneTop && (
          <line
            x1={PAD_L}
            y1={y(zoneBottom)}
            x2={W - PAD_R}
            y2={y(zoneBottom)}
            stroke="var(--color-down)"
            strokeWidth="1"
            opacity="0.6"
          />
        )}

        {/* 추격금지선 — 색만으로 말하지 않도록 점선 + 라벨 */}
        {noChaseAbove != null && (
          <g>
            <line
              x1={PAD_L}
              y1={y(noChaseAbove)}
              x2={W - PAD_R}
              y2={y(noChaseAbove)}
              stroke="var(--color-warn)"
              strokeWidth="1.2"
              strokeDasharray="5 3"
            />
            <text x={PAD_L + 4} y={y(noChaseAbove) - 4} fontSize="9.5" fontWeight="700" fill="var(--color-warn)">
              추격금지 {fmt(noChaseAbove)}
            </text>
          </g>
        )}

        {/* 현재가 */}
        {priceNow != null && (
          <circle
            cx={x(hist.points.length - 1)}
            cy={y(priceNow)}
            r="3.5"
            fill="var(--color-canvas)"
            stroke="var(--color-ink)"
            strokeWidth="2"
          />
        )}
      </svg>

      <p className="mt-1 text-[10px] leading-snug text-mute">
        {hist.range} 최저 <span className="font-mono text-body">{hist.minClose != null ? fmt(hist.minClose) : "—"}</span>
        {topTranche != null && (
          <>
            {" · "}
            {everReached ? (
              <span className="text-success">이 기간 안에 1차 구간 도달 이력 있음</span>
            ) : (
              <span className="text-warn">이 기간 안에 1차 구간 도달 이력 없음</span>
            )}
          </>
        )}
        {" · 분할·배당 조정 종가 기준"}
      </p>
    </div>
  );
}
