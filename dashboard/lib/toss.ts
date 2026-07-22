// 토스증권 Open API 클라이언트 (server-only)
// 인증: OAuth2 Client Credentials. Base URL: https://openapi.tossinvest.com
// ⚠️ 잔고 응답 필드명은 실제 연결(IP 허용) 후 확정해야 함 — normalizeHolding의 TODO 참고.

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

export class TossError extends Error {}

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
  const res = await fetch(`${BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new TossError(`토큰 발급 실패: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + expiresInSec * 1000 };
  return cachedToken.value;
}

// 계좌가 하나뿐이면 X-Tossinvest-Account에 넣을 계좌 식별자를 자동으로 가져온다.
// env(TOSS_ACCOUNT_NO)가 있으면 그것을 우선 사용.
async function resolveAccountId(token: string): Promise<string | null> {
  const fromEnv = process.env.TOSS_ACCOUNT_NO;
  if (fromEnv) return fromEnv;

  const res = await fetch(`${BASE}/api/v1/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const list: unknown[] = Array.isArray(data) ? data : (data.accounts ?? data.data ?? []);
  const first = list[0] as Record<string, unknown> | undefined;
  if (!first) return null;
  // ⚠️ 실제 필드명 확정 필요 (accountNo / accountNumber / id 등 후보)
  const id = first.accountNo ?? first.accountNumber ?? first.number ?? first.id;
  return id != null ? String(id) : null;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

// ⚠️ 실제 응답 구조 확정 후 매핑 수정 필요.
function normalizeHolding(raw: Record<string, unknown>): Holding {
  const quantity = num(raw.quantity ?? raw.qty ?? raw.balanceQuantity);
  const avgPrice = num(raw.avgPrice ?? raw.averagePrice ?? raw.purchasePrice);
  const currentPrice = num(raw.currentPrice ?? raw.price ?? raw.lastPrice);
  const marketValue = num(raw.marketValue ?? raw.evaluationAmount ?? quantity * currentPrice);
  const cost = avgPrice * quantity;
  const profitLoss = num(raw.profitLoss ?? raw.evaluationProfitLoss ?? marketValue - cost);
  const profitLossPct = num(
    raw.profitLossRate ?? raw.returnRate ?? (cost > 0 ? (profitLoss / cost) * 100 : 0)
  );
  return {
    ticker: String(raw.ticker ?? raw.symbol ?? raw.code ?? ""),
    name: String(raw.name ?? raw.stockName ?? raw.ticker ?? raw.symbol ?? ""),
    quantity,
    avgPrice,
    currentPrice,
    marketValue,
    profitLoss,
    profitLossPct,
    currency: String(raw.currency ?? "USD"),
  };
}

// 해외(비 KRW) 보유 종목만 반환.
export async function getHoldings(): Promise<Holding[]> {
  const token = await getAccessToken();
  const accountId = await resolveAccountId(token);

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (accountId) headers["X-Tossinvest-Account"] = accountId;

  const res = await fetch(`${BASE}/api/v1/holdings`, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new TossError(`잔고 조회 실패: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const list: unknown[] = Array.isArray(data) ? data : (data.holdings ?? data.data ?? []);
  return list
    .map((r) => normalizeHolding(r as Record<string, unknown>))
    .filter((h) => h.currency !== "KRW" && h.quantity > 0);
}

// ─── UI 개발용 목업 (TOSS_MOCK=1 일 때 라우트가 반환) ────────────────
export const MOCK_HOLDINGS: Holding[] = [
  { ticker: "NVDA", name: "NVIDIA Corp.", quantity: 8, avgPrice: 620.1, currentPrice: 1180.4, marketValue: 9443.2, profitLoss: 4482.4, profitLossPct: 90.37, currency: "USD" },
  { ticker: "AAPL", name: "Apple Inc.", quantity: 12, avgPrice: 178.5, currentPrice: 214.3, marketValue: 2571.6, profitLoss: 429.6, profitLossPct: 20.06, currency: "USD" },
  { ticker: "MSFT", name: "Microsoft Corp.", quantity: 5, avgPrice: 415.2, currentPrice: 468.9, marketValue: 2344.5, profitLoss: 268.5, profitLossPct: 12.93, currency: "USD" },
  { ticker: "TSLA", name: "Tesla Inc.", quantity: 6, avgPrice: 250.0, currentPrice: 218.7, marketValue: 1312.2, profitLoss: -187.8, profitLossPct: -12.52, currency: "USD" },
];
