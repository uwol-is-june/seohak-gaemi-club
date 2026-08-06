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
  // 발행(최종수정) 시각 ISO. 실적 캘린더가 "이 실적을 이미 점검했는가"를
  // 판정하는 데 쓴다(발표일 이후 발행된 실적 보고서가 있으면 점검 완료).
  committedAt?: string | null;
}

// 형식 가드: 경로가 reports/*.md 이고 상위 탈출(..)이 없어야 한다.
function isValidReportPath(path: string): boolean {
  return path.startsWith("reports/") && path.endsWith(".md") && !path.includes("..");
}

const CONFIDENCE_VALUES: ConfidenceVerdict[] = ["높음", "보통", "낮음"];

// DB 값은 자유 문자열일 수 있으므로 허용된 union 밖 값은 null 로 정규화한다(TASK-61).
function normalizeConfidence(v: unknown): ConfidenceVerdict | null {
  return typeof v === "string" && (CONFIDENCE_VALUES as string[]).includes(v)
    ? (v as ConfidenceVerdict)
    : null;
}

// path 로 reports 행의 지정 컬럼을 1건 조회하는 공용 헬퍼(중복 쿼리 보일러플레이트 제거).
async function selectReportRow(path: string, columns: string) {
  const sb = getSupabase();
  return sb.from("reports").select(columns).eq("path", path).maybeSingle();
}

export async function listReportFiles(): Promise<ReportFile[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("reports")
    .select("path, company, name, summary, confidence, committed_at")
    .order("path", { ascending: true });
  if (error) {
    console.error("Supabase 오류(목록):", error.message);
    throw new Error("보고서 목록을 불러오지 못했습니다.");
  }
  // 행을 무검증 캐스트하지 않고 필드를 정규화한다(confidence union 밖 값 방지).
  return (data ?? []).map((r) => {
    const row = r as {
      path: string;
      company: string | null;
      name: string;
      summary?: string | null;
      confidence?: unknown;
      committed_at?: unknown;
    };
    return {
      path: row.path,
      company: row.company ?? null,
      name: row.name,
      summary: row.summary ?? null,
      confidence: normalizeConfidence(row.confidence),
      committedAt: typeof row.committed_at === "string" ? row.committed_at : null,
    };
  });
}

export async function getReportContent(path: string): Promise<string> {
  if (!isValidReportPath(path)) {
    throw new Error("잘못된 경로입니다.");
  }
  const { data, error } = await selectReportRow(path, "content");
  if (error) {
    console.error("Supabase 오류(내용):", error.message);
    throw new Error("보고서를 불러오지 못했습니다.");
  }
  const content = data ? (data as unknown as { content: string | null }).content : null;
  // 행이 없거나 content 가 null 이면 '없음'으로 처리(타입은 non-null이지만 DB는 null 가능).
  if (content == null) {
    throw new Error("보고서를 찾을 수 없습니다.");
  }
  return content;
}

// 보고서의 as-of(발행/최종수정) 시각. 실패 시 null(신선도 표기를 숨긴다).
export async function getReportCommitDate(path: string): Promise<string | null> {
  if (!isValidReportPath(path)) return null;
  try {
    const { data, error } = await selectReportRow(path, "committed_at");
    if (error || !data) return null;
    const v = (data as unknown as { committed_at: string | null }).committed_at;
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
