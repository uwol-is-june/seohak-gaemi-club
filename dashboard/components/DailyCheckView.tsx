"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Holding } from "@/lib/toss";
import { fmtUsd } from "@/lib/report-helpers";
import { type Quote, MAX_AUTO_RELOADS, retryDelayMs, holdingsErrorText, holdingsCache, quotesCache, hydratePortfolioCache, commitHoldings, commitQuotes, fetchHoldingsShared } from "@/lib/portfolio-cache";

const PULSE_PERIOD = "7일";
const CHECK_THRESHOLDS = [3, 5, 10];

export function DailyCheckView() {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  // 캐시가 있으면 즉시 표시하고 스피너를 건너뛴다(백그라운드 갱신만 수행).
  const [holdingsLoading, setHoldingsLoading] = useState(
    !(holdingsCache && holdingsCache.length > 0)
  );
  const [autoTries, setAutoTries] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, Quote> | null>(quotesCache);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [quoteAutoTries, setQuoteAutoTries] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [copied, setCopied] = useState<string | null>(null);
  // 캐시된 시세가 있어도 마운트당 한 번은 백그라운드로 갱신하기 위한 플래그.
  const bgRefreshed = useRef(false);

  // 등락 체크 대상이 될 보유 목록을 로드. 토스 API는 첫 호출에 비어 오는 경우가
  // 잦아(HoldingsBanner와 동일) 에러/빈 목록이면 자동으로 재시도한다.
  const loadHoldings = useCallback(() => {
    // 캐시가 없을 때만 스피너를 띄우고, 캐시가 있으면 조용히 백그라운드 갱신한다.
    if (!(holdingsCache && holdingsCache.length > 0)) setHoldingsLoading(true);
    fetchHoldingsShared()
      .then((d) => {
        setHoldingsError(d.error ?? null);
        setRateLimited(!!d.rateLimited);
        commitHoldings(Array.isArray(d.holdings) ? d.holdings : [], setHoldings);
      })
      .catch((e) => setHoldingsError(String(e)))
      .finally(() => setHoldingsLoading(false));
  }, []);

  // 캐시 복원은 마운트 후에만(렌더 중 localStorage 접근 시 하이드레이션 불일치). HoldingsBanner 참조.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) {
      setHoldings(holdingsCache);
      setHoldingsLoading(false);
    }
    if (quotesCache) setQuotes(quotesCache);
  }, []);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  // 자동 재시도: 로딩이 끝났는데 아직 안 떴으면(에러 또는 빈 목록) 잠시 후 다시.
  // 정상 표시 중이거나 상한 도달 시 종료(백오프는 retryDelayMs — 429는 더 길게).
  useEffect(() => {
    if (holdingsLoading) return;
    if ((holdings?.length ?? 0) > 0) return;
    if (autoTries >= MAX_AUTO_RELOADS) return;
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      loadHoldings();
    }, retryDelayMs(autoTries, rateLimited));
    return () => clearTimeout(timer);
  }, [holdingsLoading, holdings, holdingsError, autoTries, rateLimited, loadHoldings]);

  const runCheck = useCallback(async () => {
    if (!holdings || holdings.length === 0) return;
    setChecking(true);
    setCheckError(null);
    try {
      const tickers = holdings.map((h) => h.ticker).join(",");
      const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickers)}`);
      const d = await readJsonSafe(res);
      const map: Record<string, Quote> = {};
      // 요소 형태를 신뢰하지 않고 ticker 가 문자열인 것만 취한다(TASK-58).
      for (const q of (Array.isArray(d.quotes) ? d.quotes : []) as Quote[]) {
        if (q && typeof q.ticker === "string") map[q.ticker] = q;
      }
      commitQuotes(map, setQuotes);
    } catch {
      setCheckError("시세를 불러오지 못했습니다.");
    } finally {
      setChecking(false);
    }
  }, [holdings]);

  // 보유 목록이 뜨면 버튼 없이 당일 등락을 자동 조회한다(포트폴리오 배너처럼).
  // 캐시된 시세가 있으면 즉시 그걸 보여주되, 마운트당 한 번은 백그라운드로 갱신한다
  // (스피너로 rows를 비우지 않음). 캐시가 없으면 성공까지 백오프로 재시도(상한까지).
  useEffect(() => {
    if (!holdings || holdings.length === 0) return; // 보유 목록 먼저
    if (checking) return; // 진행 중
    if (quotes && bgRefreshed.current) return; // 이미 캐시 표시 + 백그라운드 갱신 완료
    if (!quotes && quoteAutoTries >= MAX_AUTO_RELOADS) return;
    const delay = quoteAutoTries === 0 ? 0 : Math.min(2000 * quoteAutoTries, 10000);
    const timer = setTimeout(() => {
      bgRefreshed.current = true;
      setQuoteAutoTries((n) => n + 1);
      runCheck();
    }, delay);
    return () => clearTimeout(timer);
  }, [holdings, quotes, checking, quoteAutoTries, runCheck]);

  // 수동 새로고침: quotes를 비우면 위 자동 조회 이펙트가 즉시 다시 돈다.
  const refreshCheck = useCallback(() => {
    setQuoteAutoTries(0);
    setQuotes(null);
    setCheckError(null);
  }, []);

  const copyCmd = async (ticker: string, changePct: number | null) => {
    const move =
      changePct != null ? `당일 ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%` : "";
    const cmd = `/news-pulse ${ticker} ${move} 탐색기간 ${PULSE_PERIOD}`.replace(/\s+/g, " ").trim();
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(ticker);
      setTimeout(() => setCopied((c) => (c === ticker ? null : c)), 2000);
    } catch {
      // 클립보드 API 미지원/거부 시 무시(성공 표시 안 함).
    }
  };

  // 체크 후에는 당일 등락 절대값 큰 순으로 정렬(데이터 없는 항목은 뒤로).
  const rows = (holdings ?? []).map((h) => ({ h, q: quotes?.[h.ticker] ?? null }));
  if (quotes) {
    rows.sort((a, b) => {
      const av = a.q?.changePct == null ? -Infinity : Math.abs(a.q.changePct);
      const bv = b.q?.changePct == null ? -Infinity : Math.abs(b.q.changePct);
      return bv - av;
    });
  }
  const flaggedCount = quotes
    ? rows.filter((r) => r.q?.changePct != null && Math.abs(r.q.changePct as number) >= threshold)
        .length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 컨트롤: 기준 임계값 + 체크 버튼 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-[10px]">기준</span>
          <div
            role="group"
            aria-label="급변동 기준"
            className="flex rounded-full border border-hairline bg-canvas-soft p-0.5"
          >
            {CHECK_THRESHOLDS.map((t) => {
              const active = threshold === t;
              return (
                <button
                  key={t}
                  onClick={() => setThreshold(t)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors active:scale-95 ${
                    active ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  }`}
                >
                  ±{t}%
                </button>
              );
            })}
          </div>
        </div>
        {/* 설명 툴팁 — 기준 우측 ? 아이콘 (hover/focus 시 표시) */}
        <span className="relative inline-flex group">
          <button
            type="button"
            aria-label="당일 등락 체크 설명"
            className="h-5 w-5 shrink-0 rounded-full border border-hairline flex items-center justify-center text-[11px] text-mute hover:text-ink hover:bg-canvas-soft transition-colors focus:outline-none focus:text-ink"
          >
            ?
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-hairline bg-canvas-card px-3 py-2.5 text-xs leading-relaxed text-mute opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            보유 종목의 <span className="text-body">당일 등락</span>을 조회해 급변동 종목을 선별합니다.
            기준을 넘는 종목은 <span className="font-mono text-body">/news-pulse</span> 명령을 복사해
            Claude Code에서 직접 실행하세요 (대시보드는 스킬을 대신 실행하지 않습니다).
          </span>
        </span>
        {quotes && (
          <span className="text-xs text-mute">
            기준(±{threshold}%) 초과 <span className="text-body">{flaggedCount}종목</span>
          </span>
        )}
        {/* 다시 체크 — 상단 포트폴리오 카드와 동일한 우측 새로고침 아이콘 */}
        <button
          onClick={refreshCheck}
          disabled={checking || !holdings || holdings.length === 0}
          aria-label="다시 체크"
          title="다시 체크"
          className="ml-auto text-mute hover:text-ink transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={checking ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      {/* 상태 메시지 (배너와 동일한 자동 재시도 흐름) */}
      {holdingsLoading && (holdings?.length ?? 0) === 0 && (
        <p className="text-xs text-mute">보유 정보를 불러오는 중...</p>
      )}
      {!holdingsLoading && holdingsError && (
        <p className="text-xs text-mute">
          {holdingsErrorText(rateLimited, autoTries < MAX_AUTO_RELOADS)}
        </p>
      )}
      {!holdingsLoading && !holdingsError && holdings && holdings.length === 0 && (
        <p className="text-xs text-mute">
          {autoTries < MAX_AUTO_RELOADS
            ? "보유 정보를 불러오는 중… 자동으로 다시 시도합니다."
            : "보유한 해외주식이 없습니다."}
        </p>
      )}
      {checkError && (
        <p className="text-xs text-mute">
          {checkError}
          {quoteAutoTries < MAX_AUTO_RELOADS && " 자동으로 다시 시도 중…"}
        </p>
      )}

      {/* 표 */}
      {holdings && holdings.length > 0 && (
        <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-4 py-2.5 eyebrow text-[10px]">종목</th>
                  <th className="text-right px-4 py-2.5 eyebrow text-[10px]">현재가</th>
                  <th className="text-right px-4 py-2.5 eyebrow text-[10px]">당일</th>
                  <th className="text-right px-4 py-2.5 eyebrow text-[10px]">PULSE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ h, q }) => {
                  const chg = q?.changePct ?? null;
                  const flag = chg != null && Math.abs(chg) >= threshold;
                  const up = chg != null && chg >= 0;
                  return (
                    <tr
                      key={h.ticker}
                      className={`border-b border-hairline last:border-0 ${flag ? "bg-white/[0.03]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-ink">{h.ticker}</span>
                          {flag && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium text-sunset-soft bg-sunset/10">
                              급변동
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-mute truncate max-w-[180px]">{h.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-body">
                        {q?.price != null ? fmtUsd(q.price) : quotes ? "—" : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {chg != null ? (
                          <span className={up ? "text-red-400" : "text-breeze"}>
                            {up ? "+" : ""}
                            {chg.toFixed(2)}%
                          </span>
                        ) : quotes ? (
                          <span className="text-mute">N/A</span>
                        ) : (
                          <span className="text-mute">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyCmd(h.ticker, chg)}
                          title="/news-pulse 명령 복사"
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors active:scale-95 ${
                            flag
                              ? "border-white/40 text-ink hover:bg-white hover:text-canvas"
                              : "border-hairline text-mute hover:text-ink hover:bg-canvas-soft"
                          }`}
                        >
                          {copied === h.ticker ? "복사됨" : "명령 복사"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GlossaryView ──────────────────────────────────────────────────────────
// 보고서에 자주 쓰이는 재무·투자 용어 사전. 계산식 + 해석 + 흔한 함정(⚠️)까지.
// ─── 트랙레코드 (TASK-38 Phase 3) ────────────────────────────────────────────
// 콜 원장(data/calls.jsonl)을 외부 실측(Yahoo)으로 채점한 결과를 보여준다.
// 자기신고가 아닌 외부 대조 — 시스템이 체계적으로 틀리는지 드러내는 장치.

// 콜 라벨은 '예측'을 가리킨다 — buy=오를 것, keep=들고 가도 될 것, hold=진입가로 내려올 것,
// avoid=내릴 것. keep(이미 보유)과 hold(미보유·대기)는 정반대를 예측하므로 라벨도 분리한다.
// (원장은 매매 기록이 아니라 판단 기록이다. 실보유는 포트폴리오 탭/토스 연동 소관.)
