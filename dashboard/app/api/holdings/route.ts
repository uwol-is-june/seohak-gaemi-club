import { requireAuth } from "@/lib/api-auth";
import { getHoldings, MOCK_HOLDINGS } from "@/lib/toss";

export async function GET() {
  // 금융 데이터이므로 로그인 쿠키를 검증한다 (fail-closed).
  const unauth = await requireAuth();
  if (unauth) return unauth;

  // UI 개발용: 실제 API 연결(IP 허용) 전까지 목업으로 화면 확인.
  if (process.env.TOSS_MOCK === "1") {
    return Response.json({ holdings: MOCK_HOLDINGS, mock: true });
  }

  try {
    const holdings = await getHoldings();
    return Response.json({ holdings });
  } catch (err) {
    return Response.json({ error: (err as Error).message, holdings: [] }, { status: 502 });
  }
}
