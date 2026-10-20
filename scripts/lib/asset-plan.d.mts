/** Types for asset-plan.mjs. */
import type { Size } from './image-bytes.mjs';
import type { AssetKind, StorePlatform } from './store-urls.mjs';

export type PlanBrand = 'smile-safe-taytay' | '1hope' | 'sjdm-app' | 'defensys-safe' | 'safe-icb' | 'aero-app';
/** "icon" or a 1-based screenshot position. */
export type Slot = 'icon' | number;

export interface Totals {
  readonly listings: number;
  readonly play: number;
  readonly appstore: number;
  /** Planned (shown) screenshots. */
  readonly screenshots: number;
  /** Screenshots kept in the listings as records but never fetched or shown. */
  readonly excluded: number;
  readonly icons: number;
}

export interface Encoding {
  readonly mode: 'width' | 'square';
  readonly width: number;
  readonly height?: number;
  readonly quality: number;
}

export interface StoreAsset {
  readonly key: string;
  readonly group: PlanBrand;
  readonly listingId: string;
  readonly brand: PlanBrand;
  readonly platform: StorePlatform;
  readonly kind: AssetKind;
  readonly position: number | null;
  readonly src: `/${string}`;
  readonly outPath: string;
  readonly listedUrl: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly expectedSource: Size;
  readonly encoding: Encoding;
}

/** A screenshot marked `excluded` in the listings: where its file would be, and why it is not. */
export interface StoreExclusionPlan {
  readonly key: string;
  readonly group: PlanBrand;
  readonly listingId: string;
  readonly brand: PlanBrand;
  readonly platform: StorePlatform;
  /** 1-based store position. */
  readonly position: number;
  readonly src: `/${string}`;
  readonly outPath: string;
  readonly reason: string;
}

export interface LocalCopy {
  readonly key: string;
  readonly group: 'sme' | 'portrait';
  readonly source: string;
  readonly src: string;
  readonly outPath: string;
  readonly mode: 'encode' | 'copy';
  readonly encoding: Encoding | null;
}

export declare const CITIZEN_BRANDS: readonly PlanBrand[];
export declare const PLATFORMS: readonly StorePlatform[];
export declare const MAX_SCREENSHOTS: 9;
export declare const EXPECTED_TOTALS: Totals;
export declare const ENCODINGS: {
  readonly 'play-screenshot': Encoding;
  readonly 'appstore-screenshot': Encoding;
  readonly icon: Encoding;
};
export declare const STORE_FILE_NAME: RegExp;
export declare const LOCAL_COPIES: readonly LocalCopy[];
export declare const ONLY_GROUPS: readonly string[];

export declare function storeAssetKey(brand: string, platform: StorePlatform, slot: Slot): string;
export declare function storeAssetSrc(brand: string, platform: StorePlatform, slot: Slot): `/${string}`;
export declare function storeAssetPath(brand: string, platform: StorePlatform, slot: Slot): string;
/** Every store asset to produce, icon first then the shown screenshots in store order; throws listing every problem. */
export declare function planStoreAssets(listings: unknown): readonly StoreAsset[];
/** The excluded screenshots in store order; throws listing every problem. */
export declare function planExclusions(listings: unknown): readonly StoreExclusionPlan[];
export declare function countPlan(assets: readonly StoreAsset[], exclusions?: readonly StoreExclusionPlan[]): Totals;
export declare function totalsProblems(
  assets: readonly StoreAsset[],
  exclusions?: readonly StoreExclusionPlan[],
  expected?: Totals,
): string[];
export declare function localSourceUrl(copy: LocalCopy): string;
export declare function keyInScope(key: string, only: string | null | undefined): boolean;
