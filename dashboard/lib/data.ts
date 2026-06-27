export type Status = "ok" | "warning" | "danger";
export type Tag = "agent-sdk" | "manual";
export type RiskSeverity = "high" | "medium" | "low" | "manual";

export interface Risk {
  label: string;
  severity: RiskSeverity;
}

export interface DashboardItem {
  name: string;
  status: Status;
  description: string;
  tags: Tag[];
  risks: Risk[];
}

export const skills: DashboardItem[] = [
  {
    name: "/investment-research",
    status: "warning",
    description: "8단계 순차 분석 (데이터 수집 → 사업분석 → MOAT → 리스크 → 경영진 → 트렌드 → 밸류에이션 → 종합)",
    tags: [],
    risks: [
      { label: "macrotrends / Seeking Alpha 차단 가능", severity: "medium" },
      { label: "report_audit Step 2 수동 입력 필요", severity: "manual" },
    ],
  },
  {
    name: "/investment-team",
    status: "warning",
    description: "4개 Agent 병렬 실행 → Team Lead 통합 보고서",
    tags: ["agent-sdk"],
    risks: [
      { label: "Agent SDK 전용 — 일반 대화 모드 실행 불가", severity: "high" },
      { label: "4개 Agent 타임아웃 위험 (3~10분)", severity: "medium" },
    ],
  },
  {
    name: "/industry-research",
    status: "warning",
    description: "섹터 가치사슬 전체 스캔 → TAM, 주요 플레이어, 포트폴리오 배분 제안",
    tags: [],
    risks: [
      { label: "Seeking Alpha / WSJ 페이월", severity: "medium" },
      { label: "WebSearch 결과 최신성 한계", severity: "medium" },
    ],
  },
  {
    name: "/industry-funnel",
    status: "warning",
    description: "전체 시장 30~60종목 → 5개 지표 스크리닝 → 최종 3종목",
    tags: [],
    risks: [
      { label: "finviz Elite 전용 필터 제한", severity: "medium" },
      { label: "소형주·ADR 자동 누락 가능", severity: "medium" },
    ],
  },
  {
    name: "/quality-screen",
    status: "ok",
    description: "7가지 하드 기준 (ROE, FCF, 이자커버리지 등)으로 열등주 필터링",
    tags: [],
    risks: [],
  },
  {
    name: "/investment-checklist",
    status: "warning",
    description: "버핏 6-게이트 순차 검증. 종목마다 독립 Agent 실행",
    tags: ["agent-sdk"],
    risks: [
      { label: "Agent SDK Task 도구 필요", severity: "medium" },
    ],
  },
  {
    name: "/management-deep-dive",
    status: "warning",
    description: "CEO/경영진 공개 발언 추적, 자본 배분 결정 수익률 분석",
    tags: ["agent-sdk"],
    risks: [
      { label: "Glassdoor / LinkedIn 봇 차단 강함", severity: "high" },
      { label: "Earnings call 트랜스크립트 Seeking Alpha 페이월", severity: "medium" },
    ],
  },
  {
    name: "/earnings-review",
    status: "warning",
    description: "SEC 10-K/10-Q 원문 독해 → 재무 추출·검증 → 경영진 어조 분석",
    tags: [],
    risks: [
      { label: "Seeking Alpha 어닝스 콜 유료 장벽", severity: "medium" },
      { label: "SEC EDGAR 응답 지연 (특정 시간대)", severity: "low" },
    ],
  },
  {
    name: "/earnings-team",
    status: "warning",
    description: "4대 거장 병렬 실적 해석 → 편집 Agent → 최종 아티클",
    tags: ["agent-sdk"],
    risks: [
      { label: "/investment-team + /earnings-review 위험 중첩", severity: "high" },
    ],
  },
  {
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
    name: "/thesis-tracker",
    status: "warning",
    description: "투자 논제 수립 및 분기별 논제 건강도 점검",
    tags: ["manual"],
    risks: [
      { label: "선행 보고서 파일 먼저 존재해야 함", severity: "manual" },
    ],
  },
  {
    name: "/portfolio-review",
    status: "warning",
    description: "보유 종목 밸류에이션 병렬 수집 → 집중도·상관관계·리밸런싱 제안",
    tags: ["agent-sdk"],
    risks: [
      { label: "WebSearch 주가 — 실시간 아님", severity: "medium" },
    ],
  },
  {
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
    name: "/deep-company-series",
    status: "warning",
    description: "단일 기업 8편 장문 시리즈 (~120,000자 이상)",
    tags: [],
    risks: [
      { label: "120,000자 초과 — 단일 세션 완료 불가", severity: "high" },
    ],
  },
  {
    name: "/dyp-ask",
    status: "ok",
    description: "단융핑 방식으로 어떤 질문에도 답변. 외부 의존 없음",
    tags: [],
    risks: [],
  },
  {
    name: "/investment-article",
    status: "warning",
    description: "기존 리서치 보고서를 블로그/뉴스레터 아티클로 변환",
    tags: [],
    risks: [
      { label: "보고서 미존재 시 WebSearch만으로 품질 저하", severity: "medium" },
    ],
  },
  {
    name: "/financial-data",
    status: "ok",
    description: "재무 데이터 수집·교차검증 기준 참조 문서. 실행 아닌 표준 정의용",
    tags: [],
    risks: [],
  },
];

export const tools: DashboardItem[] = [
  {
    name: "financial_rigor.py",
    status: "ok",
    description: "LLM 암산 오류 방지용 정밀 재무 계산 (Decimal). 시가총액 검증, PER/ROE, 3시나리오 목표주가",
    tags: [],
    risks: [
      { label: "benford — 50개 이상 숫자 필요, 단일 보고서는 표본 부족 가능", severity: "low" },
    ],
  },
  {
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
    name: "morningstar_fair_value.py",
    status: "danger",
    description: "Morningstar 스크리너에서 Fair Value 추정치 종목 추출 → Top 100 저가 종목",
    tags: [],
    risks: [
      { label: "하드코딩 세션 키 klr5zyak8x — 만료 시 즉시 사용 불가", severity: "high" },
      { label: "비공식 내부 API — URL 구조 언제든 변경 가능", severity: "high" },
    ],
  },
  {
    name: "momentum_backtest.py",
    status: "warning",
    description: "NVDA/AMD/MU 3종목 모멘텀+가치 프레임워크 백테스트 (2022~2025). 연구용",
    tags: [],
    risks: [
      { label: "Yahoo Finance 비공식 API — 언제든 차단 가능", severity: "high" },
      { label: "NVDA/AMD/MU 3종목에만 최적화, 범용성 없음", severity: "low" },
    ],
  },
];
