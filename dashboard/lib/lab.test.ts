// 실험실 채점 테스트 (TASK-186). 규칙 원본: docs/LAB-SPEC.md 4절.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/lab.test.ts
import type { ClosePoint } from "./calls.ts";
import {
  closeOnOrBefore,
  cumulativeSeries,
  expectedRunDate,
  extractCautions,
  labHealth,
  gaugeLevel,
  groupStats,
  horizonEnd,
  parseLabRows,
  scoreLabCall,
  type LabCall,
} from "./lab.ts";

const failures: string[] = [];
function check(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`[${name}] 기대 ${JSON.stringify(want)} ≠ 실제 ${JSON.stringify(got)}`);
  }
}
const near = (x: number | null, y: number) => x != null && Math.abs(x - y) < 1e-9;

function call(over: Partial<LabCall> = {}): LabCall {
  return {
    id: "LAB-20261005-AAA-pick", kind: "call", skill: "lab-pick", ruleVersion: "v1",
    date: "2026-10-05", ticker: "AAA", rank: 1, priceAtCall: 100, target: 130, stopLoss: 85,
    horizonMonths: 12, upsidePct: 30,
    score: { quality: 70, value: 80, total: 75, qualityGauge: 4, valueGauge: 5 },
    ...over,
  };
}
const series = (pts: [string, number][]): ClosePoint[] => pts.map(([date, close]) => ({ date, close }));
const SPY = series([["2026-10-02", 500], ["2026-10-05", 500], ["2026-11-02", 510], ["2026-12-01", 520], ["2027-10-05", 550]]);

// ── 사건별 확정 ────────────────────────────────────────────────────────
{
  const hit = scoreLabCall(call(), series([["2026-10-05", 100], ["2026-11-02", 131], ["2026-12-01", 90]]), SPY, [], "2026-12-15");
  check("목표 도달", [hit.status, hit.exitDate, hit.lastPrice], ["목표 도달", "2026-11-02", 131]);
  check("목표 도달 SPY는 청산일까지", near(hit.spyReturnPct, 2), true);
  check("초과수익", near(hit.excessPct, 29), true);

  const stop = scoreLabCall(call(), series([["2026-11-02", 84], ["2026-12-01", 140]]), SPY, [], "2026-12-15");
  check("철회선 먼저", [stop.status, stop.exitDate], ["철회(−15%)", "2026-11-02"]);

  const drop = scoreLabCall(
    call(),
    series([["2026-10-06", 101], ["2026-10-12", 103], ["2026-10-13", 125]]),
    SPY,
    [{ runDate: "2026-10-12", candidates: ["BBB"] }],
    "2026-10-20"
  );
  check("후보 이탈은 그 실행일 종가로", [drop.status, drop.exitDate, drop.lastPrice], ["철회(후보 이탈)", "2026-10-12", 103]);

  const stays = scoreLabCall(call(), series([["2026-10-12", 103]]), SPY, [{ runDate: "2026-10-12", candidates: ["AAA"] }], "2026-10-20");
  check("후보 유지면 진행중", [stays.status, stays.exitDate, stays.lastPrice], ["진행중", null, 103]);

  const expiry = scoreLabCall(call(), series([["2026-11-02", 110], ["2027-10-04", 115], ["2027-10-08", 140]]), SPY, [], "2027-11-01");
  check("만기 = 만기일 종가", [expiry.status, expiry.exitDate, expiry.lastPrice], ["만기", "2027-10-05", 115]);

  const noData = scoreLabCall(call(), null, null, [], "2026-10-20");
  check("시세 없음", [noData.status, noData.returnPct, noData.excessPct], ["진행중", null, null]);
}

// ── 보조 함수 ──────────────────────────────────────────────────────────
check("호라이즌 12개월", horizonEnd("2026-10-05", 12), "2027-10-05");
check("휴장일은 직전 종가", closeOnOrBefore(SPY, "2026-10-04"), 500);
check("시계열 이전은 null", closeOnOrBefore(SPY, "2026-01-01"), null);
check("게이지", [0, 19.9, 20, 59, 80, 100, null].map(gaugeLevel), [1, 1, 2, 3, 5, 5, 0]);
check(
  "깨진 줄 무시",
  parseLabRows('{"id":"a","kind":"call"}\n{깨짐\n\n{"id":"b","kind":"none"}').map((r) => r.id),
  ["a", "b"]
);

// ── 집계 · 누적선 ──────────────────────────────────────────────────────
{
  const closes = new Map<string, ClosePoint[] | null>([
    ["AAA", series([["2026-10-05", 100], ["2026-11-02", 110], ["2026-12-01", 120]])],
    ["BBB", series([["2026-10-05", 50], ["2026-11-02", 45], ["2026-12-01", 40]])],
  ]);
  const a = scoreLabCall(call(), closes.get("AAA") ?? null, SPY, [], "2026-12-01");
  const b = scoreLabCall(call({ id: "c", ticker: "BBB", skill: "lab-control", priceAtCall: 50, target: 65, stopLoss: 42.5 }),
    closes.get("BBB") ?? null, SPY, [], "2026-12-01");
  const s = groupStats([a]);
  check("집계 n·진행중", [s.n, s.resolved], [1, 0]);
  check("집계 평균 수익", near(s.avgReturnPct, 20), true);
  check("SPY 이긴 비율", s.beatSpyPct, 100);
  check("대조군 철회선(40 ≤ 42.5)", b.status, "철회(−15%)");

  const cum = cumulativeSeries([a], [b], closes, SPY, "2026-12-01");
  check("누적선 날짜", cum.map((p) => p.date), ["2026-10-05", "2026-11-02", "2026-12-01"]);
  check("누적선 실험실", cum.map((p) => Math.round(p.lab ?? NaN)), [0, 10, 20]);
  check("누적선 대조군은 청산값 고정", cum.map((p) => Math.round(p.control ?? NaN)), [0, -10, -20]);
  check("누적선 SPY(같은 날 샀다면)", cum.map((p) => Math.round(p.spy ?? NaN)), [0, 2, 4]);
  check("픽 없으면 빈 선", cumulativeSeries([], [b], closes, SPY, "2026-12-01"), []);
}

// ── 보고서 "이건 조심" 추출 ─────────────────────────────────────────────
{
  const md = [
    "# 제목",
    "## 이건 조심 (반대 근거)",
    "",
    "- **중국 급감**: Q2 −28% — [Investing.com 🟡](https://x.com/a) · [Simply Wall St 🟡](https://y.st/b)",
    "- **추세가 경계선 근처**: 경계와 2%p 차이",
    "  - 들여쓴 하위 항목은 무시",
    "- 세 번째",
    "- 네 번째는 max 로 잘림",
    "## 데이터 출처",
    "- 여기는 다른 절",
  ].join("\r\n");
  check("조심 추출", extractCautions(md), [
    "중국 급감: Q2 −28%",
    "추세가 경계선 근처: 경계와 2%p 차이",
    "세 번째",
  ]);
  check("절 없음", extractCautions("# 제목\n- 항목"), []);
}

// ── 자동 실행 상태 ─────────────────────────────────────────────────────
{
  // 2026-10-05 는 월요일
  check("금요일 → 그 주 월요일", expectedRunDate(new Date(2026, 9, 9, 15)), "2026-10-05");
  check("월요일 10시 전 → 지난주", expectedRunDate(new Date(2026, 9, 5, 9, 59)), "2026-09-28");
  check("월요일 10시 이후 → 오늘", expectedRunDate(new Date(2026, 9, 5, 10, 0)), "2026-10-05");
  check("일요일 → 그 주 월요일", expectedRunDate(new Date(2026, 9, 11, 23)), "2026-10-05");

  const fri = new Date(2026, 9, 9, 15);
  check("정상", labHealth(fri, "2026-10-05", new Set(["2026-10-05"]), null), []);
  check("이번 주 스크리닝 없음", labHealth(fri, "2026-10-02", new Set(["2026-10-02"]), null).map((i) => i.kind), ["no-screen"]);
  check("기록 없음", labHealth(fri, "2026-10-05", new Set(["2026-10-02"]), null).map((i) => i.kind), ["no-record"]);
  check("스크리닝 0건", labHealth(fri, null, new Set(), null).map((i) => i.kind), ["no-screen"]);
  const logErr = labHealth(fri, "2026-10-05", new Set(["2026-10-05"]), {
    file: "2026-10-05_0830.log",
    text: "[08:30:01] 시작\r\n[08:31:10] ERROR: Claude 실행 실패 (exit: 1)\r\n[08:31:11] 종료",
  });
  check("로그 ERROR", logErr, [{ kind: "log-error", file: "2026-10-05_0830.log", line: "[08:31:10] ERROR: Claude 실행 실패 (exit: 1)" }]);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("✅ lab 채점 테스트 통과");
