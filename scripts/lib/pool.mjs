/**
 * Runs `worker(item, index)` over `items` with at most `limit` calls in flight. Resolves to
 * Promise.allSettled-style results in input order, so one failure never hides the others.
 */
export async function settleLimit(items, limit, worker) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit must be a positive integer, got ${String(limit)}`);
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
