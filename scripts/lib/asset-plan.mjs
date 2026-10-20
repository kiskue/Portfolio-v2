/**
 * The asset plan: every file scripts/prepare-assets.mjs writes, derived from
 * src/content/apps/store-listings.json plus the two local copies. Pure functions;
 * tests/unit/store-urls.test.ts and tests/unit/store-assets.test.ts use them.
 *
 * Output layout (architecture D6, PLAN "Assets"):
 *   public/store/citizen/<brand>/{play|appstore}-icon.webp
 *   public/store/citizen/<brand>/{play|appstore}-01..09.webp   (NN = the store position)
 *   public/brands/sme/icon.webp
 *   src/assets/portrait/gerric-portrait.jpg                     (copied unchanged)
 *
 * Manifest keys: "store/<brand>/<platform>-<NN|icon>", "brands/sme/icon", "portrait/gerric-portrait".
 *
 * Excluded screenshots: a screenshot with `"excluded": { "reason": "…" }` in the listings stays
 * in the JSON as a record (store position, source URL, alt text) but is never planned: it is
 * never downloaded, its file and manifest entry are removed, and the site never shows it
 * (src/content/apps/store.ts drops it too). The other screenshots keep their store position,
 * so a listing's file numbers may have gaps.
 */
import { expectedSourceSize } from './image-bytes.mjs';
import { downloadUrlFor } from './store-urls.mjs';

/** The six public Citizen brands (src/content/apps/brands.ts), in store order. */
export const CITIZEN_BRANDS = Object.freeze(['smile-safe-taytay', '1hope', 'sjdm-app', 'defensys-safe', 'safe-icb', 'aero-app']);
export const PLATFORMS = Object.freeze(['play', 'appstore']);
/** File names run 01..09. */
export const MAX_SCREENSHOTS = 9;
/** An exclusion reason is a sentence, not a flag. */
const MIN_REASON_LENGTH = 20;

/**
 * The verified totals. The listings transcribe all 47 store screenshots (research store.json,
 * 2026-10-19: 33 Google Play + 14 App Store); 12 are excluded for privacy (2026-10-20), so 35
 * are planned and shown. Update these together with the listings after a refresh or a new
 * exclusion.
 */
export const EXPECTED_TOTALS = Object.freeze({ listings: 8, play: 6, appstore: 2, screenshots: 35, excluded: 12, icons: 8 });

/** WebP masters at q90 (PLAN "Assets"; review T9: masters at q90 or higher). */
export const ENCODINGS = Object.freeze({
  /** Play screenshots keep their native 500 px width. */
  'play-screenshot': Object.freeze({ mode: 'width', width: 500, quality: 90 }),
  /** App Store originals (1320×2868) are resized to 1080 px wide. */
  'appstore-screenshot': Object.freeze({ mode: 'width', width: 1080, quality: 90 }),
  icon: Object.freeze({ mode: 'square', width: 256, height: 256, quality: 90 }),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(position) {
  return String(position).padStart(2, '0');
}

/** "icon" or a 1-based screenshot position → "icon" / "01".."09". */
function slotName(slot) {
  if (slot === 'icon') return 'icon';
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SCREENSHOTS) throw new Error(`Screenshot position out of range: ${String(slot)}`);
  return pad2(slot);
}

/** Manifest key of one store asset, e.g. "store/1hope/play-01" or "store/1hope/appstore-icon". */
export function storeAssetKey(brand, platform, slot) {
  return `store/${brand}/${platform}-${slotName(slot)}`;
}

/** Public URL path of one store asset, e.g. "/store/citizen/1hope/play-01.webp". */
export function storeAssetSrc(brand, platform, slot) {
  return `/store/citizen/${brand}/${platform}-${slotName(slot)}.webp`;
}

/** Repo-relative output path of one store asset. */
export function storeAssetPath(brand, platform, slot) {
  return `public${storeAssetSrc(brand, platform, slot)}`;
}

/** File names the script may write inside public/store/citizen/<brand>/. */
export const STORE_FILE_NAME = /^(?:play|appstore)-(?:0[1-9]|icon)\.webp$/;

/** Problems with one listing record, as far as the asset pipeline needs it. */
function listingProblems(listing, index) {
  const where = `listing[${index}]${listing && typeof listing.id === 'string' ? ` (${listing.id})` : ''}`;
  if (!listing || typeof listing !== 'object') return [`${where}: not an object`];
  const problems = [];
  if (!CITIZEN_BRANDS.includes(listing.brand)) problems.push(`${where}: unknown Citizen brand ${String(listing.brand)}`);
  if (!PLATFORMS.includes(listing.platform)) problems.push(`${where}: unknown platform ${String(listing.platform)}`);
  if (listing.id !== `${listing.brand}.${listing.platform}`) problems.push(`${where}: id must be "<brand>.<platform>"`);
  if (typeof listing.asOf !== 'string' || !ISO_DATE.test(listing.asOf)) problems.push(`${where}: asOf must be YYYY-MM-DD`);
  if (typeof listing.iconUrl !== 'string') problems.push(`${where}: iconUrl missing`);
  const shots = listing.screenshots;
  if (!Array.isArray(shots) || shots.length === 0 || shots.length > MAX_SCREENSHOTS) {
    problems.push(`${where}: needs 1..${MAX_SCREENSHOTS} screenshots`);
  } else {
    shots.forEach((shot, position) => {
      if (!shot || typeof shot.sourceUrl !== 'string') problems.push(`${where}: screenshot ${position + 1} has no sourceUrl`);
      else if (shot.excluded !== undefined && exclusionReason(shot) === null) {
        problems.push(`${where}: screenshot ${position + 1} is excluded without a reason (excluded.reason, ${MIN_REASON_LENGTH}+ characters)`);
      }
    });
  }
  return problems;
}

/** The trimmed reason of an excluded screenshot; null when it is shown or the reason is missing or too short. */
function exclusionReason(shot) {
  const excluded = shot?.excluded;
  if (!excluded || typeof excluded !== 'object' || Array.isArray(excluded) || typeof excluded.reason !== 'string') return null;
  const reason = excluded.reason.trim();
  return reason.length >= MIN_REASON_LENGTH ? reason : null;
}

function asset(listing, kind, position, listedUrl) {
  const slot = kind === 'icon' ? 'icon' : position;
  const { brand, platform } = listing;
  return Object.freeze({
    key: storeAssetKey(brand, platform, slot),
    group: brand,
    listingId: listing.id,
    brand,
    platform,
    kind,
    position: kind === 'icon' ? null : position,
    src: storeAssetSrc(brand, platform, slot),
    outPath: storeAssetPath(brand, platform, slot),
    listedUrl,
    sourceUrl: downloadUrlFor(platform, kind, listedUrl),
    asOf: listing.asOf,
    expectedSource: expectedSourceSize(platform, kind),
    encoding: kind === 'icon' ? ENCODINGS.icon : ENCODINGS[`${platform}-screenshot`],
  });
}

/** An excluded screenshot: where its file would be, so the script can make sure it is not there. */
function exclusion(listing, position, reason) {
  const { brand, platform } = listing;
  // The record must stay a valid store URL even though it is never fetched.
  downloadUrlFor(platform, 'screenshot', listing.screenshots[position - 1].sourceUrl);
  return Object.freeze({
    key: storeAssetKey(brand, platform, position),
    group: brand,
    listingId: listing.id,
    brand,
    platform,
    position,
    src: storeAssetSrc(brand, platform, position),
    outPath: storeAssetPath(brand, platform, position),
    reason,
  });
}

/** Validates the listings once and splits them into planned assets and excluded screenshots. */
function planListings(listings) {
  if (!Array.isArray(listings)) throw new Error('store-listings.json must hold an array of listings');
  const problems = listings.flatMap((listing, index) => listingProblems(listing, index));
  const ids = listings.map((listing) => listing?.id);
  const duplicate = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicate.length > 0) problems.push(`duplicate listing ids: ${[...new Set(duplicate)].join(', ')}`);

  const assets = [];
  const exclusions = [];
  if (problems.length === 0) {
    for (const listing of listings) {
      try {
        assets.push(asset(listing, 'icon', null, listing.iconUrl));
        listing.screenshots.forEach((shot, index) => {
          const reason = exclusionReason(shot);
          if (reason === null) assets.push(asset(listing, 'screenshot', index + 1, shot.sourceUrl));
          else exclusions.push(exclusion(listing, index + 1, reason));
        });
      } catch (error) {
        problems.push(`${listing.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`Invalid store listings:\n  - ${problems.join('\n  - ')}`);
  return { assets: Object.freeze(assets), exclusions: Object.freeze(exclusions) };
}

/**
 * Every store asset to produce (icon first, then the shown screenshots in store order) for
 * every listing. Excluded screenshots are not in it. Throws one error that lists every
 * problem: bad records, duplicate ids, disallowed URLs, exclusions without a reason.
 */
export function planStoreAssets(listings) {
  return planListings(listings).assets;
}

/** The excluded screenshots, in store order: never fetched, and their files must not exist. */
export function planExclusions(listings) {
  return planListings(listings).exclusions;
}

/** Counts of a plan (and its exclusions), for the totals check and the run summary. */
export function countPlan(assets, exclusions = []) {
  const listings = new Set(assets.map((item) => item.listingId));
  const platformOf = new Map(assets.map((item) => [item.listingId, item.platform]));
  return {
    listings: listings.size,
    play: [...platformOf.values()].filter((platform) => platform === 'play').length,
    appstore: [...platformOf.values()].filter((platform) => platform === 'appstore').length,
    screenshots: assets.filter((item) => item.kind === 'screenshot').length,
    excluded: exclusions.length,
    icons: assets.filter((item) => item.kind === 'icon').length,
  };
}

/** Differences between a full plan (with its exclusions) and the expected totals; empty when they match. */
export function totalsProblems(assets, exclusions = [], expected = EXPECTED_TOTALS) {
  const actual = countPlan(assets, exclusions);
  return Object.keys(expected)
    .filter((name) => actual[name] !== expected[name])
    .map((name) => `expected ${expected[name]} ${name}, the listings give ${actual[name]}`);
}

/** The two files copied from the owner's own repos (paths relative to --repos-root). */
export const LOCAL_COPIES = Object.freeze([
  Object.freeze({
    key: 'brands/sme/icon',
    group: 'sme',
    source: 'SME-Panindio/assets/icon.png',
    src: '/brands/sme/icon.webp',
    outPath: 'public/brands/sme/icon.webp',
    mode: 'encode',
    encoding: ENCODINGS.icon,
  }),
  Object.freeze({
    key: 'portrait/gerric-portrait',
    group: 'portrait',
    source: 'Profile/public/gerric-portrait.jpg',
    /** A static import (width, height and blur placeholder come from next/image). */
    src: '@/assets/portrait/gerric-portrait.jpg',
    outPath: 'src/assets/portrait/gerric-portrait.jpg',
    mode: 'copy',
    encoding: null,
  }),
]);

/** The manifest sourceUrl of a local copy: "repo:<path under --repos-root>". */
export function localSourceUrl(copy) {
  return `repo:${copy.source}`;
}

/** Values accepted by --only: a Citizen brand id, "sme" or "portrait". */
export const ONLY_GROUPS = Object.freeze([...CITIZEN_BRANDS, ...LOCAL_COPIES.map((copy) => copy.group)]);

/** Whether a manifest key belongs to the --only group (every key does when `only` is null). */
export function keyInScope(key, only) {
  if (only === null || only === undefined) return true;
  const local = LOCAL_COPIES.find((copy) => copy.group === only);
  return local ? key === local.key : key.startsWith(`store/${only}/`);
}
