const OWNER = "uwol-is-june";
const REPO = "reality-escape-device";
const BRANCH = "main";

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN 환경변수가 설정되지 않았습니다.");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
}

export type ConfidenceVerdict = "높음" | "보통" | "낮음";

// 같은 종목이 서로 다른 폴더명(티커/영문명/한글명)으로 저장돼 보고서 탭에서 별개
// 종목으로 분리 표시되는 문제를 막는 별칭 테이블. 각 그룹의 첫 항목이 표시명(canonical).
// 매칭은 대소문자·공백·하이픈·언더스코어·점을 무시하고 비교한다(BRK.B/BRK-B/BRKB 동일 취급).
// 근본 예방책은 폴더명을 회사명으로 고정하는 것(CLAUDE.md 규칙) — 이 테이블은 보완책.
const COMPANY_ALIAS_GROUPS: string[][] = [
  ["QUBT", "QuantumComputing", "Quantum Computing", "퀀텀컴퓨팅"],
];

function normalizeCompanyKey(s: string): string {
  return s.toLowerCase().replace(/[\s_.-]/g, "");
}

const ALIAS_LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const group of COMPANY_ALIAS_GROUPS) {
    const canonical = group[0];
    for (const name of group) m.set(normalizeCompanyKey(name), canonical);
  }
  return m;
})();

// 폴더명을 표준 표시명으로 정규화. 별칭 테이블에 없으면 폴더명을 그대로 반환.
function canonicalCompany(folder: string): string {
  return ALIAS_LOOKUP.get(normalizeCompanyKey(folder)) ?? folder;
}

export interface ReportFile {
  path: string; // e.g. "reports/Apple/Apple-thesis.md"
  company: string | null; // e.g. "Apple", null for root-level reports
  name: string; // e.g. "Apple-thesis.md"
  // 열기 전 노출할 결과 개요. 현재는 열등주 스크리닝(-quality-screen-) 보고서만 파싱한다.
  // 예: "탈락" | "통과" | "면제 통과". 파싱 불가/미해당 시 null.
  summary?: string | null;
  // 데이터 신뢰도 요약 블록(<!-- confidence-summary ... verdict: ... -->)의 종합 판정.
  // skills/data-confidence.md 표준을 적용한 보고서만 값이 있다. 미적용 보고서는 null.
  // 주의: 이는 "데이터 신뢰도"이지 "투자 매력도"가 아니다.
  confidence?: ConfidenceVerdict | null;
}

// 열등주 스크리닝 보고서 본문에서 최종 결과를 뽑아낸다. 파싱은 3단 폴백:
//   1순위) 기계 판독 마커 <!-- quality-screen result: 통과 --> — 프로즈와 분리돼 가장 견고.
//   2순위) "최종 판정"이 든 라인부터 몇 줄을 함께 스캔 — 판정어가 제목 다음 줄에 있어도 잡는다
//          (예: "## 최종 판정" 다음 줄 "…전항목 통과…"). 라인 단독 스캔은 이 경우를 놓쳤다.
//   3순위) 본문 전체 스캔(구형 보고서 호환).
// 주의: "면제 통과"·"미통과"가 "통과"를 부분 포함하므로 검사 순서를 지킨다.
function classifyVerdict(scan: string): string | null {
  if (/면제\s*통과/.test(scan)) return "면제 통과";
  if (scan.includes("탈락")) return "탈락";
  if (scan.includes("통과")) return "통과";
  if (/데이터\s*부족/.test(scan)) return "데이터 부족";
  return null;
}

function parseQualityScreenResult(md: string): string | null {
  // 1순위: 기계 판독 마커
  const marker = md.match(
    /<!--\s*quality-screen\s+result:\s*(면제\s*통과|탈락|통과|데이터\s*부족)\s*-->/
  );
  if (marker) return classifyVerdict(marker[1]);

  // 2순위: "최종 판정" 라인 + 이어지는 3줄 윈도우
  const lines = md.split("\n");
  const idx = lines.findIndex((l) => l.includes("최종 판정"));
  if (idx >= 0) {
    const windowScan = lines.slice(idx, idx + 4).join("\n");
    const v = classifyVerdict(windowScan);
    if (v) return v;
  }

  // 3순위: 본문 전체
  return classifyVerdict(md);
}

// 데이터 신뢰도 요약 블록에서 종합 판정(verdict)을 뽑아낸다.
// 고정 포맷: <!-- confidence-summary ... verdict: 높음|보통|낮음 ... -->
// (skills/data-confidence.md 표준) 블록/필드가 없으면 null.
function parseConfidenceVerdict(md: string): ConfidenceVerdict | null {
  const block = md.match(/<!--\s*confidence-summary([\s\S]*?)-->/);
  if (!block) return null;
  const m = block[1].match(/verdict:\s*(높음|보통|낮음)/);
  return m ? (m[1] as ConfidenceVerdict) : null;
}

// 저장소 트리에서 보고서 .md 경로 목록만 가져온다(본문 fetch 없음).
// listReportFiles(목록 구성)와 getReportContent(경로 화이트리스트 검증)가 공유한다.
async function fetchReportTreePaths(): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
    { headers: authHeaders(), cache: "no-store" }
  );
  if (!res.ok) {
    console.error(`GitHub API 오류(트리): ${res.status} ${await res.text()}`);
    throw new Error("보고서 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const tree: { path: string; type: string }[] = data.tree || [];
  return tree
    .filter((item) => item.type === "blob" && item.path.startsWith("reports/") && item.path.endsWith(".md"))
    .map((item) => item.path);
}

export async function listReportFiles(): Promise<ReportFile[]> {
  const paths = await fetchReportTreePaths();

  const files: ReportFile[] = paths
    .map((path) => {
      const parts = path.split("/");
      // reports/{file}.md -> root-level, reports/{company}/{file}.md -> company-level
      // 폴더명은 canonicalCompany로 정규화해 동일 종목의 폴더명 차이를 하나로 병합한다.
      const company = parts.length > 2 ? canonicalCompany(parts[1]) : null;
      const name = parts[parts.length - 1];
      return { path, company, name };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  // 각 보고서 본문을 받아 (1) 열등주 스크리닝 결과와 (2) 데이터 신뢰도 판정을 파싱한다.
  // 한 번의 fetch로 두 신호를 함께 뽑아 중복 호출을 피한다.
  // 참고: 신뢰도 블록은 대부분의 보고서 유형에 실리므로 전 파일 본문을 받는다. 로컬 단일
  // 사용자 대시보드 + 보고서 수가 적어 허용 가능. 보고서가 크게 늘면 캐싱/온디맨드 파싱으로 최적화.
  // 경로는 트리에서 온 신뢰 가능한 값이므로 검증을 건너뛰는 내부 함수로 받는다.
  return Promise.all(
    files.map(async (f) => {
      try {
        const content = await fetchReportContent(f.path);
        const summary = f.name.includes("-quality-screen-")
          ? parseQualityScreenResult(content)
          : null;
        return { ...f, summary, confidence: parseConfidenceVerdict(content) };
      } catch {
        return f; // 파싱 실패는 목록 표시를 막지 않는다.
      }
    })
  );
}

// 실제 본문 fetch. 경로 세그먼트를 인코딩해 URL에 안전하게 보간한다(슬래시는 보존).
// 검증은 호출부(getReportContent) 또는 신뢰 가능한 출처(listReportFiles)가 책임진다.
async function fetchReportContent(path: string): Promise<string> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}?ref=${BRANCH}`,
    { headers: authHeaders(), cache: "no-store" }
  );
  if (!res.ok) {
    console.error(`GitHub API 오류(내용): ${res.status} ${await res.text()}`);
    throw new Error("보고서를 불러오지 못했습니다.");
  }
  const data = await res.json();
  if (!data.content) {
    throw new Error("파일 내용을 가져올 수 없습니다.");
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function getReportContent(path: string): Promise<string> {
  // 1차 형식 가드
  if (!path.startsWith("reports/") || !path.endsWith(".md") || path.includes("..")) {
    throw new Error("잘못된 경로입니다.");
  }
  // 2차 화이트리스트: 실제 저장소 트리에 존재하는 보고서 경로만 허용한다.
  // 퍼센트 인코딩된 점·`?`/`#` 등 우회를 원천 차단(정확 일치만 통과).
  const allowed = await fetchReportTreePaths();
  if (!allowed.includes(path)) {
    throw new Error("잘못된 경로입니다.");
  }
  return fetchReportContent(path);
}

// 보고서를 저장소에서 삭제한다(삭제 커밋 생성 → git 히스토리로 복구 가능).
// GitHub contents DELETE는 blob sha가 필요하므로 먼저 조회한 뒤 삭제한다.
// 개발 단계 정리용. GITHUB_TOKEN에 contents 쓰기 권한이 있어야 한다.
export async function deleteReport(path: string): Promise<void> {
  // getReportContent와 동일한 형식 가드 + 트리 화이트리스트(실재 경로만 정확 일치)
  if (!path.startsWith("reports/") || !path.endsWith(".md") || path.includes("..")) {
    throw new Error("잘못된 경로입니다.");
  }
  const allowed = await fetchReportTreePaths();
  if (!allowed.includes(path)) {
    throw new Error("잘못된 경로입니다.");
  }
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  // 1) blob sha 조회
  const getRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}?ref=${BRANCH}`,
    { headers: authHeaders(), cache: "no-store" }
  );
  if (!getRes.ok) {
    throw new Error("보고서를 찾을 수 없습니다.");
  }
  const meta = await getRes.json();
  const sha = meta?.sha;
  if (typeof sha !== "string") {
    throw new Error("파일 SHA를 가져올 수 없습니다.");
  }
  // 2) 삭제 커밋
  const delRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}`,
    {
      method: "DELETE",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: `dashboard: delete report ${path}`, sha, branch: BRANCH }),
    }
  );
  if (!delRes.ok) {
    console.error(`GitHub 삭제 오류: ${delRes.status} ${await delRes.text()}`);
    throw new Error("삭제에 실패했습니다 (GITHUB_TOKEN 쓰기 권한을 확인하세요).");
  }
}

// 보고서의 마지막 커밋 시각(ISO 문자열). 파일명에 박힌 날짜가 아니라 저장소에 실제
// 반영된 시점 = 신선도(as-of) 기준. 실패하면 null(신선도 표기를 숨긴다).
export async function getReportCommitDate(path: string): Promise<string | null> {
  if (!path.startsWith("reports/") || !path.endsWith(".md") || path.includes("..")) {
    return null;
  }
  try {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encoded}&sha=${BRANCH}&per_page=1`,
      { headers: authHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const date = data?.[0]?.commit?.committer?.date ?? data?.[0]?.commit?.author?.date;
    return typeof date === "string" ? date : null;
  } catch {
    return null;
  }
}
