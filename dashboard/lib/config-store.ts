import { randomUUID } from "node:crypto";
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

// 파일별 쓰기 직렬화 큐. 같은 파일에 PUT 이 겹치면(탭 두 개에서 저장 등) 예전엔 같은
// `${target}.tmp` 에 동시에 써서 한쪽 rename 이 ENOENT 로 실패하거나 내용이 섞였다(TASK-157).
const writeQueues = new Map<string, Promise<void>>();

/**
 * 설정을 저장한다. 임시 파일에 쓰고 rename 해 중간에 끊겨도 원본이 깨지지 않게 한다.
 * 같은 파일 쓰기는 도착 순서대로 한 번에 하나씩 — 마지막 요청이 최종 상태가 된다.
 */
export async function writeConfig(file: string, value: unknown): Promise<void> {
  const target = configPath(file);
  const prev = writeQueues.get(target) ?? Promise.resolve();
  const next = prev
    .catch(() => {}) // 앞 쓰기 실패가 뒤 쓰기를 막지 않는다(실패는 그 호출자에게만 전달된다)
    .then(async () => {
      await mkdir(path.dirname(target), { recursive: true });
      // pid + uuid — 여러 프로세스(dev 서버 재시작 겹침 등)가 같은 tmp 를 쓰지 않게 한다.
      const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
      await rename(tmp, target);
    });
  writeQueues.set(target, next);
  try {
    await next;
  } finally {
    if (writeQueues.get(target) === next) writeQueues.delete(target);
  }
}
