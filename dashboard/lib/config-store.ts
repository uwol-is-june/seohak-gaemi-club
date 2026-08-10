import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { repoPath } from "./repo-root";

// 대시보드 앱 설정(섹터 그룹 등) 저장소 — data/ 아래 JSON 파일.
// 예전에는 Supabase app_config 테이블이었지만, 대시보드가 로컬 전용이라 파일이면 충분하다.
// 파일이라 git 으로 이력·기기 간 공유가 따라온다(설정을 커밋하면 다른 머신에서도 그대로).

export const CONFIG_FILES = {
  sectorGroups: "sector-groups.json", // 종목별 보고서 탭: 섹터 그룹(이름 + 티커)
  sectorDomainGroups: "sector-domain-groups.json", // 섹터 리서치 탭: 분야 그룹(이름 + 섹터명)
} as const;

function configPath(file: string): string {
  return repoPath("data", file);
}

/** 저장된 설정을 읽는다. 파일이 없거나 깨졌으면 null(호출부가 기본값으로 폴백). */
export async function readConfig(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(configPath(file), "utf-8"));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error(`설정 파일 읽기 실패(${file}):`, err);
    return null;
  }
}

/** 설정을 저장한다. 임시 파일에 쓰고 rename 해 중간에 끊겨도 원본이 깨지지 않게 한다. */
export async function writeConfig(file: string, value: unknown): Promise<void> {
  const target = configPath(file);
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
  await rename(tmp, target);
}
