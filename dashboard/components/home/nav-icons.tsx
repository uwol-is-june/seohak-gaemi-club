/**
 * 사이드바 아이콘 — 인라인 스트로크 SVG.
 *
 * 외부 아이콘 라이브러리를 들이지 않는다. 다섯 개뿐이고, `currentColor` 를 쓰면
 * 선택/hover 색이 글자와 함께 따라온다.
 * 스트로크 폭은 1.6 으로 통일 — 섞이면 같은 층에서 굵기가 달라 보인다.
 */

import type { ReactNode } from "react";

export type NavIconName = "portfolio" | "track" | "inspect" | "reports" | "lab";

const PATHS: Record<NavIconName, ReactNode> = {
  // 지갑 — 지금 들고 있는 것
  portfolio: (
    <>
      <rect x="2.5" y="5" width="13" height="10" rx="2" />
      <path d="M6 5V3.5h6V5" />
    </>
  ),
  // 조준 — 아직 안 샀고 가격을 겨누는 중
  track: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2" />
    </>
  ),
  // 돋보기 — 들여다보기
  inspect: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M12.2 12.2 15.5 15.5" />
    </>
  ),
  // 문서
  reports: (
    <>
      <path d="M4 2.5h7l3 3v10H4z" />
      <path d="M6.5 9h5M6.5 12h3.5" />
    </>
  ),
  // 플라스크 — 실험실(기존 시스템과 별개로 검증 중인 방식)
  lab: (
    <>
      <path d="M7 2.5h4M7.5 2.5v4.5L3.5 14a1.5 1.5 0 0 0 1.3 2.2h8.4a1.5 1.5 0 0 0 1.3-2.2L10.5 7V2.5" />
      <path d="M5.2 11h7.6" />
    </>
  ),
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
