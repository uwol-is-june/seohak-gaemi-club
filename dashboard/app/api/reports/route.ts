import { listReportFiles } from "@/lib/github";

export async function GET() {
  try {
    const files = await listReportFiles();
    return Response.json({ files });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
