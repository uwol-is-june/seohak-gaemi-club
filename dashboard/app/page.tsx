"use client";
import { useState } from "react";
import { skills, tools, flowGroupLabels, type DashboardItem, type FlowGroup, type Tag, type RiskSeverity } from "@/lib/data";
import { flows, type Flow, type FlowStep } from "@/lib/flows";

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

const flowGroupOrder: FlowGroup[] = ["A", "B", "C", "S", "T"];

function AdminModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<FlowGroup>("A");
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
  input,
  onInputChange,
  onDone,
  colors,
}: {
  step: FlowStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onDone: () => void;
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

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5">
        <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs ${colors.bg} ${colors.text}`}>
          ✓
        </div>
        <span className="text-sm text-zinc-500 flex-1">{step.title}</span>
        <code className="text-xs text-zinc-700 font-mono truncate max-w-[220px]">
          {step.commandTemplate.replace("{input}", input || step.inputPlaceholder)}
        </code>
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

function FlowView({ flow, onBack }: { flow: Flow; onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepInputs, setStepInputs] = useState<Record<number, string>>({});

  const colors = colorConfig[flow.color as ColorKey];
  const isDone = currentStep >= flow.steps.length;
  const progressPct = Math.round((Math.min(currentStep, flow.steps.length) / flow.steps.length) * 100);

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
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2">플로우 완료!</h2>
            <p className="text-sm text-zinc-400 mb-8">{flow.title} 플로우를 모두 마쳤습니다.</p>
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors text-sm"
            >
              처음으로 돌아가기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {flow.steps.map((step, i) => (
              <StepCard
                key={i}
                step={step}
                index={i}
                isActive={i === currentStep}
                isCompleted={i < currentStep}
                input={stepInputs[i] || ""}
                onInputChange={(val) => setStepInputs((prev) => ({ ...prev, [i]: val }))}
                onDone={() => setCurrentStep(i + 1)}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HomeView({
  onSelectFlow,
  onOpenAdmin,
}: {
  onSelectFlow: (f: Flow) => void;
  onOpenAdmin: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between mb-14">
          <div>
            <h1 className="text-2xl font-bold">현생 탈출 장치</h1>
            <p className="mt-1 text-sm text-zinc-500">어떤 플로우를 시작할까요?</p>
          </div>
          <button
            onClick={onOpenAdmin}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            관리자
          </button>
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
  const [view, setView] = useState<"home" | "flow">("home");
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <>
      {view === "home" ? (
        <HomeView
          onSelectFlow={(f) => {
            setSelectedFlow(f);
            setView("flow");
          }}
          onOpenAdmin={() => setAdminOpen(true)}
        />
      ) : (
        selectedFlow && (
          <FlowView
            flow={selectedFlow}
            onBack={() => {
              setView("home");
              setSelectedFlow(null);
            }}
          />
        )
      )}
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
    </>
  );
}
