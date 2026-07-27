"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useEffect, useState } from "react";
import { Holding } from "@/lib/toss";
import { holdingsCache, hydratePortfolioCache, commitHoldings, fetchHoldingsShared } from "@/lib/portfolio-cache";

interface EarningsInfo {
  ticker: string;
  date: string | null; // "YYYY-MM-DD"
  epochMs: number | null;
  estimate: boolean;
}

// 실적일 → D-day 라벨 + 정렬용 순위. 미래일수록 우선(다가오는 점검), 과거는 뒤로,
// 미상(날짜 없음)은 맨 끝. rank가 작을수록 위로 온다.
function earningsDayInfo(epochMs: number | null): {
  label: string;
  tone: string; // 색 톤 클래스
  rank: number;
} {
  if (epochMs == null) return { label: "발표일 미상", tone: "text-mute", rank: 3_000_000 };
  const dayMs = 86_400_000;
  const today = new Date();
  const todayMid = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(epochMs);
  const dMid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((dMid - todayMid) / dayMs);
  if (days > 0) {
    // 임박(7일 이내)은 sunset로 강조, 그 외는 일반 본문색.
    return { label: `D-${days}`, tone: days <= 7 ? "text-sunset-soft" : "text-body", rank: days };
  }
  if (days === 0) return { label: "오늘 발표", tone: "text-sunset", rank: -1 };
  // 지난 실적: 점검 대기/완료 대상. 최근일수록 위(-days가 작을수록 위)로.
  return { label: `${-days}일 전`, tone: "text-mute", rank: 1_000_000 + -days };
}

export function EarningsCalendar({ onAnalyze }: { onAnalyze: (ticker: string) => void }) {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [earnings, setEarnings] = useState<Record<string, EarningsInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 보유 티커가 정해지면 실적일 조회.
  useEffect(() => {
    const list = holdings ?? [];
    if (list.length === 0) return;
    setLoading(true);
    setError(null);
    const tickers = list.map((h) => h.ticker).join(",");
    fetch(`/api/earnings-calendar?tickers=${encodeURIComponent(tickers)}`)
      .then(readJsonSafe)
      .then((d) => {
        const map: Record<string, EarningsInfo> = {};
        // 요소 형태를 신뢰하지 않고 ticker 가 문자열인 것만 취한다(TASK-58).
        for (const e of (Array.isArray(d.earnings) ? d.earnings : []) as EarningsInfo[]) {
          if (e && typeof e.ticker === "string") map[e.ticker.toUpperCase()] = e;
        }
        setEarnings(map);
      })
      .catch(() => setError("실적 일정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [holdings]);

  const list = holdings ?? [];
  // 실적일 순위로 정렬(다가오는 순 → 과거 → 미상).
  const rows = [...list]
    .map((h) => {
      const e = earnings?.[h.ticker.toUpperCase()];
      return { h, e, day: earningsDayInfo(e?.epochMs ?? null) };
    })
    .sort((a, b) => a.day.rank - b.day.rank);

  return (
    <section className="mb-8 rounded-lg border border-hairline bg-canvas-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="eyebrow text-[11px]">실적 캘린더</h2>
        {loading && <span className="text-[11px] text-mute">불러오는 중…</span>}
      </div>
      <p className="text-xs text-mute mb-4 leading-relaxed">
        보유 종목의 다가오는 실적 발표일. 발표 직후 아래 프로세스로 점검하세요.
        <span className="text-mute/70"> 날짜는 Yahoo 추정치로, 확정 전엔 바뀔 수 있습니다.</span>
      </p>

      {list.length === 0 ? (
        <p className="text-xs text-mute">
          {error ?? "보유 종목을 불러오는 중이거나, 표시할 보유 종목이 없습니다."}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-hairline">
          {rows.map(({ h, e, day }) => (
            <div key={h.ticker} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">{h.ticker}</span>
                  <span className="text-xs text-mute truncate">{h.name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-mute">{e?.date ?? "—"}</span>
                  {e?.estimate && e.date && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] text-mute bg-canvas-soft">
                      추정
                    </span>
                  )}
                </div>
              </div>
              <span className={`shrink-0 font-mono text-xs ${day.tone}`}>{day.label}</span>
              <button
                onClick={() => onAnalyze(h.ticker)}
                className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
              >
                분석
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

