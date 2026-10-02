// 외부 조회용 TTL 캐시 — 신선하면 재사용, 만료됐으면 다시 받되 **실패하면 직전 값을 쓴다**(TASK-169).
//
// 왜 필요한가: 트랙레코드 탭(/api/calls)은 진입마다 종목당 Yahoo 요청 2건 + SPY 1건을
// 캐시 없이 쐈다(11종목 = 23건). 느렸고, Yahoo 가 일부를 거절하면 그 종목만 현재가 없이
// 채점돼 "반영이 안 된 것처럼" 보였다. 실패를 캐시하면 빈칸이 TTL 동안 굳으므로
// **성공한 값만 저장**하고, 실패 시엔 만료된 직전 성공값으로 폴백한다(빈칸보다 낫다).
//
// 같은 키를 동시에 요청하면 load 는 한 번만 돈다 — 창 복귀 시 사이드바 배지와 트랙레코드 탭이
// /api/calls 를 동시에 부르므로, 이게 없으면 Yahoo 요청이 그대로 두 배가 된다.
//
// 원장(data/calls.jsonl)·보고서 파일은 여기 넣지 않는다 — 그건 매 요청 새로 읽어야
// 새 콜이 즉시 보인다. 이 캐시는 시세·이력 같은 외부 값 전용이다.

export interface TtlCache<V> {
  /** 신선한 값이 있으면 그대로, 없으면 load() — 결과가 isOk 를 통과할 때만 저장한다.
   *  load 가 실패(isOk=false 또는 throw)하면 만료된 직전 값이 있으면 그것을, 없으면 실패 결과를 돌려준다. */
  get(key: string, load: () => Promise<V>): Promise<V>;
  clear(): void;
}

export function createTtlCache<V>(
  ttlMs: number,
  isOk: (v: V) => boolean,
  now: () => number = Date.now
): TtlCache<V> {
  const store = new Map<string, { value: V; at: number }>();
  const inflight = new Map<string, Promise<V>>();

  async function refill(key: string, load: () => Promise<V>): Promise<V> {
    const hit = store.get(key);
    let fresh: V;
    try {
      fresh = await load();
    } catch (err) {
      if (hit) return hit.value;
      throw err;
    }
    if (isOk(fresh)) {
      store.set(key, { value: fresh, at: now() });
      return fresh;
    }
    return hit ? hit.value : fresh;
  }

  return {
    get(key, load) {
      const hit = store.get(key);
      if (hit && now() - hit.at < ttlMs) return Promise.resolve(hit.value);
      const pending = inflight.get(key);
      if (pending) return pending;
      const p = refill(key, load).finally(() => inflight.delete(key));
      inflight.set(key, p);
      return p;
    },
    clear() {
      store.clear();
      inflight.clear();
    },
  };
}
