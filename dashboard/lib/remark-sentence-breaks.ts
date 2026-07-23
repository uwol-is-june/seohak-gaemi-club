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

export default function remarkSentenceBreaks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (parent == null || index == null) return;
      if (parent.type !== "paragraph") return; // 문단 텍스트만 대상

      const value = node.value;
      SENTENCE_BOUNDARY.lastIndex = 0;
      if (!SENTENCE_BOUNDARY.test(value)) return;

      // 문장 조각으로 분해(끝 구두점은 앞 조각에 포함, 뒤 공백은 버림 → <br>이 대체).
      SENTENCE_BOUNDARY.lastIndex = 0;
      const parts: string[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = SENTENCE_BOUNDARY.exec(value)) !== null) {
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
