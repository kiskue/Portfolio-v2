/**
 * Checks for untrusted image bytes, run BEFORE any pixel decoding (architecture D6).
 * Pure functions; tests/unit/store-urls.test.ts covers them.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes, signature, offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(text) {
  return [...text].map((char) => char.charCodeAt(0));
}

/** The container a buffer starts with, from its magic bytes: 'png', 'jpeg', 'webp', or null for anything else. */
export function sniffImageType(bytes) {
  if (!bytes || typeof bytes.length !== 'number') return null;
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'webp';
  return null;
}

/** Hard limits for any downloaded or copied image; anything beyond them is refused before decoding. */
export const IMAGE_LIMITS = Object.freeze({
  /** Largest accepted width or height (Apple originals are 1320×2868). */
  maxSide: 6000,
  /** Largest accepted pixel count, also passed to sharp as limitInputPixels. */
  maxPixels: 24_000_000,
  /** Smallest accepted width or height. */
  minSide: 64,
  /** Largest accepted file size in bytes. */
  maxBytes: 20 * 1024 * 1024,
});

/**
 * Validates header metadata (as reported by sharp().metadata(), which does not decode pixels)
 * against the sniffed container type and the limits. Returns { width, height }; throws otherwise.
 */
export function checkImageHeader(meta, sniffed, limits = IMAGE_LIMITS) {
  if (sniffed === null || sniffed === undefined) throw new Error('Not a PNG, JPEG or WebP file (magic bytes)');
  if (!meta || meta.format !== sniffed) {
    throw new Error(`Header format ${String(meta?.format)} does not match the magic bytes (${sniffed})`);
  }
  const { width, height } = meta;
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error('Image header has no integer dimensions');
  if (width < limits.minSide || height < limits.minSide) throw new Error(`Image is too small: ${width}x${height}`);
  if (width > limits.maxSide || height > limits.maxSide) throw new Error(`Image is too large: ${width}x${height}`);
  if (width * height > limits.maxPixels) throw new Error(`Image has too many pixels: ${width}x${height}`);
  if (meta.pages !== undefined && meta.pages > 1) throw new Error(`Multi-frame images are not accepted (${meta.pages} frames)`);
  return { width, height };
}

/**
 * The source size each store asset was verified at (research store.json, 2026-10-19).
 * A different size is only a warning: stores can change originals between refreshes.
 */
export function expectedSourceSize(platform, kind) {
  if (kind === 'icon') return { width: 512, height: 512 };
  return platform === 'play' ? { width: 500, height: 1024 } : { width: 1320, height: 2868 };
}

/** A warning when a source differs from its verified size, or null when it matches. */
export function sizeWarning(actual, expected) {
  if (actual.width === expected.width && actual.height === expected.height) return null;
  return `source is ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`;
}
