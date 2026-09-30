// 보고서 경로 판정 — 파일시스템을 건드리지 않는 순수 함수만 둔다(reports-store.ts 에서 분리).
// 삭제·읽기 API 가 사용자 입력 경로를 이 가드로 거르므로 단위 테스트로 고정한다(report-path.test.ts).

/**
 * 형식 가드: 경로가 reports/*.md 이고 상위 탈출(..)이 없어야 한다.
 * 역슬래시·NUL 도 거부한다 — Windows 에서 `\` 는 구분자라 `/` 기준 검사를 우회할 수 있다.
 */
export function isValidReportPath(p: string): boolean {
  return (
    p.startsWith("reports/") &&
    p.endsWith(".md") &&
    !p.includes("..") &&
    !p.includes("\\") &&
    !p.includes("\0")
  );
}

/**
 * `_` 로 시작하는 파일·폴더는 보고서가 아니라 원자료 캐시·공유 코퍼스다
 * (reports/{티커}/_data.md = SEC XBRL 추출, _q2-primary/ = Agent 공유 1차 자료).
 * 목록에 섞이면 대시보드에 원자료가 보고서로 뜬다.
 */
export function isInternal(relPath: string): boolean {
  return relPath.split("/").slice(1).some((seg) => seg.startsWith("_"));
}
