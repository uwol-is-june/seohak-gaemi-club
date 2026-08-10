"use client";
import { useEffect, useMemo, useState } from "react";
import type { ReportFile } from "@/lib/reports-store";
import {
  buildArticleIndex,
  SHAPE_LABEL,
  type Article,
  type ArticleSource,
} from "@/lib/articles";
import { ReportContentView } from "./ReportContentView";

// ─── 아티클 (/investment-article) ──────────────────────────────────────────
//
// 다른 탭은 '내가 판단하기 위한 자료'를 보여주지만 이 탭은 '남에게 보여줄 글'을 다룬다.
// 그래서 축이 종목도 섹터도 아닌 **발행 상태**다 — 이미 쓴 글이 위, 아직 안 쓴 소재가 아래.
//
// **아티클은 마케팅 용도다**(2026-08-10 방침). 소재 순서도 재료의 충실도가 아니라 발행
// 타이밍으로 정렬한다 — 급변동 분석이 1순위이고, 심층 리서치는 언제든 쓸 수 있는 상시 소재로
// 접어 둔다. 판정 규칙과 근거는 lib/articles.ts 참조.
//
// 소재 목록을 굳이 대시보드에 두는 이유: /investment-article 은 소재 보고서를 못 찾으면
// 조용히 웹 수집으로 빠진다(skills/investment-article.md:23). 티커만 던지면 검증 없는
// 데이터가 대외 공개용 글이 된다. 여기서 **경로가 박힌 명령**을 복사해 쓰면 그 경로를
// 원천적으로 안 탄다. 판정 규칙과 근거는 lib/articles.ts 참조.

const SHAPE_TINT: Record<string, string> = {
  deep: "text-breeze bg-breeze/10",
  compare: "text-teal-300 bg-teal-500/10",
  market: "text-cyan-300 bg-cyan-500/10",
};

export function ArticlesView({
  files,
  loadError,
  onRetry,
  onOpenReport,
}: {
  files: ReportFile[] | null;
  loadError: boolean;
  onRetry: () => void;
  onOpenReport: (path: string) => void;
}) {
  const index = useMemo(
    () =>
      buildArticleIndex(
        (files ?? []).map((f) => ({ path: f.path, name: f.name, company: f.company }))
      ),
    [files]
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Tier B(재료가 모자란 소재)는 기본으로 접어 둔다 — 권장 소재가 먼저 눈에 들어와야 한다.
  const [showTierB, setShowTierB] = useState(false);

  // 목록이 갱신되면 선택을 유효한 값으로 맞춘다(가장 최근 아티클이 기본 선택).
  const firstArticle = index.articles[0]?.path ?? null;
  const articleKey = index.articles.map((a) => a.path).join("|");
  useEffect(() => {
    setSelected((prev) => (prev && articleKey.includes(prev) ? prev : firstArticle));
  }, [articleKey, firstArticle]);

  const copyCmd = async (s: ArticleSource) => {
    try {
      await navigator.clipboard.writeText(s.command);
      setCopied(s.path);
      setTimeout(() => setCopied((c) => (c === s.path ? null : c)), 2000);
    } catch {
      // 클립보드 API 미지원/거부 시 무시(성공 표시 안 함).
    }
  };

  if (!files && !loadError) return <p className="text-xs text-mute">불러오는 중...</p>;

  if (!files && loadError) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-red-300">보고서를 불러오지 못했습니다.</span>
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded-full border border-hairline text-body hover:text-ink hover:bg-canvas-soft transition-colors active:scale-95"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const pending = index.sources.filter((s) => !s.hasArticle).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── 현황 + 이 탭의 읽는 법 ── */}
      <div className="rounded-lg border border-hairline bg-canvas-card p-4 sm:p-5">
        <div className="eyebrow text-[10px] text-ink mb-3">발행 현황</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="발행된 아티클" value={String(index.articles.length)} hint="reports/ 안의 -article- 파일" />
          <Stat label="급변동 소재" value={String(index.tierA.length)} hint="마케팅 1순위" />
          <Stat label="상시 소재" value={String(index.tierB.length)} hint="심층 리서치" />
          <Stat label="미발행 소재" value={String(pending)} hint="아직 글이 없는 주제" />
        </div>
        <p className="mt-4 pt-4 border-t border-hairline text-xs text-mute leading-relaxed">
          <span className="text-body">아티클은 마케팅용이다</span> — 그래서 소재 1순위는 재료가 가장
          충실한 보고서가 아니라 <span className="text-body">지금 독자가 궁금해하는 것</span>, 즉 급변동
          분석이다. 심층 리서치는 아래 상시 소재로 내려 두었다.
          <br />
          <span className="text-body">/investment-article 은 변환기다</span> — 기존 보고서를 읽어 산문으로
          재배열할 뿐 새로 조사하지 않는다. 단, <span className="text-body">소재 보고서를 못 찾으면 조용히
          웹 수집으로 빠진다.</span> 아래 <span className="text-body">경로가 박힌 명령</span>을 복사해
          쓰면 그 경로를 타지 않는다.
        </p>
      </div>

      {/* ── 발행된 아티클 ── */}
      <section>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="eyebrow text-[10px] text-ink">발행된 아티클</span>
          <span className="text-[11px] text-mute">{index.articles.length}건</span>
        </div>
        {index.articles.length === 0 ? (
          <div className="rounded-lg border border-hairline bg-canvas-soft p-8 text-center">
            <div className="text-base text-ink tracking-[-0.02em]">아직 쓴 아티클이 없습니다</div>
            <p className="mt-2 text-xs text-mute leading-relaxed max-w-md mx-auto">
              아래 소재 중 하나에서 명령을 복사해 실행하면 여기에 쌓입니다. 저장 경로는
              <span className="font-mono text-body"> reports/{"{주제}"}/{"{주제}"}-article-{"{YYYYMMDD}"}.md</span> 입니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {index.articles.map((a) => (
              <ArticleRow
                key={a.path}
                article={a}
                active={selected === a.path}
                onSelect={() => setSelected(a.path)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 선택한 아티클 본문 ── */}
      {selected && (
        <div className="rounded-lg border border-hairline bg-canvas-card p-5 sm:p-6">
          <ReportContentView path={selected} onOpenReport={onOpenReport} />
        </div>
      )}

      {/* ── 권장 소재 (Tier A) ── */}
      <section>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="eyebrow text-[10px] text-ink">급변동 소재</span>
          <span className="text-[11px] text-mute">{index.tierA.length}건</span>
        </div>
        <p className="text-[11px] text-mute mb-2 leading-relaxed">
/news-pulse 산출물이다. <span className="text-body">유효기간이 있는 유일한 소재</span> — 사건
          직후가 관심의 정점이고 며칠이면 식는다. 최신순으로 정렬돼 있으니 위에서부터 쓴다.
        </p>
        {index.tierA.length === 0 ? (
          <p className="text-xs text-mute">
            급변동 소재가 없습니다 — 주가가 크게 움직인 종목에 /news-pulse 를 돌리면 여기 쌓입니다.
            아래 상시 소재로도 쓸 수 있습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {index.tierA.map((s) => (
              <SourceRow key={s.path} source={s} copied={copied === s.path} onCopy={() => copyCmd(s)} onOpen={() => onOpenReport(s.path)} />
            ))}
          </div>
        )}
      </section>

      {/* ── 보강 필요 소재 (Tier B) ── */}
      {index.tierB.length > 0 && (
        <section>
          <button
            onClick={() => setShowTierB((v) => !v)}
            className="flex items-baseline gap-2 mb-1 transition-colors hover:text-ink active:scale-[0.99]"
          >
            <span className="eyebrow text-[10px] text-ink">상시 소재</span>
            <span className="text-[11px] text-mute">{index.tierB.length}건</span>
            <span className="text-[11px] text-mute">{showTierB ? "접기" : "펼치기"}</span>
          </button>
          <p className="text-[11px] text-mute mb-2 leading-relaxed">
심층 리서치 산출물이다. 재료는 더 충실하지만 발행 시점 압박이 없어 급변동 뒤로 미뤄 둔다.
            모자란 부분을 채우다 웹 수집 경로를 탈 수 있으니 수치는 따로 검증한다.
          </p>
          {showTierB && (
            <div className="flex flex-col gap-1.5">
              {index.tierB.map((s) => (
                <SourceRow key={s.path} source={s} copied={copied === s.path} onCopy={() => copyCmd(s)} onOpen={() => onOpenReport(s.path)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="eyebrow text-[10px] text-mute">{label}</div>
      <div className="mt-1 text-lg text-ink tracking-[-0.02em]">{value}</div>
      <div className="text-[11px] text-mute">{hint}</div>
    </div>
  );
}

function ArticleRow({
  article,
  active,
  onSelect,
}: {
  article: Article;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border px-4 py-3 transition-all active:scale-[0.99] flex items-center gap-3 ${
        active
          ? "border-white/30 bg-canvas-soft"
          : "border-hairline bg-canvas-card hover:border-white/20 hover:bg-canvas-soft"
      }`}
    >
      <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] text-emerald-300 bg-emerald-500/15">
        아티클
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink tracking-[-0.01em]">{article.subject}</span>
      <span className="shrink-0 text-[11px] font-mono text-mute">{article.date ?? "—"}</span>
    </button>
  );
}

function SourceRow({
  source,
  copied,
  onCopy,
  onOpen,
}: {
  source: ArticleSource;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        source.hasArticle
          ? "border-hairline bg-canvas opacity-60"
          : "border-hairline bg-canvas-card hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${SHAPE_TINT[source.shape]}`}>
          {SHAPE_LABEL[source.shape]}
        </span>
        <button
          onClick={onOpen}
          title="소재 보고서 열기"
          className="min-w-0 flex-1 text-left truncate text-sm text-ink tracking-[-0.01em] hover:underline underline-offset-2"
        >
          {source.subject} <span className="text-mute">· {source.kindLabel}</span>
        </button>
        {source.hasArticle && (
          <span className="shrink-0 text-[11px] text-emerald-300">아티클 있음</span>
        )}
        <span className="shrink-0 text-[11px] font-mono text-mute hidden sm:inline">{source.date ?? "—"}</span>
        <button
          onClick={onCopy}
          title={source.command}
          className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors active:scale-95 ${
            copied
              ? "bg-white text-canvas"
              : "border border-hairline text-body hover:text-ink hover:bg-canvas-soft"
          }`}
        >
          {copied ? "복사됨 ✓" : "명령 복사"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <code className="text-[11px] font-mono text-breeze break-all">{source.command}</code>
        <span className="text-[11px] text-mute">{source.why}</span>
      </div>
    </div>
  );
}
