"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useEffect, useState } from "react";
import { type Flow } from "@/lib/flows";
import { Holding } from "@/lib/toss";
import { fetchHoldingsShared } from "@/lib/portfolio-cache";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { colorConfig, type ColorKey } from "@/lib/report-helpers";
import { StepCard } from "./StepCard";
import { ReportModal } from "./ReportModal";

export function FlowModal({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  useBodyScrollLock();
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const [stepInputs, setStepInputs] = useState<Record<number, string>>({});
  const [modalPath, setModalPath] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const colors = colorConfig[flow.color as ColorKey] ?? colorConfig.brand;

  const needsHoldings = flow.steps.some((s) => s.holdingsPicker);
  useEffect(() => {
    if (!needsHoldings) return;
    fetchHoldingsShared()
      .then((d) => setHoldings(Array.isArray(d.holdings) ? d.holdings : []))
      .catch(() => {});
  }, [needsHoldings]);

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={flow.title}
          tabIndex={-1}
          className="w-full max-w-2xl my-8 rounded-lg bg-canvas border border-hairline overflow-hidden focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
            <div className="eyebrow text-[10px]">{flow.title}</div>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-6">
            {flow.subtitle && (
              <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
            )}
            <div className="flex flex-col gap-2">
              {flow.steps.map((step, i) => (
                <StepCard
                  key={step.title}
                  step={step}
                  index={i}
                  isActive
                  isCompleted={false}
                  input={stepInputs[i] || ""}
                  onInputChange={(val) => setStepInputs((prev) => ({ ...prev, [i]: val }))}
                  onDone={onClose}
                  onOpenReport={setModalPath}
                  colors={colors}
                  holdings={holdings}
                  doneLabel="닫기"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </>
  );
}

