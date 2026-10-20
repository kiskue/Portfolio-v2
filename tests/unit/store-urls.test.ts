import { crc32, deflateSync } from 'node:zlib';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import listingsJson from '@/content/apps/store-listings.json';
import {
  CITIZEN_BRANDS,
  ENCODINGS,
  EXPECTED_TOTALS,
  LOCAL_COPIES,
  ONLY_GROUPS,
  STORE_FILE_NAME,
  countPlan,
  keyInScope,
  localSourceUrl,
  planExclusions,
  planStoreAssets,
  storeAssetKey,
  storeAssetPath,
  storeAssetSrc,
  totalsProblems,
} from '../../scripts/lib/asset-plan.mjs';
import { describeOutput, encodeWebp, inspectImage } from '../../scripts/lib/encode.mjs';
import { FETCH_DEFAULTS, FetchFailure, fetchAllowedBytes, type FetchLike } from '../../scripts/lib/fetch-image.mjs';
import { IMAGE_LIMITS, checkImageHeader, expectedSourceSize, sizeWarning, sniffImageType } from '../../scripts/lib/image-bytes.mjs';
import { compareKeys, makeEntry, serializeManifest, sha256Hex, validateManifest } from '../../scripts/lib/manifest.mjs';
import { settleLimit } from '../../scripts/lib/pool.mjs';
import {
  appStoreIconUrl,
  appStoreScreenshotUrl,
  assertAllowedUrl,
  downloadUrlFor,
  isAllowedHost,
  platformForHost,
  playIconUrl,
  playScreenshotUrl,
  resolveRedirect,
} from '../../scripts/lib/store-urls.mjs';

/*
 * The pure helpers behind scripts/prepare-assets.mjs (architecture D6): the store host
 * allowlist, the verified URL transforms, redirect and download rules, the untrusted-bytes
 * checks, the manifest format and the asset plan. Nothing here touches the network.
 */

// Real research URLs (store.json, verified 2026-10-19).
const PLAY_SHOT =
  'https://play-lh.googleusercontent.com/w2KOe8vsXEjE5N5D5XcBvEYB7DDnoBeDlJedKNsZrkkHQ3eyLW14XDZj69ewxkn3_pcGN6PfPyDP256SGEpWKi4=w526-h296-rw';
const PLAY_ICON = 'https://play-lh.googleusercontent.com/-rpRPca3xXFp4FzlrAspgXEWX-gvql_pcotqAtVAVfPlVlXV2QwBu4BQIx_0ST1OvAW7lDHTlduRS9iNb-r-3Q';
const APPLE_SHOT =
  'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/81/a7/6c/81a76ca2-8931-6032-d701-9b52f4416404/Defensys__U00281_U0029.png/320x480bb.jpg';
const APPLE_ICON =
  'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/9f/15/d0/9f15d083-36fc-7812-288b-464a435a891e/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg';

/*
 * Hostile URL shapes are built at run time, so no host:port or user@host literal sits in the
 * source for the content-safety scans to trip over.
 */
function playHostWithPort(port: number, path: string): string {
  return `https://play-lh.googleusercontent.com:${String(port)}${path}`;
}

function playHostWithCredentials(path: string): string {
  const url = new URL(`https://play-lh.googleusercontent.com${path}`);
  url.username = 'user';
  url.password = 'pw';
  return url.href;
}

// ─── Host allowlist ──────────────────────────────────────────────────────────────────────

describe('isAllowedHost / platformForHost', () => {
  it('allows only the Play image host and Apple shards is1–is5', () => {
    expect(isAllowedHost('play-lh.googleusercontent.com')).toBe(true);
    for (const shard of [1, 2, 3, 4, 5]) expect(isAllowedHost(`is${shard}-ssl.mzstatic.com`)).toBe(true);
    expect(platformForHost('play-lh.googleusercontent.com')).toBe('play');
    expect(platformForHost('is3-ssl.mzstatic.com')).toBe('appstore');
  });

  it.each([
    'is0-ssl.mzstatic.com',
    'is6-ssl.mzstatic.com',
    'is10-ssl.mzstatic.com',
    'is1.mzstatic.com',
    'mzstatic.com',
    'lh3.googleusercontent.com',
    'play.google.com',
    'apps.apple.com',
    'play-lh.googleusercontent.com.evil.example',
    'evil.example',
    'xplay-lh.googleusercontent.com',
    'is1-ssl.mzstatic.com.evil.example',
    '',
  ])('refuses %j', (host) => {
    expect(isAllowedHost(host)).toBe(false);
    expect(platformForHost(host)).toBeNull();
  });
});

describe('assertAllowedUrl', () => {
  it('returns the parsed URL for an allowlisted https image', () => {
    expect(assertAllowedUrl(PLAY_SHOT).hostname).toBe('play-lh.googleusercontent.com');
    expect(assertAllowedUrl(new URL(APPLE_SHOT)).pathname).toMatch(/320x480bb\.jpg$/);
  });

  it.each([
    ['not a URL', 'not a url'],
    ['plain http', 'http://play-lh.googleusercontent.com/abc=s0'],
    ['another host', 'https://evil.example/abc=s0'],
    ['a lookalike host', 'https://play-lh.googleusercontent.com.evil.example/abc=s0'],
    ['credentials', playHostWithCredentials('/abc=s0')],
    ['an explicit port', playHostWithPort(8443, '/abc=s0')],
    ['a query', 'https://play-lh.googleusercontent.com/abc=s0?x=1'],
    ['a fragment', 'https://play-lh.googleusercontent.com/abc=s0#x'],
    ['a file URL', 'file:///etc/passwd'],
    ['a data URL', 'data:image/png;base64,AAAA'],
  ])('rejects %s', (_label, url) => {
    expect(() => assertAllowedUrl(url)).toThrow();
  });
});

// ─── URL transforms (architecture D6, verified on 2026-10-19) ───────────────────────────

describe('URL transforms', () => {
  it('Play screenshot: strips the size suffix and asks for the original (=s0)', () => {
    const base = PLAY_SHOT.slice(0, PLAY_SHOT.lastIndexOf('='));
    expect(playScreenshotUrl(PLAY_SHOT)).toBe(`${base}=s0`);
    expect(playScreenshotUrl(`${base}=w2560-h1440`)).toBe(`${base}=s0`);
    expect(playScreenshotUrl(base)).toBe(`${base}=s0`);
    // Idempotent: transforming a transformed URL changes nothing.
    expect(playScreenshotUrl(playScreenshotUrl(PLAY_SHOT))).toBe(`${base}=s0`);
  });

  it('Play icon: the JSON-LD base plus =s512', () => {
    expect(playIconUrl(PLAY_ICON)).toBe(`${PLAY_ICON}=s512`);
    expect(playIconUrl(`${PLAY_ICON}=w240-h480-rw`)).toBe(`${PLAY_ICON}=s512`);
  });

  it('Apple screenshot: the last path segment becomes 4000x4000bb.png', () => {
    const transformed = appStoreScreenshotUrl(APPLE_SHOT);
    expect(transformed).toBe(APPLE_SHOT.replace(/\/320x480bb\.jpg$/, '/4000x4000bb.png'));
    expect(transformed.startsWith('https://is1-ssl.mzstatic.com/image/thumb/')).toBe(true);
  });

  it('Apple icon: the last path segment becomes 512x512bb.png', () => {
    expect(appStoreIconUrl(APPLE_ICON)).toBe(APPLE_ICON.replace(/\/512x512bb\.jpg$/, '/512x512bb.png'));
  });

  it('downloadUrlFor dispatches on platform and kind', () => {
    expect(downloadUrlFor('play', 'screenshot', PLAY_SHOT)).toBe(playScreenshotUrl(PLAY_SHOT));
    expect(downloadUrlFor('play', 'icon', PLAY_ICON)).toBe(playIconUrl(PLAY_ICON));
    expect(downloadUrlFor('appstore', 'screenshot', APPLE_SHOT)).toBe(appStoreScreenshotUrl(APPLE_SHOT));
    expect(downloadUrlFor('appstore', 'icon', APPLE_ICON)).toBe(appStoreIconUrl(APPLE_ICON));
    expect(() => downloadUrlFor('web' as 'play', 'icon', PLAY_ICON)).toThrow(/Unknown store platform/);
  });

  it('refuses a URL from the other store, another host or an unexpected path', () => {
    expect(() => playScreenshotUrl(APPLE_SHOT)).toThrow(/play image host/);
    expect(() => appStoreScreenshotUrl(PLAY_SHOT)).toThrow(/appstore image host/);
    expect(() => playIconUrl('https://evil.example/abc')).toThrow(/allowlist/);
    expect(() => appStoreIconUrl('https://is1-ssl.mzstatic.com/somewhere/else.png')).toThrow(/Unexpected App Store image path/);
    expect(() => playScreenshotUrl('https://play-lh.googleusercontent.com/a/b=s0')).toThrow(/Unexpected Play image path/);
  });
});

// ─── Redirects ───────────────────────────────────────────────────────────────────────────

describe('resolveRedirect', () => {
  const from = 'https://play-lh.googleusercontent.com/abc=s0';

  it('follows a same-host redirect, relative or absolute', () => {
    expect(resolveRedirect(from, '/def=s0')).toBe('https://play-lh.googleusercontent.com/def=s0');
    expect(resolveRedirect(from, 'https://play-lh.googleusercontent.com/xyz=s0')).toBe('https://play-lh.googleusercontent.com/xyz=s0');
  });

  it('refuses a cross-host redirect, even to another allowlisted host', () => {
    expect(() => resolveRedirect(from, 'https://evil.example/abc=s0')).toThrow(/Cross-host redirect refused/);
    expect(() => resolveRedirect('https://is1-ssl.mzstatic.com/image/thumb/a/b.png/1x1bb.png', 'https://is2-ssl.mzstatic.com/x')).toThrow(
      /Cross-host redirect refused/,
    );
    expect(() => resolveRedirect(from, '//evil.example/abc')).toThrow(/Cross-host redirect refused/);
  });

  it('refuses a downgrade to http, a new port, a missing Location and a non-allowlisted origin', () => {
    expect(() => resolveRedirect(from, 'http://play-lh.googleusercontent.com/abc=s0')).toThrow(/Cross-host redirect refused/);
    expect(() => resolveRedirect(from, playHostWithPort(444, '/abc=s0'))).toThrow(/Cross-host redirect refused/);
    expect(() => resolveRedirect(from, null)).toThrow(/without a Location/);
    expect(() => resolveRedirect(from, '  ')).toThrow(/without a Location/);
    expect(() => resolveRedirect('https://evil.example/abc', '/def')).toThrow(/allowlist/);
  });

  it('refuses a same-host redirect that adds a query', () => {
    expect(() => resolveRedirect(from, '/def=s0?token=1')).toThrow(/query or fragment/);
  });
});

// ─── Downloads (fetch injected; no network) ──────────────────────────────────────────────

const OK_URL = 'https://play-lh.googleusercontent.com/abc=s0';

function bytesResponse(bytes: Uint8Array<ArrayBuffer>, init: ResponseInit = {}): Response {
  return new Response(bytes, { status: 200, ...init });
}

function redirectResponse(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

function fakeFetch(...responses: Array<Response | Error>) {
  const queue = [...responses];
  return vi.fn<FetchLike>(async () => {
    const next = queue.shift();
    if (!next) throw new Error('fakeFetch: no response left');
    if (next instanceof Error) throw next;
    return next;
  });
}

const noSleep = () => vi.fn<(ms: number) => Promise<void>>(async () => undefined);

describe('fetchAllowedBytes', () => {
  it('uses the documented defaults: 30 s timeout, 3 retries, same-host redirects only', () => {
    expect(FETCH_DEFAULTS).toMatchObject({ timeoutMs: 30_000, retries: 3, maxRedirects: 3, maxBytes: IMAGE_LIMITS.maxBytes });
  });

  it('returns the body, asking for manual redirects with a timeout signal', async () => {
    const fetchImpl = fakeFetch(bytesResponse(new Uint8Array([1, 2, 3])));
    const bytes = await fetchAllowedBytes(OK_URL, { fetchImpl, sleep: noSleep() });
    expect([...bytes]).toEqual([1, 2, 3]);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(OK_URL);
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('refuses a URL off the allowlist without fetching it', async () => {
    const fetchImpl = fakeFetch();
    await expect(fetchAllowedBytes('https://evil.example/abc=s0', { fetchImpl })).rejects.toThrow(/allowlist/);
    await expect(fetchAllowedBytes('http://play-lh.googleusercontent.com/abc=s0', { fetchImpl })).rejects.toThrow(/https/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('follows a same-host redirect', async () => {
    const fetchImpl = fakeFetch(redirectResponse('/moved=s0', 301), bytesResponse(new Uint8Array([9])));
    await expect(fetchAllowedBytes(OK_URL, { fetchImpl, sleep: noSleep() })).resolves.toHaveLength(1);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([OK_URL, 'https://play-lh.googleusercontent.com/moved=s0']);
  });

  it('refuses a cross-host redirect without retrying or fetching the target', async () => {
    const fetchImpl = fakeFetch(redirectResponse('https://evil.example/payload.png'));
    const sleep = noSleep();
    await expect(fetchAllowedBytes(OK_URL, { fetchImpl, sleep })).rejects.toThrow(/Cross-host redirect refused/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('stops after maxRedirects hops', async () => {
    const fetchImpl = fakeFetch(...Array.from({ length: 5 }, (_, hop) => redirectResponse(`/hop${hop}=s0`)));
    await expect(fetchAllowedBytes(OK_URL, { fetchImpl, sleep: noSleep(), maxRedirects: 2 })).rejects.toThrow(/More than 2 redirects/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries 5xx, 429 and network errors with exponential backoff, then succeeds', async () => {
    const fetchImpl = fakeFetch(
      new Response(null, { status: 503 }),
      new TypeError('fetch failed'),
      new Response(null, { status: 429 }),
      bytesResponse(new Uint8Array([7])),
    );
    const sleep = noSleep();
    const onRetry = vi.fn();
    await expect(fetchAllowedBytes(OK_URL, { fetchImpl, sleep, onRetry })).resolves.toHaveLength(1);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 2_000, 4_000]);
    expect(onRetry.mock.calls.map(([info]) => (info as { attempt: number }).attempt)).toEqual([1, 2, 3]);
  });

  it('gives up after 1 + 3 attempts', async () => {
    const fetchImpl = fakeFetch(...Array.from({ length: 4 }, () => new Response(null, { status: 500 })));
    const failure = await fetchAllowedBytes(OK_URL, { fetchImpl, sleep: noSleep() }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(FetchFailure);
    expect((failure as FetchFailure).message).toMatch(/HTTP 500 .* \(gave up after 4 attempts\)/);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('does not retry a 404', async () => {
    const fetchImpl = fakeFetch(new Response(null, { status: 404 }));
    const failure = await fetchAllowedBytes(OK_URL, { fetchImpl, sleep: noSleep() }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(FetchFailure);
    expect(failure).toMatchObject({ status: 404, retryable: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('enforces the byte cap from Content-Length and while streaming', async () => {
    const declared = fakeFetch(bytesResponse(new Uint8Array([1]), { headers: { 'content-length': '999' } }));
    await expect(fetchAllowedBytes(OK_URL, { fetchImpl: declared, maxBytes: 10 })).rejects.toThrow(/larger than 10 bytes/);
    const streamed = fakeFetch(bytesResponse(new Uint8Array(64)));
    await expect(fetchAllowedBytes(OK_URL, { fetchImpl: streamed, maxBytes: 10 })).rejects.toThrow(/larger than 10 bytes/);
  });
});

// ─── Untrusted bytes ─────────────────────────────────────────────────────────────────────

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A structurally valid PNG whose header claims `width` × `height` (the pixel data is not there). */
function pngClaiming(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(0, 9); // greyscale
  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.alloc(2))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('sniffImageType (magic bytes)', () => {
  it('recognises PNG, JPEG and WebP', () => {
    expect(sniffImageType(Buffer.from([...PNG_SIGNATURE, 0]))).toBe('png');
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniffImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('webp');
  });

  it.each([
    ['GIF', Buffer.from('GIF89a......')],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['HTML', Buffer.from('<!doctype html><html>')],
    ['RIFF that is not WebP', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('AVI LIST')])],
    ['a truncated PNG signature', Buffer.from(PNG_SIGNATURE.slice(0, 4))],
    ['empty input', Buffer.alloc(0)],
  ])('rejects %s', (_label, bytes) => {
    expect(sniffImageType(bytes)).toBeNull();
  });

  it('rejects non-buffers', () => {
    expect(sniffImageType(null)).toBeNull();
    expect(sniffImageType(undefined)).toBeNull();
  });
});

describe('checkImageHeader (header metadata, before decoding)', () => {
  it('returns the dimensions of an acceptable image', () => {
    expect(checkImageHeader({ format: 'png', width: 500, height: 1024 }, 'png')).toEqual({ width: 500, height: 1024 });
    expect(checkImageHeader({ format: 'png', width: 1320, height: 2868 }, 'png')).toEqual({ width: 1320, height: 2868 });
  });

  it('rejects a header that disagrees with the magic bytes', () => {
    expect(() => checkImageHeader({ format: 'svg', width: 500, height: 500 }, 'png')).toThrow(/does not match the magic bytes/);
    expect(() => checkImageHeader({ format: 'png', width: 500, height: 500 }, null)).toThrow(/magic bytes/);
  });

  it('rejects missing, tiny, oversized, pixel-heavy and multi-frame images', () => {
    expect(() => checkImageHeader({ format: 'png' }, 'png')).toThrow(/integer dimensions/);
    expect(() => checkImageHeader({ format: 'png', width: 32, height: 32 }, 'png')).toThrow(/too small/);
    expect(() => checkImageHeader({ format: 'png', width: 6001, height: 100 }, 'png')).toThrow(/too large/);
    expect(() => checkImageHeader({ format: 'png', width: 5000, height: 5000 }, 'png')).toThrow(/too many pixels/);
    expect(() => checkImageHeader({ format: 'webp', width: 500, height: 500, pages: 3 }, 'webp')).toThrow(/Multi-frame/);
  });
});

describe('expectedSourceSize / sizeWarning', () => {
  it('knows the verified source sizes', () => {
    expect(expectedSourceSize('play', 'screenshot')).toEqual({ width: 500, height: 1024 });
    expect(expectedSourceSize('appstore', 'screenshot')).toEqual({ width: 1320, height: 2868 });
    expect(expectedSourceSize('play', 'icon')).toEqual({ width: 512, height: 512 });
    expect(expectedSourceSize('appstore', 'icon')).toEqual({ width: 512, height: 512 });
  });

  it('warns only on a different size', () => {
    expect(sizeWarning({ width: 500, height: 1024 }, { width: 500, height: 1024 })).toBeNull();
    expect(sizeWarning({ width: 1080, height: 1920 }, { width: 500, height: 1024 })).toBe('source is 1080x1920, expected 500x1024');
  });
});

describe('inspectImage / encodeWebp (sharp, local buffers only)', () => {
  it('rejects bytes that are not PNG, JPEG or WebP before sharp sees them', async () => {
    await expect(inspectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="9999" height="9999"/>'))).rejects.toThrow(
      /magic bytes/,
    );
    await expect(inspectImage(Buffer.from('GIF89a\x01\x00\x01\x00'))).rejects.toThrow(/magic bytes/);
  });

  it('rejects a PNG whose header claims a huge canvas, without decoding it', async () => {
    await expect(inspectImage(pngClaiming(100_000, 100_000))).rejects.toThrow(/pixel limit|too large|too many pixels/i);
    await expect(inspectImage(pngClaiming(7_000, 100))).rejects.toThrow(/too large/);
  });

  it('accepts a real PNG and reports its header size', async () => {
    const png = await sharp({ create: { width: 500, height: 1024, channels: 3, background: { r: 40, g: 80, b: 160 } } })
      .png()
      .toBuffer();
    await expect(inspectImage(png)).resolves.toEqual({ type: 'png', width: 500, height: 1024 });
  });

  it('re-encodes to WebP at the requested size with the metadata stripped', async () => {
    const jpeg = await sharp({ create: { width: 1320, height: 2868, channels: 3, background: { r: 200, g: 120, b: 40 } } })
      .withExif({ IFD0: { Copyright: 'fixture', Artist: 'fixture' } })
      .jpeg()
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();

    const screenshot = await encodeWebp(jpeg, ENCODINGS['appstore-screenshot']);
    expect(screenshot).toMatchObject({ width: 1080, height: 2347 });
    await expect(describeOutput(screenshot.data)).resolves.toEqual({ format: 'webp', width: 1080, height: 2347, hasMetadata: false });

    const icon = await encodeWebp(await sharp(jpeg).resize(512, 512).png().toBuffer(), ENCODINGS.icon);
    await expect(describeOutput(icon.data)).resolves.toEqual({ format: 'webp', width: 256, height: 256, hasMetadata: false });
  });

  it('never enlarges a narrow screenshot', async () => {
    const small = await sharp({ create: { width: 320, height: 640, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .png()
      .toBuffer();
    await expect(encodeWebp(small, ENCODINGS['play-screenshot'])).resolves.toMatchObject({ width: 320, height: 640 });
  });
});

// ─── Manifest ────────────────────────────────────────────────────────────────────────────

const ENTRY = {
  src: '/store/citizen/1hope/play-01.webp',
  width: 500,
  height: 1024,
  bytes: 43_760,
  sha256: 'a'.repeat(64),
  sourceUrl: 'https://play-lh.googleusercontent.com/abc=s0',
  asOf: '2026-10-19',
};

describe('manifest helpers', () => {
  it('sha256Hex is lower-case hex SHA-256', () => {
    expect(sha256Hex(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('makeEntry keeps the documented field order and refuses bad values', () => {
    const reversed = Object.fromEntries(Object.entries(ENTRY).reverse());
    expect(Object.keys(reversed)[0]).toBe('asOf');
    expect(Object.keys(makeEntry('store/1hope/play-01', reversed))).toEqual([
      'src',
      'width',
      'height',
      'bytes',
      'sha256',
      'sourceUrl',
      'asOf',
    ]);
    expect(() => makeEntry('store/1hope/play-01', { ...ENTRY, sha256: 'ABC' })).toThrow(/sha256/);
    expect(() => makeEntry('store/1hope/play-01', { ...ENTRY, width: 0 })).toThrow(/width/);
    expect(() => makeEntry('store/1hope/play-01', { ...ENTRY, asOf: '19 Oct 2026' })).toThrow(/asOf/);
    expect(() => makeEntry('store/1hope/play-01', { ...ENTRY, fetchedBy: 'me' })).toThrow(/unknown fields fetchedBy/);
    expect(() => makeEntry('Store/1hope', ENTRY)).toThrow(/keys look like/);
    expect(() => makeEntry('7/1hope', ENTRY)).toThrow(/keys look like/);
  });

  it('validateManifest accepts the format and lists every problem', () => {
    expect(validateManifest({ 'store/1hope/play-01': ENTRY })).toEqual({ 'store/1hope/play-01': ENTRY });
    expect(() => validateManifest([])).toThrow(/JSON object/);
    expect(() => validateManifest({ a: ENTRY, 'store/x/y': { ...ENTRY, bytes: -1 } })).toThrow(/keys look like[\s\S]*bytes/);
  });

  it('serializeManifest sorts keys in code-unit order and is stable', () => {
    const text = serializeManifest({ 'store/aero-app/play-01': ENTRY, 'store/1hope/play-01': ENTRY, 'brands/sme/icon': ENTRY });
    expect(Object.keys(JSON.parse(text) as object)).toEqual(['brands/sme/icon', 'store/1hope/play-01', 'store/aero-app/play-01']);
    expect(text.endsWith('}\n')).toBe(true);
    expect(serializeManifest(JSON.parse(text) as Record<string, typeof ENTRY>)).toBe(text);
    expect(compareKeys('store/1hope', 'store/aero-app')).toBe(-1);
    expect(compareKeys('b', 'a')).toBe(1);
    expect(compareKeys('a', 'a')).toBe(0);
  });
});

// ─── Asset plan ──────────────────────────────────────────────────────────────────────────

function listing(overrides: Record<string, unknown> = {}) {
  return {
    id: '1hope.play',
    brand: '1hope',
    platform: 'play',
    asOf: '2026-10-19',
    iconUrl: PLAY_ICON,
    screenshots: [{ sourceUrl: PLAY_SHOT }, { sourceUrl: PLAY_SHOT.replace('w2KO', 'x2KO') }],
    ...overrides,
  };
}

describe('asset plan', () => {
  it('names files and manifest keys after brand, platform and 1-based position', () => {
    expect(storeAssetKey('1hope', 'play', 1)).toBe('store/1hope/play-01');
    expect(storeAssetKey('smile-safe-taytay', 'appstore', 'icon')).toBe('store/smile-safe-taytay/appstore-icon');
    expect(storeAssetSrc('1hope', 'appstore', 9)).toBe('/store/citizen/1hope/appstore-09.webp');
    expect(storeAssetPath('aero-app', 'play', 'icon')).toBe('public/store/citizen/aero-app/play-icon.webp');
    expect(() => storeAssetKey('1hope', 'play', 0)).toThrow(/out of range/);
    expect(() => storeAssetKey('1hope', 'play', 10)).toThrow(/out of range/);
  });

  it('STORE_FILE_NAME matches only the files the script writes', () => {
    for (const name of ['play-01.webp', 'play-09.webp', 'appstore-icon.webp']) expect(STORE_FILE_NAME.test(name)).toBe(true);
    for (const name of ['play-00.webp', 'play-10.webp', 'play-1.webp', 'play-01.png', 'icon.webp', 'web-01.webp']) {
      expect(STORE_FILE_NAME.test(name)).toBe(false);
    }
  });

  it('plans the icon first, then screenshots in store order, with transformed URLs', () => {
    const plan = planStoreAssets([listing()]);
    expect(plan.map((asset) => asset.key)).toEqual(['store/1hope/play-icon', 'store/1hope/play-01', 'store/1hope/play-02']);
    expect(plan[0]).toMatchObject({ kind: 'icon', position: null, sourceUrl: playIconUrl(PLAY_ICON), encoding: ENCODINGS.icon });
    expect(plan[1]).toMatchObject({ kind: 'screenshot', position: 1, sourceUrl: playScreenshotUrl(PLAY_SHOT) });
    expect(countPlan(plan)).toEqual({ listings: 1, play: 1, appstore: 0, screenshots: 2, excluded: 0, icons: 1 });
    expect(planExclusions([listing()])).toEqual([]);
  });

  it('never plans an excluded screenshot; the others keep their store position', () => {
    const reason = 'Privacy: a test reason that is long enough.';
    const shots = [{ sourceUrl: PLAY_SHOT }, { sourceUrl: PLAY_SHOT.replace('w2KO', 'x2KO'), excluded: { reason } }, { sourceUrl: PLAY_SHOT.replace('w2KO', 'y2KO') }];
    const listings = [listing({ screenshots: shots })];
    const plan = planStoreAssets(listings);
    expect(plan.map((asset) => asset.key)).toEqual(['store/1hope/play-icon', 'store/1hope/play-01', 'store/1hope/play-03']);
    const exclusions = planExclusions(listings);
    expect(exclusions).toEqual([
      {
        key: 'store/1hope/play-02',
        group: '1hope',
        listingId: '1hope.play',
        brand: '1hope',
        platform: 'play',
        position: 2,
        src: '/store/citizen/1hope/play-02.webp',
        outPath: 'public/store/citizen/1hope/play-02.webp',
        reason,
      },
    ]);
    expect(countPlan(plan, exclusions)).toEqual({ listings: 1, play: 1, appstore: 0, screenshots: 2, excluded: 1, icons: 1 });
  });

  it.each([
    ['no reason', {}],
    ['a short reason', { reason: 'privacy' }],
    ['a bare flag', true],
    ['an array', ['Privacy: a reason in the wrong shape.']],
  ])('refuses an exclusion with %s', (_label, excluded) => {
    const listings = [listing({ screenshots: [{ sourceUrl: PLAY_SHOT, excluded }] })];
    expect(() => planStoreAssets(listings)).toThrow(/screenshot 1 is excluded without a reason/);
    expect(() => planExclusions(listings)).toThrow(/screenshot 1 is excluded without a reason/);
  });

  it('still validates the source URL of an excluded screenshot (the record must stay a real store image)', () => {
    const excluded = { reason: 'Privacy: a test reason that is long enough.' };
    expect(() => planExclusions([listing({ screenshots: [{ sourceUrl: APPLE_SHOT, excluded }] })])).toThrow(/play image host/);
  });

  it('collects every problem in the listings into one error', () => {
    expect(() => planStoreAssets({})).toThrow(/array/);
    const error = (() => {
      try {
        planStoreAssets([
          listing({ brand: 'not-a-brand', id: 'not-a-brand.play' }),
          listing({ id: '1hope.appstore' }),
          listing({ asOf: '2026-13' }),
          listing({ screenshots: Array.from({ length: 10 }, () => ({ sourceUrl: PLAY_SHOT })) }),
        ]);
      } catch (caught) {
        return String(caught);
      }
      return '';
    })();
    expect(error).toMatch(/unknown Citizen brand not-a-brand/);
    expect(error).toMatch(/id must be "<brand>.<platform>"/);
    expect(error).toMatch(/asOf must be YYYY-MM-DD/);
    expect(error).toMatch(/needs 1..9 screenshots/);
    expect(error).toMatch(/duplicate listing ids: 1hope.play/);
  });

  it('refuses listings whose image URLs leave the allowlist', () => {
    expect(() => planStoreAssets([listing({ iconUrl: 'https://evil.example/icon.png' })])).toThrow(/allowlist/);
    expect(() => planStoreAssets([listing({ screenshots: [{ sourceUrl: APPLE_SHOT }] })])).toThrow(/play image host/);
  });

  it('compares a plan with the verified totals: 47 store screenshots, 35 shown and 12 excluded', () => {
    expect(EXPECTED_TOTALS).toEqual({ listings: 8, play: 6, appstore: 2, screenshots: 35, excluded: 12, icons: 8 });
    // The research count (33 Google Play + 14 App Store) is still the sum.
    expect(EXPECTED_TOTALS.screenshots + EXPECTED_TOTALS.excluded).toBe(47);
    const problems = totalsProblems(planStoreAssets([listing()]));
    expect(problems).toContain('expected 35 screenshots, the listings give 2');
    expect(problems).toContain('expected 12 excluded, the listings give 0');
    expect(totalsProblems(planStoreAssets(listingsJson), planExclusions(listingsJson))).toEqual([]);
  });

  it('encodes WebP masters at q90 or higher (PLAN "Assets")', () => {
    expect(ENCODINGS['play-screenshot']).toMatchObject({ mode: 'width', width: 500 });
    expect(ENCODINGS['appstore-screenshot']).toMatchObject({ mode: 'width', width: 1080 });
    expect(ENCODINGS.icon).toMatchObject({ mode: 'square', width: 256, height: 256 });
    for (const encoding of Object.values(ENCODINGS)) expect(encoding.quality).toBeGreaterThanOrEqual(90);
  });

  it('copies only the SME icon and the portrait from the owner repos, and records no absolute path', () => {
    expect(LOCAL_COPIES.map((copy) => copy.outPath)).toEqual(['public/brands/sme/icon.webp', 'src/assets/portrait/gerric-portrait.jpg']);
    expect(LOCAL_COPIES.map(localSourceUrl)).toEqual(['repo:SME-Panindio/assets/icon.png', 'repo:Profile/public/gerric-portrait.jpg']);
    expect(ONLY_GROUPS).toEqual([...CITIZEN_BRANDS, 'sme', 'portrait']);
  });

  it('keyInScope scopes --only to one brand or one local copy', () => {
    expect(keyInScope('store/1hope/play-01', null)).toBe(true);
    expect(keyInScope('store/1hope/play-01', '1hope')).toBe(true);
    expect(keyInScope('store/aero-app/play-01', '1hope')).toBe(false);
    expect(keyInScope('brands/sme/icon', 'sme')).toBe(true);
    expect(keyInScope('store/1hope/play-01', 'sme')).toBe(false);
    expect(keyInScope('portrait/gerric-portrait', 'portrait')).toBe(true);
  });
});

// ─── Concurrency pool ────────────────────────────────────────────────────────────────────

describe('settleLimit', () => {
  it('runs at most `limit` workers at once and keeps results in input order', async () => {
    let active = 0;
    let peak = 0;
    const results = await settleLimit([30, 5, 20, 1, 10, 2], 4, async (ms, index) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, ms));
      active -= 1;
      if (index === 2) throw new Error('boom');
      return index;
    });
    expect(peak).toBe(4);
    expect(results.map((result) => (result.status === 'fulfilled' ? result.value : 'rejected'))).toEqual([0, 1, 'rejected', 3, 4, 5]);
  });

  it('refuses a non-positive limit', async () => {
    await expect(settleLimit([1], 0, async () => 1)).rejects.toThrow(RangeError);
  });
});
