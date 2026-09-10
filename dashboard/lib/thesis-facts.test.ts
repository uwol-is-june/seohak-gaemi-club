// 핵심 가정·무효화 파서 테스트 (TASK-105).
// 두 축:
//  1) 대표 표기별 기대값 — 특히 상태 키워드를 **주석 구역에서만** 읽는지
//     ("회계부정·경영진 신뢰 훼손"은 조건 문장이지 훼손 상태가 아니다).
//  2) 실제 원장 전수 — 모든 항목이 label 을 건지는지(빈 칩이 뜨지 않는지).
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/thesis-facts.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseFact, parseFacts, factTally, bySeverity } from "./thesis-facts.ts";

const failures: string[] = [];
function check(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`[${name}] 기대 ${JSON.stringify(want)} ≠ 실제 ${JSON.stringify(got)}`);
  }
}

// ── 1) 표기별 ──────────────────────────────────────────────────────────
{
  const f = parseFact("R2 DC 매출 2분기 연속 QoQ 감소 (미발동, +18% QoQ)");
  check("코드", f.code, "R2");
  check("본문", f.label, "DC 매출 2분기 연속 QoQ 감소");
  check("주석", f.note, "미발동, +18% QoQ");
  check("상태", f.state, "ok");
  check("상태 라벨", f.stateLabel, "미발동");
}
{
  const f = parseFact("가정2 약정 $279B의 상당부분이 취소·리스케줄 가능 (취소불능 비중 미공시 - 훼손)");
  check("가정 코드", f.code, "가정2");
  check("훼손은 bad", f.state, "bad");
}
{
  // 🔴 핵심 케이스 — 조건 문장에 박힌 키워드를 상태로 읽으면 안 된다.
  const f = parseFact("회계부정·경영진 신뢰 훼손");
  check("본문의 훼손: 상태 없음", f.state, "none");
  check("본문의 훼손: 본문 보존", f.label, "회계부정·경영진 신뢰 훼손");
}
{
  const f = parseFact("R6 채무보증 최대 총노출 $50B 초과 계상 (미확인 - 최우선, OpenAI 리스료 $250B 보증 보도)");
  check("미확인", f.state, "unknown");
}
{
  // 측정값이 없는 괄호는 조건 본문의 일부다 — 빼내면 문장이 망가진다.
  const f = parseFact("선단 노드(N3/N2) 점유율 90%+ 유지");
  check("비측정 괄호: 본문 유지", f.label, "선단 노드(N3/N2) 점유율 90%+ 유지");
  check("비측정 괄호: 주석 없음", f.note, null);
}
{
  const f = parseFact("AWS 성장률 ≥20%(실측 +36.7%)");
  check("실측값 분리: 기준", f.label, "AWS 성장률 ≥20%");
  check("실측값 분리: 값", f.note, "실측 +36.7%");
}
{
  const f = parseFact("R4: 순부채/EBITDA 4.0x 초과 / Baa1 강등 — 미발동(경계). 배당성장 9.98%");
  check("em dash 뒤 상태", f.stateLabel, "미발동");
  check("em dash 앞 본문", f.label, "순부채/EBITDA 4.0x 초과 / Baa1 강등");
}
{
  // 한 줄에 세미콜론으로 여러 기준 → 개수대로 센다.
  const list = parseFacts(["A 유지; B 유지; C 유지"]);
  check("세미콜론 분해", list.length, 3);
  check("세미콜론 분해: 두 번째", list[1].label, "B 유지");
}
{
  const list = parseFacts(["X (발동)", "Y (미확인)", "Z (미발동)", "W"]);
  check("집계", factTally(list), { bad: 1, unknown: 1, ok: 1, none: 1, total: 4 });
  check(
    "심각도 정렬",
    [...list].sort(bySeverity).map((f) => f.state),
    ["bad", "unknown", "none", "ok"]
  );
}
check("빈 입력", parseFacts(null).length, 0);

// ── 2) 실제 원장 전수 ──────────────────────────────────────────────────
const ledger = fileURLToPath(new URL("../../data/calls.jsonl", import.meta.url));
let items = 0;
let stated = 0;
try {
  const lines = readFileSync(ledger, "utf8").split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const obj = JSON.parse(line);
    for (const key of ["loadBearing", "invalidation"] as const) {
      for (const f of parseFacts(obj[key])) {
        items += 1;
        if (f.state !== "none") stated += 1;
        // label 이 비면 화면에 빈 칩이 뜬다 — 어떤 표기가 와도 본문은 남아야 한다.
        if (!f.label.trim()) failures.push(`[원장 ${obj.ticker}] 본문 유실: ${JSON.stringify(f.raw)}`);
      }
    }
  }
} catch (e) {
  failures.push(`[원장] 읽기 실패: ${String(e)}`);
}

if (failures.length > 0) {
  console.error(`❌ 가정·무효화 파서 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✅ 가정·무효화 파서 통과 — 원장 ${items}항목, 그중 상태 판정 ${stated}건`);
