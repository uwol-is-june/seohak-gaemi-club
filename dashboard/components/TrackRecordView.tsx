"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScoredCall, CallStatus, CallType } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import { groupTheses, type ThesisGroup } from "@/lib/thesis-groups";
import { parseTranches } from "@/lib/tranche";
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
const AXIS_DESC: Record<Axis, string> = {
  all: "논제가 기록된 모든 종목. 보유 여부와 무관하게 추적 대상 전체를 봅니다.",
  held: "포트폴리오(토스)에 실제로 있는 종목. 매수가가 래더 위에 함께 그려집니다.",
  watch: "논제만 세우고 사지 않은 종목. 관심사는 '어느 차수까지 내려왔나'입니다.",
};

export function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  // 매수가는 콜(예측)이 아니라 실제 진입가라 원장에 없다 — 포트폴리오(토스)에서 붙인다.
  // 실패해도 화면 본체는 그대로 유효하므로 조용히 무시하고 매수가만 비운다.
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [axis, setAxis] = useState<Axis>("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/calls")
      .then(readJsonSafe)
      .then((d) => {
        if (d.error) setError(d.error);
        else setCalls(Array.isArray(d.calls) ? d.calls : []);
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

      {calls && calls.length > 0 && (
        <>
          {/* 대상 축 탭 — 실제 보유 vs 아직 안 산 것. 실적 캘린더의 축 탭과 같은 어휘·모양. */}
          <div
            role="group"
            aria-label="추적 대상"
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

          <p className="text-[11px] text-mute mb-3 leading-relaxed">
            {AXIS_DESC[axis]} 종목마다 <span className="text-body">살아있는 논제</span>를 출처별로
            보여주며, 서로 어긋나면 나란히 세워 <span className="text-body">무엇이 갈리는지</span>{" "}
            표시합니다.
            {!holdingsReady && (
              <span className="text-amber-300">
                {" "}보유 정보를 불러오지 못해 <span className="text-body">보유·관찰 분리가 비활성</span>입니다 —
                전체만 표시합니다.
              </span>
            )}
          </p>

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
                  onOpenReport={setModalPath}
                />
              ))}
            </div>
          )}

          <p className="mt-4 text-[11px] text-mute leading-relaxed">
            ※ <span className="text-body">래더</span>의 차수는 &apos;어느 가격에서 얼마씩 살지&apos;를 그대로 옮긴
            것입니다 — <span className="text-body">조건이 붙은 차수는 가격만 닿아도 집행하지 않습니다</span>
            (조건 미충족 시 조건 없는 최하단 차수까지 대기). 추격금지선을 넘은 종목은 어떤 차수도
            활성화되지 않습니다.
          </p>
          <p className="mt-1.5 text-[11px] text-mute leading-relaxed">
            ※ <span className="text-body">매수가</span>는 포트폴리오(토스) 평단가입니다 — 논제는 예측이고
            매수가는 실제 진입가라 별개 축이며, 미보유 종목에는 그려지지 않습니다.{" "}
            <span className="text-body">채점</span>(적중·빗나감·진행중)과 핵심 가정·무효화 조건은 논제의{" "}
            <span className="text-body">상세</span>를 펼치면 나옵니다.
          </p>
          <p className="mt-1.5 text-[11px] text-mute leading-relaxed">
            ※ 무효화(레드라인) 조건은 재무 데이터가 필요해 자동 채점하지 않고 기록만 합니다. 콜 이후
            액면분할 등으로 기준이 달라질 수 있습니다(현재가는 분할 조정됨).
          </p>
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

// ── 종목 카드 ─────────────────────────────────────────────────────────────
// 카드 하나 = 종목 하나. 위에 가격(현재가·전일 대비·매수가), 아래에 살아있는 논제들.
// 논제가 어긋나는 카드는 두 열을 나란히 놓아야 해서 그리드 두 칸을 쓴다.
function TickerCard({
  group,
  held,
  avgPrice,
  onOpenReport,
}: {
  group: ThesisGroup;
  held: boolean;
  avgPrice: number | null;
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

  return (
    <div
      className={`rounded-lg border border-hairline bg-canvas-card p-4 ${
        conflict ? "xl:col-span-2" : ""
      }`}
    >
      {/* 헤더 — 종목 · 현재가 · 전일 대비 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
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

      {/* 매수가 — 보유 중일 때만. 평가손익을 함께 둔다(현재가 대비). */}
      {avgPrice != null && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
          <span className="eyebrow text-[9px] text-mute">매수가</span>
          <span className="font-mono text-body">{fmtPrice(avgPrice)}</span>
          {plPct != null && (
            <span className={`font-mono ${moveColor(plPct)}`}>
              {plPct >= 0 ? "+" : ""}
              {plPct.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* 충돌 배너 — 무엇이 갈리는지 먼저 말한다. */}
      {conflict && (
        <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/[0.07] px-3 py-2">
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
  const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
  const hasDetail = c.loadBearing.length > 0 || c.invalidation.length > 0 || !!c.reason;

  return (
    <div className="min-w-0">
      {/* 출처 — 어느 보고서가 낸 결론인지. 논제가 여럿일 때 이게 없으면 비교가 안 된다. */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
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
      </div>

      <LadderChart
        tranches={tranches}
        band={c.target ?? null}
        bandLabel={meta.long}
        priceNow={c.priceNow}
        avgPrice={avgPrice}
        noChaseAbove={c.target?.noChaseAbove ?? null}
      />

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

      {open && (
        <div className="mt-2 flex flex-col gap-3 border-t border-hairline pt-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-mute">
            <span>
              판정{" "}
              <span className="text-body">{(CALL_LABEL[c.call] ?? CALL_LABEL.hold).label}</span>
            </span>
            <span>
              경과 <span className="font-mono text-body">{c.elapsedDays}d</span>
              {c.horizonProgress != null && (
                <span className="text-mute/70"> · {Math.round(c.horizonProgress * 100)}%</span>
              )}
            </span>
            <span>
              시점가 <span className="font-mono text-body">{fmtPrice(c.priceAtCall)}</span>
            </span>
            {c.returnPct != null && (
              <span>
                시점 대비{" "}
                <span className={`font-mono ${moveColor(c.returnPct)}`}>
                  {c.returnPct >= 0 ? "+" : ""}
                  {c.returnPct.toFixed(1)}%
                </span>
              </span>
            )}
          </div>

          <p className="text-[10px] text-mute leading-snug">
            {meta.long} — {meta.why}
          </p>

          {c.reason && <p className="text-[11px] text-body leading-relaxed">{c.reason}</p>}

          {c.loadBearing.length > 0 && (
            <div>
              <div className="eyebrow text-[10px] text-mute mb-1.5">핵심 가정 · 참이어야 유효</div>
              <ul className="flex flex-col gap-1">
                {c.loadBearing.map((x, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-body leading-snug">
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
                  <li key={i} className="flex gap-2 text-[11px] text-body leading-snug">
                    <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasDetail && <p className="text-[11px] text-mute">기록된 핵심 가정·무효화 조건이 없습니다.</p>}
        </div>
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
