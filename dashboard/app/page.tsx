"use client";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkSentenceBreaks from "@/lib/remark-sentence-breaks";
import { flows, type Flow, type FlowStep } from "@/lib/flows";
import type { ReportFile } from "@/lib/reports-store";
import type { Holding } from "@/lib/toss";
import type { ScoredCall, CallAggregate, CallStatus } from "@/lib/calls";

// ─── Hooks ───────────────────────────────────────────────────────────────────

// 모달이 열려 있는 동안 배경(body) 스크롤을 잠근다. 모달 내부가 overflow-y-auto라
// 스크롤 체이닝으로 뒤 페이지가 함께 스크롤되는 것을 막는다. 언마운트 시 원복.
// 중첩 모달도 안전: 각 인스턴스가 마운트 시점의 값을 캡처해 복원한다.
function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

// ─── Color config ──────────────────────────────────────────────────────────

// xAI 원칙: 인터랙티브 어휘는 '화이트 pill' 하나. 주요 액션은 화이트-필 pill,
// 나머지는 화이트-아웃라인 pill. 컬러 액센트는 코드/일러스트에만 드물게.
const colorConfig = {
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

type ColorKey = keyof typeof colorConfig;

// ─── Helpers ───────────────────────────────────────────────────────────────

type FileBadge = { label: string; color: string };

function getFileBadge(filename: string): FileBadge {
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
function getResultPill(summary?: string | null): FileBadge | null {
  if (!summary) return null;
  if (summary.includes("면제")) return { label: "면제 통과", color: "text-amber-300 bg-amber-500/15" };
  if (summary.includes("탈락")) return { label: "탈락", color: "text-red-300 bg-red-500/15" };
  if (summary.includes("통과")) return { label: "통과", color: "text-emerald-300 bg-emerald-500/15" };
  return { label: summary, color: "text-body bg-canvas-soft" };
}

// 데이터 신뢰도 pill (data-confidence 표준의 verdict). 값이 없으면 표시하지 않는다.
// 주의: "데이터 신뢰도"이지 "투자 매력도"가 아니다.
function getConfidencePill(confidence?: string | null): FileBadge | null {
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

function sortCompanyFiles(files: ReportFile[]): ReportFile[] {
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
type ReportCategory = "quality-screen" | "checklist" | "deep-dive" | "thesis" | "news" | "other";

function getReportCategory(name: string): ReportCategory {
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
const REPORT_SECTIONS: { id: ReportCategory; label: string }[] = [
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
const SCREEN_GROUPS: {
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
type SectorGroup = { id: string; name: string; tickers: string[] };
const UNCLASSIFIED_SECTOR = "미분류";

// 서버에서 아직 불러오기 전(초기 렌더)에 쓰는 기본 그룹 폴백. 실제 값은 API가 돌려준다.
const DEFAULT_SECTOR_GROUPS: SectorGroup[] = [
  { id: "healthcare", name: "헬스케어", tickers: ["LLY", "NVO", "WST"] },
  { id: "tech", name: "기술", tickers: ["NVDA", "QUBT"] },
  { id: "space", name: "우주·항공", tickers: ["SPCX"] },
];

function normalizeTicker(s: string): string {
  return s.trim().toUpperCase();
}

// 종목이 속한 그룹명. 어느 그룹에도 없으면 '미분류'. (매칭은 대소문자·공백 무시)
function sectorOfWith(groups: SectorGroup[], company: string): string {
  const key = normalizeTicker(company);
  const g = groups.find((grp) => grp.tickers.some((t) => normalizeTicker(t) === key));
  return g?.name ?? UNCLASSIFIED_SECTOR;
}

// 보고서가 존재하는 종목 기준으로 노출할 섹터 탭 목록(그룹 순서 유지, 빈 그룹 숨김,
// 미분류는 해당 종목이 있을 때만 맨 끝에). 그룹명 중복 시 첫 항목만 남긴다.
function orderedSectors(groups: SectorGroup[], companies: string[]): string[] {
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

function newGroupId(seed: number): string {
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
type SectorKind = "industry" | "funnel" | "other";

function getSectorReportInfo(name: string): { sector: string; kind: SectorKind } {
  const m = name.match(/^(.*)-(industry|funnel)-\d{8}\.md$/i);
  if (m) return { sector: m[1], kind: m[2].toLowerCase() as SectorKind };
  // 규칙에 안 맞는 루트 파일은 파일명(확장자 제외)을 섹터로 보고 '기타'로 분류한다.
  return { sector: name.replace(/\.md$/i, ""), kind: "other" };
}

// 섹터 상세의 2차(유형) 탭 순서·라벨. 빈 유형은 렌더 단계에서 숨긴다.
const SECTOR_SECTIONS: { id: SectorKind; label: string }[] = [
  { id: "industry", label: "섹터 구조" },
  { id: "funnel", label: "후보 압축" },
  { id: "other", label: "기타" },
];

// 3차(생성일자) 탭 라벨. 파일명 속 YYYYMMDD → 'YYYY-MM-DD', YYYYQ# → 분기 그대로.
// 날짜가 없는 유형(README/01~04/FinalReport 등)은 유형 배지 라벨로 개별 구분한다.
function reportDateLabel(name: string): string {
  const d = name.match(/(\d{4})(\d{2})(\d{2})/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}`;
  const q = name.match(/\d{4}Q\d/);
  if (q) return q[0];
  return getFileBadge(name).label;
}

// 쉼표로 구분된 티커 입력을 정규화된 배열로 (대문자, 공백/빈값 제거).
function parseTickers(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

// 티커를 입력 문자열에 토글(있으면 제거, 없으면 추가)해 다시 "A, B" 형태로 반환.
function toggleTicker(input: string, ticker: string): string {
  const t = ticker.trim().toUpperCase();
  const list = parseTickers(input);
  const idx = list.indexOf(t);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(t);
  return list.join(", ");
}

function resolveOutputPaths(step: FlowStep, input: string): string[] {
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

// ─── ReportModal ───────────────────────────────────────────────────────────

// 보고서 as-of(마지막 커밋 시각) → 표시 라벨 + 오래됨 여부. 분기(90일) 넘으면 stale.
// 투자 리서치는 실적 시즌마다 낡으므로, 실시간 가격 옆의 정적 보고서에 신선도 신호를 준다.
const REPORT_STALE_DAYS = 90;
function reportAsOf(iso: string): { text: string; stale: boolean } | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  const ymd = new Date(t).toISOString().slice(0, 10);
  const rel = days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
  return { text: `${ymd} · ${rel}`, stale: days >= REPORT_STALE_DAYS };
}

// 보고서 본문 fetch + 마크다운 렌더. 모달·인라인 뷰 양쪽에서 재사용한다.
function ReportContentView({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitDate, setCommitDate] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);
    setCommitDate(null);
    fetch(`/api/reports/content?path=${encodeURIComponent(path)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setContent(d.content);
          setCommitDate(typeof d.commitDate === "string" ? d.commitDate : null);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  if (loading) return <p className="text-sm text-mute">불러오는 중...</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  if (!content) return null;
  const asOf = commitDate ? reportAsOf(commitDate) : null;
  return (
    <>
      {asOf && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            asOf.stale
              ? "border-sunset/30 bg-sunset/10 text-sunset-soft"
              : "border-hairline bg-canvas-soft text-mute"
          }`}
        >
          <span className="eyebrow text-[10px]">AS-OF</span>
          <span className="font-mono">{asOf.text}</span>
          <span>· 작성 시점의 스냅샷입니다. 실시간 가격·최신 실적과 다를 수 있습니다.</span>
          {asOf.stale && <span className="font-medium">— 오래된 분석(재검토 권장)</span>}
        </div>
      )}
      <article className="report-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkSentenceBreaks]}>{content}</ReactMarkdown>
      </article>
    </>
  );
}

function ReportModal({
  path,
  onClose,
  onRequestDelete,
}: {
  path: string;
  onClose: () => void;
  onRequestDelete?: (path: string) => void;
}) {
  useBodyScrollLock();
  const filename = path.split("/").pop() ?? path;
  const badge = getFileBadge(filename);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-lg bg-canvas border border-hairline overflow-hidden"
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
                onClick={() => onRequestDelete(path)}
                title="이 보고서 삭제"
                className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
              >
                삭제
              </button>
            )}
            <button
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

function StepCard({
  step,
  index,
  isActive,
  isCompleted,
  isSkipped,
  input,
  onInputChange,
  onDone,
  onOpenReport,
  colors,
  holdings,
  doneLabel = "완료, 다음 단계로 →",
}: {
  step: FlowStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isSkipped?: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onDone: () => void;
  onOpenReport: (path: string) => void;
  colors: (typeof colorConfig)[ColorKey];
  holdings: Holding[];
  // 액티브 스텝 하단 버튼 라벨. 단일-스텝 모달에선 "닫기" 등으로 대체.
  doneLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [sectorTab, setSectorTab] = useState(0);
  const displayInput = input || step.inputPlaceholder;
  const command = step.commandTemplate.replace("{input}", displayInput);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원/거부 시: 성공으로 표시하지 않는다.
    }
  };

  if (isSkipped) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5 opacity-40">
        <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-hairline flex items-center justify-center text-xs text-mute">
          –
        </div>
        <span className="text-sm text-mute flex-1">{step.title}</span>
        <span className="text-xs text-mute">건너뜀</span>
      </div>
    );
  }

  if (isCompleted) {
    // 사용자가 값을 입력하지 않고 완료한 경우, 플레이스홀더(예: NVDA)로
    // 존재하지 않는 보고서 경로를 열지 않도록 실제 입력이 있을 때만 계산한다.
    const resolvedFiles = input.trim() ? resolveOutputPaths(step, input.trim()) : [];
    return (
      <div className="flex items-center gap-3 px-2 py-2.5">
        <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs ${colors.bg} ${colors.text}`}>
          ✓
        </div>
        <span className="text-sm text-body flex-1">{step.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <code className="text-xs text-mute font-mono truncate max-w-[160px] hidden sm:block">
            {step.commandTemplate.replace("{input}", input || step.inputPlaceholder)}
          </code>
          {resolvedFiles.length > 0 && (
            <button
              onClick={() => onOpenReport(resolvedFiles[0])}
              className="text-xs px-3 py-1 rounded-full bg-transparent border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              보기
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5 opacity-30">
        <div className="h-6 w-6 shrink-0 rounded-full border border-hairline flex items-center justify-center text-xs text-mute">
          {index + 1}
        </div>
        <span className="text-sm text-mute">{step.title}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-canvas-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-sm ${colors.bg} ${colors.text}`}>
          {index + 1}
        </div>
        <h3 className="text-[19px] text-ink tracking-[-0.02em]">{step.title}</h3>
      </div>

      <p className="text-sm text-body mb-5 leading-relaxed">{step.description}</p>

      <div className="mb-3">
        <label className="eyebrow block text-[11px] mb-1.5">{step.inputLabel}</label>
        {step.sectorPicker && (
          <div className="mb-2">
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2">
              {step.sectorPicker.groups.map((g, i) => (
                <button
                  key={g.label}
                  onClick={() => setSectorTab(i)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors active:scale-95 ${
                    sectorTab === i ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {step.sectorPicker.groups[sectorTab]?.sectors.map((sector) => (
                <button
                  key={sector}
                  onClick={() => onInputChange(sector)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors border active:scale-95 ${
                    input === sector
                      ? "bg-white text-canvas border-white"
                      : "bg-transparent text-body border-hairline hover:text-ink hover:bg-canvas-soft"
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>
        )}
        {step.holdingsPicker && holdings.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] text-mute mb-1.5">내 보유 종목 (클릭해서 추가/제거)</div>
            <div className="flex flex-wrap gap-1.5">
              {holdings.map((h) => {
                const selected = parseTickers(input).includes(h.ticker.toUpperCase());
                return (
                  <button
                    key={h.ticker}
                    type="button"
                    onClick={() => onInputChange(toggleTicker(input, h.ticker))}
                    title={h.name}
                    aria-pressed={selected}
                    className={`rounded-full px-3 py-1 text-xs transition-colors border active:scale-95 ${
                      selected
                        ? "bg-white text-canvas border-white"
                        : "bg-transparent text-body border-hairline hover:text-ink hover:bg-canvas-soft"
                    }`}
                  >
                    {selected ? "✓ " : "+ "}
                    {h.ticker}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={step.inputPlaceholder}
          className="w-full rounded-lg bg-canvas-soft border border-hairline px-3.5 py-2.5 text-sm text-ink placeholder-mute focus:outline-none focus:border-white/40 transition-colors"
        />
      </div>

      <div className="mb-4">
        <div className="eyebrow text-[11px] mb-1.5">RUN IN TERMINAL</div>
        <div className="flex items-center gap-2 rounded-lg bg-canvas-mid/40 border border-hairline px-3.5 py-2.5">
          <code className={`flex-1 text-sm font-mono ${colors.command}`}>{command}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 text-xs px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            {copied ? "복사됨 ✓" : "복사"}
          </button>
        </div>
        {step.requiresCli && (
          <p className="mt-1.5 text-xs text-sunset-soft">
            ⚠️ Claude Code CLI에서 직접 실행해야 합니다 (Agent SDK 필요 — 일반 API 호출로는 동작하지 않음)
          </p>
        )}
      </div>

      {(step.outputFiles.length > 0 || step.outputNote) && (
        <div className="mb-4 text-xs text-mute">
          <span className="text-body">생성: </span>
          {step.outputNote || step.outputFiles.map((f) => f.replace("{input}", displayInput)).join(", ")}
        </div>
      )}

      <button
        onClick={onDone}
        className={`w-full rounded-full py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${colors.button}`}
      >
        {doneLabel}
      </button>
    </div>
  );
}

function FlowView({
  flow,
  onBack,
  initialStep = 0,
}: {
  flow: Flow;
  onBack: () => void;
  initialStep?: number;
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [stepInputs, setStepInputs] = useState<Record<number, string>>({});
  const [modalPath, setModalPath] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);

  // 티커 입력 스텝이 하나라도 있으면 보유 종목을 불러와 칩으로 노출한다.
  // 실패해도(토스 미설정 등) 칩만 안 뜨고 직접 입력은 그대로 동작.
  const needsHoldings = flow.steps.some((s) => s.holdingsPicker);
  useEffect(() => {
    if (!needsHoldings) return;
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => setHoldings(Array.isArray(d.holdings) ? d.holdings : []))
      .catch(() => {});
  }, [needsHoldings]);

  const colors = colorConfig[flow.color as ColorKey];
  const isDone = currentStep >= flow.steps.length;
  const progressPct = Math.round((Math.min(currentStep, flow.steps.length) / flow.steps.length) * 100);

  // Collect all resolved output files from completed steps for the completion screen
  const generatedFiles = flow.steps.flatMap((step, i) => {
    const inp = stepInputs[i] || "";
    if (!inp) return [];
    return resolveOutputPaths(step, inp).map((path) => ({ path, stepTitle: step.title }));
  });

  return (
    <div className="min-h-screen bg-canvas text-body">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-body hover:text-ink mb-8 transition-colors active:scale-95"
        >
          ← 뒤로
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-4xl tracking-[-0.03em] text-ink">{flow.title}</h1>
            <span className="eyebrow text-[11px]">
              {Math.min(currentStep, flow.steps.length)} / {flow.steps.length}
            </span>
          </div>
          <p className="text-sm text-mute mb-3">{flow.subtitle}</p>
          <div className="h-1 rounded-full bg-canvas-soft overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.progress}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {isDone ? (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl tracking-[-0.03em] text-ink mb-2">플로우 완료!</h2>
              <p className="text-sm text-mute">{flow.title} 플로우를 모두 마쳤습니다.</p>
            </div>

            {generatedFiles.length > 0 && (
              <div className="mb-8 rounded-lg border border-hairline bg-canvas-card p-5">
                <div className="eyebrow text-[11px] mb-3">GENERATED REPORTS</div>
                <div className="flex flex-col gap-2">
                  {generatedFiles.map(({ path }, i) => {
                    const filename = path.split("/").pop() ?? path;
                    const badge = getFileBadge(filename);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-mono text-body flex-1 truncate min-w-0">{path}</span>
                        <button
                          onClick={() => setModalPath(path)}
                          className="shrink-0 text-xs px-3 py-1 rounded-full bg-transparent border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
                        >
                          보기
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={onBack}
                className={`px-6 py-2.5 rounded-full transition-colors text-sm font-medium active:scale-95 ${colors.button}`}
              >
                홈으로 (보고서 보기) →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {flow.steps.map((step, i) => (
              <StepCard
                key={i}
                step={step}
                index={i}
                isActive={i === currentStep}
                isCompleted={i < currentStep && i >= initialStep}
                isSkipped={i < initialStep}
                input={stepInputs[i] || ""}
                onInputChange={(val) => setStepInputs((prev) => ({ ...prev, [i]: val }))}
                onDone={() => {
                  // 미리 채워주기: 티커 입력 스텝끼리는 앞 스텝 값을 다음 스텝에 이어받는다.
                  // 다음 스텝을 사용자가 이미 입력했다면 덮어쓰지 않는다.
                  const next = i + 1;
                  setStepInputs((prev) => {
                    const cur = (prev[i] || "").trim();
                    if (
                      cur &&
                      flow.steps[i]?.holdingsPicker &&
                      flow.steps[next]?.holdingsPicker &&
                      !(prev[next] || "").trim()
                    ) {
                      return { ...prev, [next]: cur };
                    }
                    return prev;
                  });
                  setCurrentStep(next);
                }}
                onOpenReport={(path) => setModalPath(path)}
                colors={colors}
                holdings={holdings}
              />
            ))}
          </div>
        )}
      </div>

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

// 프로세스 가이드에서 특정 단계를 눌렀을 때, 그 단계 하나의 정보만 보여주는 모달.
// 전체 플로우 맥락(진행률 바·다른 단계 카드·완료 화면)은 렌더하지 않는다.
function ProcessStepModal({
  flow,
  stepIndex,
  onClose,
  initialInput = "",
}: {
  flow: Flow;
  stepIndex: number;
  onClose: () => void;
  // 실적 캘린더 등에서 단계를 열 때 입력칸을 미리 채운다(예: 종목 티커).
  initialInput?: string;
}) {
  useBodyScrollLock();
  const step = flow.steps[stepIndex];
  const [input, setInput] = useState(initialInput);
  const [modalPath, setModalPath] = useState<string | null>(null);
  const colors = colorConfig[flow.color as ColorKey];

  if (!step) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl my-8 rounded-lg bg-canvas border border-hairline overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
            <div className="eyebrow text-[10px]">STEP {stepIndex + 1} / {flow.steps.length}</div>
            <button
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-6">
            <StepCard
              step={step}
              index={stepIndex}
              isActive
              isCompleted={false}
              input={input}
              onInputChange={setInput}
              onDone={onClose}
              onOpenReport={setModalPath}
              colors={colors}
              /* 프로세스 가이드 모달은 보유 종목 칩 선택을 쓰지 않는다 —
                 종목은 사용자가 입력창에 직접 입력. (holdings 비워 칩 숨김) */
              holdings={[]}
              doneLabel="닫기"
            />
          </div>
        </div>
      </div>
      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </>
  );
}

// 플로우 전체(모든 단계)를 모달로 보여준다. 포트폴리오 점검 탭에서 분기 카드를
// 눌렀을 때 전체화면 전환 대신 이 모달로 단계를 실행한다.
// 모든 단계를 active 카드로 펼쳐(순서 강제 없음) 필요한 단계부터 바로 복사·실행.
function FlowModal({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  useBodyScrollLock();
  const [stepInputs, setStepInputs] = useState<Record<number, string>>({});
  const [modalPath, setModalPath] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const colors = colorConfig[flow.color as ColorKey];

  const needsHoldings = flow.steps.some((s) => s.holdingsPicker);
  useEffect(() => {
    if (!needsHoldings) return;
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => setHoldings(Array.isArray(d.holdings) ? d.holdings : []))
      .catch(() => {});
  }, [needsHoldings]);

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl my-8 rounded-lg bg-canvas border border-hairline overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
            <div className="eyebrow text-[10px]">{flow.title}</div>
            <button
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-mute mb-4 leading-relaxed">{flow.subtitle}</p>
            <div className="flex flex-col gap-2">
              {flow.steps.map((step, i) => (
                <StepCard
                  key={i}
                  step={step}
                  index={i}
                  isActive
                  isCompleted={false}
                  input={stepInputs[i] || ""}
                  onInputChange={(val) => setStepInputs((prev) => ({ ...prev, [i]: val }))}
                  onDone={onClose}
                  onOpenReport={setModalPath}
                  colors={colors}
                  holdings={holdings}
                  doneLabel="닫기"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </>
  );
}

function StartPointModal({ flow, onChoose, onClose }: { flow: Flow; onChoose: (fromStep: number) => void; onClose: () => void }) {
  useBodyScrollLock();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-canvas border border-hairline p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-ink text-2xl tracking-[-0.03em]">{flow.title}</h2>
          <button
            onClick={onClose}
            className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-mute mb-6">어디서부터 시작할까요?</p>
        <div className="flex flex-col gap-3">
          {flow.startPoints?.map((sp) => (
            <button
              key={sp.id}
              onClick={() => onChoose(sp.fromStep)}
              className="text-left rounded-lg border border-hairline bg-canvas-card p-4 hover:border-white/30 hover:bg-canvas-soft transition-colors active:scale-[0.99]"
            >
              <div className="text-sm text-ink mb-1">{sp.label}</div>
              <p className="text-xs text-body leading-relaxed">{sp.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtUsd(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtKrw(n: number) {
  // 원화는 소수점 없이 천단위 콤마. (예: ₩1,234,567)
  return "₩" + Math.round(n).toLocaleString("en-US");
}

const CCY_STORAGE_KEY = "holdings-ccy";
type Ccy = "USD" | "KRW";

// 보유 정보가 안 뜰 때(에러/빈 목록) 수동 새로고침 없이 자동으로 다시 시도한다.
// 성공(비어있지 않은 목록)하면 폴링을 멈추고, 무한 재시도를 막기 위해 횟수를 제한한다.
const MAX_AUTO_RELOADS = 6;

// 토스 API 요청 한도(429)에 걸린 경우엔 더 길게 쉬었다 재시도한다 —
// 짧은 간격으로 계속 두드리면 한도가 갱신돼 오히려 복구가 늦어진다.
function retryDelayMs(tries: number, rateLimited: boolean) {
  return rateLimited
    ? Math.min(8000 * (tries + 1), 30000)
    : Math.min(2000 * (tries + 1), 10000);
}

function holdingsErrorText(rateLimited: boolean, retrying: boolean) {
  const head = rateLimited
    ? "토스 API 요청 한도를 초과했습니다."
    : "보유 정보를 일시적으로 불러올 수 없습니다.";
  return head + (retrying ? " 잠시 후 자동으로 다시 시도합니다." : "");
}

// ─── 포트폴리오 데이터 캐시 (탭 재방문 시 즉시 표시) ─────────────────────────
// 포트폴리오 탭을 벗어나면 HoldingsBanner·DailyCheckView가 언마운트돼 상태가 사라진다.
// 그래서 탭에 다시 들어올 때마다 토스/야후/환율을 처음부터 재조회하며 "불러오는 중"이
// 반복됐다. 마지막 성공 데이터를 모듈 레벨(페이지 세션 동안 유지) + localStorage(새로고침
// 후에도 유지)에 보관해, 재마운트 시 캐시를 즉시 렌더하고 백그라운드로만 갱신한다.
// 갱신 결과가 캐시와 다를 때만 상태를 교체해 불필요한 깜빡임을 막는다.
const HOLDINGS_CACHE_KEY = "holdings-cache-v1";
const QUOTES_CACHE_KEY = "quotes-cache-v1";
const FX_CACHE_KEY = "fx-cache-v1";

let holdingsCache: Holding[] | null = null;
let fxCache: number | null = null;
let quotesCache: Record<string, Quote> | null = null;
let cacheHydrated = false;

// SSR 안전: 첫 클라이언트 접근 시 한 번만 localStorage → 모듈 캐시로 복원.
function hydratePortfolioCache() {
  if (cacheHydrated || typeof window === "undefined") return;
  cacheHydrated = true;
  try {
    const h = localStorage.getItem(HOLDINGS_CACHE_KEY);
    if (h) holdingsCache = JSON.parse(h);
    const q = localStorage.getItem(QUOTES_CACHE_KEY);
    if (q) quotesCache = JSON.parse(q);
    const f = localStorage.getItem(FX_CACHE_KEY);
    if (f != null) {
      const n = Number(f);
      if (Number.isFinite(n) && n > 0) fxCache = n;
    }
  } catch {
    // 파싱/저장 실패는 무시 — 캐시 없이 정상 로드로 폴백.
  }
}

function persistCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패(프라이빗 모드/용량)는 무시 — 모듈 캐시만으로도 탭 전환은 즉시 표시된다.
  }
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 조회 결과를 공용 캐시에 반영하고, **호출한 컴포넌트의 상태는 항상 채운다.**
// 배너와 당일 체크가 같은 /api/holdings를 동시에 부르기 때문에, 먼저 응답받은 쪽이
// 모듈 캐시를 갱신하면 나중 쪽은 "캐시와 동일"로 판정돼 상태가 null로 남았다
// (→ 당일 체크 표가 통째로 안 그려지고 시세 조회도 시작되지 않음).
// 캐시·저장소 갱신은 값이 바뀐 경우로 제한하고, 상태는 이전 값과 같으면 참조를 유지해
// 불필요한 리렌더만 막는다.
function commitHoldings(next: Holding[], setHoldings: Dispatch<SetStateAction<Holding[] | null>>) {
  if (next.length === 0) {
    // 빈 응답으로 멀쩡한 캐시를 덮지 않는다 — 캐시가 아예 없을 때만 반영(재시도 판단용).
    if (holdingsCache == null) setHoldings(next);
    return;
  }
  if (!sameJson(next, holdingsCache)) {
    holdingsCache = next;
    persistCache(HOLDINGS_CACHE_KEY, next);
  }
  setHoldings((prev) => (sameJson(prev, next) ? prev : next));
}

function commitQuotes(
  map: Record<string, Quote>,
  setQuotes: Dispatch<SetStateAction<Record<string, Quote> | null>>
) {
  // 유효값이 하나도 없으면 일시적 실패로 보고 기존 캐시를 유지한다.
  const hasData = Object.values(map).some((q) => q.price != null || q.changePct != null);
  if (!hasData) {
    if (quotesCache == null) setQuotes(map);
    return;
  }
  if (!sameJson(map, quotesCache)) {
    quotesCache = map;
    persistCache(QUOTES_CACHE_KEY, map);
  }
  setQuotes((prev) => (sameJson(prev, map) ? prev : map));
}

function HoldingsBanner() {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  // 캐시가 있으면 즉시 표시하고 스피너를 건너뛴다(백그라운드 갱신만 수행).
  const [loading, setLoading] = useState(!(holdingsCache && holdingsCache.length > 0));
  const [ccy, setCcy] = useState<Ccy>("USD");
  const [fx, setFx] = useState<number | null>(fxCache);
  const [autoTries, setAutoTries] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);

  const load = useCallback(() => {
    // 캐시가 없을 때만 스피너를 띄우고, 캐시가 있으면 조용히 백그라운드 갱신한다.
    if (!(holdingsCache && holdingsCache.length > 0)) setLoading(true);
    setError(null);
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setRateLimited(!!d.rateLimited);
        setIsMock(!!d.mock);
        commitHoldings(Array.isArray(d.holdings) ? d.holdings : [], setHoldings);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // localStorage 캐시는 마운트 후에만 복원한다(SSR 렌더에는 window가 없어 캐시가 비어
  // 있으므로, 렌더 중 복원하면 첫 클라이언트 렌더가 서버 HTML과 어긋나 하이드레이션이
  // 깨진다). 탭 재진입 등 재마운트 시에는 모듈 캐시가 이미 채워져 lazy 초기화로 즉시 표시.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) {
      setHoldings(holdingsCache);
      setLoading(false);
    }
    if (fxCache != null) setFx(fxCache);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 자동 재로딩: 로딩이 끝났는데 아직 안 떴으면(에러 또는 빈 목록) 잠시 후 다시 시도.
  // 정상 표시 중이거나 상한 도달 시 종료. 백오프는 retryDelayMs 참조(429는 더 길게).
  useEffect(() => {
    if (loading) return;
    const shown = (holdings?.length ?? 0) > 0;
    if (shown) return;
    if (autoTries >= MAX_AUTO_RELOADS) return;
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      load();
    }, retryDelayMs(autoTries, rateLimited));
    return () => clearTimeout(timer);
  }, [loading, holdings, error, autoTries, rateLimited, load]);

  // 저장된 통화 선호를 복원 (SSR 하이드레이션 불일치 방지 위해 마운트 후 읽음).
  useEffect(() => {
    const saved = localStorage.getItem(CCY_STORAGE_KEY);
    if (saved === "USD" || saved === "KRW") setCcy(saved);
  }, []);

  // USD→KRW 환율을 마운트 시 미리 로드해 토글이 즉시 반응하도록. 캐시가 있으면 이미
  // 값이 채워져 있고, 아래는 백그라운드 갱신(값이 바뀔 때만 교체).
  useEffect(() => {
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.rate === "number" && d.rate !== fxCache) {
          fxCache = d.rate;
          persistCache(FX_CACHE_KEY, d.rate);
          setFx(d.rate);
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = (next: Ccy) => {
    setCcy(next);
    try {
      localStorage.setItem(CCY_STORAGE_KEY, next);
    } catch {
      // 로컬 저장 실패는 무시 (프라이빗 모드 등).
    }
  };

  // KRW 선택 && 환율 로드 완료일 때만 원화로 변환·표시. 아니면 달러 유지.
  const money = (n: number, digits = 2) =>
    ccy === "KRW" && fx != null ? fmtKrw(n * fx) : fmtUsd(n, digits);

  const list = holdings ?? [];
  const total = list.reduce((s, h) => s + h.marketValue, 0);
  const totalPL = list.reduce((s, h) => s + h.profitLoss, 0);
  const totalCost = total - totalPL;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  // 비중(평가금액) 큰 순으로 정렬해 한눈에 비교되도록.
  const sorted = [...list].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <section className="mb-10 rounded-lg border border-hairline bg-canvas-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="eyebrow text-[11px]">PORTFOLIO</h2>
          {list.length > 0 && (
            <span className="font-mono text-[11px] text-mute">{list.length}종목</span>
          )}
          {isMock && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-sunset-soft bg-sunset/10">
              목업
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="통화 선택"
            className="flex rounded-full border border-hairline bg-canvas-soft p-0.5"
          >
            {(["USD", "KRW"] as const).map((c) => {
              const active = ccy === c;
              const disabled = c === "KRW" && fx == null;
              return (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  disabled={disabled}
                  aria-pressed={active}
                  title={disabled ? "환율 불러오는 중..." : `${c}로 표시`}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors active:scale-95 ${
                    active ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  } ${disabled ? "cursor-not-allowed opacity-40 hover:text-mute" : ""}`}
                >
                  {c === "USD" ? "$ USD" : "₩ KRW"}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setAutoTries(0);
              load();
            }}
            aria-label="새로고침"
            title="새로고침"
            className="text-mute hover:text-ink transition-colors active:scale-95"
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={loading ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-mute">불러오는 중...</p>}

      {!loading && error && (
        <p className="text-xs text-mute">
          {holdingsErrorText(rateLimited, autoTries < MAX_AUTO_RELOADS)}
        </p>
      )}

      {!loading && !error && list.length === 0 && (
        <p className="text-xs text-mute">
          {autoTries < MAX_AUTO_RELOADS ? "보유 정보를 불러오는 중… 자동으로 다시 시도합니다." : "보유한 해외주식이 없습니다."}
        </p>
      )}

      {!loading && list.length > 0 && (
        <>
          {/* KPI 메트릭 타일 — 총 평가금액 + 총 손익 (POSITIONS 타일 제거) */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-lg border border-hairline bg-canvas p-4">
              <div className="eyebrow text-[10px] mb-1">TOTAL VALUE</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{money(total)}</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas p-4">
              <div className="eyebrow text-[10px] mb-1">TOTAL P/L</div>
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl tracking-[-0.02em] ${totalPL >= 0 ? "text-red-400" : "text-breeze"}`}>
                  {totalPL >= 0 ? "+" : ""}{money(totalPL)}
                </div>
                <div className={`text-[11px] ${totalPL >= 0 ? "text-red-400" : "text-breeze"}`}>
                  {totalPL >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* 보유 종목 — 비중 큰 순. 현재가 vs 평단을 게이지로 시각화 */}
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {sorted.map((h) => {
              const up = h.profitLoss >= 0;
              const pct = h.profitLossPct;
              // 손익 게이지: 중앙=평단(break-even). ±40%를 반폭 최대치로 매핑.
              const GAUGE_CAP = 40;
              const frac = Math.min(Math.abs(pct) / GAUGE_CAP, 1);
              const weight = total > 0 ? (h.marketValue / total) * 100 : 0;
              return (
                <div
                  key={h.ticker}
                  className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas p-4"
                >
                  {/* 헤더: 티커·종목명 + 손익률 배지 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-ink">{h.ticker}</div>
                      <div className="text-[11px] text-mute truncate">{h.name}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                        up ? "text-red-400 bg-red-500/10" : "text-breeze bg-breeze/10"
                      }`}
                    >
                      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
                    </span>
                  </div>

                  {/* 현재가 vs 평단가 비교 */}
                  <div>
                    <div className="flex items-end justify-between gap-2 mb-1.5">
                      <div>
                        <div className="text-[10px] text-mute mb-0.5">현재가</div>
                        <div className="font-mono text-base leading-none text-ink">
                          {money(h.currentPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-mute mb-0.5">평단가</div>
                        <div className="font-mono text-sm leading-none text-body">
                          {money(h.avgPrice)}
                        </div>
                      </div>
                    </div>
                    {/* 게이지: 중앙 눈금=평단, 우측(red)=이익 / 좌측(breeze)=손실 */}
                    <div className="relative h-1.5 rounded-full bg-canvas-soft overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-canvas-mid" />
                      <div
                        className={`absolute inset-y-0 ${up ? "left-1/2 bg-red-400" : "right-1/2 bg-breeze"}`}
                        style={{ width: `${frac * 50}%` }}
                      />
                    </div>
                  </div>

                  {/* 푸터: 평가금액 + 수량·비중 */}
                  <div className="flex items-end justify-between gap-2 border-t border-hairline pt-2">
                    <div>
                      <div className="text-[10px] text-mute mb-0.5">평가금액</div>
                      <div className="text-sm text-ink">{money(h.marketValue)}</div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-mute">
                      {h.quantity}주 · {weight.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

// ─── DailyCheckView ──────────────────────────────────────────────────────
// 보유 종목의 '당일 등락'을 온디맨드로 조회해 /news-pulse 대상을 선별한다.
// 백그라운드 상시 감시는 로컬 전용(토스 IP 허용목록 + localhost) 제약상 불가하므로
// 버튼 트리거 방식. 당일 등락은 /api/quotes(Yahoo)에서 가져온다(holdings의
// profitLossPct는 누적 손익률이라 당일 등락이 아님).

interface Quote {
  ticker: string;
  price: number | null;
  prevClose: number | null;
  changePct: number | null;
}

// news-pulse 기본 탐색기간(붙여넣은 뒤 사용자가 조정 가능). 임계값 프리셋(%).
const PULSE_PERIOD = "7일";
const CHECK_THRESHOLDS = [3, 5, 10];

function DailyCheckView() {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  // 캐시가 있으면 즉시 표시하고 스피너를 건너뛴다(백그라운드 갱신만 수행).
  const [holdingsLoading, setHoldingsLoading] = useState(
    !(holdingsCache && holdingsCache.length > 0)
  );
  const [autoTries, setAutoTries] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, Quote> | null>(quotesCache);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [quoteAutoTries, setQuoteAutoTries] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [copied, setCopied] = useState<string | null>(null);
  // 캐시된 시세가 있어도 마운트당 한 번은 백그라운드로 갱신하기 위한 플래그.
  const bgRefreshed = useRef(false);

  // 등락 체크 대상이 될 보유 목록을 로드. 토스 API는 첫 호출에 비어 오는 경우가
  // 잦아(HoldingsBanner와 동일) 에러/빈 목록이면 자동으로 재시도한다.
  const loadHoldings = useCallback(() => {
    // 캐시가 없을 때만 스피너를 띄우고, 캐시가 있으면 조용히 백그라운드 갱신한다.
    if (!(holdingsCache && holdingsCache.length > 0)) setHoldingsLoading(true);
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => {
        setHoldingsError(d.error ?? null);
        setRateLimited(!!d.rateLimited);
        commitHoldings(Array.isArray(d.holdings) ? d.holdings : [], setHoldings);
      })
      .catch((e) => setHoldingsError(String(e)))
      .finally(() => setHoldingsLoading(false));
  }, []);

  // 캐시 복원은 마운트 후에만(렌더 중 localStorage 접근 시 하이드레이션 불일치). HoldingsBanner 참조.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) {
      setHoldings(holdingsCache);
      setHoldingsLoading(false);
    }
    if (quotesCache) setQuotes(quotesCache);
  }, []);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  // 자동 재시도: 로딩이 끝났는데 아직 안 떴으면(에러 또는 빈 목록) 잠시 후 다시.
  // 정상 표시 중이거나 상한 도달 시 종료(백오프는 retryDelayMs — 429는 더 길게).
  useEffect(() => {
    if (holdingsLoading) return;
    if ((holdings?.length ?? 0) > 0) return;
    if (autoTries >= MAX_AUTO_RELOADS) return;
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      loadHoldings();
    }, retryDelayMs(autoTries, rateLimited));
    return () => clearTimeout(timer);
  }, [holdingsLoading, holdings, holdingsError, autoTries, rateLimited, loadHoldings]);

  const runCheck = useCallback(async () => {
    if (!holdings || holdings.length === 0) return;
    setChecking(true);
    setCheckError(null);
    try {
      const tickers = holdings.map((h) => h.ticker).join(",");
      const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickers)}`);
      const d = await res.json();
      const map: Record<string, Quote> = {};
      for (const q of (d.quotes ?? []) as Quote[]) map[q.ticker] = q;
      commitQuotes(map, setQuotes);
    } catch {
      setCheckError("시세를 불러오지 못했습니다.");
    } finally {
      setChecking(false);
    }
  }, [holdings]);

  // 보유 목록이 뜨면 버튼 없이 당일 등락을 자동 조회한다(포트폴리오 배너처럼).
  // 캐시된 시세가 있으면 즉시 그걸 보여주되, 마운트당 한 번은 백그라운드로 갱신한다
  // (스피너로 rows를 비우지 않음). 캐시가 없으면 성공까지 백오프로 재시도(상한까지).
  useEffect(() => {
    if (!holdings || holdings.length === 0) return; // 보유 목록 먼저
    if (checking) return; // 진행 중
    if (quotes && bgRefreshed.current) return; // 이미 캐시 표시 + 백그라운드 갱신 완료
    if (!quotes && quoteAutoTries >= MAX_AUTO_RELOADS) return;
    const delay = quoteAutoTries === 0 ? 0 : Math.min(2000 * quoteAutoTries, 10000);
    const timer = setTimeout(() => {
      bgRefreshed.current = true;
      setQuoteAutoTries((n) => n + 1);
      runCheck();
    }, delay);
    return () => clearTimeout(timer);
  }, [holdings, quotes, checking, quoteAutoTries, runCheck]);

  // 수동 새로고침: quotes를 비우면 위 자동 조회 이펙트가 즉시 다시 돈다.
  const refreshCheck = useCallback(() => {
    setQuoteAutoTries(0);
    setQuotes(null);
    setCheckError(null);
  }, []);

  const copyCmd = async (ticker: string, changePct: number | null) => {
    const move =
      changePct != null ? `당일 ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%` : "";
    const cmd = `/news-pulse ${ticker} ${move} 탐색기간 ${PULSE_PERIOD}`.replace(/\s+/g, " ").trim();
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(ticker);
      setTimeout(() => setCopied((c) => (c === ticker ? null : c)), 2000);
    } catch {
      // 클립보드 API 미지원/거부 시 무시(성공 표시 안 함).
    }
  };

  // 체크 후에는 당일 등락 절대값 큰 순으로 정렬(데이터 없는 항목은 뒤로).
  const rows = (holdings ?? []).map((h) => ({ h, q: quotes?.[h.ticker] ?? null }));
  if (quotes) {
    rows.sort((a, b) => {
      const av = a.q?.changePct == null ? -Infinity : Math.abs(a.q.changePct);
      const bv = b.q?.changePct == null ? -Infinity : Math.abs(b.q.changePct);
      return bv - av;
    });
  }
  const flaggedCount = quotes
    ? rows.filter((r) => r.q?.changePct != null && Math.abs(r.q.changePct as number) >= threshold)
        .length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 컨트롤: 기준 임계값 + 체크 버튼 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-[10px]">기준</span>
          <div
            role="group"
            aria-label="급변동 기준"
            className="flex rounded-full border border-hairline bg-canvas-soft p-0.5"
          >
            {CHECK_THRESHOLDS.map((t) => {
              const active = threshold === t;
              return (
                <button
                  key={t}
                  onClick={() => setThreshold(t)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors active:scale-95 ${
                    active ? "bg-white text-canvas" : "text-mute hover:text-ink"
                  }`}
                >
                  ±{t}%
                </button>
              );
            })}
          </div>
        </div>
        {/* 설명 툴팁 — 기준 우측 ? 아이콘 (hover/focus 시 표시) */}
        <span className="relative inline-flex group">
          <button
            type="button"
            aria-label="당일 등락 체크 설명"
            className="h-5 w-5 shrink-0 rounded-full border border-hairline flex items-center justify-center text-[11px] text-mute hover:text-ink hover:bg-canvas-soft transition-colors focus:outline-none focus:text-ink"
          >
            ?
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-hairline bg-canvas-card px-3 py-2.5 text-xs leading-relaxed text-mute opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            보유 종목의 <span className="text-body">당일 등락</span>을 조회해 급변동 종목을 선별합니다.
            기준을 넘는 종목은 <span className="font-mono text-body">/news-pulse</span> 명령을 복사해
            Claude Code에서 직접 실행하세요 (대시보드는 스킬을 대신 실행하지 않습니다).
          </span>
        </span>
        {quotes && (
          <span className="text-xs text-mute">
            기준(±{threshold}%) 초과 <span className="text-body">{flaggedCount}종목</span>
          </span>
        )}
        {/* 다시 체크 — 상단 포트폴리오 카드와 동일한 우측 새로고침 아이콘 */}
        <button
          onClick={refreshCheck}
          disabled={checking || !holdings || holdings.length === 0}
          aria-label="다시 체크"
          title="다시 체크"
          className="ml-auto text-mute hover:text-ink transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={checking ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      {/* 상태 메시지 (배너와 동일한 자동 재시도 흐름) */}
      {holdingsLoading && (holdings?.length ?? 0) === 0 && (
        <p className="text-xs text-mute">보유 정보를 불러오는 중...</p>
      )}
      {!holdingsLoading && holdingsError && (
        <p className="text-xs text-mute">
          {holdingsErrorText(rateLimited, autoTries < MAX_AUTO_RELOADS)}
        </p>
      )}
      {!holdingsLoading && !holdingsError && holdings && holdings.length === 0 && (
        <p className="text-xs text-mute">
          {autoTries < MAX_AUTO_RELOADS
            ? "보유 정보를 불러오는 중… 자동으로 다시 시도합니다."
            : "보유한 해외주식이 없습니다."}
        </p>
      )}
      {checkError && (
        <p className="text-xs text-mute">
          {checkError}
          {quoteAutoTries < MAX_AUTO_RELOADS && " 자동으로 다시 시도 중…"}
        </p>
      )}

      {/* 표 */}
      {holdings && holdings.length > 0 && (
        <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-4 py-2.5 eyebrow text-[10px]">종목</th>
                  <th className="text-right px-4 py-2.5 eyebrow text-[10px]">현재가</th>
                  <th className="text-right px-4 py-2.5 eyebrow text-[10px]">당일</th>
                  <th className="text-right px-4 py-2.5 eyebrow text-[10px]">PULSE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ h, q }) => {
                  const chg = q?.changePct ?? null;
                  const flag = chg != null && Math.abs(chg) >= threshold;
                  const up = chg != null && chg >= 0;
                  return (
                    <tr
                      key={h.ticker}
                      className={`border-b border-hairline last:border-0 ${flag ? "bg-white/[0.03]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-ink">{h.ticker}</span>
                          {flag && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium text-sunset-soft bg-sunset/10">
                              급변동
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-mute truncate max-w-[180px]">{h.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-body">
                        {q?.price != null ? fmtUsd(q.price) : quotes ? "—" : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {chg != null ? (
                          <span className={up ? "text-red-400" : "text-breeze"}>
                            {up ? "+" : ""}
                            {chg.toFixed(2)}%
                          </span>
                        ) : quotes ? (
                          <span className="text-mute">N/A</span>
                        ) : (
                          <span className="text-mute">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyCmd(h.ticker, chg)}
                          title="/news-pulse 명령 복사"
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors active:scale-95 ${
                            flag
                              ? "border-white/40 text-ink hover:bg-white hover:text-canvas"
                              : "border-hairline text-mute hover:text-ink hover:bg-canvas-soft"
                          }`}
                        >
                          {copied === h.ticker ? "복사됨" : "명령 복사"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GlossaryView ──────────────────────────────────────────────────────────
// 보고서에 자주 쓰이는 재무·투자 용어 사전. 계산식 + 해석 + 흔한 함정(⚠️)까지.
type GlossaryTerm = { t: string; abbr?: string; formula?: string; desc: string; note?: string };

const GLOSSARY: { cat: string; terms: GlossaryTerm[] }[] = [
  {
    cat: "수익성 (Profitability)",
    terms: [
      {
        t: "매출총이익",
        abbr: "Gross Profit",
        formula: "매출 − 매출원가(COGS)",
        desc: "제품·서비스를 팔아 직접 원가만 뺀 1차 이익. 판관비·R&D·이자·세금은 아직 빼기 전이다.",
        note: "절대 금액이라 규모가 다른 기업 비교엔 아래 매출총이익률(율)을 본다.",
      },
      {
        t: "매출총이익률",
        abbr: "Gross Margin",
        formula: "매출총이익 ÷ 매출",
        desc: "매출 1원에서 원가를 뺀 뒤 남는 비율. 높을수록 가격결정력·차별화(브랜드·특허·네트워크)가 크다.",
        note: "산업마다 정상 수준이 다르다(소프트웨어 80%+ vs 유통 10%대). 절대치보다 동종업계·추세로 본다. — 열등주 스크리닝 지표 ④(15% 미만 탈락).",
      },
      {
        t: "영업이익률",
        abbr: "Operating Margin",
        formula: "영업이익 ÷ 매출",
        desc: "판관비·R&D까지 뺀 본업 자체의 수익성. 이자·세금·일회성 이전이라 사업 체력을 본다.",
      },
      {
        t: "순이익률",
        abbr: "Net Margin",
        formula: "순이익 ÷ 매출",
        desc: "이자·세금·일회성까지 전부 뺀 최종 이익률. 매출이 흔들려도 이익이 살아남는 위기 내성을 뜻한다.",
        note: "자산매각·소송·세금환입 같은 일회성에 왜곡되므로 여러 해 평균으로 본다. — 지표 ⑥(5% 미만 탈락).",
      },
    ],
  },
  {
    cat: "현금흐름·이익의 질 (Cash Flow)",
    terms: [
      {
        t: "EBITDA",
        abbr: "이자·세금·감가상각 전 이익",
        formula: "영업이익 + 감가상각비(D&A)",
        desc: "감가상각을 되더한 대략적 영업 현금창출력. 자본집약 사업 간 비교에 쓴다.",
        note: "⚠️ 매년 실제로 나가는 유지투자(Capex)를 가린다. 버핏·멍거는 EBITDA를 이익처럼 말하는 것을 경계한다 — Capex가 큰 사업일수록 실제 벌이보다 좋아 보인다.",
      },
      {
        t: "조정 EBITDA",
        abbr: "Adj. EBITDA",
        desc: "EBITDA에서 회사가 일회성이라 주장하는 항목(구조조정비·주식보상비 등)을 추가로 뺀 값.",
        note: "⚠️ 무엇을 조정할지 회사가 정한다. 주식보상비(SBC)까지 비용이 아닌 척 되더하는 등 과대포장 여지가 크다 — 무엇을 조정했는지 반드시 확인.",
      },
      {
        t: "영업현금흐름",
        abbr: "OCF (Operating Cash Flow)",
        desc: "영업활동으로 실제 들어온 현금. 회계상 이익과 달리 진짜 현금 흐름을 본다.",
      },
      {
        t: "자본적지출",
        abbr: "Capex (Capital Expenditure)",
        desc: "공장·설비·서버 등 장기 자산에 쓴 투자 현금. 사업 유지·성장을 위해 매년 나가는 돈.",
        note: "유지 Capex(현 수준 유지)와 성장 Capex(확장)를 구분하면 진짜 잉여현금이 보인다.",
      },
      {
        t: "잉여현금흐름",
        abbr: "FCF (Free Cash Flow)",
        formula: "영업현금흐름(OCF) − Capex",
        desc: "사업 유지 투자까지 하고 주주에게 자유롭게 쓸 수 있는 현금. 배당·자사주·부채상환의 원천이자 가치투자의 핵심 숫자.",
        note: "5년 누적이 음수면 위험 신호. — 지표 ②.",
      },
      {
        t: "이익의 질",
        abbr: "OCF ÷ Net Income",
        formula: "영업현금흐름 ÷ 순이익",
        desc: "장부상 이익이 실제 현금으로 회수되는 정도. 1.0 근처 이상이 건강하다.",
        note: "낮으면 이익이 매출채권·재고에 묶였거나 회계적일 수 있다. 5년 평균 0.7 미만이면 탈락 — 지표 ⑤.",
      },
    ],
  },
  {
    cat: "재무 안전성 (Safety)",
    terms: [
      {
        t: "이자커버리지",
        abbr: "Interest Coverage",
        formula: "영업이익(EBIT) ÷ 이자비용",
        desc: "영업으로 번 이익으로 이자를 몇 배 감당하는지. 높을수록 빚 부담이 안전하다.",
        note: "2배 미만이면 위험 — 지표 ③. 은행·보험은 이자마진이 본업이라 이 지표를 적용하지 않는다.",
      },
    ],
  },
  {
    cat: "자본 효율 (Returns on Capital)",
    terms: [
      {
        t: "자기자본이익률",
        abbr: "ROE (Return on Equity)",
        formula: "순이익 ÷ 자기자본",
        desc: "주주가 맡긴 자본으로 얼마를 벌었나. 자본 효율의 대표 지표. 10년 평균 8% 미만이면 탈락 — 지표 ①.",
        note: "⚠️ 부채를 늘리거나 자사주를 많이 사면 자기자본이 줄어 ROE가 인위적으로 높아진다. 아래 ROIC와 함께 봐야 한다.",
      },
      {
        t: "투하자본이익률",
        abbr: "ROIC (Return on Invested Capital)",
        formula: "세후영업이익(NOPAT) ÷ 투하자본(자기자본+순부채)",
        desc: "부채까지 포함한 전체 투입 자본의 수익률. 자본구조 왜곡이 적어 ROE의 함정을 보완한다.",
        note: "ROIC가 자본비용(WACC)보다 높아야 가치를 창출한다. 진짜 우량기업은 이 값이 장기간 높게 유지된다.",
      },
    ],
  },
  {
    cat: "밸류에이션 (Valuation)",
    terms: [
      {
        t: "주당순이익",
        abbr: "EPS (Earnings Per Share)",
        formula: "순이익 ÷ 발행주식수",
        desc: "주식 1주가 벌어들인 순이익.",
        note: "스톡옵션까지 반영한 희석 주식수 기준(Diluted EPS)이 더 보수적이다.",
      },
      {
        t: "주가수익비율",
        abbr: "PER / P/E",
        formula: "주가 ÷ EPS  (= 시총 ÷ 순이익)",
        desc: "이익 1원에 시장이 몇 배를 지불하는지. 높을수록 성장 기대가 크거나 고평가.",
        note: "이익이 적자·일회성이면 무의미. 성장률·업종과 함께 본다.",
      },
      {
        t: "주가순자산비율",
        abbr: "PBR / P/B",
        formula: "주가 ÷ 주당순자산  (= 시총 ÷ 자기자본)",
        desc: "순자산 대비 주가. 자산 기반 사업(은행·제조)에 유용하다.",
        note: "브랜드·소프트웨어 등 무형자산 중심 기업엔 의미가 약하다.",
      },
      {
        t: "주가매출비율",
        abbr: "PSR / P/S",
        formula: "시총 ÷ 매출",
        desc: "아직 이익이 없는(적자) 성장기업을 가늠하는 보조 지표.",
        note: "이익률을 무시하므로 단독 사용은 위험하다.",
      },
    ],
  },
  {
    cat: "자본배분·가치투자 개념",
    terms: [
      {
        t: "발행주식수 희석",
        abbr: "Share Dilution",
        desc: "신주 발행·스톡옵션으로 주식수가 늘면 기존 주주 몫이 줄어든다(반대는 자사주 매입 = 농축).",
        note: "M&A 외 원인으로 5년간 20% 초과 증가면 탈락 — 지표 ⑦.",
      },
      {
        t: "경제적 해자",
        abbr: "Moat",
        desc: "경쟁자가 쉽게 넘볼 수 없는 지속적 우위(브랜드·네트워크효과·전환비용·규모·특허). 높은 마진·ROIC가 오래 유지되는 근본 원인.",
        note: "버핏의 핵심 질문 — 이 해자가 10년 뒤에도 넓어질까?",
      },
      {
        t: "안전마진",
        abbr: "Margin of Safety",
        desc: "추정한 내재가치보다 충분히 싸게 사서 오판·불운을 흡수하는 완충. 그레이엄·버핏의 제1원칙.",
        note: "정밀한 목표가보다 넉넉한 할인폭이 핵심이다.",
      },
      {
        t: "총 도달가능 시장",
        abbr: "TAM (Total Addressable Market)",
        desc: "제품이 이론상 최대로 차지할 수 있는 전체 시장 규모. 성장 여력을 가늠한다.",
        note: "⚠️ 대개 [추정]이며 논제를 떠받치는 핵심 가정이 되기 쉽다 — 낙관 편향 주의(신뢰도 낮게 잡을 것).",
      },
    ],
  },
];

// ─── 트랙레코드 (TASK-38 Phase 3) ────────────────────────────────────────────
// 콜 원장(data/calls.jsonl)을 외부 실측(Yahoo)으로 채점한 결과를 보여준다.
// 자기신고가 아닌 외부 대조 — 시스템이 체계적으로 틀리는지 드러내는 장치.

// 콜 라벨은 '예측'을 가리킨다 — buy=오를 것, keep=들고 가도 될 것, hold=진입가로 내려올 것,
// avoid=내릴 것. keep(이미 보유)과 hold(미보유·대기)는 정반대를 예측하므로 라벨도 분리한다.
// (원장은 매매 기록이 아니라 판단 기록이다. 실보유는 포트폴리오 탭/토스 연동 소관.)
const CALL_LABEL: Record<string, { label: string; color: string }> = {
  buy: { label: "매수", color: "text-breeze bg-breeze/10" },
  keep: { label: "보유 유지", color: "text-twilight bg-twilight/10" },
  hold: { label: "관망", color: "text-amber-300 bg-amber-500/10" },
  avoid: { label: "회피", color: "text-mute bg-canvas-soft" },
};

const STATUS_STYLE: Record<CallStatus, { label: string; color: string; dot: string }> = {
  적중: { label: "적중", color: "text-emerald-300 bg-emerald-500/15", dot: "bg-emerald-400" },
  빗나감: { label: "빗나감", color: "text-red-300 bg-red-500/15", dot: "bg-red-400" },
  진행중: { label: "진행중", color: "text-amber-300 bg-amber-500/15", dot: "bg-amber-400" },
  unknown: { label: "미채점", color: "text-mute bg-canvas-soft", dot: "bg-canvas-mid" },
};

// 수익률·손익 색은 앱 전역 규칙(한국식: 상승=빨강, 하락=파랑)을 따른다.
function moveColor(v: number | null | undefined): string {
  if (v == null) return "text-mute";
  return v >= 0 ? "text-red-400" : "text-breeze";
}

function TrackRecordView() {
  const [calls, setCalls] = useState<ScoredCall[] | null>(null);
  const [agg, setAgg] = useState<CallAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setCalls(Array.isArray(d.calls) ? d.calls : []);
          setAgg(d.aggregate ?? null);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rate = agg?.directionHitRate;
  const pct = (v: number | null | undefined, d = 0) =>
    typeof v === "number" ? `${(v * 100).toFixed(d)}%` : "—";

  return (
    <div>
      <p className="text-sm text-mute mb-6 leading-relaxed">
        과거 매수/보유/회피 콜을 <span className="text-body">외부 실측(Yahoo 시세)</span>으로
        채점합니다. 콜 시점가는 낸 순간 박제되어 수정되지 않으며, 채점 기준은 모델이 아니라 시장입니다.
      </p>

      {loading && !calls && <p className="text-xs text-mute">불러오는 중...</p>}

      {error && (
        <div className="flex items-center gap-3 text-xs mb-4">
          <span className="text-red-300">트랙레코드를 불러오지 못했습니다.</span>
          <button
            onClick={load}
            className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {calls && calls.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-hairline bg-canvas-card px-5 py-8 text-center">
          <p className="text-sm text-body">아직 기록된 콜이 없습니다.</p>
          <p className="mt-1.5 text-xs text-mute leading-relaxed">
            <code className="font-mono text-breeze">/investment-checklist</code>,{" "}
            <code className="font-mono text-breeze">/investment-team</code>,{" "}
            <code className="font-mono text-breeze">/thesis-tracker</code>가 buy/hold/avoid 판정을
            낼 때 콜이 원장(<code className="font-mono">data/calls.jsonl</code>)에 기록되어 여기 나타납니다.
          </p>
        </div>
      )}

      {calls && calls.length > 0 && agg && (
        <>
          {/* 집계 KPI 타일 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">방향 적중률</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">
                {rate != null ? pct(rate) : "—"}
              </div>
              <div className="text-[11px] text-mute mt-0.5">
                {rate != null
                  ? `${agg.directionHits}/${agg.resolvedCount} · 95% CI ${pct(agg.ci95[0])}~${pct(agg.ci95[1])}`
                  : "확정 콜 없음"}
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">확정 콜</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{agg.resolvedCount}</div>
              <div className="text-[11px] text-mute mt-0.5">horizon 경과</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">진행 중</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{agg.inProgress}</div>
              <div className="text-[11px] text-mute mt-0.5">잠정 채점</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="eyebrow text-[10px] mb-1">평균 목표 오차</div>
              <div className={`text-2xl tracking-[-0.02em] ${moveColor(agg.avgTargetErrorPct)}`}>
                {agg.avgTargetErrorPct != null
                  ? `${agg.avgTargetErrorPct >= 0 ? "+" : ""}${agg.avgTargetErrorPct.toFixed(1)}%`
                  : "—"}
              </div>
              <div className="text-[11px] text-mute mt-0.5">현재가 vs 목표중앙</div>
            </div>
          </div>

          {agg.smallSample && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-sunset/30 bg-sunset/10 px-3 py-2 text-xs text-sunset-soft">
              <span className="font-medium shrink-0">표본 &lt;10</span>
              <span>
                적중률은 성과가 아니라 규율 신호입니다. 표본이 커지기 전엔 과대해석하지 마세요(신뢰구간 참고).
              </span>
            </div>
          )}

          {/* 콜 목록 표 — 넓은 화면에서 표, 좁으면 자체 가로 스크롤 */}
          <div className="rounded-lg border border-hairline bg-canvas-card overflow-hidden">
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-sm border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-hairline text-left">
                    {["종목", "콜", "콜 시점", "시점가", "현재가", "수익률", "목표", "경과", "상태"].map(
                      (h) => (
                        <th key={h} className="eyebrow text-[10px] text-mute font-normal px-3 py-2.5">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => {
                    const cl = CALL_LABEL[c.call] ?? CALL_LABEL.hold;
                    const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.unknown;
                    const band =
                      c.target && (c.target.low != null || c.target.high != null)
                        ? `$${c.target.low ?? "?"}~${c.target.high ?? "?"}${
                            c.target.horizonMonths ? ` · ${c.target.horizonMonths}M` : ""
                          }`
                        : "—";
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-hairline last:border-0 hover:bg-canvas-soft/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-mono text-ink">{c.ticker}</div>
                          <div className="text-[10px] text-mute truncate max-w-[140px]">{c.skill}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cl.color}`}>
                            {cl.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{c.date}</td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceAtCall === "number" ? `$${c.priceAtCall.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-body">
                          {typeof c.priceNow === "number" ? `$${c.priceNow.toFixed(2)}` : "—"}
                        </td>
                        <td className={`px-3 py-2.5 font-mono ${moveColor(c.returnPct)}`}>
                          {typeof c.returnPct === "number"
                            ? `${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{band}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-mute">
                          {c.elapsedDays}d
                          {c.horizonProgress != null && (
                            <span className="text-mute/70"> · {Math.round(c.horizonProgress * 100)}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {c.report && (
                            <button
                              onClick={() => setModalPath(c.report!)}
                              className="ml-2 text-[11px] text-mute hover:text-ink underline underline-offset-2 transition-colors"
                            >
                              보고서
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-mute leading-relaxed">
            ※ 콜 이후 액면분할 등으로 시점가와 현재가의 기준이 달라질 수 있습니다(현재가는 분할 조정됨).
            무효화(레드라인) 조건은 재무 데이터가 필요해 자동 채점하지 않고 기록만 합니다.
          </p>
        </>
      )}

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

function GlossaryView() {
  const [cat, setCat] = useState<string>("전체");
  const cats = ["전체", ...GLOSSARY.map((g) => g.cat)];
  const shown = cat === "전체" ? GLOSSARY : GLOSSARY.filter((g) => g.cat === cat);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-mute leading-relaxed">
        보고서에 자주 나오는 재무·투자 용어 설명입니다. 계산식과 함께, 해석할 때 흔히 빠지는
        함정(<span className="text-sunset-soft">⚠️</span>)도 적어뒀습니다.
      </p>

      {/* 카테고리 필터 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors active:scale-95 ${
                active
                  ? "bg-white text-canvas border-white"
                  : "border-hairline text-body hover:text-ink hover:bg-canvas-soft"
              }`}
            >
              {c === "전체" ? "전체" : c.split(" (")[0]}
            </button>
          );
        })}
      </div>

      {shown.map((group) => (
        <section key={group.cat} className="flex flex-col gap-3">
          <h2 className="eyebrow text-[11px] text-mute">{group.cat}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {group.terms.map((term) => (
              <div
                key={term.t}
                className="flex flex-col gap-2 rounded-lg border border-hairline bg-canvas-card p-5"
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base text-ink tracking-[-0.01em]">{term.t}</span>
                  {term.abbr && <span className="text-[11px] font-mono text-mute">{term.abbr}</span>}
                </div>
                {term.formula && (
                  <div className="w-fit max-w-full break-words rounded-md border border-hairline bg-canvas px-3 py-1.5 text-xs font-mono text-breeze">
                    {term.formula}
                  </div>
                )}
                <p className="text-sm text-body leading-relaxed">{term.desc}</p>
                {term.note && (
                  <p className="border-l-2 border-hairline pl-3 text-xs text-mute leading-relaxed">
                    {term.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// 보고서 삭제 확인 모달(개발 단계 정리용). 파괴적 동작이라 확인 + 복구 안내를 명시.
function ConfirmDeleteModal({
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
  const filename = path.split("/").pop() ?? path;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-canvas border border-hairline p-6"
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
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-hairline px-4 py-1.5 text-sm text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
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
function SectorGroupEditor({
  companies,
  groups,
  onSave,
  onClose,
}: {
  companies: string[];
  groups: SectorGroup[];
  onSave: (groups: SectorGroup[]) => void;
  onClose: () => void;
}) {
  useBodyScrollLock();
  const [draft, setDraft] = useState<SectorGroup[]>(() =>
    groups.map((g) => ({ ...g, tickers: [...g.tickers] }))
  );

  // 종목을 특정 그룹에 토글 배정. 같은 그룹이면 해제, 다른 그룹이면 그쪽에서 제거 후 이동.
  const assign = (ticker: string, groupId: string) => {
    const key = normalizeTicker(ticker);
    setDraft((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          const has = g.tickers.some((t) => normalizeTicker(t) === key);
          return {
            ...g,
            tickers: has
              ? g.tickers.filter((t) => normalizeTicker(t) !== key)
              : [...g.tickers, key],
          };
        }
        // 배타적: 다른 그룹에서는 제거
        return { ...g, tickers: g.tickers.filter((t) => normalizeTicker(t) !== key) };
      })
    );
  };

  const rename = (id: string, name: string) =>
    setDraft((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  const removeGroup = (id: string) => setDraft((prev) => prev.filter((g) => g.id !== id));
  const addGroup = () =>
    setDraft((prev) => [
      ...prev,
      { id: newGroupId(prev.length), name: "", tickers: [] },
    ]);

  const assignedKeys = new Set(draft.flatMap((g) => g.tickers.map(normalizeTicker)));
  const unassigned = companies.filter((c) => !assignedKeys.has(normalizeTicker(c)));

  const names = draft.map((g) => g.name.trim());
  const hasEmptyName = names.some((n) => n.length === 0);
  const hasDupName = new Set(names).size !== names.length;
  const canSave = !hasEmptyName && !hasDupName;

  const save = () => {
    if (!canSave) return;
    onSave(draft.map((g) => ({ ...g, name: g.name.trim() })));
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-8 rounded-lg bg-canvas border border-hairline overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div>
            <div className="eyebrow text-[10px]">SECTOR GROUPS</div>
            <div className="text-lg tracking-[-0.02em] text-ink leading-tight">섹터 그룹 편집</div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-mute leading-relaxed">
            그룹 이름을 정하고, 아래 종목 칩을 눌러 그룹에 넣으세요. 한 종목은 한 그룹에만 속합니다.
            어느 그룹에도 넣지 않은 종목은 <span className="text-body">미분류</span>로 표시됩니다.
          </p>

          {draft.map((g) => (
            <div key={g.id} className="rounded-lg border border-hairline bg-canvas-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={g.name}
                  onChange={(e) => rename(g.id, e.target.value)}
                  placeholder="그룹 이름 (예: 헬스케어)"
                  className="flex-1 rounded-lg bg-canvas-soft border border-hairline px-3 py-2 text-sm text-ink placeholder-mute focus:outline-none focus:border-white/40 transition-colors"
                />
                <button
                  onClick={() => removeGroup(g.id)}
                  title="그룹 삭제"
                  className="shrink-0 rounded-full border border-hairline px-3 py-2 text-xs text-mute hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-colors active:scale-95"
                >
                  삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {companies.map((c) => {
                  const selected = g.tickers.some((t) => normalizeTicker(t) === normalizeTicker(c));
                  return (
                    <button
                      key={c}
                      onClick={() => assign(c, g.id)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors border active:scale-95 ${
                        selected
                          ? "bg-white text-canvas border-white"
                          : "bg-transparent text-body border-hairline hover:text-ink hover:bg-canvas-soft"
                      }`}
                    >
                      {selected ? "✓ " : "+ "}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={addGroup}
            className="rounded-lg border border-dashed border-hairline px-4 py-2.5 text-sm text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-[0.99]"
          >
            + 그룹 추가
          </button>

          {/* 미분류 미리보기 (읽기 전용) */}
          <div>
            <div className="eyebrow text-[10px] mb-1.5 text-mute">미분류 {unassigned.length}</div>
            {unassigned.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((c) => (
                  <span
                    key={c}
                    className="rounded-full px-3 py-1 text-xs border border-hairline text-mute"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mute">모든 종목이 그룹에 배정되었습니다.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-hairline">
          <span className="text-xs text-mute">
            {hasEmptyName
              ? "빈 그룹 이름이 있습니다."
              : hasDupName
                ? "그룹 이름이 중복됩니다."
                : "브라우저에 저장됩니다."}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-hairline px-4 py-1.5 text-sm text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="rounded-full bg-white text-canvas px-4 py-1.5 text-sm font-medium hover:bg-white/90 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EarningsCalendar ────────────────────────────────────────────────────────
// 실적 점검 탭 상단. 보유 종목을 "다가오는 실적 발표일" 순으로 정렬해 D-day와 함께
// 보여준다 — 실적 점검은 종목별 발표일에 트리거되는 이벤트라, "언제 점검할지"를
// 한눈에 안내한다. 발표일은 /api/earnings-calendar(Yahoo calendarEvents)에서 온다.
// 각 행의 '분석'은 /earnings-review 단계를 그 티커로 프리필해 연다.

interface EarningsInfo {
  ticker: string;
  date: string | null; // "YYYY-MM-DD"
  epochMs: number | null;
  estimate: boolean;
}

// 실적일 → D-day 라벨 + 정렬용 순위. 미래일수록 우선(다가오는 점검), 과거는 뒤로,
// 미상(날짜 없음)은 맨 끝. rank가 작을수록 위로 온다.
function earningsDayInfo(epochMs: number | null): {
  label: string;
  tone: string; // 색 톤 클래스
  rank: number;
} {
  if (epochMs == null) return { label: "발표일 미상", tone: "text-mute", rank: 3_000_000 };
  const dayMs = 86_400_000;
  const today = new Date();
  const todayMid = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(epochMs);
  const dMid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((dMid - todayMid) / dayMs);
  if (days > 0) {
    // 임박(7일 이내)은 sunset로 강조, 그 외는 일반 본문색.
    return { label: `D-${days}`, tone: days <= 7 ? "text-sunset-soft" : "text-body", rank: days };
  }
  if (days === 0) return { label: "오늘 발표", tone: "text-sunset", rank: -1 };
  // 지난 실적: 점검 대기/완료 대상. 최근일수록 위(-days가 작을수록 위)로.
  return { label: `${-days}일 전`, tone: "text-mute", rank: 1_000_000 + -days };
}

function EarningsCalendar({ onAnalyze }: { onAnalyze: (ticker: string) => void }) {
  const [holdings, setHoldings] = useState<Holding[] | null>(holdingsCache);
  const [earnings, setEarnings] = useState<Record<string, EarningsInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 보유 목록 로드(캐시 우선). 토스가 첫 호출에 비어 오면 상위 배너/당일체크의
  // 재시도가 캐시를 채우므로, 여기선 캐시를 우선 쓰고 한 번만 직접 조회한다.
  useEffect(() => {
    hydratePortfolioCache();
    if (holdingsCache && holdingsCache.length > 0) setHoldings(holdingsCache);
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.holdings) ? (d.holdings as Holding[]) : [];
        commitHoldings(list, setHoldings);
      })
      .catch(() => {});
  }, []);

  // 보유 티커가 정해지면 실적일 조회.
  useEffect(() => {
    const list = holdings ?? [];
    if (list.length === 0) return;
    setLoading(true);
    setError(null);
    const tickers = list.map((h) => h.ticker).join(",");
    fetch(`/api/earnings-calendar?tickers=${encodeURIComponent(tickers)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, EarningsInfo> = {};
        for (const e of (d.earnings ?? []) as EarningsInfo[]) map[e.ticker.toUpperCase()] = e;
        setEarnings(map);
      })
      .catch(() => setError("실적 일정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [holdings]);

  const list = holdings ?? [];
  // 실적일 순위로 정렬(다가오는 순 → 과거 → 미상).
  const rows = [...list]
    .map((h) => {
      const e = earnings?.[h.ticker.toUpperCase()];
      return { h, e, day: earningsDayInfo(e?.epochMs ?? null) };
    })
    .sort((a, b) => a.day.rank - b.day.rank);

  return (
    <section className="mb-8 rounded-lg border border-hairline bg-canvas-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="eyebrow text-[11px]">실적 캘린더</h2>
        {loading && <span className="text-[11px] text-mute">불러오는 중…</span>}
      </div>
      <p className="text-xs text-mute mb-4 leading-relaxed">
        보유 종목의 다가오는 실적 발표일. 발표 직후 아래 프로세스로 점검하세요.
        <span className="text-mute/70"> 날짜는 Yahoo 추정치로, 확정 전엔 바뀔 수 있습니다.</span>
      </p>

      {list.length === 0 ? (
        <p className="text-xs text-mute">
          {error ?? "보유 종목을 불러오는 중이거나, 표시할 보유 종목이 없습니다."}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-hairline">
          {rows.map(({ h, e, day }) => (
            <div key={h.ticker} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">{h.ticker}</span>
                  <span className="text-xs text-mute truncate">{h.name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-mute">{e?.date ?? "—"}</span>
                  {e?.estimate && e.date && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] text-mute bg-canvas-soft">
                      추정
                    </span>
                  )}
                </div>
              </div>
              <span className={`shrink-0 font-mono text-xs ${day.tone}`}>{day.label}</span>
              <button
                onClick={() => onAnalyze(h.ticker)}
                className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
              >
                분석
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HomeView({
  onSelectFlow,
  onLaunchStep,
  onOpenFlowModal,
}: {
  onSelectFlow: (f: Flow) => void;
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
      .then((r) => r.json())
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

  const companies = files
    ? (Array.from(new Set(files.map((f) => f.company).filter((c): c is string => c !== null))).sort() as string[])
    : [];
  // 루트 레벨 보고서(회사 폴더 밖)는 섹터/스크리닝 결과물이다 → '섹터 리서치' 탭에서 보여준다.
  // 포트폴리오 보고서(portfolio-latest.md)는 '포트폴리오 점검' 탭 소관이라 여기서도 제외.
  const rootFiles = files ? files.filter((f) => f.company === null && f.name !== "portfolio-latest.md") : [];
  const portfolioReport = files?.find((f) => f.company === null && f.name === "portfolio-latest.md") ?? null;
  // '종목별 보고서' 탭 위계: 섹터(1차) → 열등주 스크리닝 결과 그룹(2차) → 종목(칩) → 보고서.
  const tabs = [...companies];
  // 사용자 그룹 설정에 종속된 섹터 판정. sectorGroups가 바뀌면 아래 값들도 갱신된다.
  const sectorOf = (company: string) => sectorOfWith(sectorGroups, company);
  // 1차: 보고서가 존재하는 섹터만, 그룹 순서대로(미분류는 맨 끝).
  const reportSectors = orderedSectors(sectorGroups, companies);
  // 선택된 섹터에 속한 종목만. 섹터 미선택 시(로드 전) 전체.
  const sectorCompanies = reportSectorTab
    ? tabs.filter((t) => sectorOf(t) === reportSectorTab)
    : tabs;
  const currentFiles = sortCompanyFiles(files?.filter((f) => f.company === reportTab) ?? []);

  // 종목별 '최신 열등주 스크리닝 결과' 맵. 종목 탭을 통과/탈락 등으로 구획 분리하는 데 쓴다.
  // 파일명에 날짜(YYYYMMDD)가 박혀 사전식 정렬의 마지막이 최신. 최신부터 결과가 파싱된 것 채택.
  const screenByCompany: Record<string, string | null> = {};
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
      screenByCompany[c] = res;
    }
  }

  // 섹터 리서치 탭: 루트 파일을 섹터명으로 묶는다 (1차 = 섹터).
  const sectors = Array.from(new Set(rootFiles.map((f) => getSectorReportInfo(f.name).sector))).sort();
  const sectorCurrentFiles = sectorTab
    ? rootFiles
        .filter((f) => getSectorReportInfo(f.name).sector === sectorTab)
        // 유형(SECTOR_SECTIONS 순) → 최신 날짜 우선으로 정렬.
        .sort((a, b) => {
          const ka = SECTOR_SECTIONS.findIndex((s) => s.id === getSectorReportInfo(a.name).kind);
          const kb = SECTOR_SECTIONS.findIndex((s) => s.id === getSectorReportInfo(b.name).kind);
          return ka !== kb ? ka - kb : b.name.localeCompare(a.name);
        })
    : [];

  // 저장된 섹터 그룹 설정을 서버(Supabase)에서 불러온다. 실패 시 기본값 유지.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sector-groups")
      .then((r) => r.json())
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

        <div className="px-6 md:px-8 py-8 w-full max-w-5xl">
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
            <TrackRecordView />
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
                          key={i}
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

// ─── Main ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [view, setView] = useState<"home" | "flow">("home");
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [pickingStartFor, setPickingStartFor] = useState<Flow | null>(null);
  const [startStep, setStartStep] = useState(0);
  // 프로세스 가이드에서 단계를 열면 전체 화면 대신 모달로 띄운다(홈 컨텍스트 유지).
  const [flowModal, setFlowModal] = useState<{ flow: Flow; step: number; input?: string } | null>(null);
  // 포트폴리오 점검 탭에서 분기 카드를 누르면 플로우 전체를 모달로 띄운다.
  const [flowAllModal, setFlowAllModal] = useState<Flow | null>(null);

  return (
    <>
      {view === "home" && (
        <HomeView
          onSelectFlow={(f) => {
            if (f.startPoints && f.startPoints.length > 0) {
              setPickingStartFor(f);
            } else {
              setStartStep(0);
              setSelectedFlow(f);
              setView("flow");
            }
          }}
          onLaunchStep={(f, step, input) => setFlowModal({ flow: f, step, input })}
          onOpenFlowModal={(f) => setFlowAllModal(f)}
        />
      )}
      {view === "flow" && selectedFlow && (
        <FlowView
          flow={selectedFlow}
          initialStep={startStep}
          onBack={() => {
            setView("home");
            setSelectedFlow(null);
          }}
        />
      )}
      {flowModal && (
        <ProcessStepModal
          flow={flowModal.flow}
          stepIndex={flowModal.step}
          initialInput={flowModal.input}
          onClose={() => setFlowModal(null)}
        />
      )}
      {flowAllModal && (
        <FlowModal flow={flowAllModal} onClose={() => setFlowAllModal(null)} />
      )}
      {pickingStartFor && (
        <StartPointModal
          flow={pickingStartFor}
          onChoose={(fromStep) => {
            setStartStep(fromStep);
            setSelectedFlow(pickingStartFor);
            setPickingStartFor(null);
            setView("flow");
          }}
          onClose={() => setPickingStartFor(null)}
        />
      )}
    </>
  );
}
