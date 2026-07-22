"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { skills, tools, flowGroupLabels, type DashboardItem, type FlowGroup, type Tag, type RiskSeverity } from "@/lib/data";
import { flows, type Flow, type FlowStep } from "@/lib/flows";
import type { ReportFile } from "@/lib/github";
import type { Holding } from "@/lib/toss";

// ─── Color config ──────────────────────────────────────────────────────────

// 모든 플로우가 브랜드 키컬러(#6A39C0) 하나로 통일됨.
const colorConfig = {
  brand: {
    border: "border-brand-500/30",
    bg: "bg-brand-500/15",
    text: "text-brand-300",
    button: "bg-brand-600 hover:bg-brand-500",
    progress: "bg-brand-500",
    command: "text-brand-300",
    dot: "bg-brand-400",
  },
} as const;

type ColorKey = keyof typeof colorConfig;

// ─── Admin dashboard config ────────────────────────────────────────────────

const statusConfig = {
  ok: { label: "정상", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  warning: { label: "주의", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400" },
  danger: { label: "위험", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400" },
};

const tagConfig: Record<Tag, { label: string; bg: string; text: string }> = {
  "agent-sdk": { label: "🔧 Agent SDK", bg: "bg-blue-500/10", text: "text-blue-400" },
  manual: { label: "🤚 수동입력", bg: "bg-orange-500/10", text: "text-orange-400" },
};

const riskDot: Record<RiskSeverity, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-zinc-600",
  manual: "bg-orange-400",
};

const riskText: Record<RiskSeverity, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-zinc-500",
  manual: "text-orange-400",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

type FileBadge = { label: string; color: string };

function getFileBadge(filename: string): FileBadge {
  if (filename === "README.md") return { label: "개요", color: "text-zinc-400 bg-zinc-700/50" };
  if (/^01-/i.test(filename)) return { label: "DYP 관점", color: "text-emerald-400 bg-emerald-500/10" };
  if (/^02-/i.test(filename)) return { label: "버핏 관점", color: "text-blue-400 bg-blue-500/10" };
  if (/^03-/i.test(filename)) return { label: "멍거 관점", color: "text-violet-400 bg-violet-500/10" };
  if (/^04-/i.test(filename)) return { label: "리루 관점", color: "text-amber-400 bg-amber-500/10" };
  if (filename === "FinalReport.md") return { label: "최종보고서", color: "text-emerald-300 bg-emerald-500/20" };
  if (filename.includes("-quality-screen-")) return { label: "열등주스크리닝", color: "text-fuchsia-400 bg-fuchsia-500/10" };
  if (filename.includes("-checklist-")) return { label: "체크리스트", color: "text-blue-400 bg-blue-500/10" };
  if (filename.endsWith("-thesis.md")) return { label: "투자논제", color: "text-violet-400 bg-violet-500/10" };
  if (filename.includes("-earnings-")) return { label: "실적분석", color: "text-orange-400 bg-orange-500/10" };
  if (filename.includes("-industry-")) return { label: "산업리서치", color: "text-cyan-400 bg-cyan-500/10" };
  if (filename.includes("-funnel-")) return { label: "퍼널", color: "text-teal-400 bg-teal-500/10" };
  if (filename === "portfolio-latest.md") return { label: "포트폴리오", color: "text-rose-400 bg-rose-500/10" };
  return { label: "MD", color: "text-zinc-500 bg-zinc-800" };
}

// 보고서 결과 개요(합격/불합격) pill. summary가 없으면 표시하지 않는다.
function getResultPill(summary?: string | null): FileBadge | null {
  if (!summary) return null;
  if (summary.includes("면제")) return { label: "면제 통과", color: "text-amber-300 bg-amber-500/15" };
  if (summary.includes("탈락")) return { label: "탈락", color: "text-red-300 bg-red-500/15" };
  if (summary.includes("통과")) return { label: "통과", color: "text-emerald-300 bg-emerald-500/15" };
  return { label: summary, color: "text-zinc-300 bg-zinc-700/50" };
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

function ReportModal({ path, onClose }: { path: string; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filename = path.split("/").pop() ?? path;
  const badge = getFileBadge(filename);

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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-sm font-mono text-zinc-300 truncate">{filename}</span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {loading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
          {content && (
            <article className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Components ────────────────────────────────────────────────────────────

function DashboardCard({ item }: { item: DashboardItem }) {
  const s = statusConfig[item.status];
  return (
    <div className={`flex flex-col gap-3 rounded-xl border ${s.border} bg-zinc-900 p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-400">
            {item.code}
          </span>
          <h3 className="font-mono text-sm font-semibold text-white">{item.name}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">{item.description}</p>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2 py-0.5 text-xs ${tagConfig[tag].bg} ${tagConfig[tag].text}`}>
              {tagConfig[tag].label}
            </span>
          ))}
        </div>
      )}
      {item.risks.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
          {item.risks.map((risk, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${riskDot[risk.severity]}`} />
              <span className={`text-xs ${riskText[risk.severity]}`}>{risk.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const flowGroupOrder: FlowGroup[] = ["B", "C", "S", "T"];

function AdminModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<FlowGroup>("B");
  const allItems = [...skills, ...tools];
  const items = allItems.filter((i) => i.flowGroup === tab);
  const counts = {
    ok: items.filter((i) => i.status === "ok").length,
    warning: items.filter((i) => i.status === "warning").length,
    danger: items.filter((i) => i.status === "danger").length,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[80vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="font-semibold text-white">Skills & Tools 현황</h2>
            <p className="text-xs text-zinc-500 mt-0.5">플로우별 Skill과 Python Tool의 동작 상태</p>
            <p className="text-xs text-amber-400/80 mt-1">⏱ 산업/섹터 데이터는 3개월 기준으로 신선도를 점검·정제합니다 (갱신은 수동 실행)</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-zinc-800 shrink-0 flex-wrap">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 overflow-x-auto">
            {flowGroupOrder.map((g) => (
              <button
                key={g}
                onClick={() => setTab(g)}
                className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === g ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {flowGroupLabels[g].label}
                <span className="ml-1.5 text-xs text-zinc-500">{flowGroupLabels[g].subtitle}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> 정상 {counts.ok}
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> 주의 {counts.warning}
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-red-400" /> 위험 {counts.danger}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <DashboardCard key={item.name} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-zinc-600 flex items-center justify-center text-xs text-zinc-500">
          –
        </div>
        <span className="text-sm text-zinc-500 flex-1">{step.title}</span>
        <span className="text-xs text-zinc-600">건너뜀</span>
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
        <span className="text-sm text-zinc-500 flex-1">{step.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <code className="text-xs text-zinc-700 font-mono truncate max-w-[160px] hidden sm:block">
            {step.commandTemplate.replace("{input}", input || step.inputPlaceholder)}
          </code>
          {resolvedFiles.length > 0 && (
            <button
              onClick={() => onOpenReport(resolvedFiles[0])}
              className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
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
      <div className="flex items-center gap-3 px-2 py-2.5 opacity-25">
        <div className="h-6 w-6 shrink-0 rounded-full border border-zinc-700 flex items-center justify-center text-xs text-zinc-600">
          {index + 1}
        </div>
        <span className="text-sm text-zinc-500">{step.title}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${colors.border} bg-zinc-900 p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${colors.bg} ${colors.text}`}>
          {index + 1}
        </div>
        <h3 className="font-semibold text-white">{step.title}</h3>
      </div>

      <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{step.description}</p>

      <div className="mb-3">
        <label className="block text-xs text-zinc-500 mb-1.5">{step.inputLabel}</label>
        {step.sectorPicker && (
          <div className="mb-2">
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2">
              {step.sectorPicker.groups.map((g, i) => (
                <button
                  key={g.label}
                  onClick={() => setSectorTab(i)}
                  className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    sectorTab === i ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
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
                  className={`rounded-full px-3 py-1 text-xs transition-colors border ${
                    input === sector
                      ? `${colors.bg} ${colors.text} border-transparent`
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-700"
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
            <div className="text-[11px] text-zinc-500 mb-1.5">내 보유 종목 (클릭해서 추가/제거)</div>
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
                    className={`rounded-full px-3 py-1 text-xs transition-colors border ${
                      selected
                        ? `${colors.bg} ${colors.text} border-transparent`
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-700"
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
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      <div className="mb-4">
        <div className="text-xs text-zinc-500 mb-1.5">터미널에서 실행</div>
        <div className="flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5">
          <code className={`flex-1 text-sm font-mono ${colors.command}`}>{command}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            {copied ? "복사됨 ✓" : "복사"}
          </button>
        </div>
        {step.requiresCli && (
          <p className="mt-1.5 text-xs text-amber-500">
            ⚠️ Claude Code CLI에서 직접 실행해야 합니다 (Agent SDK 필요 — 일반 API 호출로는 동작하지 않음)
          </p>
        )}
      </div>

      {(step.outputFiles.length > 0 || step.outputNote) && (
        <div className="mb-4 text-xs text-zinc-600">
          <span className="text-zinc-500">생성: </span>
          {step.outputNote || step.outputFiles.map((f) => f.replace("{input}", displayInput)).join(", ")}
        </div>
      )}

      <button
        onClick={onDone}
        className={`w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors ${colors.button}`}
      >
        완료, 다음 단계로 →
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          ← 뒤로
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold">{flow.title}</h1>
            <span className="text-sm text-zinc-500">
              {Math.min(currentStep, flow.steps.length)}/{flow.steps.length} 단계
            </span>
          </div>
          <p className="text-sm text-zinc-500 mb-3">{flow.subtitle}</p>
          <div className="h-1.5 rounded-full bg-zinc-800">
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
              <h2 className="text-xl font-bold mb-2">플로우 완료!</h2>
              <p className="text-sm text-zinc-400">{flow.title} 플로우를 모두 마쳤습니다.</p>
            </div>

            {generatedFiles.length > 0 && (
              <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">생성된 보고서</div>
                <div className="flex flex-col gap-2">
                  {generatedFiles.map(({ path }, i) => {
                    const filename = path.split("/").pop() ?? path;
                    const badge = getFileBadge(filename);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 flex-1 truncate min-w-0">{path}</span>
                        <button
                          onClick={() => setModalPath(path)}
                          className="shrink-0 text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
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
                className={`px-5 py-2.5 rounded-lg text-white transition-colors text-sm ${colors.button}`}
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

function StartPointModal({ flow, onChoose, onClose }: { flow: Flow; onChoose: (fromStep: number) => void; onClose: () => void }) {
  const c = colorConfig[flow.color as ColorKey];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-bold text-white text-lg">{flow.title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-zinc-500 mb-6">어디서부터 시작할까요?</p>
        <div className="flex flex-col gap-3">
          {flow.startPoints?.map((sp) => (
            <button
              key={sp.id}
              onClick={() => onChoose(sp.fromStep)}
              className={`text-left rounded-xl border ${c.border} bg-zinc-900 p-4 hover:bg-zinc-800/80 transition-colors`}
            >
              <div className={`text-sm font-semibold mb-1 ${c.text}`}>{sp.label}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{sp.description}</p>
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

function HoldingsBanner() {
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ccy, setCcy] = useState<Ccy>("USD");
  const [fx, setFx] = useState<number | null>(null);

  const load = () => {
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
  };

  useEffect(load, []);

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
    <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">보유 자산</h2>
          {isMock && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/10">
              목업
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="통화 선택"
            className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
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
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                    active ? "bg-brand-600 text-white" : "text-zinc-500 hover:text-white"
                  } ${disabled ? "cursor-not-allowed opacity-40 hover:text-zinc-500" : ""}`}
                >
                  {c === "USD" ? "$ USD" : "₩ KRW"}
                </button>
              );
            })}
          </div>
          <button
            onClick={load}
            aria-label="새로고침"
            title="새로고침"
            className="text-zinc-500 hover:text-white transition-colors"
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

      {loading && <p className="text-xs text-zinc-600">불러오는 중...</p>}

      {!loading && error && (
        <p className="text-xs text-zinc-600">보유 정보를 일시적으로 불러올 수 없습니다.</p>
      )}

      {!loading && !error && list.length === 0 && (
        <p className="text-xs text-zinc-600">보유한 해외주식이 없습니다.</p>
      )}

      {!loading && list.length > 0 && (
        <>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-2xl font-bold text-white">{money(total)}</span>
            <span className={`text-sm font-medium ${totalPL >= 0 ? "text-red-400" : "text-blue-400"}`}>
              {totalPL >= 0 ? "+" : ""}
              {money(totalPL)} ({totalPL >= 0 ? "+" : ""}
              {totalPLPct.toFixed(2)}%)
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((h) => {
              const up = h.profitLoss >= 0;
              return (
                <div
                  key={h.ticker}
                  className="shrink-0 min-w-[150px] rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-white">{h.ticker}</span>
                    <span className={`text-xs font-medium ${up ? "text-red-400" : "text-blue-400"}`}>
                      {up ? "+" : ""}
                      {h.profitLossPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mb-2">{h.name}</div>
                  <div className="text-sm font-semibold text-zinc-200">{money(h.marketValue)}</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">
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

function HomeView({
  onSelectFlow,
  onOpenAdmin,
}: {
  onSelectFlow: (f: Flow) => void;
  onOpenAdmin: () => void;
}) {
  const [files, setFiles] = useState<ReportFile[] | null>(null);
  const [reportTab, setReportTab] = useState<string | null>(null);
  const [modalPath, setModalPath] = useState<string | null>(null);
  const [flowTab, setFlowTab] = useState<string>("reports");
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
  const rootFiles = files ? files.filter((f) => f.company === null) : [];
  const tabs = [...companies, ...(rootFiles.length > 0 ? ["root"] : [])];
  const rawCurrentFiles =
    reportTab === "root" ? rootFiles : (files?.filter((f) => f.company === reportTab) ?? []);
  const currentFiles = reportTab !== "root" ? sortCompanyFiles(rawCurrentFiles) : rawCurrentFiles;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent">
            현생 탈출 장치
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              관리자
            </button>
            <button
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              로그아웃
            </button>
          </div>
        </div>

        <HoldingsBanner />

        <div className="mb-16">
          {/* 탭 바 + 새 종목 발굴 버튼 (같은 row) */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 w-fit">
            <button
              onClick={() => setFlowTab("reports")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                flowTab === "reports" ? "bg-brand-500/15 text-brand-300" : "text-zinc-400 hover:text-white"
              }`}
            >
              보고서
            </button>
            {flows
              .filter((flow) => flow.id !== "discovery")
              .map((flow) => {
                const active = flowTab === flow.id;
                const c = colorConfig[flow.color as ColorKey];
                return (
                  <button
                    key={flow.id}
                    onClick={() => setFlowTab(flow.id)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      active ? `${c.bg} ${c.text}` : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {flow.title}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const d = flows.find((f) => f.id === "discovery");
                if (d) onSelectFlow(d);
              }}
              aria-label="새 종목 발굴"
              title="새 종목 발굴"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xl leading-none text-white hover:bg-brand-500 transition-colors"
            >
              +
            </button>
          </div>

          {/* ── 탭 콘텐츠 (전환 애니메이션) ── */}
          <div key={flowTab} className="tab-panel">
          {flowTab === "reports" ? (
            <div>
              <div className="mb-4">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  종목별 보고서
                </h2>
              </div>

              {!files && !loadError && <p className="text-xs text-zinc-600">불러오는 중...</p>}

              {!files && loadError && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-400">보고서를 불러오지 못했습니다.</span>
                  <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {files && tabs.length === 0 && (
                <p className="text-xs text-zinc-600">
                  아직 보고서가 없습니다. <span className="text-zinc-500">+ 새 종목 발굴</span>로 시작하세요.
                </p>
              )}

              {files && tabs.length > 0 && (
                <>
                  <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setReportTab(tab)}
                        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          reportTab === tab ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {tab === "root" ? "섹터/포트폴리오" : tab}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentFiles.map((f) => {
                      const badge = getFileBadge(f.name);
                      const pill = getResultPill(f.summary);
                      return (
                        <button
                          key={f.path}
                          onClick={() => setModalPath(f.path)}
                          className="flex flex-col gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-left hover:bg-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
                              {badge.label}
                            </span>
                            {pill && (
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${pill.color}`}>
                                {pill.label}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-zinc-400 break-all">{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── 플로우 탭 ── */
            (() => {
              const flow = flows.find((f) => f.id === flowTab) ?? flows[0];
              const c = colorConfig[flow.color as ColorKey];

              // 포폴 점검: 분기별 카드
              if (flow.quarters) {
                return (
                  <div>
                    <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{flow.subtitle}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {flow.quarters.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => onSelectFlow(flow)}
                          className={`text-left rounded-xl border ${c.border} bg-zinc-900 p-5 hover:bg-zinc-800/80 transition-all group`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-base font-bold text-white">{q.label}</h3>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
                              {q.timing}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{q.note}</p>
                          <div className={`mt-3 text-xs ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
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
                  className={`w-full text-left rounded-2xl border ${c.border} bg-zinc-900 p-6 hover:bg-zinc-800/80 transition-all group`}
                >
                  <div className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mb-4 ${c.bg} ${c.text}`}>
                    {flow.steps.length}단계
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">{flow.title}</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">{flow.subtitle}</p>

                  <div className="flex items-center gap-1 mt-5">
                    {flow.steps.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full flex-1 ${c.bg}`} />
                    ))}
                  </div>

                  <div className={`mt-4 text-xs ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    시작하기 →
                  </div>
                </button>
              );
            })()
          )}
          </div>
        </div>
      </div>

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
  const [adminOpen, setAdminOpen] = useState(false);

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
          onOpenAdmin={() => setAdminOpen(true)}
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
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
    </>
  );
}
