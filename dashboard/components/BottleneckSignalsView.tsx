"use client";
import { useEffect, useMemo, useState } from "react";
import type { ReportFile } from "@/lib/reports-store";
import {
  BOTTLENECK_BADGE,
  buildBottleneckIndex,
  isBottleneckPath,
  type BottleneckSignal,
} from "@/lib/bottleneck";
import { ReportContentView } from "./ReportContentView";

// ─── 병목 신호 (S3 /bottleneck-hunter) ─────────────────────────────────────
//
// 매일 09:00 스캔이 남긴 산출물을 한자리에 모아 본다. 이 탭의 핵심 규약은
// **"새 신호가 없으면 파일을 만들지 않는다"** 는 것 — 목록이 비어 있는 건 고장이
// 아니라 조용하다는 뜻이다(skills/bottleneck-hunter.md 5.보고서 생성 여부 결정).
//
// 다른 보고서 탭과 달리 위계가 '날짜 → 스캔'뿐이다. 종목이 아니라 시점이 축이기
// 때문 — 어제 뭐가 걸렸는지가 어느 티커인지보다 먼저 온다.

const SCAN_TIME = "09:00";

export function BottleneckSignalsView({
  files,
  loadError,
  onRetry,
  onOpenReport,
}: {
  files: ReportFile[] | null;
  loadError: boolean;
  onRetry: () => void;
  onOpenReport: (path: string) => void;
}) {
  const index = useMemo(
    () => buildBottleneckIndex((files ?? []).map((f) => f.path).filter(isBottleneckPath)),
    [files]
  );
  const [selected, setSelected] = useState<string | null>(null);

  // 목록이 로드·갱신되면 선택을 유효한 값으로 맞춘다(가장 최근 스캔이 기본 선택).
  const firstPath = index.groups[0]?.items[0]?.path ?? index.pinned[0]?.path ?? null;
  const allPathsKey = index.groups.flatMap((g) => g.items.map((i) => i.path)).join("|");
  useEffect(() => {
    setSelected((prev) => {
      if (prev && (allPathsKey.includes(prev) || index.pinned.some((p) => p.path === prev))) return prev;
      return firstPath;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPathsKey, firstPath]);

  if (!files && !loadError) return <p className="text-xs text-mute">불러오는 중...</p>;

  if (!files && loadError) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-red-300">보고서를 불러오지 못했습니다.</span>
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const hasAny = index.groups.length > 0 || index.pinned.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── 스캔 상태 + 이 탭의 읽는 법 ── */}
      <div className="rounded-lg border border-hairline bg-canvas-card p-4 sm:p-5">
        <div className="eyebrow text-[10px] text-ink mb-3">스캔 상태</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="스캔 시각" value={`매일 ${SCAN_TIME}`} hint="미국장 마감 후" />
          <Stat
            label="최근 신호"
            value={index.latestDate ?? "—"}
            hint={index.latestDate ? "마지막으로 파일이 생긴 날" : "아직 없음"}
          />
          <Stat label="누적 후보" value={String(index.candidateTickers.length)} hint="티커 기준" />
          <Stat
            label="스캔 기록"
            value={String(index.groups.reduce((n, g) => n + g.items.length, 0))}
            hint="생성된 보고서 수"
          />
        </div>
        <p className="mt-4 pt-4 border-t border-hairline text-xs text-mute leading-relaxed">
          이 스캔은 <span className="text-body">새로 발견한 것이 있을 때만 파일을 만든다</span> — 목록이
          비어 있으면 그날 공급망에 새 움직임이 없었다는 뜻이다. 파일명에 티커가 박힌 것(
          <span className="text-emerald-300">후보 발견</span>)만 밸류에이션 확인까지 통과한 심층연구
          대상이고, <span className="text-body">신호만</span>은 병목 움직임은 있으나 살 만한 상장사가
          없었던 경우다.
        </p>
        <code className="mt-3 inline-block text-xs font-mono text-breeze">
          수동 실행: /bottleneck-hunter AI 인프라
        </code>
      </div>

      {/* ── 지속 문서(병목 맵 · 관찰 목록) ── */}
      {index.pinned.length > 0 && (
        <div>
          <div className="eyebrow text-[10px] text-mute mb-2">지속 문서</div>
          <div className="flex flex-wrap gap-1.5">
            {index.pinned.map((s) => (
              <button
                key={s.path}
                onClick={() => setSelected(s.path)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors active:scale-95 ${
                  selected === s.path
                    ? "bg-white text-canvas"
                    : "border border-hairline text-body hover:text-ink hover:bg-canvas-soft"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 날짜별 스캔 기록 ── */}
      {!hasAny ? (
        <div className="rounded-lg border border-hairline bg-canvas-soft p-8 sm:p-12 text-center">
          <div className="text-base text-ink tracking-[-0.02em]">아직 기록된 신호가 없습니다</div>
          <p className="mt-2 text-xs text-mute leading-relaxed max-w-md mx-auto">
            매일 {SCAN_TIME} 스캔이 돌지만, 공급 부족·리드타임·물량배정 관련 새 움직임이 잡히지
            않으면 파일을 만들지 않습니다. 빈 목록은 정상 상태입니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {index.groups.map((g) => (
            <div key={g.date}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="eyebrow text-[10px] text-ink">{g.date}</span>
                <span className="text-[11px] text-mute">{g.items.length}건</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {g.items.map((s) => (
                  <SignalRow
                    key={s.path}
                    signal={s}
                    active={selected === s.path}
                    onSelect={() => setSelected(s.path)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 선택한 스캔 본문 ── */}
      {selected && (
        <div className="rounded-lg border border-hairline bg-canvas-card p-5 sm:p-6">
          <ReportContentView path={selected} onOpenReport={onOpenReport} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="eyebrow text-[10px] text-mute">{label}</div>
      <div className="mt-1 text-lg text-ink tracking-[-0.02em]">{value}</div>
      <div className="text-[11px] text-mute">{hint}</div>
    </div>
  );
}

function SignalRow({
  signal,
  active,
  onSelect,
}: {
  signal: BottleneckSignal;
  active: boolean;
  onSelect: () => void;
}) {
  const badge = BOTTLENECK_BADGE[signal.kind];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border px-4 py-3 transition-all active:scale-[0.99] flex items-center gap-3 ${
        active
          ? "border-white/30 bg-canvas-soft"
          : "border-hairline bg-canvas-card hover:border-white/20 hover:bg-canvas-soft"
      }`}
    >
      <span className="shrink-0 w-12 text-xs font-mono text-mute">{signal.time ?? "—"}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${badge.color}`}>{badge.label}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink tracking-[-0.01em]">{signal.label}</span>
      {signal.tickers.length > 0 && (
        <span className="shrink-0 text-[11px] text-mute">{signal.tickers.length}종목</span>
      )}
    </button>
  );
}
