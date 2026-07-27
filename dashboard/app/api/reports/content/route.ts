import { getReportContent, getReportCommitDate, deleteReport } from "@/lib/reports-store";
import { requireAuth } from "@/lib/api-auth";

// 발행/수정 직후 최신 본문이 즉시 보이도록 캐시를 끈다(브라우저·CDN 휴리스틱 캐싱 방지).
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return Response.json({ error: "path 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }
  try {
    // 본문 + 마지막 커밋 시각(as-of). 커밋 시각 조회 실패는 null로 graceful.
    const [content, commitDate] = await Promise.all([
      getReportContent(path),
      getReportCommitDate(path),
    ]);
    return Response.json({ content, commitDate }, { headers: NO_STORE });
  } catch (err) {
    // 내부 에러 상세는 서버 로그로만(TASK-53).
    console.error("reports content GET:", err);
    return Response.json({ error: "보고서를 불러오지 못했습니다." }, { status: 500, headers: NO_STORE });
  }
}

// 보고서 삭제(개발 단계 정리용). Supabase reports 행 삭제 — 되돌릴 수 없으니 주의.
export async function DELETE(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return Response.json({ error: "path 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }
  // CSRF·우발 삭제 방지(TASK-70): 삭제 대상을 커스텀 헤더로 재확인한다. 커스텀 헤더는
  // 교차 출처에서 CORS 프리플라이트 없이 설정할 수 없어(이 서버는 CORS 미허용) 사실상
  // 동일 출처 요청으로 제한된다.
  if (request.headers.get("x-confirm-delete") !== path) {
    return Response.json({ error: "삭제 확인 헤더가 없거나 일치하지 않습니다." }, { status: 400 });
  }
  try {
    await deleteReport(path);
    return Response.json({ ok: true });
  } catch (err) {
    // 내부 에러 상세는 서버 로그로만(TASK-53).
    console.error("reports content DELETE:", err);
    return Response.json({ error: "보고서를 삭제하지 못했습니다." }, { status: 500 });
  }
}
