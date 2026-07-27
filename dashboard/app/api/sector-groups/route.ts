import { getSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// 종목별 보고서 탭의 섹터 그룹(이름 + 포함 티커) 설정. app_config('sector_groups')에 저장.
// 브라우저 localStorage 대신 서버 저장이라 기기 간 공유된다.
const CONFIG_KEY = "sector_groups";

// 저장된 설정이 없을 때 시드로 쓰는 기본 그룹. (page.tsx의 DEFAULT_SECTOR_GROUPS와 일치)
const DEFAULT_SECTOR_GROUPS = [
  { id: "healthcare", name: "헬스케어", tickers: ["LLY", "NVO", "WST"] },
  { id: "tech", name: "기술", tickers: ["NVDA", "QUBT"] },
  { id: "space", name: "우주·항공", tickers: ["SPCX"] },
];

type SectorGroup = { id: string; name: string; tickers: string[] };

// 인증된 클라이언트라도 거대 blob 을 app_config 에 저장하지 못하도록 상한을 둔다(TASK-54).
const MAX_GROUPS = 100;
const MAX_TICKERS_PER_GROUP = 500;
const MAX_STR = 200;

// 외부 입력(PUT 바디)을 신뢰하지 않고 형태를 검증·정규화한다. 상한 초과 시 null(→400).
function sanitizeGroups(input: unknown): SectorGroup[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_GROUPS) return null;
  const groups: SectorGroup[] = [];
  for (const g of input) {
    if (!g || typeof g !== "object") return null;
    const rec = g as Record<string, unknown>;
    if (typeof rec.name !== "string" || rec.name.length > MAX_STR) return null;
    if (typeof rec.id !== "string" && typeof rec.id !== "undefined") return null;
    if (typeof rec.id === "string" && rec.id.length > MAX_STR) return null;
    if (!Array.isArray(rec.tickers) || rec.tickers.length > MAX_TICKERS_PER_GROUP) return null;
    const tickers = rec.tickers
      .filter((t): t is string => typeof t === "string" && t.length <= MAX_STR)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    groups.push({
      id: typeof rec.id === "string" ? rec.id : `g-${groups.length}`,
      name: rec.name.trim(),
      tickers,
    });
  }
  return groups;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("app_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = data ? (data as { value: unknown }).value : null;
    const groups = sanitizeGroups(value) ?? DEFAULT_SECTOR_GROUPS;
    return Response.json({ groups });
  } catch (err) {
    // 원시 DB 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
    console.error("sector-groups GET:", err);
    return Response.json({ error: "섹터 그룹을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await request.json();
    const groups = sanitizeGroups(body?.groups);
    if (!groups) {
      return Response.json({ error: "groups 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const sb = getSupabase();
    const { error } = await sb
      .from("app_config")
      .upsert({ key: CONFIG_KEY, value: groups, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return Response.json({ groups });
  } catch (err) {
    // 원시 DB 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
    console.error("sector-groups PUT:", err);
    return Response.json({ error: "섹터 그룹을 저장하지 못했습니다." }, { status: 500 });
  }
}
