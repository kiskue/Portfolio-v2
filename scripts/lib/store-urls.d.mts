/** Types for store-urls.mjs (the script stays plain ESM; the unit tests import it through these). */

export type StorePlatform = 'play' | 'appstore';
export type AssetKind = 'icon' | 'screenshot';

export declare const PLAY_IMAGE_HOST: 'play-lh.googleusercontent.com';
export declare const PLAY_SCREENSHOT_SUFFIX: '=s0';
export declare const PLAY_ICON_SUFFIX: '=s512';
export declare const APPLE_SCREENSHOT_SEGMENT: '4000x4000bb.png';
export declare const APPLE_ICON_SEGMENT: '512x512bb.png';

export declare function isAllowedHost(hostname: string): boolean;
export declare function platformForHost(hostname: string): StorePlatform | null;
export declare function assertAllowedUrl(input: string | URL): URL;
export declare function playScreenshotUrl(input: string): string;
export declare function playIconUrl(input: string): string;
export declare function appStoreScreenshotUrl(input: string): string;
export declare function appStoreIconUrl(input: string): string;
export declare function downloadUrlFor(platform: StorePlatform, kind: AssetKind, input: string): string;
export declare function resolveRedirect(from: string, location: string | null | undefined): string;
