"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallStatus, CallType, type HealthCheck } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import { groupTheses, groupGoal, groupTarget, goalGapKey, type ThesisGroup, type RefreshFlag } from "@/lib/thesis-groups";
import { parseTranches, pricedTranches } from "@/lib/tranche";
import type { Holding } from "@/lib/toss";
import { holdingsCache, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";
import { Delta } from "./primitives";
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
//   1) 카드 폭은 언제나 1열. 논제가 2건 이상이면 펼친 안에서만 **2열로 나란히**(TASK-166).
//   2) 접힌 줄은 **컬럼 고정** — 매수가 · 다음 매수가 · 현재가 · 매수까지 · 목표가 · 건강도
//      (TASK-163). 값이 없으면 칸을 지우지 않고 '미보유' · '—' · '□'로 남긴다.
//   3) 펼친 논제는 **2×3 숫자 표 고정** — 콜 시점 대비 한 줄 · 벤치마크 대비 한 줄.
//      호라이즌은 '경과' 칸 보조줄이라 결측이 □ 로 드러난다. 안 보이는 결측은 영원히 안 채워진다.
//      (티어·체결확률은 화면에서 뺐다 — TASK-159. 원장 필드·record_call 게이트·bandDrift 의
//       요구 MOS 판정은 그대로다. 숫자는 논제 파일과 원장에 있다.)

import {
  STATUS_STYLE, BAND_META, NL, TRANCHE_HOWTO, moveColor, fmtPrice,
  groupHealthDated, healthTone, initials, callHealth,
} from "./track-record/meta";

// 표시 축 — '실제 들고 있는 것'과 '아직 안 산 것'은 읽는 목적이 다르다.
// 보유는 "지금 어떻게 되고 있나", 관찰은 "언제 살 수 있나"(진입 래더까지 거리).
type Axis = "all" | "held" | "watch";

// 정렬 축. 라벨은 "무엇을 기준으로 세로로 읽을 것인가"를 그대로 말한다.
type SortKey = "gap" | "health" | "ticker";

// (상태 필터 '조건 대기'·'차수 미분할'은 뺐다 — TASK-165. 조건·래더 결측은 펼친 래더가 보여준다.)
const SORT_LABEL: Record<SortKey, string> = {
  gap: "매수까지 가까운 순",
  health: "건강도 낮은 순",
  ticker: "티커순",
};

const DISABLED_AXIS_HINT = "보유 정보를 불러오지 못해 축을 나눌 수 없습니다.";

// 🔴 헤더와 행이 **같은 그리드 템플릿**을 써야 컬럼이 맞는다.
// 한쪽만 고치면 조용히 어긋나므로 상수 하나에서 온다.
const ROW_GRID =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 md:grid-cols-[56px_minmax(0,1fr)_112px_92px_100px_120px_88px_60px]";

// refreshKey: 상단바 새로고침·창 복귀 시 HomeView 가 올린다(TASK-168). 바뀌면 원장을 다시 채점한다.
export function TrackRecordView({ refreshKey = 0 }: { refreshKey?: number } = {}) {
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
  }, [load, refreshKey]);

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
    const list =
      axis === "all" || !holdingsReady
        ? groups
        : groups.filter((g) => (axis === "held" ? heldTickers.has(g.ticker) : !heldTickers.has(g.ticker)));

    // 정렬 키를 종목당 하나 뽑는다. 값이 없는 종목은 항상 뒤로 보낸다 —
    // □(미산출)이 위에 섞이면 "가까운 순"이라는 약속이 깨진다.
    const keyOf = (g: ThesisGroup): number => {
      // 살아있는 논제가 없는 종목(resolvedOnly)은 active 가 비어 history 최신으로 폴백한다.
      const lead = g.active[0] ?? g.history[0];
      if (!lead) return Number.POSITIVE_INFINITY;
      if (sort === "ticker") return 0;
      if (sort === "health") {
        const h = groupHealthDated(g.active, g.history);
        return h?.value ?? Number.POSITIVE_INFINITY;
      }
      // gap — 집행 지점까지의 거리(절대값). 접힌 줄이 보여주는 거리와 **같은 함수**에서 온다
      // (TASK-146). 집행 지점이 아닌 목표가(래더 없는 buy/keep)·미산출은 뒤로.
      return goalGapKey(g);
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
  }, [axis, sort, groups, heldTickers, holdingsReady]);

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
                <span className="eyebrow text-[10px]">매수가</span>
                <span className="eyebrow text-[10px]">다음 매수가</span>
                <span className="eyebrow text-right text-[10px]">현재가</span>
                <span className="eyebrow text-right text-[10px]">매수까지</span>
                <span className="eyebrow text-right text-[10px]">목표가</span>
                <span className="eyebrow text-right text-[10px]">건강도</span>
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
// 보여야 채워진다(실측 2026-09-22: 살아있는 논제 16건 중 래더 7건).
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

  // 🔴 가격은 **세 칸으로 나눈다**(TASK-163) — 매수가(산 가격) · 다음 매수가(더 살 가격) ·
  // 목표가(올라가야 할 가격). 예전엔 '집행가' 한 칸에 진입가·증액가·목표가가 섞여 방향이
  // 반대인 숫자가 같은 자리에 떴다("안 샀는데 집행가가 있다"는 혼동의 원인).
  // 다음 매수가는 lib/thesis-groups.ts groupGoal — '가까운 순' 정렬(goalGapKey)과 공용이다(TASK-146).
  const goal = useMemo(() => groupGoal(group), [group]);
  const target = useMemo(() => groupTarget(group), [group]);

  const gapPct =
    goal != null && priceNow != null && priceNow > 0 ? ((goal.price - priceNow) / priceNow) * 100 : null;
  // 다음 매수가는 항상 내려와야 닿는 지점이라 gap ≥ 0 이면 도달.
  const reached = gapPct != null && gapPct >= 0;
  const goalNoun = goal?.kind === "add" ? "증액(추가 매수)" : "진입(첫 매수)";
  // (거리 막대(TASK-135)와 '조건부 N/M' 칩은 뺐다 — TASK-161·162. 정렬 '매수까지 가까운 순'이
  //  비교를, 펼친 래더가 조건 정보를 맡는다.)

  // 🔴 살아있는 논제에 건강도가 없으면 지나간 콜까지 뒤진다(날짜를 달고).
  // 예전 코드는 `active.length > 0 ? active : history` 였는데 **active 는 비는 일이 없어**
  // (채점이 다 끝나도 최신 1건을 남긴다) history 가 실제로 조회된 적이 없었다.
  const healthAt = groupHealthDated(group.active, group.history);
  const health = healthAt?.value ?? null;

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
            <span className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
              {/* 논제 건수는 **항상** 띄운다 — 1건일 때만 사라지면 카드마다 머리 줄이 달라진다. */}
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  conflict ? "bg-warn/15 text-warn" : "border border-hairline text-mute"
                }`}
                title={conflict ? conflict.reasons.join("\n") : undefined}
              >
                논제 {group.active.length}건{conflict ? " · 충돌" : ""}
              </span>
              {group.resolvedOnly && (
                <span
                  className="shrink-0 whitespace-nowrap rounded-full border border-hairline px-1.5 py-0.5 text-[9px] text-mute"
                  title="살아있는 논제가 없습니다 — 채점이 끝난 마지막 판단만 남겨둡니다."
                >
                  종료
                </span>
              )}
              {refresh.length > 0 && (
                <span
                  className="shrink-0 whitespace-nowrap rounded-full bg-twilight/20 px-1.5 py-0.5 text-[9px] font-medium text-twilight"
                  title={refresh.map((f) => `${f.skill} — ${f.reasons.join(" · ")}`).join("\n")}
                >
                  갱신 필요{refresh.length > 1 ? ` ${refresh.length}` : ""}
                </span>
              )}
            </span>
          </span>

          {/* 매수가 — 토스 평단가. 없으면 '미보유'(칸을 지우지 않는다 · TASK-110 규칙 2). */}
          <span className="hidden min-w-0 md:block">
            {avgPrice != null ? (
              <>
                <span className="block font-mono text-[12.5px] text-body">{fmtPrice(avgPrice)}</span>
                {plPct != null && (
                  <span className={`block font-mono text-[10px] ${moveColor(plPct)}`}>
                    {plPct >= 0 ? "+" : ""}
                    {plPct.toFixed(1)}%
                  </span>
                )}
              </>
            ) : (
              <span className="font-mono text-[11px] text-mute">미보유</span>
            )}
          </span>

          {/* 다음 매수가 — 미보유면 진입 1차, 보유면 증액 1차. 래더가 없으면 '—'. */}
          <span className="hidden min-w-0 md:block" title={goal != null ? `${goalNoun} 래더 1차` : undefined}>
            <span className="block font-mono text-[12.5px] text-body">{goal != null ? fmtPrice(goal.price) : "—"}</span>
            {goal != null && (
              <span className="block text-[9px] text-mute">{goal.kind === "add" ? "증액" : "진입"}</span>
            )}
          </span>

          <span className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-[15px] tracking-[-0.02em] text-ink">
              {priceNow != null ? fmtPrice(priceNow) : "—"}
            </span>
            {dayChangePct != null ? (
              <Delta value={dayChangePct} size="sm" bold={false} />
            ) : (
              <span className="font-mono text-[10.5px] text-mute">—</span>
            )}
          </span>

          {/* 매수까지 — 다음 매수가까지 **얼마나 더 떨어져야 하나**를 문장으로(TASK-160).
              부호 있는 Delta(`-12.3%` + 색)는 등락률처럼 읽혀 한 번 해석을 거쳐야 했다. */}
          <span className="hidden flex-col items-end gap-1 md:flex">
            {goal == null || gapPct == null ? (
              <span
                className="font-mono text-[12px] text-mute"
                title="진입·증액 래더가 없어 다음 매수가를 산출할 수 없습니다."
              >
                —
              </span>
            ) : reached ? (
              <span className="font-mono text-[16px] font-bold text-success">도달</span>
            ) : (
              <GapText pct={gapPct} size="lg" />
            )}
          </span>

          {/* 목표가 — 내재가치(fairValue, TASK-164) 우선, 없으면 buy/keep 의 도달 목표가.
              관망의 밴드는 진입가라 목표가로 쓰지 않는다 → 기록 전까지 '—'. */}
          <span
            className="hidden min-w-0 text-right md:block"
            title={
              target == null
                ? "목표가 미기록 — 다음 검토 때 record_call.py --fair-value 로 내재가치를 넘기세요."
                : target.source === "fairValue"
                  ? `내재가치 (${target.date} 콜)`
                  : `도달 목표가 — 원장 target.high (${target.date} 콜)`
            }
          >
            <span className="block font-mono text-[12.5px] text-body">{target != null ? fmtPrice(target.price) : "—"}</span>
            {target != null && priceNow != null && priceNow > 0 && (
              <span className="block font-mono text-[10px] text-mute">
                {target.price >= priceNow ? "+" : ""}
                {(((target.price - priceNow) / priceNow) * 100).toFixed(0)}%
              </span>
            )}
          </span>

          <span className="hidden min-w-0 text-right md:block">
            <span
              className={`font-mono text-[12px] ${healthTone(health)}`}
              title={
                health == null
                  ? `콜 기록에 건강도가 없습니다.${NL}기록: python3 tools/record_call.py --health N${NL}(정본은 reports/track-record.md 의 건강도 열)`
                  : healthAt?.stale
                    ? `${healthAt.date} 콜에 기록된 값입니다 — 가장 최근 콜은 건강도를 적지 않았습니다.${NL}그 사이 달라졌을 수 있으니 reports/track-record.md 를 확인하세요.`
                    : undefined
              }
            >
              {health != null ? `${health}/10` : "□"}
            </span>
            {/* 🔴 낡은 값은 날짜 없이 보여주면 안 된다 — 오늘 값으로 읽힌다. */}
            {healthAt?.stale && healthAt.date && (
              <span className="block font-mono text-[9px] leading-tight text-mute">
                {healthAt.date.slice(5)}
              </span>
            )}
          </span>
        </div>

        {/* 보조 줄 — **좁은 화면(md 미만)에서만**. 위 컬럼이 접히므로 매수가·매수까지를 여기서 진다.
            md 이상에서는 모든 값이 컬럼에 있어 이 줄을 없앤다(행 높이 축소 · TASK-162). */}
        <div className="mt-2.5 flex items-center gap-2.5 text-[11px] md:hidden">
          <span className="shrink-0 font-mono text-[10px] text-mute">
            {avgPrice != null ? `매수 ${fmtPrice(avgPrice)}` : "미보유"}
          </span>
          <span className="flex-1" />
          <span className="flex items-center gap-2">
            <span className="eyebrow shrink-0 text-[9px]">{goal?.kind === "add" ? "증액까지" : "매수까지"}</span>
            {goal == null || gapPct == null ? (
              <span className="font-mono text-mute">—</span>
            ) : reached ? (
              <span className="font-mono text-success">도달</span>
            ) : (
              <GapText pct={gapPct} size="sm" />
            )}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* 충돌 배너('무엇이 갈리는지')와 갱신 배너('무엇을 다시 돌려야 하는지')는
              서로 다른 축이라 **가로로 나란히** 둔다. 위아래로 쌓으면 카드 폭의 절반을
              비운 채 세로 두 칸을 먹었다. 한쪽만 있으면 flex-1 이 폭을 전부 가져가므로
              단독일 때 모양은 예전과 같다. md 미만에서는 다시 세로로 접힌다. */}
          {(conflict || refresh.length > 0) && (
            <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
              {conflict && (
                <div className="min-w-0 rounded-xl border border-warn/30 bg-warn/[0.07] px-3 py-2 md:flex-1">
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

              {refresh.length > 0 && (
                <div className="min-w-0 rounded-xl border border-twilight/30 bg-twilight/[0.07] px-3 py-2 md:flex-1">
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
            </div>
          )}

          {/* 논제 — 1건이면 카드 폭 전체, **2건 이상이면 2열로 나란히**(TASK-166).
              세로로만 쌓으면 같은 종목의 두 논제를 위아래로 스크롤하며 맞춰봐야 했다.
              3건 이상은 2열로 래핑하고, md 미만에서는 다시 세로로 쌓는다. */}
          <div className={`mt-3 grid grid-cols-1 ${group.active.length > 1 ? "md:grid-cols-2" : ""}`}>
            {group.active.map((c, i) => (
              <div
                key={c.id}
                className={[
                  "min-w-0",
                  // 모바일(세로): 둘째부터 위 구분선 · 데스크톱(2열): 첫 줄 이후만 위 구분선, 오른쪽 열은 왼쪽 구분선.
                  i > 0 ? "mt-4 border-t border-hairline pt-4" : "",
                  i === 1 ? "md:mt-0 md:border-t-0 md:pt-0" : "",
                  i % 2 === 1 ? "md:border-l md:border-hairline md:pl-4" : "md:pr-4",
                ].join(" ")}
              >
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
// 출처 줄 → 건강도 근거 → 래더 그림 → 주가 이력. 예전 2×3 숫자 표(시점가·경과·SPY·
// 초과수익·기회비용)는 서로 파생되는 값이 겹치고 판단에 쓰이지 않아 제거했다.
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

      <HealthReasons call={c} />

      <LadderChart
        tranches={tranches}
        band={c.target ?? null}
        bandLabel={meta.long}
        priceNow={c.priceNow}
        avgPrice={avgPrice}
        noChaseAbove={c.target?.noChaseAbove ?? null}
      />

      {/* 래더가 '어느 가격에 얼마씩'이라면, 이 그림은 '그 가격에 올 법한가'를 답한다
          (TASK-136). 과거 낙폭 분포를 그림으로 보여준다. */}
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
    </div>
  );
}

// ── 건강도 근거(TASK-167) ─────────────────────────────────────────────────
// "왜 N/10인가"를 조건 번호 + 충족 여부로만 보여준다. 산문 요약은 하지 않는다 —
// 근거 문장은 기록할 때 박제된 것만 쓰고, 없으면 지어내지 않고 '미기록'으로 남긴다.
const CHECK_MARK: Record<HealthCheck["status"], { mark: string; label: string; tone: string }> = {
  met: { mark: "✓", label: "충족", tone: "text-success" },
  unmet: { mark: "✕", label: "미충족", tone: "text-danger" },
  pending: { mark: "…", label: "미정", tone: "text-warn" },
};

function HealthReasons({ call: c }: { call: ScoredCall }) {
  const health = callHealth(c);
  const checks = c.healthChecks ?? [];
  if (health == null && checks.length === 0) return null;
  const met = checks.filter((k) => k.status === "met").length;
  return (
    <div className="mb-2 rounded-md border border-hairline px-2.5 py-1.5">
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="eyebrow text-[9px]">건강도</span>
        <span className={`font-mono text-[12px] ${healthTone(health)}`}>{health != null ? `${health}/10` : "□"}</span>
        {checks.length > 0 && (
          <span className="text-[10px] text-mute">
            조건 {checks.length}개 중 {met}개 충족
          </span>
        )}
      </div>
      {checks.length > 0 ? (
        <ol className="flex flex-col gap-0.5">
          {checks.map((k, i) => {
            const m = CHECK_MARK[k.status] ?? CHECK_MARK.pending;
            return (
              <li key={i} className="flex items-baseline gap-1.5 text-[11px] leading-snug">
                <span className="w-4 shrink-0 font-mono text-[10px] text-mute">{i + 1}.</span>
                <span className="min-w-0 flex-1 text-body">{k.cond}</span>
                <span className={`shrink-0 whitespace-nowrap font-mono text-[10px] ${m.tone}`}>
                  {m.mark} {m.label}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[10px] leading-snug text-mute">
          근거 미기록 — 다음 검토 때{" "}
          <code className="font-mono">--health-check &quot;조건 | 충족&quot;</code> 으로 기록합니다.
        </p>
      )}
    </div>
  );
}

// ── 매수까지 거리 ───────────────────────────────────────────────────────────
// 다음 매수가는 항상 현재가 아래라 pct 는 음수다. 부호 대신 "12.3% 하락 시"로 말한다(TASK-160).
function GapText({ pct, size }: { pct: number; size: "lg" | "sm" }) {
  const n = Math.abs(pct).toFixed(1);
  return size === "lg" ? (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="font-mono text-[16px] font-bold tracking-[-0.02em] text-ink">{n}%</span>
      <span className="text-[10.5px] text-mute">하락 시</span>
    </span>
  ) : (
    <span className="whitespace-nowrap font-mono text-body">
      {n}% <span className="text-mute">하락 시</span>
    </span>
  );
}
