import { execFile } from "node:child_process";
import { readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { repoPath, repoRoot } from "./repo-root";
import {
  companyFromPath,
  parseConfidenceVerdict,
  parseQualityScreenResult,
  type ConfidenceVerdict,
} from "./report-meta";

// 보고서 저장소 — 파일시스템 백엔드. reports/ 아래의 .md 가 단일 소스다.
// (git 이 그대로 백업·이력이고, 대시보드는 로컬 전용이라 DB를 거칠 이유가 없다.)
// 목록 조회는 파일을 전부 읽어 판정·신뢰도를 파싱한다 — 로컬 디스크라 160여 개도 수십 ms.

export type { ConfidenceVerdict };

export interface ReportFile {
  path: string; // 예: "reports/WST/WST-checklist-20260723.md"
  company: string | null; // 티커; 루트 보고서는 null
  name: string; // 예: "WST-checklist-20260723.md"
  summary?: string | null; // 열등주 스크리닝 판정
  confidence?: ConfidenceVerdict | null; // 데이터 신뢰도
  // 발행(최종수정) 시각 ISO. 실적 캘린더가 "이 실적을 이미 점검했는가"를
  // 판정하는 데 쓴다(발표일 이후 발행된 실적 보고서가 있으면 점검 완료).
  committedAt?: string | null;
}

/** 본문까지 들고 있는 스캔 결과 — 섹터 자동 맵 등 다른 파생 계산이 재사용한다. */
export interface ScannedReport {
  path: string;
  name: string;
  content: string;
  mtime: Date;
}

// 형식 가드: 경로가 reports/*.md 이고 상위 탈출(..)이 없어야 한다.
function isValidReportPath(p: string): boolean {
  return p.startsWith("reports/") && p.endsWith(".md") && !p.includes("..");
}

/**
 * `_` 로 시작하는 파일·폴더는 보고서가 아니라 원자료 캐시·공유 코퍼스다
 * (reports/{티커}/_data.md = SEC XBRL 추출, _q2-primary/ = Agent 공유 1차 자료).
 * 목록에 섞이면 대시보드에 원자료가 보고서로 뜬다.
 */
function isInternal(relPath: string): boolean {
  return relPath.split("/").slice(1).some((seg) => seg.startsWith("_"));
}

// ─── 파일 스캔 ──────────────────────────────────────────────────────────────
async function walk(dir: string, relBase: string, out: ScannedReport[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // reports/ 가 없거나 읽을 수 없으면 빈 목록
  }
  for (const entry of entries) {
    const rel = `${relBase}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      await walk(path.join(dir, entry.name), rel, out);
      continue;
    }
    if (!entry.name.endsWith(".md") || entry.name.startsWith("_")) continue;
    try {
      const full = path.join(dir, entry.name);
      const [content, st] = await Promise.all([readFile(full, "utf-8"), stat(full)]);
      out.push({ path: rel, name: entry.name, content, mtime: st.mtime });
    } catch {
      // 개별 파일 읽기 실패는 건너뛴다(목록 전체를 못 그리는 것보다 낫다).
    }
  }
}

export async function scanReports(): Promise<ScannedReport[]> {
  const out: ScannedReport[] = [];
  await walk(repoPath("reports"), "reports", out);
  return out.filter((r) => !isInternal(r.path)).sort((a, b) => (a.path < b.path ? -1 : 1));
}

// ─── as-of 시각: 마지막 git 커밋 시각 ───────────────────────────────────────
// 파일 mtime 은 clone·checkout 으로 전부 갱신돼 신선도 판정이 무너진다. 그래서
// git 이력을 우선 쓰고, 이력이 없는 파일(새로 쓴 미커밋 보고서)만 mtime 으로 채운다.
// git log 는 프로세스 1회로 전 파일 분을 한 번에 받아온다(파일당 spawn 금지).
const execFileAsync = promisify(execFile);
const GIT_DATE_TTL_MS = 5_000;

let gitDateCache: { at: number; map: Map<string, string> } | null = null;

async function gitDateMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (gitDateCache && now - gitDateCache.at < GIT_DATE_TTL_MS) return gitDateCache.map;

  const map = new Map<string, string>();
  try {
    // core.quotepath=false: 한글·중국어 파일명이 \xxx 8진 이스케이프로 오는 것을 막는다.
    const { stdout } = await execFileAsync(
      "git",
      ["-c", "core.quotepath=false", "log", "--format=%cI", "--name-only", "--", "reports/"],
      { cwd: repoRoot(), maxBuffer: 32 * 1024 * 1024, windowsHide: true }
    );
    let current = "";
    for (const line of stdout.split("\n")) {
      const t = line.trimEnd();
      if (!t) continue;
      if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
        current = t;
      } else if (current && !map.has(t)) {
        map.set(t, current); // 최신 커밋부터 오므로 첫 등장이 최종 수정 시각
      }
    }
  } catch {
    // git 이 없거나 저장소가 아니면 mtime 폴백
  }
  gitDateCache = { at: now, map };
  return map;
}

export async function listReportFiles(): Promise<ReportFile[]> {
  const [reports, dates] = await Promise.all([scanReports(), gitDateMap()]);
  return reports.map((r) => ({
    path: r.path,
    company: companyFromPath(r.path),
    name: r.name,
    // 판정은 열등주 스크리닝 보고서에만 있다(다른 보고서에서 '탈락' 같은 단어를 오인하지 않도록).
    summary: r.name.includes("-quality-screen-") ? parseQualityScreenResult(r.content) : null,
    confidence: parseConfidenceVerdict(r.content),
    committedAt: dates.get(r.path) ?? r.mtime.toISOString(),
  }));
}

export async function getReportContent(p: string): Promise<string> {
  if (!isValidReportPath(p) || isInternal(p)) {
    throw new Error("잘못된 경로입니다.");
  }
  try {
    return await readFile(repoPath(p), "utf-8");
  } catch {
    throw new Error("보고서를 찾을 수 없습니다.");
  }
}

/** 보고서의 as-of(최종 수정) 시각. 실패 시 null(신선도 표기를 숨긴다). */
export async function getReportCommitDate(p: string): Promise<string | null> {
  if (!isValidReportPath(p) || isInternal(p)) return null;
  try {
    const fromGit = (await gitDateMap()).get(p);
    if (fromGit) return fromGit;
    return (await stat(repoPath(p))).mtime.toISOString();
  } catch {
    return null;
  }
}

/**
 * 보고서 삭제(개발 단계 정리용) — 작업트리의 파일을 지운다.
 * git 추적 파일이므로 `git checkout -- <path>` 로 되돌릴 수 있다.
 */
export async function deleteReport(p: string): Promise<void> {
  if (!isValidReportPath(p) || isInternal(p)) {
    throw new Error("잘못된 경로입니다.");
  }
  try {
    await unlink(repoPath(p));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return; // 이미 없으면 성공으로 본다
    console.error("보고서 삭제 실패:", err);
    throw new Error("삭제에 실패했습니다.");
  }
}
