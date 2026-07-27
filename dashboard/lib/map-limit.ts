// 동시 실행 수를 제한하며 각 항목을 매핑한다(TASK-70).
// 한 요청이 외부 API(Yahoo 등)로 수십 개 fetch 를 동시에 쏘면 소스 IP 가 차단될 수
// 있으므로, 워커 풀로 동시성을 묶는다. 결과 순서는 입력 순서를 보존한다.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}
