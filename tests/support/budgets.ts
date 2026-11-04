import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

/*
 * Home budgets (PLAN "Performance budgets"; .planning/measurements.md). Measured the way the
 * wave-0 gate measured the framework floor: every JS chunk the prerendered HTML requests
 * (script tags and script preloads, minus the noModule polyfill modern browsers never fetch),
 * each compressed with Node's zlib defaults (gzip level 6, brotli quality 11), then summed.
 */

/** PLAN: Home DOM at most 3,000 nodes (elements, as document.querySelectorAll('*') counts them). */
export const DOM_BUDGET = 3_000;
/** PLAN: Home HTML at most 150 KB brotli (KB = 1,024 B, as in the 40 KB JS allowance). */
export const HTML_BROTLI_BUDGET = 150 * 1024;
/** measurements.md: the 112,555 B brotli floor + 40,960 B (40 KB) for Home. */
export const JS_BROTLI_BUDGET = 153_515;
/** measurements.md: the gzip equivalent next start serves (and Lighthouse CI asserts), rounded up. */
export const JS_GZIP_BUDGET = 180_000;
/** The marker the scene chunk's code carries at runtime (a duplicate of `SCENE_CHUNK_MARKER` in dragon/scene.ts; tests/unit/scene-chunk.test.ts keeps the two equal). */
export const SCENE_CHUNK_MARKER = 'gm-scene-dragon';
/**
 * The scene chunk's brotli cap. PROVISIONAL, and 16,384 B is a hard ceiling, not a clamp: Task 8
 * sets the cap to ceil(M * 1.25 / 1024) * 1024 from the measured brotli size M, and stops and
 * reports if M is above 13,107 B.
 */
export const SCENE_CHUNK_BROTLI_BUDGET = 16_384;

export interface Sizes {
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
}

export function compressedSizes(bytes: Uint8Array): Sizes {
  const buffer = Buffer.from(bytes);
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 6 }).length,
    brotli: brotliCompressSync(buffer, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

export function sumSizes(sizes: readonly Sizes[]): Sizes {
  return sizes.reduce((total, size) => ({ raw: total.raw + size.raw, gzip: total.gzip + size.gzip, brotli: total.brotli + size.brotli }), {
    raw: 0,
    gzip: 0,
    brotli: 0,
  });
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}(?:=(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?`, 'i').exec(tag);
  if (!match) return null;
  return (match[1] ?? match[2] ?? match[3] ?? '').replaceAll('&amp;', '&');
}

/**
 * The same-origin /_next/static JS chunks an HTML document loads, in document order, once each:
 * <script src> and <link rel="preload|modulepreload" as="script">, plus the chunk paths in the
 * inline RSC payload (client components' chunks, which hydration loads). noModule scripts (the
 * polyfill modern browsers never fetch) are left out.
 */
export function htmlScriptChunks(html: string): string[] {
  const urls: string[] = [];
  const noModule = new Set<string>();
  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = attribute(tag, 'src');
    if (!src) continue;
    if (attribute(tag, 'nomodule') === null) urls.push(src);
    else noModule.add(src.replace(/^https?:\/\/[^/]+/, ''));
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
    const href = attribute(tag, 'href');
    if (href && (rel.includes('modulepreload') || (rel.includes('preload') && attribute(tag, 'as') === 'script'))) urls.push(href);
  }
  for (const [path] of html.matchAll(/\/_next\/static\/[\w./-]+?\.js\b/g)) urls.push(path);
  const chunks = urls
    .map((url) => url.replace(/^https?:\/\/[^/]+/, ''))
    .filter((url) => url.startsWith('/_next/static/') && /\.js(\?|$)/.test(url) && !noModule.has(url));
  return [...new Set(chunks)];
}

/** "153,515 B" */
export function bytes(value: number): string {
  return `${value.toLocaleString('en-US')} B`;
}
