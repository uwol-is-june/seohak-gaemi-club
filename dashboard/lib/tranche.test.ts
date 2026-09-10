// 래더 파서 테스트 (TASK-97).
// 두 축으로 본다:
//  1) 대표 표기별 기대값 — 특히 "(MoS 25%)"를 비중으로 읽지 않는지.
//  2) **실제 원장 전수** — data/calls.jsonl 의 모든 tranches 줄이 가격 또는 조건 중
//     하나는 건져지는지. 원장은 append-only 라 새 표기가 들어오면 여기서 먼저 깨진다.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/tranche.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseTranche, parseTranches, pricedTranches, topTranchePrice } from "./tranche.ts";

const failures: string[] = [];
function check(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`[${name}] 기대 ${JSON.stringify(want)} ≠ 실제 ${JSON.stringify(got)}`);
  }
}

// ── 1) 표기별 ──────────────────────────────────────────────────────────
{
  const t = parseTranche("1차 ≤$255");
  check("가격만: seq", t.seq, 1);
  check("가격만: price", t.price, 255);
  check("가격만: weightPct", t.weightPct, null);
  check("가격만: kind", t.kind, "tranche");
}
{
  const t = parseTranche("1차 ≤$371 (15%)");
  check("퍼센트 비중", t.weightPct, 15);
  check("퍼센트 비중: note 없음", t.weightNote, null);
}
{
  const t = parseTranche("1차 ≤$280 (1/3)");
  check("분수 비중", Math.round((t.weightPct ?? 0) * 10) / 10, 33.3);
}
{
  // 🔴 핵심 케이스 — MoS 는 안전마진이지 배분 비중이 아니다.
  const t = parseTranche("2차 ≤$161 (MoS 30%)");
  check("MoS: 비중으로 읽지 않음", t.weightPct, null);
  check("MoS: 원문 보존", t.weightNote, "MoS 30%");
  check("MoS: 가격", t.price, 161);
}
{
  const t = parseTranche("1차 ≤$185 (25%) — AND 계약화 60%+ 공시");
  check("조건부: price", t.price, 185);
  check("조건부: weight", t.weightPct, 25);
  check("조건부: condition", t.condition, "계약화 60%+ 공시");
}
{
  const t = parseTranche("3차 ≤$148 (40%) — 조건 없음");
  check("조건 없음: condition null", t.condition, null);
  check("조건 없음: caveat 없음", t.caveat, null);
}
{
  const t = parseTranche(
    "3차 ≤$163.74 (25%) — 조건 없음. 단 R2(DC 2분기 연속 QoQ 감소)·R3(GM 2분기 연속 68% 미만) 발동한 하락이면 진입 금지"
  );
  check("조건 없음 + 단서: condition null", t.condition, null);
  check("조건 없음 + 단서: caveat 보존", t.caveat?.startsWith("단 R2"), true);
  check("소수점 가격", t.price, 163.74);
}
{
  const t = parseTranche("AND: ADR 프리미엄 4주+ 레인지 하단 1/3");
  check("래더 공통 조건: kind", t.kind, "note");
  check("래더 공통 조건: price 없음", t.price, null);
  check("래더 공통 조건: condition", t.condition, "ADR 프리미엄 4주+ 레인지 하단 1/3");
}
{
  const t = parseTranche("잔여 분할: ≤$200에서 비중 확대");
  check("번호 없는 차수: price", t.price, 200);
  check("번호 없는 차수: label", t.label, "잔여 분할");
  check("번호 없는 차수: kind", t.kind, "tranche");
}
{
  // 파싱이 안 되는 줄도 예외 없이 통과해야 한다(원문 폴백).
  const t = parseTranche("아직 차수 미정");
  check("미상: kind", t.kind, "note");
  check("미상: raw 보존", t.raw, "아직 차수 미정");
}
{
  const list = parseTranches(["3차 ≤$148 (40%)", "1차 ≤$185 (25%)", "2차 ≤$165 (35%)"]);
  check("정렬: 집행 순서", pricedTranches(list).map((t) => t.seq), [1, 2, 3]);
  check("최상단 차수 가격", topTranchePrice(list), 185);
}
check("빈 입력", parseTranches(undefined).length, 0);

// ── 2) 실제 원장 전수 ──────────────────────────────────────────────────
const ledgerPath = fileURLToPath(new URL("../../data/calls.jsonl", import.meta.url));
let ledgerLines = 0;
let checkedRows = 0;
try {
  const raw = readFileSync(ledgerPath, "utf-8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    ledgerLines += 1;
    let obj: { ticker?: string; target?: { tranches?: string[] } };
    try {
      obj = JSON.parse(t);
    } catch {
      continue; // 깨진 줄은 라우트도 건너뛴다
    }
    const rows = obj.target?.tranches;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      checkedRows += 1;
      const p = parseTranche(row);
      // 가격도 조건도 못 건지면 화면에 그릴 것이 아무것도 없다는 뜻 = 표기 변화 신호.
      if (p.price == null && p.condition == null) {
        failures.push(`[원장 ${obj.ticker}] 파싱 소득 없음: ${JSON.stringify(row)}`);
      }
    }
  }
} catch (e) {
  failures.push(`[원장] 읽기 실패: ${String(e)}`);
}

if (failures.length > 0) {
  console.error(`❌ 래더 파서 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✅ 래더 파서 통과 — 원장 ${ledgerLines}줄 중 차수 ${checkedRows}행 파싱`);
