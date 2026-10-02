// 논제 건강도 해석 테스트 — 숫자 필드 우선 · 자유 텍스트 폴백 · 낡은 값의 날짜 병기.
//
// 이 테스트가 막는 회귀는 실제로 두 번 일어났다:
//   ① 2026-09-23 일괄 재검토 콜 7건이 conviction 에 별점만 적어 10종목 중 8종목이 빈칸이 됐다
//      (정본 reports/track-record.md 에는 값이 다 있었다).
//   ② groupHealth 호출부가 `active.length > 0 ? active : history` 라서 history 가 조회된 적이
//      없었다 — active 는 비지 않기 때문이다(채점이 끝나도 최신 1건을 남긴다).
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/components/track-record/health.test.ts
import { callHealth, groupHealth, groupHealthDated, healthNotApplicable, parseHealth } from "./meta.ts";

const failures: string[] = [];
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) failures.push(`[${name}] 기대 ${w} ≠ 실제 ${g}`);
}

// ── 자유 텍스트 폴백 — 원장에 실제로 섞여 있던 표기들 ──────────────────
eq("별점만", parseHealth("★★★☆☆"), null);
eq("괄호 안", parseHealth("★★★☆☆ (논제 건강도 5/10)"), 5);
eq("하락 표기", parseHealth("건강도 3/10 (7/10에서 하락)"), 3);
eq("접두 '논제'", parseHealth("논제 건강도 7/10 (데이터 신뢰도 높음)"), 7);
eq("소수", parseHealth("건강도 6.5/10"), 6.5);
eq("빈 문자열", parseHealth(""), null);
eq("범위 초과", parseHealth("건강도 12/10"), null);

// ── 숫자 필드가 텍스트를 이긴다 ────────────────────────────────────────
eq("숫자 필드 우선", callHealth({ health: 6, conviction: "건강도 9/10" }), 6);
eq("숫자 0 도 값이다", callHealth({ health: 0, conviction: "★★★☆☆" }), 0);
eq("숫자 없으면 폴백", callHealth({ conviction: "건강도 4/10" }), 4);
eq("둘 다 없음", callHealth({ conviction: "★★★★☆" }), null);
eq("범위 밖 숫자는 폴백", callHealth({ health: 99, conviction: "건강도 4/10" }), 4);

// ── 종목 단위 — 살아있는 논제를 전부 훑는다 ────────────────────────────
eq(
  "active 중 뒤쪽 콜에 있어도 찾는다",
  groupHealth([{ conviction: "★★★☆☆" }, { health: 5 }]),
  5,
);

// ── 낡은 값: active 에 없으면 history 에서 찾고 날짜를 단다 ─────────────
const active = [{ conviction: "★★☆☆☆", date: "2026-09-23" }]; // 2026-09-23 CEG 재검토 콜의 모양
const history = [
  { conviction: "★★★☆☆ (논제 건강도 5/10)", date: "2026-08-12" },
  { conviction: "★★★☆☆", date: "2026-07-31" },
];
eq("history 폴백 + 날짜", groupHealthDated(active, history), {
  value: 5,
  date: "2026-08-12",
  stale: true,
});
eq("최신 콜에 있으면 날짜 없음", groupHealthDated([{ health: 8, date: "2026-09-23" }], history), {
  value: 8,
  date: null,
  stale: false,
});
eq("어디에도 없으면 null", groupHealthDated([{ conviction: "★★★★☆", date: "2026-09-23" }], []), null);

// ── TASK-147: 다른 스킬의 옛 active 값이 history 의 더 최근 값을 가리면 안 된다 ──
// active = [09-23 thesis-tracker(값 없음), 07-31 investment-team(4/10)] · history = [08-12 (6/10)]
eq(
  "날짜순 병합 — 더 최근 history 값이 이긴다",
  groupHealthDated(
    [
      { conviction: "★★☆☆☆", date: "2026-09-23" },
      { health: 4, date: "2026-07-31" },
    ],
    [{ health: 6, date: "2026-08-12" }],
  ),
  { value: 6, date: "2026-08-12", stale: true },
);
eq(
  "옛 active 값만 있으면 stale + 날짜(오늘 값처럼 보이면 안 된다)",
  groupHealthDated(
    [
      { conviction: "★★☆☆☆", date: "2026-09-23" },
      { health: 4, date: "2026-07-31" },
    ],
    [],
  ),
  { value: 4, date: "2026-07-31", stale: true },
);
eq(
  "같은 날이면 기록 시각이 최신인 콜",
  groupHealthDated(
    [
      { health: 3, date: "2026-09-30", recordedAt: "2026-09-30T01:00:00Z" },
      { health: 7, date: "2026-09-30", recordedAt: "2026-09-30T05:00:00Z" },
    ],
    [],
  ),
  { value: 7, date: null, stale: false },
);

// ── avoid 는 '해당 없음' — 관망 시절 옛 값으로 폴백하지 않는다(TECK 2026-09-23) ──
const teck = [
  { call: "avoid", date: "2026-09-30" },
  { call: "avoid", date: "2026-09-23" },
  { call: "hold", health: 4, date: "2026-08-04" },
];
eq("avoid 최신 → 해당 없음", healthNotApplicable(teck, []), true);
eq("avoid 라도 값을 적었으면 표시", healthNotApplicable([{ call: "avoid", health: 2, date: "2026-09-30" }], []), false);
eq("hold 최신 → 해당 아님", healthNotApplicable([{ call: "hold", date: "2026-09-30" }, ...teck], []), false);

if (failures.length > 0) {
  console.error(`❌ 건강도 해석 실패 (${failures.length}건):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✅ 건강도 해석 통과");
