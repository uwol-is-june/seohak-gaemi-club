"use client";
import { useState } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { type SectorGroup, normalizeTicker, newGroupId } from "@/lib/report-helpers";

export function SectorGroupEditor({
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
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="섹터 그룹 편집"
        tabIndex={-1}
        className="w-full max-w-2xl my-8 rounded-lg bg-canvas border border-hairline overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div>
            <div className="eyebrow text-[10px]">SECTOR GROUPS</div>
            <div className="text-lg tracking-[-0.02em] text-ink leading-tight">섹터 그룹 편집</div>
          </div>
          <button
            type="button"
            aria-label="닫기"
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

