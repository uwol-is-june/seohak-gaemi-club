"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Holding } from "@/lib/toss";
import { ScoredCall } from "@/lib/calls";
import { CALL_LABEL } from "@/lib/report-helpers";
import { holdingsCache, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";
import { earningsDayInfo, earningsReviewedAt, EarningsInfo, REVIEW_WINDOW_DAYS } from "@/lib/earnings-day";
import type { ReportFile } from "@/lib/reports-store";

// /api/earnings-calendar 의 티커 상한(MAX_TICKERS)과 같은 값. 트랙레코드 전체는
// 보유 목록보다 커질 수 있어 이 크기로 잘라 여러 번 요청한다(초과분이 조용히 버려지지 않게).
const TICKERS_PER_REQUEST = 50;

// 실적 캘린더의 대상 축. holdings=실제 보유(토스), calls=콜 원장에 판단이 기록된 전 종목.
// 후자는 미보유 관망(hold)·회피(avoid)까지 포함한다 — 논제를 세워둔 종목의 실적도
// 점검해야 진입/폐기 판단이 갱신되기 때문이다.
type Axis = "holdings" | "calls";

export function EarningsCalendar({
  onAnalyze,
  files,
}: {
  onAnalyze: (ticker: string) => void;
  // 보고서 목록(상위가 이미 /api/reports 로 받아 둔 것). 여기서는 "이 실적을 이미
  // 점검했는가"만 본다 — 없으면(null) 전부 미점검으로 두고 배지만 안 뜬다.
  files: ReportFile[] | null;
}) {
  const [axis, setAxis] = useState<Axis>("holdings");
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Record<string, EarningsInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 이미 실적일을 요청한 티커 — 탭을 왕복할 때 같은 티커를 다시 조회하지 않는다.
  const requested = useRef<Set<string>>(new Set());

  // 보유 목록 로드(캐시 우선). 토스가 첫 호출에 비어 오면 상위 배너/당일체크의
  // 재시도가 캐시를 채우므로, 여기선 캐시를 우선 쓰고 한 번만 직접 조회한다.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) setHoldings(holdingsCache);
    fetchHoldingsShared()
      .then((d) => {
        const list = Array.isArray(d.holdings) ? (d.holdings as Holding[]) : [];
        commitHoldings(list, setHoldings);
      })
      .catch(() => {});
  }, []);

  // 콜 원장은 '트랙레코드 전체' 탭을 처음 열 때만 불러온다 — /api/calls 는 티커마다
  // Yahoo 시세를 실측하므로 보지도 않을 탭 때문에 미리 돌릴 이유가 없다.
  useEffect(() => {
    if (axis !== "calls" || calls || callsLoading) return;
    setCallsLoading(true);
    setCallsError(null);
    fetch("/api/calls")
      .then(readJsonSafe)
      .then((d) => {
        if (d.error) setCallsError(String(d.error));
        else setCalls(Array.isArray(d.calls) ? (d.calls as ScoredCall[]) : []);
      })
      .catch(() => setCallsError("트랙레코드를 불러오지 못했습니다."))
      .finally(() => setCallsLoading(false));
  }, [axis, calls, callsLoading]);

  // 아직 조회하지 않은 티커의 실적일만 가져와 기존 맵에 합친다.
  const loadEarnings = useCallback((tickers: string[]) => {
    const need = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)))
      .filter((t) => !requested.current.has(t));
    if (need.length === 0) return;
    need.forEach((t) => requested.current.add(t));
    const chunks: string[][] = [];
    for (let i = 0; i < need.length; i += TICKERS_PER_REQUEST) {
      chunks.push(need.slice(i, i + TICKERS_PER_REQUEST));
    }
    setLoading(true);
    setError(null);
    Promise.all(
      chunks.map((ch) =>
        fetch(`/api/earnings-calendar?tickers=${encodeURIComponent(ch.join(","))}`).then(readJsonSafe)
      )
    )
      .then((results) => {
        setEarnings((prev) => {
          const map = { ...prev };
          for (const d of results) {
            // 요소 형태를 신뢰하지 않고 ticker 가 문자열인 것만 취한다(TASK-58).
            for (const e of (Array.isArray(d.earnings) ? d.earnings : []) as EarningsInfo[]) {
              if (e && typeof e.ticker === "string") map[e.ticker.toUpperCase()] = e;
            }
          }
          return map;
        });
      })
      .catch(() => {
        // 실패한 티커는 요청 기록에서 지워 다음 탭 전환/재마운트 때 재시도되게 한다.
        need.forEach((t) => requested.current.delete(t));
        setError("실적 일정을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const list = holdings ?? [];
    if (list.length > 0) loadEarnings(list.map((h) => h.ticker));
  }, [holdings, loadEarnings]);

  // 종목당 최신 콜 1건 — 캘린더의 관심사는 "이 종목의 현재 판단"이고, 콜 이력은
  // 트랙레코드 탭 소관이다. calls는 API에서 최신순 정렬돼 오므로 티커별 첫 항목이 최신.
  const latestCalls = useMemo(() => {
    const seen = new Map<string, ScoredCall>();
    for (const c of calls ?? []) if (!seen.has(c.ticker)) seen.set(c.ticker, c);
    return Array.from(seen.values());
  }, [calls]);

  useEffect(() => {
    if (axis !== "calls") return;
    if (latestCalls.length > 0) loadEarnings(latestCalls.map((c) => c.ticker));
  }, [axis, latestCalls, loadEarnings]);

  const heldTickers = useMemo(
    () => new Set((holdings ?? []).map((h) => h.ticker.trim().toUpperCase())),
    [holdings]
  );
  const nameByTicker = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of holdings ?? []) m.set(h.ticker.trim().toUpperCase(), h.name);
    return m;
  }, [holdings]);

  // 티커 → 가장 최근 실적 보고서 발행 시각. 발표일 이후면 '점검 완료'로 내려간다.
  const reviewedAt = useMemo(() => earningsReviewedAt(files ?? []), [files]);

  // 두 축을 같은 행 모양으로 정규화한다(정렬·렌더 로직 공유).
  const rows = useMemo(() => {
    const build = (ticker: string, sub: string, call: ScoredCall | null) => {
      const key = ticker.trim().toUpperCase();
      const e = earnings[key];
      return { key, ticker, sub, call, day: earningsDayInfo(e, new Date(), reviewedAt[key] ?? null) };
    };
    const list =
      axis === "holdings"
        ? (holdings ?? []).map((h) => build(h.ticker, h.name, null))
        : latestCalls.map((c) =>
            build(c.ticker, nameByTicker.get(c.ticker.trim().toUpperCase()) ?? c.skill, c)
          );
    return list.sort((a, b) => a.day.rank - b.day.rank);
  }, [axis, holdings, latestCalls, earnings, nameByTicker, reviewedAt]);

  const AXES: { id: Axis; label: string; count: number | null }[] = [
    { id: "holdings", label: "보유 종목", count: holdings?.length ?? null },
    { id: "calls", label: "트랙레코드 전체", count: calls ? latestCalls.length : null },
  ];

  // 축별 빈 상태 문구 — "왜 비었는지"가 다르다(보유 없음 vs 콜 원장 비어 있음).
  const emptyText =
    axis === "holdings"
      ? error ?? "보유 종목을 불러오는 중이거나, 표시할 보유 종목이 없습니다."
      : callsError ??
        error ??
        (callsLoading || !calls
          ? "트랙레코드를 불러오는 중…"
          : "트랙레코드에 기록된 콜이 없습니다.");

  // 표 아래 에러 배너 문구 — emptyText 와 **같은 축 게이팅 규칙**을 쓴다.
  // callsError 는 축을 'calls' 밖으로 옮겨도 초기화되지 않으므로(로드 effect가 조기 반환),
  // 축으로 거르지 않으면 '트랙레코드 전체' 탭의 낡은 에러가 '보유 종목' 탭에 새어 나온다.
  const bannerError = axis === "calls" ? callsError ?? error : error;

  return (
    <section className="mb-8 rounded-lg border border-hairline bg-canvas-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="eyebrow text-[11px]">실적 캘린더</h2>
        {(loading || (axis === "calls" && callsLoading)) && (
          <span className="text-[11px] text-mute">불러오는 중…</span>
        )}
      </div>
      <p className="text-xs text-mute mb-4 leading-relaxed">
        {axis === "holdings"
          ? "보유 종목의 실적 발표일. 발표 직후 아래 프로세스로 점검하세요."
          : "콜 원장에 판단이 기록된 전 종목의 실적 발표일. 미보유 관망·회피 종목도 실적으로 논제가 갱신됩니다."}
        <span className="text-mute/70">
          {" "}
          발표 후 {REVIEW_WINDOW_DAYS}일간은 D+로 맨 위에 남고, 그 사이 실적 보고서를 쓰면
          &lsquo;점검 완료&rsquo;로 내려갑니다. 다가오는 날짜는 Yahoo 추정치로, 확정 전엔 바뀔 수 있습니다.
        </span>
      </p>

      {/* 대상 축 탭 — 보유(토스) vs 트랙레코드 전체(콜 원장) */}
      <div
        role="group"
        aria-label="실적 캘린더 대상"
        className="mb-4 inline-flex rounded-full border border-hairline bg-canvas-soft p-0.5"
      >
        {AXES.map((a) => {
          const active = axis === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAxis(a.id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors active:scale-95 ${
                active ? "bg-white text-canvas" : "text-mute hover:text-ink"
              }`}
            >
              {a.label}
              {a.count != null && (
                <span className={active ? "text-canvas/60" : "text-mute/70"}>{a.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-mute">{emptyText}</p>
      ) : (
        <div className="flex flex-col divide-y divide-hairline">
          {rows.map(({ key, ticker, sub, call, day }) => {
            const cl = call ? CALL_LABEL[call.call] ?? CALL_LABEL.hold : null;
            return (
              <div key={key} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-ink">{ticker}</span>
                    {/* 콜 축에서는 '무슨 판단이 걸린 종목인지'가 실적 점검의 맥락이다. */}
                    {cl && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cl.color}`}
                      >
                        {cl.label}
                      </span>
                    )}
                    {axis === "calls" && heldTickers.has(key) && (
                      <span className="shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-mute">
                        보유
                      </span>
                    )}
                    {/* 발표가 끝난 종목은 "지금 할 일"이라 라벨을 붙여 임박(D-)과 구분한다.
                        이미 실적 보고서를 쓴 건은 할 일이 없으므로 조용한 '점검 완료'로 바꾼다. */}
                    {day.reviewDue && (
                      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-sunset-soft bg-sunset/10">
                        점검 대기
                      </span>
                    )}
                    {day.reviewed && (
                      <span className="shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-mute">
                        점검 완료
                      </span>
                    )}
                    <span className="text-xs text-mute truncate">{sub}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span className="font-mono text-mute">{day.shownDate ?? "—"}</span>
                    {day.shownEstimate && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] text-mute bg-canvas-soft">
                        추정
                      </span>
                    )}
                    {/* 지난 실적을 앞세운 행은 다음 예정일이 가려지므로 함께 보여준다. */}
                    {day.nextDate && (
                      <span className="text-mute/70">
                        다음 <span className="font-mono">{day.nextDate}</span>
                      </span>
                    )}
                    {call && (
                      <span className="text-mute/70">
                        콜 <span className="font-mono">{call.date}</span>
                      </span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 font-mono text-xs ${day.tone}`}>{day.label}</span>
                <button
                  onClick={() => onAnalyze(ticker)}
                  className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                >
                  분석
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 행이 있는데도 실패한 경우(일부 티커만 실적일 조회 실패)는 표 아래에 알린다. */}
      {rows.length > 0 && bannerError && (
        <p className="mt-3 text-[11px] text-mute">{bannerError}</p>
      )}
    </section>
  );
}
