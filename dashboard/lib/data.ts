export type Status = "ok" | "warning" | "danger";
export type Tag = "agent-sdk" | "manual";
export type RiskSeverity = "high" | "medium" | "low" | "manual";
export type FlowGroup = "B" | "C" | "S" | "T";

export interface Risk {
  label: string;
  severity: RiskSeverity;
}

export interface DashboardItem {
  code: string;
  flowGroup: FlowGroup;
  name: string;
  status: Status;
  description: string;
  tags: Tag[];
  risks: Risk[];
}

export const flowGroupLabels: Record<FlowGroup, { label: string; subtitle: string }> = {
  B: { label: "플로우 B", subtitle: "실적 점검" },
  C: { label: "플로우 C", subtitle: "포트폴리오 점검" },
  S: { label: "단독 Skills", subtitle: "플로우 외 단독 사용" },
  T: { label: "Python Tools", subtitle: "보조 스크립트" },
};

export const skills: DashboardItem[] = [
  {
    code: "B2 / C2",
    flowGroup: "B",
    name: "/thesis-tracker",
    status: "warning",
    description: "분기별 논제 건강도 점검(B2 실적 점검, C2 포트폴리오 점검에서 재사용). 초기 논제 수립(A6)은 종목 발굴 플로우에서 수행.",
    tags: ["manual"],
    risks: [
      { label: "선행 보고서 파일 먼저 존재해야 함", severity: "manual" },
    ],
  },
  {
    code: "B1",
    flowGroup: "B",
    name: "/earnings-review",
    status: "warning",
    description: "SEC 10-K/10-Q 원문 독해 → 재무 추출·검증 → 경영진 어조 분석",
    tags: [],
    risks: [
      { label: "Seeking Alpha 어닝스 콜 유료 장벽 — site_preflight.py로 완화", severity: "medium" },
      { label: "SEC EDGAR 응답 지연 (특정 시간대)", severity: "low" },
    ],
  },
  {
    code: "B1+",
    flowGroup: "B",
    name: "/earnings-team",
    status: "warning",
    description: "B1 심화 대안. 4대 거장 병렬 실적 해석 → 편집 Agent → 최종 아티클",
    tags: ["agent-sdk"],
    risks: [
      { label: "/investment-team(A5+) + /earnings-review(B1) 위험 중첩", severity: "high" },
    ],
  },
  {
    code: "C1",
    flowGroup: "C",
    name: "/portfolio-review",
    status: "warning",
    description: "보유 종목 밸류에이션 병렬 수집 → 집중도·상관관계·리밸런싱 제안",
    tags: ["agent-sdk"],
    risks: [
      { label: "WebSearch 주가 — 실시간 아님", severity: "medium" },
    ],
  },
  {
    code: "S2",
    flowGroup: "S",
    name: "/news-pulse",
    status: "warning",
    description: "4개 탐색 Agent 병렬 (기업·규제·동종업계·시장심리) → 10분 원인 분석",
    tags: ["agent-sdk"],
    risks: [
      { label: "Agent SDK 팀 구조 필요", severity: "medium" },
      { label: "탐색 결과 수분 지연 — 실시간 아님", severity: "medium" },
    ],
  },
  {
    code: "S3",
    flowGroup: "S",
    name: "/bottleneck-hunter",
    status: "warning",
    description: "메가트렌드 공급망 Layer 0~4 분해 → 병목 고리 식별 → 상장 기업 발굴",
    tags: ["agent-sdk"],
    risks: [
      { label: "시간별 폴더 자동 생성 — 파일 관리 복잡", severity: "medium" },
      { label: "Layer 2/3 소형 공급업체 데이터 부족", severity: "medium" },
    ],
  },
  {
    code: "S5",
    flowGroup: "S",
    name: "/dyp-ask",
    status: "ok",
    description: "단융핑 방식으로 어떤 질문에도 답변. 외부 의존 없음",
    tags: [],
    risks: [],
  },
  {
    code: "S6",
    flowGroup: "S",
    name: "/investment-article",
    status: "warning",
    description: "기존 리서치 보고서를 블로그/뉴스레터 아티클로 변환",
    tags: [],
    risks: [
      { label: "보고서 미존재 시 WebSearch만으로 품질 저하", severity: "medium" },
    ],
  },
  {
    code: "S7",
    flowGroup: "S",
    name: "/financial-data",
    status: "ok",
    description: "재무 데이터 수집·교차검증 기준 참조 문서. 실행 아닌 표준 정의용",
    tags: [],
    risks: [],
  },
];

export const tools: DashboardItem[] = [
  {
    code: "T1",
    flowGroup: "T",
    name: "financial_rigor.py",
    status: "ok",
    description: "LLM 암산 오류 방지용 정밀 재무 계산 (Decimal). 시가총액 검증, PER/ROE, 3시나리오 목표주가",
    tags: [],
    risks: [
      { label: "benford — 50개 이상 숫자 필요, 단일 보고서는 표본 부족 가능", severity: "low" },
    ],
  },
  {
    code: "T2",
    flowGroup: "T",
    name: "report_audit.py",
    status: "warning",
    description: "보고서 재무 데이터 15% 샘플링 → 외부 소스 대조 → 통과/반려 판정",
    tags: ["manual"],
    risks: [
      { label: "Step 2 완전 수동 — 보고서 1개당 15~30분 소요", severity: "manual" },
      { label: "복잡한 표 구조 파싱 실패 가능", severity: "low" },
    ],
  },
  {
    code: "T3",
    flowGroup: "T",
    name: "site_preflight.py",
    status: "ok",
    description: "데이터 소스 사전 접근 점검. A1·A2·A3·B1의 0단계에서 사이트 차단 여부 확인 후 대체 소스 안내",
    tags: [],
    risks: [],
  },
  {
    code: "T4",
    flowGroup: "T",
    name: "stock_screener.py",
    status: "danger",
    description: "모멘텀 발굴(60일 신고가+거래량) + 가치검증(6차원 점수) 복합 스크리너",
    tags: ["manual"],
    risks: [
      { label: "Yahoo Finance 비공식 API — 언제든 차단 가능", severity: "high" },
      { label: "fundamentals.json 재무 데이터 수동 입력 필요", severity: "manual" },
      { label: "HK 종목 응답 불안정", severity: "medium" },
    ],
  },
  {
    code: "T5",
    flowGroup: "T",
    name: "morningstar_fair_value.py",
    status: "danger",
    description: "Morningstar 스크리너에서 Fair Value 추정치 종목 추출 → Top 100 저가 종목",
    tags: [],
    risks: [
      { label: "하드코딩 세션 키 klr5zyak8x — 만료 시 즉시 사용 불가", severity: "high" },
      { label: "비공식 내부 API — URL 구조 언제든 변경 가능", severity: "high" },
    ],
  },
];
