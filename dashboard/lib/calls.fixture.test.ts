// 콜 채점 파리티 테스트 — TS 쪽(TASK-60).
// 공유 픽스처(../../data/test/call-scoring-fixtures.json)를 scoreCall 에 넣어 기대값과 대조한다.
// tools/test_score_calls.py 가 같은 픽스처를 Python 으로 검증하므로, 두 구현이 어긋나면
// 둘 중 한쪽 테스트가 깨진다(수기 동기화 drift 방지).
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/calls.fixture.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scoreCall, type RawCall } from "./calls.ts";

const fixturesPath = fileURLToPath(new URL("../../data/test/call-scoring-fixtures.json", import.meta.url));
const data = JSON.parse(readFileSync(fixturesPath, "utf-8")) as {
  cases: { name: string; call: RawCall; priceNow: number | null; today: string; expect: Record<string, unknown> }[];
};

const failures: string[] = [];
for (const c of data.cases) {
  const today = new Date(`${c.today}T00:00:00Z`);
  const result = scoreCall(c.call, c.priceNow, today) as unknown as Record<string, unknown>;
  for (const [key, want] of Object.entries(c.expect)) {
    const got = result[key];
    if (got !== want) {
      failures.push(`[${c.name}] ${key}: 기대 ${JSON.stringify(want)} ≠ 실제 ${JSON.stringify(got)}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`❌ 파리티 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✅ TS 채점 파리티 통과 (${data.cases.length} 케이스)`);
