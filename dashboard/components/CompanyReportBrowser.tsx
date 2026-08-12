"use client";
import { useEffect, useMemo, useState } from "react";
import { ReportFile } from "@/lib/reports-store";
import {
  sortCompanyFiles,
  getReportCategory,
  REPORT_SECTIONS,
  SCREEN_GROUPS,
  reportDateLabel,
} from "@/lib/report-helpers";
import { CollapsibleReportCard } from "./CollapsibleReportCard";

// 한 종목의 보고서 브라우저: 유형(1차) → 생성일자(2차) → 선택 보고서 카드.
// 분야 탭에서 섹터 줄의 종목 칩을 고르면 이게 아래에 붙는다(TASK-91).
// 종목 선택 자체는 부모(섹터 줄)가 하므로 여기서는 '고른 종목 하나'만 다룬다.
export function CompanyReportBrowser({
  files,
  company,
  verdict,
  onOpenReport,
  onRequestDelete,
}: {
  files: ReportFile[] | null;
  company: string;
  // 이 종목의 최신 열등주 스크리닝 판정(없으면 null) — 헤더 pill 로만 쓴다.
  verdict: string | null;
  onOpenReport: (path: string) => void;
  onRequestDelete: (path: string) => void;
}) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const currentFiles = useMemo(
    () => sortCompanyFiles(files?.filter((f) => f.company === company) ?? []),
    [files, company]
  );

  // 종목이 바뀌거나 목록이 로드되면 선택을 그 종목의 첫 보고서로 맞춘다
  // (현재 선택이 이 종목에 속해 있으면 유지).
  useEffect(() => {
    setSelectedReport((prev) =>
      prev && currentFiles.some((f) => f.path === prev) ? prev : (currentFiles[0]?.path ?? null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, files]);

  const selFile = currentFiles.find((f) => f.path === selectedReport) ?? null;
  const activeCategory = selFile ? getReportCategory(selFile.name) : null;
  // 파일이 있는 유형만 1차 탭으로 노출(순서는 REPORT_SECTIONS).
  const activeSections = REPORT_SECTIONS.filter((s) =>
    currentFiles.some((f) => getReportCategory(f.name) === s.id)
  );
  // 선택된 유형의 보고서들(생성일자 = 2차). 하나뿐이면 2차 탭은 생략.
  const categoryFiles = activeCategory
    ? currentFiles.filter((f) => getReportCategory(f.name) === activeCategory)
    : [];
  const verdictGroup = SCREEN_GROUPS.find((g) => g.match(verdict));

  return (
    <div className="flex flex-col gap-4">
      {/* 선택한 종목 헤더 — 큰 티커 + 최신 스크리닝 판정 pill. */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-hairline pb-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="font-mono text-2xl text-ink tracking-[-0.02em]">{company}</span>
          {verdictGroup && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-[11px] font-medium">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${verdictGroup.dot}`} />
              <span className={verdictGroup.tint}>{verdictGroup.label}</span>
            </span>
          )}
        </div>
        <span className="eyebrow text-[10px] text-mute shrink-0">이 종목의 보고서</span>
      </div>

      {/* 1차: 보고서 유형 */}
      <div className="flex flex-wrap gap-1.5">
        {activeSections.map((section) => {
          const active = section.id === activeCategory;
          return (
            <button
              key={section.id}
              onClick={() => {
                const first = currentFiles.find((f) => getReportCategory(f.name) === section.id);
                if (first) setSelectedReport(first.path);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors active:scale-95 ${
                active
                  ? "bg-white text-canvas border-white"
                  : "border-hairline text-body hover:text-ink hover:bg-canvas-soft"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {/* 2차: 생성일자(같은 유형에 보고서가 둘 이상일 때만) */}
      {categoryFiles.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 border-l-2 border-hairline pl-3">
          {categoryFiles.map((f) => {
            const active = selectedReport === f.path;
            return (
              <button
                key={f.path}
                onClick={() => setSelectedReport(f.path)}
                title={f.name}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors active:scale-95 ${
                  active
                    ? "bg-white text-canvas border-white"
                    : "border-hairline text-mute hover:text-ink hover:bg-canvas-soft"
                }`}
              >
                {reportDateLabel(f.name)}
              </button>
            );
          })}
        </div>
      )}

      {selFile ? (
        <CollapsibleReportCard
          key={selFile.path}
          file={selFile}
          onOpenReport={onOpenReport}
          onRequestDelete={onRequestDelete}
        />
      ) : (
        <p className="text-xs text-mute">표시할 보고서가 없습니다.</p>
      )}
    </div>
  );
}
