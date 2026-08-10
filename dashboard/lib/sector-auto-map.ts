import { canonicalCompany, companyFromPath } from "./report-meta";
import { scanReports } from "./reports-store";

// 보고서 마커에서 '티커 → 섹터' 자동 맵을 만든다(TASK-90).
// 예전에는 tools/sync_sector_map.py 가 스캔해 Supabase app_config 에 저장했지만,
// 입력이 reports/*.md 뿐이라 요청 시점에 바로 계산하는 편이 단순하고 항상 최신이다.
//
// 읽는 마커 두 가지(둘 다 HTML 주석이라 렌더링에는 안 보인다):
//   1) 퍼널 보고서(reports/{섹터}-funnel-{YYYYMMDD}.md)
//      <!-- funnel sector: Defense | finalists: NOC, GD, PLTR -->
//   2) 종목 보고서(reports/{티커}/*.md)
//      <!-- meta sector: Defense -->  ← 더 구체적인 출처라 퍼널보다 우선
// 같은 우선순위 안에서 충돌하면 파일명 날짜가 최신인 쪽이 이긴다.
//
// 대시보드는 이 맵을 **수동 그룹의 빈칸에만** 적용한다(수동 우선 — mergeAutoSectorGroups).

const FUNNEL_MARKER = /<!--\s*funnel\s+sector:\s*([^|>]+?)\s*\|\s*finalists:\s*([^>]*?)\s*-->/i;
const META_MARKER = /<!--\s*meta\s+sector:\s*([^>|]+?)\s*-->/i;
// 티커: 영문 시작 + 영숫자/점/하이픈. 'BRK.B' 같은 클래스 표기까지 허용하되 문장은 배제한다.
const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

// 우선순위 티어 — 큰 쪽이 이긴다.
const TIER_FUNNEL = 0;
const TIER_META = 1;

function fileDate(name: string): string {
  return name.match(/(\d{8})/)?.[1] ?? "00000000";
}

/** 마커 안의 한 항목을 티커로 정규화. 굵게(**NOC**)·괄호주석 등 장식을 벗긴다. */
function cleanTicker(raw: string): string | null {
  const t = raw.trim().replace(/^[*`"']+|[*`"']+$/g, "").split("(")[0].trim().toUpperCase();
  return TICKER_RE.test(t) ? t : null;
}

export async function buildSectorAutoMap(): Promise<Record<string, string>> {
  const reports = await scanReports();
  // ticker → [tier, date, sector]
  const best = new Map<string, [number, string, string]>();

  const offer = (ticker: string, sector: string, tier: number, date: string) => {
    const cur = best.get(ticker);
    // 우선순위가 더 높으면(종목 마커 > 퍼널 마커, 같은 티어면 최신 날짜) 교체.
    if (!cur || tier > cur[0] || (tier === cur[0] && date > cur[1])) {
      best.set(ticker, [tier, date, sector]);
      return;
    }
    // 동률인데 섹터만 다르면 우열을 못 가린다 — 먼저 스캔된 값을 유지하고 경고를 남긴다
    // (조용히 넘기면 대시보드에서 섹터가 갈려도 원인을 못 찾는다). 스캔 순서는 정렬돼 결정적.
    if (tier === cur[0] && date === cur[1] && sector !== cur[2]) {
      console.warn(
        `섹터 자동 맵 충돌 — ${ticker}: '${cur[2]}' vs '${sector}' (우선순위·날짜 동률 → '${cur[2]}' 유지). 한쪽 마커 표기를 통일하라.`
      );
    }
  };

  for (const r of reports) {
    const isRoot = r.path.split("/").length === 2;

    if (isRoot) {
      // 1) 퍼널 보고서(루트) — 최종 선정 종목 전부를 그 섹터에 배정
      const m = r.content.match(FUNNEL_MARKER);
      if (!m) continue;
      const sector = m[1].trim();
      if (!sector) continue;
      const date = fileDate(r.name);
      for (const raw of m[2].split(/[,/·]/)) {
        const ticker = cleanTicker(raw);
        if (ticker) offer(canonicalCompany(ticker), sector, TIER_FUNNEL, date);
      }
      continue;
    }

    // 2) 종목 보고서 — 폴더 티커에 직접 섹터 지정(퍼널보다 우선)
    const ticker = companyFromPath(r.path);
    if (!ticker) continue;
    const m = r.content.match(META_MARKER);
    const sector = m?.[1].trim();
    if (sector) offer(ticker, sector, TIER_META, fileDate(r.name));
  }

  const out: Record<string, string> = {};
  for (const ticker of [...best.keys()].sort()) out[ticker] = best.get(ticker)![2];
  return out;
}
