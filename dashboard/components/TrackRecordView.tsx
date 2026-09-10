"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallStatus, CallType, CallAggregate } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import { groupTheses, entryTopPrice, type ThesisGroup } from "@/lib/thesis-groups";
import { parseTranches } from "@/lib/tranche";
import { parseFacts, factTally, bySeverity, type Fact, type FactState } from "@/lib/thesis-facts";
import type { Holding } from "@/lib/toss";
import { holdingsCache, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";
import { LadderChart } from "./LadderChart";
import { ReportModal } from "./ReportModal";

// 트랙레코드 = **추적 대시보드**(TASK-97).
//
// 예전 이 화면은 '판단의 기록부'였다 — 콜 원장을 표로 펴고 채점(적중/빗나감)을 붙였다.
// 지금 주인공은 과거 판단이 아니라 **"어느 가격에 · 얼마씩 · 지금 어디까지 왔나"** 다:
//   · 콜 종류·콜 시점·시점가 열은 화면에서 뺐다(원장에는 그대로 기록된다 —
//     priceAtCall 은 채점의 유일한 기준이고 tools/score_calls.py 와 규칙을 공유한다).
//   · 분할 진입 래더를 텍스트가 아니라 가격 축 그림으로 그린다(LadderChart).
//   · 종목당 최신 콜 1건으로 접지 않고, **살아있는 논제를 전부 나란히** 세운다.
//     서로 어긋나면 무엇이 갈리는지 배너로 드러낸다(lib/thesis-groups).
//
// 카드는 **기본 접힘**이다(TASK-105). 추적 종목이 10개를 넘으면 전부 펼친 화면은
// 스크롤만 길어져서 "어느 종목이 진입가에 가까운가"를 오히려 못 찾는다. 접힌 줄에도
// 현재가·전일 대비·진입까지 거리는 남긴다 — 그게 접은 채로 훑는 목적이다.

const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-emerald-300 bg-emerald-500/15", dot: "bg-emerald-400" },
  빗나감: { label: "빗나감", color: "text-red-300 bg-red-500/15", dot: "bg-red-400" },
  진행중: { label: "진행중", color: "text-amber-300 bg-amber-500/15", dot: "bg-amber-400" },
  unknown: { label: "미채점", color: "text-mute bg-canvas-soft", dot: "bg-canvas-mid" },
};

// 밴드는 콜 종류에 따라 의미가 정반대다 — hold 밴드는 '내려오길 기다리는 진입가'이고
// buy/keep 밴드는 '도달해야 할 목표가'다. 콜 종류를 화면에서 뺐으므로 이 라벨이
// 그 의미를 대신 진다(판정 규칙 자체는 lib/calls.ts scoreCall).
const BAND_META: Record<CallType, { short: string; long: string; why: string }> = {
  hold: { short: "진입", long: "진입 대기 밴드", why: "이 구간으로 내려오면 적중 — 밴드가 곧 채점 기준" },
  buy: { short: "목표", long: "도달 목표가", why: "채점은 방향(상승)으로 하고, 밴드 도달은 보조 지표" },
  keep: { short: "목표", long: "도달 목표가", why: "상단을 넘겨도 적중 — 보유 유지는 상방이 열려 있음" },
  avoid: { short: "참고", long: "참고 밴드", why: "채점(하락 방향)에 쓰이지 않는 적정가 추정" },
};

// 퀄리티 티어(skills/quality-tier.md). 요구 안전마진이 티어별로 다르므로, 같은 밴드라도
// 티어를 모르면 "이 할인율이 타당한가"를 판단할 수 없다 — 그래서 밴드 옆에 함께 띄운다.
const TIER_META: Record<"T1" | "T2" | "T3", { label: string; mos: string }> = {
  T1: { label: "T1 컴파운더", mos: "요구 MOS 0~15%" },
  T2: { label: "T2 우량 안정", mos: "요구 MOS 15~30%" },
  T3: { label: "T3 시클리컬·턴어라운드·저품질", mos: "요구 MOS 30~40%" },
};

// 체결확률 25% 미만일 때 택한 대응(record_call.py 가 셋 중 하나를 강제한다).
const LOW_FILL_PLAN_LABEL: Record<string, string> = {
  starter: "1차를 현재가 근처 스타터로",
  "catalyst-wait": "포지션 없음 · 촉매 대기",
  "widen-horizon": "호라이즌 연장",
};

// 체결확률 = 이 밴드가 호라이즌 안에 실제로 닿을 확률(과거 낙폭 베이스레이트).
// 이게 없으면 -34% 짜리 밴드도 계획처럼 보인다 — 2026-09-10 진단의 핵심이라 밴드 바로 밑에 붙인다.
function FillProbability({
  target,
}: {
  target: { fillProbability?: number | "unknown"; lowFillPlan?: string; horizonMonths?: number } | null;
}) {
  const fp = target?.fillProbability;
  if (fp == null) return null;

  const unknown = fp === "unknown";
  const low = unknown || (typeof fp === "number" && fp < 25);
  const plan = target?.lowFillPlan ? LOW_FILL_PLAN_LABEL[target.lowFillPlan] : null;

  return (
    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <span
        className={`rounded-full px-1.5 py-px font-mono text-[9px] font-medium ${
          low ? "bg-amber-500/15 text-amber-300" : "bg-canvas-soft text-mute"
        }`}
        title={
          unknown
            ? "상장 이력이 짧아 베이스레이트 산출 불가 — 0%와 다르다"
            : `과거 ${target?.horizonMonths ?? "?"}개월 창에서 이 낙폭이 실현된 비율 (tools/fill_probability.py)`
        }
      >
        체결확률 {unknown ? "⬛ 산출불가" : `${fp}%`}
      </span>
      {low && (
        <span className="text-[9px] text-amber-300/80">
          {plan ? `장식 밴드 → ${plan}` : "장식 밴드 — 대응 미기록"}
        </span>
      )}
    </div>
  );
}

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-red-400" : "text-breeze";
}

function fmtPrice(v: number): string {
  return `$${v.toFixed(v < 100 ? 2 : 2)}`;
}

// 표시 축 — '실제 들고 있는 것'과 '아직 안 산 것'은 읽는 목적이 다르다.
// 보유는 "지금 어떻게 되고 있나", 관찰은 "언제 살 수 있나"(진입 래더까지 거리).
type Axis = "all" | "held" | "watch";

const DISABLED_AXIS_HINT = "보유 정보를 불러오지 못해 축을 나눌 수 없습니다.";

export function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  // 매수가는 콜(예측)이 아니라 실제 진입가라 원장에 없다 — 포트폴리오(토스)에서 붙인다.
  // 실패해도 화면 본체는 그대로 유효하므로 조용히 무시하고 매수가만 비운다.
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [axis, setAxis] = useState<Axis>("all");
  // 벤치마크 대비 집계(TASK-100). 화면 본체와 독립이라 없으면 배너만 빠진다.
  const [agg, setAgg] = useState<CallAggregate | null>(null);
  // 펼친 종목 집합은 부모가 쥔다 — '모두 펼치기'가 카드 내부 상태로는 불가능하다.
  const [openTickers, setOpenTickers] = useState<Set<string>>(new Set());

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

  // localStorage 캐시 복원은 마운트 후에만 — 렌더 중 복원하면 서버 HTML과 어긋나
  // 하이드레이션이 깨진다(HoldingsBanner와 같은 규칙).
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) setHoldings(holdingsCache);
    fetchHoldingsShared()
      .then((d) => commitHoldings(Array.isArray(d.holdings) ? d.holdings : [], setHoldings))
      .catch(() => {
        // 보유 조회 실패는 매수가만 비울 뿐 추적 화면 본체와 무관하다.
      });
  }, []);

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

  // 종목별 논제 묶음 — 스킬별 최신 1건 중 살아있는 것들이 함께 온다.
  const groups = useMemo(() => groupTheses(calls ?? []), [calls]);

  const holdingsReady = holdings != null && holdings.length > 0;
  const rows = useMemo(() => {
    if (axis === "all" || !holdingsReady) return groups;
    return groups.filter((g) => (axis === "held" ? heldTickers.has(g.ticker) : !heldTickers.has(g.ticker)));
  }, [axis, groups, heldTickers, holdingsReady]);

  const toggleTicker = useCallback((t: string) => {
    setOpenTickers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);
  const allOpen = rows.length > 0 && rows.every((g) => openTickers.has(g.ticker));
  const toggleAll = () => setOpenTickers(allOpen ? new Set() : new Set(rows.map((g) => g.ticker)));

  const AXES: { id: Axis; label: string; count: number | null }[] = [
    { id: "all", label: "전체", count: groups.length },
    {
      id: "held",
      label: "보유 종목",
      count: holdingsReady ? groups.filter((g) => heldTickers.has(g.ticker)).length : null,
    },
    {
      id: "watch",
      label: "관찰 논제",
      count: holdingsReady ? groups.filter((g) => !heldTickers.has(g.ticker)).length : null,
    },
  ];

  return (
    <div>
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
          <p className="text-sm text-body">아직 기록된 논제가 없습니다.</p>
          <p className="mt-1.5 text-xs text-mute leading-relaxed">
            <code className="font-mono text-breeze">/investment-checklist</code>,{" "}
            <code className="font-mono text-breeze">/investment-team</code>,{" "}
            <code className="font-mono text-breeze">/thesis-tracker</code>가 판정을 낼 때 콜이
            원장(<code className="font-mono">data/calls.jsonl</code>)에 기록되어 여기 나타납니다.
          </p>
        </div>
      )}

      {calls && calls.length > 0 && <OpportunityCostBanner agg={agg} />}

      {calls && calls.length > 0 && (
        <>
          {/* 대상 축 탭 + 일괄 펼치기 — 한 줄. 실적 캘린더의 축 탭과 같은 어휘·모양. */}
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div
              role="group"
              aria-label="추적 대상"
              className="inline-flex rounded-full border border-hairline bg-canvas-soft p-0.5"
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
                    title={disabled ? DISABLED_AXIS_HINT : undefined}
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

            {rows.length > 0 && (
              <button
                onClick={toggleAll}
                className="rounded-full border border-hairline px-3 py-1 text-[11px] text-mute hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
              >
                {allOpen ? "모두 접기" : "모두 펼치기"}
              </button>
            )}
          </div>

          {!holdingsReady && (
            <p className="mb-3 text-[11px] text-amber-300">
              보유 정보를 불러오지 못해 <span className="text-body">보유·관찰 분리가 비활성</span>입니다 — 전체만
              표시합니다.
            </p>
          )}

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center text-xs text-mute">
              {axis === "held"
                ? "보유 종목 중 논제가 기록된 것이 없습니다."
                : "관찰 논제가 없습니다 — 기록된 논제가 전부 보유 종목입니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              {rows.map((g) => (
                <TickerCard
                  key={g.ticker}
                  group={g}
                  held={heldTickers.has(g.ticker)}
                  avgPrice={avgPriceByTicker[g.ticker] ?? null}
                  open={openTickers.has(g.ticker)}
                  onToggle={() => toggleTicker(g.ticker)}
                  onOpenReport={setModalPath}
                />
              ))}
            </div>
          )}

          {/* 각주는 하나만 — 화면을 봐도 알 수 없는 '집행 규칙'만 남긴다. */}
          <p className="mt-4 text-[11px] text-mute leading-relaxed">
            ※ <span className="text-body">조건이 붙은 차수는 가격만 닿아도 집행하지 않습니다</span> (조건
            미충족 시 조건 없는 최하단 차수까지 대기). 추격금지선을 넘은 종목은 어떤 차수도 활성화되지
            않습니다.
          </p>
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

// ── 종목 카드 ─────────────────────────────────────────────────────────────
// 카드 하나 = 종목 하나. 헤더(종목·현재가·요약)는 항상 보이고 래더·논제는 눌러서 펼친다.
// 논제가 어긋나는 카드는 펼쳤을 때만 두 열을 나란히 놓는다(접힌 줄은 폭이 필요 없다).
function TickerCard({
  group,
  held,
  avgPrice,
  open,
  onToggle,
  onOpenReport,
}: {
  group: ThesisGroup;
  held: boolean;
  avgPrice: number | null;
  open: boolean;
  onToggle: () => void;
  onOpenReport: (path: string) => void;
}) {
  // 합의(충돌 없음) 논제가 여럿일 때 나머지를 펼칠지.
  const [showAll, setShowAll] = useState(false);
  const conflict = group.conflict;
  // 충돌이면 전부 나란히(가로 폭 한계로 최대 3열), 합의면 최신 하나만 펴고 접는다.
  const visible = conflict || showAll ? group.active.slice(0, 3) : group.active.slice(0, 1);
  const hiddenCount = group.active.length - visible.length;

  // 가격 정보는 종목 축이라 논제와 무관하게 하나다 — 아무 논제에서나 가져온다.
  const anyCall = group.active[0];
  const priceNow = anyCall?.priceNow ?? null;
  const dayChange = anyCall?.dayChange ?? null;
  const dayChangePct = anyCall?.dayChangePct ?? null;
  // 실제 손익 = 현재가 vs 평단가. 콜의 수익률(시점가 기준)과는 다른 축이다.
  const plPct = avgPrice != null && priceNow != null ? ((priceNow - avgPrice) / avgPrice) * 100 : null;

  // 접힌 줄이 답해야 하는 질문은 하나다: "이 종목, 진입까지 얼마 남았나."
  // 살아있는 논제 중 **가장 먼저 닿는**(가장 비싼) 집행 지점을 기준으로 잡는다.
  // 🔴 hold(관망) 논제만 쓴다 — buy/keep 의 밴드는 진입가가 아니라 **도달 목표가**라
  // 같은 숫자를 "진입까지"로 읽으면 방향이 정반대가 된다(BAND_META 참조).
  const nextEntry = useMemo(() => {
    const tops = group.active
      .filter((c) => c.call === "hold")
      .map(entryTopPrice)
      .filter((p): p is number => p != null);
    return tops.length > 0 ? Math.max(...tops) : null;
  }, [group.active]);
  const entryGapPct =
    nextEntry != null && priceNow != null && priceNow > 0
      ? ((nextEntry - priceNow) / priceNow) * 100
      : null;

  return (
    <div
      className={`rounded-lg border border-hairline bg-canvas-card ${
        conflict && open ? "xl:col-span-2" : ""
      }`}
    >
      {/* 헤더 — 누르면 펼친다. 종목 · 현재가 · 전일 대비 · 요약 */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group w-full rounded-lg p-4 text-left transition-colors hover:bg-canvas-soft/40"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] text-mute transition-transform ${open ? "rotate-90" : ""}`}>
              ▶
            </span>
            <span className="font-mono text-ink text-base tracking-[-0.02em]">{group.ticker}</span>
            {held && (
              <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute">보유</span>
            )}
            {group.resolvedOnly && (
              <span
                className="rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute"
                title="살아있는 논제가 없습니다 — 채점이 끝난 마지막 판단만 남겨둡니다."
              >
                종료
              </span>
            )}
            {conflict && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">
                충돌 {group.active.length}
              </span>
            )}
            {group.active.length > 1 && !conflict && (
              <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute">
                동의 {group.active.length}건
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-ink text-base tracking-[-0.02em]">
              {priceNow != null ? fmtPrice(priceNow) : "—"}
            </div>
            {/* 전일 대비 — 금액과 %를 함께. 색은 한국식(상승 빨강 / 하락 파랑). */}
            <div className={`font-mono text-[11px] ${moveColor(dayChangePct)}`}>
              {dayChange != null && dayChangePct != null ? (
                <>
                  {dayChangePct >= 0 ? "▲" : "▼"} ${Math.abs(dayChange).toFixed(2)} (
                  {dayChangePct >= 0 ? "+" : ""}
                  {dayChangePct.toFixed(2)}%)
                </>
              ) : (
                <span className="text-mute">전일 대비 —</span>
              )}
            </div>
          </div>
        </div>

        {/* 요약 — 접힌 채로 훑을 때 필요한 두 숫자: 실제 손익, 진입까지 거리 */}
        {(avgPrice != null || entryGapPct != null) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            {avgPrice != null && (
              <span className="flex items-center gap-1.5">
                <span className="eyebrow text-[9px]">매수가</span>
                <span className="font-mono text-body">{fmtPrice(avgPrice)}</span>
                {plPct != null && (
                  <span className={`font-mono ${moveColor(plPct)}`}>
                    {plPct >= 0 ? "+" : ""}
                    {plPct.toFixed(1)}%
                  </span>
                )}
              </span>
            )}
            {entryGapPct != null && nextEntry != null && (
              <span className="flex items-center gap-1.5">
                <span className="eyebrow text-[9px]">진입까지</span>
                {entryGapPct >= 0 ? (
                  <span className="font-mono text-emerald-300">도달 · 1차 {fmtPrice(nextEntry)}</span>
                ) : (
                  <>
                    <span className="font-mono text-body">{entryGapPct.toFixed(1)}%</span>
                    <span className="font-mono text-[10px] text-mute">→ 1차 {fmtPrice(nextEntry)}</span>
                  </>
                )}
              </span>
            )}
          </div>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* 충돌 배너 — 무엇이 갈리는지 먼저 말한다. */}
          {conflict && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/[0.07] px-3 py-2">
              <div className="eyebrow text-[9px] text-amber-300 mb-1">논제 충돌 {group.active.length}건</div>
              <ul className="flex flex-col gap-0.5">
                {conflict.reasons.map((r, i) => (
                  <li key={i} className="text-[11px] text-body leading-snug">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 논제 열 — 충돌이면 나란히, 합의면 하나(+펼치기) */}
          <div
            className={`mt-3 grid gap-4 ${
              visible.length > 1 ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
            }`}
          >
            {visible.map((c) => (
              <ThesisColumn key={c.id} call={c} avgPrice={avgPrice} onOpenReport={onOpenReport} />
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 rounded-full border border-hairline px-3 py-1 text-[10px] text-mute hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              다른 논제 {hiddenCount}건 보기
            </button>
          )}

          {group.history.length > 0 && <HistoryStrip history={group.history} onOpenReport={onOpenReport} />}
        </div>
      )}
    </div>
  );
}

// ── 논제 한 건(= 보고서 한 건의 결론) ────────────────────────────────────
function ThesisColumn({
  call: c,
  avgPrice,
  onOpenReport,
}: {
  call: ScoredCall;
  avgPrice: number | null;
  onOpenReport: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = BAND_META[c.call] ?? BAND_META.buy;
  const tranches = useMemo(() => parseTranches(c.target?.tranches), [c.target?.tranches]);
  const assumptions = useMemo(() => parseFacts(c.loadBearing), [c.loadBearing]);
  const redlines = useMemo(() => parseFacts(c.invalidation), [c.invalidation]);
  const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
  const cl = CALL_LABEL[c.call] ?? CALL_LABEL.hold;
  const hasDetail = assumptions.length > 0 || redlines.length > 0 || !!c.reason;

  return (
    <div className="min-w-0">
      {/* 출처 — 어느 보고서가 낸 결론인지. 논제가 여럿일 때 이게 없으면 비교가 안 된다. */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className={`rounded-full px-1.5 py-px text-[9px] font-medium ${cl.color}`}>{cl.label}</span>
        {c.report ? (
          <button
            onClick={() => onOpenReport(c.report as string)}
            className="font-mono text-[10px] text-mute hover:text-ink underline underline-offset-2 transition-colors truncate max-w-[180px]"
            title={c.report}
          >
            {c.skill}
          </button>
        ) : (
          <span className="font-mono text-[10px] text-mute truncate max-w-[180px]">{c.skill}</span>
        )}
        <span className="font-mono text-[10px] text-mute/70">{c.date}</span>
        {c.horizonMonths != null && (
          <span className="rounded-full border border-hairline px-1.5 py-px text-[9px] text-mute">
            {c.horizonMonths}M
          </span>
        )}
        {c.tier && (
          <span
            className="rounded-full border border-hairline px-1.5 py-px font-mono text-[9px] text-mute"
            title={`${TIER_META[c.tier].label} — ${TIER_META[c.tier].mos}${
              c.requiredMosPct != null ? ` · 이 콜의 요구 MOS ${c.requiredMosPct}%` : ""
            }`}
          >
            {c.tier}
          </span>
        )}
      </div>

      <LadderChart
        tranches={tranches}
        band={c.target ?? null}
        bandLabel={meta.long}
        priceNow={c.priceNow}
        avgPrice={avgPrice}
        noChaseAbove={c.target?.noChaseAbove ?? null}
      />

      <FillProbability target={c.target ?? null} />

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 flex items-center gap-1.5 text-[10px] text-mute hover:text-ink transition-colors"
      >
        <span className={`inline-block text-[9px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        상세
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-medium ${st.color}`}
        >
          <span className={`inline-block w-1 h-1 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </button>

      {/* 상세 = **숫자와 도식만**. 원문 산문은 툴팁과 '전문 보기'로 밀어둔다 —
          한국어 불릿 14줄을 그대로 펴면 "지금 무엇이 깨졌나"를 눈으로 못 찾는다. */}
      {open && (
        <div className="mt-2 flex flex-col gap-3 border-t border-hairline pt-2.5">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
            <Stat label="시점가" value={fmtPrice(c.priceAtCall)} />
            <Stat
              label="시점 대비"
              value={
                c.returnPct != null ? `${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}%` : "—"
              }
              tone={c.returnPct != null ? moveColor(c.returnPct) : "text-mute"}
            />
            <Stat
              label="경과"
              value={`${c.elapsedDays}d`}
              sub={c.horizonMonths != null ? `/ ${c.horizonMonths}M` : null}
            />
            {/* 벤치마크 대비(TASK-100) — 밴드 터치만 보면 "안 사서 잃은 것"이 안 보인다. */}
            <Stat
              label="SPY"
              value={
                c.benchmarkReturnPct != null
                  ? `${c.benchmarkReturnPct >= 0 ? "+" : ""}${c.benchmarkReturnPct.toFixed(1)}%`
                  : "—"
              }
              tone="text-mute"
            />
            <Stat
              label="초과수익"
              value={
                c.excessReturnPct != null
                  ? `${c.excessReturnPct >= 0 ? "+" : ""}${c.excessReturnPct.toFixed(1)}pp`
                  : "—"
              }
              tone={c.excessReturnPct != null ? moveColor(c.excessReturnPct) : "text-mute"}
            />
            <Stat
              label="기회비용"
              value={
                c.opportunityCostPct != null ? `${c.opportunityCostPct.toFixed(1)}pp` : "—"
              }
              sub={c.call === "hold" ? "기다려서 포기" : c.call === "avoid" ? "피해서 포기" : "판단 대가"}
              tone={
                c.opportunityCostPct != null && c.opportunityCostPct > 0
                  ? "text-amber-300"
                  : "text-mute"
              }
            />
          </div>

          {c.horizonProgress != null && (
            <div>
              <div className="relative h-1 overflow-hidden rounded-full bg-canvas-soft">
                <div
                  className="absolute inset-y-0 left-0 bg-twilight"
                  style={{ width: `${Math.min(Math.max(c.horizonProgress, 0), 1) * 100}%` }}
                />
              </div>
              <div className="mt-1 font-mono text-[9px] text-mute">
                호라이즌 경과 {Math.round(c.horizonProgress * 100)}%
              </div>
            </div>
          )}

          <FactBlock title="핵심 가정 · 참이어야 유효" facts={assumptions} />
          <FactBlock title="무효화 · 레드라인" facts={redlines} redline />
          {c.reason && <Reason text={c.reason} />}

          {!hasDetail && <p className="text-[11px] text-mute">기록된 핵심 가정·무효화 조건이 없습니다.</p>}
        </div>
      )}
    </div>
  );
}

// 기회비용 배너 (TASK-100).
// 기존 채점은 밴드 터치 여부만 봤다 — `hold` 걸어두고 주가가 도망가도 손실로 안 잡혔다.
// 호라이즌이 12~24M 이라 '확정' 집계는 1년 뒤에나 채워지므로, 진행중 잠정치를 같이 띄운다.
function OpportunityCostBanner({ agg }: { agg: CallAggregate | null }) {
  if (!agg) return null;
  const resolved = agg.holdOpportunityCostAvgPct;
  const running = agg.inProgressHoldOpportunityCostAvgPct;
  if (resolved == null && running == null) return null;

  // 8pp 넘게 뒤처지고 있으면 눈에 띄어야 한다 — 이게 '보수성 편향'의 체감 지점이다.
  const worst = Math.max(resolved ?? 0, running ?? 0);
  const loud = worst >= 8;

  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-2 ${
        loud ? "border-amber-400/30 bg-amber-500/[0.07]" : "border-hairline bg-canvas-card"
      }`}
    >
      <div className={`eyebrow text-[9px] mb-1 ${loud ? "text-amber-300" : "text-mute"}`}>
        관망의 기회비용 · SPY 대비
      </div>
      <div className="flex items-baseline gap-4 flex-wrap">
        {running != null && (
          <span className="font-mono text-[11px] text-body">
            진행중 <strong className={loud ? "text-amber-300" : "text-ink"}>{running.toFixed(1)}pp</strong>
            <span className="text-mute"> ({agg.inProgressHoldCount}건 · 잠정)</span>
          </span>
        )}
        {resolved != null && (
          <span className="font-mono text-[11px] text-body">
            확정 <strong className="text-ink">{resolved.toFixed(1)}pp</strong>
            <span className="text-mute"> ({agg.holdResolvedCount}건)</span>
          </span>
        )}
        {agg.benchmarkHitRate != null && (
          <span className="font-mono text-[11px] text-mute">
            SPY 대비 적중 {Math.round(agg.benchmarkHitRate * 100)}%
            <span className="text-mute/70"> ({agg.benchmarkHits}/{agg.benchmarkResolvedCount})</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-mute">
        기다리는 동안 주가가 SPY보다 더 올랐다면 그만큼이 <strong>안 사서 잃은 것</strong>이다.
        밴드 터치 여부만으로는 보이지 않아 따로 잰다.
      </p>
    </div>
  );
}

// ── 상세의 조각들 ────────────────────────────────────────────────────────
function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: string;
}) {
  return (
    <div className="bg-canvas-card px-2 py-1.5">
      <div className="eyebrow text-[9px] mb-0.5">{label}</div>
      <div className={`font-mono text-[12px] ${tone ?? "text-ink"}`}>
        {value}
        {sub && <span className="ml-0.5 text-[10px] text-mute">{sub}</span>}
      </div>
    </div>
  );
}

// 상태 색은 의미가 고정이다 — 빨강=깨졌다/발동, 회색=확인 불가, 초록=아직 괜찮다,
// 보라=상태 기록 없음(옛 콜은 판정 없이 조건만 적혀 있다).
const FACT_DOT: Record<FactState, string> = {
  bad: "bg-red-400",
  unknown: "bg-canvas-mid",
  ok: "bg-emerald-400",
  none: "bg-twilight",
};
const FACT_STATE_LABEL: Record<FactState, string> = {
  bad: "훼손·발동",
  unknown: "미확인",
  ok: "충족·미발동",
  none: "상태 미기록",
};
const FACT_ORDER: FactState[] = ["bad", "unknown", "none", "ok"];
const FACT_PREVIEW = 5;

/** 가정·레드라인 묶음 — 상태 막대(도식) + 심각한 것부터 5줄. 원문은 툴팁에 남는다. */
function FactBlock({ title, facts, redline = false }: { title: string; facts: Fact[]; redline?: boolean }) {
  const [more, setMore] = useState(false);
  if (facts.length === 0) return null;

  const tally = factTally(facts);
  const sorted = [...facts].sort(bySeverity);
  const shown = more ? sorted : sorted.slice(0, FACT_PREVIEW);
  const rest = sorted.length - shown.length;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <div className={`eyebrow text-[10px] ${redline ? "text-red-300/80" : ""}`}>{title}</div>
        <span className="font-mono text-[10px] text-mute">{tally.total}</span>
        {/* 상태 막대 — 깨진 것 / 모르는 것 / 괜찮은 것의 비율 */}
        <div className="flex h-1 min-w-[40px] flex-1 overflow-hidden rounded-full bg-canvas-soft">
          {FACT_ORDER.filter((s) => tally[s] > 0).map((s) => (
            <div
              key={s}
              className={FACT_DOT[s]}
              style={{ width: `${(tally[s] / tally.total) * 100}%` }}
              title={`${FACT_STATE_LABEL[s]} ${tally[s]}건`}
            />
          ))}
        </div>
        {tally.bad > 0 && <span className="font-mono text-[10px] text-red-300">훼손 {tally.bad}</span>}
        {tally.unknown > 0 && <span className="font-mono text-[10px] text-mute">미확인 {tally.unknown}</span>}
      </div>
      <ul className="flex flex-col gap-1">
        {shown.map((f, i) => (
          <li key={i} className="flex min-w-0 items-start gap-1.5 text-[11px] leading-snug" title={f.raw}>
            <span className={`mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full ${FACT_DOT[f.state]}`} />
            {f.code && <span className="shrink-0 font-mono text-[9px] text-mute">{f.code}</span>}
            <span className="min-w-0 flex-1 truncate text-body">{f.label}</span>
            {f.note && (
              <span className="max-w-[42%] shrink-0 truncate font-mono text-[10px] text-mute">{f.note}</span>
            )}
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          onClick={() => setMore(true)}
          className="mt-1 text-[10px] text-mute transition-colors hover:text-ink"
        >
          +{rest}건 더
        </button>
      )}
    </div>
  );
}

/** 판단 근거 — 산문이라 3줄로 접는다. 짧은 글에는 토글을 붙이지 않는다. */
function Reason({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 140;
  return (
    <div>
      <div className="eyebrow mb-1 text-[10px]">판단 근거</div>
      <p className={`text-[11px] leading-relaxed text-body ${!open && long ? "line-clamp-3" : ""}`}>{text}</p>
      {long && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[10px] text-mute transition-colors hover:text-ink"
        >
          {open ? "접기" : "전문 보기"}
        </button>
      )}
    </div>
  );
}

// ── 갱신·종료된 이전 논제 ────────────────────────────────────────────────
// 살아있지 않은 콜은 추적 대상이 아니라 이력이다 — 한 줄로 접어 카드 바닥에 둔다.
function HistoryStrip({
  history,
  onOpenReport,
}: {
  history: ScoredCall[];
  onOpenReport: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-hairline pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[10px] text-mute hover:text-ink transition-colors"
      >
        <span className={`inline-block text-[9px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        이전 논제 {history.length}건
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {history.map((h) => {
            const hcl = CALL_LABEL[h.call] ?? CALL_LABEL.hold;
            const hst = STATUS_STYLE[h.status] ?? STATUS_STYLE.unknown;
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="font-mono text-mute">{h.date}</span>
                <span className="font-mono text-body truncate max-w-[160px]">{h.skill}</span>
                <span className={`rounded-full px-1.5 py-px font-medium ${hcl.color}`}>{hcl.label}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px font-medium ${hst.color}`}>
                  <span className={`inline-block w-1 h-1 rounded-full ${hst.dot}`} />
                  {hst.label}
                </span>
                {h.report && (
                  <button
                    onClick={() => onOpenReport(h.report as string)}
                    className="text-mute hover:text-ink underline underline-offset-2 transition-colors"
                  >
                    보고서
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
