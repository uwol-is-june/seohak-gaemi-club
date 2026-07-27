"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useState } from "react";
import { ScoredCall, CallAggregate, CallStatus } from "@/lib/calls";
import { ReportModal } from "./ReportModal";

const CALL_LABEL: Record<string, { label: string; color: string }> = {
  buy: { label: "매수", color: "text-breeze bg-breeze/10" },
  keep: { label: "보유 유지", color: "text-twilight bg-twilight/10" },
  hold: { label: "관망", color: "text-amber-300 bg-amber-500/10" },
  avoid: { label: "회피", color: "text-mute bg-canvas-soft" },
};

const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-emerald-300 bg-emerald-500/15", dot: "bg-emerald-400" },
  빗나감: { label: "빗나감", color: "text-red-300 bg-red-500/15", dot: "bg-red-400" },
  진행중: { label: "진행중", color: "text-amber-300 bg-amber-500/15", dot: "bg-amber-400" },
  unknown: { label: "미채점", color: "text-mute bg-canvas-soft", dot: "bg-canvas-mid" },
};

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-red-400" : "text-breeze";
}

export function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [agg, setAgg] = useState<CallAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);

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

  const rate = agg?.directionHitRate;
  const pct = (v: number | null | undefined, d = 0) =>
    typeof v === "number" ? `${(v * 100).toFixed(d)}%` : "—";

  return (
    <div>
      <p className="text-sm text-mute mb-6 leading-relaxed">
        과거 매수/보유/회피 콜을 <span className="text-body">외부 실측(Yahoo 시세)</span>으로
        채점합니다. 콜 시점가는 낸 순간 박제되어 수정되지 않으며, 채점 기준은 모델이 아니라 시장입니다.
      </p>

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
          <p className="text-sm text-body">아직 기록된 콜이 없습니다.</p>
          <p className="mt-1.5 text-xs text-mute leading-relaxed">
            <code className="font-mono text-breeze">/investment-checklist</code>,{" "}
            <code className="font-mono text-breeze">/investment-team</code>,{" "}
            <code className="font-mono text-breeze">/thesis-tracker</code>가 buy/hold/avoid 판정을
            낼 때 콜이 원장(<code className="font-mono">data/calls.jsonl</code>)에 기록되어 여기 나타납니다.
          </p>
        </div>
      )}

      {calls && calls.length > 0 && agg && (
        <>
          {/* 집계 KPI 타일 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">방향 적중률</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">
                {rate != null ? pct(rate) : "—"}
              </div>
              <div className="text-[11px] text-mute mt-0.5">
                {rate != null
                  ? `${agg.directionHits}/${agg.resolvedCount} · 95% CI ${pct(agg.ci95[0])}~${pct(agg.ci95[1])}`
                  : "확정 콜 없음"}
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">확정 콜</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{agg.resolvedCount}</div>
              <div className="text-[11px] text-mute mt-0.5">horizon 경과</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">진행 중</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{agg.inProgress}</div>
              <div className="text-[11px] text-mute mt-0.5">잠정 채점</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">평균 목표 오차</div>
              <div className={`text-2xl tracking-[-0.02em] ${moveColor(agg.avgTargetErrorPct)}`}>
                {agg.avgTargetErrorPct != null
                  ? `${agg.avgTargetErrorPct >= 0 ? "+" : ""}${agg.avgTargetErrorPct.toFixed(1)}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-mute mt-0.5">현재가 vs 목표중앙</div>
            </div>
          </div>

          {/* 콜 목록 표 — 넓은 화면에서 표, 좁으면 자체 가로 스크롤 */}
          <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["종목", "콜", "콜 시점", "시점가", "현재가", "수익률", "목표", "경과", "상태", "사유"].map(
                      (h) => (
                        <th key={h} className="eyebrow text-[10px] text-mute font-normal px-3 py-2.5">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => {
                    const cl = CALL_LABEL[c.call] ?? CALL_LABEL.hold;
                    const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
                    const band =
                      c.target && (c.target.low != null || c.target.high != null)
                        ? `$${c.target.low ?? "?"}~${c.target.high ?? "?"}${
                            c.target.horizonMonths ? ` · ${c.target.horizonMonths}M` : ""
                          }`
                        : "—";
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-hairline last:border-0 hover:bg-canvas-soft/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-mono text-ink">{c.ticker}</div>
                          <div className="text-[10px] text-mute truncate max-w-[140px]">{c.skill}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cl.color}`}>
                            {cl.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{c.date}</td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceAtCall === "number" ? `$${c.priceAtCall.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceNow === "number" ? `$${c.priceNow.toFixed(2)}` : "—"}
                        </td>
                        <td className={`px-3 py-2.5 font-mono ${moveColor(c.returnPct)}`}>
                          {typeof c.returnPct === "number"
                            ? `${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{band}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">
                          {c.elapsedDays}d
                          {c.horizonProgress != null && (
                            <span className="text-mute/70"> · {Math.round(c.horizonProgress * 100)}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {c.report && (
                            <button
                              onClick={() => setModalPath(c.report!)}
                              className="ml-2 text-[11px] text-mute hover:text-ink underline underline-offset-2 transition-colors"
                            >
                              보고서
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          {c.reason ? (
                            <span className="block max-w-[280px] whitespace-normal leading-snug text-[11px] text-body">
                              {c.reason}
                            </span>
                          ) : (
                            <span className="text-[11px] text-mute">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-mute leading-relaxed">
            ※ 콜 이후 액면분할 등으로 시점가와 현재가의 기준이 달라질 수 있습니다(현재가는 분할 조정됨).
            무효화(레드라인) 조건은 재무 데이터가 필요해 자동 채점하지 않고 기록만 합니다.
          </p>
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

