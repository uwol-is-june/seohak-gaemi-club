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

  return tree
    .filter((item) => item.type === "blob" && item.path.startsWith("reports/") && item.path.endsWith(".md"))
    .map((item) => {
      const parts = item.path.split("/");
      // reports/{file}.md -> root-level, reports/{company}/{file}.md -> company-level
      const company = parts.length > 2 ? parts[1] : null;
      const name = parts[parts.length - 1];
      return { path: item.path, company, name };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
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
