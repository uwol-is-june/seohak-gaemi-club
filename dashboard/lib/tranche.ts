// 분할 진입 래더 파서 (TASK-97).
//
// 원장(data/calls.jsonl)의 target.tranches 는 사람이 읽는 **자유 문자열**이다 —
// `record_call.py --tranche` 로 들어온 값이 그대로 박히고, 같은 문장이
// reports/track-record.md 의 관찰 논제 표에도 쓰인다. 원장은 append-only 라
// 과거 줄을 구조화된 형태로 바꿀 수 없으므로, **읽는 시점에** 구조를 뽑는다.
// (파서를 여기 한 곳에만 두는 이유: record_call.py 에도 파서를 두면 두 구현이
//  어긋날 수 있는데, 원장 값은 어차피 원문이 정본이라 이중화할 이득이 없다.)
//
// 실제 원장에 등장하는 형태(전수):
//   "1차 ≤$255"                              — 비중 없음
//   "1차 ≤$371 (15%)"                        — 비중 %
//   "1차 ≤$280 (1/3)"                        — 비중 분수
//   "1차 ≤$172 (MoS 25%)"                    — 괄호가 비중이 아니라 안전마진(!)
//   "1차 ≤$185 (25%) — AND 계약화 60%+ 공시"  — AND 조건부 차수
//   "3차 ≤$148 (40%) — 조건 없음"             — 조건 없음 명시
//   "AND: ADR 프리미엄 4주+ 레인지 하단 1/3"   — 차수가 아니라 래더 전체 조건
//   "잔여 분할: ≤$200에서 비중 확대"           — 차수 번호 없는 자유 서술
//
// 🔴 괄호 안이 `MoS 25%` 인 경우를 비중으로 읽으면 안 된다 — 안전마진(할인율)이라
// 합계가 100%가 되지 않고, 막대 길이로 그리면 완전히 틀린 그림이 된다.

export interface Tranche {
  /** 원문 그대로. 파싱이 부분적으로 실패해도 이 값은 항상 보여줄 수 있다. */
  raw: string;
  /** "tranche" = 가격이 있는 집행 차수 · "note" = 래더 전체에 걸리는 조건/설명 줄 */
  kind: "tranche" | "note";
  /** 차수 번호(1차 → 1). 번호가 없으면 null. */
  seq: number | null;
  /** 화면에 쓸 짧은 이름 — "1차" 또는 번호가 없을 때의 앞머리("잔여 분할"). */
  label: string;
  /** 진입 상한가(USD). 이 값이 있어야 가격 축에 그릴 수 있다. */
  price: number | null;
  /** 배분 비중(%). 괄호가 비중이 아닌 값(MoS 등)이면 null. */
  weightPct: number | null;
  /** 비중으로 해석하지 않은 괄호 내용(예: "MoS 25%"). 그대로 표기만 한다. */
  weightNote: string | null;
  /** 가격이 닿아도 이것이 참이어야 집행한다. 없으면 null. */
  condition: string | null;
  /** 조건은 아니지만 같이 읽어야 하는 단서("단 R2 발동한 하락이면 진입 금지" 등). */
  caveat: string | null;
}

// 여러 표기를 한 번에 받는다: "≤$185", "<=$185", "$185", "≤ $1,850.50"
const PRICE_RE = /\$\s*([0-9][\d,]*(?:\.\d+)?)/;
const SEQ_RE = /^(\d+)\s*차/;
const PAREN_RE = /\(([^)]*)\)/;
// 줄 전체가 래더 공통 조건인 경우("AND: ..." / "AND ...").
const LADDER_NOTE_RE = /^AND\s*[:：]/i;
// 차수 뒤에 붙는 조건절 구분자 — em dash(—) 또는 en dash(–).
const TAIL_SPLIT_RE = /\s[—–]\s/;

function toNumber(s: string): number | null {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// 괄호 내용 → 비중(%) 또는 '비중이 아님' 판정.
function readWeight(inner: string): { weightPct: number | null; weightNote: string | null } {
  const t = inner.trim();
  // "1/3", "2 / 5" → 분수 배분
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (b > 0) return { weightPct: (a / b) * 100, weightNote: null };
  }
  // "25%", "12.5 %" → 비중
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(t);
  if (pct) return { weightPct: Number(pct[1]), weightNote: null };
  // "MoS 25%" 처럼 숫자 앞뒤에 다른 말이 붙으면 비중이 아니다 — 원문만 남긴다.
  return { weightPct: null, weightNote: t || null };
}

/** 래더 한 줄을 구조화한다. 어떤 입력이 와도 예외 없이 Tranche 를 돌려준다. */
export function parseTranche(raw: string): Tranche {
  const text = (raw ?? "").trim();
  const base: Tranche = {
    raw: text,
    kind: "note",
    seq: null,
    label: text,
    price: null,
    weightPct: null,
    weightNote: null,
    condition: null,
    caveat: null,
  };
  if (!text) return base;

  // 래더 전체에 걸리는 조건 줄 — 차수가 아니다.
  if (LADDER_NOTE_RE.test(text)) {
    return { ...base, label: "공통 조건", condition: text.replace(LADDER_NOTE_RE, "").trim() };
  }

  // 조건절 분리. em dash 앞이 '무엇을 얼마에', 뒤가 '언제 집행 가능한가'.
  const parts = text.split(TAIL_SPLIT_RE);
  const head = parts[0].trim();
  const tail = parts.slice(1).join(" — ").trim();

  let condition: string | null = null;
  let caveat: string | null = null;
  if (tail) {
    if (/^AND\b/i.test(tail)) {
      condition = tail.replace(/^AND\b\s*[:：]?\s*/i, "").trim() || null;
    } else if (/^조건\s*없음/.test(tail)) {
      // "조건 없음" 뒤에 단서가 붙는 경우가 있다 — 조건은 없지만 읽히긴 해야 한다.
      const rest = tail.replace(/^조건\s*없음\s*[.。]?\s*/, "").trim();
      caveat = rest || null;
    } else {
      condition = tail;
    }
  }

  const seqM = SEQ_RE.exec(head);
  const seq = seqM ? Number(seqM[1]) : null;
  const priceM = PRICE_RE.exec(head);
  const price = priceM ? toNumber(priceM[1]) : null;
  const parenM = PAREN_RE.exec(head);
  const { weightPct, weightNote } = parenM ? readWeight(parenM[1]) : { weightPct: null, weightNote: null };

  // 라벨: 차수 번호가 있으면 "N차", 없으면 가격 앞의 앞머리("잔여 분할:" → "잔여 분할").
  let label: string;
  if (seq != null) label = `${seq}차`;
  else {
    const lead = head.split(/[≤<]|\$/)[0].replace(/[:：\-\s]+$/, "").trim();
    label = lead || head;
  }

  return {
    raw: text,
    kind: price != null ? "tranche" : "note",
    seq,
    label,
    price,
    weightPct,
    weightNote,
    condition,
    caveat,
  };
}

/**
 * 원장의 tranches 배열을 구조화한다. 차수는 가격 내림차순(비싼 것부터 = 먼저 닿는 것부터),
 * 차수 번호가 있으면 번호순을 우선한다 — 번호가 곧 집행 순서이기 때문이다.
 */
export function parseTranches(input: string[] | undefined | null): Tranche[] {
  if (!Array.isArray(input)) return [];
  return input.map(parseTranche);
}

/** 가격이 있어 축에 그릴 수 있는 차수만. 집행 순서(번호 → 가격 높은 순)로 정렬한다. */
export function pricedTranches(list: Tranche[]): Tranche[] {
  return list
    .filter((t) => t.kind === "tranche" && t.price != null)
    .sort((a, b) => {
      if (a.seq != null && b.seq != null) return a.seq - b.seq;
      return (b.price ?? 0) - (a.price ?? 0);
    });
}

/** 가격이 없어 축에 못 그리는 줄(래더 공통 조건 등). 차트 아래 각주로 붙인다. */
export function noteTranches(list: Tranche[]): Tranche[] {
  return list.filter((t) => t.kind === "note");
}

/**
 * 래더의 '최상단 차수 가격' — 가장 먼저 닿는(가장 비싼) 집행 지점.
 * 논제끼리 "어디부터 사기 시작하는가"를 비교할 때 쓴다.
 */
export function topTranchePrice(list: Tranche[]): number | null {
  const prices = pricedTranches(list)
    .map((t) => t.price)
    .filter((p): p is number => p != null);
  return prices.length > 0 ? Math.max(...prices) : null;
}
