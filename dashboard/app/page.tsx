"use client";
import { useState } from "react";
import { type Flow } from "@/lib/flows";
import { HomeView } from "@/components/HomeView";
import { ProcessStepModal } from "@/components/ProcessStepModal";
import { FlowModal } from "@/components/FlowModal";


// ─── Main ──────────────────────────────────────────────────────────────────

export default function Home() {
  // 프로세스 가이드에서 단계를 열면 전체 화면 대신 모달로 띄운다(홈 컨텍스트 유지).
  const [flowModal, setFlowModal] = useState<{ flow: Flow; step: number; input?: string } | null>(null);
  // 포트폴리오 점검 탭에서 분기 카드를 누르면 플로우 전체를 모달로 띄운다.
  const [flowAllModal, setFlowAllModal] = useState<Flow | null>(null);

  return (
    <>
      <HomeView
        onLaunchStep={(f, step, input) => setFlowModal({ flow: f, step, input })}
        onOpenFlowModal={(f) => setFlowAllModal(f)}
      />
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
    </>
  );
}
