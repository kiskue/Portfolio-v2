/**
 * Store image URLs: the host allowlist and the verified size transforms (architecture D6,
 * research store.json). Pure functions; tests/unit/store-urls.test.ts covers them.
 *
 * Verified on 2026-10-19:
 *   - Play screenshot: drop the "=w526-h296-rw" style size suffix and add "=s0" → the 500×1024 original.
 *   - Play icon: the JSON-LD base URL plus "=s512" → 512×512.
 *   - Apple screenshot: last path segment → "4000x4000bb.png" → the 1320×2868 original.
 *   - Apple icon: last path segment → "512x512bb.png" → 512×512.
 */

export const PLAY_IMAGE_HOST = 'play-lh.googleusercontent.com';
/** Apple's image CDN shards is1-ssl … is5-ssl. */
const APPLE_IMAGE_HOST = /^is[1-5]-ssl\.mzstatic\.com$/;

/** A Play image path is one opaque id plus an optional "=<size options>" suffix. */
const PLAY_PATH = /^\/[A-Za-z0-9_-]+(?:=[A-Za-z0-9_-]*)?$/;
const PLAY_SIZE_SUFFIX = /=[^/=]*$/;
/** Apple thumbnails end in a size segment such as "320x480bb.jpg" or "512x512bb.png". */
const APPLE_SIZE_SEGMENT = /\/\d+x\d+[a-z]{0,4}\.(?:jpe?g|png|webp)$/;

export const PLAY_SCREENSHOT_SUFFIX = '=s0';
export const PLAY_ICON_SUFFIX = '=s512';
export const APPLE_SCREENSHOT_SEGMENT = '4000x4000bb.png';
export const APPLE_ICON_SEGMENT = '512x512bb.png';

/** True only for the store image hosts: play-lh.googleusercontent.com and is1–is5-ssl.mzstatic.com. */
export function isAllowedHost(hostname) {
  return hostname === PLAY_IMAGE_HOST || APPLE_IMAGE_HOST.test(hostname);
}

/** The platform an allowed host serves images for, or null for any other host. */
export function platformForHost(hostname) {
  if (hostname === PLAY_IMAGE_HOST) return 'play';
  if (APPLE_IMAGE_HOST.test(hostname)) return 'appstore';
  return null;
}

/**
 * Parses a store image URL and checks it: https, an allowlisted host, no credentials, no
 * explicit port, no query or fragment. Returns the parsed URL; throws otherwise.
 */
export function assertAllowedUrl(input) {
  let url;
  try {
    url = new URL(String(input));
  } catch {
    throw new Error(`Not a valid URL: ${String(input)}`);
  }
  if (url.protocol !== 'https:') throw new Error(`Store images must use https: ${url.href}`);
  if (url.username !== '' || url.password !== '') throw new Error(`Store image URLs may not carry credentials: ${url.host}`);
  if (url.port !== '') throw new Error(`Store image URLs may not name a port: ${url.host}`);
  if (!isAllowedHost(url.hostname)) throw new Error(`Host is not on the store image allowlist: ${url.hostname}`);
  if (url.search !== '' || url.hash !== '') throw new Error(`Store image URLs may not carry a query or fragment: ${url.href}`);
  return url;
}

function assertPlatformUrl(input, platform) {
  const url = assertAllowedUrl(input);
  const actual = platformForHost(url.hostname);
  if (actual !== platform) throw new Error(`Expected a ${platform} image host, got ${url.hostname}`);
  if (platform === 'play' && !PLAY_PATH.test(url.pathname)) throw new Error(`Unexpected Play image path: ${url.pathname}`);
  if (platform === 'appstore' && (!url.pathname.startsWith('/image/thumb/') || !APPLE_SIZE_SEGMENT.test(url.pathname))) {
    throw new Error(`Unexpected App Store image path: ${url.pathname}`);
  }
  return url;
}

function withPlaySuffix(input, suffix) {
  const url = assertPlatformUrl(input, 'play');
  url.pathname = url.pathname.replace(PLAY_SIZE_SUFFIX, '') + suffix;
  return url.href;
}

function withAppleSegment(input, segment) {
  const url = assertPlatformUrl(input, 'appstore');
  url.pathname = url.pathname.replace(/\/[^/]*$/, `/${segment}`);
  return url.href;
}

/** The original-size Play screenshot: "…=w526-h296-rw" → "…=s0" (500×1024 for these listings). */
export function playScreenshotUrl(input) {
  return withPlaySuffix(input, PLAY_SCREENSHOT_SUFFIX);
}

/** The 512 px Play icon: "<base>" or "<base>=<anything>" → "<base>=s512". */
export function playIconUrl(input) {
  return withPlaySuffix(input, PLAY_ICON_SUFFIX);
}

/** The original App Store screenshot: ".../320x480bb.jpg" → ".../4000x4000bb.png" (1320×2868). */
export function appStoreScreenshotUrl(input) {
  return withAppleSegment(input, APPLE_SCREENSHOT_SEGMENT);
}

/** The 512 px App Store icon: ".../512x512bb.jpg" → ".../512x512bb.png". */
export function appStoreIconUrl(input) {
  return withAppleSegment(input, APPLE_ICON_SEGMENT);
}

/** The URL actually downloaded for one asset: `platform` is 'play' | 'appstore', `kind` is 'icon' | 'screenshot'. */
export function downloadUrlFor(platform, kind, input) {
  if (platform === 'play') return kind === 'icon' ? playIconUrl(input) : playScreenshotUrl(input);
  if (platform === 'appstore') return kind === 'icon' ? appStoreIconUrl(input) : appStoreScreenshotUrl(input);
  throw new Error(`Unknown store platform: ${String(platform)}`);
}

/**
 * Where a redirect response leads. Only same-host redirects on the allowlist are followed:
 * a missing Location, a different host or a downgrade from https throws.
 */
export function resolveRedirect(from, location) {
  const origin = assertAllowedUrl(from);
  if (location === null || location === undefined || String(location).trim() === '') {
    throw new Error(`Redirect without a Location header from ${origin.href}`);
  }
  let target;
  try {
    target = new URL(String(location), origin);
  } catch {
    throw new Error(`Redirect to an invalid URL from ${origin.href}: ${String(location)}`);
  }
  if (target.host !== origin.host || target.protocol !== origin.protocol) {
    throw new Error(`Cross-host redirect refused: ${origin.host} -> ${target.protocol}//${target.host}`);
  }
  return assertAllowedUrl(target.href).href;
}
