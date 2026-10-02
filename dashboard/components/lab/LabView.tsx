"use client";
/**
 * 실험실 — 이번 주 추천 종목 (TASK-187).
 *
 * 기존 시스템(4대가·래더)과 독립된 두 번째 의견이다. 매주 S&P 500 전체를 기계 규칙으로
 * 걸러(tools/lab_screen.py) 1위부터 결격 검증을 거친 한 종목을 낸다(docs/LAB-SPEC.md).
 * 받든 안 받든 전부 기록되고, 무작위 대조군·SPY 와 비교해 채점된다.
 *
 * 화면 위계 — 주인공은 하나다:
 *   ① 이번 주 픽(또는 '검증 대기' · '이번 주 없음')
 *   ② 어떻게 골랐나(깔때기) ③ 성적표 ④ 지난 픽 ⑤ 기계 순위 상위(접힘)
 */

import { useCallback, useEffect, useState } from "react";
import { readJsonSafe } from "@/lib/fetch-json";
import { Card, CardHeader, Delta, OutlineChip, StatusChip, type ChipTone } from "@/components/primitives";
import { CumulativeChart, FunnelFlow, Gauge, PriceRangeBar, type CumPoint, type FunnelStep } from "./parts";

type Score = { quality: number; value: number; total: number; qualityGauge: number; valueGauge: number };
type Existing = {
  skill: string;
  call: string;
  date: string;
  target?: { low?: number; high?: number; fairValue?: number };
} | null;
type Candidate = {
  ticker: string;
  name: string;
  sector: string;
  rank: number | null;
  price: number | null;
  target: number | null;
  stopLoss: number | null;
  upsidePct: number | null;
  momentumPct: number | null;
  yieldNowPct: number | null;
  medianYieldPct: number | null;
  spinoffSuspect: boolean;
  imputed: string[];
  score: Score | null;
  existing?: Existing;
};
type Rejected = { ticker: string; reason: string; evidence: string };
type ScoredPick = {
  id: string;
  skill: string;
  date: string;
  ticker: string;
  name?: string;
  sector?: string;
  rank: number;
  priceAtCall: number;
  target: number;
  stopLoss: number;
  upsidePct: number;
  score: Score;
  status: string;
  exitDate: string | null;
  lastPrice: number | null;
  returnPct: number | null;
  spyReturnPct: number | null;
  excessPct: number | null;
  decision: "accepted" | "declined" | null;
  report?: string;
};
type HistoryRow =
  | (ScoredPick & { kind: "call" })
  | { kind: "none"; id: string; date: string; candidates: number; nearMiss?: string }
  | { kind: "repeat"; id: string; date: string; ticker: string; ref: string };
type Stats = {
  n: number;
  resolved: number;
  avgReturnPct: number | null;
  avgSpyReturnPct: number | null;
  avgExcessPct: number | null;
  beatSpyPct: number | null;
};
type LabData = {
  screen: {
    runDate: string;
    ruleVersion: string;
    universe: { count: number };
    coverage: { afterSector: number; historyOk: number };
    momentumCutPct: number | null;
    candidateCount: number;
    candidates: Candidate[];
    control: string | null;
    nearMiss: Candidate | null;
    funnel: FunnelStep[];
  } | null;
  week:
    | { status: "empty" }
    | { status: "pending" }
    | { status: "none"; rejected: Rejected[]; report: string | null }
    | {
        status: "pick";
        repeat: boolean;
        pick: ScoredPick | null;
        rejected: Rejected[];
        report: string | null;
        existing: Existing;
        /** 검증 보고서 "이건 조심" 절의 글머리표 */
        cautions: string[];
      };
  history: HistoryRow[];
  stats: { lab: Stats; control: Stats };
  series: CumPoint[];
};

const CALL_LABEL: Record<string, string> = { buy: "매수", keep: "보유", hold: "관망", avoid: "회피" };

function weekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${Math.ceil(d.getUTCDate() / 7)}주차`;
}

function money(v: number | null | undefined): string {
  return v == null ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function topPct(p: number | null | undefined): string {
  return p == null ? "" : `상위 ${Math.max(1, Math.round(100 - p))}%`;
}

function statusTone(s: string): ChipTone {
  if (s === "목표 도달") return "success";
  if (s.startsWith("철회")) return "danger";
  if (s === "만기") return "neutral";
  return "warn";
}

/** 기존 시스템 판단 배지 — 같은 종목을 두 시스템이 어떻게 보는가. */
function ExistingBadge({ existing }: { existing: Existing | undefined }) {
  if (!existing) return <OutlineChip>기존 시스템: 판단 없음</OutlineChip>;
  const agree = existing.call === "buy" || existing.call === "keep";
  const band = existing.call === "hold" && existing.target?.high ? ` · ${money(existing.target.high)} 이하 대기` : "";
  return (
    <StatusChip tone={agree ? "success" : "warn"} dot
      title={`${existing.skill} · ${existing.date}`}>
      기존 시스템 {agree ? "일치" : "엇갈림"}: {CALL_LABEL[existing.call] ?? existing.call}{band}
    </StatusChip>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3 flex flex-col gap-0.5 px-1">
      <h2 className="text-[17px] text-ink">{title}</h2>
      {sub && <p className="text-[13px] text-mute">{sub}</p>}
    </div>
  );
}

// ── ① 이번 주 ────────────────────────────────────────────────────────────
function PickHero({
  week,
  runDate,
  ruleVersion,
  momentumCutPct,
  candidate,
  onOpenReport,
}: {
  week: Extract<LabData["week"], { status: "pick" }>;
  runDate: string;
  ruleVersion: string;
  momentumCutPct: number | null;
  candidate: Candidate | undefined;
  onOpenReport: (p: string) => void;
}) {
  const p = week.pick;
  if (!p) return null;
  const current = p.lastPrice ?? p.priceAtCall;
  return (
    <Card padding="xl" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="info" size="lg">이번 주 추천 · {weekLabel(runDate)}</StatusChip>
        {week.repeat && <OutlineChip>지난주와 같은 종목</OutlineChip>}
        {p.decision === "accepted" && <StatusChip tone="success" dot>수락함</StatusChip>}
        {p.decision === "declined" && <StatusChip tone="neutral" dot>거절함</StatusChip>}
        <span className="ml-auto text-[12px] text-mute">규칙 {ruleVersion} · {runDate} 실행</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[40px] font-bold leading-none tracking-[-0.02em] text-ink">{p.ticker}</div>
          <div className="mt-2 truncate text-[15px] text-body">
            {p.name} <span className="text-mute">· {p.sector}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[22px] font-bold text-ink">{money(current)}</span>
          {p.returnPct != null && Math.abs(p.returnPct) > 0.005 ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-mute">
              추천 후 <Delta value={p.returnPct} size="sm" digits={1} />
            </span>
          ) : (
            <span className="text-[12px] text-mute">추천가 {money(p.priceAtCall)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-xl bg-canvas-soft p-4">
        <Gauge level={p.score.qualityGauge} label="퀄리티" sub={topPct(p.score.quality)} />
        <Gauge level={p.score.valueGauge} label="밸류" sub={topPct(p.score.value)} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12px] font-bold text-mute">추세</span>
          <StatusChip tone="success" size="lg" className="self-start">통과</StatusChip>
          {candidate?.momentumPct != null && (
            <span className="text-[12px] text-body">
              12개월 {candidate.momentumPct > 0 ? "+" : "−"}{Math.abs(candidate.momentumPct).toFixed(0)}%
              {momentumCutPct != null && <span className="text-mute"> (컷 {momentumCutPct.toFixed(0)}%)</span>}
            </span>
          )}
        </div>
      </div>

      <PriceRangeBar stop={p.stopLoss} current={current} target={p.target} entry={p.priceAtCall} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-canvas-soft p-4">
          <h3 className="mb-2 text-[13px] text-ink">왜 이 종목?</h3>
          <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-body">
            {candidate?.yieldNowPct != null && candidate.medianYieldPct != null && (
              <li>· FCF 수익률 {candidate.yieldNowPct.toFixed(1)}% — 자기 10년 중앙값 {candidate.medianYieldPct.toFixed(1)}%보다 높아요(싸요)</li>
            )}
            <li>· 퀄리티·밸류 합산 S&P 500 후보 중 {p.rank}위</li>
            <li>· 평소 밸류에이션으로 돌아오면 +{p.upsidePct.toFixed(0)}%</li>
          </ul>
        </div>
        <div className="rounded-xl bg-canvas-soft p-4">
          <h3 className="mb-2 text-[13px] text-ink">이건 조심</h3>
          {week.cautions.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-body">
              {week.cautions.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-relaxed text-body">
              평균회귀 가정이 깨지는 경우(사업 구조 변화)가 가장 큰 위험이에요. 자세한 반대 근거는 검증 보고서에 있어요.
            </p>
          )}
          {week.rejected.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 border-t border-hairline pt-3 text-[12px] text-mute">
              {week.rejected.map((r) => (
                <li key={r.ticker}>
                  위 순위 <span className="font-mono text-body">{r.ticker}</span> 탈락 — {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ExistingBadge existing={week.existing} />
        {(week.report ?? p.report) && (
          <button
            type="button"
            onClick={() => onOpenReport((week.report ?? p.report) as string)}
            className="ml-auto min-h-9 rounded-full bg-canvas-soft px-4 text-[13px] font-bold text-ink transition-colors hover:bg-canvas-mid active:scale-95"
          >
            검증 보고서 보기
          </button>
        )}
      </div>
    </Card>
  );
}

function PendingHero({ screen }: { screen: NonNullable<LabData["screen"]> }) {
  return (
    <Card padding="xl" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="warn" size="lg" dot>검증 대기 · {weekLabel(screen.runDate)}</StatusChip>
        <span className="ml-auto text-[12px] text-mute">규칙 {screen.ruleVersion} · {screen.runDate} 실행</span>
      </div>
      <div>
        <h2 className="text-[22px] leading-snug text-ink">
          이번 주 기계 순위가 나왔어요.
          <br />
          아직 추천은 아니에요.
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-body">
          1위부터 결격 사유(회계 이상·희석·소송·구조 변화)를 검증해 통과한 첫 종목이 이번 주 추천이 돼요.
          검증은 <span className="font-mono text-ink">/lab-pick</span> 이 해요.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-mute">검증 순서</span>
        <div className="flex flex-wrap gap-2">
          {screen.candidates.slice(0, 5).map((c) => (
            <span key={c.ticker} className="inline-flex items-center gap-1.5 rounded-xl bg-canvas-soft px-3 py-2">
              <span className="text-[12px] text-mute">{c.rank}</span>
              <span className="font-mono text-[14px] font-bold text-ink">{c.ticker}</span>
              {c.spinoffSuspect && <StatusChip tone="warn" size="sm">분사 의심</StatusChip>}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function NoneHero({
  screen,
  week,
  onOpenReport,
}: {
  screen: NonNullable<LabData["screen"]>;
  week: Extract<LabData["week"], { status: "none" }>;
  onOpenReport: (p: string) => void;
}) {
  const near = screen.nearMiss;
  return (
    <Card padding="xl" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="neutral" size="lg">이번 주 없음 · {weekLabel(screen.runDate)}</StatusChip>
        <span className="ml-auto text-[12px] text-mute">규칙 {screen.ruleVersion} · {screen.runDate} 실행</span>
      </div>
      <div>
        <h2 className="text-[22px] leading-snug text-ink">이번 주는 조건을 통과한 종목이 없어요</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-body">
          {screen.candidateCount === 0
            ? "자기 10년 평균보다 15% 이상 싼 우량주가 S&P 500에 하나도 없었어요."
            : `후보 ${screen.candidateCount}개 중 상위 5개가 모두 결격 검증에서 탈락했어요.`}{" "}
          기준을 낮춰 억지로 고르지 않아요.
        </p>
      </div>
      {near && (
        <div className="rounded-xl bg-canvas-soft p-4">
          <span className="text-[12px] font-bold text-mute">가장 아깝게 떨어진 종목</span>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-[18px] font-bold text-ink">{near.ticker}</span>
            <span className="text-[13px] text-body">{near.name}</span>
            <span className="text-[13px] text-mute">
              상승여력 {near.upsidePct != null ? `${near.upsidePct.toFixed(1)}%` : "—"} (기준 +15%)
            </span>
          </div>
        </div>
      )}
      {week.rejected.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px] text-body">
          {week.rejected.map((r) => (
            <li key={r.ticker}>· <span className="font-mono text-ink">{r.ticker}</span> 탈락 — {r.reason}</li>
          ))}
        </ul>
      )}
      {week.report && (
        <button type="button" onClick={() => onOpenReport(week.report as string)}
          className="self-start min-h-9 rounded-full bg-canvas-soft px-4 text-[13px] font-bold text-ink hover:bg-canvas-mid active:scale-95">
          검증 보고서 보기
        </button>
      )}
    </Card>
  );
}

// ── ③ 성적표 ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, swatch }: { label: string; value: number | null; sub: string; swatch?: "bg-chart-1" | "bg-chart-2" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-canvas-soft p-4">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-mute">
        {swatch && <span className={`inline-block h-2 w-2 rounded-full ${swatch}`} />}
        {label}
      </span>
      <Delta value={value} size="lg" digits={1} emptyLabel="—" />
      <span className="text-[12px] text-mute">{sub}</span>
    </div>
  );
}

function Scorecard({ data }: { data: LabData }) {
  const { lab, control } = data.stats;
  if (lab.n === 0) {
    return (
      <Card padding="lg">
        <div className="grid gap-3 sm:grid-cols-3">
          {["실험실", "대조군 (무작위)", "SPY"].map((l) => (
            <div key={l} className="flex flex-col gap-1 rounded-xl bg-canvas-soft p-4">
              <span className="text-[12px] font-bold text-mute">{l}</span>
              <span className="text-lg font-bold text-mute">—</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-body">
          첫 추천이 기록되면 여기서 성적을 매겨요. 추천 종목이 <b className="text-ink">같은 날 SPY를 샀을 때</b>보다
          나았는지, 그리고 <b className="text-ink">무작위로 고른 대조군</b>보다 나았는지를 봐요.
          대조군보다 못하면 순위와 검증이 쓸모없다는 뜻이에요.
        </p>
      </Card>
    );
  }
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="실험실" value={lab.avgReturnPct} swatch="bg-chart-1"
          sub={`${lab.n}건 · SPY 이긴 비율 ${lab.beatSpyPct?.toFixed(0) ?? "—"}%`} />
        <StatTile label="대조군 (무작위)" value={control.avgReturnPct} swatch="bg-chart-2"
          sub={`${control.n}건 · SPY 이긴 비율 ${control.beatSpyPct?.toFixed(0) ?? "—"}%`} />
        <StatTile label="SPY (같은 날 샀다면)" value={lab.avgSpyReturnPct}
          sub={`실험실 초과수익 ${lab.avgExcessPct != null ? `${lab.avgExcessPct > 0 ? "+" : "−"}${Math.abs(lab.avgExcessPct).toFixed(1)}%p` : "—"}`} />
      </div>
      {data.series.length > 1 ? (
        <CumulativeChart points={data.series} />
      ) : (
        <p className="text-[12px] text-mute">누적 그래프는 추천 후 거래일이 쌓이면 그려져요.</p>
      )}
    </Card>
  );
}

// ── ④ 지난 픽 ─────────────────────────────────────────────────────────────
function HistoryList({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return <Card padding="lg"><p className="text-[13px] text-mute">아직 기록이 없어요. 매주 월요일 추천이 여기 쌓여요.</p></Card>;
  }
  return (
    <Card padding="none" className="divide-y divide-hairline overflow-hidden">
      {rows.map((r) => (
        <div key={r.id} className="flex min-h-14 items-center gap-3 px-5 py-3">
          <span className="w-12 shrink-0 text-[12px] text-mute">{r.date.slice(5).replace("-", "/")}</span>
          {r.kind === "call" ? (
            <>
              <span className="w-16 shrink-0 font-mono text-[14px] font-bold text-ink">{r.ticker}</span>
              <StatusChip tone={statusTone(r.status)} size="sm">{r.status}</StatusChip>
              {r.decision && (
                <span className="hidden text-[12px] text-mute sm:inline">{r.decision === "accepted" ? "수락" : "거절"}</span>
              )}
              <span className="ml-auto flex flex-col items-end">
                <Delta value={r.returnPct} size="sm" digits={1} />
                {r.excessPct != null && (
                  <span className="text-[11px] text-mute">
                    SPY 대비 {r.excessPct > 0 ? "+" : "−"}{Math.abs(r.excessPct).toFixed(1)}%p
                  </span>
                )}
              </span>
            </>
          ) : r.kind === "repeat" ? (
            <>
              <span className="w-16 shrink-0 font-mono text-[14px] font-bold text-ink">{r.ticker}</span>
              <OutlineChip size="sm">유지 (30일 내 재선정)</OutlineChip>
            </>
          ) : (
            <>
              <span className="w-16 shrink-0 text-[14px] font-bold text-body">없음</span>
              <span className="text-[12px] text-mute">후보 {r.candidates}개 · 통과 0</span>
            </>
          )}
        </div>
      ))}
    </Card>
  );
}

// ── ⑤ 기계 순위 상위 ──────────────────────────────────────────────────────
function CandidateTable({ rows, control }: { rows: Candidate[]; control: string | null }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto scroll-slim">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-mute">
              <th className="px-5 py-3 font-bold">순위</th>
              <th className="py-3 font-bold">종목</th>
              <th className="py-3 font-bold">퀄리티</th>
              <th className="py-3 font-bold">밸류</th>
              <th className="py-3 text-right font-bold">현재가 → 목표</th>
              <th className="px-5 py-3 font-bold">기존 시스템</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.ticker} className="border-t border-hairline">
                <td className="px-5 py-3 text-mute">{c.rank}</td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-ink">{c.ticker}</span>
                    {c.ticker === control && <StatusChip tone="neutral" size="sm">대조군</StatusChip>}
                    {c.spinoffSuspect && <StatusChip tone="warn" size="sm">분사 의심</StatusChip>}
                  </div>
                  <div className="max-w-[12rem] truncate text-[12px] text-mute">{c.name}</div>
                </td>
                <td className="py-3"><Dots level={c.score?.qualityGauge ?? 0} /></td>
                <td className="py-3"><Dots level={c.score?.valueGauge ?? 0} /></td>
                <td className="py-3 text-right">
                  <span className="text-body">{money(c.price)} → {money(c.target)}</span>
                  <div className="text-[12px] text-mute">+{c.upsidePct?.toFixed(0)}%</div>
                </td>
                <td className="px-5 py-3 text-[12px] text-body">
                  {c.existing ? `${CALL_LABEL[c.existing.call] ?? c.existing.call} · ${c.existing.date.slice(5)}` : <span className="text-mute">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <button type="button" onClick={() => setAll((v) => !v)}
          className="min-h-11 w-full border-t border-hairline text-[13px] text-mute hover:bg-canvas-soft hover:text-ink">
          {all ? "접기" : `${rows.length - 5}개 더 보기`}
        </button>
      )}
    </Card>
  );
}

function Dots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-3 rounded-full ${i <= level ? "bg-ink" : "bg-canvas-mid"}`} />
      ))}
    </span>
  );
}

// ── 본체 ─────────────────────────────────────────────────────────────────
export function LabView({
  refreshKey = 0,
  onOpenReport,
}: {
  refreshKey?: number;
  onOpenReport: (path: string) => void;
}) {
  const [data, setData] = useState<LabData | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    return fetch("/api/lab", { cache: "no-store" })
      .then(readJsonSafe)
      .then((d) => {
        if (d && "week" in d) setData(d as LabData);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!data && !error) return <p className="text-xs text-mute">불러오는 중...</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-danger">실험실 데이터를 불러오지 못했습니다.</span>
        <button onClick={load}
          className="rounded-full border border-hairline px-3 py-1 text-body hover:bg-canvas-soft hover:text-ink active:scale-95">
          다시 시도
        </button>
      </div>
    );
  }

  const { screen, week } = data;
  if (!screen) {
    return (
      <Card padding="xl">
        <h2 className="text-[20px] text-ink">아직 실행 기록이 없어요</h2>
        <p className="mt-2 text-[14px] text-body">
          <span className="font-mono text-ink">python3 tools/lab_screen.py</span> 를 한 번 돌리면 이번 주 기계 순위가 생겨요.
        </p>
      </Card>
    );
  }

  const pickCandidate = week.status === "pick" && week.pick
    ? screen.candidates.find((c) => c.ticker === week.pick?.ticker)
    : undefined;

  return (
    <div className="flex flex-col gap-10">
      <section>
        {week.status === "pick" ? (
          <PickHero week={week} runDate={screen.runDate} ruleVersion={screen.ruleVersion}
            momentumCutPct={screen.momentumCutPct} candidate={pickCandidate} onOpenReport={onOpenReport} />
        ) : week.status === "none" ? (
          <NoneHero screen={screen} week={week} onOpenReport={onOpenReport} />
        ) : (
          <PendingHero screen={screen} />
        )}
      </section>

      <section>
        <SectionTitle
          title="어떻게 골랐나"
          sub={`S&P 500 ${screen.universe.count}종목을 규칙대로 걸러요. 단계를 누르면 빠진 종목이 보여요.`}
        />
        <Card padding="md">
          <FunnelFlow steps={screen.funnel} />
          <p className="mt-3 px-2 text-[12px] leading-relaxed text-mute">
            순위 = 퀄리티(자산이익률·마진 안정성·부채) + 밸류(자기 10년 대비 할인·FCF 수익률) 동일 가중.
            추세는 점수에 넣지 않고 하위 20%만 걸러요. 규칙 원본은 docs/LAB-SPEC.md.
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle title="성적표" sub="받든 안 받든 모든 추천을 채점해요" />
        <Scorecard data={data} />
      </section>

      <section>
        <SectionTitle title="지난 추천" />
        <HistoryList rows={data.history} />
      </section>

      <section>
        <SectionTitle
          title="이번 주 기계 순위"
          sub={`통과 후보 ${screen.candidateCount}개 중 상위 ${screen.candidates.length}개 · 결격 검증 전 순위예요`}
        />
        <CandidateTable rows={screen.candidates} control={screen.control} />
      </section>
    </div>
  );
}
