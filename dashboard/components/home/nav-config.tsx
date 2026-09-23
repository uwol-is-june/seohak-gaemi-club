/**
 * HomeView 의 네비게이션 설정과 순수 헬퍼.
 *
 * HomeView 본체는 상태와 화면만 들고, "무엇이 어느 서브메뉴에 속하는가" 같은
 * 정적 규칙은 여기로 모은다. 상태에 의존하지 않으므로 단독으로 읽고 고칠 수 있다.
 */

import { DISCOVERY_SECTOR_GROUPS } from "@/lib/flows";
import { UNCLASSIFIED_DOMAIN } from "@/lib/sector-domains";
import type { NavIconName } from "./nav-icons";

// 루트에 있지만 '섹터 리서치'가 아닌 문서(각자 전용 탭이 따로 있음).
export const ROOT_NON_SECTOR = new Set(["portfolio-latest.md", "track-record.md"]);

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
export type DomainPick = { kind: "sector"; path: string } | { kind: "company"; ticker: string };

export const DOMAIN_TAB_PREFIX = "domain:";
export const DOMAIN_TABS = [...DISCOVERY_SECTOR_GROUPS.map((g) => g.label), UNCLASSIFIED_DOMAIN];

// 좌측 nav 드릴다운(TASK-96). 항목을 최상위에 다 펼치면 사이드바가 화면을 넘겨서,
// 성격이 같은 덩어리(점검·보고서)는 탭 하나로 접고 누르면 사이드바가 통째로 하위 목록
// 화면으로 바뀐다. navView 는 **사이드바가 무엇을 그리는지**만 담는다 — 어느 탭이
// 열려 있는가는 여전히 flowTab 이 유일한 출처다(둘을 합치면 '뒤로'가 탭까지 닫아버린다).
export type NavView = "root" | "inspect" | "reports";
export type NavItem = { id: string; label: string; icon?: NavIconName; count?: number | null };
// 최상위 nav 한 칸 — 바로 탭을 여는 항목이거나, 하위 목록으로 들어가는 입구다.
export type NavEntry = { kind: "item"; item: NavItem } | { kind: "drill"; view: Exclude<NavView, "root"> };

// '점검' 서브메뉴에 들어갈 flows 항목. flows.filter(id !== "discovery") 로 받아오면
// flows 에 새 플로우가 늘 때 최상위로 새 나가므로 id 를 명시한다.
export const INSPECT_FLOW_IDS = ["earnings", "portfolio"];
// 사람이 실행하는 위 둘과 달리 '들여다보는' 성격이지만, 보유를 주기적으로 점검한다는
// 축은 같아서 점검에 함께 둔다.
export const INSPECT_EXTRA_IDS = ["bottleneck-signals"];

// flowTab → 그 탭이 속한 서브메뉴. 외부에서 탭으로 점프할 때(포트폴리오 카드 → 분야 탭)
// 사이드바도 같이 열어두려면 이 판정이 한 곳에 있어야 한다.
export function navViewOfTab(tab: string): NavView {
  if (tab.startsWith(DOMAIN_TAB_PREFIX)) return "reports";
  if (INSPECT_FLOW_IDS.includes(tab) || INSPECT_EXTRA_IDS.includes(tab)) return "inspect";
  return "root";
}

// 사이드바·서브메뉴 공용 버튼. 최상위 항목·드릴다운 입구·하위 항목이 같은 모양을 쓴다
// (드릴다운으로 들어가도 '다른 화면'이 아니라 같은 목록의 다음 단계로 읽히게).
// NavButton · NavChip 은 components/primitives/NavItem.tsx 로 옮겼다.
// (선택 상태를 흰 pill로 뒤집던 xAI 어휘 → 한 단 밝은 배경 + 굵은 글자)

// 탭별 상단바 라벨(eyebrow = GeistMono 대문자, title = 한글). 리서치 프로세스(flows)
// 탭은 여기 없고 activeFlow.title 로 폴백한다. 분야 탭도 여기 없고 분야명으로 폴백한다.
export const TAB_HEADERS: Record<string, { title: string }> = {
  "portfolio-overview": { title: "포트폴리오" },
  "track-record": { title: "트랙레코드" },
  "bottleneck-signals": { title: "병목 신호" },
  articles: { title: "아티클" },
};

// 분야 탭 상단바의 도구 아이콘. 누르면 '새 리서치 시작' 모달이 열린다(TASK-91).
// 데스크톱 상단바와 모바일 상단바 양쪽에 같은 버튼을 쓴다 — 모바일엔 데스크톱
// 상단바가 없어 여기서 빠지면 분야 탭에서 리서치를 시작할 길이 사라진다.
export function ResearchLaunchButton({ onClick }: { onClick: () => void }) {
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
