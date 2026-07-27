// 응답 본문을 안전하게 JSON 으로 파싱한다(TASK-57).
// res.json() 은 비-JSON 본문(예: 500 에러 페이지 HTML)에서 SyntaxError 를 던져,
// 화면에 "SyntaxError: Unexpected token <" 같은 불투명한 메시지가 노출된다.
// 이 헬퍼는 파싱 실패 시 status 기반 error 객체를 돌려주므로, 비-OK 응답의 JSON
// 본문(예: { error, rateLimited })을 읽는 기존 로직은 그대로 두면서도 크래시를 막는다.
// 반환 타입은 기존 res.json() 과 동일하게 any — 호출부의 d.error/d.holdings 등 접근을 유지.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      // 아래 폴백으로.
    }
  }
  return { error: `서버 오류 (${res.status})` };
}
