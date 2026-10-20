/**
 * Downloads one store image as untrusted bytes (architecture D6):
 *   - only https URLs on the store image allowlist;
 *   - redirects are followed by hand, and only on the same host (cross-host redirects throw);
 *   - a 30 s timeout per attempt, 3 retries with exponential backoff for network errors,
 *     timeouts, 408, 429 and 5xx (never for 4xx or allowlist failures);
 *   - a byte cap, enforced while streaming.
 * `fetchImpl` and `sleep` are injectable so tests/unit/store-urls.test.ts can drive it offline.
 */
import { IMAGE_LIMITS } from './image-bytes.mjs';
import { assertAllowedUrl, resolveRedirect } from './store-urls.mjs';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const FETCH_DEFAULTS = Object.freeze({
  timeoutMs: 30_000,
  retries: 3,
  backoffMs: 1_000,
  maxRedirects: 3,
  maxBytes: IMAGE_LIMITS.maxBytes,
});

/** A failed download. `retryable` is true for network errors, timeouts, 408, 429 and 5xx. */
export class FetchFailure extends Error {
  constructor(message, { retryable = false, status = null } = {}) {
    super(message);
    this.name = 'FetchFailure';
    this.retryable = retryable;
    this.status = status;
  }
}

function sleepFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function discard(response) {
  try {
    await response.body?.cancel();
  } catch {
    // The body is not needed; a cancel failure changes nothing.
  }
}

async function readCapped(response, maxBytes, url) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await discard(response);
    throw new FetchFailure(`Response is larger than ${maxBytes} bytes (${declared}): ${url}`);
  }
  if (!response.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) throw new FetchFailure(`Response is larger than ${maxBytes} bytes: ${url}`);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchOnce(url, options) {
  let current = assertAllowedUrl(url).href;
  for (let hop = 0; hop <= options.maxRedirects; hop += 1) {
    let response;
    try {
      response = await options.fetchImpl(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: { accept: 'image/png,image/jpeg,image/webp' },
      });
    } catch (error) {
      throw new FetchFailure(`Network error for ${current}: ${message(error)}`, { retryable: true });
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      await discard(response);
      // Throws (not retryable) for a cross-host redirect or one off the allowlist.
      current = resolveRedirect(current, response.headers.get('location'));
      continue;
    }
    if (!response.ok) {
      await discard(response);
      throw new FetchFailure(`HTTP ${response.status} for ${current}`, {
        retryable: isRetryableStatus(response.status),
        status: response.status,
      });
    }
    try {
      return await readCapped(response, options.maxBytes, current);
    } catch (error) {
      if (error instanceof FetchFailure) throw error;
      throw new FetchFailure(`Download interrupted for ${current}: ${message(error)}`, { retryable: true });
    }
  }
  throw new FetchFailure(`More than ${options.maxRedirects} redirects for ${url}`);
}

/**
 * The bytes at `url`, fetched under the rules above. Throws a FetchFailure (or an allowlist
 * Error) after the last attempt. `overrides` may set any FETCH_DEFAULTS field plus
 * `fetchImpl`, `sleep` and `onRetry({ attempt, delay, error })`.
 */
export async function fetchAllowedBytes(url, overrides = {}) {
  const options = { ...FETCH_DEFAULTS, fetchImpl: globalThis.fetch, sleep: sleepFor, onRetry: null, ...overrides };
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchOnce(url, options);
    } catch (error) {
      const retryable = error instanceof FetchFailure && error.retryable;
      if (!retryable) throw error;
      if (attempt >= options.retries) {
        throw new FetchFailure(`${error.message} (gave up after ${attempt + 1} attempts)`, { status: error.status });
      }
      const delay = options.backoffMs * 2 ** attempt;
      options.onRetry?.({ attempt: attempt + 1, delay, error });
      await options.sleep(delay);
    }
  }
}
