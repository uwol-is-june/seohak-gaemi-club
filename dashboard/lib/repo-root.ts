import { existsSync } from "node:fs";
import path from "node:path";

// 저장소 루트 해석 (server-only).
// dev 서버의 cwd 는 dashboard/ 이지만 실행 위치에 흔들리지 않게 후보를 순서대로 시도한다.
// 판별 기준은 reports/ 디렉터리의 존재 — 이 저장소의 데이터 루트다.
const CANDIDATES = [path.resolve(process.cwd(), ".."), process.cwd()];

let cached: string | null = null;

export function repoRoot(): string {
  if (cached) return cached;
  for (const c of CANDIDATES) {
    if (existsSync(path.join(c, "reports"))) {
      cached = c;
      return c;
    }
  }
  // 못 찾으면 상위 디렉터리로 가정한다(호출부에서 ENOENT 로 자연스럽게 실패).
  cached = CANDIDATES[0];
  return cached;
}

export function repoPath(...segments: string[]): string {
  return path.join(repoRoot(), ...segments);
}
