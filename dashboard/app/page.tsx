"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { skills, tools, flowGroupLabels, type DashboardItem, type FlowGroup, type Tag, type RiskSeverity } from "@/lib/data";
import { flows, type Flow, type FlowStep } from "@/lib/flows";
import type { ReportFile } from "@/lib/github";

// ─── Color config ──────────────────────────────────────────────────────────

const colorConfig = {
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    button: "bg-emerald-700 hover:bg-emerald-600",
    progress: "bg-emerald-500",
    command: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  blue: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    button: "bg-blue-700 hover:bg-blue-600",
    progress: "bg-blue-500",
    command: "text-blue-300",
    dot: "bg-blue-400",
  },
  violet: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    button: "bg-violet-700 hover:bg-violet-600",
    progress: "bg-violet-500",
    command: "text-violet-300",
    dot: "bg-violet-400",
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
  if (filename.includes("-checklist-")) return { label: "체크리스트", color: "text-blue-400 bg-blue-500/10" };
  if (filename.endsWith("-thesis.md")) return { label: "투자논제", color: "text-violet-400 bg-violet-500/10" };
  if (filename.includes("-earnings-")) return { label: "실적분석", color: "text-orange-400 bg-orange-500/10" };
  if (filename.includes("-industry-")) return { label: "산업리서치", color: "text-cyan-400 bg-cyan-500/10" };
  if (filename.includes("-funnel-")) return { label: "퍼널", color: "text-teal-400 bg-teal-500/10" };
  if (filename === "portfolio-latest.md") return { label: "포트폴리오", color: "text-rose-400 bg-rose-500/10" };
  return { label: "MD", color: "text-zinc-500 bg-zinc-800" };
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
            <p className="text-xs text-amber-400/80 mt-1">⏱ 산업/섹터 데이터는 3개월 기준으로 신선도를 점검·정제합니다 (기준일 초과 시 자동 갱신)</p>
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
}) {
  const [copied, setCopied] = useState(false);
  const displayInput = input || step.inputPlaceholder;
  const command = step.commandTemplate.replace("{input}", displayInput);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    const resolvedFiles = resolveOutputPaths(step, input || step.inputPlaceholder);
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
  onViewReports,
  initialStep = 0,
}: {
  flow: Flow;
  onBack: () => void;
  onViewReports: (company?: string) => void;
  initialStep?: number;
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [stepInputs, setStepInputs] = useState<Record<number, string>>({});
  const [modalPath, setModalPath] = useState<string | null>(null);
  const lastInput = [...Object.values(stepInputs)].reverse().find((v) => v.trim().length > 0);

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
                onClick={() => onViewReports(lastInput)}
                className={`px-5 py-2.5 rounded-lg text-white transition-colors text-sm ${colors.button}`}
              >
                전체 보고서 보기 →
              </button>
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors text-sm"
              >
                처음으로 돌아가기
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
                onDone={() => setCurrentStep(i + 1)}
                onOpenReport={(path) => setModalPath(path)}
                colors={colors}
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

function ReportsView({
  onBack,
  initialCompany,
}: {
  onBack: () => void;
  initialCompany?: string;
}) {
  const [files, setFiles] = useState<ReportFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(initialCompany ?? null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [modalPath, setModalPath] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setFiles(data.files);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selectedPath) {
      setContent(null);
      return;
    }
    setLoadingContent(true);
    setContentError(null);
    fetch(`/api/reports/content?path=${encodeURIComponent(selectedPath)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setContentError(data.error);
        else setContent(data.content);
      })
      .catch((e) => setContentError(String(e)))
      .finally(() => setLoadingContent(false));
  }, [selectedPath]);

  const companies = files
    ? Array.from(new Set(files.map((f) => f.company).filter((c): c is string => c !== null))).sort()
    : [];
  const rootFiles = files ? files.filter((f) => f.company === null) : [];
  const rawCompanyFiles = files && selectedCompany ? files.filter((f) => f.company === selectedCompany) : [];
  const companyFiles = sortCompanyFiles(rawCompanyFiles);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          ← 뒤로
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1">보고서 열람</h1>
            <p className="text-sm text-zinc-500">종목별 보고서를 탐색하고 내용을 확인합니다.</p>
          </div>
          <button
            onClick={() => { setFiles(null); setError(null); fetch("/api/reports").then(r => r.json()).then(d => { if (d.error) setError(d.error); else setFiles(d.files); }).catch(e => setError(String(e))); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            새로고침
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 mb-4">
            보고서를 불러오지 못했습니다: {error}
          </div>
        )}

        {!files && !error && <p className="text-sm text-zinc-500">불러오는 중...</p>}

        {files && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ── Left panel ── */}
            <div className="md:col-span-1 flex flex-col gap-5">
              {/* Companies */}
              <div>
                <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-medium">종목별 폴더</div>
                <div className="flex flex-col gap-0.5">
                  {companies.map((c) => {
                    const cFiles = files.filter((f) => f.company === c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCompany(c);
                          setSelectedPath(null);
                          setContent(null);
                        }}
                        className={`text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                          selectedCompany === c
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                        }`}
                      >
                        <span className="font-medium">{c}</span>
                        <span className="text-xs text-zinc-600">{cFiles.length}개</span>
                      </button>
                    );
                  })}
                  {companies.length === 0 && (
                    <p className="text-xs text-zinc-600 px-1">아직 종목별 보고서가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Company files */}
              {selectedCompany && companyFiles.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-medium">
                    {selectedCompany} 보고서
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {companyFiles.map((f) => {
                      const badge = getFileBadge(f.name);
                      return (
                        <button
                          key={f.path}
                          onClick={() => setSelectedPath(f.path)}
                          className={`text-left rounded-lg px-3 py-2 transition-colors ${
                            selectedPath === f.path
                              ? "bg-emerald-700/40 border border-emerald-600/30"
                              : "hover:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400 truncate block">{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Root files */}
              <div>
                <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-medium">
                  섹터 / 포트폴리오
                </div>
                <div className="flex flex-col gap-0.5">
                  {rootFiles.map((f) => {
                    const badge = getFileBadge(f.name);
                    return (
                      <button
                        key={f.path}
                        onClick={() => {
                          setSelectedCompany(null);
                          setSelectedPath(f.path);
                        }}
                        className={`text-left rounded-lg px-3 py-2 transition-colors ${
                          selectedPath === f.path
                            ? "bg-emerald-700/40 border border-emerald-600/30"
                            : "hover:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400 truncate block">{f.name}</span>
                      </button>
                    );
                  })}
                  {rootFiles.length === 0 && (
                    <p className="text-xs text-zinc-600 px-1">아직 보고서가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="md:col-span-2">
              {!selectedPath && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="text-zinc-600 text-sm">왼쪽에서 보고서를 선택하세요</p>
                  <p className="text-zinc-700 text-xs mt-1">종목 폴더 → 파일 순으로 클릭</p>
                </div>
              )}
              {loadingContent && <p className="text-sm text-zinc-500">불러오는 중...</p>}
              {contentError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {contentError}
                </div>
              )}
              {content && selectedPath && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {(() => {
                      const fn = selectedPath.split("/").pop() ?? "";
                      const b = getFileBadge(fn);
                      return (
                        <>
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${b.color}`}>{b.label}</span>
                          <span className="text-xs font-mono text-zinc-500">{selectedPath}</span>
                        </>
                      );
                    })()}
                    <button
                      onClick={() => setModalPath(selectedPath)}
                      className="ml-auto text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                      전체화면
                    </button>
                  </div>
                  <article className="prose prose-invert prose-sm max-w-none rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </article>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalPath && <ReportModal path={modalPath} onClose={() => setModalPath(null)} />}
    </div>
  );
}

function HomeView({
  onSelectFlow,
  onOpenAdmin,
  onOpenReports,
}: {
  onSelectFlow: (f: Flow) => void;
  onOpenAdmin: () => void;
  onOpenReports: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between mb-14">
          <div>
            <h1 className="text-2xl font-bold">현생 탈출 장치</h1>
            <p className="mt-1 text-sm text-zinc-500">어떤 플로우를 시작할까요?</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenReports}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              보고서
            </button>
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              관리자
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {flows.map((flow) => {
            const c = colorConfig[flow.color as ColorKey];
            return (
              <button
                key={flow.id}
                onClick={() => onSelectFlow(flow)}
                className={`text-left rounded-2xl border ${c.border} bg-zinc-900 p-6 hover:bg-zinc-800/80 transition-all group`}
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
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [view, setView] = useState<"home" | "flow" | "reports">("home");
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [pickingStartFor, setPickingStartFor] = useState<Flow | null>(null);
  const [startStep, setStartStep] = useState(0);
  const [adminOpen, setAdminOpen] = useState(false);
  const [reportsCompany, setReportsCompany] = useState<string | undefined>(undefined);

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
          onOpenReports={() => {
            setReportsCompany(undefined);
            setView("reports");
          }}
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
          onViewReports={(company) => {
            setReportsCompany(company);
            setSelectedFlow(null);
            setView("reports");
          }}
        />
      )}
      {view === "reports" && (
        <ReportsView
          initialCompany={reportsCompany}
          onBack={() => setView("home")}
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
