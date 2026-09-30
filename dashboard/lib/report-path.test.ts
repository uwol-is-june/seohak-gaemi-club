// 보고서 경로 가드 테스트 (TASK-156). 읽기·삭제 API 가 사용자 입력 경로를 이걸로 거른다.
//
// 실행:  node --test dashboard/lib/report-path.test.ts   (또는 dashboard 에서 npm test)
import test from "node:test";
import assert from "node:assert/strict";
import { isInternal, isValidReportPath } from "./report-path.ts";

test("정상 보고서 경로 — 한글 파일명 포함", () => {
  assert.equal(isValidReportPath("reports/AAPL/FinalReport.md"), true);
  assert.equal(isValidReportPath("reports/portfolio-latest.md"), true);
  assert.equal(isValidReportPath("reports/AMZN/AMZN-earnings-2026Q2-단용평.md"), true);
});

test("reports/ 밖 · 확장자 · 상위 탈출 거부", () => {
  assert.equal(isValidReportPath("data/calls.jsonl"), false);
  assert.equal(isValidReportPath("reports/AAPL/_data.json"), false);
  assert.equal(isValidReportPath("reports/../CLAUDE.md"), false);
  assert.equal(isValidReportPath("reports/AAPL/../../.env.md"), false);
  assert.equal(isValidReportPath("/reports/AAPL/x.md"), false);
  assert.equal(isValidReportPath("reports\\..\\CLAUDE.md"), false);
  assert.equal(isValidReportPath("reports/a\\b.md"), false);
  assert.equal(isValidReportPath("reports/a\0.md"), false);
});

test("내부 산출물(_ 접두) 판정", () => {
  assert.equal(isInternal("reports/NVDA/_data.md"), true);
  assert.equal(isInternal("reports/AMZN/_q2-primary/10-Q.md"), true);
  assert.equal(isInternal("reports/NVDA/FinalReport.md"), false);
  // 루트 세그먼트("reports")는 보지 않는다 — 폴더명이 _ 로 시작할 때만 내부다.
  assert.equal(isInternal("reports/track-record.md"), false);
});
