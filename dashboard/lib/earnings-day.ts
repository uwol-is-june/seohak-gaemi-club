// 실적 발표일의 순수 로직 — Yahoo 응답 파싱(서버 라우트) + D-day 라벨/정렬(클라이언트).
// 양쪽이 같은 EarningsInfo 를 쓰도록 한곳에 뒀다.
// (테스트: node dashboard/lib/earnings-day.test.ts — import 가 없어 별칭 해석 없이 돈다.)

export interface EarningsInfo {
  ticker: string;
  date: string | null; // 다음 예정일 "YYYY-MM-DD", 불명 시 null
  epochMs: number | null; // 같은 값의 epoch(ms) — D-day 계산용
  // Yahoo가 확정일 대신 추정 범위(예: "Feb 1 – Feb 5")로 준 경우 true.
  // 이때 date는 범위의 시작일이다. 확정 임박할수록 단일 확정일로 바뀐다.
  estimate: boolean;
  // 직전(가장 최근) 실적 발표일 — 추정이 아닌 **실제 발표 이력**이다.
  // date가 다음 분기로 넘어간 뒤에도 화면이 "발표 직후 점검 대기"를 띄울 수 있게 한다.
  lastDate: string | null;
  lastEpochMs: number | null;
}

export const emptyEarnings = (ticker: string): EarningsInfo => ({
  ticker,
  date: null,
  epochMs: null,
  estimate: false,
  lastDate: null,
  lastEpochMs: null,
});

function toDay(epochSec: number): string {
  return new Date(epochSec * 1000).toISOString().slice(0, 10);
}

// quoteSummary 두 모듈을 합쳐 EarningsInfo 로.
//  - calendarEvents.earnings.earningsDate: [{raw, fmt}] 배열. 길이 1이면 확정에 가깝고,
//    2면 추정 범위다. → 다음 예정일(date/epochMs)
//  - earnings.earningsChart.quarterly[].reportedDate: 실제 발표 이력. → 직전 발표일(lastDate)
// 어느 한쪽이 없어도 나머지는 살린다(부분 성공이 전무보다 낫다).
export function parseEarnings(ticker: string, json: unknown): EarningsInfo {
  const out = emptyEarnings(ticker);
  const result = (json as { quoteSummary?: { result?: unknown[] } })?.quoteSummary?.result?.[0];
  if (!result) return out;

  try {
    const cal = (
      result as {
        calendarEvents?: {
          earnings?: { earningsDate?: { raw?: number }[]; isEarningsDateEstimate?: boolean };
        };
      }
    ).calendarEvents?.earnings;
    const raws = (Array.isArray(cal?.earningsDate) ? cal!.earningsDate : [])
      .map((d) => d?.raw)
      .filter((n): n is number => typeof n === "number");
    if (raws.length > 0) {
      const first = Math.min(...raws); // 범위면 가장 이른 날
      out.date = toDay(first);
      out.epochMs = first * 1000;
      // Yahoo의 명시적 추정 플래그를 우선 사용하고, 없으면 범위(배열 길이>1)로 추론.
      const est = cal?.isEarningsDateEstimate;
      out.estimate = typeof est === "boolean" ? est : raws.length > 1;
    }
  } catch {
    /* 다음 예정일만 포기 — 아래 직전 발표일은 계속 시도한다 */
  }

  try {
    const quarterly = (
      result as {
        earnings?: { earningsChart?: { quarterly?: { reportedDate?: { raw?: number } }[] } };
      }
    ).earnings?.earningsChart?.quarterly;
    const reported = (Array.isArray(quarterly) ? quarterly : [])
      .map((q) => q?.reportedDate?.raw)
      .filter((n): n is number => typeof n === "number");
    if (reported.length > 0) {
      const last = Math.max(...reported); // 배열은 보통 시간순이지만 순서를 신뢰하지 않는다
      out.lastDate = toDay(last);
      out.lastEpochMs = last * 1000;
    }
  } catch {
    /* 직전 발표일 없이 진행 */
  }

  return out;
}

// 발표 직후 점검 창 — 지난 실적을 며칠까지 D+n으로 남겨 둘지. 점검은 발표 **이후에**
// 하는 것이라, 발표일이 지나는 순간 목록에서 빠지면 정작 쓸 때 사라지는 셈이 된다.
export const REVIEW_WINDOW_DAYS = 7;

export interface DayInfo {
  label: string;
  tone: string; // 색 톤 클래스
  rank: number; // 작을수록 위
  reviewDue: boolean; // 발표 직후 점검 창에 들어와 있는데 아직 점검 안 했는가
  reviewed: boolean; // 그 창 안이지만 이미 실적 보고서를 남겼는가
  shownDate: string | null; // 행에 표시할 날짜
  shownEstimate: boolean; // 그 날짜가 추정치인가
  nextDate: string | null; // 지난 실적을 보여줄 때만 곁들이는 다음 예정일
}

// ── 점검 완료 판정 ───────────────────────────────────────────────────────────
// "점검했다"의 근거는 **직전 발표일 이후에 발행된 그 티커의 실적 보고서**다
// (`/earnings-review`·`/earnings-team` → reports/{티커}/{티커}-earnings-{기간}[-*].md).
// 파일명의 기간 토큰(`2026Q2`)이 아니라 발행 시각으로 보는 이유: 기간 표기가 회계연도
// 기준인지 역년 기준인지 스킬 문서가 고정하지 않아(예: AAPL 6월 분기 = 회계 3Q) 티커마다
// 갈리는 반면, "발표 후에 썼는가"는 어느 표기에서도 같은 뜻이기 때문이다.

export interface EarningsReportInput {
  company: string | null; // 티커 (루트 보고서는 null → 대상 아님)
  name: string; // 파일명
  committedAt?: string | null; // 발행 시각 ISO
}

// 티커(대문자) → 가장 최근 실적 보고서 발행 시각(ms). 발행 시각이 없는 행은 건너뛴다.
export function earningsReviewedAt(files: EarningsReportInput[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of files) {
    // earnings-team 의 거장별 조각(`-earnings-2026Q2-버핏.md`)도 같은 실행의 산출물이라
    // 함께 인정한다 — 조각이 있으면 그 분기 점검은 이미 돌아간 것이다.
    if (!f?.company || !/-earnings-/i.test(f.name ?? "")) continue;
    const t = Date.parse(f.committedAt ?? "");
    if (!Number.isFinite(t)) continue;
    const key = f.company.trim().toUpperCase();
    if (!(key in out) || t > out[key]) out[key] = t;
  }
  return out;
}

// 오늘 자정 기준 날짜 차이(양수=미래, 0=오늘, 음수=과거).
// 프레임이 섞여 있는 건 의도적이다: 발표일은 UTC 캘린더 날짜(route.ts 가 toISOString 으로
// 만든 그 문자열 그대로), "오늘"은 사용자의 로컬 캘린더 날짜다. 화면에 보이는 날짜 문자열과
// D+n 이 같은 값에서 나와야 하고, "오늘"은 보는 사람 기준이어야 하기 때문이다.
// 결과적으로 KST 사용자에겐 자정~09:00 사이에 D+n 이 UTC보다 하루 먼저 넘어간다 — 무해하다.
function dayDelta(epochMs: number, now: Date): number {
  const todayMid = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(epochMs);
  const dMid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((dMid - todayMid) / 86_400_000);
}

// 실적일 → D-day 라벨 + 정렬 순위. 우선순위(rank 작은 순):
//   오늘 발표 → 점검 대기(D+1~7) → 점검 완료(D+1~7) → 다가오는 D-n → 오래된 과거 → 미상
// 점검 대기가 다가오는 실적보다 위인 것은 의도된 것이다 — 이미 나온 실적을 점검하는 일이
// 아직 오지 않은 실적을 기다리는 일보다 먼저 할 수 있는 액션이다. 반대로 점검을 끝낸 건은
// 할 일이 없으므로 대기 아래로 내리되, 창 안에는 남긴다(방금 무엇을 봤는지가 맥락이다).
//
// reviewedAtMs = earningsReviewedAt() 이 준 그 티커의 최신 실적 보고서 발행 시각(없으면 null).
export function earningsDayInfo(
  e: EarningsInfo | undefined,
  now: Date = new Date(),
  reviewedAtMs: number | null = null
): DayInfo {
  const base = {
    reviewDue: false,
    reviewed: false,
    shownDate: e?.date ?? null,
    shownEstimate: Boolean(e?.estimate && e?.date),
    nextDate: null as string | null,
  };
  const nextMs = e?.epochMs ?? null;
  const lastMs = e?.lastEpochMs ?? null;
  if (nextMs == null && lastMs == null) {
    return { ...base, label: "발표일 미상", tone: "text-mute", rank: 3_000_000 };
  }

  const dNext = nextMs != null ? dayDelta(nextMs, now) : null;
  const dLast = lastMs != null ? dayDelta(lastMs, now) : null;

  if (dNext === 0 || dLast === 0) {
    // 오늘 발표. 표시 날짜는 오늘인 쪽을 쓴다(다음 예정일이 비어 있을 수 있다).
    const todayDate = dNext === 0 ? e?.date ?? null : e?.lastDate ?? null;
    return {
      ...base,
      label: "오늘 발표",
      tone: "text-sunset",
      rank: -10_000, // 점검 대기(-1_000대)보다도 위 — 가장 시간에 민감한 항목
      shownDate: todayDate,
      shownEstimate: dNext === 0 ? Boolean(e?.estimate) : false,
    };
  }

  // 지난 발표일 후보 두 개 중 더 최근인 것. Yahoo가 아직 다음 분기로 넘기지 않은 종목은
  // epochMs(예정일) 자체가 과거이므로 lastEpochMs 만 보면 놓친다.
  const pastCandidates: { since: number; date: string | null; estimate: boolean }[] = [];
  if (dNext != null && dNext < 0) {
    pastCandidates.push({ since: -dNext, date: e?.date ?? null, estimate: Boolean(e?.estimate) });
  }
  if (dLast != null && dLast < 0) {
    // reportedDate 는 실제 발표 이력이라 추정이 아니다.
    pastCandidates.push({ since: -dLast, date: e?.lastDate ?? null, estimate: false });
  }
  const past = pastCandidates.sort((a, b) => a.since - b.since)[0];

  if (past && past.since <= REVIEW_WINDOW_DAYS) {
    // 발표일 **당일 이후**에 발행된 실적 보고서면 이 실적을 점검한 것으로 본다.
    // 날짜 단위로 비교하는 건 발표 시각(장 마감 후 UTC)과 집필 시각(KST)의 프레임이
    // 달라서다 — 미국 장 마감 직후 쓴 글이 UTC로는 같은 날일 수도, 하루 뒤일 수도 있다.
    const reviewed = reviewedAtMs != null && dayDelta(reviewedAtMs, now) >= -past.since;
    return {
      label: `D+${past.since}`,
      tone: reviewed ? "text-mute" : "text-sunset",
      rank: (reviewed ? -500 : -1_000) + past.since,
      reviewDue: !reviewed,
      reviewed,
      shownDate: past.date,
      shownEstimate: past.estimate,
      // 지난 실적을 크게 보여주는 대신 다음 예정일을 옆에 남긴다(맥락 손실 방지).
      nextDate: dNext != null && dNext > 0 ? e?.date ?? null : null,
    };
  }

  if (dNext != null && dNext > 0) {
    // 임박(7일 이내)은 sunset-soft로 강조, 그 외는 일반 본문색.
    return {
      ...base,
      label: `D-${dNext}`,
      tone: dNext <= REVIEW_WINDOW_DAYS ? "text-sunset-soft" : "text-body",
      rank: dNext,
    };
  }

  // 점검 창을 지난 과거뿐 — 최근일수록 위로.
  return {
    ...base,
    label: `D+${past!.since}`,
    tone: "text-mute",
    rank: 1_000_000 + past!.since,
    shownDate: past!.date,
    shownEstimate: past!.estimate,
  };
}
