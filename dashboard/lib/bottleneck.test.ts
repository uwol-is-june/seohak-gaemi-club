// 병목 신호(/bottleneck-hunter) 경로 파싱 테스트.
// 파일명 규약이 곧 판정이라(티커가 박혀 있으면 = 밸류에이션 확인 통과) 파싱이 틀리면
// "살 만한 후보"와 "신호만"이 뒤바뀐다 — 그 경계를 고정한다.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/bottleneck.test.ts
// (bottleneck.ts 는 import 가 없어 @/ 별칭 해석 없이 바로 돌아간다.)
import {
  buildBottleneckIndex,
  isBottleneckCompany,
  isBottleneckPath,
  parseBottleneckPath,
} from "./bottleneck.ts";

const failures: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) failures.push(`${label}\n      got:  ${g}\n      want: ${w}`);
}

// ─── 경로 판정 ──────────────────────────────────────────────────────────────
eq("경로 판정: 병목 폴더", isBottleneckPath("reports/bottleneck-map/master-map.md"), true);
eq("경로 판정: 종목 폴더는 아님", isBottleneckPath("reports/NVDA/FinalReport.md"), false);
eq("가짜 티커 판정", isBottleneckCompany("bottleneck-map"), true);
eq("가짜 티커 판정: 실제 티커", isBottleneckCompany("NVDA"), false);
eq("가짜 티커 판정: 루트 보고서(null)", isBottleneckCompany(null), false);

// ─── 후보(티커 박힌 파일) vs 신호만 ────────────────────────────────────────
const cand = parseBottleneckPath("reports/bottleneck-map/2026-08-07/09-00-FORM-IPGP.md");
eq("후보: kind", cand?.kind, "candidate");
eq("후보: 날짜", cand?.date, "2026-08-07");
eq("후보: 시각", cand?.time, "09:00");
eq("후보: 티커", cand?.tickers, ["FORM", "IPGP"]);

const single = parseBottleneckPath("reports/bottleneck-map/2026-08-07/09-00-VRT.md");
eq("후보: 단일 티커", single?.tickers, ["VRT"]);

const sig = parseBottleneckPath("reports/bottleneck-map/2026-08-07/14-00-신호스캔.md");
eq("신호만: kind", sig?.kind, "signal");
eq("신호만: 티커 없음", sig?.tickers, []);
eq("신호만: 시각은 유지", sig?.time, "14:00");

// 티커가 아닌 토큰이 하나라도 섞이면 후보로 승격하지 않는다(오탐 차단).
const mixed = parseBottleneckPath("reports/bottleneck-map/2026-08-07/09-00-FORM-검토필요.md");
eq("혼재 토큰: 후보 아님", mixed?.kind, "signal");

// 시각 접두사가 없으면 신호로만 취급(파일을 버리지 않는다).
const noTime = parseBottleneckPath("reports/bottleneck-map/2026-08-07/메모.md");
eq("시각 없음: kind", noTime?.kind, "signal");
eq("시각 없음: time null", noTime?.time, null);

// ─── 지속 문서 · 전체 스캔 ──────────────────────────────────────────────────
eq("지속 문서: 병목 맵", parseBottleneckPath("reports/bottleneck-map/master-map.md")?.kind, "map");
eq("지속 문서: 관찰 목록", parseBottleneckPath("reports/bottleneck-map/watchlist.md")?.kind, "watchlist");

const scan = parseBottleneckPath("reports/bottleneck-map/AI-Infrastructure-bottleneck-20260807.md");
eq("전체 스캔: kind", scan?.kind, "scan");
eq("전체 스캔: 날짜 파싱", scan?.date, "2026-08-07");
eq("전체 스캔: 라벨", scan?.label, "AI-Infrastructure 전체 스캔");

eq("병목 폴더 밖은 null", parseBottleneckPath("reports/NVDA/FinalReport.md"), null);
eq("md 아닌 파일은 null", parseBottleneckPath("reports/bottleneck-map/2026-08-07/09-00-FORM.txt"), null);

// ─── 인덱스 조립(정렬·집계) ─────────────────────────────────────────────────
const index = buildBottleneckIndex([
  "reports/bottleneck-map/watchlist.md",
  "reports/bottleneck-map/master-map.md",
  "reports/bottleneck-map/2026-08-05/09-00-VRT.md",
  "reports/bottleneck-map/2026-08-07/09-00-FORM-IPGP.md",
  "reports/bottleneck-map/2026-08-07/14-00-신호스캔.md",
  "reports/NVDA/FinalReport.md", // 무관한 경로는 무시돼야 한다
]);

eq("인덱스: 지속 문서 2건", index.pinned.length, 2);
eq("인덱스: 맵이 관찰목록보다 앞", index.pinned[0].kind, "map");
eq("인덱스: 날짜 그룹 2개", index.groups.map((g) => g.date), ["2026-08-07", "2026-08-05"]);
eq("인덱스: 같은 날은 늦은 시각 우선", index.groups[0].items.map((i) => i.time), ["14:00", "09:00"]);
eq("인덱스: 최근 날짜", index.latestDate, "2026-08-07");
eq("인덱스: 누적 후보 티커", index.candidateTickers, ["FORM", "IPGP", "VRT"]);

// 빈 입력에서도 터지지 않아야 한다(신호 0건 = 정상 상태).
const empty = buildBottleneckIndex([]);
eq("빈 인덱스: 그룹 0", empty.groups.length, 0);
eq("빈 인덱스: 최근 날짜 null", empty.latestDate, null);

if (failures.length > 0) {
  console.error(`❌ 병목 신호 파싱 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 병목 신호 파싱 테스트 통과");
