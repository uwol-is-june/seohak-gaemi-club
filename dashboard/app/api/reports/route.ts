import { listReportFiles } from "@/lib/github";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const files = await listReportFiles();
    return Response.json({ files });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
