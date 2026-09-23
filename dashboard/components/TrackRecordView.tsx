"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallStatus, CallType } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import { groupTheses, entryTopPrice, type ThesisGroup, type RefreshFlag } from "@/lib/thesis-groups";
import { parseTranches, pricedTranches, topTranchePrice } from "@/lib/tranche";
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
//      지우지 않고 '미보유' · '⬛ 미산출'로 남긴다.
//   3) 펼친 논제는 **3×3 숫자 표 고정** — 티어·호라이즌·체결확률까지 표의 칸이라
//      결측이 빈칸으로 드러난다. 안 보이는 결측은 영원히 안 채워진다.

const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-success bg-success/15", dot: "bg-success" },
  빗나감: { label: "빗나감", color: "text-danger bg-danger/15", dot: "bg-danger" },
  진행중: { label: "진행중", color: "text-warn bg-warn/15", dot: "bg-warn" },
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

// 래더가 비어 있을 때 띄우는 산출 방법. 화면이 결측을 지적만 하고 "그래서 뭘 치면 되나"를
// 안 알려주면 빈칸은 영원히 빈칸으로 남는다.
// 툴팁 줄바꿈. title 속성은 개행을 그대로 렌더하지만, 소스에 이스케이프를 흩어 두면
// 편집할 때마다 깨져서 상수로 뽑아 쓴다.
const NL = String.fromCharCode(10);

const TRANCHE_HOWTO =
  'python3 tools/record_call.py ... --tranche "1차 ≤$X (25%) — AND 조건" "2차 ≤$Y (35%)" ... --no-chase Z';

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-up" : "text-down";
}

function fmtPrice(v: number): string {
  return `$${v.toFixed(2)}`;
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
    const list =
      axis === "all" || !holdingsReady
        ? groups
        : groups.filter((g) => (axis === "held" ? heldTickers.has(g.ticker) : !heldTickers.has(g.ticker)));
    // 보유 정보가 없으면 가를 기준 자체가 없다 — 원래 순서를 건드리지 않는다.
    if (!holdingsReady) return list;
    // Array#sort 는 안정 정렬이라 보유 여부만 비교하면 나머지 순서는 보존된다.
    // groups 를 직접 정렬하면 useMemo 가 쥔 배열을 훼손하므로 반드시 복사본을 정렬한다.
    return [...list].sort(
      (a, b) => Number(heldTickers.has(b.ticker)) - Number(heldTickers.has(a.ticker))
    );
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
            <p className="mb-3 text-[11px] text-warn">
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
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

// ── 종목 카드 ─────────────────────────────────────────────────────────────
// 카드 하나 = 종목 하나. **골격은 모든 종목이 같다**(파일 머리의 TASK-110 규칙 셋).
// 값이 없는 칸은 지우지 않고 ⬛ 로 남긴다 — 빈칸은 화면의 결함이 아니라 원장의 결함이고,
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
    <div className="rounded-lg border border-hairline bg-canvas-card">
      {/* 헤더 — 누르면 펼친다. 종목 · 상태 칩 · 현재가 · 전일 대비 */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group w-full rounded-lg p-4 text-left transition-colors hover:bg-canvas-soft/40"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] text-mute transition-transform ${open ? "rotate-90" : ""}`}>
              ▶
            </span>
            <span className="font-mono text-ink text-base tracking-[-0.02em]">{group.ticker}</span>
            {chaseBreach && (
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
                role="img"
                aria-label="추격 금지선 초과 — 전 차수 미활성"
                title={"추격 금지선 초과 — 전 차수 미활성. 가격이 닿아도 집행하지 않는다." + NL + chaseBreach}
              />
            )}
            {/* 논제 건수는 **항상** 띄운다 — 1건일 때만 칩이 사라지면 카드마다 머리 줄이 달라진다. */}
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
            {/* 갱신 필요 — 접힌 줄에서도 "어느 스킬을 다시 돌려야 하나"가 보여야 한다. */}
            {refresh.length > 0 && (
              <span
                className="rounded-full bg-twilight/20 px-1.5 py-0.5 text-[9px] font-medium text-twilight"
                title={refresh.map((f) => `${f.skill} — ${f.reasons.join(" · ")}`).join("\n")}
              >
                갱신 필요 {refresh.map((f) => `/${f.skill}`).join(", ")}
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

        {/* 요약 — 접힌 채로 훑을 때 필요한 두 슬롯. **항상 두 칸 다 그린다**(빈 값은 ⬛/미보유). */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 text-[11px]">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="eyebrow text-[9px] shrink-0">매수가</span>
            {avgPrice != null ? (
              <>
                <span className="font-mono text-body">{fmtPrice(avgPrice)}</span>
                {plPct != null && (
                  <span className={`font-mono ${moveColor(plPct)}`}>
                    {plPct >= 0 ? "+" : ""}
                    {plPct.toFixed(1)}%
                  </span>
                )}
              </>
            ) : (
              <span className="font-mono text-mute">{held ? "—" : "미보유"}</span>
            )}
          </span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="eyebrow text-[9px] shrink-0">{goal?.label ?? "집행까지"}</span>
            {goal == null || gapPct == null ? (
              <span
                className="font-mono text-mute"
                title="관망 논제의 진입 래더도, 매수·보유 논제의 목표 상단도 없어 거리를 산출할 수 없습니다."
              >
                ⬛ 미산출
              </span>
            ) : reached ? (
              <span className="font-mono text-success truncate">
                {goal.reached} · {fmtPrice(goal.price)}
              </span>
            ) : (
              <>
                <span className="font-mono text-body">
                  {gapPct >= 0 ? "+" : ""}
                  {gapPct.toFixed(1)}%
                </span>
                <span className="font-mono text-[10px] text-mute truncate">→ {fmtPrice(goal.price)}</span>
              </>
            )}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* 충돌 배너 — 무엇이 갈리는지 먼저 말한다. */}
          {conflict && (
            <div className="rounded-lg border border-warn/30 bg-warn/[0.07] px-3 py-2">
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
            <div className="mt-2 rounded-lg border border-twilight/30 bg-twilight/[0.07] px-3 py-2">
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
// 항목이 달랐다. 지금은 셋 다 표의 고정 칸이고, 없으면 ⬛ 로 비어 있는 것이 보인다 —
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
  // 안 가르면 보유 종목에 ⬛ 미산출이 뜨는데, 산출할 것이 애초에 없다.
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

      {/* 래더가 없는 논제는 그림이 밴드 눈금 두 개뿐이라 "왜 비었나"를 말해줘야 한다.
          밴드 양끝 두 숫자는 실행할 수 없다(CLAUDE.md '진입 밴드는 래더로 쓴다'). */}
      {ladderExpected && !hasLadder && (
        <p className="mt-1.5 text-[10px] leading-snug text-mute" title={TRANCHE_HOWTO}>
          {ladderNoun} <span className="text-warn">⬛ 미산출</span> —{" "}
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
          value={c.tier ?? "⬛"}
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
          value={c.horizonMonths != null ? `${c.horizonMonths}M` : "⬛"}
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
          value={!fillExpected ? "—" : fp == null ? "⬛" : fpUnknown ? "산출불가" : `${fp}%`}
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
