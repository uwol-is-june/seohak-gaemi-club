"use client";
import { useState } from "react";
import { GLOSSARY } from "@/lib/glossary";

export function GlossaryView() {
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
