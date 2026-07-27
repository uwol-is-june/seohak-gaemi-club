// 포트폴리오(보유·시세·환율) 표시용 공용 상태·캐시·헬퍼(TASK-46 분해).
// HoldingsBanner·DailyCheckView·HomeView 가 공유한다.
import type { Dispatch, SetStateAction } from "react";
import type { Holding } from "@/lib/toss";
import { readJsonSafe } from "@/lib/fetch-json";

export interface Quote {
  ticker: string;
  price: number | null;
  prevClose: number | null;
  changePct: number | null;
}

export const CCY_STORAGE_KEY = "holdings-ccy";
export type Ccy = "USD" | "KRW";

// 보유 정보가 안 뜰 때(에러/빈 목록) 수동 새로고침 없이 자동으로 다시 시도한다.
// 성공(비어있지 않은 목록)하면 폴링을 멈추고, 무한 재시도를 막기 위해 횟수를 제한한다.
export const MAX_AUTO_RELOADS = 6;

// 토스 API 요청 한도(429)에 걸린 경우엔 더 길게 쉬었다 재시도한다 —
// 짧은 간격으로 계속 두드리면 한도가 갱신돼 오히려 복구가 늦어진다.
export function retryDelayMs(tries: number, rateLimited: boolean) {
  return rateLimited
    ? Math.min(8000 * (tries + 1), 30000)
    : Math.min(2000 * (tries + 1), 10000);
}

export function holdingsErrorText(rateLimited: boolean, retrying: boolean) {
  const head = rateLimited
    ? "토스 API 요청 한도를 초과했습니다."
    : "보유 정보를 일시적으로 불러올 수 없습니다.";
  return head + (retrying ? " 잠시 후 자동으로 다시 시도합니다." : "");
}

// ─── 포트폴리오 데이터 캐시 (탭 재방문 시 즉시 표시) ─────────────────────────
// 포트폴리오 탭을 벗어나면 HoldingsBanner·DailyCheckView가 언마운트돼 상태가 사라진다.
// 그래서 탭에 다시 들어올 때마다 토스/야후/환율을 처음부터 재조회하며 "불러오는 중"이
// 반복됐다. 마지막 성공 데이터를 모듈 레벨(페이지 세션 동안 유지) + localStorage(새로고침
// 후에도 유지)에 보관해, 재마운트 시 캐시를 즉시 렌더하고 백그라운드로만 갱신한다.
// 갱신 결과가 캐시와 다를 때만 상태를 교체해 불필요한 깜빡임을 막는다.
const HOLDINGS_CACHE_KEY = "holdings-cache-v1";
const QUOTES_CACHE_KEY = "quotes-cache-v1";
const FX_CACHE_KEY = "fx-cache-v1";

export let holdingsCache: Holding[] | null = null;
export let fxCache: number | null = null;
export let quotesCache: Record<string, Quote> | null = null;
let cacheHydrated = false;

export function setFxCache(v: number | null) {
  fxCache = v;
}

// SSR 안전: 첫 클라이언트 접근 시 한 번만 localStorage → 모듈 캐시로 복원.
export function hydratePortfolioCache() {
  if (cacheHydrated || typeof window === "undefined") return;
  cacheHydrated = true;
  try {
    const h = localStorage.getItem(HOLDINGS_CACHE_KEY);
    if (h) holdingsCache = JSON.parse(h);
    const q = localStorage.getItem(QUOTES_CACHE_KEY);
    if (q) quotesCache = JSON.parse(q);
    const f = localStorage.getItem(FX_CACHE_KEY);
    if (f != null) {
      const n = Number(f);
      if (Number.isFinite(n) && n > 0) fxCache = n;
    }
  } catch {
    // 파싱/저장 실패는 무시 — 캐시 없이 정상 로드로 폴백.
  }
}

export function persistCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패(프라이빗 모드/용량)는 무시 — 모듈 캐시만으로도 탭 전환은 즉시 표시된다.
  }
}

export function persistFx(value: number) {
  persistCache(FX_CACHE_KEY, value);
}

export function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 동시에 여러 컴포넌트(배너·당일 체크·실적 캘린더 등)가 /api/holdings 를 부를 때
// 진행 중인 요청 하나를 공유해 중복 네트워크 호출을 막는다(TASK-59). 결과 본문(파싱된
// 객체)을 공유하며, 요청이 끝나면 in-flight 참조를 비워 이후 호출은 새로 조회한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let holdingsInFlight: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fetchHoldingsShared(): Promise<any> {
  if (holdingsInFlight) return holdingsInFlight;
  holdingsInFlight = fetch("/api/holdings")
    .then(readJsonSafe)
    .finally(() => {
      holdingsInFlight = null;
    });
  return holdingsInFlight;
}

// 조회 결과를 공용 캐시에 반영하고, **호출한 컴포넌트의 상태는 항상 채운다.**
// 배너와 당일 체크가 같은 /api/holdings를 동시에 부르기 때문에, 먼저 응답받은 쪽이
// 모듈 캐시를 갱신하면 나중 쪽은 "캐시와 동일"로 판정돼 상태가 null로 남았다
// (→ 당일 체크 표가 통째로 안 그려지고 시세 조회도 시작되지 않음).
// 캐시·저장소 갱신은 값이 바뀐 경우로 제한하고, 상태는 이전 값과 같으면 참조를 유지해
// 불필요한 리렌더만 막는다.
export function commitHoldings(next: Holding[], setHoldings: Dispatch<SetStateAction<Holding[] | null>>) {
  if (next.length === 0) {
    // 빈 응답으로 멀쩡한 캐시를 덮지 않는다 — 캐시가 아예 없을 때만 반영(재시도 판단용).
    if (holdingsCache == null) setHoldings(next);
    return;
  }
  if (!sameJson(next, holdingsCache)) {
    holdingsCache = next;
    persistCache(HOLDINGS_CACHE_KEY, next);
  }
  setHoldings((prev) => (sameJson(prev, next) ? prev : next));
}

export function commitQuotes(
  map: Record<string, Quote>,
  setQuotes: Dispatch<SetStateAction<Record<string, Quote> | null>>
) {
  // 유효값이 하나도 없으면 일시적 실패로 보고 기존 캐시를 유지한다.
  const hasData = Object.values(map).some((q) => q.price != null || q.changePct != null);
  if (!hasData) {
    if (quotesCache == null) setQuotes(map);
    return;
  }
  if (!sameJson(map, quotesCache)) {
    quotesCache = map;
    persistCache(QUOTES_CACHE_KEY, map);
  }
  setQuotes((prev) => (sameJson(prev, map) ? prev : map));
}
