"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flows, DISCOVERY_SECTOR_GROUPS, type Flow } from "@/lib/flows";
import { ReportFile } from "@/lib/reports-store";
import { type SectorGroup, DEFAULT_SECTOR_GROUPS, DEFAULT_DOMAIN_GROUPS, UNCLASSIFIED_SECTOR, SCREEN_GROUPS, sectorOfWith, getSectorReportInfo, SECTOR_SECTIONS, reportDateLabel } from "@/lib/report-helpers";
import { canonicalSector, domainOfSector, mergeAutoSectorGroups, sectorsInDomain, UNCLASSIFIED_DOMAIN, type AutoSectorMap, type DomainGroup } from "@/lib/sector-domains";
import { ReportContentView } from "./ReportContentView";
import { ReportModal } from "./ReportModal";
import { CompanyReportBrowser } from "./CompanyReportBrowser";
import { HoldingsBanner } from "./HoldingsBanner";
import { DailyCheckView } from "./DailyCheckView";
import { TrackRecordView } from "./TrackRecordView";
import { EarningsCalendar } from "./EarningsCalendar";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { SectorGroupEditor } from "./SectorGroupEditor";
import { BottleneckSignalsView } from "./BottleneckSignalsView";
import { ArticlesView } from "./ArticlesView";
import { ResearchLaunchModal } from "./ResearchLaunchModal";
import { CollapsibleReportCard } from "./CollapsibleReportCard";
import { isBottleneckCompany } from "@/lib/bottleneck";
import { isArticlePath } from "@/lib/articles";
import { quarterDue, quarterBadge, fmtDue } from "@/lib/quarter-due";

// 루트에 있지만 '섹터 리서치'가 아닌 문서(각자 전용 탭이 따로 있음).
const ROOT_NON_SECTOR = new Set(["portfolio-latest.md", "track-record.md"]);

// 좌측 nav의 '분야' 탭(TASK-91). 리서치 단계(프로세스) 축과 별개로, 분야를 1차 축으로
// 삼아 그 분야의 섹터 리서치 + 종목 보고서를 한 화면에서 본다. 분야명은 프로세스 가이드의
// 섹터 피커·분야 그룹 표와 **같은 목록**을 쓴다(flows.ts DISCOVERY_SECTOR_GROUPS) —
// 여기서 이름을 따로 적으면 표기가 갈려 분야 판정(domainOfSector)과 어긋난다.
// 맨 끝에 '미분류'를 붙인다 — 어느 분야에도 안 붙은 섹터·종목(domainOfSector가
// UNCLASSIFIED_DOMAIN을 주는 것들)을 찾아 '분야 그룹' 편집으로 분류하는 입구다.
// 화면 안 분야 칩(orderedDomains)과 달리 항목이 비어도 항상 노출한다 — nav 목록이
// 보고서 유무에 따라 늘었다 줄었다 하지 않게.
// 분야 탭에서 지금 보고 있는 대상. 섹터 줄 하나에 '섹터 보고서 유형'과 '그 섹터의 종목'이
// 나란히 서므로(TASK-91) 선택 상태도 하나로 합친다 — 둘 중 하나만 활성이다.
type DomainPick = { kind: "sector"; path: string } | { kind: "company"; ticker: string };

const DOMAIN_TAB_PREFIX = "domain:";
const DOMAIN_TABS = [...DISCOVERY_SECTOR_GROUPS.map((g) => g.label), UNCLASSIFIED_DOMAIN];

// 좌측 nav 드릴다운(TASK-96). 항목을 최상위에 다 펼치면 사이드바가 화면을 넘겨서,
// 성격이 같은 덩어리(점검·보고서)는 탭 하나로 접고 누르면 사이드바가 통째로 하위 목록
// 화면으로 바뀐다. navView 는 **사이드바가 무엇을 그리는지**만 담는다 — 어느 탭이
// 열려 있는가는 여전히 flowTab 이 유일한 출처다(둘을 합치면 '뒤로'가 탭까지 닫아버린다).
type NavView = "root" | "inspect" | "reports";
type NavItem = { id: string; label: string };
// 최상위 nav 한 칸 — 바로 탭을 여는 항목이거나, 하위 목록으로 들어가는 입구다.
type NavEntry = { kind: "item"; item: NavItem } | { kind: "drill"; view: Exclude<NavView, "root"> };

// '점검' 서브메뉴에 들어갈 flows 항목. flows.filter(id !== "discovery") 로 받아오면
// flows 에 새 플로우가 늘 때 최상위로 새 나가므로 id 를 명시한다.
const INSPECT_FLOW_IDS = ["earnings", "portfolio"];
// 사람이 실행하는 위 둘과 달리 '들여다보는' 성격이지만, 보유를 주기적으로 점검한다는
// 축은 같아서 점검에 함께 둔다.
const INSPECT_EXTRA_IDS = ["bottleneck-signals"];

// flowTab → 그 탭이 속한 서브메뉴. 외부에서 탭으로 점프할 때(포트폴리오 카드 → 분야 탭)
// 사이드바도 같이 열어두려면 이 판정이 한 곳에 있어야 한다.
function navViewOfTab(tab: string): NavView {
  if (tab.startsWith(DOMAIN_TAB_PREFIX)) return "reports";
  if (INSPECT_FLOW_IDS.includes(tab) || INSPECT_EXTRA_IDS.includes(tab)) return "inspect";
  return "root";
}

// 사이드바·서브메뉴 공용 버튼. 최상위 항목·드릴다운 입구·하위 항목이 같은 모양을 쓴다
// (드릴다운으로 들어가도 '다른 화면'이 아니라 같은 목록의 다음 단계로 읽히게).
function NavButton({
  label,
  active,
  onClick,
  chevron,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-white text-canvas" : "text-body hover:text-ink hover:bg-canvas-soft"
      }`}
    >
      <span className="flex-1 text-left truncate">{label}</span>
      {chevron && (
        <span className={`shrink-0 text-xs ${active ? "text-canvas/50" : "text-mute"}`} aria-hidden="true">
          &rsaquo;
        </span>
      )}
    </button>
  );
}

// 모바일 탭 로우용 칩. 데스크톱 NavButton 과 같은 드릴다운을 좁은 폭에서 표현한다.
function NavChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
        active ? "bg-white text-canvas" : "text-mute hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

// 탭별 상단바 라벨(eyebrow = GeistMono 대문자, title = 한글). 리서치 프로세스(flows)
// 탭은 여기 없고 activeFlow.title 로 폴백한다. 분야 탭도 여기 없고 분야명으로 폴백한다.
const TAB_HEADERS: Record<string, { eyebrow: string; title: string }> = {
  "portfolio-overview": { eyebrow: "PORTFOLIO", title: "포트폴리오" },
  "track-record": { eyebrow: "TRACK RECORD", title: "트랙레코드" },
  "bottleneck-signals": { eyebrow: "BOTTLENECK", title: "병목 신호" },
  articles: { eyebrow: "ARTICLES", title: "아티클" },
};

// 분야 탭 상단바의 도구 아이콘. 누르면 '새 리서치 시작' 모달이 열린다(TASK-91).
// 데스크톱 상단바와 모바일 상단바 양쪽에 같은 버튼을 쓴다 — 모바일엔 데스크톱
// 상단바가 없어 여기서 빠지면 분야 탭에서 리서치를 시작할 길이 사라진다.
function ResearchLaunchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="새 리서치 시작"
      aria-label="새 리서치 시작"
      className="shrink-0 rounded-full border border-hairline w-9 h-9 flex items-center justify-center text-mute hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
    >
      {/* 렌치 — 외부 아이콘 라이브러리 없이 인라인 SVG(currentColor로 hover까지 따라온다). */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4Z" />
        <path d="M19.7 11.3a4 4 0 0 1-5-5 4 4 0 0 1 5 5Z" />
      </svg>
    </button>
  );
}

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
  // 포트폴리오 카드 → 그 종목의 보고서로 가는 드릴다운 요청. 같은 티커를 다시 눌러도
  // 반응하도록 nonce를 올린다(아래 focus 이펙트가 섹터·선택을 맞춘다).
  const [reportFocus, setReportFocus] = useState<{ ticker: string; nonce: number } | null>(null);
  // 분야 탭 위계: 분야(좌측 nav) → 섹터 → [섹터 보고서 유형 | 종목] → 생성일자.
  // 분야 그룹(이름 + 포함 섹터명)은 서버(/api/sector-domain-groups)에서 불러오고,
  // 그룹 편집 모달에서 갱신한다. 로드 전에는 섹터 피커에서 파생한 기본 시드를 쓴다.
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>(DEFAULT_DOMAIN_GROUPS);
  const [editingDomains, setEditingDomains] = useState(false);
  const [sectorTab, setSectorTab] = useState<string | null>(null);
  // 섹터 안에서 무엇을 보고 있는가 — 섹터 보고서 한 건이거나, 그 섹터에서 뽑힌 종목 하나.
  // 둘이 같은 줄에 나란히 서므로(TASK-91) 선택도 하나의 상태로 합친다.
  const [pick, setPick] = useState<DomainPick | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  // 상단바 도구 아이콘이 연 실행 모달(null = 닫힘). 어느 플로우를 어느 자리에서
  // 열었는지 함께 들고 있는다 — 분야 탭이면 종목 발굴, 실적 점검 탭이면 실적 점검.
  const [launchTarget, setLaunchTarget] = useState<{ flowId: string; context: string } | null>(null);
  const [flowTab, setFlowTab] = useState<string>("portfolio-overview");
  // 사이드바가 지금 그리는 화면(TASK-96). 열려 있는 탭(flowTab)과 별개의 UI 상태다 —
  // 서브메뉴 안에서 '뒤로'를 눌러도 보고 있던 탭은 그대로 남아야 하기 때문이다.
  const [navView, setNavView] = useState<NavView>("root");
  // 전환 방향(들어감 = 오른쪽에서, 뒤로 = 왼쪽에서). 방향이 위계를 말해준다.
  const [navBack, setNavBack] = useState(false);
  const openDrill = useCallback((v: Exclude<NavView, "root">) => {
    setNavBack(false);
    setNavView(v);
  }, []);
  const closeDrill = useCallback(() => {
    setNavBack(true);
    setNavView("root");
  }, []);
  // 탭 전환의 단일 입구. 외부에서 점프해도(포트폴리오 카드 → 분야 탭) 사이드바가 해당
  // 서브메뉴를 연 채로 보이도록 navView 를 함께 맞춘다. 최상위 탭이면 root 로 되돌린다.
  const goToTab = useCallback((id: string) => {
    setFlowTab(id);
    const v = navViewOfTab(id);
    setNavBack(false);
    setNavView(v);
  }, []);
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
        // 섹터·선택 대상은 파생 값 기반 reconciliation 이펙트가 맞춘다
        // (그룹 설정이 나중에 로드돼도 자동 반영).
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 좌측 nav에서 분야 탭을 고른 상태면 그 분야명, 아니면 null(TASK-91).
  // 분야 선택은 nav(= flowTab)가 유일한 출처다 — 별도 상태로 들고 있지 않으므로
  // reconciliation 이펙트와 서로 되돌리며 싸울 일이 없다.
  const activeDomain = flowTab.startsWith(DOMAIN_TAB_PREFIX)
    ? flowTab.slice(DOMAIN_TAB_PREFIX.length)
    : null;

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
  // 루트 레벨 보고서(회사 폴더 밖)는 섹터/스크리닝 결과물이다 → 분야 탭의 섹터 리서치 영역에서 보여준다.
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
  // 포트폴리오 카드 → 그 종목이 속한 분야 탭으로 이동(TASK-91). 실보유(포트폴리오)와
  // 분석(보고서)을 티커 축으로 잇는다. 탭 안의 섹터·선택은 아래 focus 이펙트가 맞춘다.
  // 분야 판정이 안 되는 종목은 '미분류' 탭으로 간다 — 그쪽도 탭이 있으므로 막다른 길이 없다.
  const drillToTicker = useCallback(
    (ticker: string) => {
      setReportFocus((prev) => ({ ticker, nonce: (prev?.nonce ?? 0) + 1 }));
      // goToTab 을 거쳐야 사이드바가 '보고서' 서브메뉴를 연 상태로 따라온다(TASK-96).
      goToTab(`${DOMAIN_TAB_PREFIX}${domainOf(sectorOf(ticker))}`);
    },
    [domainOf, sectorOf, goToTab]
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

  // 루트 파일을 섹터명으로 묶는다 — 분야 탭의 섹터 칩 목록이 여기서 온다.
  const sectors = useMemo(
    () => Array.from(new Set(rootFiles.map((f) => getSectorReportInfo(f.name).sector))).sort(),
    [rootFiles]
  );
  // 선택된 분야에 속한 섹터만. 분야 미선택(분야 탭이 아님) 시 전체.
  // 판정 함수 domainOf 는 종목 축과 공유한다(TASK-84).
  const domainSectors = useMemo(
    () => (activeDomain ? sectorsInDomain(domainGroups, sectors, activeDomain) : sectors),
    [activeDomain, domainGroups, sectors]
  );
  // 분야 탭이 다룰 종목 = 보고서가 있는 종목 중 (종목→섹터→분야) 판정이 이 분야인 것.
  const domainCompanies = useMemo(
    () => (activeDomain ? companies.filter((c) => domainOf(sectorOf(c)) === activeDomain) : []),
    [activeDomain, companies, domainOf, sectorOf]
  );
  // 종목 → **정본 섹터명**(TASK-91). 종목 그룹명('AI Infra')을 리서치 섹터명
  // ('AI-Infrastructure')으로 접어, 퍼널이 뽑은 종목이 그 퍼널 보고서와 같은 섹터에 선다.
  // 어느 그룹에도 없는 종목은 '미분류'로 남긴다(접지 않는다).
  const companySector = useCallback(
    (c: string) => {
      const raw = sectorOf(c);
      return raw === UNCLASSIFIED_SECTOR ? UNCLASSIFIED_SECTOR : canonicalSector(sectors, raw);
    },
    [sectorOf, sectors]
  );
  // 이 분야의 **통합 섹터 축** = 리서치 섹터 ∪ 이 분야 종목들의 정본 섹터. 미분류는 맨 끝.
  // 리서치는 있는데 종목이 없는 섹터, 종목만 있고 리서치가 없는 섹터 둘 다 보여야 한다.
  const unifiedSectors = useMemo(() => {
    const out = [...domainSectors];
    for (const c of domainCompanies) {
      const s = companySector(c);
      if (s !== UNCLASSIFIED_SECTOR && !out.includes(s)) out.push(s);
    }
    if (domainCompanies.some((c) => companySector(c) === UNCLASSIFIED_SECTOR)) {
      out.push(UNCLASSIFIED_SECTOR);
    }
    return out;
  }, [domainSectors, domainCompanies, companySector]);
  // 선택된 섹터에 속한 종목.
  const sectorCompanies = useMemo(
    () => (sectorTab ? domainCompanies.filter((c) => companySector(c) === sectorTab) : []),
    [sectorTab, domainCompanies, companySector]
  );
  // 이 분야에 보여줄 것이 하나라도 있는가(없으면 빈 상태 안내).
  const hasDomainContent = unifiedSectors.length > 0;

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

  // 분야 탭이 바뀌거나 그 분야의 섹터 구성이 바뀌면 섹터 선택을 유효한 값으로 맞춘다
  // (현재 섹터가 이 분야에 있으면 유지). unifiedSectors 는 files 파생이라
  // 보고서 로드도 이 키로 같이 커버된다.
  const unifiedSectorsKey = unifiedSectors.join("|");
  useEffect(() => {
    setSectorTab((prev) => (prev && unifiedSectors.includes(prev) ? prev : (unifiedSectors[0] ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDomain, unifiedSectorsKey]);

  // 섹터가 바뀌거나 목록이 로드되면 선택 대상을 유효한 값으로 맞춘다.
  // 기본값은 **섹터 보고서 먼저** — 그 섹터를 왜 팠는지(구조·후보 압축)가 종목보다 앞선다.
  // 섹터 보고서가 없는 섹터(종목만 있는 경우)면 첫 종목으로 떨어진다.
  const sectorCompaniesKey = sectorCompanies.join("|");
  useEffect(() => {
    setPick((prev) => {
      if (prev?.kind === "sector" && sectorCurrentFiles.some((f) => f.path === prev.path)) return prev;
      if (prev?.kind === "company" && sectorCompanies.includes(prev.ticker)) return prev;
      if (sectorCurrentFiles[0]) return { kind: "sector", path: sectorCurrentFiles[0].path };
      if (sectorCompanies[0]) return { kind: "company", ticker: sectorCompanies[0] };
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorTab, files, sectorCompaniesKey]);

  // 포트폴리오 카드 드릴다운: 분야 탭까지는 drillToTicker 가 옮겨 놓았으니, 여기서는
  // 그 종목의 섹터·선택까지 맞춘다. 적용한 nonce 를 기억해 한 번만 반영한다 —
  // 그러지 않으면 이후 사용자가 직접 고른 섹터·종목을 되돌려버린다.
  const appliedFocusNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!reportFocus || appliedFocusNonce.current === reportFocus.nonce) return;
    const match = domainCompanies.find((c) => c.toUpperCase() === reportFocus.ticker.toUpperCase());
    if (!match) return; // 아직 목록 로드 전이면 다음 렌더에서 다시 시도
    appliedFocusNonce.current = reportFocus.nonce;
    setSectorTab(companySector(match));
    setPick({ kind: "company", ticker: match });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFocus, domainCompanies, companySector]);

  // 사이드바/모바일 공용 네비(TASK-96). 최상위에 보이는 것은 5칸뿐이고, 성격이 같은
  // 덩어리 둘(점검·보고서)은 드릴다운으로 접는다 — 누르면 사이드바가 하위 목록으로 바뀐다.
  const flowTitle = (id: string) => flows.find((f) => f.id === id)?.title ?? id;
  const DRILLS: Record<Exclude<NavView, "root">, { label: string; items: NavItem[] }> = {
    // 보유를 주기적으로 점검하는 일 셋. 실적 대응(/earnings-team)·분기 점검
    // (/portfolio-review)·자동 병목 스캔은 실행 주기가 다를 뿐 축이 같다.
    inspect: {
      label: "점검",
      items: [
        ...INSPECT_FLOW_IDS.map((id) => ({ id, label: flowTitle(id) })),
        { id: "bottleneck-signals", label: "병목 신호" },
      ],
    },
    // 보고서를 보는 **주 축**(TASK-91). 한 분야를 고르면 그 분야의 섹터 리서치와 종목
    // 보고서가 한 화면에 함께 온다. 미분류까지 있어 모든 보고서가 분야 중 정확히 하나에
    // 들어간다. 항목이 비어도 노출한다 — 목록이 보고서 유무에 따라 늘었다 줄지 않게.
    reports: {
      label: "보고서",
      items: DOMAIN_TABS.map((d) => ({ id: `${DOMAIN_TAB_PREFIX}${d}`, label: d })),
    },
  };

  const navGroups: { label: string | null; entries: NavEntry[] }[] = [
    {
      // 시간 축 — '지금 내 포지션이 어떤가'에 답하는 둘. 상시로 보므로 접지 않는다.
      label: "운용",
      entries: [
        { kind: "item", item: { id: "portfolio-overview", label: "포트폴리오" } },
        { kind: "item", item: { id: "track-record", label: "트랙레코드" } },
      ],
    },
    // 드릴다운 둘은 그룹 라벨 없이 나란히 선다 — 각자가 이미 묶음의 이름이다.
    { label: null, entries: [{ kind: "drill", view: "inspect" }, { kind: "drill", view: "reports" }] },
    {
      // 발행용 글(/investment-article). 다른 보고서가 '내 판단용'이라면 이건 '남에게
      // 보여줄 것'이라 축이 종목·분야가 아니라 발행 상태다.
      label: "발행",
      entries: [{ kind: "item", item: { id: "articles", label: "아티클" } }],
    },
  ];
  // 최상위에 실제로 보이는 칸들(모바일 탭 로우가 쓴다). 드릴다운 안쪽 항목은 여기 없다 —
  // 평탄화하면 접어둔 것이 그대로 다시 나와 드릴다운이 무의미해진다.
  const rootEntries = navGroups.flatMap((g) => g.entries);
  const activeFlow = flows.find((f) => f.id === flowTab);
  const headerEyebrow = activeDomain ? "DOMAIN" : (TAB_HEADERS[flowTab]?.eyebrow ?? flowTab.toUpperCase());
  const headerTitle = activeDomain ?? TAB_HEADERS[flowTab]?.title ?? activeFlow?.title ?? "";
  // 상단바 도구 아이콘이 열 실행 대상. 분야 탭이면 종목 발굴 플로우, 단계가 있는
  // 플로우 탭(실적 점검)이면 그 플로우. 그 외 탭(포트폴리오·트랙레코드…)은 아이콘 없음.
  const launchable: { flowId: string; context: string } | null = activeDomain
    ? { flowId: "discovery", context: activeDomain }
    : activeFlow?.steps?.length
      ? { flowId: activeFlow.id, context: activeFlow.title }
      : null;
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
      // 선택 보고서 정리는 목록 갱신(reloadKey) 후 파생 이펙트가
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
          <div className="eyebrow text-[10px]">SEOHAK GAEMI CLUB</div>
          <div className="mt-1.5 text-lg tracking-[-0.02em] text-ink">서학개미클럽</div>
        </div>
        {/* 드릴다운 네비(TASK-96) — 최상위 목록과 서브메뉴가 같은 자리를 번갈아 쓴다.
            key 를 navView 로 두면 전환 때 리마운트돼 방향 애니메이션이 매번 재생된다. */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {navView === "root" ? (
            <div
              key="root"
              className={`flex flex-col gap-4 ${navBack ? "nav-view-back" : "nav-view-forward"}`}
            >
              {navGroups.map((group, gi) => (
                <div key={group.label ?? `g${gi}`} className="flex flex-col gap-0.5">
                  {group.label && (
                    <div className="eyebrow text-[10px] px-3 pb-1 text-mute">{group.label}</div>
                  )}
                  {group.entries.map((e) =>
                    e.kind === "item" ? (
                      <NavButton
                        key={e.item.id}
                        label={e.item.label}
                        active={flowTab === e.item.id}
                        onClick={() => goToTab(e.item.id)}
                      />
                    ) : (
                      <NavButton
                        key={e.view}
                        label={DRILLS[e.view].label}
                        // 접힌 상태에서도 지금 보고 있는 탭이 어느 묶음 안인지 보이게 한다.
                        active={navViewOfTab(flowTab) === e.view}
                        chevron
                        onClick={() => openDrill(e.view)}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div key={navView} className="flex flex-col gap-0.5 nav-view-forward">
              <button
                onClick={closeDrill}
                className="w-full flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-mute hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <span aria-hidden="true">&larr;</span>
                뒤로
              </button>
              <div className="eyebrow text-[10px] px-3 pt-1 pb-1 text-mute">
                {DRILLS[navView].label}
              </div>
              {DRILLS[navView].items.map((t) => (
                <NavButton
                  key={t.id}
                  label={t.label}
                  active={flowTab === t.id}
                  onClick={() => goToTab(t.id)}
                />
              ))}
            </div>
          )}
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
          <span className="text-ink tracking-[-0.02em]">서학개미클럽</span>
          <div className="flex items-center gap-2">
            {/* 데스크톱 상단바의 도구 아이콘과 동일 — 모바일엔 그 상단바가 없어 여기 둔다. */}
            {launchable && <ResearchLaunchButton onClick={() => setLaunchTarget(launchable)} />}
            <button onClick={logout} className="rounded-full border border-hairline px-3 py-1 text-xs text-body active:scale-95">로그아웃</button>
          </div>
        </div>
        {/* 모바일 탭 로우 — 사이드바와 같은 드릴다운을 칩으로 옮긴 것(TASK-96).
            평탄화해서 전부 늘어놓으면 접어둔 항목이 그대로 다시 나온다. */}
        <div
          key={navView}
          className={`md:hidden px-5 py-3 border-b border-hairline flex gap-1 overflow-x-auto ${
            navView === "root" && navBack ? "nav-view-back" : "nav-view-forward"
          }`}
        >
          {navView === "root" ? (
            rootEntries.map((e) =>
              e.kind === "item" ? (
                <NavChip
                  key={e.item.id}
                  label={e.item.label}
                  active={flowTab === e.item.id}
                  onClick={() => goToTab(e.item.id)}
                />
              ) : (
                <NavChip
                  key={e.view}
                  label={`${DRILLS[e.view].label} ›`}
                  active={navViewOfTab(flowTab) === e.view}
                  onClick={() => openDrill(e.view)}
                />
              )
            )
          ) : (
            <>
              <NavChip label="← 뒤로" active={false} onClick={closeDrill} />
              {DRILLS[navView].items.map((t) => (
                <NavChip
                  key={t.id}
                  label={t.label}
                  active={flowTab === t.id}
                  onClick={() => goToTab(t.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* 데스크톱 상단바 — mono eyebrow + 페이지 타이틀 + primary 액션 */}
        <header className="hidden md:flex sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-hairline px-8 h-16 items-center justify-between">
          <div>
            <div className="eyebrow text-[10px]">{headerEyebrow}</div>
            <div className="text-lg tracking-[-0.02em] text-ink leading-tight">{headerTitle}</div>
          </div>
          {launchable && <ResearchLaunchButton onClick={() => setLaunchTarget(launchable)} />}
        </header>

        <div className="px-6 md:px-8 py-8 w-full max-w-7xl">
          <div className="mb-16">

          {/* ── 탭 콘텐츠 (전환 애니메이션) ── */}
          <div key={flowTab} className="tab-panel">
          {flowTab === "portfolio-overview" ? (
            <div className="flex flex-col gap-8">
              <div>
                <HoldingsBanner
                  reportedTickers={reportedTickers}
                  onDrill={drillToTicker}
                />
                {/* 당일 등락 체크 — 포트폴리오와 동일한 /api/holdings를 쓰므로 같은 페이지에 배치 */}
                <DailyCheckView />
              </div>

              {/* 분기 포트폴리오 점검은 자체 탭('포트폴리오 점검')으로 분리됐다(2026-08-12).
                  여기 있던 실행 버튼 + 최신 보고서 링크는 그 탭이 그대로 담당한다. */}
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
          ) : activeDomain ? (
            /* ── 분야 탭(TASK-91): 한 분야를 섹터 축과 종목 축 양쪽에서 본다 ──
                 · 위 = 섹터 리서치(/industry-research·/industry-funnel 등 루트 결과물)
                        1차 축(분야)은 좌측 nav가 맡으므로 여기선 섹터부터 고른다
                 · 아래 = 그 분야의 종목 보고서 */
            <div>
              {/* 1·2단계(섹터 구조 파악·후보 종목 압축) 실행은 상단바 도구 아이콘 →
                  ResearchLaunchModal 로 옮겼다. 본문 상시 노출은 보고서를 볼 때마다
                  자리를 차지해서. */}
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

              {files && !hasDomainContent && (
                <div className="rounded-lg border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center">
                  <p className="text-sm text-body">
                    아직 &apos;{activeDomain}&apos; 분야의 결과물이 없습니다.
                  </p>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed">
                    <code className="font-mono text-breeze">/industry-research {"{섹터}"}</code> 또는{" "}
                    <code className="font-mono text-breeze">/industry-funnel {"{섹터}"}</code>를 실행하면
                    이곳에 보고서가 나타납니다.
                  </p>
                </div>
              )}

              {files && hasDomainContent && (
                <>
                  {/* ── 선별 레이어: 이 분야 안의 섹터 ──
                      1차(분야)는 좌측 nav가 이미 정했으므로 이 카드는 섹터 한 줄뿐이다.
                      섹터 → 분야 / 종목 → 섹터 분류는 두 편집 버튼으로 덮어쓴다(TASK-81/82). */}
                  <div className="mb-6 rounded-lg border border-hairline bg-canvas-card p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="eyebrow text-[10px] text-mute">섹터</span>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => setEditingDomains(true)}
                          className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                        >
                          분야 그룹
                        </button>
                        <button
                          onClick={() => setEditingSectors(true)}
                          className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                        >
                          종목 그룹
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {unifiedSectors.map((s) => {
                        const n = domainCompanies.filter((c) => companySector(c) === s).length;
                        return (
                          <button
                            key={s}
                            onClick={() => setSectorTab(s)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 flex items-center gap-1.5 ${
                              sectorTab === s ? "bg-white text-canvas" : "text-mute hover:text-ink hover:bg-canvas-soft"
                            }`}
                          >
                            {s}
                            {n > 0 && (
                              <span className={sectorTab === s ? "text-canvas/60" : "text-mute"}>{n}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 섹터 상세 ──
                      한 줄에 [섹터 보고서 유형] + [그 섹터에서 뽑힌 종목]을 나란히 놓는다.
                      퍼널이 종목을 뽑은 단위가 섹터이므로, 'AI-Infrastructure 후보 압축'과
                      거기서 나온 CEG·VRT·POWL 이 떨어져 있을 이유가 없다(TASK-91). */}
                  {(() => {
                    const selFile =
                      pick?.kind === "sector"
                        ? (sectorCurrentFiles.find((f) => f.path === pick.path) ?? null)
                        : null;
                    const activeKind = selFile ? getSectorReportInfo(selFile.name).kind : null;
                    // 파일이 있는 유형만 노출(순서는 SECTOR_SECTIONS).
                    const activeSections = SECTOR_SECTIONS.filter((s) =>
                      sectorCurrentFiles.some((f) => getSectorReportInfo(f.name).kind === s.id)
                    );
                    // 선택된 유형의 보고서들(생성일자). 하나뿐이면 일자 줄은 생략.
                    const kindFiles = activeKind
                      ? sectorCurrentFiles.filter((f) => getSectorReportInfo(f.name).kind === activeKind)
                      : [];
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeSections.map((section) => {
                            const active = section.id === activeKind;
                            return (
                              <button
                                key={section.id}
                                onClick={() => {
                                  const first = sectorCurrentFiles.find(
                                    (f) => getSectorReportInfo(f.name).kind === section.id
                                  );
                                  if (first) setPick({ kind: "sector", path: first.path });
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
                          {/* 섹터 보고서와 종목 사이 경계. 둘 다 있을 때만 긋는다. */}
                          {activeSections.length > 0 && sectorCompanies.length > 0 && (
                            <span className="mx-1 h-4 w-px bg-hairline shrink-0" aria-hidden="true" />
                          )}
                          {sectorCompanies.map((c) => {
                            const active = pick?.kind === "company" && pick.ticker === c;
                            const g = SCREEN_GROUPS.find((x) => x.match(screenByCompany[c] ?? null));
                            return (
                              <button
                                key={c}
                                onClick={() => setPick({ kind: "company", ticker: c })}
                                title={screenByCompany[c] ?? "미검사"}
                                className={`shrink-0 rounded-full pl-2 pr-3 py-1.5 text-xs font-mono font-medium border transition-colors active:scale-95 flex items-center gap-1.5 ${
                                  active
                                    ? "bg-white text-canvas border-white"
                                    : "border-hairline text-body hover:text-ink hover:bg-canvas-soft"
                                }`}
                              >
                                {g && <span className={`inline-block w-1.5 h-1.5 rounded-full ${g.dot}`} />}
                                {c}
                              </button>
                            );
                          })}
                        </div>

                        {/* 섹터 보고서를 고른 경우: 생성일자(같은 유형에 둘 이상일 때) + 보고서 카드 */}
                        {pick?.kind === "sector" && kindFiles.length > 1 && (
                          <div className="flex flex-wrap items-center gap-1.5 border-l-2 border-hairline pl-3">
                            {kindFiles.map((f) => {
                              const active = pick.path === f.path;
                              return (
                                <button
                                  key={f.path}
                                  onClick={() => setPick({ kind: "sector", path: f.path })}
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

                        {selFile && (
                          <CollapsibleReportCard
                            key={selFile.path}
                            file={selFile}
                            onOpenReport={setModalPath}
                            onRequestDelete={(p) => {
                              setDeleteError(null);
                              setDeletePath(p);
                            }}
                          />
                        )}

                        {/* 종목을 고른 경우: 그 종목의 유형 → 일자 → 보고서 */}
                        {pick?.kind === "company" && (
                          <CompanyReportBrowser
                            key={pick.ticker}
                            files={files}
                            company={pick.ticker}
                            verdict={screenByCompany[pick.ticker] ?? null}
                            onOpenReport={setModalPath}
                            onRequestDelete={(p) => {
                              setDeleteError(null);
                              setDeletePath(p);
                            }}
                          />
                        )}

                        {!pick && <p className="text-xs text-mute">표시할 보고서가 없습니다.</p>}
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
                const today = new Date();
                // 최신 점검 보고서의 갱신 시각 — '이번 분기는 이미 했나'를 판정하는 근거.
                const reviewedAt = portfolioReport?.committedAt
                  ? new Date(portfolioReport.committedAt)
                  : null;
                const dues = flow.quarters.map((q) => ({
                  q,
                  due: quarterDue(q.dueMonth, q.dueDay, today, reviewedAt),
                }));
                // 지금 할 차례가 있으면 그것, 없으면 가장 가까운 다음 분기.
                const current =
                  dues.find((x) => x.due.state === "due" || x.due.state === "done") ??
                  dues.reduce((a, b) => (a.due.daysUntil <= b.due.daysUntil ? a : b));
                return (
                  <div>
                    {flow.subtitle && (
              <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
            )}
                    {/* 지금 언제인지 — 카드의 "5월 중순" 문자열만으론 오늘이 그때인지 알 수 없다. */}
                    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-hairline bg-canvas-card px-4 py-3 text-xs">
                      <span className="eyebrow text-[10px] shrink-0">다음 점검</span>
                      <span className="text-ink">{current.q.label}</span>
                      <span className="font-mono text-body">{fmtDue(current.due.date)}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          current.due.state === "done"
                            ? "text-emerald-300 bg-emerald-500/15"
                            : current.due.state === "due"
                              ? "text-sunset-soft bg-sunset/10"
                              : "border border-hairline text-mute"
                        }`}
                      >
                        {quarterBadge(current.due)}
                      </span>
                      <span className="text-mute">{current.q.note}</span>
                      {current.due.state === "due" && (
                        <span className="text-mute/70">
                          — 상단 도구 버튼에서 실행하세요
                        </span>
                      )}
                    </div>
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
                      {dues.map(({ q, due }) => (
                        <button
                          key={q.label}
                          onClick={() => onOpenFlowModal(flow)}
                          // 지금 할 차례인 분기는 테두리로 눈에 띄게 한다.
                          className={`text-left rounded-lg border bg-canvas-card p-5 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99] ${
                            due.state === "due" ? "border-white/30" : "border-hairline"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-base text-ink tracking-[-0.01em]">{q.label}</h3>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                due.state === "done"
                                  ? "text-emerald-300 bg-emerald-500/15"
                                  : due.state === "due"
                                    ? "text-sunset-soft bg-sunset/10"
                                    : "border border-hairline text-body"
                              }`}
                            >
                              {quarterBadge(due)}
                            </span>
                          </div>
                          <div className="mb-1.5 flex items-center gap-2 text-[11px]">
                            <span className="text-mute">{q.timing}</span>
                            <span className="font-mono text-mute/70">{fmtDue(due.date)}</span>
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

              // 일반 플로우(실적 점검 등). 단계 실행 카드는 상단바 도구 아이콘 →
              // ResearchLaunchModal 로 옮겼다(분야 탭과 같은 패턴) — 본문은 '언제
              // 점검할지'를 보는 캘린더만 남긴다.
              return (
                <div>
                  {flow.subtitle && (
              <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
            )}
                  {/* 실적 점검 플로우: 보유 종목의 실적 발표일 캘린더.
                      행의 '분석'은 1단계를 그 티커로 프리필해 연다. */}
                  {flow.id === "earnings" && (
                    <EarningsCalendar
                      onAnalyze={(ticker) => onLaunchStep(flow, 0, ticker)}
                      files={files}
                    />
                  )}
                </div>
              );
            })()
          )}
          </div>
        </div>
        </div>
      </main>

      {/* 상단바 도구 아이콘 → 그 탭의 플로우 실행. 단계를 고르면 이 모달은 닫고
          ProcessStepModal(onLaunchStep)로 넘긴다 — 모달 두 겹이 쌓이지 않게. */}
      {launchTarget && (
        <ResearchLaunchModal
          flowId={launchTarget.flowId}
          context={launchTarget.context}
          onLaunch={(stepIndex) => {
            const flow = flows.find((f) => f.id === launchTarget.flowId);
            setLaunchTarget(null);
            if (flow) onLaunchStep(flow, stepIndex);
          }}
          onClose={() => setLaunchTarget(null)}
        />
      )}
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
