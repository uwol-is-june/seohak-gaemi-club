// 콜 채점 파리티 테스트 — TS 쪽(TASK-60).
// 공유 픽스처(../../data/test/call-scoring-fixtures.json)를 scoreCall 에 넣어 기대값과 대조한다.
// tools/test_score_calls.py 가 같은 픽스처를 Python 으로 검증하므로, 두 구현이 어긋나면
// 둘 중 한쪽 테스트가 깨진다(수기 동기화 drift 방지).
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/calls.fixture.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dedupeCalls, scoreCall, type RawCall } from "./calls.ts";

const fixturesPath = fileURLToPath(new URL("../../data/test/call-scoring-fixtures.json", import.meta.url));
const data = JSON.parse(readFileSync(fixturesPath, "utf-8")) as {
  cases: {
    name: string;
    call: RawCall;
    priceNow: number | null;
    today: string;
    /** [YYYY-MM-DD, 종가] 오름차순 — hold 터치·호라이즌 동결 입력(TASK-141). */
    path?: [string, number][];
    expect: Record<string, unknown>;
  }[];
  dedupeCases?: { name: string; calls: RawCall[]; expect: [string, string, number][] }[];
};

const failures: string[] = [];
for (const c of data.cases) {
  const today = new Date(`${c.today}T00:00:00Z`);
  const path = c.path?.map(([date, close]) => ({ date, close })) ?? null;
  const result = scoreCall(c.call, c.priceNow, today, path) as unknown as Record<string, unknown>;
  for (const [key, want] of Object.entries(c.expect)) {
    const got = result[key];
    if (got !== want) {
      failures.push(`[${c.name}] ${key}: 기대 ${JSON.stringify(want)} ≠ 실제 ${JSON.stringify(got)}`);
    }
  }
}

// 중복 접기 파리티(TASK-139) — 키는 id + call. 같은 날 hold 뒤 buy 를 내도 hold 가 남는다.
const sortRows = (rows: [string, string, number][]) => rows.map((r) => JSON.stringify(r)).sort();
for (const c of data.dedupeCases ?? []) {
  const kept = sortRows(dedupeCalls(c.calls).map((r) => [r.id, r.call, r.priceAtCall] as [string, string, number]));
  const want = sortRows(c.expect);
  if (JSON.stringify(kept) !== JSON.stringify(want)) {
    failures.push(`[dedupe: ${c.name}] 기대 ${want.join(",")} ≠ 실제 ${kept.join(",")}`);
  }
}

// 원장 전수 — 같은 id 에 서로 다른 call 이 있으면 안 된다. record_call.py 는 그런 경우
// id 뒤에 `-{call}` 을 붙여 기록하므로, 여기 걸리면 손으로 고친 줄이다(React key 충돌).
const ledgerPath = fileURLToPath(new URL("../../data/calls.jsonl", import.meta.url));
const callsById = new Map<string, Set<string>>();
for (const line of readFileSync(ledgerPath, "utf-8").split("\n")) {
  if (!line.trim()) continue;
  try {
    const r = JSON.parse(line) as RawCall;
    if (!callsById.has(r.id)) callsById.set(r.id, new Set());
    callsById.get(r.id)!.add(r.call);
  } catch {
    /* 깨진 줄은 loadCalls 가 따로 경고한다 */
  }
}
for (const [id, kinds] of callsById) {
  if (kinds.size > 1) failures.push(`[원장] id ${id} 에 call 종류가 여러 개: ${[...kinds].join(",")}`);
}

if (failures.length > 0) {
  console.error(`❌ 파리티 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✅ TS 채점 파리티 통과 (${data.cases.length} 케이스 + 중복 접기 ${data.dedupeCases?.length ?? 0})`);
