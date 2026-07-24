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

// 외부 입력(PUT 바디)을 신뢰하지 않고 형태를 검증·정규화한다.
function sanitizeGroups(input: unknown): SectorGroup[] | null {
  if (!Array.isArray(input)) return null;
  const groups: SectorGroup[] = [];
  for (const g of input) {
    if (!g || typeof g !== "object") return null;
    const rec = g as Record<string, unknown>;
    if (typeof rec.name !== "string") return null;
    if (!Array.isArray(rec.tickers)) return null;
    const tickers = rec.tickers
      .filter((t): t is string => typeof t === "string")
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
    return Response.json({ error: (err as Error).message }, { status: 500 });
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
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
