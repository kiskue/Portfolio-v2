/** Types for fetch-image.mjs. */

/** The part of `fetch` the downloader uses; tests inject a fake. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface FetchSettings {
  readonly timeoutMs: number;
  readonly retries: number;
  readonly backoffMs: number;
  readonly maxRedirects: number;
  readonly maxBytes: number;
}

export interface FetchOverrides extends Partial<FetchSettings> {
  readonly fetchImpl?: FetchLike;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly onRetry?: ((info: { attempt: number; delay: number; error: Error }) => void) | null;
}

export declare const FETCH_DEFAULTS: FetchSettings;

export declare class FetchFailure extends Error {
  readonly retryable: boolean;
  readonly status: number | null;
  constructor(message: string, options?: { retryable?: boolean; status?: number | null });
}

export declare function fetchAllowedBytes(url: string, overrides?: FetchOverrides): Promise<Buffer>;
