import { getReportContent } from "@/lib/github";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return Response.json({ error: "path 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }
  try {
    const content = await getReportContent(path);
    return Response.json({ content });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
