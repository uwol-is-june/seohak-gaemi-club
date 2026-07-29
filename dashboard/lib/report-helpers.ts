// 보고서/섹터/종목 표시에 쓰는 순수 헬퍼·타입·데이터 테이블 모음.
// React 의존 없음 — page.tsx 와 components/ 가 공유한다(TASK-46 분해).
import { type FlowStep, DISCOVERY_SECTOR_GROUPS } from "@/lib/flows";
import { deriveDomainGroups, type DomainGroup } from "@/lib/sector-domains";
import type { ReportFile } from "@/lib/reports-store";

// ─── Color config ──────────────────────────────────────────────────────────

// xAI 원칙: 인터랙티브 어휘는 '화이트 pill' 하나. 주요 액션은 화이트-필 pill,
// 나머지는 화이트-아웃라인 pill. 컬러 액센트는 코드/일러스트에만 드물게.
export const colorConfig = {
  brand: {
    border: "border-hairline",
    bg: "bg-white/10",
    text: "text-ink",
    button: "bg-white text-canvas hover:bg-white/90", // 화이트-필 primary pill
    progress: "bg-white",
    command: "text-breeze", // 코드 컨텍스트의 드문 액센트 (soft blue)
    dot: "bg-white",
  },
} as const;

export type ColorKey = keyof typeof colorConfig;

// ─── Helpers ───────────────────────────────────────────────────────────────

export type FileBadge = { label: string; color: string };

export function getFileBadge(filename: string): FileBadge {
  if (filename === "README.md") return { label: "개요", color: "text-body bg-canvas-soft" };
  if (/^01-/i.test(filename)) return { label: "DYP 관점", color: "text-emerald-400 bg-emerald-500/10" };
  if (/^02-/i.test(filename)) return { label: "버핏 관점", color: "text-breeze bg-breeze/10" };
  if (/^03-/i.test(filename)) return { label: "멍거 관점", color: "text-twilight bg-dusk/20" };
  if (/^04-/i.test(filename)) return { label: "리루 관점", color: "text-amber-400 bg-amber-500/10" };
  if (filename === "FinalReport.md") return { label: "최종보고서", color: "text-emerald-300 bg-emerald-500/15" };
  if (filename.includes("-quality-screen-")) return { label: "열등주스크리닝", color: "text-fuchsia-300 bg-fuchsia-500/10" };
  if (filename.includes("-checklist-")) return { label: "체크리스트", color: "text-breeze bg-breeze/10" };
  if (filename.endsWith("-thesis.md")) return { label: "투자논제", color: "text-twilight bg-dusk/20" };
  if (filename.includes("-earnings-")) return { label: "실적분석", color: "text-sunset-soft bg-sunset/10" };
  if (filename.includes("-news-")) return { label: "급변동", color: "text-sunset bg-sunset/10" };
  if (filename.includes("-industry-")) return { label: "산업리서치", color: "text-cyan-300 bg-cyan-500/10" };
  if (filename.includes("-funnel-")) return { label: "퍼널", color: "text-teal-300 bg-teal-500/10" };
  if (filename === "portfolio-latest.md") return { label: "포트폴리오", color: "text-rose-300 bg-rose-500/10" };
  return { label: "MD", color: "text-mute bg-canvas-soft" };
}

// 보고서 결과 개요(합격/불합격) pill. summary가 없으면 표시하지 않는다.
export function getResultPill(summary?: string | null): FileBadge | null {
  if (!summary) return null;
  if (summary.includes("면제")) return { label: "면제 통과", color: "text-amber-300 bg-amber-500/15" };
  if (summary.includes("탈락")) return { label: "탈락", color: "text-red-300 bg-red-500/15" };
  if (summary.includes("통과")) return { label: "통과", color: "text-emerald-300 bg-emerald-500/15" };
  return { label: summary, color: "text-body bg-canvas-soft" };
}

// 데이터 신뢰도 pill (data-confidence 표준의 verdict). 값이 없으면 표시하지 않는다.
// 주의: "데이터 신뢰도"이지 "투자 매력도"가 아니다.
export function getConfidencePill(confidence?: string | null): FileBadge | null {
  if (confidence === "높음") return { label: "신뢰 높음", color: "text-emerald-300 bg-emerald-500/15" };
  if (confidence === "보통") return { label: "신뢰 보통", color: "text-amber-300 bg-amber-500/15" };
  if (confidence === "낮음") return { label: "신뢰 낮음", color: "text-red-300 bg-red-500/15" };
  return null;
}

const FILE_ORDER = ["README.md", "01-", "02-", "03-", "04-", "FinalReport.md"];

// 파일명에서 정렬용 날짜 키를 뽑는다. YYYYMMDD(체크리스트·급변동·퍼널 등) 또는
// YYYYQ#(실적분석). 날짜가 없는 보고서(thesis 등)는 null.
function reportDateKey(name: string): string | null {
  const d = name.match(/\d{8}/);
  if (d) return d[0];
  const q = name.match(/\d{4}Q\d/);
  if (q) return q[0];
  return null;
}

export function sortCompanyFiles(files: ReportFile[]): ReportFile[] {
  return [...files].sort((a, b) => {
    const ai = FILE_ORDER.findIndex((o) => a.name === o || a.name.startsWith(o));
    const bi = FILE_ORDER.findIndex((o) => b.name === o || b.name.startsWith(o));
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    // 날짜가 있는 보고서는 최신 우선(내림차순). /news-pulse처럼 반복 실행되는
    // 산출물에서 3차 '생성일자' 탭의 맨 앞 = 최신이 되고, 2차 유형 탭 클릭 시
    // 기본 선택(첫 항목)도 최신이 잡힌다.
    const ad = reportDateKey(a.name);
    const bd = reportDateKey(b.name);
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    // 날짜 있는 쪽을 날짜 없는 쪽보다 앞에 (같은 유형 내 혼재 시 안정적 순서).
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.name.localeCompare(b.name);
  });
}

// 종목 상세에서 보고서를 유형별 구획으로 나누기 위한 분류.
export type ReportCategory = "quality-screen" | "checklist" | "deep-dive" | "thesis" | "news" | "other";

export function getReportCategory(name: string): ReportCategory {
  if (name.includes("-quality-screen-")) return "quality-screen";
  if (name.includes("-checklist-")) return "checklist";
  if (name.endsWith("-thesis.md")) return "thesis";
  // 급변동 분석 = /news-pulse 산출물({회사}-news-{YYYYMMDD}.md)
  if (name.includes("-news-")) return "news";
  // 심층분석 = /investment-team 산출물(README + 01~04-*-Perspective + FinalReport) + 실적분석
  if (
    name === "README.md" ||
    /^0[1-4]-/.test(name) ||
    name === "FinalReport.md" ||
    name.includes("-earnings-")
  )
    return "deep-dive";
  return "other";
}

// 구획 표시 순서·라벨. 빈 구획은 렌더 단계에서 숨긴다.
export const REPORT_SECTIONS: { id: ReportCategory; label: string }[] = [
  { id: "quality-screen", label: "열등주 스크리닝" },
  { id: "checklist", label: "버핏 6-게이트 체크" },
  { id: "deep-dive", label: "심층분석" },
  { id: "thesis", label: "투자 논제 수립" },
  { id: "news", label: "급변동 분석" },
  { id: "other", label: "기타" },
];

// '종목별 보고서' 탭에서 종목을 열등주 스크리닝 결과로 구획 분리하기 위한 그룹 정의.
// match: 종목의 최신 스크리닝 결과(getResultPill 파싱값)와 대조. dot=상태 점, tint=라벨 색.
// 시맨틱 색(통과 emerald / 탈락 red)은 디자인상 '데이터 의미'라 예외로 유지한다(AGENTS.md).
// null = 스크리닝 보고서가 없거나 결과 파싱 불가한 종목(미검사).
export const SCREEN_GROUPS: {
  id: string;
  label: string;
  match: (r: string | null) => boolean;
  dot: string;
  tint: string;
}[] = [
  { id: "pass", label: "통과", match: (r) => r === "통과", dot: "bg-emerald-400", tint: "text-emerald-300" },
  { id: "exempt", label: "면제 통과", match: (r) => r === "면제 통과", dot: "bg-amber-400", tint: "text-amber-300" },
  { id: "fail", label: "탈락", match: (r) => r === "탈락", dot: "bg-red-400", tint: "text-red-300" },
  { id: "insufficient", label: "데이터 부족", match: (r) => r === "데이터 부족", dot: "bg-canvas-mid", tint: "text-mute" },
  { id: "unscreened", label: "미검사", match: (r) => r === null, dot: "bg-canvas-mid", tint: "text-mute" },
];

// '종목별 보고서' 탭의 1차 구분 = 섹터(그룹). 보고서 파일에는 섹터 메타데이터가 없으므로
// 사용자가 직접 그룹 이름과 포함 종목을 정한다(그룹 편집 UI). 설정은 서버(Supabase
// app_config)에 저장돼 기기 간 공유된다 — /api/sector-groups GET/PUT.
// 탭 노출 순서 = 그룹 배열 순서. 어느 그룹에도 없는 종목은 '미분류' 탭(항상 맨 끝).
export type SectorGroup = { id: string; name: string; tickers: string[] };
export const UNCLASSIFIED_SECTOR = "미분류";

// 서버에서 아직 불러오기 전(초기 렌더)에 쓰는 기본 그룹 폴백. 실제 값은 API가 돌려준다.
export const DEFAULT_SECTOR_GROUPS: SectorGroup[] = [
  { id: "healthcare", name: "헬스케어", tickers: ["LLY", "NVO", "WST"] },
  { id: "tech", name: "기술", tickers: ["NVDA", "QUBT"] },
  { id: "space", name: "우주·항공", tickers: ["SPCX"] },
];

export function normalizeTicker(s: string): string {
  return s.trim().toUpperCase();
}

// 종목이 속한 그룹명. 어느 그룹에도 없으면 '미분류'. (매칭은 대소문자·공백 무시)
export function sectorOfWith(groups: SectorGroup[], company: string): string {
  const key = normalizeTicker(company);
  const g = groups.find((grp) => grp.tickers.some((t) => normalizeTicker(t) === key));
  return g?.name ?? UNCLASSIFIED_SECTOR;
}

// 보고서가 존재하는 종목 기준으로 노출할 섹터 탭 목록(그룹 순서 유지, 빈 그룹 숨김,
// 미분류는 해당 종목이 있을 때만 맨 끝에). 그룹명 중복 시 첫 항목만 남긴다.
export function orderedSectors(groups: SectorGroup[], companies: string[]): string[] {
  const present: string[] = [];
  for (const g of groups) {
    if (
      !present.includes(g.name) &&
      companies.some((c) => sectorOfWith(groups, c) === g.name)
    ) {
      present.push(g.name);
    }
  }
  if (companies.some((c) => sectorOfWith(groups, c) === UNCLASSIFIED_SECTOR)) {
    present.push(UNCLASSIFIED_SECTOR);
  }
  return present;
}

export function newGroupId(seed: number): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // 보안 컨텍스트 아님 등 — 폴백으로 진행
  }
  return `g-${seed}-${Math.floor(performance.now())}`;
}

// 루트 레벨(회사 폴더 밖) 보고서 = 섹터/스크리닝 결과물. 파일명에서 섹터명과 유형을 파싱한다.
//   {섹터명}-industry-{YYYYMMDD}.md  → /industry-research 산출물
//   {섹터명}-funnel-{YYYYMMDD}.md    → /industry-funnel 산출물
export type SectorKind = "industry" | "funnel" | "other";

export function getSectorReportInfo(name: string): { sector: string; kind: SectorKind } {
  const m = name.match(/^(.*)-(industry|funnel)-\d{8}\.md$/i);
  if (m) return { sector: m[1], kind: m[2].toLowerCase() as SectorKind };
  // 규칙에 안 맞는 루트 파일은 파일명(확장자 제외)을 섹터로 보고 '기타'로 분류한다.
  return { sector: name.replace(/\.md$/i, ""), kind: "other" };
}

// '섹터 리서치'·'종목별 보고서' 탭의 1차 구분 = 분야(도메인) 그룹의 기본 시드. 프로세스 가이드
// '섹터 구조 파악' 스텝의 섹터 피커 표를 분야 그룹으로 변환한 것(+ 한글·약어 섹터 그룹명 별칭,
// TASK-85)으로, 저장된 사용자 설정(/api/sector-domain-groups)이 없을 때만 쓰인다.
// 별칭 표와 판정·정렬 헬퍼는 lib/sector-domains.ts 참조
// (그쪽은 테스트를 위해 import 없는 순수 모듈로 유지).
export const DEFAULT_DOMAIN_GROUPS: DomainGroup[] = deriveDomainGroups(DISCOVERY_SECTOR_GROUPS);

// 섹터 상세의 2차(유형) 탭 순서·라벨. 빈 유형은 렌더 단계에서 숨긴다.
export const SECTOR_SECTIONS: { id: SectorKind; label: string }[] = [
  { id: "industry", label: "섹터 구조" },
  { id: "funnel", label: "후보 압축" },
  { id: "other", label: "기타" },
];

// 3차(생성일자) 탭 라벨. 파일명 속 YYYYMMDD → 'YYYY-MM-DD', YYYYQ# → 분기 그대로.
// 날짜가 없는 유형(README/01~04/FinalReport 등)은 유형 배지 라벨로 개별 구분한다.
export function reportDateLabel(name: string): string {
  const d = name.match(/(\d{4})(\d{2})(\d{2})/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}`;
  const q = name.match(/\d{4}Q\d/);
  if (q) return q[0];
  return getFileBadge(name).label;
}

// 쉼표로 구분된 티커 입력을 정규화된 배열로 (대문자, 공백/빈값 제거).
export function parseTickers(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

// 티커를 입력 문자열에 토글(있으면 제거, 없으면 추가)해 다시 "A, B" 형태로 반환.
export function toggleTicker(input: string, ticker: string): string {
  const t = ticker.trim().toUpperCase();
  const list = parseTickers(input);
  const idx = list.indexOf(t);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(t);
  return list.join(", ");
}

export function resolveOutputPaths(step: FlowStep, input: string): string[] {
  return step.outputFiles
    .map((f) => f.replace(/\{input\}/g, input))
    .filter(
      (f) =>
        f.startsWith("reports/") &&
        f.endsWith(".md") &&
        !f.includes("*") &&
        !f.includes("~") &&
        !f.includes("{")
    );
}

// 보고서 as-of(마지막 커밋 시각) → 표시 라벨 + 오래됨 여부. 분기(90일) 넘으면 stale.
// 투자 리서치는 실적 시즌마다 낡으므로, 실시간 가격 옆의 정적 보고서에 신선도 신호를 준다.
const REPORT_STALE_DAYS = 90;
export function reportAsOf(iso: string): { text: string; stale: boolean } | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  const ymd = new Date(t).toISOString().slice(0, 10);
  const rel = days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
  return { text: `${ymd} · ${rel}`, stale: days >= REPORT_STALE_DAYS };
}

// 보고서 본문의 마크다운 링크(href)를 현재 보고서(fromPath) 기준 상대경로로 풀어
// 저장소 경로 reports/*.md 로 변환한다. 보고서 링크가 아니면(외부 URL·앵커·절대경로·
// skills 문서 등 reports 밖) null 을 반환한다. 보고서끼리의 상호 링크를 앱 안에서
// 열기 위한 것(외부 네비게이션 → 404 방지).
export function resolveReportPath(href: string, fromPath: string): string | null {
  if (!href) return null;
  const bare = href.split(/[?#]/)[0];
  if (!bare.endsWith(".md")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(bare)) return null; // http:, mailto: 등 스킴
  if (bare.startsWith("/")) return null; // 절대 경로/프로토콜상대는 대상 아님
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const segs = dir ? dir.split("/") : [];
  for (const seg of bare.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (segs.length) segs.pop();
      continue;
    }
    segs.push(seg);
  }
  const resolved = segs.join("/");
  return resolved.startsWith("reports/") && resolved.endsWith(".md") && !resolved.includes("..")
    ? resolved
    : null;
}

// ─── 통화 포맷 ───────────────────────────────────────────────────────────────

export function fmtUsd(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtKrw(n: number) {
  // 원화는 소수점 없이 천단위 콤마. (예: ₩1,234,567)
  return "₩" + Math.round(n).toLocaleString("en-US");
}
