import { requireAuth } from "@/lib/api-auth";
import { getHoldingsCached, MOCK_HOLDINGS, TossError } from "@/lib/toss";

export async function GET() {
  // 금융 데이터이므로 로그인 쿠키를 검증한다 (fail-closed).
  const unauth = await requireAuth();
  if (unauth) return unauth;

  // UI 개발용: 실제 API 연결(IP 허용) 전까지 목업으로 화면 확인.
  if (process.env.TOSS_MOCK === "1") {
    return Response.json({ holdings: MOCK_HOLDINGS, mock: true });
  }

  try {
    const holdings = await getHoldingsCached();
    return Response.json({ holdings });
  } catch (err) {
    // 429(토스 요청 한도)는 그대로 전달해 화면이 재시도 간격을 늘릴 수 있게 한다.
    const rateLimited = err instanceof TossError && err.rateLimited;
    // TossError 는 사용자용으로 다듬어진 메시지. 그 외 런타임 에러는 내부 정보가 새지
    // 않도록 일반 메시지로 대체하고 상세는 서버 로그로만 남긴다(TASK-53).
    if (!(err instanceof TossError)) console.error("holdings GET:", err);
    const message = err instanceof TossError ? err.message : "보유 정보를 불러오지 못했습니다.";
    return Response.json(
      { error: message, rateLimited, holdings: [] },
      { status: rateLimited ? 429 : 502 }
    );
  }
}
