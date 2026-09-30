// 그룹 편집 UI(PUT 바디)의 형태 검증·정규화 — /api/sector-groups · /api/sector-domain-groups 공용.
//
// 두 라우트에 거의 같은 함수가 두 벌 있었다(TASK-157). 차이는 멤버 정규화 하나뿐이다:
//   - 섹터 그룹(종목별 보고서 탭): 멤버가 **티커** → 대문자로 정규화 (`{ upper: true }`)
//   - 분야 그룹(섹터 리서치 탭):   멤버가 **섹터명** → 표기 보존('AI Semiconductors')
// 한쪽만 고치면 상한·검증 규칙이 조용히 갈라지므로 한 곳에 둔다.

export type Group = { id: string; name: string; tickers: string[] };

// 인증된 클라이언트라도 거대 blob 을 설정 파일에 저장하지 못하도록 상한을 둔다(TASK-54).
export const MAX_GROUPS = 100;
export const MAX_MEMBERS_PER_GROUP = 500;
export const MAX_STR = 200;

/** 외부 입력을 신뢰하지 않고 검증·정규화한다. 형태가 틀리거나 상한을 넘으면 null(→400). */
export function sanitizeGroups(input: unknown, opts: { upper: boolean }): Group[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_GROUPS) return null;
  const groups: Group[] = [];
  for (const g of input) {
    if (!g || typeof g !== "object") return null;
    const rec = g as Record<string, unknown>;
    if (typeof rec.name !== "string" || rec.name.length > MAX_STR) return null;
    if (typeof rec.id !== "string" && typeof rec.id !== "undefined") return null;
    if (typeof rec.id === "string" && rec.id.length > MAX_STR) return null;
    if (!Array.isArray(rec.tickers) || rec.tickers.length > MAX_MEMBERS_PER_GROUP) return null;
    const tickers = rec.tickers
      .filter((t): t is string => typeof t === "string" && t.length <= MAX_STR)
      .map((t) => (opts.upper ? t.trim().toUpperCase() : t.trim()))
      .filter(Boolean);
    groups.push({
      id: typeof rec.id === "string" ? rec.id : `g-${groups.length}`,
      name: rec.name.trim(),
      tickers,
    });
  }
  return groups;
}
