import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { apps } from '@/content/apps/apps';
import { citizenBrands } from '@/content/apps/brands';
import manifestJson from '@/content/apps/store-assets.generated.json';
import listingsJson from '@/content/apps/store-listings.json';
import { storeExclusions, storeListings } from '@/content/apps/store';
import { LOCAL_COPIES, planExclusions, planStoreAssets } from '../../scripts/lib/asset-plan.mjs';
import { MANIFEST_PATH, serializeManifest, validateManifest, type ManifestEntry } from '../../scripts/lib/manifest.mjs';

/*
 * The committed files scripts/prepare-assets.mjs wrote (PLAN "Assets", architecture D6/D8):
 * 35 store screenshots and 8 store icons under public/store/citizen/, the SME icon and the
 * portrait. Each must exist and match src/content/apps/store-assets.generated.json byte for byte.
 * The 12 screenshots excluded for privacy (store-listings.json `excluded`) must exist nowhere
 * under public/.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const STORE_DIR = join(PUBLIC, 'store', 'citizen');

const manifest: Readonly<Record<string, ManifestEntry>> = validateManifest(manifestJson);
const entries = Object.entries(manifest);
const storeEntries = entries.filter(([key]) => key.startsWith('store/'));
const plan = planStoreAssets(listingsJson);
const exclusions = planExclusions(listingsJson);

/**
 * SHA-256 of the WebP masters deleted when the privacy exclusions were made (2026-10-20), so a
 * copy under any name or folder is still caught. The SJDM App and Defensys SAFE files were
 * byte-identical (the same store images), hence 10 hashes for 12 files.
 */
const REMOVED_MASTERS: ReadonlySet<string> = new Set([
  '5f52dbf2fdfe22c8662b03a78d58352e6372deee33795c1f0b817b57b2a47de8', // smile-safe-taytay play-04
  'd921e2042f4a211e1d98ad9d46a40df95371f365f521c6b2312aac5de1c16e28', // smile-safe-taytay play-05
  '74c793bd48331f15c0f4d9673ccbf382409fd90aa86509522b563a4d9784d1d0', // smile-safe-taytay appstore-04
  '42e7d1363f0aad0c3b01cc5a6dadd70d24707597ecc3fa1c3b978862e4acf26e', // smile-safe-taytay appstore-05
  'bb4d968bd4b9dddd9289700fd295ad8201a58aa439bd9bbf5ffa26c0b68e1f5c', // 1hope play-07
  'c2dc7bd495cf0501eaae2b61b5e6fa19022dc1cfedf9cd8210240c18db3a2854', // 1hope appstore-05
  'c7a96bdd7b9d5b0c2cad7597a16e9d51c4a553140f5a5fd69bf6357608862396', // 1hope appstore-06
  '38eb50ead529a9c74a4cbdb09fdd15ea69b3d88856010ee7ed014bae8877202c', // 1hope appstore-08
  '4b2f3c09b382b6fc008b7c80675ddf66ba7dbf6fd5a5e96d5e23aa26ede003eb', // sjdm-app and defensys-safe play-04
  '29214c52c224822ebbc5108d0f6b49655013bcbd58b40db4d461cad7f9415225', // sjdm-app and defensys-safe play-05
]);

/** Where a manifest entry's file lives: public/<src>, or the portrait's static-import path. */
function fileFor(key: string, entry: ManifestEntry): string {
  const copy = LOCAL_COPIES.find((item) => item.key === key);
  return join(ROOT, copy ? copy.outPath : join('public', entry.src));
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const toPosix = (path: string) => path.replaceAll('\\', '/');

interface FileFacts {
  readonly bytes: number;
  readonly sha256: string;
  readonly format: string | undefined;
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly hasMetadata: boolean;
}

const facts = new Map<string, FileFacts | null>();

beforeAll(async () => {
  for (const [key, entry] of entries) {
    const path = fileFor(key, entry);
    if (!existsSync(path)) {
      facts.set(key, null);
      continue;
    }
    const bytes = readFileSync(path);
    const meta = await sharp(bytes).metadata();
    facts.set(key, {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      format: meta.format,
      width: meta.width,
      height: meta.height,
      hasMetadata: Boolean(meta.exif || meta.icc || meta.xmp || meta.iptc),
    });
  }
});

// ─── Manifest ────────────────────────────────────────────────────────────────────────────

describe('store-assets.generated.json', () => {
  it('is valid and written exactly as the script serializes it (sorted keys)', () => {
    const text = readFileSync(join(ROOT, MANIFEST_PATH), 'utf8').replaceAll('\r\n', '\n');
    expect(serializeManifest(validateManifest(JSON.parse(text)))).toBe(text);
  });

  it('lists 35 screenshots, 8 icons, the SME icon and the portrait', () => {
    expect(storeEntries.filter(([key]) => !key.endsWith('-icon'))).toHaveLength(35);
    expect(storeEntries.filter(([key]) => key.endsWith('-icon'))).toHaveLength(8);
    expect(entries.map(([key]) => key).filter((key) => !key.startsWith('store/'))).toEqual(['brands/sme/icon', 'portrait/gerric-portrait']);
  });

  it('matches the plan the script derives from store-listings.json (keys, paths, source URLs, as-of dates)', () => {
    expect(storeEntries.map(([key]) => key).sort()).toEqual(plan.map((asset) => asset.key).sort());
    for (const asset of plan) {
      expect(manifest[asset.key], asset.key).toMatchObject({ src: asset.src, sourceUrl: asset.sourceUrl, asOf: asset.asOf });
    }
  });

  it('records only allowlisted https store sources, or a repo-relative source for the two local copies', () => {
    for (const [key, entry] of storeEntries) {
      expect(new URL(entry.sourceUrl).hostname, key).toMatch(/^(?:play-lh\.googleusercontent\.com|is[1-5]-ssl\.mzstatic\.com)$/);
    }
    expect(manifest['brands/sme/icon']?.sourceUrl).toBe('repo:SME-Panindio/assets/icon.png');
    expect(manifest['portrait/gerric-portrait']?.sourceUrl).toBe('repo:Profile/public/gerric-portrait.jpg');
  });
});

// ─── Files ───────────────────────────────────────────────────────────────────────────────

describe('committed asset files', () => {
  it('exist and match the manifest: bytes, sha256, format and dimensions', () => {
    const problems = entries.flatMap(([key, entry]) => {
      const file = facts.get(key);
      if (!file) return [`${key}: ${toPosix(fileFor(key, entry))} is missing`];
      const found: string[] = [];
      if (file.bytes !== entry.bytes) found.push(`${key}: ${file.bytes} bytes, manifest says ${entry.bytes}`);
      if (file.sha256 !== entry.sha256) found.push(`${key}: sha256 differs from the manifest`);
      if (file.width !== entry.width || file.height !== entry.height) {
        found.push(`${key}: ${file.width}x${file.height}, manifest says ${entry.width}x${entry.height}`);
      }
      return found;
    });
    expect(problems).toEqual([]);
  });

  it('are WebP masters without metadata: Play 500×1024, App Store 1080 wide, icons 256×256', () => {
    for (const [key, entry] of storeEntries) {
      const file = facts.get(key);
      expect(file?.format, key).toBe('webp');
      expect(file?.hasMetadata, key).toBe(false);
      expect(entry.src, key).toMatch(/^\/store\/citizen\/[a-z0-9-]+\/(?:play|appstore)-(?:0[1-9]|icon)\.webp$/);
      if (key.endsWith('-icon')) expect([entry.width, entry.height], key).toEqual([256, 256]);
      else if (key.includes('/play-')) expect([entry.width, entry.height], key).toEqual([500, 1024]);
      else expect(entry.width, key).toBe(1080);
    }
  });

  it('stay small: screenshots at most 256 KB, icons at most 32 KB', () => {
    for (const [key, entry] of storeEntries) {
      expect(entry.bytes, key).toBeLessThanOrEqual(key.endsWith('-icon') ? 32 * 1024 : 256 * 1024);
    }
  });

  it('leave nothing else in public/store/citizen', () => {
    const onDisk = walk(STORE_DIR).map((path) => `/${toPosix(path.slice(PUBLIC.length + 1))}`).sort();
    expect(onDisk).toEqual(storeEntries.map(([, entry]) => entry.src).sort());
    expect(readdirSync(STORE_DIR).sort()).toEqual(citizenBrands.map((brand) => brand.id).sort());
  });

  it('include the SME icon as a 256×256 WebP and the portrait as the unchanged JPEG', () => {
    expect(manifest['brands/sme/icon']).toMatchObject({ src: '/brands/sme/icon.webp', width: 256, height: 256 });
    expect(facts.get('brands/sme/icon')).toMatchObject({ format: 'webp', hasMetadata: false });
    expect(manifest['portrait/gerric-portrait']).toMatchObject({ src: '@/assets/portrait/gerric-portrait.jpg', width: 765, height: 944 });
    expect(facts.get('portrait/gerric-portrait')?.format).toBe('jpeg');
    expect(readdirSync(join(ROOT, 'src', 'assets', 'portrait'))).toEqual(['gerric-portrait.jpg']);
  });

  it('copy no repo logos, seals or official store badges (PLAN "Assets")', () => {
    expect(readdirSync(join(PUBLIC, 'brands'))).toEqual(['sme']);
    expect(readdirSync(join(PUBLIC, 'brands', 'sme'))).toEqual(['icon.webp']);
    expect(existsSync(join(PUBLIC, 'badges'))).toBe(false);
  });
});

// ─── Privacy exclusions ──────────────────────────────────────────────────────────────────

describe('excluded screenshots (personal data in the app UI)', () => {
  it('are the same 12 for the asset script and the site', () => {
    expect(exclusions).toHaveLength(12);
    expect(exclusions.map((item) => ({ listing: item.listingId, position: item.position, src: item.src, reason: item.reason }))).toEqual(
      storeExclusions.map((item) => ({ listing: item.listing, position: item.position, src: item.src, reason: item.reason })),
    );
  });

  it('have no file at their path and no manifest entry', () => {
    for (const item of exclusions) {
      expect(existsSync(join(ROOT, item.outPath)), item.outPath).toBe(false);
      expect(manifest[item.key], item.key).toBeUndefined();
    }
  });

  it('exist nowhere under public/, under any name', () => {
    const copies = walk(PUBLIC).filter((path) => REMOVED_MASTERS.has(createHash('sha256').update(readFileSync(path)).digest('hex')));
    expect(copies.map((path) => toPosix(path.slice(ROOT.length)))).toEqual([]);
  });
});

// ─── Content that points at the files ────────────────────────────────────────────────────

describe('asset paths used by content', () => {
  const srcs = new Set(entries.map(([, entry]) => entry.src));

  it('every Citizen brand icon is its Google Play icon, on disk', () => {
    for (const brand of citizenBrands) {
      expect(brand.icon).toBe(`/store/citizen/${brand.id}/play-icon.webp`);
      expect(srcs.has(brand.icon), brand.id).toBe(true);
      expect(existsSync(join(PUBLIC, brand.icon)), brand.icon).toBe(true);
    }
  });

  it('every image icon in apps.ts is on disk', () => {
    const images = apps.flatMap((app) => (app.icon.kind === 'image' ? [app.icon.src] : []));
    expect(images.length).toBeGreaterThan(0);
    for (const src of images) {
      expect(srcs.has(src), src).toBe(true);
      expect(existsSync(join(PUBLIC, src)), src).toBe(true);
    }
  });

  it('every listing image resolves to a manifest file with the same size', () => {
    for (const listing of storeListings) {
      for (const image of [listing.icon, ...listing.screenshots]) {
        const entry = storeEntries.find(([, item]) => item.src === image.src)?.[1];
        expect(entry, image.src).toBeDefined();
        expect({ width: image.width, height: image.height }, image.src).toEqual({ width: entry?.width, height: entry?.height });
      }
    }
  });

  it('alt text is non-empty and unique across all 47 screenshot records (35 shown, 12 excluded)', () => {
    const alts = listingsJson.flatMap((listing) => listing.screenshots.map((shot) => shot.alt.trim()));
    expect(alts).toHaveLength(47);
    expect(alts.every((alt) => alt.length > 0)).toBe(true);
    expect(new Set(alts).size).toBe(47);
  });
});
