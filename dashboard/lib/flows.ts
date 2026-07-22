export interface SectorGroup {
  label: string;
  sectors: string[];
}

export interface FlowStep {
  title: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  commandTemplate: string;
  outputFiles: string[];
  outputNote?: string;
  requiresCli?: boolean;
  sectorPicker?: { groups: SectorGroup[] };
  // true면 이 스텝 입력칸 위에 "내 보유 종목" 칩을 노출한다 (티커 입력 스텝).
  // 티커 입력 스텝끼리는 앞 스텝 값이 다음 스텝에 미리 채워진다.
  holdingsPicker?: boolean;
}

export interface FlowStartPoint {
  id: string;
  label: string;
  description: string;
  fromStep: number;
}

// 분기별로 나눠 실행하는 플로우(포폴 점검)의 각 분기 정보
export interface FlowQuarter {
  label: string; // "1분기 점검"
  timing: string; // 권장 시기 "5월 중순"
  note: string; // 어떤 실적을 반영하는지
}

export interface Flow {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  steps: FlowStep[];
  startPoints?: FlowStartPoint[];
  quarters?: FlowQuarter[]; // 있으면 분기별 카드로 표시 (포폴 점검)
}

export const flows: Flow[] = [
  {
    id: "discovery",
    title: "종목 발굴",
    subtitle: "섹터 아이디어 → 후보 압축 → 논제 수립",
    color: "brand",
    startPoints: [
      {
        id: "sector",
        label: "시작점 A: 섹터 아이디어가 있을 때",
        description: "섹터 구조부터 파악해 후보 종목을 압축합니다.",
        fromStep: 0,
      },
      {
        id: "stock",
        label: "시작점 B: 특정 종목이 있을 때",
        description: "이미 살펴볼 종목이 있다면 열등주 제거부터 바로 시작합니다.",
        fromStep: 2,
      },
    ],
    steps: [
      {
        title: "섹터 구조 파악",
        description: "관심 섹터의 밸류체인, TAM, 주요 플레이어를 전체적으로 파악합니다.",
        inputLabel: "섹터명",
        inputPlaceholder: "AI Semiconductors",
        commandTemplate: "/industry-research {input}",
        outputFiles: ["reports/{input}-industry-{날짜}.md"],
        sectorPicker: {
          groups: [
            { label: "테크/AI",  sectors: ["AI Semiconductors", "AI Infrastructure", "Cloud Computing", "Cybersecurity", "Enterprise Software"] },
            { label: "금융",     sectors: ["Fintech Payments", "Digital Asset", "Insurance", "Investment Banking"] },
            { label: "헬스케어", sectors: ["GLP-1 / Obesity Drugs", "Medical Devices", "Biotech", "Health Insurance"] },
            { label: "소비",     sectors: ["Luxury / Brand", "E-commerce", "Warehouse Retail"] },
            { label: "에너지",   sectors: ["Nuclear Power", "Renewable Energy", "Oil & Gas"] },
            { label: "산업재",   sectors: ["Defense", "Electrical Equipment", "Aerospace"] },
            { label: "소재",     sectors: ["Copper / Mining", "Logistics", "Real Estate"] },
          ],
        },
      },
      {
        title: "후보 종목 압축",
        description: "섹터 내 30~60개 종목을 5개 핵심 지표로 스크리닝해 최종 3종목을 선정합니다.",
        inputLabel: "섹터명",
        inputPlaceholder: "AI Semiconductors",
        commandTemplate: "/industry-funnel {input}",
        outputFiles: ["reports/{input}-funnel-{날짜}.md"],
        sectorPicker: {
          groups: [
            { label: "테크/AI",  sectors: ["AI Semiconductors", "AI Infrastructure", "Cloud Computing", "Cybersecurity", "Enterprise Software"] },
            { label: "금융",     sectors: ["Fintech Payments", "Digital Asset", "Insurance", "Investment Banking"] },
            { label: "헬스케어", sectors: ["GLP-1 / Obesity Drugs", "Medical Devices", "Biotech", "Health Insurance"] },
            { label: "소비",     sectors: ["Luxury / Brand", "E-commerce", "Warehouse Retail"] },
            { label: "에너지",   sectors: ["Nuclear Power", "Renewable Energy", "Oil & Gas"] },
            { label: "산업재",   sectors: ["Defense", "Electrical Equipment", "Aerospace"] },
            { label: "소재",     sectors: ["Copper / Mining", "Logistics", "Real Estate"] },
          ],
        },
      },
      {
        title: "열등주 제거",
        description: "ROE, FCF, 이자커버리지 등 7가지 하드 기준으로 확실한 열등주를 걸러냅니다.",
        inputLabel: "후보 종목들",
        inputPlaceholder: "NVDA, AMD, INTC",
        commandTemplate: "/quality-screen {input}",
        outputFiles: [],
        outputNote: "화면 출력 (파일 저장 없음)",
        holdingsPicker: true,
      },
      {
        title: "버핏 6-게이트 체크",
        description: "통과한 종목들을 버핏 방식 6개 게이트로 매수 전 최종 검증합니다.",
        inputLabel: "통과한 종목들",
        inputPlaceholder: "NVDA, AMD",
        commandTemplate: "/investment-checklist {input}",
        outputFiles: ["reports/{input}/{input}-checklist-{날짜}.md"],
        requiresCli: true,
        holdingsPicker: true,
      },
      {
        title: "심층 분석",
        description: "최종 선정 종목을 4개 Agent 병렬 실행으로 4대 마스터 시각에서 깊이 분석합니다.",
        inputLabel: "최종 종목",
        inputPlaceholder: "NVDA",
        commandTemplate: "/investment-team {input}",
        outputFiles: ["reports/{input}/FinalReport.md", "reports/{input}/01~04-*.md"],
        requiresCli: true,
        holdingsPicker: true,
      },
      {
        title: "투자 논제 수립",
        description: "매수 이유를 5문장으로 정의하고, 핵심 가정과 레드라인 조건을 설정합니다.",
        inputLabel: "종목명",
        inputPlaceholder: "NVDA",
        commandTemplate: "/thesis-tracker {input}",
        outputFiles: ["reports/{input}/{input}-thesis.md"],
        holdingsPicker: true,
      },
    ],
  },
  {
    id: "earnings",
    title: "실적 점검",
    subtitle: "실적 발표 후 → 원본 분석 → 논제 업데이트",
    color: "brand",
    steps: [
      {
        title: "실적 정밀 분석",
        description: "SEC 10-K/10-Q 원문과 어닝스 콜을 직접 독해해 숨겨진 신호를 발굴합니다.",
        inputLabel: "종목명 + 분기",
        inputPlaceholder: "Apple 2025Q4",
        commandTemplate: "/earnings-review {input}",
        outputFiles: ["reports/{input}/{input}-earnings-{기간}.md"],
      },
      {
        title: "논제 건강도 점검",
        description: "기존 투자 논제의 각 가정을 최신 실적 데이터로 검증하고 점수를 업데이트합니다.",
        inputLabel: "종목명",
        inputPlaceholder: "Apple",
        commandTemplate: "/thesis-tracker {input} 분기검토",
        outputFiles: ["reports/{input}/{input}-thesis.md"],
      },
    ],
  },
  {
    id: "portfolio",
    title: "포트폴리오 점검",
    subtitle: "분기 1회, 실적 시즌 끝난 뒤(분기말 + 약 6주) 전체 보유를 점검합니다.",
    color: "brand",
    quarters: [
      { label: "1분기 점검", timing: "5월 중순", note: "Q1(1~3월) 실적 반영 후" },
      { label: "2분기 점검", timing: "8월 중순", note: "Q2(4~6월) 실적 반영 후" },
      { label: "3분기 점검", timing: "11월 중순", note: "Q3(7~9월) 실적 반영 후" },
      { label: "4분기·연간 점검", timing: "2월 말~3월 초", note: "Q4·연간(10~12월) 실적 반영 후" },
    ],
    steps: [
      {
        title: "전체 포트폴리오 점검",
        description: "보유 종목 밸류에이션 수집, 집중도·상관관계·리밸런싱 분석을 수행합니다.",
        inputLabel: "보유 내역",
        inputPlaceholder: "AAPL 30%, MSFT 20%, NVDA 20%, Cash 30%",
        commandTemplate: "/portfolio-review {input}",
        outputFiles: ["reports/portfolio-latest.md"],
        requiresCli: true,
      },
      {
        title: "개별 종목 논제 확인",
        description: "각 보유 종목의 투자 논제를 최신 데이터로 검증합니다. 보유 종목마다 반복 실행합니다.",
        inputLabel: "종목명",
        inputPlaceholder: "AAPL",
        commandTemplate: "/thesis-tracker {input} 분기검토",
        outputFiles: ["reports/{input}/{input}-thesis.md"],
        outputNote: "보유 종목마다 반복 실행",
      },
    ],
  },
];
