"use client";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { getFileBadge } from "@/lib/report-helpers";
import { ReportContentView } from "./ReportContentView";

export function ReportModal({
  path,
  onClose,
  onRequestDelete,
}: {
  path: string;
  onClose: () => void;
  onRequestDelete?: (path: string) => void;
}) {
  useBodyScrollLock();
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const filename = path.split("/").pop() ?? path;
  const badge = getFileBadge(filename);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`보고서: ${filename}`}
        tabIndex={-1}
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-lg bg-canvas border border-hairline overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline shrink-0 bg-canvas/80 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-sm font-mono text-body truncate">{filename}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onRequestDelete && (
              <button
                type="button"
                onClick={() => onRequestDelete(path)}
                title="이 보고서 삭제"
                className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
              >
                삭제
              </button>
            )}
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="h-9 w-9 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto scroll-slim flex-1 px-8 py-7">
          <ReportContentView path={path} />
        </div>
      </div>
    </div>
  );
}

// ─── Components ────────────────────────────────────────────────────────────

