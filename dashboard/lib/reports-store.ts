import { getSupabase } from "./supabase";

// 보고서 저장소 — Supabase 백엔드. 이전 lib/github.ts의 공개 API(listReportFiles /
// getReportContent / getReportCommitDate / deleteReport)를 동일 시그니처로 대체한다.
// 결과 개요(summary)·신뢰도(confidence) 파싱은 발행 시점(tools/publish_report.py)에
// 수행돼 컬럼에 저장되므로, 목록 조회는 본문 fetch 없이 쿼리 1회로 끝난다(N+1 제거).

export type ConfidenceVerdict = "높음" | "보통" | "낮음";

export interface ReportFile {
  path: string; // 예: "reports/WST/WST-checklist-20260723.md"
  company: string | null; // 티커; 루트 보고서는 null
  name: string; // 예: "WST-checklist-20260723.md"
  summary?: string | null; // 열등주 스크리닝 판정
  confidence?: ConfidenceVerdict | null; // 데이터 신뢰도
}

// 형식 가드: 경로가 reports/*.md 이고 상위 탈출(..)이 없어야 한다.
function isValidReportPath(path: string): boolean {
  return path.startsWith("reports/") && path.endsWith(".md") && !path.includes("..");
}

export async function listReportFiles(): Promise<ReportFile[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("reports")
    .select("path, company, name, summary, confidence")
    .order("path", { ascending: true });
  if (error) {
    console.error("Supabase 오류(목록):", error.message);
    throw new Error("보고서 목록을 불러오지 못했습니다.");
  }
  return (data ?? []) as ReportFile[];
}

export async function getReportContent(path: string): Promise<string> {
  if (!isValidReportPath(path)) {
    throw new Error("잘못된 경로입니다.");
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("reports")
    .select("content")
    .eq("path", path)
    .maybeSingle();
  if (error) {
    console.error("Supabase 오류(내용):", error.message);
    throw new Error("보고서를 불러오지 못했습니다.");
  }
  if (!data) {
    throw new Error("보고서를 찾을 수 없습니다.");
  }
  return (data as { content: string }).content;
}

// 보고서의 as-of(발행/최종수정) 시각. 실패 시 null(신선도 표기를 숨긴다).
export async function getReportCommitDate(path: string): Promise<string | null> {
  if (!isValidReportPath(path)) return null;
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("reports")
      .select("committed_at")
      .eq("path", path)
      .maybeSingle();
    if (error || !data) return null;
    const v = (data as { committed_at: string | null }).committed_at;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function deleteReport(path: string): Promise<void> {
  if (!isValidReportPath(path)) {
    throw new Error("잘못된 경로입니다.");
  }
  const sb = getSupabase();
  const { error } = await sb.from("reports").delete().eq("path", path);
  if (error) {
    console.error("Supabase 오류(삭제):", error.message);
    throw new Error("삭제에 실패했습니다.");
  }
}
