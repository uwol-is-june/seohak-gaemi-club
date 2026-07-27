"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useState } from "react";
import { Holding } from "@/lib/toss";
import { fmtUsd, fmtKrw } from "@/lib/report-helpers";
import { type Ccy, CCY_STORAGE_KEY, MAX_AUTO_RELOADS, retryDelayMs, holdingsErrorText, holdingsCache, fxCache, setFxCache, persistFx, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";

export function HoldingsBanner() {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  // 캐시가 있으면 즉시 표시하고 스피너를 건너뛴다(백그라운드 갱신만 수행).
  const [loading, setLoading] = useState(!(holdingsCache && holdingsCache.length > 0));
  const [ccy, setCcy] = useState<Ccy>("USD");
  const [fx, setFx] = useState<number | null>(fxCache);
  const [autoTries, setAutoTries] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);

  const load = useCallback(() => {
    // 캐시가 없을 때만 스피너를 띄우고, 캐시가 있으면 조용히 백그라운드 갱신한다.
    if (!(holdingsCache && holdingsCache.length > 0)) setLoading(true);
    setError(null);
    fetchHoldingsShared()
      .then((d) => {
        if (d.error) setError(d.error);
        setRateLimited(!!d.rateLimited);
        setIsMock(!!d.mock);
        commitHoldings(Array.isArray(d.holdings) ? d.holdings : [], setHoldings);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // localStorage 캐시는 마운트 후에만 복원한다(SSR 렌더에는 window가 없어 캐시가 비어
  // 있으므로, 렌더 중 복원하면 첫 클라이언트 렌더가 서버 HTML과 어긋나 하이드레이션이
  // 깨진다). 탭 재진입 등 재마운트 시에는 모듈 캐시가 이미 채워져 lazy 초기화로 즉시 표시.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) {
      setHoldings(holdingsCache);
      setLoading(false);
    }
    if (fxCache != null) setFx(fxCache);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 자동 재로딩: 로딩이 끝났는데 아직 안 떴으면(에러 또는 빈 목록) 잠시 후 다시 시도.
  // 정상 표시 중이거나 상한 도달 시 종료. 백오프는 retryDelayMs 참조(429는 더 길게).
  useEffect(() => {
    if (loading) return;
    const shown = (holdings?.length ?? 0) > 0;
    if (shown) return;
    if (autoTries >= MAX_AUTO_RELOADS) return;
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      load();
    }, retryDelayMs(autoTries, rateLimited));
    return () => clearTimeout(timer);
  }, [loading, holdings, error, autoTries, rateLimited, load]);

  // 저장된 통화 선호를 복원 (SSR 하이드레이션 불일치 방지 위해 마운트 후 읽음).
  useEffect(() => {
    const saved = localStorage.getItem(CCY_STORAGE_KEY);
    if (saved === "USD" || saved === "KRW") setCcy(saved);
  }, []);

  // USD→KRW 환율을 마운트 시 미리 로드해 토글이 즉시 반응하도록. 캐시가 있으면 이미
  // 값이 채워져 있고, 아래는 백그라운드 갱신(값이 바뀔 때만 교체).
  useEffect(() => {
    fetch("/api/fx")
      .then(readJsonSafe)
      .then((d) => {
        if (typeof d.rate === "number" && d.rate !== fxCache) {
          setFxCache(d.rate);
          persistFx(d.rate);
          setFx(d.rate);
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = (next: Ccy) => {
    setCcy(next);
    try {
      localStorage.setItem(CCY_STORAGE_KEY, next);
    } catch {
      // 로컬 저장 실패는 무시 (프라이빗 모드 등).
    }
  };

  // KRW 선택 && 환율 로드 완료일 때만 원화로 변환·표시. 아니면 달러 유지.
  const money = (n: number, digits = 2) =>
    ccy === "KRW" && fx != null ? fmtKrw(n * fx) : fmtUsd(n, digits);

  const list = holdings ?? [];
  const total = list.reduce((s, h) => s + h.marketValue, 0);
  const totalPL = list.reduce((s, h) => s + h.profitLoss, 0);
  const totalCost = total - totalPL;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  // 비중(평가금액) 큰 순으로 정렬해 한눈에 비교되도록.
  const sorted = [...list].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <section className="mb-10 rounded-lg border border-hairline bg-canvas-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="eyebrow text-[11px]">PORTFOLIO</h2>
          {list.length > 0 && (
            <span className="font-mono text-[11px] text-mute">{list.length}종목</span>
          )}
          {isMock && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-sunset-soft bg-sunset/10">
              목업
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="통화 선택"
            className="flex rounded-full border border-hairline bg-canvas-soft p-0.5"
          >
            {(["USD", "KRW"] as const).map((c) => {
              const active = ccy === c;
              const disabled = c === "KRW" && fx == null;
              return (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  disabled={disabled}
                  aria-pressed={active}
                  title={disabled ? "환율 불러오는 중..." : `${c}로 표시`}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors active:scale-95 ${
                    active ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  } ${disabled ? "cursor-not-allowed opacity-40 hover:text-mute" : ""}`}
                >
                  {c === "USD" ? "$ USD" : "₩ KRW"}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setAutoTries(0);
              load();
            }}
            aria-label="새로고침"
            title="새로고침"
            className="text-mute hover:text-ink transition-colors active:scale-95"
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
            className={loading ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-mute">불러오는 중...</p>}

      {!loading && error && (
        <p className="text-xs text-mute">
          {holdingsErrorText(rateLimited, autoTries < MAX_AUTO_RELOADS)}
        </p>
      )}

      {!loading && !error && list.length === 0 && (
        <p className="text-xs text-mute">
          {autoTries < MAX_AUTO_RELOADS ? "보유 정보를 불러오는 중… 자동으로 다시 시도합니다." : "보유한 해외주식이 없습니다."}
        </p>
      )}

      {!loading && list.length > 0 && (
        <>
          {/* KPI 메트릭 타일 — 총 평가금액 + 총 손익 (POSITIONS 타일 제거) */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-lg border border-hairline bg-canvas p-4">
              <div className="eyebrow text-[10px] mb-1">TOTAL VALUE</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{money(total)}</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas p-4">
              <div className="eyebrow text-[10px] mb-1">TOTAL P/L</div>
              <div className="flex items-baseline gap-2">
                {/* 정확히 0인 손익은 중립(색·부호 없음) — TASK-69 */}
                <div className={`text-2xl tracking-[-0.02em] ${totalPL > 0 ? "text-red-400" : totalPL < 0 ? "text-breeze" : "text-mute"}`}>
                  {totalPL > 0 ? "+" : ""}{money(totalPL)}
                </div>
                <div className={`text-[11px] ${totalPL > 0 ? "text-red-400" : totalPL < 0 ? "text-breeze" : "text-mute"}`}>
                  {totalPL > 0 ? "+" : ""}{totalPLPct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* 보유 종목 — 비중 큰 순. 현재가 vs 평단을 게이지로 시각화 */}
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {sorted.map((h) => {
              // 이익/손실/보합 3-상태(TASK-69): 정확히 0은 중립(색·화살표 없음).
              const dir = h.profitLoss > 0 ? 1 : h.profitLoss < 0 ? -1 : 0;
              const up = dir >= 0; // 게이지 방향(0은 폭 0이라 실질 무의미)
              const pct = h.profitLossPct;
              // 손익 게이지: 중앙=평단(break-even). ±40%를 반폭 최대치로 매핑.
              const GAUGE_CAP = 40;
              const frac = Math.min(Math.abs(pct) / GAUGE_CAP, 1);
              const weight = total > 0 ? (h.marketValue / total) * 100 : 0;
              return (
                <div
                  key={h.ticker}
                  className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas p-4"
                >
                  {/* 헤더: 티커·종목명 + 손익률 배지 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-ink">{h.ticker}</div>
                      <div className="text-[11px] text-mute truncate">{h.name}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                        dir > 0
                          ? "text-red-400 bg-red-500/10"
                          : dir < 0
                            ? "text-breeze bg-breeze/10"
                            : "text-mute bg-canvas-soft"
                      }`}
                    >
                      {dir > 0 ? "▲" : dir < 0 ? "▼" : "·"} {Math.abs(pct).toFixed(1)}%
                    </span>
                  </div>

                  {/* 현재가 vs 평단가 비교 */}
                  <div>
                    <div className="flex items-end justify-between gap-2 mb-1.5">
                      <div>
                        <div className="text-[10px] text-mute mb-0.5">현재가</div>
                        <div className="font-mono text-base leading-none text-ink">
                          {money(h.currentPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-mute mb-0.5">평단가</div>
                        <div className="font-mono text-sm leading-none text-body">
                          {money(h.avgPrice)}
                        </div>
                      </div>
                    </div>
                    {/* 게이지: 중앙 눈금=평단, 우측(red)=이익 / 좌측(breeze)=손실 */}
                    <div className="relative h-1.5 rounded-full bg-canvas-soft overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-canvas-mid" />
                      <div
                        className={`absolute inset-y-0 ${up ? "left-1/2 bg-red-400" : "right-1/2 bg-breeze"}`}
                        style={{ width: `${frac * 50}%` }}
                      />
                    </div>
                  </div>

                  {/* 푸터: 평가금액 + 수량·비중 */}
                  <div className="flex items-end justify-between gap-2 border-t border-hairline pt-2">
                    <div>
                      <div className="text-[10px] text-mute mb-0.5">평가금액</div>
                      <div className="text-sm text-ink">{money(h.marketValue)}</div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-mute">
                      {h.quantity}주 · {weight.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

// ─── DailyCheckView ──────────────────────────────────────────────────────
// 보유 종목의 '당일 등락'을 온디맨드로 조회해 /news-pulse 대상을 선별한다.
// 백그라운드 상시 감시는 로컬 전용(토스 IP 허용목록 + localhost) 제약상 불가하므로
// 버튼 트리거 방식. 당일 등락은 /api/quotes(Yahoo)에서 가져온다(holdings의
// profitLossPct는 누적 손익률이라 당일 등락이 아님).

// news-pulse 기본 탐색기간(붙여넣은 뒤 사용자가 조정 가능). 임계값 프리셋(%).
