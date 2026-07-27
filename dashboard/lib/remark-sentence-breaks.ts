import { visit } from "unist-util-visit";
import type { Root, Text, PhrasingContent } from "mdast";

// 문장 끝(. ! ? …) 뒤 공백에서 줄바꿈(<br>)을 넣어 보고서 본문 가독성을 높인다.
//
// 배경: 보고서 원문은 한 문단에 여러 문장을 한 줄로 이어 쓴다. 마크다운은 문단 내
// 텍스트를 한 덩어리로 흘려 렌더하므로 문장 경계가 시각적으로 사라진다. 이 플러그인은
// mdast의 text 노드를 문장 단위로 쪼개 사이에 break 노드(<br>)를 끼운다.
//
// 적용 범위: 문단(paragraph) 바로 아래의 텍스트에만 적용한다. 제목(heading)·표 셀
// (tableCell)·코드(code/inlineCode)·링크 라벨(link) 텍스트는 부모가 paragraph가
// 아니므로 건드리지 않는다.
//
// 소수점 안전: 경계는 "구두점 + 공백"일 때만 잡는다. `7.91`, `$1.4B`처럼 마침표 뒤에
// 공백이 없는 소수/단위 표기는 자동으로 제외된다.

// 구두점(. ! ? …) 뒤에 하나 이상의 공백/탭이 오는 지점을 문장 경계로 본다.
const SENTENCE_BOUNDARY = /([.!?…])[ \t]+/g;

// 마침표가 문장 끝이 아니라 약어/약칭인 경우(경계로 보면 문장 중간에 <br>이 끼어든다).
// 예: "U.S. economy", "e.g. foo", "vs. bar". (! ? … 는 약어가 없으므로 항상 경계)
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "cf", "al", "no", "approx", "est",
  "inc", "corp", "ltd", "co", "mr", "mrs", "ms", "dr", "st", "jr", "sr",
  "fig", "vol", "pp", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
]);

// 마침표(pos = 마침표 위치) 앞 텍스트가 약어/두문자면 문장 경계가 아니다.
function isRealPeriodBoundary(value: string, dotPos: number): boolean {
  const before = value.slice(0, dotPos);
  // 두문자/이니셜(U.S., a.m., p.m. 등): 마침표 앞이 '문자.문자' 꼴이면 약어.
  if (/[A-Za-z]\.[A-Za-z]$/.test(before)) return false;
  // 마침표 앞 마지막 토큰이 알려진 약어면 경계가 아니다.
  const m = before.match(/([A-Za-z][A-Za-z.]*)$/);
  if (m && ABBREVIATIONS.has(m[1].toLowerCase().replace(/\.$/, ""))) return false;
  return true;
}

export default function remarkSentenceBreaks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (parent == null || index == null) return;
      if (parent.type !== "paragraph") return; // 문단 텍스트만 대상

      const value = node.value;
      SENTENCE_BOUNDARY.lastIndex = 0;
      if (!SENTENCE_BOUNDARY.test(value)) return;

      // 문장 조각으로 분해(끝 구두점은 앞 조각에 포함, 뒤 공백은 버림 → <br>이 대체).
      // 약어(예: U.S., e.g.)의 마침표는 경계로 취급하지 않고 공백째로 다음 조각에 남긴다.
      SENTENCE_BOUNDARY.lastIndex = 0;
      const parts: string[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = SENTENCE_BOUNDARY.exec(value)) !== null) {
        if (m[1] === "." && !isRealPeriodBoundary(value, m.index)) continue;
        parts.push(value.slice(last, m.index + m[1].length));
        last = SENTENCE_BOUNDARY.lastIndex;
      }
      parts.push(value.slice(last));
      // 마침표+공백으로 끝난 경우 마지막 빈 조각을 버려 꼬리 <br>을 방지한다.
      if (parts[parts.length - 1] === "") parts.pop();
      if (parts.length <= 1) return;

      const replacements: PhrasingContent[] = [];
      parts.forEach((part, i) => {
        if (i > 0) replacements.push({ type: "break" });
        if (part !== "") replacements.push({ type: "text", value: part });
      });

      parent.children.splice(index, 1, ...replacements);
      return index + replacements.length; // 새로 넣은 노드 재방문 방지
    });
  };
}
