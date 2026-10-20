/**
 * sharp steps for untrusted images: inspect the header without decoding, then re-encode to a
 * WebP master with every piece of metadata stripped (sharp drops EXIF, XMP and ICC unless
 * asked to keep them, and converts to sRGB).
 */
import sharp from 'sharp';
import { checkImageHeader, IMAGE_LIMITS, sniffImageType } from './image-bytes.mjs';

/** Magic bytes, then header metadata (no pixel decoding): { type, width, height }. Throws when either check fails. */
export async function inspectImage(bytes) {
  const type = sniffImageType(bytes);
  if (type === null) throw new Error('Not a PNG, JPEG or WebP file (magic bytes)');
  if (bytes.length > IMAGE_LIMITS.maxBytes) throw new Error(`File is larger than ${IMAGE_LIMITS.maxBytes} bytes`);
  const meta = await sharp(bytes, { limitInputPixels: IMAGE_LIMITS.maxPixels }).metadata();
  return { type, ...checkImageHeader(meta, type) };
}

/**
 * Re-encodes to WebP. `encoding.mode` is 'width' (resize to `width`, never enlarging, keep the
 * aspect ratio) or 'square' (cover-crop to width × height). Returns { data, width, height }.
 */
export async function encodeWebp(bytes, encoding) {
  // failOn keeps sharp's default ('warning'), the documented setting for untrusted input.
  let pipeline = sharp(bytes, { limitInputPixels: IMAGE_LIMITS.maxPixels, autoOrient: true });
  pipeline =
    encoding.mode === 'square'
      ? pipeline.resize(encoding.width, encoding.height, { fit: 'cover', position: 'centre' })
      : pipeline.resize({ width: encoding.width, withoutEnlargement: true });
  const { data, info } = await pipeline
    .webp({ quality: encoding.quality, effort: 6, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Dimensions and leftover metadata of an encoded file, for the post-write check. */
export async function describeOutput(bytes) {
  const meta = await sharp(bytes).metadata();
  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    hasMetadata: Boolean(meta.exif || meta.icc || meta.xmp || meta.iptc),
  };
}
