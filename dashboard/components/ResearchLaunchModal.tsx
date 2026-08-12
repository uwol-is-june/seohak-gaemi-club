"use client";
import { flows } from "@/lib/flows";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalA11y } from "@/lib/use-modal-a11y";

// 상단바 도구 아이콘에서 여는 실행 모달(TASK-91). 그 탭이 다루는 플로우의 단계를
// 전부 여기서 실행한다 — 본문에 카드로 상시 노출하던 것을 아이콘 뒤로 모았다.
// 매번 쓰는 기능이 아니라 보고서를 볼 때마다 위쪽 자리를 차지할 이유가 없다.
//   · 분야 탭   → 종목 발굴(discovery) 6단계
//   · 실적 점검 → 실적 점검(earnings) 단계들
// 단계 실행 자체는 부모가 ProcessStepModal 로 이어받는다(onLaunch).
//
// 번호는 플로우의 실제 단계 번호를 쓴다. 본문 카드 시절엔 discovery 가 두 묶음으로
// 흩어져 각각 1부터 다시 세었는데, 한 목록에 모으면 순서가 어긋난다.
export function ResearchLaunchModal({
  flowId,
  context,
  onLaunch,
  onClose,
}: {
  // 실행할 플로우. 이 플로우의 steps 가 그대로 카드가 된다.
  flowId: string;
  // 어느 자리에서 열었는지(분야명 등) — eyebrow 안내 문구에만 쓴다.
  context: string;
  onLaunch: (stepIndex: number) => void;
  onClose: () => void;
}) {
  useBodyScrollLock();
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${flow.title} 실행`}
        tabIndex={-1}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg bg-canvas border border-hairline p-6 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="eyebrow text-[10px]">{context}</div>
            <h3 className="mt-1 text-lg text-ink tracking-[-0.02em] leading-tight">{flow.title} 실행</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded-full border border-hairline w-8 h-8 flex items-center justify-center text-mute hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {flow.steps.map((step, si) => {
            const cmd = step.commandTemplate.replace("{input}", step.inputPlaceholder);
            return (
              <div key={si} className="contents">
                {/* 시작점 구분(discovery 의 startPoints 와 같은 경계): 1~2는 섹터에서,
                    3부터는 이미 볼 종목이 정해졌을 때 들어온다. */}
                {flow.id === "discovery" && si === 2 && (
                  <div className="eyebrow text-[10px] text-mute mt-2">볼 종목이 정해졌다면</div>
                )}
              <button
                onClick={() => onLaunch(si)}
                className="text-left rounded-lg border border-hairline bg-canvas-card p-5 hover:border-white/30 hover:bg-canvas-soft transition-all group active:scale-[0.99]"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/10 text-ink flex items-center justify-center text-sm">
                    {si + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-base text-ink tracking-[-0.01em]">{step.title}</h4>
                      <span className="shrink-0 text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                        실행 →
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-mute leading-relaxed">{step.description}</p>
                    <code className="mt-2.5 inline-block text-xs font-mono text-breeze">{cmd}</code>
                  </div>
                </div>
              </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
