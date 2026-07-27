"use client";
import { useState } from "react";
import { type FlowStep } from "@/lib/flows";
import type { Holding } from "@/lib/toss";
import { colorConfig, type ColorKey, parseTickers, toggleTicker, resolveOutputPaths } from "@/lib/report-helpers";

export function StepCard({
  step,
  index,
  isActive,
  isCompleted,
  isSkipped,
  input,
  onInputChange,
  onDone,
  onOpenReport,
  colors,
  holdings,
  doneLabel = "완료, 다음 단계로 →",
}: {
  step: FlowStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isSkipped?: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onDone: () => void;
  onOpenReport: (path: string) => void;
  colors: (typeof colorConfig)[ColorKey];
  holdings: Holding[];
  // 액티브 스텝 하단 버튼 라벨. 단일-스텝 모달에선 "닫기" 등으로 대체.
  doneLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [sectorTab, setSectorTab] = useState(0);
  const displayInput = input || step.inputPlaceholder;
  const command = step.commandTemplate.replace("{input}", displayInput);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원/거부 시: 성공으로 표시하지 않는다.
    }
  };

  if (isSkipped) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5 opacity-40">
        <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-hairline flex items-center justify-center text-xs text-mute">
          –
        </div>
        <span className="text-sm text-mute flex-1">{step.title}</span>
        <span className="text-xs text-mute">건너뜀</span>
      </div>
    );
  }

  if (isCompleted) {
    // 사용자가 값을 입력하지 않고 완료한 경우, 플레이스홀더(예: NVDA)로
    // 존재하지 않는 보고서 경로를 열지 않도록 실제 입력이 있을 때만 계산한다.
    const resolvedFiles = input.trim() ? resolveOutputPaths(step, input.trim()) : [];
    return (
      <div className="flex items-center gap-3 px-2 py-2.5">
        <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs ${colors.bg} ${colors.text}`}>
          ✓
        </div>
        <span className="text-sm text-body flex-1">{step.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <code className="text-xs text-mute font-mono truncate max-w-[160px] hidden sm:block">
            {step.commandTemplate.replace("{input}", input || step.inputPlaceholder)}
          </code>
          {resolvedFiles.length > 0 && (
            <button
              onClick={() => onOpenReport(resolvedFiles[0])}
              className="text-xs px-3 py-1 rounded-full bg-transparent border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              보기
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5 opacity-30">
        <div className="h-6 w-6 shrink-0 rounded-full border border-hairline flex items-center justify-center text-xs text-mute">
          {index + 1}
        </div>
        <span className="text-sm text-mute">{step.title}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-canvas-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-sm ${colors.bg} ${colors.text}`}>
          {index + 1}
        </div>
        <h3 className="text-[19px] text-ink tracking-[-0.02em]">{step.title}</h3>
      </div>

      <p className="text-sm text-body mb-5 leading-relaxed">{step.description}</p>

      <div className="mb-3">
        <label className="eyebrow block text-[11px] mb-1.5">{step.inputLabel}</label>
        {step.sectorPicker && (
          <div className="mb-2">
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2">
              {step.sectorPicker.groups.map((g, i) => (
                <button
                  key={g.label}
                  onClick={() => setSectorTab(i)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors active:scale-95 ${
                    sectorTab === i ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {step.sectorPicker.groups[sectorTab]?.sectors.map((sector) => (
                <button
                  key={sector}
                  onClick={() => onInputChange(sector)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors border active:scale-95 ${
                    input === sector
                      ? "bg-white text-canvas border-white"
                      : "bg-transparent text-body border-hairline hover:text-ink hover:bg-canvas-soft"
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>
        )}
        {step.holdingsPicker && holdings.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] text-mute mb-1.5">내 보유 종목 (클릭해서 추가/제거)</div>
            <div className="flex flex-wrap gap-1.5">
              {holdings.map((h) => {
                const selected = parseTickers(input).includes(h.ticker.toUpperCase());
                return (
                  <button
                    key={h.ticker}
                    type="button"
                    onClick={() => onInputChange(toggleTicker(input, h.ticker))}
                    title={h.name}
                    aria-pressed={selected}
                    className={`rounded-full px-3 py-1 text-xs transition-colors border active:scale-95 ${
                      selected
                        ? "bg-white text-canvas border-white"
                        : "bg-transparent text-body border-hairline hover:text-ink hover:bg-canvas-soft"
                    }`}
                  >
                    {selected ? "✓ " : "+ "}
                    {h.ticker}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={step.inputPlaceholder}
          className="w-full rounded-lg bg-canvas-soft border border-hairline px-3.5 py-2.5 text-sm text-ink placeholder-mute focus:outline-none focus:border-white/40 transition-colors"
        />
      </div>

      <div className="mb-4">
        <div className="eyebrow text-[11px] mb-1.5">RUN IN TERMINAL</div>
        <div className="flex items-center gap-2 rounded-lg bg-canvas-mid/40 border border-hairline px-3.5 py-2.5">
          <code className={`flex-1 text-sm font-mono ${colors.command}`}>{command}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 text-xs px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            {copied ? "복사됨 ✓" : "복사"}
          </button>
        </div>
        {step.requiresCli && (
          <p className="mt-1.5 text-xs text-sunset-soft">
            ⚠️ Claude Code CLI에서 직접 실행해야 합니다 (Agent SDK 필요 — 일반 API 호출로는 동작하지 않음)
          </p>
        )}
      </div>

      {(step.outputFiles.length > 0 || step.outputNote) && (
        <div className="mb-4 text-xs text-mute">
          <span className="text-body">생성: </span>
          {step.outputNote || step.outputFiles.map((f) => f.replace("{input}", displayInput)).join(", ")}
        </div>
      )}

      <button
        onClick={onDone}
        className={`w-full rounded-full py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${colors.button}`}
      >
        {doneLabel}
      </button>
    </div>
  );
}

// 프로세스 가이드에서 특정 단계를 눌렀을 때, 그 단계 하나의 정보만 보여주는 모달.
// 전체 플로우 맥락(진행률 바·다른 단계 카드·완료 화면)은 렌더하지 않는다.
