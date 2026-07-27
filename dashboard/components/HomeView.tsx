"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { flows, type Flow } from "@/lib/flows";
import { ReportFile } from "@/lib/reports-store";
import { getFileBadge, getResultPill, getConfidencePill, sortCompanyFiles, getReportCategory, REPORT_SECTIONS, SCREEN_GROUPS, type SectorGroup, DEFAULT_SECTOR_GROUPS, sectorOfWith, orderedSectors, getSectorReportInfo, SECTOR_SECTIONS, reportDateLabel } from "@/lib/report-helpers";
import { GLOSSARY } from "@/lib/glossary";
import { ReportContentView } from "./ReportContentView";
import { ReportModal } from "./ReportModal";
import { HoldingsBanner } from "./HoldingsBanner";
import { DailyCheckView } from "./DailyCheckView";
import { GlossaryView } from "./GlossaryView";
import { TrackRecordView } from "./TrackRecordView";
import { EarningsCalendar } from "./EarningsCalendar";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { SectorGroupEditor } from "./SectorGroupEditor";

// 루트에 있지만 '섹터 리서치'가 아닌 문서(각자 전용 탭이 따로 있음).
const ROOT_NON_SECTOR = new Set(["portfolio-latest.md", "track-record.md"]);

export function HomeView({
  onLaunchStep,
  onOpenFlowModal,
}: {
  onLaunchStep: (f: Flow, step: number, initialInput?: string) => void;
  onOpenFlowModal: (f: Flow) => void;
}) {
  const [files, setFiles] = useState<ReportFile[] | null>(null);
  // 사용자 정의 섹터 그룹(이름 + 포함 종목). localStorage에서 복원, 편집 모달에서 갱신.
  const [sectorGroups, setSectorGroups] = useState<SectorGroup[]>(DEFAULT_SECTOR_GROUPS);
  const [editingSectors, setEditingSectors] = useState(false);
  // 종목별 보고서 1차 구분(섹터) 선택. 종목(reportTab)은 이 섹터 안에서만 고른다.
  const [reportSectorTab, setReportSectorTab] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<string | null>(null);
  // 종목 탭 하위 2차 탭에서 선택된 보고서(경로). 종목 탭이 바뀌면 첫 보고서로 리셋.
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  // 섹터 리서치 탭: 1차(섹터명) 선택 + 하위에서 선택된 보고서(경로).
  const [sectorTab, setSectorTab] = useState<string | null>(null);
  const [sectorReport, setSectorReport] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  const [flowTab, setFlowTab] = useState<string>("portfolio-overview");
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 보고서 삭제(개발 정리용): 확인 대기 경로 + 진행/에러 상태.
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    fetch("/api/reports", { cache: "no-store" })
      .then(readJsonSafe)
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setLoadError(true);
          return;
        }
        setFiles(d.files);
        // reportSectorTab·reportTab 선택은 파생 값 기반 reconciliation 이펙트가 맞춘다
        // (섹터 그룹 설정이 localStorage 로드로 바뀌어도 자동 반영되도록).
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 파생 데이터는 useMemo 로 캐시한다 — HomeView 는 상태가 많아 자주 리렌더되는데,
  // 아래 스캔·정렬(특히 screenByCompany 의 O(companies×files))을 매 렌더마다 다시 돌면
  // 불필요한 비용이 든다(TASK-48).
  const companies = useMemo<string[]>(
    () =>
      files
        ? Array.from(new Set(files.map((f) => f.company).filter((c): c is string => c !== null))).sort()
        : [],
    [files]
  );
  // 루트 레벨 보고서(회사 폴더 밖)는 섹터/스크리닝 결과물이다 → '섹터 리서치' 탭에서 보여준다.
  // 단, 섹터 리서치가 아닌 루트 문서는 제외한다:
  //   - portfolio-latest.md : '포트폴리오 점검' 탭 소관
  //   - track-record.md     : 수기 매매기록(자동 채점 '트랙레코드' 탭과 별개) — 섹터가 아님
  const rootFiles = useMemo(
    () =>
      files
        ? files.filter(
            (f) => f.company === null && !ROOT_NON_SECTOR.has(f.name)
          )
        : [],
    [files]
  );
  const portfolioReport = useMemo(
    () => files?.find((f) => f.company === null && f.name === "portfolio-latest.md") ?? null,
    [files]
  );
  // 수기 매매기록 문서(reports/track-record.md) — 트랙레코드 탭 하단에 함께 보여준다.
  const trackRecordDoc = useMemo(
    () => files?.find((f) => f.company === null && f.name === "track-record.md") ?? null,
    [files]
  );
  // '종목별 보고서' 탭 위계: 섹터(1차) → 열등주 스크리닝 결과 그룹(2차) → 종목(칩) → 보고서.
  const tabs = companies;
  // 사용자 그룹 설정에 종속된 섹터 판정. sectorGroups가 바뀌면 아래 값들도 갱신된다.
  const sectorOf = useCallback((company: string) => sectorOfWith(sectorGroups, company), [sectorGroups]);
  // 1차: 보고서가 존재하는 섹터만, 그룹 순서대로(미분류는 맨 끝).
  const reportSectors = useMemo(() => orderedSectors(sectorGroups, companies), [sectorGroups, companies]);
  // 선택된 섹터에 속한 종목만. 섹터 미선택 시(로드 전) 전체.
  const sectorCompanies = useMemo(
    () => (reportSectorTab ? tabs.filter((t) => sectorOf(t) === reportSectorTab) : tabs),
    [reportSectorTab, tabs, sectorOf]
  );
  const currentFiles = useMemo(
    () => sortCompanyFiles(files?.filter((f) => f.company === reportTab) ?? []),
    [files, reportTab]
  );

  // 종목별 '최신 열등주 스크리닝 결과' 맵. 종목 탭을 통과/탈락 등으로 구획 분리하는 데 쓴다.
  // 파일명에 날짜(YYYYMMDD)가 박혀 사전식 정렬의 마지막이 최신. 최신부터 결과가 파싱된 것 채택.
  const screenByCompany = useMemo(() => {
    const map: Record<string, string | null> = {};
    if (files) {
      for (const c of companies) {
        const qs = files
          .filter((f) => f.company === c && f.name.includes("-quality-screen-"))
          .sort((a, b) => a.name.localeCompare(b.name));
        let res: string | null = null;
        for (let i = qs.length - 1; i >= 0; i--) {
          if (qs[i].summary) {
            res = qs[i].summary ?? null;
            break;
          }
        }
        map[c] = res;
      }
    }
    return map;
  }, [files, companies]);

  // 섹터 리서치 탭: 루트 파일을 섹터명으로 묶는다 (1차 = 섹터).
  const sectors = useMemo(
    () => Array.from(new Set(rootFiles.map((f) => getSectorReportInfo(f.name).sector))).sort(),
    [rootFiles]
  );
  const sectorCurrentFiles = useMemo(
    () =>
      sectorTab
        ? rootFiles
            .filter((f) => getSectorReportInfo(f.name).sector === sectorTab)
            // 유형(SECTOR_SECTIONS 순) → 최신 날짜 우선으로 정렬.
            .sort((a, b) => {
              const ka = SECTOR_SECTIONS.findIndex((s) => s.id === getSectorReportInfo(a.name).kind);
              const kb = SECTOR_SECTIONS.findIndex((s) => s.id === getSectorReportInfo(b.name).kind);
              return ka !== kb ? ka - kb : b.name.localeCompare(a.name);
            })
        : [],
    [sectorTab, rootFiles]
  );

  // 저장된 섹터 그룹 설정을 서버(Supabase)에서 불러온다. 실패 시 기본값 유지.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sector-groups")
      .then(readJsonSafe)
      .then((d) => {
        if (!cancelled && Array.isArray(d.groups)) setSectorGroups(d.groups);
      })
      .catch(() => {
        // 네트워크 실패 시 화면엔 기본 그룹이 유지된다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 섹터 그룹 저장: 화면 즉시 갱신(낙관적) + 서버(Supabase) 영속화.
  const saveSectorGroups = (groups: SectorGroup[]) => {
    setSectorGroups(groups);
    fetch("/api/sector-groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    }).catch(() => {
      // 저장 실패는 무시(현재 세션 표시엔 반영됨). 새로고침 시 서버 값으로 되돌아갈 수 있음.
    });
  };

  // 섹터 목록이 바뀌면(로드·그룹 편집) 1차 선택을 유효한 값으로 맞춘다.
  const sectorKey = reportSectors.join("|");
  useEffect(() => {
    setReportSectorTab((prev) => (prev && reportSectors.includes(prev) ? prev : (reportSectors[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorKey]);

  // 섹터가 바뀌거나 그 섹터 구성원이 바뀌면 선택 종목을 유효한 값으로 맞춘다
  // (현재 종목이 이 섹터에 속해 있으면 유지).
  const sectorCompaniesKey = sectorCompanies.join("|");
  useEffect(() => {
    if (!reportSectorTab) return;
    setReportTab((prev) => (prev && sectorCompanies.includes(prev) ? prev : (sectorCompanies[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportSectorTab, sectorCompaniesKey]);

  // 종목 탭이 바뀌거나 목록이 로드되면 2차 탭 선택을 첫 보고서로 맞춘다.
  // (현재 선택이 이 종목에 속해 있으면 유지.)
  useEffect(() => {
    setSelectedReport((prev) =>
      prev && currentFiles.some((f) => f.path === prev) ? prev : (currentFiles[0]?.path ?? null)
    );
    // currentFiles는 reportTab·files에서 파생되므로 이 둘만 의존성으로 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTab, files]);

  // 섹터 목록이 로드되면 1차 탭을 첫 섹터로 맞춘다.
  useEffect(() => {
    setSectorTab((prev) => (prev && sectors.includes(prev) ? prev : (sectors[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // 섹터 탭이 바뀌거나 목록이 로드되면 선택 보고서를 그 섹터의 첫 보고서로 맞춘다.
  useEffect(() => {
    setSectorReport((prev) =>
      prev && sectorCurrentFiles.some((f) => f.path === prev) ? prev : (sectorCurrentFiles[0]?.path ?? null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorTab, files]);

  // 사이드바/모바일 공용 네비. 비슷한 성격끼리 그룹으로 묶는다:
  //  개요(대시보드) · 결과물(보고서) · 리서치 프로세스(실행 플로우) · 참고(용어)
  const navGroups = [
    {
      label: "개요",
      items: [
        { id: "portfolio-overview", label: "포트폴리오" },
        { id: "track-record", label: "트랙레코드" },
      ],
    },
    {
      label: "결과물",
      items: [
        { id: "sector-reports", label: "섹터 리서치" },
        { id: "reports", label: "종목별 보고서" },
      ],
    },
    {
      label: "리서치 프로세스",
      items: [
        ...flows.filter((f) => f.id !== "discovery").map((f) => ({ id: f.id, label: f.title })),
      ],
    },
    {
      label: "참고",
      items: [{ id: "glossary", label: "용어 정리" }],
    },
  ];
  // 모바일 가로 탭 로우와 각종 조회는 평탄화한 목록을 쓴다.
  const contentTabs = navGroups.flatMap((g) => g.items);
  const activeFlow = flows.find((f) => f.id === flowTab);
  const headerEyebrow =
    flowTab === "reports"
      ? "REPORTS"
      : flowTab === "sector-reports"
        ? "SECTOR"
        : flowTab === "portfolio-overview"
          ? "PORTFOLIO"
          : flowTab === "glossary"
            ? "GLOSSARY"
            : flowTab === "track-record"
              ? "TRACK RECORD"
              : flowTab.toUpperCase();
  const headerTitle =
    flowTab === "reports"
      ? "종목별 보고서"
      : flowTab === "sector-reports"
        ? "섹터 리서치"
        : flowTab === "portfolio-overview"
          ? "포트폴리오"
          : flowTab === "glossary"
            ? "용어 정리"
            : flowTab === "track-record"
              ? "트랙레코드"
              : (activeFlow?.title ?? "");
  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // 확인 모달에서 삭제 확정 → GitHub 삭제 커밋 → 목록 갱신 + 선택/모달 정리.
  const confirmDelete = async () => {
    if (!deletePath) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/reports/content?path=${encodeURIComponent(deletePath)}`, {
        method: "DELETE",
        // 서버가 요구하는 삭제 확인 헤더(동일 출처 강제 — TASK-70).
        headers: { "x-confirm-delete": deletePath },
      });
      const d = await res.json();
      if (d.error) {
        setDeleteError(d.error);
        return;
      }
      setModalPath((p) => (p === deletePath ? null : p));
      setSelectedReport((p) => (p === deletePath ? null : p));
      setDeletePath(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setDeleteError(String(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-body flex">
      {/* ── 사이드바 (데스크톱) — xAI app-shell ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-hairline sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-hairline">
          <div className="eyebrow text-[10px]">REALITY ESCAPE</div>
          <div className="mt-1.5 text-lg tracking-[-0.02em] text-ink">현생 탈출 장치</div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <div className="eyebrow text-[10px] px-3 pb-1 text-mute">{group.label}</div>
              {group.items.map((t) => {
                const active = flowTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setFlowTab(t.id)}
                    className={`text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white text-canvas"
                        : "text-body hover:text-ink hover:bg-canvas-soft"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-hairline">
          <button
            onClick={logout}
            className="w-full rounded-full border border-hairline px-4 py-2 text-sm text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* 모바일 상단바 */}
        <div className="md:hidden sticky top-0 z-40 bg-canvas/90 backdrop-blur border-b border-hairline px-5 h-14 flex items-center justify-between">
          <span className="text-ink tracking-[-0.02em]">현생 탈출 장치</span>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="rounded-full border border-hairline px-3 py-1 text-xs text-body active:scale-95">로그아웃</button>
          </div>
        </div>
        {/* 모바일 탭 로우 */}
        <div className="md:hidden px-5 py-3 border-b border-hairline flex gap-1 overflow-x-auto">
          {contentTabs.map((t) => {
            const active = flowTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFlowTab(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
                  active ? "bg-white text-canvas" : "text-mute hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 데스크톱 상단바 — mono eyebrow + 페이지 타이틀 + primary 액션 */}
        <header className="hidden md:flex sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-hairline px-8 h-16 items-center justify-between">
          <div>
            <div className="eyebrow text-[10px]">{headerEyebrow}</div>
            <div className="text-lg tracking-[-0.02em] text-ink leading-tight">{headerTitle}</div>
          </div>
        </header>

        <div className="px-6 md:px-8 py-8 w-full max-w-7xl">
          <div className="mb-16">

          {/* ── 탭 콘텐츠 (전환 애니메이션) ── */}
          <div key={flowTab} className="tab-panel">
          {flowTab === "portfolio-overview" ? (
            <div>
              <HoldingsBanner />
              {/* 당일 등락 체크 — 포트폴리오와 동일한 /api/holdings를 쓰므로 같은 페이지에 배치 */}
              <DailyCheckView />
            </div>
          ) : flowTab === "glossary" ? (
            <GlossaryView />
          ) : flowTab === "track-record" ? (
            <div className="flex flex-col gap-10">
              <TrackRecordView />
              {/* 수기 매매기록 문서(reports/track-record.md) — 자동 채점(위)과 별개의 사람이 쓴 기록. */}
              {trackRecordDoc && (
                <div>
                  <div className="eyebrow text-[10px] text-mute mb-3">매매 기록 (수기)</div>
                  <div className="rounded-lg border border-hairline bg-canvas-card px-6 py-5">
                    <ReportContentView path={trackRecordDoc.path} />
                  </div>
                </div>
              )}
            </div>
          ) : flowTab === "sector-reports" ? (
            /* ── 섹터 리서치: /industry-research·/industry-funnel 등 섹터/스크리닝 결과물 ── */
            <div>
              {/* 상단 실행 카드 ROW: 프로세스 가이드 1·2단계(섹터 구조 파악·후보 종목 압축)를
                  결과물을 보는 자리에서 바로 실행. 클릭 시 onLaunchStep 모달(홈 컨텍스트 유지). */}
              {(() => {
                const discovery = flows.find((f) => f.id === "discovery");
                if (!discovery) return null;
                return (
                  <div className="mb-8">
                    <div className="eyebrow text-[10px] text-mute mb-2">새 리서치 시작</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[0, 1].map((si) => {
                        const step = discovery.steps[si];
                        const cmd = step.commandTemplate.replace("{input}", step.inputPlaceholder);
                        return (
                          <button
                            key={si}
                            onClick={() => onLaunchStep(discovery, si)}
                            className="text-left rounded-lg border border-hairline bg-canvas-card p-5 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99]"
                          >
                            <div className="flex items-start gap-4">
                              <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/10 text-ink flex items-center justify-center text-sm">
                                {si + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <h3 className="text-base text-ink tracking-[-0.01em]">{step.title}</h3>
                                  <span className="shrink-0 text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                                    실행 →
                                  </span>
                                </div>
                                <code className="mt-2.5 inline-block text-xs font-mono text-breeze">{cmd}</code>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {!files && !loadError && <p className="text-xs text-mute">불러오는 중...</p>}

              {!files && loadError && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-300">보고서를 불러오지 못했습니다.</span>
                  <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {files && rootFiles.length === 0 && (
                <div className="rounded-lg border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center">
                  <p className="text-sm text-body">아직 섹터 리서치 결과물이 없습니다.</p>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed">
                    <code className="font-mono text-breeze">/industry-research {"{섹터}"}</code> 또는{" "}
                    <code className="font-mono text-breeze">/industry-funnel {"{섹터}"}</code>를 실행하면
                    이곳에 보고서가 나타납니다.
                  </p>
                </div>
              )}

              {files && rootFiles.length > 0 && (
                <>
                  {/* 1차: 섹터 */}
                  <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
                    {sectors.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSectorTab(s)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
                          sectorTab === s ? "bg-white text-canvas" : "text-mute hover:text-ink"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* 섹터 상세: 유형(2차) → 생성일자(3차) 위계 + 선택 보고서 인라인 표시 */}
                  {(() => {
                    const selFile = sectorCurrentFiles.find((f) => f.path === sectorReport) ?? null;
                    const activeKind = selFile ? getSectorReportInfo(selFile.name).kind : null;
                    // 파일이 있는 유형만 2차 탭으로 노출(순서는 SECTOR_SECTIONS).
                    const activeSections = SECTOR_SECTIONS.filter((s) =>
                      sectorCurrentFiles.some((f) => getSectorReportInfo(f.name).kind === s.id)
                    );
                    // 선택된 유형의 보고서들(생성일자 = 3차). 하나뿐이면 3차 탭은 생략.
                    const kindFiles = activeKind
                      ? sectorCurrentFiles.filter((f) => getSectorReportInfo(f.name).kind === activeKind)
                      : [];
                    const badge = selFile ? getFileBadge(selFile.name) : null;
                    const resultPill = getResultPill(selFile?.summary);
                    const confPill = getConfidencePill(selFile?.confidence);
                    return (
                      <div className="flex flex-col gap-4">
                        {/* 2차: 보고서 유형 */}
                        <div className="flex flex-wrap gap-1.5">
                          {activeSections.map((section) => {
                            const active = section.id === activeKind;
                            return (
                              <button
                                key={section.id}
                                onClick={() => {
                                  const first = sectorCurrentFiles.find(
                                    (f) => getSectorReportInfo(f.name).kind === section.id
                                  );
                                  if (first) setSectorReport(first.path);
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
                        {kindFiles.length > 1 && (
                          <div className="flex flex-wrap items-center gap-1.5 border-l-2 border-hairline pl-3">
                            {kindFiles.map((f) => {
                              const active = sectorReport === f.path;
                              return (
                                <button
                                  key={f.path}
                                  onClick={() => setSectorReport(f.path)}
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
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}
                                >
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
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeletePath(selFile.path);
                                }}
                                title="이 보고서 삭제"
                                className="ml-auto shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
                              >
                                삭제
                              </button>
                            </div>
                            <div className="px-6 py-5">
                              <ReportContentView path={selFile.path} />
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
          ) : flowTab === "reports" ? (
            <div>
              {!files && !loadError && <p className="text-xs text-mute">불러오는 중...</p>}

              {!files && loadError && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-300">보고서를 불러오지 못했습니다.</span>
                  <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {files && tabs.length === 0 && (
                <p className="text-xs text-mute">아직 보고서가 없습니다.</p>
              )}

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
                      <button
                        onClick={() => setEditingSectors(true)}
                        className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                      >
                        그룹 편집
                      </button>
                    </div>

                    {/* 1차: 섹터 탭 */}
                    <div className="mb-4">
                      <div className="eyebrow text-[10px] text-mute mb-1.5">섹터</div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {reportSectors.map((s) => {
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

                    {/* 2차: 선택 섹터 안에서 열등주 스크리닝 판정(통과/면제 통과/탈락/데이터 부족/미검사)으로 종목 칩 구획 분리.
                        여기서 고른 종목의 상세 보고서(열등주 스크리닝 리포트 포함)는 아래 '보고서 레이어'에 나온다. */}
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
                              <span className="font-mono text-2xl text-ink tracking-[-0.02em]">
                                {reportTab ?? "—"}
                              </span>
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
                                    const first = currentFiles.find(
                                      (f) => getReportCategory(f.name) === section.id
                                    );
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
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}
                                  >
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
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeletePath(selFile.path);
                                  }}
                                  title="이 보고서 삭제"
                                  className="ml-auto shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
                                >
                                  삭제
                                </button>
                              </div>
                              <div className="px-6 py-5">
                                <ReportContentView path={selFile.path} />
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
          ) : (
            /* ── 플로우 탭 ── */
            (() => {
              const flow = flows.find((f) => f.id === flowTab) ?? flows[0];

              // 포폴 점검: 분기별 카드
              if (flow.quarters) {
                return (
                  <div>
                    <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
                    {/* 최신 포트폴리오 점검 보고서 (portfolio-latest.md) */}
                    {portfolioReport ? (
                      <button
                        onClick={() => setModalPath(portfolioReport.path)}
                        className="w-full flex items-center gap-2 rounded-lg bg-canvas-card border border-hairline px-4 py-3 text-left hover:border-white/30 hover:bg-canvas-soft transition-colors active:scale-[0.99] mb-6"
                      >
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-rose-300 bg-rose-500/10">
                          최신 점검
                        </span>
                        <span className="text-xs font-mono text-body flex-1 truncate">{portfolioReport.name}</span>
                        <span className="shrink-0 text-xs text-mute">보기 →</span>
                      </button>
                    ) : (
                      <p className="text-xs text-mute mb-6">아직 포트폴리오 점검 보고서가 없습니다.</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {flow.quarters.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => onOpenFlowModal(flow)}
                          className="text-left rounded-lg border border-hairline bg-canvas-card p-5 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99]"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-base text-ink tracking-[-0.01em]">{q.label}</h3>
                            <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border border-hairline text-body">
                              {q.timing}
                            </span>
                          </div>
                          <p className="text-xs text-body leading-relaxed">{q.note}</p>
                          <div className="mt-3 text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                            시작하기 →
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              // 일반 플로우(실적 점검 등): 각 단계를 개별 카드로 흩어 표시.
              // '종목별 보고서' 탭 상단 실행 카드 ROW와 동일 패턴 — 카드를 누르면
              // 그 단계 하나만 onLaunchStep 모달로 띄운다(홈 컨텍스트 유지).
              return (
                <div>
                  <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
                  {/* 실적 점검 플로우: 보유 종목의 실적 발표일 캘린더를 위에 얹어
                      "언제 점검할지"를 안내한다. '분석'은 1단계를 티커 프리필로 연다. */}
                  {flow.id === "earnings" && (
                    <EarningsCalendar onAnalyze={(ticker) => onLaunchStep(flow, 0, ticker)} />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {flow.steps.map((step, i) => {
                      const cmd = step.commandTemplate.replace("{input}", step.inputPlaceholder);
                      return (
                        <button
                          key={step.title}
                          onClick={() => onLaunchStep(flow, i)}
                          className="text-left rounded-lg border border-hairline bg-canvas-card p-5 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99]"
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/10 text-ink flex items-center justify-center text-sm">
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="text-base text-ink tracking-[-0.01em]">{step.title}</h3>
                                <span className="shrink-0 text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                                  실행 →
                                </span>
                              </div>
                              <p className="mt-1.5 text-xs text-body leading-relaxed">{step.description}</p>
                              <code className="mt-2.5 inline-block text-xs font-mono text-breeze">{cmd}</code>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
          </div>
        </div>
        </div>
      </main>

      {modalPath && (
        <ReportModal
          path={modalPath}
          onClose={() => setModalPath(null)}
          onRequestDelete={(p) => {
            setDeleteError(null);
            setDeletePath(p);
          }}
        />
      )}
      {deletePath && (
        <ConfirmDeleteModal
          path={deletePath}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (!deleteBusy) setDeletePath(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
      {editingSectors && (
        <SectorGroupEditor
          companies={companies}
          groups={sectorGroups}
          onSave={(g) => {
            saveSectorGroups(g);
            setEditingSectors(false);
          }}
          onClose={() => setEditingSectors(false)}
        />
      )}
    </div>
  );
}
