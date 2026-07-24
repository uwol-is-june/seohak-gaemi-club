// 토스증권 Open API 클라이언트 (server-only)
// 인증: OAuth2 Client Credentials. Base URL: https://openapi.tossinvest.com
//
// 로컬 전용. 토스가 IP 허용목록을 요구하므로, 실행하는 PC의 공인 IP를
// 토스 앱 허용목록에 등록해야 한다. 네트워크/자리가 바뀌면 IP 재등록 필요.

const BASE = "https://openapi.tossinvest.com";

export interface Holding {
  ticker: string; // "AAPL"
  name: string; // "Apple Inc."
  quantity: number; // 보유 수량
  avgPrice: number; // 평균 매입가 (USD)
  currentPrice: number; // 현재가 (USD)
  marketValue: number; // 평가금액 (USD)
  profitLoss: number; // 평가손익 (USD)
  profitLossPct: number; // 평가손익률 (%)
  currency: string; // "USD"
}

export class TossError extends Error {
  // 토스가 돌려준 HTTP 상태. 화면에서 429(요청 한도)를 다른 실패와 구분하는 데 쓴다.
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
  get rateLimited() {
    return this.status === 429;
  }
}

const RATE_LIMIT_MSG = "토스 API 요청 한도를 초과했습니다.";

// 토스 API는 초당 요청 한도가 빡빡해 연속 호출하면 바로 429가 난다.
// 429는 잠깐 쉬었다 한 번만 재시도하고, 그래도 실패하면 호출부가 에러로 처리한다.
async function tossFetch(path: string, init: RequestInit): Promise<Response> {
  const opts: RequestInit = { ...init, cache: "no-store" };
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status !== 429) return res;
  const retryAfterSec = Number(res.headers.get("retry-after"));
  const waitMs =
    Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 1200;
  await new Promise((r) => setTimeout(r, Math.min(waitMs, 3000)));
  return fetch(`${BASE}${path}`, opts);
}

// ─── 토큰 캐시 (모듈 메모리) ────────────────────────────────────────
// 서버리스에서는 인스턴스마다 캐시가 따로지만, 한 인스턴스가 살아있는 동안
// 반복 발급을 막아 rate limit을 줄인다. 만료 60초 전 갱신.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const key = process.env.TOSS_APP_KEY;
  const secret = process.env.TOSS_APP_SECRET;
  if (!key || !secret) {
    throw new TossError("TOSS_APP_KEY / TOSS_APP_SECRET 환경변수가 설정되지 않았습니다.");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await tossFetch("/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    console.error(`토큰 발급 실패: ${res.status} ${await res.text()}`);
    throw new TossError(
      res.status === 429 ? RATE_LIMIT_MSG : "토스 인증에 실패했습니다.",
      res.status
    );
  }
  const data = await res.json();
  if (typeof data.access_token !== "string" || !data.access_token) {
    console.error("토큰 응답에 access_token이 없습니다:", JSON.stringify(data));
    throw new TossError("토스 토큰 응답이 올바르지 않습니다.");
  }
  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + expiresInSec * 1000 };
  return cachedToken.value;
}

// 계좌는 바뀌지 않으므로 한 번 알아내면 인스턴스가 사는 동안 재사용한다.
// (매 잔고 조회마다 /accounts를 부르면 토스 API 호출이 2배가 돼 429를 자초한다)
let cachedAccountSeq: string | null = null;

// X-Tossinvest-Account 헤더에 넣을 accountSeq를 가져온다.
// (accountNo가 아니라 accountSeq를 넣어야 함 — GET /api/v1/accounts 응답의 accountSeq)
// env(TOSS_ACCOUNT_SEQ)가 있으면 그것을 우선 사용.
async function resolveAccountSeq(token: string): Promise<string> {
  const fromEnv = process.env.TOSS_ACCOUNT_SEQ;
  if (fromEnv) return fromEnv;
  if (cachedAccountSeq) return cachedAccountSeq;

  const res = await tossFetch("/api/v1/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // 상태를 살려서 올린다 — 429를 "계좌 없음"으로 뭉개면 원인 파악이 어렵다.
    console.error(`계좌 조회 실패: ${res.status} ${await res.text()}`);
    throw new TossError(
      res.status === 429 ? RATE_LIMIT_MSG : "계좌를 찾을 수 없습니다 (accountSeq 조회 실패).",
      res.status
    );
  }
  const data = await res.json();
  const list: unknown[] = Array.isArray(data?.result) ? data.result : [];
  const first = list[0] as Record<string, unknown> | undefined;
  const seq = first?.accountSeq;
  if (seq == null) {
    throw new TossError("계좌를 찾을 수 없습니다 (accountSeq 조회 실패).");
  }
  cachedAccountSeq = String(seq);
  return cachedAccountSeq;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

// 실제 응답의 items[] 한 항목을 정규화.
// rate는 소수(예: -0.0606 = -6.06%)로 오므로 100을 곱한다.
function normalizeHolding(raw: any): Holding {
  return {
    ticker: String(raw.symbol ?? ""),
    name: String(raw.name ?? raw.symbol ?? ""),
    quantity: num(raw.quantity),
    avgPrice: num(raw.averagePurchasePrice),
    currentPrice: num(raw.lastPrice),
    marketValue: num(raw.marketValue?.amount),
    profitLoss: num(raw.profitLoss?.amount),
    profitLossPct: num(raw.profitLoss?.rate) * 100,
    currency: String(raw.currency ?? "USD"),
  };
}

// 해외(비 KR) 보유 종목만 반환.
export async function getHoldings(): Promise<Holding[]> {
  const token = await getAccessToken();
  const accountSeq = await resolveAccountSeq(token);

  const res = await tossFetch("/api/v1/holdings", {
    headers: { Authorization: `Bearer ${token}`, "X-Tossinvest-Account": accountSeq },
  });
  if (!res.ok) {
    console.error(`잔고 조회 실패: ${res.status} ${await res.text()}`);
    throw new TossError(
      res.status === 429 ? RATE_LIMIT_MSG : "보유 종목을 불러오지 못했습니다.",
      res.status
    );
  }
  const data = await res.json();
  const items: any[] = data?.result?.items ?? [];
  return items
    .filter((r) => r?.marketCountry !== "KR" && num(r?.quantity) > 0)
    .map((r) => normalizeHolding(r));
}

// ─── 잔고 응답 캐시 + 동시 요청 합치기 ────────────────────────────────
// 화면 두 곳(포트폴리오 배너 · 당일 체크)이 마운트되며 동시에 /api/holdings를
// 부르고, 자동 재시도까지 겹치면 토스 한도를 바로 넘긴다. 짧은 TTL 캐시로
// 연속 호출을 흡수하고, 진행 중인 요청은 하나로 공유한다.
const HOLDINGS_TTL_MS = 15_000;
let holdingsCache: { at: number; data: Holding[] } | null = null;
let inflight: Promise<Holding[]> | null = null;

export async function getHoldingsCached(): Promise<Holding[]> {
  if (holdingsCache && Date.now() - holdingsCache.at < HOLDINGS_TTL_MS) {
    return holdingsCache.data;
  }
  if (inflight) return inflight;
  inflight = getHoldings()
    .then((data) => {
      holdingsCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// ─── UI 개발용 목업 (TOSS_MOCK=1 일 때 라우트가 반환) ────────────────
export const MOCK_HOLDINGS: Holding[] = [
  { ticker: "NVDA", name: "NVIDIA Corp.", quantity: 8, avgPrice: 620.1, currentPrice: 1180.4, marketValue: 9443.2, profitLoss: 4482.4, profitLossPct: 90.37, currency: "USD" },
  { ticker: "AAPL", name: "Apple Inc.", quantity: 12, avgPrice: 178.5, currentPrice: 214.3, marketValue: 2571.6, profitLoss: 429.6, profitLossPct: 20.06, currency: "USD" },
  { ticker: "MSFT", name: "Microsoft Corp.", quantity: 5, avgPrice: 415.2, currentPrice: 468.9, marketValue: 2344.5, profitLoss: 268.5, profitLossPct: 12.93, currency: "USD" },
  { ticker: "TSLA", name: "Tesla Inc.", quantity: 6, avgPrice: 250.0, currentPrice: 218.7, marketValue: 1312.2, profitLoss: -187.8, profitLossPct: -12.52, currency: "USD" },
];
