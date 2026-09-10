// 논제의 핵심 가정 · 무효화(레드라인) 문자열 구조화 (TASK-105).
//
// 원장(data/calls.jsonl)의 loadBearing / invalidation 은 사람이 읽는 **자유 문장**이고,
// 상세를 펼치면 그 문장이 그대로 불릿으로 쏟아진다 — 한 종목에 14줄 한국어 산문이 되면
// "지금 무엇이 깨졌나"를 눈으로 못 찾는다. 여기서 읽는 시점에 세 조각으로 쪼갠다:
//   code   R4 · 가정2      — 보고서와 대조할 식별자
//   label  판정 기준        — 무엇이 참이어야 하나
//   note   실측값 · 상태    — 지금 어떤가 (숫자가 여기 들어 있다)
// 그러면 화면은 상태 점 + 코드 + 숫자로 도식화할 수 있고, 원문은 title 로 남긴다.
//
// 🔴 상태 키워드는 **주석 구역(괄호·em dash 뒤)에서만** 찾는다. 조건 문장 자체에
// 같은 단어가 박혀 있기 때문이다 — "회계부정·경영진 신뢰 훼손"은 레드라인 *조건*이고
// 훼손됐다는 *상태*가 아니다. 본문에서 키워드를 찾으면 이 줄이 빨갛게 뜬다(오독).

/** bad 깨졌다·발동했다 · ok 아직 괜찮다 · unknown 확인 불가 · none 상태 기록 없음 */
export type FactState = "bad" | "ok" | "unknown" | "none";

export interface Fact {
  /** 원문(쪼개기 전 한 항목). 화면에서 title 로 항상 노출한다. */
  raw: string;
  /** 식별자("R4", "가정2"). 없으면 null. */
  code: string | null;
  /** 판정 기준 본문 — 코드·주석 구역을 뺀 나머지. */
  label: string;
  /** 주석 구역(실측값·상태). 숫자가 대개 여기 있다. */
  note: string | null;
  state: FactState;
  /** 화면에 띄울 상태 이름("발동", "미발동", "훼손", "미확인"). */
  stateLabel: string | null;
}

// 한 항목 안에 세미콜론으로 여러 기준이 들어오는 경우가 있다(AMZN: 한 줄에 7개).
// 그건 7개로 세어야 맞다 — 합쳐 두면 상태 하나로 뭉개진다.
const ITEM_SPLIT_RE = /\s*;\s*/;
// 코드 접두사. 뒤에 괄호 단서가 붙는 형태도 받는다: "R7(2026-08-12 신규):"
const CODE_RE = /^(R\d+|A\d+|가정\s*\d+|리스크\s*\d+)\s*(\([^)]*\))?\s*[:：.]?\s*/;
const TAIL_SPLIT_RE = /\s[—–]\s/;
const PAREN_ALL_RE = /\(([^)]*)\)/g;
// 주석으로 인정할 괄호 — 상태 키워드나 측정값이 들어 있을 때만.
// "(N3/N2)"·"(회계부정·내부자 매도)" 같은 조건 본문의 일부는 본문에 남긴다.
const NOTE_WORTHY_RE = /[%$]|\d+\s*(?:x|배|bp|%p)|미발동|발동|훼손|미확인|미공시|정상|충족|미달|초과|실측/;

// 순서가 규칙이다 — 미발동에는 "발동"이, 미확인에는 "확인"이 들어 있다.
const STATE_RULES: { re: RegExp; state: FactState; label: string }[] = [
  { re: /훼손|미충족|위반|이탈/, state: "bad", label: "훼손" },
  { re: /미발동/, state: "ok", label: "미발동" },
  { re: /(?<!미)발동/, state: "bad", label: "발동" },
  { re: /미확인|미공시|검증\s*불가|추정/, state: "unknown", label: "미확인" },
  { re: /정상|충족|(?<!미)확인|실측/, state: "ok", label: "충족" },
];

function readState(note: string | null): { state: FactState; stateLabel: string | null } {
  if (!note) return { state: "none", stateLabel: null };
  for (const r of STATE_RULES) {
    if (r.re.test(note)) return { state: r.state, stateLabel: r.label };
  }
  return { state: "none", stateLabel: null };
}

/** 한 항목 → Fact. 어떤 입력이 와도 예외 없이 돌려준다(원문은 반드시 보존). */
export function parseFact(raw: string): Fact {
  const text = (raw ?? "").trim();
  const empty: Fact = { raw: text, code: null, label: text, note: null, state: "none", stateLabel: null };
  if (!text) return empty;

  // 1) 코드 접두사 분리. 코드에 붙은 괄호 단서는 주석으로 넘긴다.
  let rest = text;
  let code: string | null = null;
  const notes: string[] = [];
  const codeM = CODE_RE.exec(rest);
  if (codeM) {
    code = codeM[1].replace(/\s+/g, "");
    if (codeM[2]) notes.push(codeM[2].slice(1, -1).trim());
    rest = rest.slice(codeM[0].length);
  }

  // 2) em dash 뒤 = 상태 서술. "1차 ≤$185 — AND ..." 와 같은 구분자 규약(lib/tranche).
  const parts = rest.split(TAIL_SPLIT_RE);
  rest = parts[0].trim();
  const tail = parts.slice(1).join(" — ").trim();
  if (tail) notes.push(tail);

  // 3) 측정값·상태가 든 괄호만 주석으로 빼낸다.
  rest = rest.replace(PAREN_ALL_RE, (whole, inner: string) => {
    const t = inner.trim();
    if (NOTE_WORTHY_RE.test(t)) {
      notes.push(t);
      return " ";
    }
    return whole;
  });

  const label = rest.replace(/\s{2,}/g, " ").trim() || text;
  const note = notes.filter(Boolean).join(" · ") || null;
  return { raw: text, code, label, note, ...readState(note) };
}

/** 원장의 loadBearing / invalidation 배열 → Fact 목록(세미콜론 항목까지 펼친다). */
export function parseFacts(input: string[] | null | undefined): Fact[] {
  if (!Array.isArray(input)) return [];
  return input
    .flatMap((s) => String(s ?? "").split(ITEM_SPLIT_RE))
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseFact);
}

export interface FactTally {
  bad: number;
  unknown: number;
  ok: number;
  none: number;
  total: number;
}

export function factTally(facts: Fact[]): FactTally {
  const t: FactTally = { bad: 0, unknown: 0, ok: 0, none: 0, total: facts.length };
  for (const f of facts) t[f.state]++;
  return t;
}

// 나쁜 것부터. 상세를 펼쳤을 때 처음 보이는 줄이 "지금 깨진 것"이어야 한다.
const SEVERITY: Record<FactState, number> = { bad: 0, unknown: 1, none: 2, ok: 3 };

export function bySeverity(a: Fact, b: Fact): number {
  return SEVERITY[a.state] - SEVERITY[b.state];
}
