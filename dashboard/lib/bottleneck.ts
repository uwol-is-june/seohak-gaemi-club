// 병목 신호(/bottleneck-hunter · S3) 산출물 경로 파싱.
// React·다른 lib 의존 없는 순수 모듈로 유지한다(sector-domains.ts 와 같은 이유 — 테스트 용이).
//
// 경로 규약 (skills/bottleneck-hunter.md "출력 요건"):
//   reports/bottleneck-map/YYYY-MM-DD/HH-MM-{티커…}.md    — 일일 스캔: 투자 대상 발견
//   reports/bottleneck-map/YYYY-MM-DD/HH-MM-신호스캔.md    — 일일 스캔: 신호만, 대상 없음
//   reports/bottleneck-map/{트렌드}-bottleneck-YYYYMMDD.md — 트렌드 전체 스캔
//   reports/bottleneck-map/master-map.md                   — 병목 전체 맵(지속 갱신)
//   reports/bottleneck-map/watchlist.md                    — 관찰 목록(지속 갱신)
//
// ⚠️ 이 폴더는 티커 폴더가 아니다. publish_report.py 의 company_from_path 는
// reports/{2번째 세그먼트}/ 를 티커로 읽으므로 'bottleneck-map' 이 가짜 티커로 잡힌다.
// 종목 축 화면은 isBottleneckCompany() 로 걸러낸다(HomeView companies 파생).

export const BOTTLENECK_FOLDER = "bottleneck-map";
export const BOTTLENECK_PREFIX = `reports/${BOTTLENECK_FOLDER}/`;

// candidate = 파일명에 티커가 박힌 것 → 밸류에이션 확인까지 통과한 심층연구 후보.
// signal    = 병목 움직임은 있으나 살 만한 대상 없음.
// scan/map/watchlist = 사람이 직접 돌린 전체 스캔과 지속 유지 문서.
export type BottleneckKind = "candidate" | "signal" | "scan" | "map" | "watchlist";

export interface BottleneckSignal {
  path: string;
  name: string;
  kind: BottleneckKind;
  date: string | null; // YYYY-MM-DD (일일 스캔·전체 스캔), 지속 문서는 null
  time: string | null; // HH:MM (일일 스캔만)
  tickers: string[]; // candidate 일 때만 채워진다
  label: string; // 목록에 쓰는 표시 이름
}

// 미국 티커 형태(1~5 대문자 + 선택적 클래스 접미사). 파일명 토큰이 전부 이 형태면 후보로 본다.
const TICKER_RE = /^[A-Z]{1,5}(\.[A-Z])?$/;
const DATE_DIR_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isBottleneckPath(path: string): boolean {
  return path.startsWith(BOTTLENECK_PREFIX);
}

// publish 시 가짜 티커로 잡히는 폴더명 판정(종목 목록에서 제외하는 용도).
export function isBottleneckCompany(company: string | null): boolean {
  return company === BOTTLENECK_FOLDER;
}

export function parseBottleneckPath(path: string): BottleneckSignal | null {
  if (!isBottleneckPath(path) || !path.endsWith(".md")) return null;
  const segs = path.split("/");
  const name = segs[segs.length - 1];

  // ── reports/bottleneck-map/{파일}.md — 지속 문서 또는 트렌드 전체 스캔
  if (segs.length === 3) {
    if (name === "master-map.md") {
      return { path, name, kind: "map", date: null, time: null, tickers: [], label: "병목 전체 맵" };
    }
    if (name === "watchlist.md") {
      return { path, name, kind: "watchlist", date: null, time: null, tickers: [], label: "관찰 목록" };
    }
    const m = name.match(/^(.+)-bottleneck-(\d{4})(\d{2})(\d{2})\.md$/);
    if (m) {
      return {
        path,
        name,
        kind: "scan",
        date: `${m[2]}-${m[3]}-${m[4]}`,
        time: null,
        tickers: [],
        label: `${m[1]} 전체 스캔`,
      };
    }
    // 규약 밖 파일도 버리지 않고 '전체 스캔' 취급 — 목록에서 사라지는 게 더 나쁘다.
    return { path, name, kind: "scan", date: null, time: null, tickers: [], label: name.replace(/\.md$/, "") };
  }

  // ── reports/bottleneck-map/YYYY-MM-DD/{파일}.md — 일일 스캔
  if (segs.length === 4 && DATE_DIR_RE.test(segs[2])) {
    const date = segs[2];
    const m = name.match(/^(\d{2})-(\d{2})-(.+)\.md$/);
    if (!m) {
      // 시각 접두사가 없는 파일 — 신호로만 취급(시각 미상).
      return { path, name, kind: "signal", date, time: null, tickers: [], label: name.replace(/\.md$/, "") };
    }
    const time = `${m[1]}:${m[2]}`;
    const rest = m[3];
    const tokens = rest.split("-");
    const allTickers = tokens.length > 0 && tokens.every((t) => TICKER_RE.test(t));
    if (allTickers) {
      return { path, name, kind: "candidate", date, time, tickers: tokens, label: tokens.join(" · ") };
    }
    return { path, name, kind: "signal", date, time, tickers: [], label: rest };
  }

  return null;
}

// 배지(라벨 + 색). 시맨틱 색은 '데이터 의미'라 컬러 최소화 원칙의 예외(dashboard/AGENTS.md).
export const BOTTLENECK_BADGE: Record<BottleneckKind, { label: string; color: string }> = {
  candidate: { label: "후보 발견", color: "text-emerald-300 bg-emerald-500/15" },
  signal: { label: "신호만", color: "text-mute bg-canvas-soft" },
  scan: { label: "전체 스캔", color: "text-cyan-300 bg-cyan-500/10" },
  map: { label: "병목 맵", color: "text-twilight bg-dusk/20" },
  watchlist: { label: "관찰 목록", color: "text-amber-300 bg-amber-500/10" },
};

export interface BottleneckDateGroup {
  date: string;
  items: BottleneckSignal[];
}

export interface BottleneckIndex {
  pinned: BottleneckSignal[]; // master-map · watchlist (지속 문서)
  groups: BottleneckDateGroup[]; // 날짜별 스캔 — 최신 날짜 우선
  candidateTickers: string[]; // 전체 기간 후보 티커(중복 제거, 알파벳순)
  latestDate: string | null;
}

// 보고서 목록 → 병목 신호 인덱스. 정렬은 여기서 확정한다(뷰는 그리기만).
export function buildBottleneckIndex(paths: string[]): BottleneckIndex {
  const parsed = paths
    .map(parseBottleneckPath)
    .filter((s): s is BottleneckSignal => s !== null);

  const pinned: BottleneckSignal[] = [];
  const byDate = new Map<string, BottleneckSignal[]>();
  const undated: BottleneckSignal[] = [];

  for (const s of parsed) {
    if (s.kind === "map" || s.kind === "watchlist") {
      pinned.push(s);
      continue;
    }
    if (!s.date) {
      undated.push(s);
      continue;
    }
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }

  // 맵 → 관찰목록 순서로 고정.
  pinned.sort((a, b) => (a.kind === "map" ? -1 : b.kind === "map" ? 1 : 0));

  const groups: BottleneckDateGroup[] = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // 최신 날짜 우선
    .map(([date, items]) => ({
      date,
      // 같은 날 안에서는 늦은 시각 우선(그날 마지막 스캔이 위). 시각 미상은 뒤로.
      items: items.sort((a, b) => (b.time ?? "").localeCompare(a.time ?? "")),
    }));

  // 날짜 없는 전체 스캔은 맨 끝의 '날짜 미상' 묶음으로.
  if (undated.length > 0) groups.push({ date: "날짜 미상", items: undated });

  const candidateTickers = Array.from(
    new Set(parsed.filter((s) => s.kind === "candidate").flatMap((s) => s.tickers))
  ).sort();

  const latestDate = groups.find((g) => DATE_DIR_RE.test(g.date))?.date ?? null;

  return { pinned, groups, candidateTickers, latestDate };
}
