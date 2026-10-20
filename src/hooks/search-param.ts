/*
 * Pure URL helpers for useSearchParam (unit-tested).
 */

/** The param's value when it is one of `allowed`, else the fallback (unknown or missing values). */
export function parseParam<T extends string>(raw: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/**
 * The query string ("?…" or "") after setting `key` to `value`. The fallback value removes the
 * key, so default states keep clean URLs; other params keep their order.
 */
export function withParam(search: string, key: string, value: string, fallback: string): string {
  const params = new URLSearchParams(search);
  if (value === fallback) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : '';
}
