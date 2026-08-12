// 분기 포트폴리오 점검의 "언제 해야 하나"를 계산한다.
//
// 카드에 적힌 "5월 중순" 같은 문자열만으로는 지금이 그때인지 알 수 없다 — 화면을 보는
// 사람이 달력을 따로 봐야 한다. 여기서 오늘 기준으로 각 분기의 기준일과 남은 일수를
// 구해 "지금 할 차례 / D-N / 완료"를 판정한다.
//
// 판정은 세 상태다:
//   due   — 기준일 −DUE_LEAD_DAYS ~ +DUE_GRACE_DAYS 구간. 지금 실행할 차례.
//   done  — 그 구간에 이미 점검 보고서가 갱신됨.
//   upcoming — 아직 멀었음(D-N).

/** 기준일 며칠 전부터 "할 차례"로 볼 것인가. 실적 시즌이 걸쳐 있어 조금 일찍 열어둔다. */
export const DUE_LEAD_DAYS = 7;
/** 기준일이 지난 뒤 며칠까지 "아직 할 차례"로 볼 것인가(그 뒤엔 다음 분기로 넘어간다). */
export const DUE_GRACE_DAYS = 45;

const DAY_MS = 86_400_000;

export type QuarterState = "due" | "done" | "upcoming";

export interface QuarterDue {
  /** 기준일(올해 또는 내년으로 롤오버된 실제 날짜) */
  date: Date;
  /** 오늘로부터 남은 일수(음수면 지났다는 뜻) */
  daysUntil: number;
  state: QuarterState;
}

/** 날짜만 남긴 UTC 자정 기준값 — 시·분 때문에 D-N이 하루씩 흔들리지 않게 한다. */
function atUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * 기준일을 오늘 기준으로 정한다. 이미 유예기간까지 지났으면 내년 같은 날로 넘긴다
 * — 그래야 "지난 분기"가 영원히 D-마이너스로 남지 않는다.
 */
export function quarterDueDate(dueMonth: number, dueDay: number, today: Date): Date {
  const t = atUtcMidnight(today);
  const thisYear = new Date(Date.UTC(t.getUTCFullYear(), dueMonth - 1, dueDay));
  const passed = (t.getTime() - thisYear.getTime()) / DAY_MS;
  if (passed > DUE_GRACE_DAYS) {
    return new Date(Date.UTC(t.getUTCFullYear() + 1, dueMonth - 1, dueDay));
  }
  return thisYear;
}

/**
 * 한 분기의 상태를 판정한다.
 * @param reviewedAt 그 분기 창 안에 갱신된 점검 보고서 시각(없으면 null)
 */
export function quarterDue(
  dueMonth: number,
  dueDay: number,
  today: Date,
  reviewedAt: Date | null
): QuarterDue {
  const date = quarterDueDate(dueMonth, dueDay, today);
  const t = atUtcMidnight(today);
  const daysUntil = Math.round((date.getTime() - t.getTime()) / DAY_MS);
  const inWindow = daysUntil <= DUE_LEAD_DAYS && daysUntil >= -DUE_GRACE_DAYS;

  // 완료 판정: 보고서가 "기준일 − 유예" 이후에 갱신됐으면 이번 차례는 끝난 것으로 본다.
  // (기준일보다 앞서 미리 점검한 경우도 인정하려고 lead 만큼 앞을 열어둔다.)
  if (inWindow && reviewedAt) {
    const from = date.getTime() - DUE_LEAD_DAYS * DAY_MS;
    if (reviewedAt.getTime() >= from) return { date, daysUntil, state: "done" };
  }
  return { date, daysUntil, state: inWindow ? "due" : "upcoming" };
}

/** 카드 배지 문구. due면 "지금", 아니면 D-N / 완료. */
export function quarterBadge(q: QuarterDue): string {
  if (q.state === "done") return "점검 완료";
  if (q.state === "due") return q.daysUntil >= 0 ? "지금 할 차례" : `지금 할 차례 · D+${-q.daysUntil}`;
  return `D-${q.daysUntil}`;
}

/** YYYY-MM-DD */
export function fmtDue(d: Date): string {
  return d.toISOString().slice(0, 10);
}
