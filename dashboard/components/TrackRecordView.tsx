"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallAggregate, CallStatus, CallType } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import type { Holding } from "@/lib/toss";
import { holdingsCache, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";
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

const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-emerald-300 bg-emerald-500/15", dot: "bg-emerald-400" },
  빗나감: { label: "빗나감", color: "text-red-300 bg-red-500/15", dot: "bg-red-400" },
  진행중: { label: "진행중", color: "text-amber-300 bg-amber-500/15", dot: "bg-amber-400" },
  unknown: { label: "미채점", color: "text-mute bg-canvas-soft", dot: "bg-canvas-mid" },
};

// 목표 밴드는 콜 종류에 따라 의미가 정반대다 — hold 밴드는 시점가 '아래'(내려오길 기다리는
// 진입가)이고 buy/keep 밴드는 시점가 '위'(도달해야 할 목표가)다. 라벨 없이 숫자만 두면
// 시점가와 눈으로 비교해야만 구분되므로, 채점상 의미를 앞에 붙여 드러낸다.
// (판정 규칙 자체는 lib/calls.ts scoreCall — 여기선 그 규칙을 말로 옮길 뿐이다.)
const BAND_META: Record<CallType, { short: string; long: string; why: string }> = {
  hold: { short: "진입", long: "진입 대기 밴드", why: "이 구간으로 내려오면 적중 — 밴드가 곧 채점 기준" },
  buy: { short: "목표", long: "도달 목표가", why: "채점은 방향(상승)으로 하고, 밴드 도달은 보조 지표" },
  keep: { short: "목표", long: "도달 목표가", why: "상단을 넘겨도 적중 — 보유 유지는 상방이 열려 있음" },
  avoid: { short: "참고", long: "참고 밴드", why: "채점(하락 방향)에 쓰이지 않는 적정가 추정" },
};

function bandOf(
  c: ScoredCall
): { label: string; long: string; why: string; value: string } | null {
  const t = c.target;
  if (!t || (t.low == null && t.high == null)) return null;
  const meta = BAND_META[c.call] ?? BAND_META.buy;
  return {
    label: meta.short,
    long: meta.long,
    why: meta.why,
    value: `$${t.low ?? "?"}~${t.high ?? "?"}${t.horizonMonths ? ` · ${t.horizonMonths}M` : ""}`,
  };
}

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-red-400" : "text-breeze";
}

// 표시 축 — '실제 들고 있는 것'과 '아직 안 산 것'은 읽는 목적이 다르다.
// 보유는 "지금 어떻게 되고 있나"(손익·논제 훼손 여부), 관찰은 "언제 살 수 있나"(진입 밴드까지 거리).
// 실적 캘린더(EarningsCalendar)의 대상 축 탭과 같은 어휘를 쓴다.
type Axis = "all" | "held" | "watch";
const AXIS_DESC: Record<Axis, string> = {
  all: "기록된 모든 콜. 보유 여부와 무관하게 판단 이력 전체를 봅니다.",
  held: "포트폴리오(토스)에 실제로 있는 종목. 매수가 열이 채워지고, 관심사는 '논제가 아직 유효한가'입니다.",
  watch: "논제만 세우고 사지 않은 종목(관망·회피). 관심사는 '진입 밴드까지 얼마나 남았나'입니다.",
};

export function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [agg, setAgg] = useState<CallAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  // 매수가 열 전용 보유 정보. 콜(예측)과 실제 진입가는 별개 축이라 원장에는 없다 —
  // 포트폴리오(토스)에서 평단가를 가져와 붙인다. 이 열이 비어도 표는 그대로 유효하므로
  // 실패는 조용히 무시하고 '—'로 둔다(트랙레코드가 보유 조회에 발목 잡히지 않게).
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  // 표시 축(보유 / 관찰 / 전체). 기본은 전체 — 축을 나누기 전 동작을 그대로 유지한다.
  const [axis, setAxis] = useState<Axis>("all");
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

  // 보유 정보(매수가 열). localStorage 캐시 복원은 마운트 후에만 — 렌더 중 복원하면
  // 서버 HTML과 어긋나 하이드레이션이 깨진다(HoldingsBanner와 같은 규칙).
  // fetchHoldingsShared 로 진행 중 요청을 공유해 토스 API 중복 호출(429)을 피한다.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) setHoldings(holdingsCache);
    fetchHoldingsShared()
      .then((d) => commitHoldings(Array.isArray(d.holdings) ? d.holdings : [], setHoldings))
      .catch(() => {
        // 보유 조회 실패는 매수가 열만 '—'로 만들 뿐 트랙레코드 본체와 무관하다.
      });
  }, []);

  // 티커 → 평단가(USD). 표의 다른 가격 열과 통화를 맞춘다.
  const avgPriceByTicker = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of holdings ?? []) {
      if (typeof h.avgPrice === "number" && h.avgPrice > 0) m[h.ticker.toUpperCase()] = h.avgPrice;
    }
    return m;
  }, [holdings]);

  // 보유 판정은 **포트폴리오 보유 목록**으로만 한다 — 콜 종류(keep/buy)로 추론하지 않는다.
  // buy 콜은 "지금 사도 좋다"는 분석 결론일 뿐 사용자가 샀다는 뜻이 아니기 때문이다
  // (CLAUDE.md '보유 상태의 기본값은 항상 미보유·관망'과 같은 규칙).
  const heldTickers = useMemo(
    () => new Set((holdings ?? []).map((h) => h.ticker.trim().toUpperCase())),
    [holdings]
  );

  // 진행중 콜들의 예상 첫 채점일 중 가장 이른 날짜(TASK-78 빈 상태 안내).
  const earliestResolve = useMemo(() => {
    const dates = (calls ?? [])
      .filter((c) => c.status === "진행중")
      .map(expectedResolveDate)
      .filter((d): d is Date => d != null);
    if (dates.length === 0) return null;
    return dates.reduce((a, b) => (a < b ? a : b));
  }, [calls]);

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

  // 축별 행 목록. 보유 조회가 실패/미로딩이면 held/watch를 가를 근거가 없으므로
  // 분리를 시도하지 않고 전체를 그대로 보여준다(빈 표로 오해하지 않게 안내는 따로 띄운다).
  const holdingsReady = holdings != null && holdings.length > 0;
  const rows = useMemo(() => {
    if (axis === "all" || !holdingsReady) return latest;
    const held = (c: ScoredCall) => heldTickers.has(c.ticker.trim().toUpperCase());
    return latest.filter((c) => (axis === "held" ? held(c) : !held(c)));
  }, [axis, latest, heldTickers, holdingsReady]);

  const AXES: { id: Axis; label: string; count: number | null }[] = [
    { id: "all", label: "전체", count: latest.length },
    {
      id: "held",
      label: "보유 종목",
      count: holdingsReady
        ? latest.filter((c) => heldTickers.has(c.ticker.trim().toUpperCase())).length
        : null,
    },
    {
      id: "watch",
      label: "관찰 논제",
      count: holdingsReady
        ? latest.filter((c) => !heldTickers.has(c.ticker.trim().toUpperCase())).length
        : null,
    },
  ];

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

          {/* 콜 목록 표 — 넓은 화면에서 표, 좁으면 자체 가로 스크롤.
              상단 집계 카드(KPI 4 + 성적표 2)는 제거됨 — 표 자체가 판단 근거다. */}
          {/* 대상 축 탭 — 실제 보유 vs 아직 안 산 것. 실적 캘린더의 축 탭과 같은 어휘·모양.
              보유 판정은 포트폴리오(토스) 목록으로만 하고 콜 종류로 추론하지 않는다. */}
          <div
            role="group"
            aria-label="트랙레코드 대상"
            className="mb-3 inline-flex rounded-full border border-hairline bg-canvas-soft p-0.5"
          >
            {AXES.map((a) => {
              const active = axis === a.id;
              const disabled = a.id !== "all" && !holdingsReady;
              return (
                <button
                  key={a.id}
                  onClick={() => !disabled && setAxis(a.id)}
                  aria-pressed={active}
                  disabled={disabled}
                  title={disabled ? "보유 정보를 불러오지 못해 축을 나눌 수 없습니다." : AXIS_DESC[a.id]}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors active:scale-95 ${
                    active ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {a.label}
                  {a.count != null && (
                    <span className={active ? "text-canvas/60" : "text-mute/70"}>{a.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-mute mb-2 leading-relaxed">
            {AXIS_DESC[axis]} 종목당 <span className="text-body">최신 콜 1건</span>만 표시하며,
            같은 종목의 이전 콜(스킬 이력)은 행을 눌러 펼치면 나옵니다.
            {!holdingsReady && (
              <span className="text-amber-300">
                {" "}보유 정보를 불러오지 못해 <span className="text-body">보유·관찰 분리가 비활성</span>입니다 —
                전체만 표시합니다.
              </span>
            )}
          </p>
          <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-sm border-collapse min-w-[820px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["종목", "콜", "콜 시점", "시점가", "매수가", "현재가", "밴드", "보고서"].map(
                      (h) => (
                        <th key={h} className="eyebrow text-[10px] text-mute font-normal px-3 py-2.5">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-xs text-mute">
                        {axis === "held"
                          ? "보유 종목 중 콜이 기록된 것이 없습니다."
                          : "관찰 논제가 없습니다 — 기록된 콜이 전부 보유 종목입니다."}
                      </td>
                    </tr>
                  )}
                  {rows.map((c) => {
                    const cl = CALL_LABEL[c.call] ?? CALL_LABEL.hold;
                    const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
                    const band = bandOf(c);
                    const avgPrice = avgPriceByTicker[c.ticker.toUpperCase()] ?? null;
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
                            {/* '전체' 축에서는 어느 게 실제 보유인지 행 단위로 보이게 한다
                                (보유 축에서는 전부 보유라 중복 표기가 된다). */}
                            {axis === "all" && heldTickers.has(c.ticker.trim().toUpperCase()) && (
                              <span className="shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute">
                                보유
                              </span>
                            )}
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
                        {/* 매수가 = 포트폴리오 평단가. 미보유 종목은 '—' (관망·회피 콜이 대부분). */}
                        <td className="px-3 py-2.5 font-mono">
                          {avgPrice != null ? (
                            <span className="text-body" title="포트폴리오 평단가 (보유 중)">
                              ${avgPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-mute" title="미보유 — 포트폴리오에 없는 종목">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceNow === "number" ? `$${c.priceNow.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {band ? (
                            <span
                              className="flex items-baseline gap-1.5"
                              title={`${band.long} — ${band.why}`}
                            >
                              <span className="eyebrow text-[9px] text-mute shrink-0">
                                {band.label}
                              </span>
                              <span className="font-mono text-body whitespace-nowrap">
                                {band.value}
                              </span>
                            </span>
                          ) : (
                            <span className="font-mono text-mute">—</span>
                          )}
                        </td>
                        {/* 채점 상태(적중/빗나감/진행중)와 경과일은 표에서 뺐다 —
                            행을 펼치면 상세 요약 줄에 나온다. */}
                        <td className="px-3 py-2.5">
                          {c.report ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalPath(c.report!);
                              }}
                              className="text-[11px] text-mute hover:text-ink underline underline-offset-2 transition-colors"
                            >
                              보고서
                            </button>
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
                          <td colSpan={8} className="px-3 py-4">
                            <div className="flex flex-col gap-3.5 max-w-3xl pl-3">
                              {/* 진행 요약 — 표에서 뺀 채점 상태·경과일이 여기 남는다.
                                  특히 관망(hold)은 밴드로 내려오는 게 적중이라 수익률
                                  부호와 채점 결과가 어긋난다 → 상태를 반드시 함께 둔다. */}
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-mute">
                                <span className="inline-flex items-center gap-1.5">
                                  채점
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${st.color}`}
                                  >
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                    {st.label}
                                  </span>
                                </span>
                                <span>
                                  경과 <span className="font-mono text-body">{c.elapsedDays}d</span>
                                  {c.horizonProgress != null && (
                                    <span className="text-mute/70">
                                      {" "}· horizon {Math.round(c.horizonProgress * 100)}%
                                    </span>
                                  )}
                                </span>
                                <span>
                                  콜 시점가{" "}
                                  <span className="font-mono text-body">
                                    ${c.priceAtCall.toFixed(2)}
                                  </span>
                                </span>
                                {avgPrice != null && (
                                  <span>
                                    매수가{" "}
                                    <span className="font-mono text-body">
                                      ${avgPrice.toFixed(2)}
                                    </span>
                                  </span>
                                )}
                                {c.priceNow != null && (
                                  <span>
                                    현재가{" "}
                                    <span className="font-mono text-body">
                                      ${c.priceNow.toFixed(2)}
                                    </span>
                                  </span>
                                )}
                                {c.returnPct != null && (
                                  <span>
                                    수익률{" "}
                                    <span className={`font-mono ${moveColor(c.returnPct)}`}>
                                      {c.returnPct >= 0 ? "+" : ""}
                                      {c.returnPct.toFixed(1)}%
                                    </span>
                                  </span>
                                )}
                                {band && (
                                  <span>
                                    {band.long}{" "}
                                    <span className="font-mono text-body">{band.value}</span>
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

                              {/* 이 콜에서 밴드가 무엇을 뜻하는지 — hold(진입 대기)와
                                  buy/keep(도달 목표)이 정반대라 표의 라벨만으론 부족하다. */}
                              {band && (
                                <p className="-mt-2 text-[11px] text-mute leading-snug">
                                  {band.long} — {band.why}
                                </p>
                              )}

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

          {/* 밴드 열 범례 — 같은 숫자가 콜 종류에 따라 정반대를 뜻하므로,
              라벨만 보고도 읽히도록 두 의미를 명시한다. */}
          <p className="mt-3 text-[11px] text-mute leading-relaxed">
            ※ <span className="text-body">밴드</span> 열은 콜 종류에 따라 의미가 다릅니다 —{" "}
            <span className="eyebrow text-[9px]">진입</span>(관망)은{" "}
            <span className="text-body">내려오길 기다리는 매수 구간</span>으로 밴드 안으로의 회귀가
            곧 적중이고, <span className="eyebrow text-[9px]">목표</span>(매수·보유 유지)는{" "}
            <span className="text-body">도달해야 할 목표가</span>로 채점은 방향으로 하고 밴드 도달은
            보조 지표입니다. <span className="eyebrow text-[9px]">참고</span>(회피)는 채점에 쓰이지
            않습니다.
          </p>
          <p className="mt-1.5 text-[11px] text-mute leading-relaxed">
            ※ <span className="text-body">매수가</span>는 포트폴리오(토스) 평단가입니다 — 콜은 예측이고
            매수가는 실제 진입가라 별개 축이며, 미보유 종목은 <span className="font-mono">—</span>로
            표시됩니다. <span className="text-body">채점 상태</span>(적중·빗나감·진행중)·수익률·경과일은
            행을 펼치면 나옵니다.
          </p>
          <p className="mt-1.5 text-[11px] text-mute leading-relaxed">
            ※ 콜 이후 액면분할 등으로 시점가와 현재가의 기준이 달라질 수 있습니다(현재가는 분할 조정됨).
            무효화(레드라인) 조건은 재무 데이터가 필요해 자동 채점하지 않고 기록만 합니다.
          </p>
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

