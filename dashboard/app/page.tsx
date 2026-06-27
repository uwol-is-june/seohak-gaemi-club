"use client";
import { useState } from "react";
import { skills, tools, type DashboardItem, type Tag, type RiskSeverity } from "@/lib/data";

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

function Card({ item }: { item: DashboardItem }) {
  const s = statusConfig[item.status];
  return (
    <div className={`flex flex-col gap-3 rounded-xl border ${s.border} bg-zinc-900 p-5`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-white">{item.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">{item.description}</p>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-xs ${tagConfig[tag].bg} ${tagConfig[tag].text}`}
            >
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

export default function Home() {
  const [tab, setTab] = useState<"skills" | "tools">("skills");
  const items = tab === "skills" ? skills : tools;

  const counts = {
    ok: items.filter((i) => i.status === "ok").length,
    warning: items.filter((i) => i.status === "warning").length,
    danger: items.filter((i) => i.status === "danger").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">현생 탈출 장치</h1>
          <p className="mt-1 text-sm text-zinc-500">Skills & Tools 현황 대시보드</p>
        </div>

        <div className="mb-6 flex items-center gap-6">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
            {(["skills", "tools"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t === "skills" ? "Skills" : "Python Tools"}
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.name} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
