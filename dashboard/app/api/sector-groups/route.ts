import { CONFIG_FILES, readConfig, writeConfig } from "@/lib/config-store";
import { buildSectorAutoMap } from "@/lib/sector-auto-map";
import { requireAuth } from "@/lib/api-auth";

// 종목별 보고서 탭의 섹터 그룹(이름 + 포함 티커) 설정. data/sector-groups.json 에 저장.
// 브라우저 localStorage 대신 서버(파일) 저장이라 git 으로 이력·공유가 따라온다.
const CONFIG_FILE = CONFIG_FILES.sectorGroups;

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

// 자동 맵도 보고서 마커에서 파싱한 값이라 형태를 검증한다(티커·섹터명 문자열, 길이 상한).
function sanitizeAutoMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const ticker = k.trim().toUpperCase();
    const sector = v.trim();
    if (!ticker || !sector || ticker.length > MAX_STR || sector.length > MAX_STR) continue;
    if (Object.keys(out).length >= MAX_GROUPS * MAX_TICKERS_PER_GROUP) break;
    out[ticker] = sector;
  }
  return out;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    // 자동 맵은 보고서 마커에서 요청 시점에 파생한다 — 별도 저장이 없어 항상 최신이다.
    // 수동 그룹과 같은 축이라 한 응답에 실어 보낸다(클라이언트가 수동 우선으로 병합, TASK-90).
    const [stored, autoMap] = await Promise.all([
      readConfig(CONFIG_FILE),
      buildSectorAutoMap(),
    ]);
    const groups = sanitizeGroups(stored) ?? DEFAULT_SECTOR_GROUPS;
    return Response.json({ groups, autoMap: sanitizeAutoMap(autoMap) });
  } catch (err) {
    // 원시 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
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
    await writeConfig(CONFIG_FILE, groups);
    return Response.json({ groups });
  } catch (err) {
    // 원시 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
    console.error("sector-groups PUT:", err);
    return Response.json({ error: "섹터 그룹을 저장하지 못했습니다." }, { status: 500 });
  }
}
