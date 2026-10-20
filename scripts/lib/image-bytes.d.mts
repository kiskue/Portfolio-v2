/** Types for image-bytes.mjs. */
import type { AssetKind, StorePlatform } from './store-urls.mjs';

export type ImageType = 'png' | 'jpeg' | 'webp';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface ImageLimits {
  readonly maxSide: number;
  readonly maxPixels: number;
  readonly minSide: number;
  readonly maxBytes: number;
}

/** The subset of sharp().metadata() the header check reads. */
export interface HeaderMeta {
  readonly format?: string;
  readonly width?: number;
  readonly height?: number;
  readonly pages?: number;
}

export declare const IMAGE_LIMITS: ImageLimits;

export declare function sniffImageType(bytes: Uint8Array | null | undefined): ImageType | null;
export declare function checkImageHeader(
  meta: HeaderMeta | null | undefined,
  sniffed: ImageType | null | undefined,
  limits?: ImageLimits,
): { width: number; height: number };
export declare function expectedSourceSize(platform: StorePlatform, kind: AssetKind): Size;
export declare function sizeWarning(actual: Size, expected: Size): string | null;
