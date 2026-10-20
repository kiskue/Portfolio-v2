import 'server-only';
import { z } from 'zod';
import { citizenBrands } from '@/content/apps/brands';
import type {
  AssetPath,
  CitizenBrandId,
  ISODate,
  InstallBand,
  ScreenImage,
  StoreListing,
  StoreListingId,
  StorePlatform,
} from '@/content/types';
import { isISODate } from '@/lib/format';
import manifestJson from './store-assets.generated.json';
import listingsJson from './store-listings.json';

/**
 * The public store listings: src/content/apps/store-listings.json (the single source of store
 * facts, transcribed from the verified research) joined with the asset manifest that
 * scripts/prepare-assets.mjs writes (src/content/apps/store-assets.generated.json). Both files
 * are validated with zod at build time, and any mismatch between them throws.
 *
 * Server-only data (`import 'server-only'` makes a client import a build error): import it from
 * Server Components (or src/content/derived.ts), never from a client island, so zod and the JSON
 * never reach a client bundle. Counts are derived in src/content/derived.ts, never hard-coded.
 *
 * Excluded screenshots: a screenshot with `"excluded": { "reason": "…" }` in the listings is
 * kept as a record of what the store shows (its alt text describes it) but never reaches the
 * site. scripts/prepare-assets.mjs never fetches it and deletes its file and manifest entry;
 * here it is left out of `storeListings` (so every count, wall and toggle skips it) and listed
 * in `storeExclusions`. Shown screenshots keep their store position in the file name, so a
 * listing's files may skip numbers (e.g. 1hope play-06, then play-08).
 */

const LISTINGS_FILE = 'src/content/apps/store-listings.json';
const MANIFEST_FILE = 'src/content/apps/store-assets.generated.json';

/** A store screenshot that is never shown, and why (store-listings.json `excluded`). */
export interface StoreExclusion {
  readonly listing: StoreListingId;
  /** 1-based position in the store listing: the file number it would have. */
  readonly position: number;
  /** Where its file would be. It must not exist (tests/unit/store-assets.test.ts). */
  readonly src: AssetPath;
  readonly reason: string;
}

/** One file the asset script wrote: `{ src, width, height, bytes, sha256, sourceUrl, asOf }`. */
export interface StoreAssetEntry {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly sourceUrl: string;
  readonly asOf: ISODate;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────────────────

const CITIZEN_BRAND_IDS: ReadonlySet<string> = new Set(citizenBrands.map((brand) => brand.id));
const INSTALL_BAND = /^\d+(?:K|M)?\+$/;
const PLAY_PACKAGE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const APP_STORE_PATH = /^\/[a-z]{2}\/app\/[a-z0-9-]+\/id\d+$/;
const IMAGE_HOSTS: Readonly<Record<StorePlatform, RegExp>> = {
  play: /^play-lh\.googleusercontent\.com$/,
  appstore: /^is[1-5]-ssl\.mzstatic\.com$/,
};
const MAX_ALT = 160;
const MIN_REASON = 20;

const isoDate = z.custom<ISODate>((value) => typeof value === 'string' && isISODate(value), {
  message: 'must be a real date as YYYY-MM-DD',
});
const brandId = z.custom<CitizenBrandId>((value) => typeof value === 'string' && CITIZEN_BRAND_IDS.has(value), {
  message: 'must be a public Citizen brand id from src/content/apps/brands.ts',
});
const installBand = z.custom<InstallBand>((value) => typeof value === 'string' && INSTALL_BAND.test(value), {
  message: 'must be a Google Play install band such as "5K+"',
});
const trimmedText = z
  .string()
  .min(1)
  .refine((value) => value.trim() === value, { message: 'must not start or end with whitespace' });

const screenshotSchema = z.strictObject({
  sourceUrl: z.string(),
  alt: trimmedText.max(MAX_ALT),
  presentation: z.enum(['raw', 'marketing']),
  /** Never shown on the site (privacy or any other reason), with the reason recorded. */
  excluded: z.strictObject({ reason: trimmedText.min(MIN_REASON) }).optional(),
});

function parsedUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function storePageProblem(platform: StorePlatform, value: string): string | null {
  const url = parsedUrl(value);
  if (!url || url.protocol !== 'https:') return 'must be an https store page';
  if (platform === 'play') {
    const id = url.searchParams.get('id') ?? '';
    return url.host === 'play.google.com' && url.pathname === '/store/apps/details' && PLAY_PACKAGE.test(id)
      ? null
      : 'must be https://play.google.com/store/apps/details?id=<package>';
  }
  return url.host === 'apps.apple.com' && APP_STORE_PATH.test(url.pathname) && url.search === ''
    ? null
    : 'must be https://apps.apple.com/<cc>/app/<name>/id<number>';
}

function imageUrlProblem(platform: StorePlatform, value: string): string | null {
  const url = parsedUrl(value);
  if (!url || url.protocol !== 'https:' || url.port !== '' || !IMAGE_HOSTS[platform].test(url.hostname)) {
    return `must be an https image URL on the ${platform === 'play' ? 'Google Play' : 'App Store'} image host`;
  }
  return null;
}

const listingSchema = z
  .strictObject({
    id: z.string(),
    brand: brandId,
    platform: z.enum(['play', 'appstore']),
    name: trimmedText,
    url: z.string(),
    publisher: trimmedText,
    installs: installBand.nullable(),
    rating: z.strictObject({ value: z.number().min(1).max(5), count: z.int().positive() }).nullable(),
    asOf: isoDate,
    iconUrl: z.string(),
    screenshots: z.array(screenshotSchema).min(1).max(9),
  })
  .superRefine((listing, context) => {
    const issue = (path: PropertyKey[], message: string) => context.addIssue({ code: 'custom', path, message });
    if (listing.id !== `${listing.brand}.${listing.platform}`) issue(['id'], 'must be "<brand>.<platform>"');
    if (listing.platform === 'play' && listing.installs === null) issue(['installs'], 'Google Play listings publish an install band');
    if (listing.platform === 'appstore' && listing.installs !== null) issue(['installs'], 'App Store listings have no install band');
    const page = storePageProblem(listing.platform, listing.url);
    if (page) issue(['url'], page);
    const icon = imageUrlProblem(listing.platform, listing.iconUrl);
    if (icon) issue(['iconUrl'], icon);
    listing.screenshots.forEach((shot, index) => {
      const problem = imageUrlProblem(listing.platform, shot.sourceUrl);
      if (problem) issue(['screenshots', index, 'sourceUrl'], problem);
    });
  });

const listingsSchema = z.array(listingSchema).min(1);

const manifestEntrySchema = z.strictObject({
  src: z.string().min(1),
  width: z.int().positive(),
  height: z.int().positive(),
  bytes: z.int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourceUrl: z.string().min(1),
  asOf: isoDate,
});

const manifestSchema = z.record(z.string(), manifestEntrySchema);

type ParsedListing = z.infer<typeof listingSchema>;
type Manifest = Readonly<Record<string, StoreAssetEntry>>;

function parse<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${file} is invalid:\n${z.prettifyError(result.error)}`);
  return result.data;
}

// ─── Join ────────────────────────────────────────────────────────────────────────────────

type Slot = 'icon' | number;

/** Mirrors scripts/lib/asset-plan.mjs: "icon" or 1-based "01".."09". */
function slotName(slot: Slot): string {
  return slot === 'icon' ? 'icon' : String(slot).padStart(2, '0');
}

function assetKey(brand: CitizenBrandId, platform: StorePlatform, slot: Slot): string {
  return `store/${brand}/${platform}-${slotName(slot)}`;
}

function assetSrc(brand: CitizenBrandId, platform: StorePlatform, slot: Slot): AssetPath {
  return `/store/citizen/${brand}/${platform}-${slotName(slot)}.webp`;
}

function buildStoreListings(listings: readonly ParsedListing[], manifest: Manifest): readonly StoreListing[] {
  const problems: string[] = [];
  const used = new Set<string>();
  const excluded = new Set<string>();

  const asset = (listing: ParsedListing, slot: Slot) => {
    const key = assetKey(listing.brand, listing.platform, slot);
    const src = assetSrc(listing.brand, listing.platform, slot);
    used.add(key);
    const entry = manifest[key];
    if (!entry) problems.push(`${listing.id}: the manifest has no "${key}"`);
    else if (entry.src !== src) problems.push(`${key}: src is ${entry.src}, expected ${src}`);
    else if (entry.asOf !== listing.asOf) problems.push(`${key}: asOf ${entry.asOf} differs from the listing's ${listing.asOf}`);
    return { src, width: entry?.width ?? 0, height: entry?.height ?? 0 };
  };

  const joined = listings.map((listing): StoreListing => {
    const id: StoreListingId = `${listing.brand}.${listing.platform}`;
    // The file number is the store position, so it is taken before excluded shots are dropped.
    const screenshots = listing.screenshots.flatMap((shot, index): ScreenImage[] => {
      if (shot.excluded) {
        const key = assetKey(listing.brand, listing.platform, index + 1);
        excluded.add(key);
        if (manifest[key]) problems.push(`${key}: excluded from the site, but the manifest still lists it`);
        return [];
      }
      return [{ ...asset(listing, index + 1), alt: shot.alt, provenance: listing.platform, presentation: shot.presentation }];
    });
    return {
      id,
      brand: listing.brand,
      platform: listing.platform,
      name: listing.name,
      url: listing.url,
      publisher: listing.publisher,
      installs: listing.installs,
      rating: listing.rating,
      asOf: listing.asOf,
      icon: asset(listing, 'icon'),
      screenshots,
    };
  });

  const ids = joined.map((listing) => listing.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) problems.push(`duplicate listing ids: ${[...new Set(duplicateIds)].join(', ')}`);
  // Every screenshot record, shown or excluded, has its own description.
  const alts = listings.flatMap((listing) => listing.screenshots.map((shot) => shot.alt));
  const duplicateAlts = alts.filter((alt, index) => alts.indexOf(alt) !== index);
  if (duplicateAlts.length > 0) problems.push(`alt text must be unique; repeated: ${[...new Set(duplicateAlts)].join(' | ')}`);
  for (const key of Object.keys(manifest)) {
    if (key.startsWith('store/') && !used.has(key) && !excluded.has(key)) problems.push(`${key}: in the manifest but in no listing`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Store listings do not match the asset manifest (${LISTINGS_FILE} vs ${MANIFEST_FILE}; ` +
        `run \`npm run assets:prepare\` after editing the listings):\n  - ${problems.join('\n  - ')}`,
    );
  }
  return joined;
}

function exclusionsOf(listings: readonly ParsedListing[]): readonly StoreExclusion[] {
  return listings.flatMap((listing) =>
    listing.screenshots.flatMap((shot, index): StoreExclusion[] =>
      shot.excluded
        ? [
            {
              listing: `${listing.brand}.${listing.platform}`,
              position: index + 1,
              src: assetSrc(listing.brand, listing.platform, index + 1),
              reason: shot.excluded.reason,
            },
          ]
        : [],
    ),
  );
}

/**
 * Validates raw listings and a raw manifest, then joins them: every shown screenshot and icon
 * gets src, width and height from the manifest, and excluded screenshots are left out. Throws a
 * readable error on any mismatch.
 */
export function joinStoreListings(rawListings: unknown, rawManifest: unknown): readonly StoreListing[] {
  return buildStoreListings(parse(listingsSchema, rawListings, LISTINGS_FILE), parse(manifestSchema, rawManifest, MANIFEST_FILE));
}

/** The excluded screenshots of raw listings (validated), in store order. */
export function excludedScreenshots(rawListings: unknown): readonly StoreExclusion[] {
  return exclusionsOf(parse(listingsSchema, rawListings, LISTINGS_FILE));
}

// ─── Exports ─────────────────────────────────────────────────────────────────────────────

const manifest: Manifest = parse(manifestSchema, manifestJson, MANIFEST_FILE);
const parsedListings: readonly ParsedListing[] = parse(listingsSchema, listingsJson, LISTINGS_FILE);

/**
 * Every public store listing in brand order (store order), Google Play before the App Store,
 * with only the screenshots the site may show.
 */
export const storeListings: readonly StoreListing[] = buildStoreListings(parsedListings, manifest);

/** The screenshots that are never shown, with the reason for each (store order). */
export const storeExclusions: readonly StoreExclusion[] = exclusionsOf(parsedListings);

const manifestBySrc: ReadonlyMap<string, StoreAssetEntry> = new Map(Object.values(manifest).map((entry) => [entry.src, entry]));

export function listingById(id: StoreListingId): StoreListing | undefined {
  return storeListings.find((listing) => listing.id === id);
}

export function listingsForBrand(brand: CitizenBrandId): readonly StoreListing[] {
  return storeListings.filter((listing) => listing.brand === brand);
}

/** The manifest entry (bytes, sha256, source URL, as-of date) behind an asset path, e.g. for /dev/store. */
export function storeAssetBySrc(src: string): StoreAssetEntry | undefined {
  return manifestBySrc.get(src);
}
