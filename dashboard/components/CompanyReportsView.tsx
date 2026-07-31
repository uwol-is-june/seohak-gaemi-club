"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flows, type Flow } from "@/lib/flows";
import { ReportFile } from "@/lib/reports-store";
import {
  getFileBadge,
  getResultPill,
  getConfidencePill,
  sortCompanyFiles,
  getReportCategory,
  REPORT_SECTIONS,
  SCREEN_GROUPS,
  type SectorGroup,
  sectorOfWith,
  orderedSectors,
  reportDateLabel,
} from "@/lib/report-helpers";
import { domainOfSector, orderedDomains, sectorsInDomain, type DomainGroup } from "@/lib/sector-domains";
import { ReportContentView } from "./ReportContentView";

// 종목 축 보고서 패널(분야 → 섹터 → 종목 → 보고서 유형 → 생성일자).
// '전체 보고서'와 '보유 종목 보고서' 탭이 같은 UI를 공유한다(TASK-86) — 차이는
// companies(다룰 종목 목록)뿐이며, 선택 상태는 인스턴스마다 독립적이다.
export function CompanyReportsView({
  files,
  companies,
  loadError,
  onRetry,
  sectorGroups,
  domainGroups,
  screenByCompany,
  onEditSectorGroups,
  onEditDomainGroups,
  onLaunchStep,
  onOpenReport,
  onRequestDelete,
  focusTicker,
  emptyText = "아직 보고서가 없습니다.",
  flatCompanyPicker = false,
}: {
  files: ReportFile[] | null;
  // 이 패널이 다룰 종목(이미 필터링된 목록). 전체 탭=보고서 있는 전 종목, 보유 탭=보유 종목만.
  companies: string[];
  loadError: boolean;
  onRetry: () => void;
  sectorGroups: SectorGroup[];
  domainGroups: DomainGroup[];
  screenByCompany: Record<string, string | null>;
  onEditSectorGroups: () => void;
  onEditDomainGroups: () => void;
  onLaunchStep: (f: Flow, step: number) => void;
  onOpenReport: (path: string) => void;
  onRequestDelete: (path: string) => void;
  // 외부(포트폴리오 카드 등)에서 특정 티커로 이동. 같은 티커를 다시 눌러도 반응하도록
  // nonce를 증가시켜 전달한다.
  focusTicker?: { ticker: string; nonce: number } | null;
  emptyText?: string;
  // true면 분야·섹터 위계를 건너뛰고 종목 칩만 바로 보여준다(TASK-87).
  // 보유 종목처럼 대상이 몇 개뿐일 때 2단 필터가 클릭만 늘리므로.
  flatCompanyPicker?: boolean;
}) {
  // 위계: 분야(1차) → 섹터(2차) → 종목(3차) → 보고서 유형 → 생성일자.
  const [reportDomainTab, setReportDomainTab] = useState<string | null>(null);
  const [reportSectorTab, setReportSectorTab] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<string | null>(null);
  // 종목 하위에서 선택된 보고서(경로). 종목이 바뀌면 첫 보고서로 리셋.
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const tabs = companies;
  // 사용자 그룹 설정에 종속된 섹터 판정. sectorGroups가 바뀌면 아래 값들도 갱신된다.
  const sectorOf = useCallback((company: string) => sectorOfWith(sectorGroups, company), [sectorGroups]);
  // 섹터 → 분야 판정. 섹터 리서치 탭과 같은 분야 그룹 표를 공유한다(TASK-81/84).
  const domainOf = useCallback((sector: string) => domainOfSector(domainGroups, sector), [domainGroups]);
  // 종목 → 섹터 → 분야 2단 합성. 어느 단계든 매칭이 안 되면 '미분류'로 떨어진다.
  const companyDomainOf = useCallback((company: string) => domainOf(sectorOf(company)), [domainOf, sectorOf]);

  // 2차: 보고서가 존재하는 섹터만, 그룹 순서대로(미분류는 맨 끝).
  const reportSectors = useMemo(() => orderedSectors(sectorGroups, companies), [sectorGroups, companies]);
  // 1차: 그 섹터들이 속한 분야만, 분야 그룹 순서대로(미분류는 맨 끝).
  const reportDomains = useMemo(() => orderedDomains(domainGroups, reportSectors), [domainGroups, reportSectors]);
  // 선택된 분야에 속한 섹터만. 분야 미선택 시(로드 전) 전체.
  const domainReportSectors = useMemo(
    () => (reportDomainTab ? sectorsInDomain(domainGroups, reportSectors, reportDomainTab) : reportSectors),
    [reportDomainTab, domainGroups, reportSectors]
  );
  // 선택된 섹터에 속한 종목만. 섹터 미선택 시(로드 전) 전체.
  // flat 모드는 섹터로 좁히지 않고 항상 전체를 쓴다.
  const sectorCompanies = useMemo(
    () => (!flatCompanyPicker && reportSectorTab ? tabs.filter((t) => sectorOf(t) === reportSectorTab) : tabs),
    [flatCompanyPicker, reportSectorTab, tabs, sectorOf]
  );
  const currentFiles = useMemo(
    () => sortCompanyFiles(files?.filter((f) => f.company === reportTab) ?? []),
    [files, reportTab]
  );

  // 분야 목록이 바뀌면(로드·그룹 편집) 1차 선택을 유효한 값으로 맞춘다.
  const reportDomainKey = reportDomains.join("|");
  useEffect(() => {
    setReportDomainTab((prev) => (prev && reportDomains.includes(prev) ? prev : (reportDomains[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDomainKey]);

  // 분야가 바뀌거나 그 분야의 섹터 구성이 바뀌면 2차(섹터) 선택을 유효한 값으로 맞춘다
  // (현재 섹터가 이 분야에 속해 있으면 유지).
  const sectorKey = domainReportSectors.join("|");
  useEffect(() => {
    setReportSectorTab((prev) =>
      prev && domainReportSectors.includes(prev) ? prev : (domainReportSectors[0] ?? null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDomainTab, sectorKey]);

  // 섹터가 바뀌거나 그 섹터 구성원이 바뀌면 선택 종목을 유효한 값으로 맞춘다
  // (현재 종목이 이 섹터에 속해 있으면 유지).
  const sectorCompaniesKey = sectorCompanies.join("|");
  // flat 모드는 섹터 선택이 없으니 종목 목록만 보고 맞춘다.
  useEffect(() => {
    if (!flatCompanyPicker && !reportSectorTab) return;
    setReportTab((prev) => (prev && sectorCompanies.includes(prev) ? prev : (sectorCompanies[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatCompanyPicker, reportSectorTab, sectorCompaniesKey]);

  // 종목이 바뀌거나 목록이 로드되면 보고서 선택을 그 종목의 첫 보고서로 맞춘다.
  // (현재 선택이 이 종목에 속해 있으면 유지.)
  useEffect(() => {
    setSelectedReport((prev) =>
      prev && currentFiles.some((f) => f.path === prev) ? prev : (currentFiles[0]?.path ?? null)
    );
    // currentFiles는 reportTab·files에서 파생되므로 이 둘만 의존성으로 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTab, files]);

  // 외부 드릴다운: 3단 위계라 분야까지 함께 맞춘다 — 분야가 어긋나면 섹터 탭이 목록에 없어
  // 위 reconciliation 이펙트가 선택을 되돌려버린다.
  // 종목 목록이 아직 로드되지 않았으면(빈 배열) 적용하지 않고, 목록이 채워진 뒤 다시 시도한다.
  // 적용한 nonce를 기억해 한 번만 반영 — 그러지 않으면 사용자가 이후 직접 고른 종목을
  // (목록·그룹 변경으로 이 이펙트가 재실행될 때) 되돌려버린다.
  const appliedFocusNonce = useRef<number | null>(null);
  const companiesKey = companies.join("|");
  useEffect(() => {
    if (!focusTicker || appliedFocusNonce.current === focusTicker.nonce) return;
    const t = focusTicker.ticker.toUpperCase();
    const match = companies.find((c) => c.toUpperCase() === t);
    if (!match) return;
    appliedFocusNonce.current = focusTicker.nonce;
    setReportDomainTab(companyDomainOf(match));
    setReportSectorTab(sectorOf(match));
    setReportTab(match);
    setSelectedReport(null); // 종목이 바뀌면 첫 보고서로 리셋(파생 이펙트가 채움)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTicker, companiesKey, companyDomainOf, sectorOf]);

  return (
    <div>
      {!files && !loadError && <p className="text-xs text-mute">불러오는 중...</p>}

      {!files && loadError && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-red-300">보고서를 불러오지 못했습니다.</span>
          <button
            onClick={onRetry}
            className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {files && tabs.length === 0 && <p className="text-xs text-mute">{emptyText}</p>}

      {files && tabs.length > 0 && (
        <>
          {/* 상단 실행 카드 ROW: 프로세스 가이드 3~6단계(열등주 제거·버핏 6-게이트·심층
              분석·투자 논제 = 가이드 표시 기준 1~4번)를 종목 보고서를 보는 자리에서 바로
              실행. 섹터 리서치 탭의 카드 ROW와 동일 패턴. */}
          {(() => {
            const discovery = flows.find((f) => f.id === "discovery");
            if (!discovery) return null;
            return (
              <div className="mb-6">
                <div className="eyebrow text-[10px] text-mute mb-2">새 분석 시작</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {discovery.steps.slice(2).map((step, i) => {
                    const stepIndex = i + 2;
                    const cmd = step.commandTemplate.replace("{input}", step.inputPlaceholder);
                    return (
                      <button
                        key={stepIndex}
                        onClick={() => onLaunchStep(discovery, stepIndex)}
                        className="text-left rounded-lg border border-hairline bg-canvas-card p-4 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-white/10 text-ink flex items-center justify-center text-xs">
                            {i + 1}
                          </div>
                          <span className="ml-auto shrink-0 text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                            실행 →
                          </span>
                        </div>
                        <h3 className="text-sm text-ink tracking-[-0.01em]">{step.title}</h3>
                        <code className="mt-2 inline-block text-xs font-mono text-breeze">{cmd}</code>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── 선별 레이어: 종목 선택 ──
              섹터로 좁히고 → 열등주 스크리닝 판정(통과/탈락…)으로 그룹핑한 칩에서
              볼 종목을 고른다. 아래 '보고서 레이어'와는 카드 경계로 분리한다. */}
          <div className="mb-6 rounded-lg border border-hairline bg-canvas-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="eyebrow text-[10px] text-ink">종목 선택</span>
              </div>
              {/* 3단 위계라 편집 축이 둘이다: 종목→섹터(종목 축 전용) / 섹터→분야(섹터 리서치 탭과 공유).
                  flat 모드는 두 축을 쓰지 않으므로 편집 버튼도 감춘다. */}
              <div className={`flex shrink-0 gap-1.5 ${flatCompanyPicker ? "hidden" : ""}`}>
                <button
                  onClick={onEditDomainGroups}
                  className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                >
                  분야 그룹
                </button>
                <button
                  onClick={onEditSectorGroups}
                  className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                >
                  종목 그룹
                </button>
              </div>
            </div>

            {/* 1차: 분야 — 섹터 리서치 탭과 같은 분야 그룹 표를 쓴다(TASK-84). flat 모드에선 생략. */}
            {!flatCompanyPicker && (
            <div className="mb-4">
              <div className="eyebrow text-[10px] text-mute mb-1.5">분야</div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {reportDomains.map((d) => {
                  const count = tabs.filter((t) => companyDomainOf(t) === d).length;
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setReportDomainTab(d);
                        const firstSector = reportSectors.find((s) => domainOf(s) === d);
                        if (firstSector) {
                          setReportSectorTab(firstSector);
                          const first = tabs.find((t) => sectorOf(t) === firstSector);
                          if (first) setReportTab(first);
                        }
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 flex items-center gap-1.5 ${
                        reportDomainTab === d ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                      }`}
                    >
                      {d}
                      <span className={reportDomainTab === d ? "text-canvas/60" : "text-mute"}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* 2차: 선택 분야 안의 섹터. flat 모드에선 생략. */}
            {!flatCompanyPicker && (
            <div className="border-t border-hairline pt-4 mb-4">
              <div className="eyebrow text-[10px] text-mute mb-1.5">섹터</div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {domainReportSectors.map((s) => {
                  const count = tabs.filter((t) => sectorOf(t) === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setReportSectorTab(s);
                        const first = tabs.find((t) => sectorOf(t) === s);
                        if (first) setReportTab(first);
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 flex items-center gap-1.5 ${
                        reportSectorTab === s ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                      }`}
                    >
                      {s}
                      <span className={reportSectorTab === s ? "text-canvas/60" : "text-mute"}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* 종목 칩. flat 모드는 한 줄로 쭉(판정 색점만 유지), 아니면 열등주 스크리닝
                판정(통과/면제 통과/탈락/데이터 부족/미검사)으로 구획 분리.
                여기서 고른 종목의 상세 보고서(열등주 스크리닝 리포트 포함)는 아래 '보고서 레이어'에 나온다. */}
            {flatCompanyPicker ? (
              <div className="flex gap-1 flex-wrap">
                {sectorCompanies.map((tab) => {
                  const g = SCREEN_GROUPS.find((x) => x.match(screenByCompany[tab] ?? null));
                  return (
                    <button
                      key={tab}
                      onClick={() => setReportTab(tab)}
                      title={screenByCompany[tab] ?? "미검사"}
                      className={`shrink-0 rounded-full pl-2 pr-3 py-1.5 text-xs font-medium transition-colors active:scale-95 flex items-center gap-1.5 ${
                        reportTab === tab ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                      }`}
                    >
                      {g && <span className={`inline-block w-1.5 h-1.5 rounded-full ${g.dot}`} />}
                      {tab}
                    </button>
                  );
                })}
              </div>
            ) : (
            <div className="border-t border-hairline pt-4">
              <div className="eyebrow text-[10px] text-mute mb-2.5">선별 결과 · 열등주 스크리닝 판정</div>
              <div className="flex flex-row flex-wrap gap-x-6 gap-y-4">
                {SCREEN_GROUPS.map((g) => {
                  const members = sectorCompanies.filter((t) => g.match(screenByCompany[t] ?? null));
                  if (members.length === 0) return null;
                  return (
                    <div key={g.id}>
                      <div className="eyebrow text-[10px] mb-1.5 flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${g.dot}`} />
                        <span className={g.tint}>{g.label}</span>
                        <span className="text-mute">{members.length}</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {members.map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setReportTab(tab)}
                            className={`shrink-0 rounded-full pl-2 pr-3 py-1.5 text-xs font-medium transition-colors active:scale-95 flex items-center gap-1.5 ${
                              reportTab === tab ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                            }`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${g.dot}`} />
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>

          {/* 종목 상세: 보고서 유형(2차) → 생성일자(3차) 위계 + 선택 보고서 인라인 표시 */}
          {(() => {
            const selFile = currentFiles.find((f) => f.path === selectedReport) ?? null;
            const activeCategory = selFile ? getReportCategory(selFile.name) : null;
            // 파일이 있는 유형만 2차 탭으로 노출(순서는 REPORT_SECTIONS).
            const activeSections = REPORT_SECTIONS.filter((s) =>
              currentFiles.some((f) => getReportCategory(f.name) === s.id)
            );
            // 선택된 유형의 보고서들(생성일자 = 3차). 하나뿐이면 3차 탭은 생략.
            const categoryFiles = activeCategory
              ? currentFiles.filter((f) => getReportCategory(f.name) === activeCategory)
              : [];
            const badge = selFile ? getFileBadge(selFile.name) : null;
            const resultPill = getResultPill(selFile?.summary);
            const confPill = getConfidencePill(selFile?.confidence);
            // 선택한 종목의 최신 열등주 스크리닝 판정 → 헤더 pill. 선별 레이어의 그룹 색과 동일.
            const companyVerdict = reportTab ? (screenByCompany[reportTab] ?? null) : null;
            const verdictGroup = SCREEN_GROUPS.find((g) => g.match(companyVerdict));
            return (
              <div className="flex flex-col gap-4">
                {/* 선택한 종목 헤더 — 위 '종목 선택'(선별)과 아래 보고서(콘텐츠)의 경계.
                    큰 티커 + 최신 스크리닝 판정 pill로 "지금 이 종목의 보고서를 본다"를 명시. */}
                <div className="flex items-center justify-between gap-3 flex-wrap border-b border-hairline pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span className="font-mono text-2xl text-ink tracking-[-0.02em]">{reportTab ?? "—"}</span>
                    {verdictGroup && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-[11px] font-medium">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${verdictGroup.dot}`} />
                        <span className={verdictGroup.tint}>{verdictGroup.label}</span>
                      </span>
                    )}
                  </div>
                  <span className="eyebrow text-[10px] text-mute shrink-0">이 종목의 보고서</span>
                </div>

                {/* 2차: 보고서 유형 */}
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

                {/* 3차: 생성일자(같은 유형에 보고서가 둘 이상일 때만) */}
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

                {/* 선택 보고서 인라인 패널 */}
                {selFile ? (
                  <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap px-5 py-3 border-b border-hairline">
                      {badge && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                      {resultPill && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${resultPill.color}`}
                        >
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
                      <span className="text-xs font-mono text-body truncate">{selFile.name}</span>
                      <button
                        onClick={() => onRequestDelete(selFile.path)}
                        title="이 보고서 삭제"
                        className="ml-auto shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="px-6 py-5">
                      <ReportContentView path={selFile.path} onOpenReport={onOpenReport} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-mute">표시할 보고서가 없습니다.</p>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
