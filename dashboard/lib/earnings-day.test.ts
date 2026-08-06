// 실적 D-day 라벨/정렬 테스트. 핵심 회귀: 발표가 끝난 종목이 목록에서 사라지지 않고
// REVIEW_WINDOW_DAYS 동안 D+n "점검 대기"로 맨 위에 남는지.
//
// 실행(Node 24+ 타입 스트리핑):  node dashboard/lib/earnings-day.test.ts
import {
  earningsDayInfo,
  earningsReviewedAt,
  REVIEW_WINDOW_DAYS,
  type EarningsInfo,
} from "./earnings-day.ts";

const failures: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) failures.push(`[${label}] 기대 ${w} ≠ 실제 ${g}`);
}

// "오늘"은 로컬 캘린더 날짜로 판정되므로(earnings-day.ts dayDelta 주석) 로컬 정오로 고정한다
// — 어느 시간대에서 돌려도 로컬 2026-08-06 이라 테스트가 CI 시간대에 흔들리지 않는다.
const NOW = new Date(2026, 7, 6, 12, 0, 0);
const ms = (day: string) => Date.parse(`${day}T20:30:00Z`); // 미국 장 마감 후 발표 가정

function info(p: Partial<EarningsInfo>): EarningsInfo {
  return {
    ticker: "T",
    date: null,
    epochMs: null,
    estimate: false,
    lastDate: null,
    lastEpochMs: null,
    ...p,
  };
}
// 다음 예정일 + 직전 발표일을 함께 주는 실제 API 응답 형태.
const both = (next: string | null, last: string | null, estimate = false) =>
  info({
    date: next,
    epochMs: next ? ms(next) : null,
    estimate,
    lastDate: last,
    lastEpochMs: last ? ms(last) : null,
  });

// ── 1. 실측 회귀(2026-08-06 Yahoo 응답): 발표 직후 종목이 D+로 남는다 ──────────
// AAPL 은 07-30 발표 직후 calendarEvents 가 10-29로 넘어갔다. 예전 로직은 D-84 로만
// 보여 "방금 끝난 실적"이 사라졌다. 이제 D+7 점검 대기가 떠야 한다.
const aapl = earningsDayInfo(both("2026-10-29", "2026-07-30", true), NOW);
eq("AAPL 라벨", aapl.label, "D+7");
eq("AAPL 점검대기", aapl.reviewDue, true);
eq("AAPL 표시날짜=지난 발표일", aapl.shownDate, "2026-07-30");
eq("AAPL 지난 발표일은 추정 아님", aapl.shownEstimate, false);
eq("AAPL 다음 예정일 병기", aapl.nextDate, "2026-10-29");

const pltr = earningsDayInfo(both("2026-11-02", "2026-08-03", true), NOW);
eq("PLTR 라벨", pltr.label, "D+3");
eq("PLTR 점검대기", pltr.reviewDue, true);

// GOOGL: 07-22 발표 → 15일 지나 창 밖. 다가오는 D-83 으로 되돌아간다.
const googl = earningsDayInfo(both("2026-10-28", "2026-07-22"), NOW);
eq("GOOGL 라벨", googl.label, "D-83");
eq("GOOGL 점검대기 아님", googl.reviewDue, false);
eq("GOOGL 표시날짜=다음 예정일", googl.shownDate, "2026-10-28");

// NVDA: 다가오는 실적(D-20), 직전은 한참 전(05-20).
eq("NVDA 라벨", earningsDayInfo(both("2026-08-26", "2026-05-20"), NOW).label, "D-20");

// CEG: 오늘 발표. lastDate 는 Yahoo 가 아직 안 갱신해 05-11로 낡았다 — 무시돼야 한다.
const ceg = earningsDayInfo(both("2026-08-06", "2026-05-11"), NOW);
eq("CEG 라벨", ceg.label, "오늘 발표");
eq("CEG 표시날짜", ceg.shownDate, "2026-08-06");

// ── 2. 경계값 ────────────────────────────────────────────────────────────────
eq("D+1(어제 발표)", earningsDayInfo(both("2026-11-01", "2026-08-05"), NOW).label, "D+1");
eq(
  `D+${REVIEW_WINDOW_DAYS}(창 마지막날)`,
  earningsDayInfo(both("2026-11-01", "2026-07-30"), NOW).reviewDue,
  true
);
eq(
  `D+${REVIEW_WINDOW_DAYS + 1}(창 하루 밖)`,
  earningsDayInfo(both("2026-11-01", "2026-07-29"), NOW).reviewDue,
  false
);

// Yahoo 가 다음 분기로 넘기지 않아 epochMs 자체가 과거인 경우 — lastEpochMs 없이도 D+ 로 잡는다.
const stale = earningsDayInfo(both("2026-08-04", null), NOW);
eq("예정일이 과거(넘김 지연) 라벨", stale.label, "D+2");
eq("예정일이 과거(넘김 지연) 점검대기", stale.reviewDue, true);
eq("예정일이 과거면 병기할 다음 예정일 없음", stale.nextDate, null);

// 직전 발표일만 아는 경우(다음 예정일 미상)도 점검 대기로 잡힌다.
const onlyLast = earningsDayInfo(info({ lastDate: "2026-08-04", lastEpochMs: ms("2026-08-04") }), NOW);
eq("직전 발표일만 있을 때 라벨", onlyLast.label, "D+2");
eq("직전 발표일만 있을 때 표시날짜", onlyLast.shownDate, "2026-08-04");

// 창을 벗어난 과거만 있는 경우 → 목록 하단, 회색.
const oldOnly = earningsDayInfo(info({ lastDate: "2026-05-05", lastEpochMs: ms("2026-05-05") }), NOW);
eq("오래된 과거만 라벨", oldOnly.label, "D+93");
eq("오래된 과거만 톤", oldOnly.tone, "text-mute");
eq("오래된 과거는 하단", oldOnly.rank > 1_000, true);

// 데이터 없음.
eq("정보 없음", earningsDayInfo(undefined, NOW).label, "발표일 미상");
eq("빈 정보", earningsDayInfo(info({}), NOW).label, "발표일 미상");

// ── 3. 정렬 순서 ────────────────────────────────────────────────────────────
// 오늘 발표 → 점검 대기(최근 우선) → 다가오는(임박 우선) → 오래된 과거 → 미상
const cases: { name: string; e: EarningsInfo | undefined }[] = [
  { name: "미상", e: undefined },
  { name: "D-83", e: both("2026-10-28", "2026-07-22") },
  { name: "D+7", e: both("2026-10-29", "2026-07-30") },
  { name: "오래된과거", e: info({ lastDate: "2026-05-05", lastEpochMs: ms("2026-05-05") }) },
  { name: "D-20", e: both("2026-08-26", "2026-05-20") },
  { name: "오늘", e: both("2026-08-06", "2026-05-11") },
  { name: "D+1", e: both("2026-11-01", "2026-08-05") },
  { name: "D-3", e: both("2026-08-09", "2026-05-01") },
];
const sorted = cases
  .map((c) => ({ name: c.name, rank: earningsDayInfo(c.e, NOW).rank }))
  .sort((a, b) => a.rank - b.rank)
  .map((c) => c.name);
eq("정렬 순서", sorted, [
  "오늘",
  "D+1",
  "D+7",
  "D-3",
  "D-20",
  "D-83",
  "오래된과거",
  "미상",
]);

// ── 4. 점검 완료 판정 ───────────────────────────────────────────────────────
// 실측 회귀(2026-08-06): AMZN 은 07-30 발표 후 AMZN-earnings-2026Q2.md 를 이미 썼는데도
// D+7 "점검 대기"로 떴다 — reviewDue 가 날짜만 보고 산출물 존재를 안 봤기 때문.
const amzn = both("2026-10-29", "2026-07-30", true);
const afterReview = earningsDayInfo(amzn, NOW, Date.parse("2026-07-31T09:00:00Z"));
eq("점검 후 라벨은 그대로 D+7", afterReview.label, "D+7");
eq("점검 후 대기 해제", afterReview.reviewDue, false);
eq("점검 후 완료 표시", afterReview.reviewed, true);
eq("점검 후 톤은 회색", afterReview.tone, "text-mute");

// 발표 **당일** 발행(미 장마감 직후 = UTC 같은 날)도 점검으로 인정한다.
eq(
  "발표 당일 발행도 점검",
  earningsDayInfo(amzn, NOW, Date.parse("2026-07-30T23:00:00Z")).reviewed,
  true
);
// 직전 분기 보고서(발표 전 발행)는 이번 실적 점검이 아니다.
const staleReview = earningsDayInfo(amzn, NOW, Date.parse("2026-04-30T09:00:00Z"));
eq("지난 분기 보고서는 점검 아님", staleReview.reviewed, false);
eq("지난 분기 보고서면 대기 유지", staleReview.reviewDue, true);
// 보고서를 못 받았을 때(null)는 종전대로 대기.
eq("발행시각 미상이면 대기", earningsDayInfo(amzn, NOW, null).reviewDue, true);

// 정렬: 점검 완료는 대기 아래, 다가오는 실적 위.
const doneRank = afterReview.rank;
eq("완료는 대기보다 아래", doneRank > earningsDayInfo(amzn, NOW).rank, true);
eq("완료는 다가오는 실적보다 위", doneRank < earningsDayInfo(both("2026-08-09", null), NOW).rank, true);

// 점검 창 밖(D-)에는 완료 배지가 붙지 않는다 — 볼 것도 없는데 배지만 남으면 소음이다.
eq(
  "창 밖은 완료 표시 없음",
  earningsDayInfo(both("2026-10-28", "2026-07-22"), NOW, Date.parse("2026-07-23T09:00:00Z")).reviewed,
  false
);

// earningsReviewedAt: 실적 보고서만, 티커별 최신 1건.
const reviewed = earningsReviewedAt([
  { company: "AMZN", name: "AMZN-earnings-2026Q2.md", committedAt: "2026-07-31T09:00:00Z" },
  { company: "AMZN", name: "AMZN-earnings-2026Q2-버핏.md", committedAt: "2026-08-01T09:00:00Z" },
  { company: "AMZN", name: "AMZN-checklist-20260727.md", committedAt: "2026-08-05T09:00:00Z" },
  { company: "amzn", name: "AMZN-earnings-2026Q1.md", committedAt: "2026-04-30T09:00:00Z" },
  { company: "MSFT", name: "MSFT-earnings-2026Q2.md", committedAt: null },
  { company: null, name: "Defense-funnel-20260730.md", committedAt: "2026-08-02T09:00:00Z" },
]);
eq("실적 보고서 최신 시각", reviewed.AMZN, Date.parse("2026-08-01T09:00:00Z"));
eq("체크리스트는 점검 근거 아님", reviewed.AMZN !== Date.parse("2026-08-05T09:00:00Z"), true);
eq("발행시각 없으면 제외", "MSFT" in reviewed, false);
eq("루트 보고서 제외", Object.keys(reviewed).sort(), ["AMZN"]);

// ── 5. 같은 날 안에서는 시각에 흔들리지 않는다 ──────────────────────────────
// (로컬 날짜가 넘어가면 D+n 도 하루 넘어가는 게 맞다 — 그건 버그가 아니다)
for (const h of [0, 9, 12, 23]) {
  const at = new Date(2026, 7, 6, h, 30, 0);
  eq(`시각 무관 D+7 (로컬 ${h}시)`, earningsDayInfo(both("2026-10-29", "2026-07-30"), at).label, "D+7");
}

if (failures.length > 0) {
  console.error(`실패 ${failures.length}건`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("earnings-day: 통과");
