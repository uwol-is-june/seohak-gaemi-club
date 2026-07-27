"use client";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalA11y } from "@/lib/use-modal-a11y";

export function ConfirmDeleteModal({
  path,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  path: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock();
  const dialogRef = useModalA11y<HTMLDivElement>(onCancel);
  const filename = path.split("/").pop() ?? path;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="보고서 삭제 확인"
        tabIndex={-1}
        className="w-full max-w-md rounded-lg bg-canvas border border-hairline p-6 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg text-ink tracking-[-0.02em] mb-2">보고서 삭제</h3>
        <p className="text-sm text-body mb-1">이 보고서를 저장소에서 삭제합니다:</p>
        <p className="text-xs font-mono text-mute break-all mb-3">{filename}</p>
        <p className="text-xs text-mute mb-5 leading-relaxed">
          GitHub에 삭제 커밋이 생성됩니다(git 히스토리로 복구 가능). 로컬 클론은{" "}
          <span className="font-mono text-body">git pull</span>로 동기화하세요.
        </p>
        {error && <p className="text-xs text-red-300 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-hairline px-4 py-1.5 text-sm text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full border border-red-500/40 bg-red-500/10 text-red-300 px-4 py-1.5 text-sm font-medium hover:bg-red-500/20 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "삭제 중…" : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 섹터 그룹 편집 모달. 그룹 이름을 정하고, 보고서가 있는 종목을 그룹에 배정한다.
// 한 종목은 한 그룹에만 속한다(배타적): 다른 그룹의 칩을 누르면 이전 그룹에서 빠진다.
// 어느 그룹에도 없는 종목은 자동으로 '미분류'. 저장은 초안(draft)을 부모로 넘긴다.
