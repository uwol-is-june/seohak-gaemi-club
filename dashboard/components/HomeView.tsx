"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { flows, type Flow } from "@/lib/flows";
import { ReportFile } from "@/lib/reports-store";
import { getFileBadge, getResultPill, getConfidencePill, type SectorGroup, DEFAULT_SECTOR_GROUPS, DEFAULT_DOMAIN_GROUPS, sectorOfWith, getSectorReportInfo, SECTOR_SECTIONS, reportDateLabel } from "@/lib/report-helpers";
import { domainOfSector, mergeAutoSectorGroups, orderedDomains, sectorsInDomain, type AutoSectorMap, type DomainGroup } from "@/lib/sector-domains";
import { fetchHoldingsShared, holdingsCache, hydratePortfolioCache } from "@/lib/portfolio-cache";
import type { Holding } from "@/lib/toss";
import { ReportContentView } from "./ReportContentView";
import { ReportModal } from "./ReportModal";
import { CompanyReportsView } from "./CompanyReportsView";
import { HoldingsBanner } from "./HoldingsBanner";
import { DailyCheckView } from "./DailyCheckView";
import { TrackRecordView } from "./TrackRecordView";
import { EarningsCalendar } from "./EarningsCalendar";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { SectorGroupEditor } from "./SectorGroupEditor";
import { BottleneckSignalsView } from "./BottleneckSignalsView";
import { ArticlesView } from "./ArticlesView";
import { isBottleneckCompany } from "@/lib/bottleneck";
import { isArticlePath } from "@/lib/articles";

// 루트에 있지만 '섹터 리서치'가 아닌 문서(각자 전용 탭이 따로 있음).
const ROOT_NON_SECTOR = new Set(["portfolio-latest.md", "track-record.md"]);

// 탭별 상단바 라벨(eyebrow = GeistMono 대문자, title = 한글). 리서치 프로세스(flows)
// 탭은 여기 없고 activeFlow.title 로 폴백한다.
const TAB_HEADERS: Record<string, { eyebrow: string; title: string }> = {
  reports: { eyebrow: "REPORTS", title: "전체 보고서" },
  "holdings-reports": { eyebrow: "HOLDINGS REPORTS", title: "보유 종목 보고서" },
  "sector-reports": { eyebrow: "SECTOR", title: "섹터 리서치" },
  "portfolio-overview": { eyebrow: "PORTFOLIO", title: "포트폴리오" },
  "track-record": { eyebrow: "TRACK RECORD", title: "트랙레코드" },
  "bottleneck-signals": { eyebrow: "BOTTLENECK", title: "병목 신호" },
  articles: { eyebrow: "ARTICLES", title: "아티클" },
};

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
  // 보고서 마커에서 파생된 티커→섹터 자동 맵(TASK-90). 수동 그룹과 별도로 들고 있다가
  // 표시할 때만 병합한다 — 편집 모달에는 수동 원본만 올려야 자동분이 수동으로 굳지 않는다.
  const [sectorAutoMap, setSectorAutoMap] = useState<AutoSectorMap>({});
  const [editingSectors, setEditingSectors] = useState(false);
  // 종목 축 보고서 탭('전체 보고서'·'보유 종목 보고서')의 위계·선택 상태는
  // CompanyReportsView 인스턴스가 각자 들고 있다(TASK-86). 여기서는 외부 드릴다운
  // (포트폴리오 카드 → 그 티커의 보고서)만 nonce로 밀어 넣는다.
  const [reportFocus, setReportFocus] = useState<{ ticker: string; nonce: number } | null>(null);
  // 보유 종목 티커(대문자). '보유 종목 보고서' 탭의 종목 목록을 이 집합으로 좁힌다.
  // null = 아직 로드 전(빈 배열과 구분해 안내 문구를 다르게 한다).
  const [holdingTickers, setHoldingTickers] = useState<string[] | null>(null);
  // 섹터 리서치 탭 위계: 분야(1차) → 섹터(2차) → 보고서 유형(3차) → 생성일자(4차).
  // 분야 그룹(이름 + 포함 섹터명)은 서버(/api/sector-domain-groups)에서 불러오고,
  // 그룹 편집 모달에서 갱신한다. 로드 전에는 섹터 피커에서 파생한 기본 시드를 쓴다.
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>(DEFAULT_DOMAIN_GROUPS);
  const [editingDomains, setEditingDomains] = useState(false);
  const [domainTab, setDomainTab] = useState<string | null>(null);
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
        // 섹터·종목 선택은 각 탭(CompanyReportsView·섹터 리서치)의 파생 값 기반
        // reconciliation 이펙트가 맞춘다(그룹 설정이 나중에 로드돼도 자동 반영).
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 보유 종목 티커 로드('보유 종목 보고서' 탭의 필터). 포트폴리오 배너와 같은
  // /api/holdings 를 공유 요청(fetchHoldingsShared)으로 쓰므로 중복 호출은 없다.
  // 캐시가 있으면 먼저 그것으로 채워 탭이 즉시 그려지게 한다.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) {
      setHoldingTickers(holdingsCache.map((h) => h.ticker.toUpperCase()));
    }
    let cancelled = false;
    fetchHoldingsShared()
      .then((d) => {
        if (cancelled || !Array.isArray(d.holdings)) return;
        // 에러 응답의 빈 배열로 캐시 값을 '보유 없음'으로 덮지 않는다.
        if (d.error && d.holdings.length === 0) return;
        setHoldingTickers((d.holdings as Holding[]).map((h) => h.ticker.toUpperCase()));
      })
      .catch(() => {
        // 실패 시 캐시(있으면) 유지 — 탭은 안내 문구로 폴백한다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 파생 데이터는 useMemo 로 캐시한다 — HomeView 는 상태가 많아 자주 리렌더되는데,
  // 아래 스캔·정렬(특히 screenByCompany 의 O(companies×files))을 매 렌더마다 다시 돌면
  // 불필요한 비용이 든다(TASK-48).
  // 종목 축 목록. 'bottleneck-map' 은 티커 폴더가 아니라 병목 신호 저장소인데
  // publish_report.py 의 company_from_path 가 reports/{2번째 세그먼트}를 티커로 읽어
  // 가짜 종목으로 섞인다 → 여기서 걸러내고 '병목 신호' 탭이 따로 다룬다.
  const companies = useMemo<string[]>(
    () =>
      files
        ? Array.from(
            new Set(
              files
                .map((f) => f.company)
                .filter((c): c is string => c !== null && !isBottleneckCompany(c))
            )
          ).sort()
        : [],
    [files]
  );
  // 루트 레벨 보고서(회사 폴더 밖)는 섹터/스크리닝 결과물이다 → '섹터 리서치' 탭에서 보여준다.
  // 단, 섹터 리서치가 아닌 루트 문서는 제외한다:
  //   - portfolio-latest.md : '포트폴리오 점검' 탭 소관
  //   - track-record.md     : 수기 매매기록(자동 채점 '트랙레코드' 탭과 별개) — 섹터가 아님
  //   - {주제}-article-*.md : 발행용 글 — '아티클' 탭 소관. 파일명이 섹터 규약과 안 맞아
  //                           걸러내지 않으면 섹터 리서치의 '기타'로 섞인다.
  const rootFiles = useMemo(
    () =>
      files
        ? files.filter(
            (f) => f.company === null && !ROOT_NON_SECTOR.has(f.name) && !isArticlePath(f.path)
          )
        : [],
    [files]
  );
  const portfolioReport = useMemo(
    () => files?.find((f) => f.company === null && f.name === "portfolio-latest.md") ?? null,
    [files]
  );
  // 표시에 쓰는 실효 섹터 그룹 = 수동 그룹 + 자동 맵(수동 우선, 빈 곳만 자동 — TASK-90).
  // 섹터 리서치에서 나온 종목은 퍼널 보고서 마커로 자동 배정되므로 그룹 편집이 필요 없다.
  const effectiveSectorGroups = useMemo(
    () => mergeAutoSectorGroups(sectorGroups, sectorAutoMap),
    [sectorGroups, sectorAutoMap]
  );
  // 사용자 그룹 설정에 종속된 섹터 판정. sectorGroups가 바뀌면 아래 값들도 갱신된다.
  const sectorOf = useCallback(
    (company: string) => sectorOfWith(effectiveSectorGroups, company),
    [effectiveSectorGroups]
  );
  // 섹터 → 분야 판정. 섹터 리서치 탭(섹터명이 파일명에서 옴)과 종목 축 보고서 탭
  // (섹터명이 사용자 종목 그룹명)이 같은 분야 그룹 표를 공유한다(TASK-81/84).
  const domainOf = useCallback(
    (sector: string) => domainOfSector(domainGroups, sector),
    [domainGroups]
  );
  // 보고서가 존재하는 티커(대문자) — 포트폴리오 카드 드릴다운 가능 여부 판정(TASK-77).
  const reportedTickers = useMemo(() => new Set(companies.map((c) => c.toUpperCase())), [companies]);
  // 보유 종목 → 그 티커의 '보유 종목 보고서'로 이동. 실보유(포트폴리오)와 분석(보고서)을
  // 티커 축으로 잇는다. 선택 위계 정렬은 CompanyReportsView가 focusTicker로 처리한다.
  const drillToTicker = useCallback((ticker: string) => {
    setReportFocus((prev) => ({ ticker, nonce: (prev?.nonce ?? 0) + 1 }));
    setFlowTab("holdings-reports");
  }, []);
  // '보유 종목 보고서' 탭이 다룰 종목 = 보고서가 있는 종목 ∩ 보유 종목(대문자 비교).
  const holdingCompanies = useMemo(() => {
    if (!holdingTickers) return [];
    const held = new Set(holdingTickers);
    return companies.filter((c) => held.has(c.toUpperCase()));
  }, [companies, holdingTickers]);
  // 보유 탭이 비었을 때의 사유 구분: 아직 로드 전 / 보유 없음 / 보유했지만 보고서 없음.
  const holdingsEmptyText =
    holdingTickers === null
      ? "보유 정보를 불러오는 중..."
      : holdingTickers.length === 0
        ? "보유한 해외주식이 없습니다."
        : "보유 종목 중 보고서가 있는 종목이 없습니다.";

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

  // 섹터 리서치 탭: 루트 파일을 섹터명으로 묶는다 (2차 = 섹터).
  const sectors = useMemo(
    () => Array.from(new Set(rootFiles.map((f) => getSectorReportInfo(f.name).sector))).sort(),
    [rootFiles]
  );
  // 1차 = 분야(도메인). 섹터명을 사용자 그룹 설정으로 유관 분야에 묶는다(TASK-81).
  // 판정 함수 domainOf 는 종목 축과 공유하므로 위쪽에 한 번만 정의한다(TASK-84).
  // 보고서가 존재하는 분야만, 그룹 순서대로(미분류는 맨 끝).
  const sectorDomains = useMemo(() => orderedDomains(domainGroups, sectors), [domainGroups, sectors]);
  // 선택된 분야에 속한 섹터만. 분야 미선택 시(로드 전) 전체.
  const domainSectors = useMemo(
    () => (domainTab ? sectorsInDomain(domainGroups, sectors, domainTab) : sectors),
    [domainTab, domainGroups, sectors]
  );
  // 분야 그룹 편집 모달에 올릴 '섹터명' 후보 목록. 분야 표를 두 탭이 공유하므로
  // 섹터 리서치 축(루트 보고서 파일명에서 파싱한 섹터명)과 종목 축(사용자 종목 그룹명)의
  // 합집합을 보여준다 — 그래야 '반도체·AI' 같은 종목 그룹명도 분야에 넣을 수 있다(TASK-84).
  const domainEditorSectors = useMemo(
    () => Array.from(new Set([...sectors, ...effectiveSectorGroups.map((g) => g.name)])).sort(),
    [sectors, effectiveSectorGroups]
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

  // 저장된 섹터 그룹 설정을 서버(data/sector-groups.json)에서 불러온다. 실패 시 기본값 유지.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sector-groups")
      .then(readJsonSafe)
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.groups)) setSectorGroups(d.groups);
        // 자동 맵은 같은 응답에 실려 온다(서버가 보고서 마커에서 요청 시점에 파생).
        if (d.autoMap && typeof d.autoMap === "object") setSectorAutoMap(d.autoMap);
      })
      .catch(() => {
        // 네트워크 실패 시 화면엔 기본 그룹이 유지된다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 섹터 그룹 저장: 화면 즉시 갱신(낙관적) + 서버(JSON 파일) 영속화.
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

  // 저장된 분야 그룹 설정을 서버(data/sector-domain-groups.json)에서 불러온다. 실패 시 기본 시드 유지.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sector-domain-groups")
      .then(readJsonSafe)
      .then((d) => {
        if (!cancelled && Array.isArray(d.groups)) setDomainGroups(d.groups);
      })
      .catch(() => {
        // 네트워크 실패 시 화면엔 기본 분야 그룹이 유지된다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 분야 그룹 저장: 화면 즉시 갱신(낙관적) + 서버(JSON 파일) 영속화.
  const saveDomainGroups = (groups: DomainGroup[]) => {
    setDomainGroups(groups);
    fetch("/api/sector-domain-groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    }).catch(() => {
      // 저장 실패는 무시(현재 세션 표시엔 반영됨). 새로고침 시 서버 값으로 되돌아갈 수 있음.
    });
  };

  // 분야 목록이 바뀌면(로드·그룹 편집) 섹터 리서치 1차 탭을 유효한 값으로 맞춘다.
  const domainKey = sectorDomains.join("|");
  useEffect(() => {
    setDomainTab((prev) => (prev && sectorDomains.includes(prev) ? prev : (sectorDomains[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainKey]);

  // 분야가 바뀌거나 그 분야 구성원이 바뀌면 2차(섹터) 선택을 유효한 값으로 맞춘다
  // (현재 섹터가 이 분야에 속해 있으면 유지). domainSectors 는 files 파생이라
  // 보고서 로드도 이 키로 같이 커버된다.
  const domainSectorsKey = domainSectors.join("|");
  useEffect(() => {
    setSectorTab((prev) => (prev && domainSectors.includes(prev) ? prev : (domainSectors[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainTab, domainSectorsKey]);

  // 섹터 탭이 바뀌거나 목록이 로드되면 선택 보고서를 그 섹터의 첫 보고서로 맞춘다.
  useEffect(() => {
    setSectorReport((prev) =>
      prev && sectorCurrentFiles.some((f) => f.path === prev) ? prev : (sectorCurrentFiles[0]?.path ?? null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorTab, files]);

  // 사이드바/모바일 공용 네비. 비슷한 성격끼리 그룹으로 묶는다:
  //  개요(대시보드) · 결과물(보고서) · 리서치 프로세스(실행 플로우)
  const navGroups = [
    {
      label: "개요",
      items: [
        { id: "portfolio-overview", label: "포트폴리오" },
        { id: "track-record", label: "트랙레코드" },
        // 매일 09:00 자동 스캔이 남기는 공급망 병목 신호(S3). 사람이 실행하는 다른
        // 탭과 달리 '들여다보는' 성격이라 개요 그룹에 둔다.
        { id: "bottleneck-signals", label: "병목 신호" },
      ],
    },
    {
      label: "결과물",
      items: [
        { id: "sector-reports", label: "섹터 리서치" },
        // 보유 종목만 모아 보는 탭이 먼저 — 실제로 들고 있는 종목의 판단이 우선(TASK-86).
        { id: "holdings-reports", label: "보유 종목 보고서" },
        { id: "reports", label: "전체 보고서" },
        // 발행용 글(/investment-article). 다른 결과물이 '내 판단용'이라면 이건 '남에게
        // 보여줄 것'이라 축이 종목·섹터가 아니라 발행 상태다 → 결과물 그룹의 맨 끝.
        { id: "articles", label: "아티클" },
      ],
    },
    {
      label: "리서치 프로세스",
      // 'discovery'는 결과물 탭(섹터/종목)의 실행 카드로, 'portfolio'(분기 점검)는
      // 포트폴리오 탭 안으로 흡수했으므로(TASK-73) nav 항목에서 제외한다.
      items: [
        ...flows
          .filter((f) => f.id !== "discovery" && f.id !== "portfolio")
          .map((f) => ({ id: f.id, label: f.title })),
      ],
    },
  ];
  // 모바일 가로 탭 로우와 각종 조회는 평탄화한 목록을 쓴다.
  const contentTabs = navGroups.flatMap((g) => g.items);
  const activeFlow = flows.find((f) => f.id === flowTab);
  const headerEyebrow = TAB_HEADERS[flowTab]?.eyebrow ?? flowTab.toUpperCase();
  const headerTitle = TAB_HEADERS[flowTab]?.title ?? activeFlow?.title ?? "";
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
      // 선택 보고서 정리는 목록 갱신(reloadKey) 후 CompanyReportsView의 파생 이펙트가
      // 유효하지 않은 선택을 첫 보고서로 되돌린다.
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
            <div className="flex flex-col gap-8">
              <div>
                <HoldingsBanner
                  screenByCompany={screenByCompany}
                  sectorOf={sectorOf}
                  reportedTickers={reportedTickers}
                  onDrill={drillToTicker}
                />
                {/* 당일 등락 체크 — 포트폴리오와 동일한 /api/holdings를 쓰므로 같은 페이지에 배치 */}
                <DailyCheckView />
              </div>

              {/* ── 분기 포트폴리오 점검 (축소): 분기 1회만 쓰는 기능이라 카드 4개 대신
                  실행 버튼 1개 + 최신 보고서 링크로 슬림화. 분기 타이밍 안내는 모달로. ── */}
              {(() => {
                const pf = flows.find((f) => f.id === "portfolio");
                if (!pf) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-6">
                    <button
                      onClick={() => onOpenFlowModal(pf)}
                      className="rounded-full border border-hairline px-4 py-2 text-sm text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                    >
                      분기 포트폴리오 점검 →
                    </button>
                    {portfolioReport ? (
                      <button
                        onClick={() => setModalPath(portfolioReport.path)}
                        className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-2 text-xs text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                      >
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-rose-300 bg-rose-500/10">
                          최신 점검
                        </span>
                        <span className="font-mono text-body truncate max-w-[220px]">{portfolioReport.name}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-mute">아직 점검 보고서 없음</span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : flowTab === "track-record" ? (
            /* 트랙레코드 = 콜(예측) 자동 채점만. 수기 매매기록(실보유)은 포트폴리오 탭으로 이동(TASK-74). */
            <TrackRecordView />
          ) : flowTab === "bottleneck-signals" ? (
            /* 병목 신호 = 매일 09:00 자동 스캔(S3 /bottleneck-hunter) 산출물 피드. */
            <BottleneckSignalsView
              files={files}
              loadError={loadError}
              onRetry={() => setReloadKey((k) => k + 1)}
              onOpenReport={(p) => setModalPath(p)}
            />
          ) : flowTab === "articles" ? (
            /* 아티클 = /investment-article 산출물 + 그 소재가 되는 보고서의 실행 명령. */
            <ArticlesView
              files={files}
              loadError={loadError}
              onRetry={() => setReloadKey((k) => k + 1)}
              onOpenReport={(p) => setModalPath(p)}
            />
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
                  {/* ── 선별 레이어: 분야(1차) → 섹터(2차) ──
                      종목 축 보고서 탭의 '종목 선택' 카드와 동일한 패턴. 분야 분류는
                      프로세스 가이드 '섹터 구조 파악'의 섹터 피커와 같은 표에서 오고,
                      '그룹 편집'으로 사용자가 덮어쓸 수 있다(TASK-81/82). */}
                  <div className="mb-6 rounded-lg border border-hairline bg-canvas-card p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="eyebrow text-[10px] text-ink">섹터 선택</span>
                      <button
                        onClick={() => setEditingDomains(true)}
                        className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                      >
                        그룹 편집
                      </button>
                    </div>

                    {/* 1차: 분야 */}
                    <div className="mb-4">
                      <div className="eyebrow text-[10px] text-mute mb-1.5">분야</div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {sectorDomains.map((d) => {
                          const count = sectors.filter((s) => domainOf(s) === d).length;
                          return (
                            <button
                              key={d}
                              onClick={() => {
                                setDomainTab(d);
                                const first = sectors.find((s) => domainOf(s) === d);
                                if (first) setSectorTab(first);
                              }}
                              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 flex items-center gap-1.5 ${
                                domainTab === d ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                              }`}
                            >
                              {d}
                              <span className={domainTab === d ? "text-canvas/60" : "text-mute"}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2차: 선택 분야 안의 섹터 */}
                    <div className="border-t border-hairline pt-4">
                      <div className="eyebrow text-[10px] text-mute mb-2">섹터</div>
                      <div className="flex flex-wrap gap-1">
                        {domainSectors.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSectorTab(s)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
                              sectorTab === s ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 섹터 상세: 유형(3차) → 생성일자(4차) 위계 + 선택 보고서 인라인 표시 */}
                  {(() => {
                    const selFile = sectorCurrentFiles.find((f) => f.path === sectorReport) ?? null;
                    const activeKind = selFile ? getSectorReportInfo(selFile.name).kind : null;
                    // 파일이 있는 유형만 3차 탭으로 노출(순서는 SECTOR_SECTIONS).
                    const activeSections = SECTOR_SECTIONS.filter((s) =>
                      sectorCurrentFiles.some((f) => getSectorReportInfo(f.name).kind === s.id)
                    );
                    // 선택된 유형의 보고서들(생성일자 = 4차). 하나뿐이면 4차 탭은 생략.
                    const kindFiles = activeKind
                      ? sectorCurrentFiles.filter((f) => getSectorReportInfo(f.name).kind === activeKind)
                      : [];
                    const badge = selFile ? getFileBadge(selFile.name) : null;
                    const resultPill = getResultPill(selFile?.summary);
                    const confPill = getConfidencePill(selFile?.confidence);
                    return (
                      <div className="flex flex-col gap-4">
                        {/* 3차: 보고서 유형 */}
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

                        {/* 4차: 생성일자(같은 유형에 보고서가 둘 이상일 때만) */}
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
                              <ReportContentView path={selFile.path} onOpenReport={setModalPath} />
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
          ) : flowTab === "reports" || flowTab === "holdings-reports" ? (
            /* ── 종목 축 보고서 — '전체 보고서'와 '보유 종목 보고서'가 같은 패널(레이아웃·
               위계·UI 동일)을 공유한다. 차이는 다룰 종목 목록뿐: 보유 탭은 보유 티커로
               좁힌다. 선택 상태는 탭마다 독립(외곽 tab-panel의 key로 재마운트) — TASK-86. */
            <CompanyReportsView
              key={flowTab}
              files={files}
              companies={flowTab === "holdings-reports" ? holdingCompanies : companies}
              loadError={loadError}
              onRetry={() => setReloadKey((k) => k + 1)}
              sectorGroups={effectiveSectorGroups}
              domainGroups={domainGroups}
              screenByCompany={screenByCompany}
              onEditSectorGroups={() => setEditingSectors(true)}
              onEditDomainGroups={() => setEditingDomains(true)}
              onLaunchStep={onLaunchStep}
              onOpenReport={setModalPath}
              onRequestDelete={(p) => {
                setDeleteError(null);
                setDeletePath(p);
              }}
              focusTicker={flowTab === "holdings-reports" ? reportFocus : null}
              // 보유 종목은 몇 개뿐 → 분야·섹터 필터 없이 종목 칩만 바로 노출(TASK-87).
              flatCompanyPicker={flowTab === "holdings-reports"}
              emptyText={
                flowTab === "holdings-reports" ? holdingsEmptyText : "아직 보고서가 없습니다."
              }
            />
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
              // 종목 축 보고서 탭 상단 실행 카드 ROW와 동일 패턴 — 카드를 누르면
              // 그 단계 하나만 onLaunchStep 모달로 띄운다(홈 컨텍스트 유지).
              return (
                <div>
                  <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
                  {/* 실적 점검 플로우: 보유 종목의 실적 발표일 캘린더를 위에 얹어
                      "언제 점검할지"를 안내한다. '분석'은 1단계를 티커 프리필로 연다. */}
                  {flow.id === "earnings" && (
                    <EarningsCalendar
                      onAnalyze={(ticker) => onLaunchStep(flow, 0, ticker)}
                      files={files}
                    />
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
          // 저장 대상은 수동 그룹만. 자동 배정분은 '미분류'가 아니라는 표시로만 넘긴다(TASK-90).
          autoLabels={sectorAutoMap}
          onSave={(g) => {
            saveSectorGroups(g);
            setEditingSectors(false);
          }}
          onClose={() => setEditingSectors(false)}
        />
      )}
      {/* 분야 그룹 편집 — 같은 모달을 '섹터명 → 분야' 축으로 쓴다(TASK-82).
          섹터 리서치 탭과 종목 축 보고서 탭이 이 표를 공유하므로 두 탭에서 모두 열린다(TASK-84). */}
      {editingDomains && (
        <SectorGroupEditor
          companies={domainEditorSectors}
          groups={domainGroups}
          onSave={(g) => {
            saveDomainGroups(g);
            setEditingDomains(false);
          }}
          onClose={() => setEditingDomains(false)}
          title="분야 그룹 편집"
          eyebrow="SECTOR DOMAINS"
          itemNoun="섹터"
          namePlaceholder="분야 이름 (예: 헬스케어)"
          upperCaseItems={false}
        />
      )}
    </div>
  );
}
