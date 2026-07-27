"use client";
import { readJsonSafe } from "@/lib/fetch-json";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkSentenceBreaks from "@/lib/remark-sentence-breaks";
import { reportAsOf, resolveReportPath } from "@/lib/report-helpers";

// ─── ReportModal ───────────────────────────────────────────────────────────

// 보고서 본문 fetch + 마크다운 렌더. 모달·인라인 뷰 양쪽에서 재사용한다.
// onOpenReport: 본문 안의 다른 보고서(.md) 링크를 클릭했을 때 앱 안에서 열기 위한 콜백
// (외부 네비게이션 → 404 방지). 미지정 시 보고서 링크는 비활성 텍스트로 렌더한다.
export function ReportContentView({
  path,
  onOpenReport,
}: {
  path: string;
  onOpenReport?: (path: string) => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitDate, setCommitDate] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);
    setCommitDate(null);
    fetch(`/api/reports/content?path=${encodeURIComponent(path)}`, { cache: "no-store" })
      .then(readJsonSafe)
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setContent(d.content);
          setCommitDate(typeof d.commitDate === "string" ? d.commitDate : null);
        }
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
  const asOf = commitDate ? reportAsOf(commitDate) : null;
  return (
    <>
      {asOf && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            asOf.stale
              ? "border-sunset/30 bg-sunset/10 text-sunset-soft"
              : "border-hairline bg-canvas-soft text-mute"
          }`}
        >
          <span className="eyebrow text-[10px]">AS-OF</span>
          <span className="font-mono">{asOf.text}</span>
          <span>· 작성 시점의 스냅샷입니다. 실시간 가격·최신 실적과 다를 수 있습니다.</span>
          {asOf.stale && <span className="font-medium">— 오래된 분석(재검토 권장)</span>}
        </div>
      )}
      <article className="report-prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkSentenceBreaks]}
          components={{
            a({ href, children }) {
              // 다른 보고서(.md) 상대 링크 → 앱 안에서 모달로 연다(404 방지).
              const rp = href ? resolveReportPath(href, path) : null;
              if (rp) {
                return (
                  <button
                    type="button"
                    onClick={() => onOpenReport?.(rp)}
                    className="text-breeze underline underline-offset-2 hover:text-ink transition-colors"
                  >
                    {children}
                  </button>
                );
              }
              // 외부 링크 → 새 탭(안전 속성).
              if (href && /^https?:\/\//i.test(href)) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-breeze underline underline-offset-2 hover:text-ink transition-colors">
                    {children}
                  </a>
                );
              }
              // 페이지 내 앵커는 그대로.
              if (href && href.startsWith("#")) return <a href={href}>{children}</a>;
              // 대시보드에서 열 수 없는 링크(skills 문서 등) → 비활성 텍스트(원경로는 title).
              return <span title={href ?? undefined} className="text-mute">{children}</span>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </>
  );
}

