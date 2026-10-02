// 실험실 채점 (TASK-186) — 순수 함수. 규칙 원본은 docs/LAB-SPEC.md 4절.
//
// 실험실 콜은 data/lab-calls.jsonl 에 따로 산다(기존 판단 기록부와 분리 — tools/lab_record.py).
// 채점 규칙도 기존 scoreCall 과 다르다: buy 하나뿐이고, 결과는 먼저 일어난 사건 하나로 확정된다.
//   ① 종가 ≥ 목표가   → 목표 도달
//   ② 종가 ≤ 철회선   → 철회(−15%)
//   ③ 다음 주 스크리닝 후보에서 빠짐 → 철회(후보 이탈) — 그 실행일 종가로 청산
//   ④ 12개월 경과      → 만기 — 만기일 종가로 청산
// 아무 것도 안 일어났으면 진행중(최신 종가). 성과는 SPY 대비 초과수익으로 본다 —
// "안 샀으면 그 돈이 있었을 곳"이 시장이기 때문이다(calls.ts 의 기회비용 채점과 같은 축).

import type { ClosePoint } from "./calls";

// 실험실 검증 보고서 폴더(reports/lab/lab-pick-YYYYMMDD.md). 티커 폴더가 아니다 —
// companyFromPath 가 2번째 세그먼트를 티커로 읽어 'lab' 이 가짜 종목으로 잡히므로
// 종목 축 화면에서 걸러낸다(bottleneck-map 과 같은 처리).
export const LAB_REPORT_FOLDER = "lab";

export type LabSkill = "lab-pick" | "lab-control";

export interface LabCall {
  id: string;
  kind: "call";
  skill: LabSkill;
  ruleVersion: string;
  date: string;
  ticker: string;
  name?: string;
  sector?: string;
  rank: number;
  priceAtCall: number;
  target: number;
  stopLoss: number;
  horizonMonths: number;
  upsidePct: number;
  score: { quality: number; value: number; total: number; qualityGauge: number; valueGauge: number };
  flags?: { spinoffSuspect?: boolean; imputed?: string[] };
  rejected?: { ticker: string; reason: string; evidence: string }[];
  report?: string;
  screen?: string;
  recordedAt?: string;
}

export interface LabNone {
  id: string;
  kind: "none";
  skill: "lab-none";
  date: string;
  candidates: number;
  nearMiss?: string;
  rejected?: { ticker: string; reason: string; evidence: string }[];
  report?: string;
}

export interface LabRepeat {
  id: string;
  kind: "repeat";
  skill: LabSkill;
  date: string;
  ticker: string;
  ref: string;
  rejected?: { ticker: string; reason: string; evidence: string }[];
  report?: string;
}

export interface LabDecision {
  id: string;
  kind: "decision";
  ref: string;
  decision: "accepted" | "declined";
  date: string;
}

export type LabRow = LabCall | LabNone | LabRepeat | LabDecision;

export type LabStatus = "진행중" | "목표 도달" | "철회(−15%)" | "철회(후보 이탈)" | "만기";

export interface ScoredLabCall extends LabCall {
  status: LabStatus;
  /** 청산일(확정된 경우) — 진행중이면 null */
  exitDate: string | null;
  /** 청산가 또는 최신 종가 */
  lastPrice: number | null;
  returnPct: number | null;
  spyReturnPct: number | null;
  excessPct: number | null;
  decision: "accepted" | "declined" | null;
}

export interface ScreenMark {
  runDate: string;
  candidates: string[];
}

const DAYS_PER_MONTH = 30.44;

export function parseLabRows(raw: string): LabRow[] {
  const rows: LabRow[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.kind === "string" && typeof o.id === "string") rows.push(o as LabRow);
    } catch {
      // 손상된 줄 무시 — 기록부 전체를 못 읽는 것보다 낫다
    }
  }
  return rows;
}

export function horizonEnd(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(months * DAYS_PER_MONTH));
  return d.toISOString().slice(0, 10);
}

/** date 이하 마지막 종가(그날 휴장이면 직전 거래일). 없으면 null. */
export function closeOnOrBefore(series: ClosePoint[], date: string): number | null {
  let out: number | null = null;
  for (const p of series) {
    if (p.date > date) break;
    out = p.close;
  }
  return out;
}

function pct(a: number, b: number): number {
  return (a / b - 1) * 100;
}

/**
 * 콜 하나의 결과. closes 는 콜 날짜 이후 일봉(오름차순), screens 는 스크리닝 실행 이력.
 * 같은 날 가격 사건과 후보 이탈이 겹치면 가격 사건을 먼저 본다 — 장중에 이미 일어난 일이다.
 */
export function scoreLabCall(
  call: LabCall,
  closes: ClosePoint[] | null,
  spy: ClosePoint[] | null,
  screens: ScreenMark[],
  today: string,
  decision: "accepted" | "declined" | null = null
): ScoredLabCall {
  const end = horizonEnd(call.date, call.horizonMonths);
  const dropout = screens
    .filter((s) => s.runDate > call.date && !s.candidates.includes(call.ticker))
    .map((s) => s.runDate)
    .sort()[0];

  let status: LabStatus = "진행중";
  let exitDate: string | null = null;
  let lastPrice: number | null = null;

  for (const p of closes ?? []) {
    if (p.date <= call.date) continue;
    if (dropout && p.date > dropout) break;
    if (p.date > end) break;
    lastPrice = p.close;
    if (p.close >= call.target) {
      status = "목표 도달";
      exitDate = p.date;
      break;
    }
    if (p.close <= call.stopLoss) {
      status = "철회(−15%)";
      exitDate = p.date;
      break;
    }
  }
  if (status === "진행중" && dropout && dropout <= today && dropout <= end) {
    status = "철회(후보 이탈)";
    exitDate = dropout;
    lastPrice = closeOnOrBefore(closes ?? [], dropout) ?? lastPrice;
  } else if (status === "진행중" && end <= today) {
    status = "만기";
    exitDate = end;
    lastPrice = closeOnOrBefore(closes ?? [], end) ?? lastPrice;
  }

  const returnPct = lastPrice != null ? pct(lastPrice, call.priceAtCall) : null;
  let spyReturnPct: number | null = null;
  if (spy && spy.length) {
    const a = closeOnOrBefore(spy, call.date);
    const b = closeOnOrBefore(spy, exitDate ?? today);
    if (a && b) spyReturnPct = pct(b, a);
  }
  return {
    ...call,
    status,
    exitDate,
    lastPrice,
    returnPct,
    spyReturnPct,
    excessPct: returnPct != null && spyReturnPct != null ? returnPct - spyReturnPct : null,
    decision,
  };
}

export interface LabGroupStats {
  n: number;
  resolved: number;
  avgReturnPct: number | null;
  avgSpyReturnPct: number | null;
  avgExcessPct: number | null;
  /** SPY 를 이긴 비율(%) — 수익률이 있는 콜만 */
  beatSpyPct: number | null;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function groupStats(calls: ScoredLabCall[]): LabGroupStats {
  const withRet = calls.filter((c) => c.excessPct != null);
  return {
    n: calls.length,
    resolved: calls.filter((c) => c.status !== "진행중").length,
    avgReturnPct: mean(withRet.map((c) => c.returnPct as number)),
    avgSpyReturnPct: mean(withRet.map((c) => c.spyReturnPct as number)),
    avgExcessPct: mean(withRet.map((c) => c.excessPct as number)),
    beatSpyPct: withRet.length ? (withRet.filter((c) => (c.excessPct as number) > 0).length / withRet.length) * 100 : null,
  };
}

export interface CumulativePoint {
  date: string;
  lab: number | null;
  control: number | null;
  spy: number | null;
}

/**
 * 누적 성과 선 — 날짜 d 마다 "d 이전에 낸 콜들의 그날 기준 수익률 평균".
 * 청산된 콜은 청산일 수익률로 고정한다. SPY 는 **실험실 픽과 같은 날짜에 샀다면**의 평균이다.
 * 점이 너무 많으면 주 단위로 솎는다(마지막 날은 항상 남긴다).
 */
export function cumulativeSeries(
  picks: ScoredLabCall[],
  controls: ScoredLabCall[],
  closesByTicker: Map<string, ClosePoint[] | null>,
  spy: ClosePoint[] | null,
  today: string,
  stepDays = 7
): CumulativePoint[] {
  if (!picks.length || !spy?.length) return [];
  const start = picks.map((c) => c.date).sort()[0];
  const days = spy.map((p) => p.date).filter((d) => d >= start && d <= today);
  const valueAt = (c: ScoredLabCall, d: string): number | null => {
    if (c.date > d) return null;
    const at = c.exitDate && c.exitDate < d ? c.exitDate : d;
    const px = closeOnOrBefore(closesByTicker.get(c.ticker) ?? [], at);
    return px != null ? pct(px, c.priceAtCall) : null;
  };
  const spyAt = (c: ScoredLabCall, d: string): number | null => {
    if (c.date > d) return null;
    const a = closeOnOrBefore(spy, c.date);
    const b = closeOnOrBefore(spy, c.exitDate && c.exitDate < d ? c.exitDate : d);
    return a && b ? pct(b, a) : null;
  };
  const avg = (xs: (number | null)[]) => mean(xs.filter((x): x is number => x != null));
  const out: CumulativePoint[] = [];
  let last = "";
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const isLast = i === days.length - 1;
    if (!isLast && last && (Date.parse(d) - Date.parse(last)) / 86_400_000 < stepDays) continue;
    out.push({
      date: d,
      lab: avg(picks.map((c) => valueAt(c, d))),
      control: avg(controls.map((c) => valueAt(c, d))),
      spy: avg(picks.map((c) => spyAt(c, d))),
    });
    last = d;
  }
  return out;
}

/**
 * 검증 보고서의 "## 이건 조심" 절에서 최상위 글머리표를 뽑는다(카드의 반대 근거 칸용).
 * 판단 기록부는 append-only 라 반대 근거를 나중에 덧붙일 수 없어서, 보고서를 원본으로 읽는다.
 * 링크는 텍스트만 남기고 굵게·🟡 표기는 지운다 — 카드에서는 출처 대신 보고서 버튼으로 간다.
 */
export function extractCautions(md: string, max = 3): string[] {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+이건 조심/.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/^##\s/.test(l)) break;
    const m = /^-\s+(.*)$/.exec(l);
    if (!m) continue;
    const text = m[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/\s*🟡/g, "")
      .replace(/\s+—\s+[^—]*$/, (tail) => (/https?:|\.com|\.st|\.gov/.test(tail) ? "" : tail))
      .trim();
    if (text) out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

// ── 자동 실행 상태 (TASK-190) ─────────────────────────────────────────────
// 작업 스케줄러가 매주 월 09:05 에 돈다. 실행·커밋까지 넉넉히 잡아 월 10:00 전에는
// 아직 이번 주 실행을 기대하지 않는다(지난주 월요일 기준으로 본다).
const RUN_DEADLINE_HOUR = 10;

/** 지금 시점에 이미 끝났어야 할 가장 최근 정기 실행일(월요일, 로컬 날짜). */
export function expectedRunDate(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (d.getDay() + 6) % 7; // 월=0 … 일=6
  d.setDate(d.getDate() - sinceMonday);
  if (sinceMonday === 0 && now.getHours() < RUN_DEADLINE_HOUR) d.setDate(d.getDate() - 7);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type LabHealthIssue =
  | { kind: "no-screen"; expected: string; latest: string | null }
  | { kind: "no-record"; runDate: string }
  | { kind: "log-error"; file: string; line: string };

/**
 * 사람이 로그를 열어보지 않아도 되게, 자동 실행이 빠졌거나 실패했으면 탭에 경고를 띄운다.
 *   no-screen  — 이번 주 스크리닝 자체가 없음(PC 꺼짐 · 스크립트 실패)
 *   no-record  — 스크리닝은 있는데 그날 추천/없음 기록이 없음(Claude 단계 실패)
 *   log-error  — 최신 실행 로그에 ERROR 줄이 있음
 */
export function labHealth(
  now: Date,
  latestScreen: string | null,
  recordedDates: Set<string>,
  latestLog: { file: string; text: string } | null
): LabHealthIssue[] {
  const issues: LabHealthIssue[] = [];
  const expected = expectedRunDate(now);
  if (!latestScreen || latestScreen < expected) {
    issues.push({ kind: "no-screen", expected, latest: latestScreen });
  } else if (!recordedDates.has(latestScreen)) {
    issues.push({ kind: "no-record", runDate: latestScreen });
  }
  if (latestLog) {
    const err = latestLog.text.split(/\r?\n/).filter((l) => l.includes("ERROR:")).pop();
    if (err) issues.push({ kind: "log-error", file: latestLog.file, line: err.trim() });
  }
  return issues;
}

/** 백분위 → 5단 게이지 (LAB-SPEC 5절). */
export function gaugeLevel(pct: number | null | undefined): number {
  if (pct == null || Number.isNaN(pct)) return 0;
  return Math.min(5, Math.floor(pct / 20) + 1);
}
