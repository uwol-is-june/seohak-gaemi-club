// 아티클 탭(/investment-article) 데이터 모델 — 순수 모듈(import 없음, 테스트 대상).
//
// 이 탭이 푸는 문제: `/investment-article` 은 **변환기**다. 기존 보고서를 읽어 산문으로
// 재배열할 뿐 새로 조사하지 않는다. 단 하나 예외가 skills/investment-article.md:23 —
// **소재 보고서를 못 찾으면 조용히 웹 수집으로 빠진다.** 그 경로는 다른 리서치 스킬이
// 지키는 교차검증·신뢰도 표기를 거치지 않는데 산출물은 대외 공개용 글이다. 그래서 이
// 탭은 "이미 있는 보고서 중 소재가 되는 것"만 골라 명령을 만들어 준다 — 사용자가 티커만
// 던져 웹 수집 경로로 새는 것을 막는 게 핵심 목적이다.
//
// **아티클의 용도는 마케팅이다**(2026-08-10 방침). 그래서 tier 를 가르는 1순위 기준이
// "재료가 다 있는가"에서 **"지금 독자가 관심 있는가"**로 바뀌었다.
//   A = 급변동 분석(/news-pulse) — 이벤트 직후가 관심의 정점이라 발행 타이밍이 곧 성과다
//   B = 심층 리서치(종합본·퍼널·산업·논제·체크리스트·실적) — 언제 써도 되는 상시 소재
//   제외 = 서사가 없는 판정표(열등주 스크리닝 등)·개인정보·조각 파일
//
// ⚠️ 급변동 보고서는 아티클 템플릿의 재료 4가지(재무·4대가·반대논거·밸류에이션) 중
// 일부가 비어 있다. 마케팅 글로는 그게 맞지만(사건 해설이 본문이다), 수치를 보태다
// 웹 수집 경로로 새지 않도록 소재 보고서 경로를 박은 명령을 그대로 쓴다.

export type ArticleTier = "A" | "B";

// 아티클 유형 = skills/investment-article.md 2단계의 3가지 구조.
export type ArticleShape = "deep" | "compare" | "market";

export const SHAPE_LABEL: Record<ArticleShape, string> = {
  deep: "심층 분석형",
  compare: "비교 분석형",
  market: "시장 시각형",
};

export interface ArticleSource {
  path: string;
  name: string;
  subject: string; // 티커 또는 섹터명 — 아티클과 짝을 맞추는 키
  kindLabel: string; // 소재 보고서의 종류 표시
  why: string; // 왜 이 tier 인지 (한 줄)
  shape: ArticleShape;
  tier: ArticleTier;
  date: string | null; // YYYY-MM-DD
  hasArticle: boolean; // 같은 subject 로 이미 나온 아티클이 있는가
  command: string;
}

export interface Article {
  path: string;
  name: string;
  subject: string;
  date: string | null;
}

export interface ArticleIndex {
  articles: Article[];
  sources: ArticleSource[];
  tierA: ArticleSource[];
  tierB: ArticleSource[];
}

// 최소 입력 형태 — ReportFile 을 import 하지 않고 구조만 받는다(테스트를 순수하게 유지).
export interface ArticleInput {
  path: string;
  name: string;
  company: string | null;
}

// 파일명 속 YYYYMMDD → 'YYYY-MM-DD'. 없으면 null.
export function articleDate(name: string): string | null {
  const m = name.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// 아티클 산출물 판정. skills/investment-article.md 5단계의 두 경로를 모두 받는다:
//   reports/{티커}/{티커}-article-{YYYYMMDD}.md   (종목)
//   reports/{주제}-article-{YYYYMMDD}.md          (섹터/주제)
export function isArticlePath(path: string): boolean {
  return path.startsWith("reports/") && /-article-\d{8}\.md$/i.test(path);
}

// 루트 보고서 파일명에서 섹터/주제 토큰을 뽑는다. `{토큰}-{유형}-{YYYYMMDD}.md` 규약.
function rootSubject(name: string): string {
  const m = name.match(/^(.*?)-(?:industry|funnel|article)-\d{8}\.md$/i);
  return m ? m[1] : name.replace(/\.md$/i, "");
}

export function parseArticle(input: ArticleInput): Article | null {
  if (!isArticlePath(input.path)) return null;
  return {
    path: input.path,
    name: input.name,
    subject: input.company ?? rootSubject(input.name),
    date: articleDate(input.name),
  };
}

// 소재 판정. 매칭되지 않으면 null = 이 탭에 띄우지 않는다.
// 제외 대상을 명시적으로 적어 두는 이유: 새 보고서 유형이 생겼을 때 '모르는 건 일단
// 소재로' 새어 들어가면, 서사 없는 판정표를 소재로 삼아 결국 웹 수집 경로를 타게 된다.
export function classifySource(input: ArticleInput): Omit<ArticleSource, "hasArticle"> | null {
  const { path, name, company } = input;
  if (!path.startsWith("reports/") || !path.endsWith(".md")) return null;
  if (isArticlePath(path)) return null; // 아티클 자신은 소재가 아니다

  const mk = (
    tier: ArticleTier,
    shape: ArticleShape,
    kindLabel: string,
    why: string,
    subject: string
  ): Omit<ArticleSource, "hasArticle"> => ({
    path,
    name,
    subject,
    kindLabel,
    why,
    shape,
    tier,
    date: articleDate(name),
    command: `/investment-article ${path}`,
  });

  // ── Tier A: 급변동 분석 — 마케팅 1순위 ──
  // /news-pulse. 이벤트 타임라인 + 원인 판단 + 논제 재검토가 이미 서사 형태다.
  // 다른 소재와 달리 **유효기간이 있다** — 사건 직후가 관심의 정점이고 며칠이면 식는다.
  // 그래서 목록에서 항상 맨 위에 두고 날짜 최신순으로 민다.
  if (company && name.includes("-news-")) {
    return mk("A", "market", "급변동 분석", "이벤트 직후가 관심의 정점 — 신선할 때 발행한다", company);
  }

  // ── Tier B: 상시 소재 — 재료는 더 충실하지만 발행 시점 압박이 없다 ──
  // /investment-team 종합본. 4차원 평점(4대가) + 핵심데이터 + Bull vs Bear(반대논거) +
  // 최종 투자의견(밸류에이션)이 한 파일에 다 있어 재배열만 하면 된다.
  if (name === "FinalReport.md" && company) {
    return mk("B", "deep", "심층분석 종합", "4대가 평점·반대논거·밸류에이션 모두 포함", company);
  }
  // /industry-funnel. 최종 3종목 = 아티클 '비교 분석형'의 2~3종목과 정확히 맞는다.
  if (!company && /-funnel-\d{8}\.md$/i.test(name)) {
    return mk("B", "compare", "퍼널 최종 선정", "최종 3종목 비교 + 4대가 심층분석 포함", rootSubject(name));
  }
  // /industry-research. 가치사슬 + 병목 판정 = 트렌드 인사이트 소재.
  if (!company && /-industry-\d{8}\.md$/i.test(name)) {
    return mk("B", "market", "산업 가치사슬", "가치사슬 지도 + 병목 판정 = 트렌드 서사", rootSubject(name));
  }
  // /thesis-tracker. 논제·앵커가·트리거는 있으나 개인 포지션 성격이 강해 공개 전 손질 필요.
  if (company && /-thesis\.md$/i.test(name)) {
    return mk("B", "deep", "투자 논제", "논제·트리거는 있으나 개인 포지션 노출 주의", company);
  }
  // /investment-checklist. 6관문 판정은 있으나 4대가 중 버핏 시각뿐이라 나머지를 보태야 한다.
  if (company && name.includes("-checklist-")) {
    return mk("B", "deep", "버핏 6-게이트", "4대가 중 버핏 시각만 — 나머지 3인 보강 필요", company);
  }
  // 실적 분석 산출물(/earnings-team). 이미 아티클 단계를 자체 수행한다
  // (skills/earnings-team.md Agent 5) — 중복 발행에 주의.
  if (company && name.includes("-earnings-")) {
    return mk("B", "deep", "실적 분석", "/earnings-team 으로 돌렸다면 아티클이 이미 있다", company);
  }

  // ── 제외: 서사가 없거나 개인 정보이거나 조각 파일 ──
  //  -quality-screen-  판정표만 (통과/탈락) — 4대가·밸류에이션·서사 전부 없음
  //  01~04-*, README  FinalReport 가 이미 종합한 조각
  //  portfolio-latest 개인 자산 노출
  //  _data.md/json    원자료 캐시
  return null;
}

/**
 * 이 소재를 덮는 아티클이 이미 나왔는가.
 *
 * 주제만 비교하면 **같은 종목에 사건이 반복되는 급변동 소재가 무너진다** — ADBE 첫 글을
 * 한 번 쓰면 이후 급변동이 몇 번 나든 전부 '발행됨'으로 접힌다. 그래서 소재에 날짜가
 * 있으면 **그 날짜 이후에 나온 아티클만** 그 소재를 덮은 것으로 본다.
 * (날짜 없는 소재 — FinalReport·thesis 등 — 는 종전대로 주제 일치만 본다.)
 */
function isCovered(articles: Article[], subject: string, date: string | null): boolean {
  const key = subject.toUpperCase();
  return articles.some(
    (a) => a.subject.toUpperCase() === key && (!date || !a.date || a.date >= date)
  );
}

export function buildArticleIndex(files: ArticleInput[]): ArticleIndex {
  const articles: Article[] = [];
  for (const f of files) {
    const a = parseArticle(f);
    if (a) articles.push(a);
  }
  // 최신 우선.
  articles.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.name.localeCompare(b.name));

  const sources: ArticleSource[] = [];
  for (const f of files) {
    const s = classifySource(f);
    if (s) sources.push({ ...s, hasArticle: isCovered(articles, s.subject, s.date) });
  }
  // 아직 아티클이 없는 것 먼저(= 지금 쓸 것), 그다음 최신순.
  sources.sort(
    (a, b) =>
      Number(a.hasArticle) - Number(b.hasArticle) ||
      (b.date ?? "").localeCompare(a.date ?? "") ||
      a.subject.localeCompare(b.subject)
  );

  return {
    articles,
    sources,
    tierA: sources.filter((s) => s.tier === "A"),
    tierB: sources.filter((s) => s.tier === "B"),
  };
}
