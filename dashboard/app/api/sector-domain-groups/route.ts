import { CONFIG_FILES, readConfig, writeConfig } from "@/lib/config-store";
import { requireAuth } from "@/lib/api-auth";
import { sanitizeGroups as sanitizeGroupsShared } from "@/lib/group-sanitize";
import { DEFAULT_DOMAIN_GROUPS } from "@/lib/report-helpers";
import type { DomainGroup } from "@/lib/sector-domains";

// '섹터 리서치' 탭의 분야(도메인) 그룹 설정 — 이름 + 포함 **섹터명**(티커가 아니다).
// data/sector-domain-groups.json 에 저장한다. 종목별 보고서 탭의 섹터 그룹
// (data/sector-groups.json, /api/sector-groups)과는 다른 축이라 파일을 분리한다(TASK-82).
// 저장값이 없으면 프로세스 가이드 '섹터 구조 파악'의 섹터 피커에서 파생한 기본 시드를 준다.
const CONFIG_FILE = CONFIG_FILES.sectorDomainGroups;

// 검증·상한은 lib/group-sanitize.ts 공용(TASK-157). 멤버가 섹터명이라 대문자 변환을 하지 않는다
// (티커는 upper-case 정규화가 맞지만 'AI Semiconductors'는 표기를 보존해야 한다).
const sanitizeGroups = (input: unknown): DomainGroup[] | null => sanitizeGroupsShared(input, { upper: false });

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const groups = sanitizeGroups(await readConfig(CONFIG_FILE)) ?? DEFAULT_DOMAIN_GROUPS;
    return Response.json({ groups });
  } catch (err) {
    // 원시 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
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
    await writeConfig(CONFIG_FILE, groups);
    return Response.json({ groups });
  } catch (err) {
    // 원시 에러 메시지를 클라이언트에 노출하지 않는다(TASK-53).
    console.error("sector-domain-groups PUT:", err);
    return Response.json({ error: "분야 그룹을 저장하지 못했습니다." }, { status: 500 });
  }
}
