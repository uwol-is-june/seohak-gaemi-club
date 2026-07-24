import { listReportFiles } from "@/lib/reports-store";
import { requireAuth } from "@/lib/api-auth";

// 발행 직후 대시보드에 즉시 반영되도록 캐시를 끈다. 라우트 핸들러는 Next 16에서
// 기본 비캐시이나, 브라우저/CDN의 휴리스틱 캐싱이 이전 목록을 재사용하는 것을 막는다.
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const files = await listReportFiles();
    return Response.json({ files }, { headers: NO_STORE });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500, headers: NO_STORE });
  }
}
