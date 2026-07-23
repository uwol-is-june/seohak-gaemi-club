import { getReportContent, getReportCommitDate } from "@/lib/github";
import { requireAuth } from "@/lib/api-auth";

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
    return Response.json({ content, commitDate });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
