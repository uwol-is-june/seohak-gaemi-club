"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallStatus, CallType } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import { groupTheses, entryTopPrice, type ThesisGroup, type RefreshFlag } from "@/lib/thesis-groups";
import { parseTranches, pricedTranches, topTranchePrice } from "@/lib/tranche";
import type { Holding } from "@/lib/toss";
import { holdingsCache, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";
import { Delta, TierBadge, TIER_META } from "./primitives";
import { LadderChart } from "./LadderChart";
import { PriceHistoryChart } from "./track-record/PriceHistoryChart";
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
//
// 펼친 카드는 **래더 + 숫자 표**까지다(TASK-108). 2단 토글('상세')과 '이전 논제 n건'은
// 없앴다 — 화면에서 세 번을 눌러야 숫자가 나오면 추적을 안 하게 되고, 가정·레드라인·
// 판단 근거 산문은 보고서 원문(클릭하면 모달)이 정본이라 카드에서 요약할 이유가 없다.
// 대신 **갱신이 필요한 스킬**을 접힌 줄에서 바로 띄운다 — 충돌을 봐도 "그래서 뭘 돌려야
// 하나"를 모르면 화면이 일을 끝내주지 못한다(lib/thesis-groups detectRefresh).
//
// 🔴 **모든 종목 카드가 같은 골격이다**(TASK-110). 화면의 유일한 용도가 종목 간 비교인데
// 카드마다 폭(충돌이면 2열)·논제 열 수(1~3열)·표시 항목(있는 값만 칩으로)이 달라서
// 나란히 놓고 읽을 수가 없었다. 규칙 셋으로 고정했다:
//   1) 카드 폭은 언제나 1열, 논제는 **세로로 쌓는다** — 래더의 가격 축 폭이 항상 같다.
//   2) 접힌 줄의 요약은 **두 슬롯 고정**(매수가 / 진입·목표까지). 값이 없으면 칸을
//      지우지 않고 '미보유' · '□ 미산출'로 남긴다.
//   3) 펼친 논제는 **3×3 숫자 표 고정** — 티어·호라이즌·체결확률까지 표의 칸이라
//      결측이 빈칸으로 드러난다. 안 보이는 결측은 영원히 안 채워진다.

import {
  STATUS_STYLE, BAND_META, LOW_FILL_PLAN_LABEL, NL, TRANCHE_HOWTO, moveColor, fmtPrice,
  parseHealth, healthTone, initials,
} from "./track-record/meta";

// 표시 축 — '실제 들고 있는 것'과 '아직 안 산 것'은 읽는 목적이 다르다.
// 보유는 "지금 어떻게 되고 있나", 관찰은 "언제 살 수 있나"(진입 래더까지 거리).
type Axis = "all" | "held" | "watch";

// 정렬 축. 라벨은 "무엇을 기준으로 세로로 읽을 것인가"를 그대로 말한다.
type SortKey = "gap" | "fill" | "health" | "ticker";

// 상태 필터 — 축(보유/관찰)과 다른 축이다. "지금 집행을 막고 있는 게 무엇인가"로 좁힌다.
type Flag = "gated" | "decorative" | "noLadder";
const FLAG_LABEL: Record<Flag, { label: string; why: string }> = {
  gated: {
    label: "조건 대기",
    why: "AND 조건이 붙은 차수가 있습니다 — 가격이 닿아도 조건 없이는 집행하지 않습니다.",
  },
  decorative: {
    label: "장식 밴드",
    why: "체결확률 25% 미만 — 밴드가 실행 계획이 아니라 장식일 수 있습니다.",
  },
  noLadder: {
    label: "차수 미분할",
    why: "가격이 붙은 차수가 없습니다 — 밴드 양끝 두 숫자로는 집행할 수 없습니다.",
  },
};

// 종목 하나가 어떤 깃발을 달고 있나. 정렬·필터·행 렌더가 같은 판정을 써야 어긋나지 않는다.
function flagsOf(g: ThesisGroup): Set<Flag> {
  const out = new Set<Flag>();
  const lead = g.active[0] ?? g.history[0];
  const priced = g.active.flatMap((c) => pricedTranches(parseTranches(c.target?.tranches)));
  if (priced.some((t) => t.condition)) out.add("gated");
  if (priced.length === 0) out.add("noLadder");
  const fp = lead?.target?.fillProbability;
  if (typeof fp === "number" && fp < 25) out.add("decorative");
  return out;
}
const SORT_LABEL: Record<SortKey, string> = {
  gap: "집행까지 가까운 순",
  fill: "체결확률 높은 순",
  health: "건강도 낮은 순",
  ticker: "티커순",
};

const DISABLED_AXIS_HINT = "보유 정보를 불러오지 못해 축을 나눌 수 없습니다.";

// 🔴 헤더와 행이 **같은 그리드 템플릿**을 써야 컬럼이 맞는다.
// 한쪽만 고치면 조용히 어긋나므로 상수 하나에서 온다.
const ROW_GRID =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 md:grid-cols-[56px_minmax(0,1fr)_124px_100px_76px_132px]";

export function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  // 매수가는 콜(예측)이 아니라 실제 진입가라 원장에 없다 — 포트폴리오(토스)에서 붙인다.
  // 실패해도 화면 본체는 그대로 유효하므로 조용히 무시하고 매수가만 비운다.
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [axis, setAxis] = useState<Axis>("all");
  // 🔴 이 화면을 보는 목적은 "어느 종목이 집행에 가까운가"다(TASK-137).
  //    기본 정렬이 그 질문을 답해야 한다 — 보유 여부로만 묶으면 10종목에서
  //    가까운 것이 목록 한가운데 묻힌다.
  const [sort, setSort] = useState<SortKey>("gap");
  // 복수 선택 — 겹치는 종목이 많아 하나만 고르게 하면 오히려 못 찾는다.
  const [flags, setFlags] = useState<Set<Flag>>(new Set());
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
  // 표시 순서: **보유 종목이 항상 위**. 그 다음은 groupTheses 의 순서를 그대로 둔다
  // (살아있는 논제 우선 → 최근 갱신순 → 티커). 실제로 돈이 들어가 있는 종목이 스크롤
  // 아래에 묻히면, 훑어야 할 것과 지켜봐야 할 것의 우선순위가 뒤집힌다.
  const rows = useMemo(() => {
    const byAxis =
      axis === "all" || !holdingsReady
        ? groups
        : groups.filter((g) => (axis === "held" ? heldTickers.has(g.ticker) : !heldTickers.has(g.ticker)));
    // 깃발이 여럿 선택되면 **하나라도 달린** 종목을 남긴다(교집합이면 대개 0건이 된다).
    const list =
      flags.size === 0
        ? byAxis
        : byAxis.filter((g) => {
            const f = flagsOf(g);
            for (const k of flags) if (f.has(k)) return true;
            return false;
          });

    // 정렬 키를 종목당 하나 뽑는다. 값이 없는 종목은 항상 뒤로 보낸다 —
    // □(미산출)이 위에 섞이면 "가까운 순"이라는 약속이 깨진다.
    const keyOf = (g: ThesisGroup): number => {
      // 살아있는 논제가 없는 종목(resolvedOnly)은 active 가 비어 history 최신으로 폴백한다.
      const lead = g.active[0] ?? g.history[0];
      if (!lead) return Number.POSITIVE_INFINITY;
      if (sort === "ticker") return 0;
      if (sort === "fill") {
        const fp = lead.target?.fillProbability;
        return typeof fp === "number" ? -fp : Number.POSITIVE_INFINITY;
      }
      if (sort === "health") {
        const h = parseHealth(lead.conviction);
        return h ?? Number.POSITIVE_INFINITY;
      }
      // gap — 집행 지점까지의 거리(절대값). 래더도 목표도 없으면 뒤로.
      const top = lead.call === "hold" ? entryTopPrice(lead) : topTranchePrice(parseTranches(lead.target?.tranches));
      const price = top ?? (lead.call === "buy" || lead.call === "keep" ? lead.target?.high ?? null : null);
      if (price == null || lead.priceNow == null || lead.priceNow <= 0) return Number.POSITIVE_INFINITY;
      return Math.abs((price - lead.priceNow) / lead.priceNow);
    };

    const sorted = [...list].sort((a, b) => {
      if (sort === "ticker") return a.ticker.localeCompare(b.ticker);
      const ka = keyOf(a);
      const kb = keyOf(b);
      if (ka !== kb) return ka - kb;
      return a.ticker.localeCompare(b.ticker);
    });

    // 보유 종목을 위로 올리는 건 '전체' 축에서만 — Array#sort 가 안정 정렬이라
    // 위에서 잡은 순서는 그대로 보존된다.
    if (!holdingsReady || axis !== "all") return sorted;
    return sorted.sort((a, b) => Number(heldTickers.has(b.ticker)) - Number(heldTickers.has(a.ticker)));
  }, [axis, sort, flags, groups, heldTickers, holdingsReady]);

  const toggleTicker = useCallback((t: string) => {
    setOpenTickers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);
  const flagCounts = useMemo(() => {
    const c: Record<Flag, number> = { gated: 0, decorative: 0, noLadder: 0 };
    for (const g of groups) for (const k of flagsOf(g)) c[k] += 1;
    return c;
  }, [groups]);

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
          <span className="text-danger">트랙레코드를 불러오지 못했습니다.</span>
          <button
            onClick={load}
            className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {calls && calls.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center">
          <p className="text-sm text-body">아직 기록된 논제가 없습니다.</p>
          <p className="mt-1.5 text-xs text-mute leading-relaxed">
            <code className="font-mono text-breeze">/investment-checklist</code>,{" "}
            <code className="font-mono text-breeze">/investment-team</code>,{" "}
            <code className="font-mono text-breeze">/thesis-tracker</code>가 판정을 낼 때 콜이
            원장(<code className="font-mono">data/calls.jsonl</code>)에 기록되어 여기 나타납니다.
          </p>
        </div>
      )}

      {calls && calls.length > 0 && (
        <>
          {/* 대상 축 탭 + 일괄 펼치기 — 한 줄. 실적 캘린더의 축 탭과 같은 어휘·모양. */}
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div
              role="group"
              aria-label="추적 대상"
              className="inline-flex rounded-full bg-canvas-soft p-0.5"
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
                      active ? "bg-ink text-canvas" : "text-mute hover:text-ink"
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

            <div className="flex items-center gap-2">
              {/* 정렬 — 이 화면의 목적("어느 종목이 집행에 가까운가")을 사용자가 바꿀 수 있게. */}
              <label htmlFor="tr-sort" className="eyebrow text-[9px]">
                정렬
              </label>
              <select
                id="tr-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-h-9 cursor-pointer rounded-full bg-canvas-soft px-3 text-[11px] font-medium text-body outline-none hover:text-ink"
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <option key={k} value={k} className="bg-canvas-card text-body">
                    {SORT_LABEL[k]}
                  </option>
                ))}
              </select>
              {rows.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="min-h-9 rounded-full border border-hairline px-3 text-[11px] text-mute hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                >
                  {allOpen ? "모두 접기" : "모두 펼치기"}
                </button>
              )}
            </div>
          </div>

          {/* 상태 필터 — "지금 집행을 막고 있는 게 무엇인가"로 좁힌다. 축 탭과 다른 축이다. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(Object.keys(FLAG_LABEL) as Flag[]).map((k) => {
              const on = flags.has(k);
              const n = flagCounts[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    setFlags((prev) => {
                      const next = new Set(prev);
                      if (next.has(k)) next.delete(k);
                      else next.add(k);
                      return next;
                    })
                  }
                  aria-pressed={on}
                  disabled={n === 0}
                  title={FLAG_LABEL[k].why}
                  className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors active:scale-95 ${
                    on ? "bg-warn/20 text-warn" : "bg-canvas-soft text-mute hover:text-ink"
                  } ${n === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {FLAG_LABEL[k].label}
                  <span className={on ? "text-warn/70" : "text-mute/70"}>{n}</span>
                </button>
              );
            })}
            {flags.size > 0 && (
              <button
                type="button"
                onClick={() => setFlags(new Set())}
                className="min-h-8 rounded-full px-2.5 text-[11px] text-mute hover:text-ink"
              >
                해제
              </button>
            )}
          </div>

          {!holdingsReady && (
            <p className="mb-3 text-[11px] text-warn">
              보유 정보를 불러오지 못해 <span className="text-body">보유·관찰 분리가 비활성</span>입니다 — 전체만
              표시합니다.
            </p>
          )}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center text-xs text-mute">
              {axis === "held"
                ? "보유 종목 중 논제가 기록된 것이 없습니다."
                : "관찰 논제가 없습니다 — 기록된 논제가 전부 보유 종목입니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 items-start">
              {/* 🔴 1열 고정. 2열로 깔면 좌우 카드의 컬럼 x 위치가 달라져 세로 비교가 깨진다. */}
              {/* 컬럼 헤더 — 행마다 라벨을 반복하지 않기 위해 한 줄로 뽑는다.
                  카드의 p-4 와 같은 좌우 여백(px-4)을 줘야 컬럼이 행과 맞는다. */}
              <div className={`${ROW_GRID} hidden px-4 pb-1 md:grid`} aria-hidden="true">
                <span />
                <span className="eyebrow text-[10px]">종목</span>
                <span className="eyebrow text-[10px]">티어 · 체결확률</span>
                <span className="eyebrow text-[10px]">집행가</span>
                <span className="eyebrow text-[10px]">건강도</span>
                <span className="eyebrow text-right text-[10px]">현재가 · 전일 대비</span>
              </div>
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
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

// ── 종목 카드 ─────────────────────────────────────────────────────────────
// 카드 하나 = 종목 하나. **골격은 모든 종목이 같다**(파일 머리의 TASK-110 규칙 셋).
// 값이 없는 칸은 지우지 않고 □ 로 남긴다 — 빈칸은 화면의 결함이 아니라 원장의 결함이고,
// 보여야 채워진다(실측 2026-09-22: 살아있는 논제 16건 중 티어 1건 · 체결확률 0건 · 래더 7건).
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
  const conflict = group.conflict;
  const refresh = group.refresh;
  const refreshBySkill = useMemo(() => new Map(refresh.map((f) => [f.skill, f])), [refresh]);

  // 가격 정보는 종목 축이라 논제와 무관하게 하나다 — 대표(최신) 논제에서 가져온다.
  const lead = group.active[0];
  const priceNow = lead?.priceNow ?? null;
  const dayChange = lead?.dayChange ?? null;
  const dayChangePct = lead?.dayChangePct ?? null;
  // 실제 손익 = 현재가 vs 평단가. 콜의 수익률(시점가 기준)과는 다른 축이다.
  const plPct = avgPrice != null && priceNow != null ? ((priceNow - avgPrice) / avgPrice) * 100 : null;

  // 접힌 줄이 답해야 하는 질문은 하나다: "이 종목, 집행까지 얼마 남았나."
  // 🔴 기준가는 **대표 논제의 방향**이 정한다 — 같은 숫자라도 hold 는 내려오길 기다리는
  // 진입가고 buy/keep 은 올라가야 할 목표가라 방향이 정반대다(BAND_META).
  // 슬롯 위치는 고정하고 라벨만 바꾼다. 칸 자체는 없애지 않는다.
  const goal = useMemo(() => {
    if (!lead) return null;
    if (lead.call === "hold") {
      // 살아있는 관망 논제 중 **가장 먼저 닿는**(가장 비싼) 집행 지점.
      const tops = group.active
        .filter((c) => c.call === "hold")
        .map(entryTopPrice)
        .filter((p): p is number => p != null);
      if (tops.length === 0) return null;
      return { label: "진입까지", price: Math.max(...tops), reached: "도달", dir: "down" as const };
    }
    if (lead.call === "buy" || lead.call === "keep") {
      // 🔴 보유 종목이 접힌 줄에서 알고 싶은 것은 '목표까지 얼마'가 아니라
      // **"얼마에 더 사나"** 다(TASK-114). 증액 래더가 있으면 그 최상단 차수를 먼저 쓰고,
      // 래더가 없는 논제만 목표 상단으로 폴백한다. 둘은 방향이 정반대라 dir 로 가른다.
      const tops = group.active
        .filter((c) => c.call === "buy" || c.call === "keep")
        .map((c) => topTranchePrice(parseTranches(c.target?.tranches)))
        .filter((p): p is number => p != null);
      if (tops.length > 0) {
        return { label: "증액까지", price: Math.max(...tops), reached: "도달", dir: "down" as const };
      }
      const hi = lead.target?.high;
      return typeof hi === "number"
        ? { label: "목표까지", price: hi, reached: "달성", dir: "up" as const }
        : null;
    }
    return null; // avoid — 채점에 쓰지 않는 참고 밴드라 거리를 말하지 않는다.
  }, [lead, group.active]);

  const gapPct =
    goal != null && priceNow != null && priceNow > 0 ? ((goal.price - priceNow) / priceNow) * 100 : null;
  // 내려와야 닿는 지점(진입·증액 래더)은 gap ≥ 0 이 '도달', 올라가야 닿는 목표가는 gap ≤ 0 이 '달성'.
  const reached = gapPct != null && (goal?.dir === "down" ? gapPct >= 0 : gapPct <= 0);

  // 거리를 **막대로도** 보여준다(TASK-135). 종목이 10개를 넘으면 퍼센트 숫자만으로는
  // "어느 게 더 가까운가"를 세로로 훑어 비교하기 어렵다. 40%를 '멀다'의 기준으로 잡는다 —
  // 실제 관찰 논제의 거리가 8~34% 범위에 있어 이 안에서 차이가 드러난다.
  const NEAR_SCALE = 40;
  const nearPct =
    gapPct == null ? null : Math.max(0, Math.min(100, (1 - Math.abs(gapPct) / NEAR_SCALE) * 100));

  // 🔴 가격이 닿아도 집행하면 안 되는 차수가 몇 개인가.
  // 프로젝트 규칙: "AND 조건이 붙은 차수는 가격만 닿아도 집행하지 않는다."
  // 이게 펼쳐야만 보이면 접은 채로 훑다가 가격만 보고 오집행한다.
  // ⚠️ 데이터에 있는 건 '조건이 붙어 있다'까지다 — 충족 여부는 기록되지 않는다.
  const health = parseHealth(lead?.conviction);
  const fpRaw = lead?.target?.fillProbability;
  const fillProb = typeof fpRaw === "number" ? fpRaw : null;
  // 25% 미만이면 밴드가 실행 계획이 아니라 장식이다(CLAUDE.md 체결확률 규칙).
  const fillLow = fillProb != null && fillProb < 25;

  const gated = useMemo(() => {
    const all = group.active.flatMap((c) => pricedTranches(parseTranches(c.target?.tranches)));
    const withCond = all.filter((t) => t.condition).length;
    return all.length > 0 && withCond > 0 ? { withCond, total: all.length } : null;
  }, [group.active]);

  // 추격 금지선 초과 — **접힌 줄에서 바로 보여야 하는 단 하나의 경보**(TASK-113).
  // 이 선을 넘으면 어떤 차수도 활성화되지 않는다. 즉 '가격이 닿아도 사지 않는다'가
  // 되는데, 그 사실을 펼쳐야만 알 수 있으면(LadderChart 안에만 있었다) 접은 채로
  // 훑다가 오집행한다. 다만 화면 정보량이 이미 많아 **빨간 점 하나**로만 표기하고,
  // 자세한 내용은 툴팁으로 내린다.
  const chaseBreach = useMemo(() => {
    if (priceNow == null) return null;
    const hits = group.active
      .map((c) => ({ skill: c.skill, line: c.target?.noChaseAbove }))
      .filter((x): x is { skill: string; line: number } => typeof x.line === "number" && priceNow > x.line);
    if (hits.length === 0) return null;
    return hits.map((h) => `${h.skill} 추격금지 ${fmtPrice(h.line)} 초과 (현재 ${fmtPrice(priceNow)})`).join(NL);
  }, [group.active, priceNow]);

  return (
    <div className="rounded-2xl bg-canvas-card">
      {/* 헤더 — 누르면 펼친다. 종목 · 상태 칩 · 현재가 · 전일 대비 */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group w-full rounded-xl p-4 text-left transition-colors hover:bg-canvas-soft/40"
      >
        {/* 🔴 정렬된 컬럼으로 세운다(TASK-137). 예전엔 칩과 숫자가 좌우로 흐르는 한 줄이라
            종목마다 같은 항목이 다른 x 위치에 놓였다 — 세로로 훑어 비교할 수가 없었다. */}
        <div className={ROW_GRID}>
          <span className="flex items-center gap-2">
            <span className={`text-[9px] text-mute transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-[11px] font-bold text-body">
              {initials(group.ticker)}
            </span>
          </span>

          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-base tracking-[-0.02em] text-ink">{group.ticker}</span>
              {chaseBreach && (
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
                  role="img"
                  aria-label="추격 금지선 초과 — 전 차수 미활성"
                  title={"추격 금지선 초과 — 전 차수 미활성. 가격이 닿아도 집행하지 않는다." + NL + chaseBreach}
                />
              )}
            </span>
            <span className="flex flex-wrap items-center gap-1">
              {/* 논제 건수는 **항상** 띄운다 — 1건일 때만 사라지면 카드마다 머리 줄이 달라진다. */}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  conflict ? "bg-warn/15 text-warn" : "border border-hairline text-mute"
                }`}
                title={conflict ? conflict.reasons.join("\n") : undefined}
              >
                논제 {group.active.length}건{conflict ? " · 충돌" : ""}
              </span>
              {group.resolvedOnly && (
                <span
                  className="rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute"
                  title="살아있는 논제가 없습니다 — 채점이 끝난 마지막 판단만 남겨둡니다."
                >
                  종료
                </span>
              )}
              {refresh.length > 0 && (
                <span
                  className="rounded-full bg-twilight/20 px-1.5 py-0.5 text-[9px] font-medium text-twilight"
                  title={refresh.map((f) => `${f.skill} — ${f.reasons.join(" · ")}`).join("\n")}
                >
                  갱신 필요 {refresh.map((f) => `/${f.skill}`).join(", ")}
                </span>
              )}
            </span>
          </span>

          {/* 티어 · 체결확률 — 같은 밴드라도 티어를 모르면 할인율이 타당한지 못 본다 */}
          <span className="hidden min-w-0 items-center gap-1.5 md:flex">
            <span className="flex items-center gap-1.5">
              <TierBadge tier={lead?.tier ?? null} ticker={group.ticker} showMos={false} />
              {fillProb != null ? (
                <span
                  className={`font-mono text-[11px] ${fillLow ? "text-warn" : "text-body"}`}
                  title={fillLow ? "체결확률 25% 미만 — 밴드가 실행 계획이 아니라 장식일 수 있다." : undefined}
                >
                  {fillProb.toFixed(1)}%
                </span>
              ) : (
                <span className="font-mono text-[11px] text-mute" title="체결확률 미기록">
                  □
                </span>
              )}
            </span>
          </span>

          <span className="hidden min-w-0 md:block">
            <span className="font-mono text-[12.5px] text-body">{goal != null ? fmtPrice(goal.price) : "□"}</span>
          </span>

          <span className="hidden min-w-0 md:block">
            <span
              className={`font-mono text-[12px] ${healthTone(health)}`}
              title={
                health == null
                  ? "콜 기록에 건강도가 없습니다 — reports/track-record.md 가 정본입니다."
                  : undefined
              }
            >
              {health != null ? `${health}/10` : "□"}
            </span>
          </span>

          <span className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-base tracking-[-0.02em] text-ink">
              {priceNow != null ? fmtPrice(priceNow) : "—"}
            </span>
            <span className="flex items-center justify-end gap-1 font-mono text-[11px]">
              {dayChange != null && dayChangePct != null ? (
                <>
                  <Delta value={dayChange} format="currency" size="sm" bold={false} />
                  <span className={moveColor(dayChangePct)}>
                    ({dayChangePct >= 0 ? "+" : ""}
                    {dayChangePct.toFixed(2)}%)
                  </span>
                </>
              ) : (
                <span className="text-mute">전일 대비 —</span>
              )}
            </span>
          </span>
        </div>

        {/* 집행까지 — 게이지가 종목 간 거리를 한눈에 비교하게 한다 */}
        <div className="mt-2.5 flex items-center gap-2.5 text-[11px]">
          <span className="eyebrow shrink-0 text-[9px]">{goal?.label ?? "집행까지"}</span>
          {goal == null || gapPct == null ? (
            <span
              className="font-mono text-mute"
              title="관망 논제의 진입 래더도, 매수·보유 논제의 목표 상단도 없어 거리를 산출할 수 없습니다."
            >
              □ 미산출
            </span>
          ) : reached ? (
            <span className="font-mono text-success">
              {goal.reached} · {fmtPrice(goal.price)}
            </span>
          ) : (
            <span className="font-mono font-bold text-body">
              {gapPct >= 0 ? "+" : ""}
              {gapPct.toFixed(1)}%
            </span>
          )}
          {goal != null && nearPct != null && (
            <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-soft">
              <span
                className={`block h-full rounded-full ${reached ? "bg-success" : "bg-down"}`}
                style={{ width: `${reached ? 100 : nearPct}%` }}
              />
            </span>
          )}
          {avgPrice != null && (
            <span className="hidden shrink-0 font-mono text-[10px] text-mute sm:inline">
              매수 {fmtPrice(avgPrice)}
              {plPct != null && (
                <span className={`ml-1 ${moveColor(plPct)}`}>
                  {plPct >= 0 ? "+" : ""}
                  {plPct.toFixed(1)}%
                </span>
              )}
            </span>
          )}
          {gated && (
            <span
              className="shrink-0 rounded-full bg-warn/15 px-1.5 py-px text-[10px] font-medium text-warn"
              title={`집행 차수 ${gated.total}개 중 ${gated.withCond}개에 AND 조건이 붙어 있습니다.${NL}가격이 닿아도 조건이 충족되지 않으면 집행하지 않습니다.${NL}(충족 여부는 기록되지 않으므로 논제를 펼쳐 직접 확인하세요.)`}
            >
              조건부 {gated.withCond}/{gated.total}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* 충돌 배너 — 무엇이 갈리는지 먼저 말한다. */}
          {conflict && (
            <div className="rounded-xl border border-warn/30 bg-warn/[0.07] px-3 py-2">
              <div className="eyebrow text-[9px] text-warn mb-1">논제 충돌 {group.active.length}건</div>
              <ul className="flex flex-col gap-0.5">
                {conflict.reasons.map((r, i) => (
                  <li key={i} className="text-[11px] text-body leading-snug">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 갱신 필요 — 충돌 배너가 '무엇이 갈리는지'라면, 이건 '무엇을 다시 돌려야 하는지'다. */}
          {refresh.length > 0 && (
            <div className="mt-2 rounded-xl border border-twilight/30 bg-twilight/[0.07] px-3 py-2">
              <div className="eyebrow mb-1.5 text-[9px] text-twilight">
                다시 돌릴 스킬 {refresh.length}개
              </div>
              <ul className="flex flex-col gap-2">
                {refresh.map((f) => (
                  <li key={f.skill} className="flex flex-col gap-0.5">
                    {/* 그대로 복사해 붙이면 실행되는 한 줄 — 배너의 목적은 이 한 줄이다. */}
                    <span className="font-mono text-[12px] leading-none text-ink">
                      /{f.skill} {group.ticker}
                    </span>
                    <span className="text-[10px] leading-snug text-mute">
                      {f.date} 판단 · {f.reasons.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 논제 — **항상 세로로 쌓는다. 항상 카드 폭 전체.** 충돌이라고 2열을 차지하거나
              나란히 눕히면 래더의 가격 축이 종목마다 다른 폭으로 그려져 비교가 깨진다.
              몇 건이든 같은 규격의 블록이 N개 쌓일 뿐이다(기본이 접힘이라 길이는 문제 아님). */}
          <div className="mt-3 flex flex-col">
            {group.active.map((c, i) => (
              <div key={c.id} className={i > 0 ? "mt-4 border-t border-hairline pt-4" : ""}>
                <ThesisBlock
                  call={c}
                  avgPrice={avgPrice}
                  onOpenReport={onOpenReport}
                  refresh={refreshBySkill.get(c.skill) ?? null}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 논제 한 건(= 보고서 한 건의 결론) ────────────────────────────────────
// **모든 논제가 정확히 같은 3단 구조다**(TASK-110): 출처 줄 → 래더 그림 → 3×3 숫자 표.
// 예전에는 티어·호라이즌·체결확률이 '있는 콜만' 칩으로 붙어서 논제마다 머리 줄의 길이와
// 항목이 달랐다. 지금은 셋 다 표의 고정 칸이고, 없으면 □ 로 비어 있는 것이 보인다 —
// 안 보이는 결측과 보이는 결측은 다르다(전자는 영원히 안 채워진다).
//
// 핵심 가정·레드라인·판단 근거 산문은 보고서 원문이 정본이라 스킬 이름을 눌러 모달로 본다.
function ThesisBlock({
  call: c,
  avgPrice,
  onOpenReport,
  refresh,
}: {
  call: ScoredCall;
  avgPrice: number | null;
  onOpenReport: (path: string) => void;
  refresh: RefreshFlag | null;
}) {
  const meta = BAND_META[c.call] ?? BAND_META.buy;
  const tranches = useMemo(() => parseTranches(c.target?.tranches), [c.target?.tranches]);
  const hasLadder = useMemo(() => pricedTranches(tranches).length > 0, [tranches]);
  // 🔴 래더 결측을 지적할 대상은 **앞으로 살 계획이 있는 콜**이다 — hold(진입 대기) ·
  // buy(분할 매수) · **keep(증액)**. avoid 만 제외한다(살 생각이 없다).
  // keep 을 뺐던 이전 판은 "보유 종목엔 집행할 진입이 없다"고 봤는데, 그게 틀렸다:
  // 보유 종목에도 **추가 매수 구간**이 있고, 그게 없으면 주가가 내려와도 얼마에 얼마나
  // 살지 결정할 수 없다(TASK-114). 다만 진입과 증액은 다른 일이라 라벨을 가른다.
  const ladderExpected = c.call !== "avoid";
  const ladderNoun = c.call === "keep" ? "증액 래더" : "진입 래더";
  const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
  const cl = CALL_LABEL[c.call] ?? CALL_LABEL.hold;

  const fp = c.target?.fillProbability;
  const fpUnknown = fp === "unknown";
  const fpLow = fpUnknown || (typeof fp === "number" && fp < 25);
  const fpPlan = c.target?.lowFillPlan ? LOW_FILL_PLAN_LABEL[c.target.lowFillPlan] : null;
  // 체결확률은 **hold 에만** 의미가 있다 — 나머지 콜의 밴드는 '내려오길 기다리는 진입가'가
  // 아니라 '올라가야 할 목표가'라 하락 체결 개념이 성립하지 않는다(래더보다 좁은 범위다:
  // buy 는 분할 매수 계획이 있을 수 있지만 하락을 기다리지는 않는다).
  // 기준은 record_call.py 의 게이트1(`call == "hold"` 일 때만 체결확률 필수)과 같다.
  // 안 가르면 보유 종목에 □ 미산출이 뜨는데, 산출할 것이 애초에 없다.
  const fillExpected = c.call === "hold";

  return (
    <div className="min-w-0">
      {/* 출처 한 줄 — 어느 보고서가 낸 결론인지. 칩 구성은 모든 논제가 동일하다. */}
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
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-medium ${st.color}`}
        >
          <span className={`inline-block w-1 h-1 rounded-full ${st.dot}`} />
          {st.label}
        </span>
        {refresh && (
          <span
            className="rounded-full bg-twilight/20 px-1.5 py-px text-[9px] font-medium text-twilight"
            title={refresh.reasons.join("\n")}
          >
            갱신 필요
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

      {/* 래더가 '어느 가격에 얼마씩'이라면, 이 그림은 '그 가격에 올 법한가'를 답한다
          (TASK-136). 체결확률 숫자의 근거가 같은 화면에 있어야 한다. */}
      <PriceHistoryChart
        ticker={c.ticker}
        tranches={tranches}
        priceNow={c.priceNow}
        noChaseAbove={c.target?.noChaseAbove ?? null}
      />

      {/* 래더가 없는 논제는 그림이 밴드 눈금 두 개뿐이라 "왜 비었나"를 말해줘야 한다.
          밴드 양끝 두 숫자는 실행할 수 없다(CLAUDE.md '진입 밴드는 래더로 쓴다'). */}
      {ladderExpected && !hasLadder && (
        <p className="mt-1.5 text-[10px] leading-snug text-mute" title={TRANCHE_HOWTO}>
          {ladderNoun} <span className="text-warn">□ 미산출</span> —{" "}
          {c.call === "keep"
            ? "보유 중이어도 추가 매수 구간이 없으면 주가가 내려왔을 때 얼마에 얼마나 살지 정할 수 없다."
            : "밴드 양끝만으로는 집행할 수 없다."}{" "}
          차수·비중은 다음 검토 때 산출한다.
        </p>
      )}

      {/* 숫자 표 — **3×3 고정**. 첫 줄은 논제의 규격(티어·호라이즌·체결확률),
          가운데는 콜 시점 대비, 아래는 벤치마크 대비. 어느 종목·어느 스킬이든 9칸이 같다. */}
      <div className="mt-2.5 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-hairline bg-hairline">
        <Stat
          label="티어"
          value={c.tier ?? "□"}
          sub={
            c.tier
              ? c.requiredMosPct != null
                ? `요구 MOS ${c.requiredMosPct}%`
                : TIER_META[c.tier].mos
              : "미산출"
          }
          tone={c.tier ? "text-ink" : "text-mute"}
          title={
            c.tier
              ? `${TIER_META[c.tier].label} — ${TIER_META[c.tier].mos}`
              : `퀄리티 티어 미기록 — 요구 안전마진의 기준이 없다.\npython3 tools/quality_tier.py ${c.ticker} --moat {★}`
          }
        />
        <Stat
          label="호라이즌"
          value={c.horizonMonths != null ? `${c.horizonMonths}M` : "□"}
          sub={
            c.horizonMonths == null
              ? "미산출"
              : c.horizonProgress != null
                ? `${Math.round(c.horizonProgress * 100)}% 경과`
                : null
          }
          tone={c.horizonMonths != null ? "text-ink" : "text-mute"}
          title="이 논제가 맞다고 주장하는 기간. 지나면 채점이 확정된다."
        />
        <Stat
          label="체결확률"
          value={!fillExpected ? "—" : fp == null ? "□" : fpUnknown ? "산출불가" : `${fp}%`}
          sub={
            !fillExpected
              ? "해당 없음"
              : fp == null
                ? "미산출"
                : fpLow
                  ? fpPlan
                    ? `장식 → ${fpPlan}`
                    : "장식 밴드 · 대응 미기록"
                  : "실행 가능"
          }
          tone={!fillExpected || fp == null ? "text-mute" : fpLow ? "text-warn" : "text-ink"}
          title={
            !fillExpected
              ? "이 밴드는 내려오길 기다리는 진입가가 아니라 도달 목표가다 — 하락 체결 확률이 성립하지 않는다."
              : fp == null
                ? `밴드가 호라이즌 안에 닿을 확률 미기록 — 닿을 리 없는 밴드도 계획처럼 보인다.\npython3 tools/fill_probability.py --ticker ${c.ticker} --target ${c.target?.high ?? "{가격}"} --horizon-months ${c.horizonMonths ?? 12} --price ${c.priceAtCall}`
                : fpUnknown
                  ? "상장 이력이 짧아 베이스레이트 산출 불가 — 0%와 다르다"
                  : `콜 시점가 기준, 과거 ${c.horizonMonths ?? "?"}개월 창에서 이 낙폭이 실현된 비율 (tools/fill_probability.py)`
          }
        />

        <Stat label="시점가" value={fmtPrice(c.priceAtCall)} title="콜을 낸 날의 주가(불변 · 채점 기준)" />
        <Stat
          label="시점 대비"
          value={c.returnPct != null ? `${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}%` : "—"}
          tone={c.returnPct != null ? moveColor(c.returnPct) : "text-mute"}
          title="콜 시점가 대비 현재가"
        />
        <Stat label="경과" value={`${c.elapsedDays}d`} title="콜을 낸 날로부터 지난 일수" />

        {/* 벤치마크 대비(TASK-100) — 밴드 터치만 보면 "안 사서 잃은 것"이 안 보인다. */}
        <Stat
          label="SPY"
          value={
            c.benchmarkReturnPct != null
              ? `${c.benchmarkReturnPct >= 0 ? "+" : ""}${c.benchmarkReturnPct.toFixed(1)}%`
              : "—"
          }
          tone="text-mute"
          title="같은 기간 SPY 수익률"
        />
        <Stat
          label="초과수익"
          value={
            c.excessReturnPct != null
              ? `${c.excessReturnPct >= 0 ? "+" : ""}${c.excessReturnPct.toFixed(1)}pp`
              : "—"
          }
          tone={c.excessReturnPct != null ? moveColor(c.excessReturnPct) : "text-mute"}
          title="종목 수익률 − SPY 수익률"
        />
        <Stat
          label="기회비용"
          value={c.opportunityCostPct != null ? `${c.opportunityCostPct.toFixed(1)}pp` : "—"}
          sub={c.call === "hold" ? "기다려서 포기" : c.call === "avoid" ? "피해서 포기" : "판단 대가"}
          tone={c.opportunityCostPct != null && c.opportunityCostPct > 0 ? "text-warn" : "text-mute"}
          title="이 판단을 따랐을 때 SPY 대비 포기한 수익(0 이하는 이득)"
        />
      </div>
    </div>
  );
}

// ── 표 한 칸 ─────────────────────────────────────────────────────────────
// sub 는 값이 없어도 **자리를 비워 둔다**(nbsp) — 어떤 칸은 두 줄, 어떤 칸은 한 줄이면
// 3×3 표의 행 높이가 논제마다 달라져 카드끼리 눈으로 맞춰볼 수 없다.
function Stat({
  label,
  value,
  sub,
  tone,
  title,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: string;
  title?: string;
}) {
  return (
    <div className="bg-canvas-card px-2 py-1.5" title={title}>
      <div className="eyebrow text-[9px] mb-0.5">{label}</div>
      <div className={`font-mono text-[12px] leading-tight ${tone ?? "text-ink"}`}>{value}</div>
      <div className="font-mono text-[9px] leading-tight text-mute truncate">{sub ?? " "}</div>
    </div>
  );
}
