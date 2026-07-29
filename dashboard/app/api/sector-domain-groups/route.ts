import { getSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { DEFAULT_DOMAIN_GROUPS } from "@/lib/report-helpers";
import type { DomainGroup } from "@/lib/sector-domains";

// '섹터 리서치' 탭의 분야(도메인) 그룹 설정 — 이름 + 포함 **섹터명**(티커가 아니다).
// app_config('sector_domain_groups')에 저장한다. 종목별 보고서 탭의 섹터 그룹
// ('sector_groups', /api/sector-groups)과는 다른 축이라 키를 분리한다(TASK-82).
// 저장값이 없으면 프로세스 가이드 '섹터 구조 파악'의 섹터 피커에서 파생한 기본 시드를 준다.
const CONFIG_KEY = "sector_domain_groups";

// 인증된 클라이언트라도 거대 blob 을 app_config 에 저장하지 못하도록 상한을 둔다(TASK-54).
const MAX_GROUPS = 100;
const MAX_MEMBERS_PER_GROUP = 500;
const MAX_STR = 200;

// 외부 입력(PUT 바디)을 신뢰하지 않고 형태를 검증·정규화한다. 상한 초과 시 null(→400).
// sector-groups 라우트와 같은 골격이지만, 멤버가 섹터명이라 대문자 변환을 하지 않는다
// (티커는 upper-case 정규화가 맞지만 'AI Semiconductors'는 표기를 보존해야 한다).
function sanitizeGroups(input: unknown): DomainGroup[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_GROUPS) return null;
  const groups: DomainGroup[] = [];
  for (const g of input) {
    if (!g || typeof g !== "object") return null;
    const rec = g as Record<string, unknown>;
    if (typeof rec.name !== "string" || rec.name.length > MAX_STR) return null;
    if (typeof rec.id !== "string" && typeof rec.id !== "undefined") return null;
    if (typeof rec.id === "string" && rec.id.length > MAX_STR) return null;
    if (!Array.isArray(rec.tickers) || rec.tickers.length > MAX_MEMBERS_PER_GROUP) return null;
    const tickers = rec.tickers
      .filter((t): t is string => typeof t === "string" && t.length <= MAX_STR)
      .map((t) => t.trim())
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
    const groups = sanitizeGroups(value) ?? DEFAULT_DOMAIN_GROUPS;
    return Response.json({ groups });
  } catch (err) {
    // 원시 DB 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
    console.error("sector-domain-groups GET:", err);
    return Response.json({ error: "분야 그룹을 불러오지 못했습니다." }, { status: 500 });
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
    console.error("sector-domain-groups PUT:", err);
    return Response.json({ error: "분야 그룹을 저장하지 못했습니다." }, { status: 500 });
  }
}
