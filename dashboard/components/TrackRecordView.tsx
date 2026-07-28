"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallAggregate, CallStatus } from "@/lib/calls";
import { ReportModal } from "./ReportModal";

// 진행중 콜의 예상 첫 채점일 = 콜일 + horizon(개월), horizon 미지정 시 +30일(MIN_RESOLVE_DAYS).
// lib/calls.ts 채점 규칙의 근사치 — 빈 상태 안내(TASK-78)용.
function expectedResolveDate(c: ScoredCall): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return null;
  const d = new Date(`${c.date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (c.horizonMonths != null) {
    const r = new Date(d);
    r.setUTCMonth(r.getUTCMonth() + c.horizonMonths);
    return r;
  }
  return new Date(d.getTime() + 30 * 86_400_000);
}
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

// 성적표 집계(TASK-80): 임의 키(유형·스킬)별로 총건수·확정·적중·진행중을 센다.
// 서버 CallAggregate(전체)와 별개로 클라이언트에서 계산 — API 계약을 건드리지 않고
// 분해만 추가한다(채점 규칙은 여전히 lib/calls.ts scoreCall 단일 소스).
type Tally = { total: number; resolved: number; hits: number; inProgress: number };
function tallyBy(calls: ScoredCall[], key: (c: ScoredCall) => string): Map<string, Tally> {
  const m = new Map<string, Tally>();
  for (const c of calls) {
    const k = key(c);
    const e = m.get(k) ?? { total: 0, resolved: 0, hits: 0, inProgress: 0 };
    e.total++;
    if (c.status === "적중" || c.status === "빗나감") {
      e.resolved++;
      if (c.directionHit === true) e.hits++;
    } else if (c.status === "진행중") e.inProgress++;
    m.set(k, e);
  }
  return m;
}
// 콜 유형 표시 순서.
const CALL_ORDER: (keyof typeof CALL_LABEL)[] = ["buy", "keep", "hold", "avoid"];

const CALL_LABEL: Record<string, { label: string; color: string }> = {
  buy: { label: "매수", color: "text-breeze bg-breeze/10" },
  keep: { label: "보유 유지", color: "text-twilight bg-twilight/10" },
  hold: { label: "관망", color: "text-amber-300 bg-amber-500/10" },
  avoid: { label: "회피", color: "text-mute bg-canvas-soft" },
};

const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-emerald-300 bg-emerald-500/15", dot: "bg-emerald-400" },
  빗나감: { label: "빗나감", color: "text-red-300 bg-red-500/15", dot: "bg-red-400" },
  진행중: { label: "진행중", color: "text-amber-300 bg-amber-500/15", dot: "bg-amber-400" },
  unknown: { label: "미채점", color: "text-mute bg-canvas-soft", dot: "bg-canvas-mid" },
};

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-red-400" : "text-breeze";
}

export function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [agg, setAgg] = useState<CallAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  // 진행중 콜 상세(핵심 가정·무효화 조건) 펼침 상태(TASK-79). 여러 행 동시 펼침 허용.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/calls")
      .then(readJsonSafe)
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setCalls(Array.isArray(d.calls) ? d.calls : []);
          setAgg(d.aggregate ?? null);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rate = agg?.directionHitRate;
  const pct = (v: number | null | undefined, d = 0) =>
    typeof v === "number" ? `${(v * 100).toFixed(d)}%` : "—";

  // 진행중 콜들의 예상 첫 채점일 중 가장 이른 날짜(TASK-78 빈 상태 안내).
  const earliestResolve = useMemo(() => {
    const dates = (calls ?? [])
      .filter((c) => c.status === "진행중")
      .map(expectedResolveDate)
      .filter((d): d is Date => d != null);
    if (dates.length === 0) return null;
    return dates.reduce((a, b) => (a < b ? a : b));
  }, [calls]);

  // 유형별·스킬별 성적표(TASK-80). keep(실보유)과 hold(대기)는 정반대 예측이라
  // 전체 적중률 하나로 뭉치면 왜곡 → 분해해서 본다. 스킬별은 어느 판단 도구가 잘 맞는지.
  const byType = useMemo(() => tallyBy(calls ?? [], (c) => c.call), [calls]);
  const bySkill = useMemo(
    () =>
      Array.from(tallyBy(calls ?? [], (c) => c.skill).entries()).sort(
        (a, b) => b[1].total - a[1].total
      ),
    [calls]
  );
  const tallyLine = (t: Tally) =>
    t.resolved > 0
      ? `적중 ${t.hits}/${t.resolved} · ${Math.round((t.hits / t.resolved) * 100)}%`
      : `확정 전 · 진행 ${t.inProgress}`;

  // 종목당 최신 콜 1건으로 접는다 — "누가 기록했나"가 아니라 "이 종목의 현재 판단"이
  // 표의 주인공이 되게. 같은 종목의 이전 콜(스킬 이력)은 행을 펼치면 나온다.
  // calls는 API에서 날짜·recordedAt 최신순 정렬돼 오므로 티커별 첫 항목이 최신.
  const { latest, historyByTicker } = useMemo(() => {
    const seen = new Map<string, ScoredCall>();
    const hist = new Map<string, ScoredCall[]>();
    for (const c of calls ?? []) {
      if (!seen.has(c.ticker)) seen.set(c.ticker, c);
      else {
        const arr = hist.get(c.ticker) ?? [];
        arr.push(c);
        hist.set(c.ticker, arr);
      }
    }
    return { latest: Array.from(seen.values()), historyByTicker: hist };
  }, [calls]);

  return (
    <div>
      <p className="text-sm text-mute mb-6 leading-relaxed">
        과거 매수/보유/회피 콜을 <span className="text-body">외부 실측(Yahoo 시세)</span>으로
        채점합니다. 콜 시점가는 낸 순간 박제되어 수정되지 않으며, 채점 기준은 모델이 아니라 시장입니다.
      </p>

      {loading && !calls && <p className="text-xs text-mute">불러오는 중...</p>}

      {error && (
        <div className="flex items-center gap-3 text-xs mb-4">
          <span className="text-red-300">트랙레코드를 불러오지 못했습니다.</span>
          <button
            onClick={load}
            className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {calls && calls.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center">
          <p className="text-sm text-body">아직 기록된 콜이 없습니다.</p>
          <p className="mt-1.5 text-xs text-mute leading-relaxed">
            <code className="font-mono text-breeze">/investment-checklist</code>,{" "}
            <code className="font-mono text-breeze">/investment-team</code>,{" "}
            <code className="font-mono text-breeze">/thesis-tracker</code>가 buy/hold/avoid 판정을
            낼 때 콜이 원장(<code className="font-mono">data/calls.jsonl</code>)에 기록되어 여기 나타납니다.
          </p>
        </div>
      )}

      {calls && calls.length > 0 && agg && (
        <>
          {/* 확정 콜 0건: "왜 비어있는지"를 명시(TASK-78). 콜은 있으나 전부 채점 기준일
              미경과라 방향 적중률이 "—"로 뜨는 상황을 빈 화면처럼 오해하지 않게 한다. */}
          {agg.resolvedCount === 0 && (
            <div className="mb-5 rounded-lg border border-hairline bg-canvas-card px-5 py-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <div className="text-xs leading-relaxed text-body">
                  <span className="text-ink">아직 확정된 콜이 없습니다.</span> 콜 {calls.length}건이
                  모두 채점 기준일(목표 horizon, 미지정 시 최소 30일) 미경과라 방향 적중률을 낼 수
                  없습니다. 아래 진행 중 콜은 채점 대기 상태입니다.
                  {earliestResolve && (
                    <>
                      {" "}가장 이른 첫 채점 예정:{" "}
                      <span className="font-mono text-ink">{fmtDate(earliestResolve)}</span>.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 집계 KPI 타일 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">방향 적중률</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">
                {rate != null ? pct(rate) : "—"}
              </div>
              <div className="text-[11px] text-mute mt-0.5">
                {rate != null
                  ? `${agg.directionHits}/${agg.resolvedCount} · 95% CI ${pct(agg.ci95[0])}~${pct(agg.ci95[1])}`
                  : "확정 콜 없음"}
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">확정 콜</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{agg.resolvedCount}</div>
              <div className="text-[11px] text-mute mt-0.5">horizon 경과</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">진행 중</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{agg.inProgress}</div>
              <div className="text-[11px] text-mute mt-0.5">잠정 채점</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">평균 목표 오차</div>
              <div className={`text-2xl tracking-[-0.02em] ${moveColor(agg.avgTargetErrorPct)}`}>
                {agg.avgTargetErrorPct != null
                  ? `${agg.avgTargetErrorPct >= 0 ? "+" : ""}${agg.avgTargetErrorPct.toFixed(1)}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-mute mt-0.5">현재가 vs 목표중앙</div>
            </div>
          </div>

          {/* 성적표(TASK-80): 유형별·스킬별 분해. keep/hold는 정반대 예측이라 전체
              적중률로 뭉치면 왜곡되고, 스킬별은 어느 판단 도구가 잘 맞는지 드러낸다. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] text-mute mb-3">콜 유형별</div>
              <div className="flex flex-col gap-2">
                {CALL_ORDER.map((k) => {
                  const t = byType.get(k);
                  if (!t) return null;
                  const cl = CALL_LABEL[k] ?? CALL_LABEL.hold;
                  return (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cl.color}`}>
                        {cl.label}
                      </span>
                      <span className="font-mono text-[11px] text-mute">
                        {t.total}건 · <span className="text-body">{tallyLine(t)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] text-mute mb-3">스킬별</div>
              <div className="flex flex-col gap-2">
                {bySkill.map(([skill, t]) => (
                  <div key={skill} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-body truncate max-w-[160px]" title={skill}>
                      {skill}
                    </span>
                    <span className="font-mono text-[11px] text-mute shrink-0">
                      {t.total}건 · <span className="text-body">{tallyLine(t)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 콜 목록 표 — 넓은 화면에서 표, 좁으면 자체 가로 스크롤 */}
          <p className="text-[11px] text-mute mb-2">
            종목당 <span className="text-body">최신 콜 1건</span>만 표시합니다. 같은 종목의 이전
            콜(스킬 이력)은 행을 눌러 펼치면 나옵니다. 위 집계·성적표는 전체 콜 기준입니다.
          </p>
          <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["종목", "콜", "콜 시점", "시점가", "현재가", "수익률", "목표", "경과", "상태", "사유"].map(
                      (h) => (
                        <th key={h} className="eyebrow text-[10px] text-mute font-normal px-3 py-2.5">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {latest.map((c) => {
                    const cl = CALL_LABEL[c.call] ?? CALL_LABEL.hold;
                    const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
                    const band =
                      c.target && (c.target.low != null || c.target.high != null)
                        ? `$${c.target.low ?? "?"}~${c.target.high ?? "?"}${
                            c.target.horizonMonths ? ` · ${c.target.horizonMonths}M` : ""
                          }`
                        : "—";
                    const history = historyByTicker.get(c.ticker) ?? [];
                    const isOpen = expanded.has(c.id);
                    const hasDetail =
                      c.loadBearing.length > 0 || c.invalidation.length > 0 || history.length > 0;
                    return (
                      <Fragment key={c.id}>
                      <tr
                        onClick={() => toggleExpand(c.id)}
                        aria-expanded={isOpen}
                        className="border-b border-hairline last:border-0 hover:bg-canvas-soft/50 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block text-mute text-[9px] transition-transform ${isOpen ? "rotate-90" : ""}`}
                            >
                              ▶
                            </span>
                            <span className="font-mono text-ink">{c.ticker}</span>
                            {history.length > 0 && (
                              <span className="shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute">
                                이력 {history.length}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-mute truncate max-w-[140px] pl-3">{c.skill}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cl.color}`}>
                            {cl.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{c.date}</td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceAtCall === "number" ? `$${c.priceAtCall.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceNow === "number" ? `$${c.priceNow.toFixed(2)}` : "—"}
                        </td>
                        <td className={`px-3 py-2.5 font-mono ${moveColor(c.returnPct)}`}>
                          {typeof c.returnPct === "number"
                            ? `${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{band}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">
                          {c.elapsedDays}d
                          {c.horizonProgress != null && (
                            <span className="text-mute/70"> · {Math.round(c.horizonProgress * 100)}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {c.report && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalPath(c.report!);
                              }}
                              className="ml-2 text-[11px] text-mute hover:text-ink underline underline-offset-2 transition-colors"
                            >
                              보고서
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          {c.reason ? (
                            <span className="block max-w-[280px] whitespace-normal leading-snug text-[11px] text-body">
                              {c.reason}
                            </span>
                          ) : (
                            <span className="text-[11px] text-mute">—</span>
                          )}
                        </td>
                      </tr>

                      {/* 콜 상세(TASK-79): 핵심 가정(참이어야 유효) + 무효화(레드라인) 조건.
                          진행중 콜이 "무슨 근거로 살아있는지 / 언제 폐기되는지"를 드러낸다.
                          원장(loadBearing·invalidation)에 있으나 표에는 없던 정보. */}
                      {isOpen && (
                        <tr className="border-b border-hairline last:border-0 bg-canvas-soft/30">
                          <td colSpan={10} className="px-3 py-4">
                            <div className="flex flex-col gap-3.5 max-w-3xl pl-3">
                              {/* 진행 요약 */}
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-mute">
                                <span>
                                  콜 시점가{" "}
                                  <span className="font-mono text-body">
                                    ${c.priceAtCall.toFixed(2)}
                                  </span>
                                </span>
                                {c.priceNow != null && (
                                  <span>
                                    현재가{" "}
                                    <span className="font-mono text-body">
                                      ${c.priceNow.toFixed(2)}
                                    </span>
                                  </span>
                                )}
                                {band !== "—" && (
                                  <span>
                                    목표밴드 <span className="font-mono text-body">{band}</span>
                                  </span>
                                )}
                                {c.horizonMonths != null && (
                                  <span>
                                    horizon <span className="text-body">{c.horizonMonths}M</span>
                                    {c.horizonProgress != null &&
                                      ` · ${Math.round(c.horizonProgress * 100)}% 경과`}
                                  </span>
                                )}
                              </div>

                              {c.loadBearing.length > 0 && (
                                <div>
                                  <div className="eyebrow text-[10px] text-mute mb-1.5">
                                    핵심 가정 · 참이어야 유효
                                  </div>
                                  <ul className="flex flex-col gap-1">
                                    {c.loadBearing.map((x, i) => (
                                      <li
                                        key={i}
                                        className="flex gap-2 text-[11px] text-body leading-snug"
                                      >
                                        <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-twilight shrink-0" />
                                        <span>{x}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {c.invalidation.length > 0 && (
                                <div>
                                  <div className="eyebrow text-[10px] text-mute mb-1.5">
                                    무효화 · 레드라인 (하나라도 참이면 논제 폐기)
                                  </div>
                                  <ul className="flex flex-col gap-1">
                                    {c.invalidation.map((x, i) => (
                                      <li
                                        key={i}
                                        className="flex gap-2 text-[11px] text-body leading-snug"
                                      >
                                        <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-red-400 shrink-0" />
                                        <span>{x}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* 이전 콜(스킬 이력): 같은 종목의 과거 콜. "어느 스킬이 언제
                                  무슨 판정을 냈나"를 시간순으로 보여준다(종목 축 통합). */}
                              {history.length > 0 && (
                                <div>
                                  <div className="eyebrow text-[10px] text-mute mb-1.5">
                                    이전 콜 · 스킬 이력
                                  </div>
                                  <ul className="flex flex-col gap-1.5">
                                    {history.map((h) => {
                                      const hcl = CALL_LABEL[h.call] ?? CALL_LABEL.hold;
                                      const hst = STATUS_STYLE[h.status] ?? STATUS_STYLE.unknown;
                                      return (
                                        <li
                                          key={h.id}
                                          className="flex flex-wrap items-center gap-2 text-[11px]"
                                        >
                                          <span className="font-mono text-mute">{h.date}</span>
                                          <span className="font-mono text-body truncate max-w-[160px]">
                                            {h.skill}
                                          </span>
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${hcl.color}`}
                                          >
                                            {hcl.label}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${hst.color}`}
                                          >
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${hst.dot}`} />
                                            {hst.label}
                                          </span>
                                          {h.report && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setModalPath(h.report!);
                                              }}
                                              className="text-[10px] text-mute hover:text-ink underline underline-offset-2 transition-colors"
                                            >
                                              보고서
                                            </button>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              {!hasDetail && (
                                <p className="text-[11px] text-mute">
                                  기록된 핵심 가정·무효화 조건이 없습니다.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-mute leading-relaxed">
            ※ 콜 이후 액면분할 등으로 시점가와 현재가의 기준이 달라질 수 있습니다(현재가는 분할 조정됨).
            무효화(레드라인) 조건은 재무 데이터가 필요해 자동 채점하지 않고 기록만 합니다.
          </p>
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

