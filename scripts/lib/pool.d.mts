/** Types for pool.mjs. */

export type Settled<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown };

export declare function settleLimit<I, T>(
  items: readonly I[],
  limit: number,
  worker: (item: I, index: number) => Promise<T>,
): Promise<Settled<T>[]>;
