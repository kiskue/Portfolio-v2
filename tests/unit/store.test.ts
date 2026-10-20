import { describe, expect, it } from 'vitest';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import manifestJson from '@/content/apps/store-assets.generated.json';
import listingsJson from '@/content/apps/store-listings.json';
import {
  excludedScreenshots,
  joinStoreListings,
  listingById,
  listingsForBrand,
  storeAssetBySrc,
  storeExclusions,
  storeListings,
} from '@/content/apps/store';
import { showcaseEntries, storeSummary } from '@/content/derived';
import type { StoreListingId } from '@/content/types';
import { showInstalls, showRating } from '@/lib/store-rules';

/*
 * The store data (PLAN "Assets", architecture D8 `store`): src/content/apps/store-listings.json,
 * transcribed from the verified research (store.json and store.verify.json, as of 2026-10-19),
 * joined with the asset manifest by src/content/apps/store.ts.
 *
 * Privacy exclusions (2026-10-20, the owner's public-safe rule: no real citizen or customer
 * personal data on the site): 12 of the publisher's 47 store screenshots show personal data in
 * the app UI, so the listings keep them only as records marked `excluded` and the site shows 35.
 */

const ASOF = '2026-10-19';

interface Expected {
  readonly name: string;
  readonly installs: string | null;
  readonly rating: { readonly value: number; readonly count: number } | null;
  /** Screenshots on the store (all transcribed in the listings). */
  readonly screenshots: number;
  /** Store positions excluded from the site for privacy. */
  readonly excluded: readonly number[];
}

/** Research facts per listing: exact store name, install band, rating, screenshot count; plus the exclusions. */
const EXPECTED: Readonly<Partial<Record<StoreListingId, Expected>>> = {
  'smile-safe-taytay.play': { name: 'Smile SAFE Taytay', installs: '5K+', rating: { value: 4.2, count: 27 }, screenshots: 5, excluded: [4, 5] },
  'smile-safe-taytay.appstore': { name: 'Smile SAFE Taytay', installs: null, rating: { value: 4, count: 3 }, screenshots: 5, excluded: [4, 5] },
  '1hope.play': { name: '1Hope', installs: '1K+', rating: { value: 5, count: 9 }, screenshots: 8, excluded: [7] },
  '1hope.appstore': { name: '1Hope', installs: null, rating: null, screenshots: 9, excluded: [5, 6, 8] },
  'sjdm-app.play': { name: 'SJDM App', installs: '10+', rating: null, screenshots: 5, excluded: [4, 5] },
  'defensys-safe.play': { name: 'Defensys SAFE', installs: '10+', rating: null, screenshots: 5, excluded: [4, 5] },
  'safe-icb.play': { name: 'SAFE ICB', installs: '0+', rating: null, screenshots: 5, excluded: [] },
  'aero-app.play': { name: 'AERO App', installs: '1+', rating: null, screenshots: 5, excluded: [] },
};

/** The store positions a listing shows, in store order (1-based). */
function shownPositions(id: StoreListingId): number[] {
  const { screenshots, excluded } = expected(id);
  return Array.from({ length: screenshots }, (_, index) => index + 1).filter((position) => !excluded.includes(position));
}

/** The six public Google Play packages (all verified live on 2026-10-19). */
const PLAY_URLS: Readonly<Record<string, string>> = {
  'smile-safe-taytay': 'https://play.google.com/store/apps/details?id=com.dgsi.sagiptaytay',
  '1hope': 'https://play.google.com/store/apps/details?id=com.dgsi.pagasa',
  'sjdm-app': 'https://play.google.com/store/apps/details?id=com.dgsi.sjdmcitizen',
  'defensys-safe': 'https://play.google.com/store/apps/details?id=com.dgsi.defensyscitizen',
  'safe-icb': 'https://play.google.com/store/apps/details?id=com.dgsi.safeicb',
  'aero-app': 'https://play.google.com/store/apps/details?id=com.dgsi.aeroapp',
};

const APP_STORE_URLS: Readonly<Record<string, string>> = {
  'smile-safe-taytay': 'https://apps.apple.com/ph/app/smile-safe-taytay/id6744604994',
  '1hope': 'https://apps.apple.com/ph/app/1hope/id6745863407',
};

const ids = storeListings.map((listing) => listing.id);

function expected(id: StoreListingId): Expected {
  const facts = EXPECTED[id];
  if (!facts) throw new Error(`No research facts for ${id}`);
  return facts;
}

// ─── Listings ────────────────────────────────────────────────────────────────────────────

describe('store listings', () => {
  it('are 8 listings: 6 on Google Play and 2 on the App Store', () => {
    expect(storeListings).toHaveLength(8);
    expect(storeListings.filter((listing) => listing.platform === 'play')).toHaveLength(6);
    expect(storeListings.filter((listing) => listing.platform === 'appstore')).toHaveLength(2);
    expect(new Set(ids).size).toBe(8);
    expect([...ids].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('use the exact store names', () => {
    for (const listing of storeListings) expect(listing.name, listing.id).toBe(expected(listing.id).name);
    expect(new Set(storeListings.map((listing) => listing.name))).toEqual(
      new Set(['Smile SAFE Taytay', '1Hope', 'SJDM App', 'Defensys SAFE', 'SAFE ICB', 'AERO App']),
    );
    for (const listing of storeListings) expect(listing.name).not.toMatch(/one\s*hope/i);
  });

  it('match the brand names in brands.ts, and every public Citizen brand is on Google Play', () => {
    for (const listing of storeListings) {
      expect(citizenBrands.find((brand) => brand.id === listing.brand)?.name, listing.id).toBe(listing.name);
    }
    for (const brand of citizenBrands) expect(ids, brand.id).toContain(`${brand.id}.play`);
  });

  it('put only Smile SAFE Taytay and 1Hope on the App Store', () => {
    expect(storeListings.filter((listing) => listing.platform === 'appstore').map((listing) => listing.brand)).toEqual([
      'smile-safe-taytay',
      '1hope',
    ]);
  });

  it('give Responder brands no listings', () => {
    const listed = new Set<string>(storeListings.map((listing) => listing.brand));
    for (const brand of responderBrands) expect(listed.has(brand.id), brand.id).toBe(false);
    const citizenIds = new Set<string>(citizenBrands.map((brand) => brand.id));
    for (const brand of listed) expect(citizenIds.has(brand), brand).toBe(true);
  });

  it('follow the brand order of brands.ts, Google Play before the App Store', () => {
    const brandOrder = citizenBrands.map((brand) => brand.id);
    const sorted = [...storeListings].sort(
      (a, b) =>
        brandOrder.indexOf(a.brand) - brandOrder.indexOf(b.brand) || (a.platform === b.platform ? 0 : a.platform === 'play' ? -1 : 1),
    );
    expect(ids).toEqual(sorted.map((listing) => listing.id));
  });

  it('carry the published install bands and ratings, as of 2026-10-19', () => {
    for (const listing of storeListings) {
      expect(listing.installs, listing.id).toBe(expected(listing.id).installs);
      expect(listing.rating, listing.id).toEqual(expected(listing.id).rating);
      expect(listing.asOf, listing.id).toBe(ASOF);
    }
  });

  it('name the publisher: DGSI on Google Play, the LGU accounts on the App Store', () => {
    for (const listing of storeListings.filter((item) => item.platform === 'play')) expect(listing.publisher).toBe('Dynamic Global Soft Inc.');
    expect(listingById('smile-safe-taytay.appstore')?.publisher).toBe('Municipal Government of Taytay Rizal');
    expect(listingById('1hope.appstore')?.publisher).toBe('Barangay Government of Bagong Pag-asa');
  });

  it('link to the public listing pages only', () => {
    for (const listing of storeListings) {
      const page = listing.platform === 'play' ? PLAY_URLS[listing.brand] : APP_STORE_URLS[listing.brand];
      expect(listing.url, listing.id).toBe(page);
    }
  });
});

// ─── Display rules (src/lib/store-rules.ts) ──────────────────────────────────────────────

describe('store display thresholds', () => {
  it('show installs only from 1K+: Smile SAFE Taytay and 1Hope on Google Play', () => {
    expect(storeListings.filter((listing) => showInstalls(listing.installs)).map((listing) => listing.id)).toEqual([
      'smile-safe-taytay.play',
      '1hope.play',
    ]);
  });

  it('show ratings only from 5 ratings: not the 3-rating App Store score', () => {
    expect(storeListings.filter((listing) => showRating(listing.rating)).map((listing) => listing.id)).toEqual([
      'smile-safe-taytay.play',
      '1hope.play',
    ]);
    expect(showRating(listingById('smile-safe-taytay.appstore')?.rating)).toBe(false);
  });

  it('feed the derived headline facts: 5K+ installs and 4.2 from 27 ratings, and the 35 shown screenshots', () => {
    expect(storeSummary).toMatchObject({ listings: 8, play: 6, appstore: 2, publicBrands: 6, screenshots: 35, asOf: ASOF });
    expect(storeSummary.topInstalls).toEqual({ listing: 'smile-safe-taytay.play', brand: 'smile-safe-taytay', installs: '5K+' });
    expect(storeSummary.topRating).toEqual({ listing: 'smile-safe-taytay.play', brand: 'smile-safe-taytay', value: 4.2, count: 27 });
  });
});

// ─── Screenshots and icons (joined from the manifest) ────────────────────────────────────

describe('store images', () => {
  it('transcribe every store screenshot: 5/8/5/5/5/5 on Play, 5 and 9 on the App Store, 47 in total', () => {
    for (const raw of listingsJson) expect(raw.screenshots, raw.id).toHaveLength(expected(raw.id as StoreListingId).screenshots);
    expect(listingsJson.reduce((total, raw) => total + raw.screenshots.length, 0)).toBe(47);
  });

  it('show 35 of them: 3/7/3/3/5/5 on Play, 3 and 6 on the App Store', () => {
    for (const listing of storeListings) expect(listing.screenshots, listing.id).toHaveLength(shownPositions(listing.id).length);
    expect(storeListings.map((listing) => listing.screenshots.length)).toEqual([3, 3, 7, 6, 3, 3, 5, 5]);
    expect(storeListings.reduce((total, listing) => total + listing.screenshots.length, 0)).toBe(35);
  });

  it('take src, width and height from the manifest; each file is named after its store position', () => {
    for (const listing of storeListings) {
      expect(listing.icon).toEqual({ src: `/store/citizen/${listing.brand}/${listing.platform}-icon.webp`, width: 256, height: 256 });
      const positions = shownPositions(listing.id);
      listing.screenshots.forEach((image, index) => {
        const src = `/store/citizen/${listing.brand}/${listing.platform}-${String(positions[index]).padStart(2, '0')}.webp`;
        expect(image.src).toBe(src);
        expect(image.provenance).toBe(listing.platform);
        expect({ width: image.width, height: image.height }, src).toEqual(
          listing.platform === 'play' ? { width: 500, height: 1024 } : { width: 1080, height: 2347 },
        );
        expect(storeAssetBySrc(src)).toMatchObject({ width: image.width, height: image.height, asOf: listing.asOf });
      });
    }
  });

  it('have real, unique alt text of at most 160 characters', () => {
    const alts = storeListings.flatMap((listing) => listing.screenshots.map((image) => image.alt));
    expect(new Set(alts).size).toBe(alts.length);
    for (const alt of alts) {
      expect(alt.trim()).toBe(alt);
      expect(alt.length, alt).toBeGreaterThanOrEqual(20);
      expect(alt.length, alt).toBeLessThanOrEqual(160);
      expect(alt, alt).not.toMatch(/\[\[|\]\]/);
      expect(alt, alt).not.toMatch(/screenshot \d+ of \d+/i);
      expect(alt, alt).not.toMatch(/(?:\+?63|\b0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/);
      expect(alt, alt).not.toMatch(/one\s*hope/i);
    }
  });

  it('classify every screenshot; a raw one must fit the phone canvas', () => {
    for (const listing of storeListings) {
      for (const image of listing.screenshots) {
        expect(['raw', 'marketing']).toContain(image.presentation);
        // Raw captures go inside a 390×844 PhoneFrame, so their aspect must match within 3%.
        if (image.presentation === 'raw') expect(Math.abs(image.width / image.height / (390 / 844) - 1), image.src).toBeLessThan(0.03);
      }
    }
  });
});

// ─── Privacy exclusions ──────────────────────────────────────────────────────────────────

describe('excluded screenshots', () => {
  const excludedSrcs = new Set(storeExclusions.map((exclusion) => exclusion.src));

  it('are the 12 store images that show personal data in the app UI, in store order', () => {
    const planned = (Object.keys(EXPECTED) as StoreListingId[]).flatMap((id) =>
      expected(id).excluded.map((position) => ({ listing: id, position })),
    );
    expect(storeExclusions.map(({ listing, position }) => ({ listing, position }))).toEqual(planned);
    expect(storeExclusions).toHaveLength(12);
    expect(excludedScreenshots(listingsJson)).toEqual(storeExclusions);
  });

  it('record a privacy reason that names the kind of data, never the data itself', () => {
    for (const exclusion of storeExclusions) {
      const [brand, platform] = exclusion.listing.split('.');
      expect(exclusion.src).toBe(`/store/citizen/${brand}/${platform}-${String(exclusion.position).padStart(2, '0')}.webp`);
      expect(exclusion.reason, exclusion.src).toMatch(/^Privacy: .{20,}\.$/);
      // No numbers: no house or lot numbers, plus codes, user ids or phone numbers.
      expect(exclusion.reason, exclusion.src).not.toMatch(/\d/);
    }
  });

  it('never reach the site: no listing image, manifest entry or Showcase tile points at one', () => {
    for (const listing of storeListings) {
      for (const image of listing.screenshots) expect(excludedSrcs.has(image.src), image.src).toBe(false);
    }
    for (const src of excludedSrcs) expect(storeAssetBySrc(src), src).toBeUndefined();
    const manifestSrcs = new Set(Object.values(manifestJson).map((entry) => entry.src));
    for (const src of excludedSrcs) expect(manifestSrcs.has(src), src).toBe(false);
    const tiles = showcaseEntries.flatMap((entry) => (entry.screen.kind === 'image' ? [entry.screen.image.src] : []));
    expect(tiles).toHaveLength(35);
    for (const src of tiles) expect(excludedSrcs.has(src), src).toBe(false);
  });
});

// ─── Lookups ─────────────────────────────────────────────────────────────────────────────

describe('listingById / listingsForBrand', () => {
  it('find listings by id', () => {
    expect(listingById('1hope.appstore')?.name).toBe('1Hope');
    expect(listingById('sjdm-app.appstore')).toBeUndefined();
  });

  it('list a brand’s listings, Google Play first', () => {
    expect(listingsForBrand('smile-safe-taytay').map((listing) => listing.id)).toEqual(['smile-safe-taytay.play', 'smile-safe-taytay.appstore']);
    expect(listingsForBrand('aero-app').map((listing) => listing.id)).toEqual(['aero-app.play']);
  });
});

// ─── Validation and join errors ──────────────────────────────────────────────────────────

type RawShot = Record<string, unknown>;
type RawListing = Record<string, unknown> & { screenshots: RawShot[] };

function rawListings(): RawListing[] {
  return structuredClone(listingsJson) as unknown as RawListing[];
}

function rawManifest(): Record<string, Record<string, unknown>> {
  return structuredClone(manifestJson) as unknown as Record<string, Record<string, unknown>>;
}

function joinError(listings: unknown, manifest: unknown): string {
  try {
    joinStoreListings(listings, manifest);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('joinStoreListings did not throw');
}

function listing(listings: RawListing[], id: StoreListingId): RawListing {
  const found = listings.find((item) => item.id === id);
  if (!found) throw new Error(`fixture: no ${id}`);
  return found;
}

describe('joinStoreListings', () => {
  it('rebuilds exactly the exported listings from the two JSON files', () => {
    expect(joinStoreListings(rawListings(), rawManifest())).toEqual(storeListings);
  });

  it('throws when the manifest lacks a file, has a stray one, or disagrees on src or asOf', () => {
    const missing = rawManifest();
    delete missing['store/1hope/play-08'];
    const missingError = joinError(rawListings(), missing);
    expect(missingError).toMatch(/1hope\.play: the manifest has no "store\/1hope\/play-08"/);
    expect(missingError).toMatch(/run `npm run assets:prepare`/);

    const stray = rawManifest();
    stray['store/1hope/play-09'] = { ...stray['store/1hope/play-08'], src: '/store/citizen/1hope/play-09.webp' };
    expect(joinError(rawListings(), stray)).toMatch(/store\/1hope\/play-09: in the manifest but in no listing/);

    const moved = rawManifest();
    moved['store/aero-app/play-icon'] = { ...moved['store/aero-app/play-icon'], src: '/store/aero-app/icon.webp' };
    expect(joinError(rawListings(), moved)).toMatch(/store\/aero-app\/play-icon: src is \/store\/aero-app\/icon\.webp/);

    const stale = rawListings();
    listing(stale, 'safe-icb.play').asOf = '2026-10-18';
    expect(joinError(stale, rawManifest())).toMatch(/asOf 2026-10-19 differs from the listing's 2026-10-18/);
  });

  it('throws on a screenshot added to the listings but never fetched', () => {
    const extra = rawListings();
    const shots = listing(extra, 'sjdm-app.play').screenshots;
    shots.push({ ...shots[0], alt: 'A sixth SJDM App screenshot that the script has not downloaded yet' });
    expect(joinError(extra, rawManifest())).toMatch(/the manifest has no "store\/sjdm-app\/play-06"/);
  });

  it('throws on repeated alt text', () => {
    const repeated = rawListings();
    const shots = listing(repeated, '1hope.play').screenshots;
    shots[1] = { ...shots[1], alt: shots[0]?.alt };
    expect(joinError(repeated, rawManifest())).toMatch(/alt text must be unique/);
  });

  it('keeps an excluded screenshot out until the asset script has removed its file and entry', () => {
    // A manifest entry for an excluded screenshot (its file was put back) fails the build.
    const leftover = rawManifest();
    leftover['store/1hope/play-07'] = { ...leftover['store/1hope/play-08'], src: '/store/citizen/1hope/play-07.webp' };
    expect(joinError(rawListings(), leftover)).toMatch(/store\/1hope\/play-07: excluded from the site, but the manifest still lists it/);

    // A new exclusion fails until `npm run assets:prepare` deletes the file and its entry.
    const newly = rawListings();
    listing(newly, 'safe-icb.play').screenshots[0]!.excluded = { reason: 'Privacy: a test exclusion with a long enough reason.' };
    expect(joinError(newly, rawManifest())).toMatch(/store\/safe-icb\/play-01: excluded from the site, but the manifest still lists it/);

    // Lifting an exclusion fails until the script fetches the image again.
    const lifted = rawListings();
    delete listing(lifted, '1hope.play').screenshots[6]!.excluded;
    expect(joinError(lifted, rawManifest())).toMatch(/1hope\.play: the manifest has no "store\/1hope\/play-07"/);
  });

  it.each<[string, (listings: RawListing[]) => void, RegExp]>([
    ['an App Store install band', (all) => void (listing(all, '1hope.appstore').installs = '1K+'), /App Store listings have no install band/],
    ['a Play listing without an install band', (all) => void (listing(all, 'aero-app.play').installs = null), /publish an install band/],
    ['a malformed install band', (all) => void (listing(all, 'aero-app.play').installs = '1,000+'), /install band/],
    ['a Responder brand', (all) => void (listing(all, 'aero-app.play').brand = 'sjdm'), /public Citizen brand id/],
    ['an id that is not brand.platform', (all) => void (listing(all, 'aero-app.play').id = 'aero.play'), /<brand>\.<platform>/],
    [
      'an image off the store hosts',
      (all) => void (listing(all, 'safe-icb.play').screenshots[0]!.sourceUrl = 'https://evil.example/shot.png'),
      /image host/,
    ],
    ['a store page that is not a listing', (all) => void (listing(all, 'safe-icb.play').url = 'https://play.google.com/store/search?q=safe'), /details\?id=/],
    ['alt text over 160 characters', (all) => void (listing(all, 'safe-icb.play').screenshots[0]!.alt = 'x'.repeat(161)), /160/],
    ['empty alt text', (all) => void (listing(all, 'safe-icb.play').screenshots[0]!.alt = ''), /alt/],
    ['an unknown presentation', (all) => void (listing(all, 'safe-icb.play').screenshots[0]!.presentation = 'framed'), /presentation/],
    ['a zero-count rating', (all) => void (listing(all, '1hope.play').rating = { value: 5, count: 0 }), /rating/],
    ['an impossible date', (all) => void (listing(all, '1hope.play').asOf = '2026-02-30'), /YYYY-MM-DD/],
    ['an unknown field', (all) => void (listing(all, '1hope.play').downloads = 1000), /downloads/],
    ['an exclusion without a reason', (all) => void (listing(all, '1hope.play').screenshots[6]!.excluded = {}), /excluded\.reason/],
    ['a one-word exclusion reason', (all) => void (listing(all, '1hope.play').screenshots[6]!.excluded = { reason: 'privacy' }), /excluded\.reason/],
    ['a bare exclusion flag', (all) => void (listing(all, '1hope.play').screenshots[6]!.excluded = true), /excluded/],
  ])('rejects %s in store-listings.json', (_label, mutate, message) => {
    const listings = rawListings();
    mutate(listings);
    const error = joinError(listings, rawManifest());
    expect(error).toMatch(/src\/content\/apps\/store-listings\.json is invalid/);
    expect(error).toMatch(message);
  });

  it('rejects a malformed manifest entry', () => {
    const manifest = rawManifest();
    manifest['store/1hope/play-01'] = { ...manifest['store/1hope/play-01'], sha256: 'not-a-hash' };
    expect(joinError(rawListings(), manifest)).toMatch(/store-assets\.generated\.json is invalid/);
  });
});
