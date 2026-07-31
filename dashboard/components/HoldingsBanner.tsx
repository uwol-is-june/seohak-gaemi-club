"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Holding } from "@/lib/toss";
import { fmtUsd, fmtKrw, SCREEN_GROUPS } from "@/lib/report-helpers";
import { ScoredCall } from "@/lib/calls";
import { type Ccy, CCY_STORAGE_KEY, MAX_AUTO_RELOADS, retryDelayMs, holdingsErrorText, holdingsCache, fxCache, setFxCache, persistFx, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";

// 콜 라벨/색 — 트랙레코드와 동일 어휘(예측: 매수=오른다, 관망=진입가 회귀 대기 등).
const CALL_STYLE: Record<string, { label: string; color: string }> = {
  buy: { label: "매수", color: "text-breeze bg-breeze/10" },
  keep: { label: "보유 유지", color: "text-twilight bg-twilight/10" },
  hold: { label: "관망", color: "text-amber-300 bg-amber-500/10" },
  avoid: { label: "회피", color: "text-mute bg-canvas-soft" },
};
// 콜 채점 상태 점 — 트랙레코드와 동일.
const CALL_STATUS_DOT: Record<string, string> = {
  적중: "bg-emerald-400",
  빗나감: "bg-red-400",
  진행중: "bg-amber-400",
  unknown: "bg-canvas-mid",
};

// 단일 종목 과대비중 경고 문턱(%). 넘으면 집중 리스크 신호(TASK-76).
const CONCENTRATION_WARN = 30;

// screenByCompany: 종목별 최신 열등주 스크리닝 판정(HomeView가 /api/reports에서 파생).
//   → 각 보유 카드에 "최신 콜 + 스크리닝 판정 + 목표밴드" 판단 레이어(TASK-75).
// sectorOf: 티커 → 섹터명(HomeView의 사용자 섹터 그룹 기반). 섹터 편중 위젯(TASK-76)에 쓴다.
export function HoldingsBanner({
  screenByCompany,
  sectorOf,
  reportedTickers,
  onDrill,
}: {
  screenByCompany?: Record<string, string | null>;
  sectorOf?: (ticker: string) => string;
  // 보고서가 있는 티커 집합(대문자) — 있으면 카드가 클릭 가능(TASK-77).
  reportedTickers?: Set<string>;
  // 카드 클릭 시 그 티커의 '보유 종목 보고서'로 이동(티커 축 통합).
  onDrill?: (ticker: string) => void;
}) {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  // 캐시가 있으면 즉시 표시하고 스피너를 건너뛴다(백그라운드 갱신만 수행).
  const [loading, setLoading] = useState(!(holdingsCache && holdingsCache.length > 0));
  const [ccy, setCcy] = useState<Ccy>("USD");
  const [fx, setFx] = useState<number | null>(fxCache);
  const [autoTries, setAutoTries] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  // 판단 pill용 콜 원장(TASK-75). 실패해도 보유 카드 자체는 정상 표시한다.
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);

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

  // 콜 원장 로드(판단 pill). /api/calls는 최신순 정렬이라 티커별 첫 항목이 최신 콜.
  useEffect(() => {
    fetch("/api/calls")
      .then(readJsonSafe)
      .then((d) => setCalls(Array.isArray(d.calls) ? d.calls : []))
      .catch(() => setCalls([]));
  }, []);

  const callByTicker = useMemo(() => {
    const m: Record<string, ScoredCall> = {};
    for (const c of calls ?? []) {
      const t = c.ticker.toUpperCase();
      if (!m[t]) m[t] = c; // 최신순 → 처음 만난 게 최신
    }
    return m;
  }, [calls]);

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

  // ── 집중도·섹터 편중(TASK-76) ──
  const weightPct = (h: Holding) => (total > 0 ? (h.marketValue / total) * 100 : 0);
  const topWeight = sorted.length ? weightPct(sorted[0]) : 0;
  const top3Weight = sorted.slice(0, 3).reduce((s, h) => s + weightPct(h), 0);
  const overweight = sorted.filter((h) => weightPct(h) >= CONCENTRATION_WARN);
  // 섹터별 비중 합(내림차순). sectorOf 미제공 시 빈 배열 → 섹터 바 생략.
  const sectorDist: [string, number][] = sectorOf
    ? Array.from(
        list.reduce((m, h) => {
          const s = sectorOf(h.ticker);
          m.set(s, (m.get(s) ?? 0) + weightPct(h));
          return m;
        }, new Map<string, number>())
      ).sort((a, b) => b[1] - a[1])
    : [];

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

          {/* 집중도·섹터 편중(TASK-76, 슬림): 한 줄 스트립으로 "얼마나 쏠려 있나"만
              빠르게 읽게 한다. 상세 섹터 바 대신 상위 섹터를 텍스트로 인라인 표시. */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-[11px]">
            <span className="eyebrow text-[10px] shrink-0">집중도</span>
            <span className="text-mute">
              최대{" "}
              <span className="font-mono text-ink">
                {sorted.length ? `${sorted[0].ticker} ${topWeight.toFixed(0)}%` : "—"}
              </span>
            </span>
            <span className="text-mute">
              상위3 <span className="font-mono text-ink">{top3Weight.toFixed(0)}%</span>
            </span>
            <span className="text-mute">
              종목 <span className="font-mono text-ink">{list.length}</span>
            </span>
            {sectorDist.length > 0 && (
              <span className="text-mute truncate">
                섹터{" "}
                <span className="text-body">
                  {sectorDist
                    .slice(0, 3)
                    .map(([s, w]) => `${s} ${w.toFixed(0)}%`)
                    .join(" · ")}
                </span>
              </span>
            )}
            {overweight.length > 0 && (
              <span className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-sunset-soft bg-sunset/10">
                집중 리스크 {overweight.map((h) => h.ticker).join(", ")}
              </span>
            )}
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
              // 보고서가 있는 종목만 드릴다운 가능(TASK-77).
              const canDrill = !!(onDrill && reportedTickers?.has(h.ticker.toUpperCase()));
              return (
                <div
                  key={h.ticker}
                  {...(canDrill
                    ? {
                        role: "button" as const,
                        tabIndex: 0,
                        onClick: () => onDrill!(h.ticker),
                        onKeyDown: (e: ReactKeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onDrill!(h.ticker);
                          }
                        },
                      }
                    : {})}
                  className={`group flex flex-col gap-3 rounded-lg border border-hairline bg-canvas p-4 ${
                    canDrill
                      ? "cursor-pointer hover:border-white/30 hover:bg-canvas-soft transition-colors active:scale-[0.99]"
                      : ""
                  }`}
                >
                  {/* 헤더: 티커·종목명 + 손익률 배지 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm text-ink">{h.ticker}</span>
                        {canDrill && (
                          <span className="text-[10px] text-mute opacity-0 group-hover:opacity-100 transition-opacity">
                            보고서 →
                          </span>
                        )}
                      </div>
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

                  {/* 판단 레이어(TASK-75): 최신 콜 + 스크리닝 판정 + 목표밴드.
                      실보유 숫자에 "지금 이걸 계속 들고 있어도 되나"의 판단 근거를 붙인다. */}
                  {(() => {
                    const tk = h.ticker.toUpperCase();
                    const call = callByTicker[tk] ?? null;
                    const verdict = screenByCompany?.[tk] ?? null;
                    const vGroup = verdict ? SCREEN_GROUPS.find((g) => g.match(verdict)) : null;
                    const cs = call ? CALL_STYLE[call.call] ?? CALL_STYLE.hold : null;
                    const tgt = call?.target;
                    const hasBand = !!(tgt && (tgt.low != null || tgt.high != null));
                    // 현재가의 목표밴드 대비 위치(판단 보조). 위=비쌈, 아래=쌈. USD 기준 비교.
                    const bandPos =
                      hasBand && tgt
                        ? h.currentPrice > (tgt.high ?? Infinity)
                          ? "위"
                          : h.currentPrice < (tgt.low ?? -Infinity)
                            ? "아래"
                            : "밴드내"
                        : null;
                    if (!call && !vGroup) {
                      return (
                        <div className="border-t border-hairline pt-2.5">
                          <span className="text-[10px] text-mute">분석 기록 없음</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-2.5">
                        {call && cs && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cs.color}`}
                          >
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${CALL_STATUS_DOT[call.status] ?? CALL_STATUS_DOT.unknown}`}
                            />
                            {cs.label}
                            {call.conviction ? (
                              <span className="text-[9px] opacity-80">{call.conviction}</span>
                            ) : null}
                          </span>
                        )}
                        {vGroup && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${vGroup.dot}`} />
                            <span className={vGroup.tint}>{vGroup.label}</span>
                          </span>
                        )}
                        {hasBand && tgt && (
                          <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] font-mono text-mute">
                            목표 ${tgt.low ?? "?"}~{tgt.high ?? "?"}
                            {bandPos && <span className="ml-1 text-body">· {bandPos}</span>}
                          </span>
                        )}
                      </div>
                    );
                  })()}
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
