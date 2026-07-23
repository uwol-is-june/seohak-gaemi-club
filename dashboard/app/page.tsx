"use client";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { flows, type Flow, type FlowStep } from "@/lib/flows";
import type { ReportFile } from "@/lib/github";
import type { Holding } from "@/lib/toss";

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

function sortCompanyFiles(files: ReportFile[]): ReportFile[] {
  return [...files].sort((a, b) => {
    const ai = FILE_ORDER.findIndex((o) => a.name === o || a.name.startsWith(o));
    const bi = FILE_ORDER.findIndex((o) => b.name === o || b.name.startsWith(o));
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
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

// 보고서 본문 fetch + 마크다운 렌더. 모달·인라인 뷰 양쪽에서 재사용한다.
function ReportContentView({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);
    fetch(`/api/reports/content?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setContent(d.content);
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
  return (
    <article className="report-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}

function ReportModal({ path, onClose }: { path: string; onClose: () => void }) {
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
          <button
            onClick={onClose}
            className="shrink-0 ml-3 h-9 w-9 rounded-full flex items-center justify-center border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto scroll-slim flex-1 px-8 py-7">
          <ReportContentView path={path} />
        </div>
      </div>
    </div>
  );
}

// ─── ReportCard ────────────────────────────────────────────────────────────
// 보고서 목록 카드 하나. 플랫 그리드와 유형별 구획 양쪽에서 재사용한다.
function ReportCard({ file, onOpen }: { file: ReportFile; onOpen: (path: string) => void }) {
  const badge = getFileBadge(file.name);
  const pill = getResultPill(file.summary);
  const conf = getConfidencePill(file.confidence);
  return (
    <button
      onClick={() => onOpen(file.path)}
      className="flex flex-col gap-2 rounded-lg bg-canvas-card border border-hairline px-4 py-3 text-left hover:border-white/30 hover:bg-canvas-soft transition-colors active:scale-[0.99]"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
          {badge.label}
        </span>
        {pill && (
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${pill.color}`}>
            {pill.label}
          </span>
        )}
        {conf && (
          <span
            title="데이터 신뢰도 (투자 매력도 아님)"
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${conf.color}`}
          >
            {conf.label}
          </span>
        )}
      </div>
      <span className="text-xs font-mono text-body break-all">{file.name}</span>
    </button>
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
}: {
  flow: Flow;
  stepIndex: number;
  onClose: () => void;
}) {
  useBodyScrollLock();
  const step = flow.steps[stepIndex];
  const [input, setInput] = useState("");
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

function HoldingsBanner() {
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ccy, setCcy] = useState<Ccy>("USD");
  const [fx, setFx] = useState<number | null>(null);
  const [autoTries, setAutoTries] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setHoldings(d.holdings ?? []);
        setIsMock(!!d.mock);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 자동 재로딩: 로딩이 끝났는데 아직 안 떴으면(에러 또는 빈 목록) 잠시 후 다시 시도.
  // 정상 표시 중이거나 상한 도달 시 종료. 백오프로 2s→최대 10s 간격.
  useEffect(() => {
    if (loading) return;
    const shown = (holdings?.length ?? 0) > 0;
    if (shown) return;
    if (autoTries >= MAX_AUTO_RELOADS) return;
    const delay = Math.min(2000 * (autoTries + 1), 10000);
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      load();
    }, delay);
    return () => clearTimeout(timer);
  }, [loading, holdings, error, autoTries, load]);

  // 저장된 통화 선호를 복원 (SSR 하이드레이션 불일치 방지 위해 마운트 후 읽음).
  useEffect(() => {
    const saved = localStorage.getItem(CCY_STORAGE_KEY);
    if (saved === "USD" || saved === "KRW") setCcy(saved);
  }, []);

  // USD→KRW 환율을 마운트 시 미리 로드해 토글이 즉시 반응하도록.
  useEffect(() => {
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.rate === "number") setFx(d.rate);
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

  return (
    <section className="mb-10 rounded-lg border border-hairline bg-canvas-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="eyebrow text-[11px]">PORTFOLIO</h2>
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
          보유 정보를 일시적으로 불러올 수 없습니다.
          {autoTries < MAX_AUTO_RELOADS && " 자동으로 다시 시도 중…"}
        </p>
      )}

      {!loading && !error && list.length === 0 && (
        <p className="text-xs text-mute">
          {autoTries < MAX_AUTO_RELOADS ? "보유 정보를 불러오는 중… 자동으로 다시 시도합니다." : "보유한 해외주식이 없습니다."}
        </p>
      )}

      {!loading && list.length > 0 && (
        <>
          {/* KPI 메트릭 타일 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <div className="eyebrow text-[10px] mb-1">TOTAL VALUE</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{money(total)}</div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <div className="eyebrow text-[10px] mb-1">TOTAL P/L</div>
              <div className={`text-2xl tracking-[-0.02em] ${totalPL >= 0 ? "text-red-400" : "text-breeze"}`}>
                {totalPL >= 0 ? "+" : ""}{money(totalPL)}
              </div>
              <div className={`text-[11px] mt-0.5 ${totalPL >= 0 ? "text-red-400" : "text-breeze"}`}>
                {totalPL >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <div className="eyebrow text-[10px] mb-1">POSITIONS</div>
              <div className="text-2xl tracking-[-0.02em] text-ink">{list.length}</div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((h) => {
              const up = h.profitLoss >= 0;
              return (
                <div
                  key={h.ticker}
                  className="shrink-0 min-w-[150px] rounded-lg border border-hairline bg-canvas p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-sm text-ink">{h.ticker}</span>
                    <span className={`text-xs font-medium ${up ? "text-red-400" : "text-breeze"}`}>
                      {up ? "+" : ""}
                      {h.profitLossPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-mute truncate mb-2">{h.name}</div>
                  <div className="text-sm text-ink">{money(h.marketValue)}</div>
                  <div className="text-[11px] text-mute mt-0.5">
                    {h.quantity}주 · 평단 {money(h.avgPrice)}
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
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [autoTries, setAutoTries] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote> | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(5);
  const [copied, setCopied] = useState<string | null>(null);

  // 등락 체크 대상이 될 보유 목록을 로드. 토스 API는 첫 호출에 비어 오는 경우가
  // 잦아(HoldingsBanner와 동일) 에러/빈 목록이면 자동으로 재시도한다.
  const loadHoldings = useCallback(() => {
    setHoldingsLoading(true);
    fetch("/api/holdings")
      .then((r) => r.json())
      .then((d) => {
        setHoldingsError(d.error ?? null);
        setHoldings(Array.isArray(d.holdings) ? d.holdings : []);
      })
      .catch((e) => setHoldingsError(String(e)))
      .finally(() => setHoldingsLoading(false));
  }, []);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  // 자동 재시도: 로딩이 끝났는데 아직 안 떴으면(에러 또는 빈 목록) 잠시 후 다시.
  // 정상 표시 중이거나 상한 도달 시 종료(백오프 2s→최대 10s).
  useEffect(() => {
    if (holdingsLoading) return;
    if ((holdings?.length ?? 0) > 0) return;
    if (autoTries >= MAX_AUTO_RELOADS) return;
    const delay = Math.min(2000 * (autoTries + 1), 10000);
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      loadHoldings();
    }, delay);
    return () => clearTimeout(timer);
  }, [holdingsLoading, holdings, holdingsError, autoTries, loadHoldings]);

  const runCheck = async () => {
    if (!holdings || holdings.length === 0) return;
    setChecking(true);
    setCheckError(null);
    try {
      const tickers = holdings.map((h) => h.ticker).join(",");
      const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickers)}`);
      const d = await res.json();
      const map: Record<string, Quote> = {};
      for (const q of (d.quotes ?? []) as Quote[]) map[q.ticker] = q;
      setQuotes(map);
    } catch {
      setCheckError("시세를 불러오지 못했습니다.");
    } finally {
      setChecking(false);
    }
  };

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
      <p className="text-sm text-mute leading-relaxed">
        보유 종목의 <span className="text-body">당일 등락</span>을 조회해 급변동 종목을 선별합니다.
        기준을 넘는 종목은 <span className="font-mono text-body">/news-pulse</span> 명령을 복사해
        Claude Code에서 직접 실행하세요 (대시보드는 스킬을 대신 실행하지 않습니다).
      </p>

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
        <button
          onClick={runCheck}
          disabled={checking || !holdings || holdings.length === 0}
          className="rounded-full bg-white text-canvas px-4 py-1.5 text-sm font-medium hover:bg-white/90 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {checking ? "체크 중…" : quotes ? "다시 체크" : "등락 체크"}
        </button>
        {quotes && (
          <span className="text-xs text-mute">
            기준(±{threshold}%) 초과 <span className="text-body">{flaggedCount}종목</span>
          </span>
        )}
      </div>

      {/* 상태 메시지 (배너와 동일한 자동 재시도 흐름) */}
      {holdingsLoading && (holdings?.length ?? 0) === 0 && (
        <p className="text-xs text-mute">보유 정보를 불러오는 중...</p>
      )}
      {!holdingsLoading && holdingsError && (
        <p className="text-xs text-mute">
          보유 정보를 일시적으로 불러올 수 없습니다.
          {autoTries < MAX_AUTO_RELOADS && " 자동으로 다시 시도 중…"}
        </p>
      )}
      {!holdingsLoading && !holdingsError && holdings && holdings.length === 0 && (
        <p className="text-xs text-mute">
          {autoTries < MAX_AUTO_RELOADS
            ? "보유 정보를 불러오는 중… 자동으로 다시 시도합니다."
            : "보유한 해외주식이 없습니다."}
        </p>
      )}
      {checkError && <p className="text-xs text-mute">{checkError}</p>}

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

function HomeView({
  onSelectFlow,
  onLaunchStep,
  onOpenFlowModal,
}: {
  onSelectFlow: (f: Flow) => void;
  onLaunchStep: (f: Flow, step: number) => void;
  onOpenFlowModal: (f: Flow) => void;
}) {
  const [files, setFiles] = useState<ReportFile[] | null>(null);
  const [reportTab, setReportTab] = useState<string | null>(null);
  // 종목 탭 하위 2차 탭에서 선택된 보고서(경로). 종목 탭이 바뀌면 첫 보고서로 리셋.
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  const [flowTab, setFlowTab] = useState<string>("portfolio-overview");
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setLoadError(true);
          return;
        }
        setFiles(d.files);
        const companies = Array.from(
          new Set((d.files as ReportFile[]).map((f) => f.company).filter((c): c is string => c !== null))
        ).sort() as string[];
        setReportTab(companies[0] ?? "root");
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
  // 포트폴리오 보고서(portfolio-latest.md)는 '포트폴리오 점검' 탭에서 보여주므로
  // 보고서 탭의 루트 목록에서는 제외한다.
  const rootFiles = files ? files.filter((f) => f.company === null && f.name !== "portfolio-latest.md") : [];
  const portfolioReport = files?.find((f) => f.company === null && f.name === "portfolio-latest.md") ?? null;
  const tabs = [...companies, ...(rootFiles.length > 0 ? ["root"] : [])];
  const rawCurrentFiles =
    reportTab === "root" ? rootFiles : (files?.filter((f) => f.company === reportTab) ?? []);
  const currentFiles = reportTab !== "root" ? sortCompanyFiles(rawCurrentFiles) : rawCurrentFiles;

  // 종목 탭이 바뀌거나 목록이 로드되면 2차 탭 선택을 첫 보고서로 맞춘다.
  // (현재 선택이 이 종목에 속해 있으면 유지.)
  useEffect(() => {
    if (reportTab === "root") {
      setSelectedReport(null);
      return;
    }
    setSelectedReport((prev) =>
      prev && currentFiles.some((f) => f.path === prev) ? prev : (currentFiles[0]?.path ?? null)
    );
    // currentFiles는 reportTab·files에서 파생되므로 이 둘만 의존성으로 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTab, files]);

  // 사이드바/모바일 공용 네비 항목: 포트폴리오 · 프로세스 가이드 · 보고서 · 실적 점검 · 포트폴리오 점검
  const contentTabs = [
    { id: "portfolio-overview", label: "포트폴리오" },
    { id: "daily-check", label: "Daily check" },
    { id: "process-guide", label: "프로세스 가이드" },
    { id: "reports", label: "보고서" },
    ...flows.filter((f) => f.id !== "discovery").map((f) => ({ id: f.id, label: f.title })),
  ];
  const activeFlow = flows.find((f) => f.id === flowTab);
  const headerEyebrow =
    flowTab === "reports"
      ? "REPORTS"
      : flowTab === "portfolio-overview"
        ? "PORTFOLIO"
        : flowTab === "daily-check"
          ? "DAILY CHECK"
          : flowTab === "process-guide"
            ? "PROCESS"
            : flowTab.toUpperCase();
  const headerTitle =
    flowTab === "reports"
      ? "종목별 보고서"
      : flowTab === "portfolio-overview"
        ? "포트폴리오"
        : flowTab === "daily-check"
          ? "당일 등락 체크"
          : flowTab === "process-guide"
            ? "프로세스 가이드"
            : (activeFlow?.title ?? "");
  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-canvas text-body flex">
      {/* ── 사이드바 (데스크톱) — xAI app-shell ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-hairline sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-hairline">
          <div className="eyebrow text-[10px]">REALITY ESCAPE</div>
          <div className="mt-1.5 text-lg tracking-[-0.02em] text-ink">현생 탈출 장치</div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {contentTabs.map((t) => {
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
            </div>
          ) : flowTab === "daily-check" ? (
            <DailyCheckView />
          ) : flowTab === "process-guide" ? (
            /* ── 프로세스 가이드: 발굴 6단계를 개별 선택·실행 ── */
            (() => {
              const discovery = flows.find((f) => f.id === "discovery");
              if (!discovery) return null;
              return (
                <div>
                  <p className="text-sm text-mute mb-6 leading-relaxed">
                    섹터 전체 구조 이해부터 투자 논제 수립까지, 각 단계를 개별로 선택해 실행할 수 있습니다.
                    순서대로 진행하거나 필요한 단계부터 바로 시작하세요.
                  </p>
                  <ol className="flex flex-col gap-2.5">
                    {discovery.steps.map((step, i) => {
                      const cmd = step.commandTemplate.replace("{input}", step.inputPlaceholder);
                      return (
                        <li key={i}>
                          <button
                            onClick={() => onLaunchStep(discovery, i)}
                            className="w-full text-left rounded-lg border border-hairline bg-canvas-card p-5 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99]"
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
                                <p className="mt-1 text-xs text-body leading-relaxed">{step.description}</p>
                                <code className="mt-2.5 inline-block text-xs font-mono text-breeze">{cmd}</code>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })()
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
                  <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setReportTab(tab)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
                          reportTab === tab ? "bg-white text-canvas" : "text-mute hover:text-ink"
                        }`}
                      >
                        {tab === "root" ? "섹터/스크리닝" : tab}
                      </button>
                    ))}
                  </div>

                  {reportTab === "root" ? (
                    /* 섹터/스크리닝: 유형 구획 없이 평면 그리드 */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {currentFiles.map((f) => (
                        <ReportCard key={f.path} file={f} onOpen={setModalPath} />
                      ))}
                    </div>
                  ) : (
                    /* 종목 상세: 보고서 유형(2차) → 생성일자(3차) 위계 + 선택 보고서 인라인 표시 */
                    (() => {
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
                      return (
                        <div className="flex flex-col gap-4">
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
                    })()
                  )}
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

              // 일반 플로우: 단일 카드
              return (
                <button
                  onClick={() => onSelectFlow(flow)}
                  className="w-full text-left rounded-lg border border-hairline bg-canvas-card p-6 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.995]"
                >
                  <div className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mb-4 border border-hairline text-body">
                    {flow.steps.length}단계
                  </div>
                  <h2 className="text-2xl text-ink tracking-[-0.03em] mb-1">{flow.title}</h2>
                  <p className="text-sm text-mute leading-relaxed">{flow.subtitle}</p>

                  <div className="flex items-center gap-1 mt-5">
                    {flow.steps.map((_, i) => (
                      <div key={i} className="h-1 rounded-full flex-1 bg-white/20" />
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                    시작하기 →
                  </div>
                </button>
              );
            })()
          )}
          </div>
        </div>
        </div>
      </main>

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
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
  const [flowModal, setFlowModal] = useState<{ flow: Flow; step: number } | null>(null);
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
          onLaunchStep={(f, step) => setFlowModal({ flow: f, step })}
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
