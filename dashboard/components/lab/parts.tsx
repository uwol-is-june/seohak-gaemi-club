"use client";
/**
 * 실험실 탭 부품 (TASK-187) — 게이지 · 가격 범위 바 · 깔때기 · 누적 성과 차트.
 *
 * 색 축(docs/DESIGN-toss.md 1절)을 지킨다:
 *   철회선 = 판정 danger · 목표가 = 판정 success · 현재가 = ink (가격 방향이 아니라 '위치'라서)
 *   누적선 = 분류 chart-1/chart-2 (+ SPY 는 계열이 아니라 기준선이라 mute 점선)
 * 라벨은 항상 텍스트 토큰(ink/body/mute)을 입는다 — 계열 색은 선·점에만.
 */

import { useEffect, useMemo, useRef, useState } from "react";

// ── 5단 게이지 ───────────────────────────────────────────────────────────
export function Gauge({ level, label, sub }: { level: number; label: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-bold text-mute">{label}</span>
      <span className="flex items-center gap-1" role="img" aria-label={`${label} ${level}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-2 w-5 rounded-full ${i <= level ? "bg-ink" : "bg-canvas-mid"}`}
          />
        ))}
      </span>
      {sub && <span className="text-[12px] text-body">{sub}</span>}
    </div>
  );
}

// ── 가격 범위 바: 철회선 · 현재가 · 목표가 ───────────────────────────────
function money(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PriceRangeBar({
  stop,
  current,
  target,
  entry,
}: {
  stop: number;
  current: number;
  target: number;
  /** 추천 시점가 — 현재가와 다를 때만 흐린 눈금으로 */
  entry?: number | null;
}) {
  const lo = Math.min(stop, current) ;
  const hi = Math.max(target, current);
  const pad = (hi - lo) * 0.04;
  const pos = (v: number) => ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 100;
  const cur = pos(current);
  const base = entry ?? current;
  const showEntry = entry != null && Math.abs(entry - current) / entry > 0.002;
  // 현재가 라벨이 양끝 라벨과 겹치지 않게 가운데 정렬 위치를 안쪽으로 민다.
  const curLabel = Math.min(82, Math.max(18, cur));

  return (
    <div className="w-full" role="img"
      aria-label={`철회선 ${money(stop)}, 현재가 ${money(current)}, 목표가 ${money(target)}`}>
      <div className="relative h-6">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-[13px] font-bold text-ink"
          style={{ left: `${curLabel}%` }}
        >
          지금 {money(current)}
        </span>
      </div>
      <div className="relative h-3">
        <div className="absolute inset-y-1 left-0 right-0 rounded-full bg-canvas-mid" />
        {/* 철회선 → 목표가 구간 */}
        <div
          className="absolute inset-y-1 rounded-full bg-canvas-soft"
          style={{ left: `${pos(stop)}%`, width: `${pos(target) - pos(stop)}%` }}
        />
        <span className="absolute top-0 h-3 w-1 -translate-x-1/2 rounded-full bg-danger" style={{ left: `${pos(stop)}%` }} />
        <span className="absolute top-0 h-3 w-1 -translate-x-1/2 rounded-full bg-success" style={{ left: `${pos(target)}%` }} />
        {showEntry && (
          <span
            title={`추천가 ${money(entry as number)}`}
            className="absolute top-0.5 h-2 w-0.5 -translate-x-1/2 bg-mute"
            style={{ left: `${pos(entry as number)}%` }}
          />
        )}
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas-card bg-ink"
          style={{ left: `${cur}%` }}
        />
      </div>
      <div className="mt-2 flex items-start justify-between gap-3 text-[12px]">
        <div className="flex flex-col">
          <span className="font-bold text-danger">철회 {money(stop)}</span>
          <span className="text-mute">{((stop / base - 1) * 100).toFixed(0)}% 내리면 정리</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="font-bold text-success">목표 {money(target)}</span>
          <span className="text-mute">+{((target / base - 1) * 100).toFixed(1)}% · 12개월</span>
        </div>
      </div>
    </div>
  );
}

// ── 깔때기 흐름도 ────────────────────────────────────────────────────────
export type FunnelStep = {
  step: string;
  label: string;
  remaining: number;
  removed: number;
  excluded: { ticker: string; name: string; detail: string; code: string }[];
};

export function FunnelFlow({ steps }: { steps: FunnelStep[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const top = steps[0]?.remaining || 1;
  const last = steps.length - 1;
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((s, i) => {
        const expandable = s.excluded.length > 0;
        const isOpen = open === s.step;
        return (
          <li key={s.step}>
            <button
              type="button"
              disabled={!expandable}
              aria-expanded={expandable ? isOpen : undefined}
              onClick={() => setOpen(isOpen ? null : s.step)}
              // 모바일은 2줄(라벨·숫자 / 막대 전체 폭), sm 이상은 1줄. 1줄로 고정하면 390px 에서 막대 칸이 점이 된다.
              className="group grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-2 py-1.5 text-left transition-colors enabled:hover:bg-canvas-soft sm:grid-cols-[minmax(0,13rem)_1fr_auto] sm:py-0"
            >
              <span className="truncate text-[13px] text-body">
                {i === 0 ? "S&P 500 전체" : i === last ? "상승여력 +15% → 후보" : s.label}
              </span>
              <span className="relative col-span-2 row-start-2 h-2.5 rounded-full bg-canvas-soft sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${i === last ? "bg-primary" : "bg-canvas-mid"}`}
                  style={{ width: `${Math.max(1.5, (s.remaining / top) * 100)}%` }}
                />
              </span>
              <span className="flex items-center gap-2 text-right">
                {/* 첫 줄에도 자리를 잡아둔다 — 없으면 그 줄 막대만 길어져 정렬이 어긋난다 */}
                <span className="w-9 text-[12px] text-mute">{s.removed > 0 ? `−${s.removed}` : ""}</span>
                <span className={`w-9 text-[15px] font-bold ${i === last ? "text-ink" : "text-body"}`}>
                  {s.remaining}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-3 text-mute transition-transform ${expandable ? "" : "invisible"} ${isOpen ? "rotate-90" : ""}`}
                >
                  ›
                </span>
              </span>
            </button>
            {isOpen && (
              <div className="mx-2 mb-2 mt-1 max-h-56 overflow-y-auto rounded-xl bg-canvas-soft p-3 scroll-slim">
                <p className="mb-2 text-[12px] text-mute">
                  이 단계에서 빠진 {s.excluded.length}종목 — 항목에 마우스를 올리면 이유가 보여요
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.excluded.map((x) => (
                    <span
                      key={x.ticker}
                      title={`${x.name} · ${x.detail}`}
                      className="rounded-full bg-canvas-mid px-2 py-0.5 font-mono text-[11px] text-body"
                    >
                      {x.ticker}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── 누적 성과 차트 ──────────────────────────────────────────────────────
export type CumPoint = { date: string; lab: number | null; control: number | null; spy: number | null };

// 🔴 색은 var() 직접 참조가 아니라 **유틸리티 클래스**로 건다. Tailwind v4 는 클래스로 쓰인
//    테마 변수만 CSS 에 내보내서, var(--color-chart-1) 만 쓰면 변수가 없어 선이 사라진다(2026-10-02 실측).
const SERIES = [
  { key: "lab", label: "실험실", stroke: "stroke-chart-1", fill: "fill-chart-1", bg: "bg-chart-1", dash: undefined },
  { key: "control", label: "대조군", stroke: "stroke-chart-2", fill: "fill-chart-2", bg: "bg-chart-2", dash: undefined },
  { key: "spy", label: "SPY", stroke: "stroke-mute", fill: "fill-mute", bg: "bg-mute", dash: "4 4" },
] as const;

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${s}${Math.abs(v).toFixed(1)}%`;
}

export function CumulativeChart({ points }: { points: CumPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 200;
  const M = { l: 44, r: 56, t: 12, b: 24 };
  const { y, ticks } = useMemo(() => {
    const vals = points.flatMap((p) => [p.lab, p.control, p.spy]).filter((v): v is number => v != null);
    let lo = Math.min(0, ...vals);
    let hi = Math.max(0, ...vals);
    if (hi - lo < 4) {
      hi += 2;
      lo -= 2;
    }
    const step = niceStep((hi - lo) / 4);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const t: number[] = [];
    for (let v = lo; v <= hi + 1e-9; v += step) t.push(Number(v.toFixed(6)));
    return { y: (v: number) => M.t + ((hi - v) / (hi - lo)) * (H - M.t - M.b), ticks: t };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);
  const x = (i: number) => M.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - M.l - M.r));

  const path = (key: "lab" | "control" | "spy") => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      const v = p[key];
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - M.l) / (w - M.l - M.r)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const lastIdx = points.length - 1;
  const hp = hover != null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      {/* 범례 — 계열 2개 + 기준선. 끝점에도 직접 라벨이 붙어 색만으로 구분하지 않는다 */}
      <div className="mb-2 flex flex-wrap gap-4 text-[12px] text-body">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="18" y2="4" className={s.stroke} strokeWidth="2" strokeDasharray={s.dash} />
            </svg>
            {s.label}
            {s.key === "spy" && <span className="text-mute">(같은 날 샀다면)</span>}
          </span>
        ))}
      </div>
      <svg width={w} height={H} role="img" aria-label="실험실 · 대조군 · SPY 누적 평균 수익률" className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)}
              stroke="var(--color-canvas-soft)" strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-mute)">
              {t === 0 ? "0%" : `${t > 0 ? "+" : "−"}${Math.abs(t)}%`}
            </text>
          </g>
        ))}
        {points.length > 0 && (
          <>
            <text x={M.l} y={H - 6} fontSize="11" fill="var(--color-mute)">{points[0].date.slice(5)}</text>
            <text x={w - M.r} y={H - 6} fontSize="11" fill="var(--color-mute)" textAnchor="end">
              {points[lastIdx].date.slice(5)}
            </text>
          </>
        )}
        {SERIES.map((s) => (
          <path key={s.key} d={path(s.key)} fill="none" className={s.stroke} strokeWidth="2"
            strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {/* 끝점 직접 라벨 */}
        {lastIdx >= 0 && SERIES.map((s) => {
          const v = points[lastIdx][s.key];
          if (v == null) return null;
          return (
            <g key={s.key}>
              <circle cx={x(lastIdx)} cy={y(v)} r="4" className={s.fill} stroke="var(--color-canvas-card)" strokeWidth="2" />
              <text x={x(lastIdx) + 8} y={y(v)} dy="0.32em" fontSize="11" fill="var(--color-body)">{fmtPct(v)}</text>
            </g>
          );
        })}
        {hp && hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="var(--color-mute)" strokeWidth="1" />
            {SERIES.map((s) => {
              const v = hp[s.key];
              return v == null ? null : (
                <circle key={s.key} cx={x(hover)} cy={y(v)} r="4" className={s.fill} stroke="var(--color-canvas-card)" strokeWidth="2" />
              );
            })}
          </g>
        )}
        <rect x={M.l} y={M.t} width={Math.max(0, w - M.l - M.r)} height={H - M.t - M.b} fill="transparent"
          onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hp && hover != null && (
        <div
          className="pointer-events-none absolute top-8 z-10 rounded-xl bg-canvas-mid px-3 py-2 text-[12px] shadow-lg"
          style={{ left: Math.min(w - 150, Math.max(0, x(hover) + 10)) }}
        >
          <div className="mb-1 font-bold text-ink">{hp.date}</div>
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-body">
                <span className={`inline-block h-2 w-2 rounded-full ${s.bg}`} />
                {s.label}
              </span>
              <span className="font-bold text-ink">{fmtPct(hp[s.key])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
