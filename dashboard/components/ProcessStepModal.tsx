"use client";
import { useState } from "react";
import { type Flow } from "@/lib/flows";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { colorConfig, type ColorKey } from "@/lib/report-helpers";
import { StepCard } from "./StepCard";
import { ReportModal } from "./ReportModal";

export function ProcessStepModal({
  flow,
  stepIndex,
  onClose,
  initialInput = "",
}: {
  flow: Flow;
  stepIndex: number;
  onClose: () => void;
  // 실적 캘린더 등에서 단계를 열 때 입력칸을 미리 채운다(예: 종목 티커).
  initialInput?: string;
}) {
  useBodyScrollLock();
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const step = flow.steps[stepIndex];
  const [input, setInput] = useState(initialInput);
  const [modalPath, setModalPath] = useState<string | null>(null);
  const colors = colorConfig[flow.color as ColorKey] ?? colorConfig.brand;

  if (!step) return null;

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
          aria-label={`단계 ${stepIndex + 1}: ${step.title}`}
          tabIndex={-1}
          className="w-full max-w-2xl my-8 rounded-lg bg-canvas border border-hairline overflow-hidden focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
            <div className="eyebrow text-[10px]">STEP {stepIndex + 1} / {flow.steps.length}</div>
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
            <StepCard
              step={step}
              index={stepIndex}
              isActive
              isCompleted={false}
              input={input}
              onInputChange={setInput}
              onDone={onClose}
              onOpenReport={setModalPath}
              colors={colors}
              /* 프로세스 가이드 모달은 보유 종목 칩 선택을 쓰지 않는다 —
                 종목은 사용자가 입력창에 직접 입력. (holdings 비워 칩 숨김) */
              holdings={[]}
              doneLabel="닫기"
            />
          </div>
        </div>
      </div>
      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </>
  );
}

// 플로우 전체(모든 단계)를 모달로 보여준다. 포트폴리오 점검 탭에서 분기 카드를
// 눌렀을 때 전체화면 전환 대신 이 모달로 단계를 실행한다.
// 모든 단계를 active 카드로 펼쳐(순서 강제 없음) 필요한 단계부터 바로 복사·실행.
