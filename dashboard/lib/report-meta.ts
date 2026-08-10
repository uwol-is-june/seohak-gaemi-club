// 보고서 본문·경로에서 메타데이터를 뽑는 순수 함수들.
// 예전에는 tools/publish_report.py 가 발행 시점에 파싱해 DB 컬럼에 넣었지만,
// 저장소가 파일시스템으로 돌아오면서 읽는 쪽에서 파싱한다(단일 소스 = 마크다운 본문).

// ─── 회사명 정규화 ──────────────────────────────────────────────────────────
// 같은 종목이 여러 폴더명으로 갈린 과거 산출물을 하나로 묶는다.
// 신규 보고서는 CLAUDE.md 규칙대로 티커 폴더만 쓰므로 여기에 추가할 일이 없어야 한다.
const COMPANY_ALIAS_GROUPS: string[][] = [
  ["QUBT", "QuantumComputing", "Quantum Computing", "퀀텀컴퓨팅"],
];

function normalizeCompanyKey(s: string): string {
  return s.toLowerCase().replace(/[\s_.\-]/g, "");
}

const ALIAS_LOOKUP = new Map<string, string>();
for (const group of COMPANY_ALIAS_GROUPS) {
  for (const name of group) ALIAS_LOOKUP.set(normalizeCompanyKey(name), group[0]);
}

export function canonicalCompany(folder: string): string {
  return ALIAS_LOOKUP.get(normalizeCompanyKey(folder)) ?? folder;
}

/** reports/{company}/{file}.md → company(정규화); reports/{file}.md → null. */
export function companyFromPath(relPath: string): string | null {
  const parts = relPath.split("/");
  return parts.length > 2 ? canonicalCompany(parts[1]) : null;
}

// ─── 열등주 스크리닝 판정 ───────────────────────────────────────────────────
export type ScreenVerdict = "면제 통과" | "탈락" | "통과" | "데이터 부족";

function classifyVerdict(scan: string): ScreenVerdict | null {
  if (/면제\s*통과/.test(scan)) return "면제 통과";
  if (scan.includes("탈락")) return "탈락";
  if (scan.includes("통과")) return "통과";
  if (/데이터\s*부족/.test(scan)) return "데이터 부족";
  return null;
}

/** 마커 우선 → '최종 판정' 줄 주변 4줄 → 전문 스캔 순으로 판정을 찾는다. */
export function parseQualityScreenResult(md: string): ScreenVerdict | null {
  const marker = md.match(
    /<!--\s*quality-screen\s+result:\s*(면제\s*통과|탈락|통과|데이터\s*부족)\s*-->/
  );
  if (marker) return classifyVerdict(marker[1]);

  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("최종 판정")) {
      const v = classifyVerdict(lines.slice(i, i + 4).join("\n"));
      if (v) return v;
      break;
    }
  }
  return classifyVerdict(md);
}

// ─── 데이터 신뢰도 ──────────────────────────────────────────────────────────
export type ConfidenceVerdict = "높음" | "보통" | "낮음";

export function parseConfidenceVerdict(md: string): ConfidenceVerdict | null {
  const block = md.match(/<!--\s*confidence-summary([\s\S]*?)-->/);
  if (!block) return null;
  const m = block[1].match(/verdict:\s*(높음|보통|낮음)/);
  return m ? (m[1] as ConfidenceVerdict) : null;
}
