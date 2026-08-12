"use client";
import { useId, useState } from "react";
import { ReportFile } from "@/lib/reports-store";
import { getFileBadge, getResultPill, getConfidencePill } from "@/lib/report-helpers";
import { ReportContentView } from "./ReportContentView";

// 선택한 보고서를 인라인으로 보여주는 카드(TASK-91). 헤더(배지·판정·신뢰도·파일명)를
// 누르면 본문이 접힌다 — 마크다운이 길어서, 다 읽고 위쪽 유형·일자 칩으로 돌아가려면
// 한참 스크롤해야 했다.
//
// 분야 탭의 두 자리(섹터 리서치 / 종목 보고서)가 같은 카드를 쓴다. 호출부에서
// key={file.path} 로 넘기면 다른 보고서를 고를 때 재마운트돼 펼친 상태로 시작한다 —
// 새로 고른 보고서가 접힌 채로 나오면 한 번 더 눌러야 해서.
export function CollapsibleReportCard({
  file,
  onOpenReport,
  onRequestDelete,
}: {
  file: ReportFile;
  onOpenReport: (path: string) => void;
  onRequestDelete: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const badge = getFileBadge(file.name);
  const resultPill = getResultPill(file.summary);
  const confPill = getConfidencePill(file.confidence);

  return (
    <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
      <div
        className={`flex items-center gap-1.5 px-5 py-3 ${open ? "border-b border-hairline" : ""}`}
      >
        {/* 토글은 헤더 좌측 영역 전체. 삭제 버튼은 이 밖에 둔다 — 버튼 안에 버튼을
            중첩하면 HTML 이 무효고 클릭이 서로 먹는다. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          title={open ? "본문 접기" : "본문 펼치기"}
          className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1 text-left group"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`shrink-0 text-mute group-hover:text-ink transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
          {badge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
              {badge.label}
            </span>
          )}
          {resultPill && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${resultPill.color}`}>
              {resultPill.label}
            </span>
          )}
          {confPill && (
            <span
              title="데이터 신뢰도 (투자 매력도 아님)"
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${confPill.color}`}
            >
              {confPill.label}
            </span>
          )}
          <span className="text-xs font-mono text-body truncate group-hover:text-ink transition-colors">
            {file.name}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(file.path)}
          title="이 보고서 삭제"
          className="ml-auto shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
        >
          삭제
        </button>
      </div>
      {open && (
        <div id={bodyId} className="px-6 py-5">
          <ReportContentView path={file.path} onOpenReport={onOpenReport} />
        </div>
      )}
    </div>
  );
}
