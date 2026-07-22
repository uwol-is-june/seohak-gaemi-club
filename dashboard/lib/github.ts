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

export interface ReportFile {
  path: string; // e.g. "reports/Apple/Apple-thesis.md"
  company: string | null; // e.g. "Apple", null for root-level reports
  name: string; // e.g. "Apple-thesis.md"
  // 열기 전 노출할 결과 개요. 현재는 열등주 스크리닝(-quality-screen-) 보고서만 파싱한다.
  // 예: "탈락" | "통과" | "면제 통과". 파싱 불가/미해당 시 null.
  summary?: string | null;
}

// 열등주 스크리닝 보고서 본문에서 최종 결과를 뽑아낸다.
// "최종 판정" 라인을 우선 살피고, 없으면 전체에서 키워드를 찾는다.
// 주의: "면제 통과"·"미통과"가 "통과"를 부분 포함하므로 검사 순서를 지킨다.
function parseQualityScreenResult(md: string): string | null {
  const verdictLine = md.split("\n").find((l) => l.includes("최종 판정"));
  const scan = verdictLine ?? md;
  if (/면제\s*통과/.test(scan)) return "면제 통과";
  if (scan.includes("탈락")) return "탈락";
  if (scan.includes("통과")) return "통과";
  return null;
}

export async function listReportFiles(): Promise<ReportFile[]> {
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

  const files: ReportFile[] = tree
    .filter((item) => item.type === "blob" && item.path.startsWith("reports/") && item.path.endsWith(".md"))
    .map((item) => {
      const parts = item.path.split("/");
      // reports/{file}.md -> root-level, reports/{company}/{file}.md -> company-level
      const company = parts.length > 2 ? parts[1] : null;
      const name = parts[parts.length - 1];
      return { path: item.path, company, name };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  // 열등주 스크리닝 보고서만 본문을 추가로 받아 결과 개요를 파싱한다.
  // (다른 유형은 파일명 배지로 충분히 구분되므로 불필요한 API 호출을 피한다.)
  return Promise.all(
    files.map(async (f) => {
      if (!f.name.includes("-quality-screen-")) return f;
      try {
        const content = await getReportContent(f.path);
        return { ...f, summary: parseQualityScreenResult(content) };
      } catch {
        return f; // 개요 파싱 실패는 목록 표시를 막지 않는다.
      }
    })
  );
}

export async function getReportContent(path: string): Promise<string> {
  if (!path.startsWith("reports/") || !path.endsWith(".md") || path.includes("..")) {
    throw new Error("잘못된 경로입니다.");
  }
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
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
