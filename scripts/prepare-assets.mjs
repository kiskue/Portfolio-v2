/**
 * Prepares the committed image assets (PLAN "Assets", architecture D6). Run it by hand, never
 * during `next build`, and commit what it writes. Refresh quarterly together with `asOf` in
 * src/content/apps/store-listings.json.
 *
 *   npm run assets:prepare -- [--dry-run] [--force] [--only=<brand|sme|portrait>] [--repos-root=<dir>]
 *
 * Writes:
 *   public/store/citizen/<brand>/{play|appstore}-icon.webp      256×256 WebP q90
 *   public/store/citizen/<brand>/{play|appstore}-01..09.webp    Play: native 500 px wide; App Store: 1080 px wide; q90
 *   public/brands/sme/icon.webp                                  256×256 WebP q90 from SME-Panindio/assets/icon.png
 *   src/assets/portrait/gerric-portrait.jpg                      copied unchanged from Profile/public/
 *   src/content/apps/store-assets.generated.json                 { key: { src, width, height, bytes, sha256, sourceUrl, asOf } }
 * Store originals are cached in .cache/store-originals/ (gitignored), keyed by download URL.
 *
 * Excluded screenshots (`"excluded": { "reason": "…" }` in the listings, e.g. store images that
 * show real people's personal data) are never downloaded. A run deletes their files and
 * manifest entries, and fails if one is still there afterwards; a dry run lists them.
 *
 *   --dry-run          check the listings and the local sources and print the plan; no network, no writes
 *   --force            rebuild every output even when it is up to date (cached originals are reused;
 *                      delete .cache/store-originals/ to download again)
 *   --only=<group>     one Citizen brand id, "sme" or "portrait"
 *   --repos-root=<dir> where SME-Panindio/ and Profile/ live (default: PORTFOLIO_REPOS_ROOT, then D:/Projects)
 *
 * Idempotent: an output is skipped when its file exists, matches the manifest sha256 and its
 * download URL is unchanged. Exits 1 on any failure, count mismatch or stray file; 2 on a usage error.
 */
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CITIZEN_BRANDS,
  LOCAL_COPIES,
  ONLY_GROUPS,
  STORE_FILE_NAME,
  countPlan,
  keyInScope,
  localSourceUrl,
  planExclusions,
  planStoreAssets,
  totalsProblems,
} from './lib/asset-plan.mjs';
import { describeOutput, encodeWebp, inspectImage } from './lib/encode.mjs';
import { fetchAllowedBytes } from './lib/fetch-image.mjs';
import { sizeWarning } from './lib/image-bytes.mjs';
import { MANIFEST_PATH, makeEntry, serializeManifest, sha256Hex, validateManifest } from './lib/manifest.mjs';
import { settleLimit } from './lib/pool.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LISTINGS_PATH = 'src/content/apps/store-listings.json';
const CACHE_DIR = '.cache/store-originals';
const STORE_DIR = 'public/store/citizen';
const CONCURRENCY = 4;

class UsageError extends Error {}

const USAGE = 'Usage: node scripts/prepare-assets.mjs [--dry-run] [--force] [--only=<brand|sme|portrait>] [--repos-root=<dir>]';

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    only: null,
    reposRoot: process.env.PORTFOLIO_REPOS_ROOT?.trim() || 'D:/Projects',
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--only=')) options.only = arg.slice('--only='.length);
    else if (arg.startsWith('--repos-root=')) options.reposRoot = arg.slice('--repos-root='.length);
    else throw new UsageError(`Unknown option: ${arg}`);
  }
  if (options.only !== null && !ONLY_GROUPS.includes(options.only)) {
    throw new UsageError(`--only must be one of: ${ONLY_GROUPS.join(', ')}`);
  }
  return options;
}

// ─── Files ───────────────────────────────────────────────────────────────────────────────

const abs = (relativePath) => join(ROOT, relativePath);

async function readIfExists(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function listDir(path) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

/** Write to a temporary sibling, then rename, so a crash never leaves a half-written file. */
async function writeAtomic(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, data);
  await rename(temporary, path);
}

function cachePathFor(sourceUrl) {
  return abs(`${CACHE_DIR}/${sha256Hex(Buffer.from(sourceUrl)).slice(0, 32)}.orig`);
}

function localDate(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const message = (error) => (error instanceof Error ? error.message : String(error));

// ─── Store assets ────────────────────────────────────────────────────────────────────────

/** The manifest entry when the output on disk is current, else null. */
async function currentEntry(asset, manifest) {
  const existing = manifest[asset.key];
  if (!existing || existing.sourceUrl !== asset.sourceUrl || existing.src !== asset.src) return null;
  const onDisk = await readIfExists(abs(asset.outPath));
  if (!onDisk || onDisk.length !== existing.bytes || sha256Hex(onDisk) !== existing.sha256) return null;
  return existing;
}

/** The original bytes and their header facts, from the cache when it holds a valid copy, else downloaded. */
async function loadOriginal(asset) {
  const cachePath = cachePathFor(asset.sourceUrl);
  const cached = await readIfExists(cachePath);
  if (cached) {
    try {
      return { bytes: cached, source: await inspectImage(cached), origin: 'cache' };
    } catch {
      await rm(cachePath, { force: true }); // A corrupt cache entry is downloaded again.
    }
  }
  const bytes = await fetchAllowedBytes(asset.sourceUrl, {
    onRetry: ({ attempt, delay, error }) => console.warn(`  retry ${attempt} in ${delay} ms for ${asset.key}: ${error.message}`),
  });
  const source = await inspectImage(bytes); // Magic bytes and header dimensions, before any decoding.
  await writeAtomic(cachePath, bytes); // Cache only originals that passed the checks.
  return { bytes, source, origin: 'network' };
}

async function encodeChecked(bytes, encoding, label) {
  const encoded = await encodeWebp(bytes, encoding);
  const check = await describeOutput(encoded.data);
  if (check.format !== 'webp') throw new Error(`${label}: encoder produced ${check.format}, not webp`);
  if (check.hasMetadata) throw new Error(`${label}: metadata survived the re-encode`);
  if (check.width !== encoded.width || check.height !== encoded.height) throw new Error(`${label}: encoded size mismatch`);
  if (encoding.mode === 'square' && (check.width !== encoding.width || check.height !== encoding.height)) {
    throw new Error(`${label}: icon is ${check.width}x${check.height}, expected ${encoding.width}x${encoding.height}`);
  }
  return encoded;
}

async function buildStoreAsset(asset, context) {
  if (!context.force) {
    const existing = await currentEntry(asset, context.manifest);
    if (existing) return { key: asset.key, action: 'skip', entry: makeEntry(asset.key, { ...existing, asOf: asset.asOf }) };
  }
  const { bytes, source, origin } = await loadOriginal(asset);
  const warning = sizeWarning(source, asset.expectedSource);
  const encoded = await encodeChecked(bytes, asset.encoding, asset.key);
  await writeAtomic(abs(asset.outPath), encoded.data);
  const entry = makeEntry(asset.key, {
    src: asset.src,
    width: encoded.width,
    height: encoded.height,
    bytes: encoded.data.length,
    sha256: sha256Hex(encoded.data),
    sourceUrl: asset.sourceUrl,
    asOf: asset.asOf,
  });
  const detail = `${source.type} ${source.width}x${source.height} -> webp ${encoded.width}x${encoded.height} ${kb(encoded.data.length)}`;
  return { key: asset.key, action: origin === 'network' ? 'fetched' : 'from-cache', entry, detail, warning };
}

// ─── Local copies ────────────────────────────────────────────────────────────────────────

async function buildLocalCopy(copy, context) {
  const sourcePath = resolve(context.reposRoot, copy.source);
  const bytes = await readFile(sourcePath);
  const source = await inspectImage(bytes);
  const output =
    copy.mode === 'copy'
      ? { data: bytes, width: source.width, height: source.height }
      : await encodeChecked(bytes, copy.encoding, copy.key);
  const sha256 = sha256Hex(output.data);
  const onDisk = await readIfExists(abs(copy.outPath));
  const unchanged = onDisk !== null && sha256Hex(onDisk) === sha256;
  if (!unchanged || context.force) await writeAtomic(abs(copy.outPath), output.data);
  const existing = context.manifest[copy.key];
  const entry = makeEntry(copy.key, {
    src: copy.src,
    width: output.width,
    height: output.height,
    bytes: output.data.length,
    sha256,
    sourceUrl: localSourceUrl(copy),
    asOf: unchanged && existing?.sha256 === sha256 ? existing.asOf : context.today,
  });
  const detail = `${source.type} ${source.width}x${source.height} -> ${copy.mode === 'copy' ? 'copied unchanged' : `webp ${output.width}x${output.height}`} ${kb(output.data.length)}`;
  return { key: copy.key, action: unchanged && !context.force ? 'skip' : 'written', entry, detail, warning: null };
}

// ─── Stray files ─────────────────────────────────────────────────────────────────────────

/**
 * Files in scope that the plan does not produce. Store files with our naming pattern are
 * deleted (a listing lost a screenshot); anything else is reported and left alone.
 */
async function sweepStrays(planned, only, dryRun) {
  const plannedPaths = new Set(planned.map((item) => abs(item.outPath)));
  const removed = [];
  const problems = [];
  const brands = only === null ? CITIZEN_BRANDS : CITIZEN_BRANDS.filter((brand) => brand === only);

  if (only === null) {
    for (const entry of await listDir(abs(STORE_DIR))) {
      if (!entry.isDirectory() || !CITIZEN_BRANDS.includes(entry.name)) problems.push(`stray entry ${STORE_DIR}/${entry.name}`);
    }
  }
  for (const brand of brands) {
    for (const entry of await listDir(abs(`${STORE_DIR}/${brand}`))) {
      const path = abs(`${STORE_DIR}/${brand}/${entry.name}`);
      if (plannedPaths.has(path)) continue;
      if (entry.isFile() && STORE_FILE_NAME.test(entry.name)) {
        if (!dryRun) await rm(path);
        removed.push(`${STORE_DIR}/${brand}/${entry.name}`);
      } else {
        problems.push(`stray entry ${STORE_DIR}/${brand}/${entry.name}`);
      }
    }
  }
  for (const copy of LOCAL_COPIES) {
    if (only !== null && only !== copy.group) continue;
    const folder = dirname(copy.outPath).replaceAll('\\', '/');
    for (const entry of await listDir(abs(folder))) {
      if (abs(`${folder}/${entry.name}`) !== abs(copy.outPath)) problems.push(`stray entry ${folder}/${entry.name}`);
    }
  }
  return { removed, problems };
}

/** Every planned output exists and matches its manifest entry byte for byte. */
async function verifyOutputs(planned, manifest) {
  const problems = [];
  for (const item of planned) {
    const entry = manifest[item.key];
    const onDisk = await readIfExists(abs(item.outPath));
    if (!entry) problems.push(`${item.key}: no manifest entry`);
    else if (!onDisk) problems.push(`${item.key}: ${item.outPath} is missing`);
    else if (onDisk.length !== entry.bytes || sha256Hex(onDisk) !== entry.sha256) problems.push(`${item.key}: file does not match the manifest`);
  }
  return problems;
}

/** Excluded screenshots whose file or manifest entry is still there. */
async function excludedLeftovers(exclusions, manifest) {
  const problems = [];
  for (const item of exclusions) {
    if (manifest[item.key]) problems.push(`${item.key}: excluded, but the manifest still lists it`);
    if (await readIfExists(abs(item.outPath))) problems.push(`${item.key}: excluded, but ${item.outPath} still exists`);
  }
  return problems;
}

// ─── Main ────────────────────────────────────────────────────────────────────────────────

async function dryRun(storeAssets, localCopies, exclusions, context) {
  for (const asset of storeAssets) {
    const current = await currentEntry(asset, context.manifest);
    const cached = await readIfExists(cachePathFor(asset.sourceUrl));
    const action = current && !context.force ? 'up to date' : cached ? 'rebuild from cache' : 'download';
    console.log(`[dry-run] ${asset.key.padEnd(34)} ${action.padEnd(18)} ${asset.sourceUrl}`);
  }
  for (const item of exclusions) console.log(`[dry-run] ${item.key.padEnd(34)} ${'excluded'.padEnd(18)} ${item.reason}`);
  const problems = [];
  for (const copy of localCopies) {
    const sourcePath = resolve(context.reposRoot, copy.source);
    const bytes = await readIfExists(sourcePath);
    if (!bytes) problems.push(`${copy.key}: source not found at ${sourcePath}`);
    else console.log(`[dry-run] ${copy.key.padEnd(34)} ${copy.mode.padEnd(18)} ${sourcePath}`);
  }
  // What a real run would delete: manifest entries the plan no longer produces, then stray files.
  const plannedKeys = new Set([...storeAssets, ...localCopies].map((item) => item.key));
  for (const key of Object.keys(context.manifest)) {
    if (keyInScope(key, context.only) && !plannedKeys.has(key)) console.log(`[dry-run] would drop manifest key ${key}`);
  }
  const strays = await sweepStrays([...storeAssets, ...localCopies], context.only, true);
  for (const path of strays.removed) console.log(`[dry-run] would remove ${path}`);
  return [...problems, ...strays.problems];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const listings = JSON.parse(await readFile(abs(LISTINGS_PATH), 'utf8'));
  const plan = planStoreAssets(listings);
  const exclusions = planExclusions(listings);
  const totals = totalsProblems(plan, exclusions);
  if (totals.length > 0) throw new Error(`Store listings do not match the verified totals:\n  - ${totals.join('\n  - ')}`);

  const manifestText = await readIfExists(abs(MANIFEST_PATH));
  const manifest = manifestText ? validateManifest(JSON.parse(manifestText.toString('utf8'))) : {};
  const storeAssets = plan.filter((asset) => keyInScope(asset.key, options.only));
  const excluded = exclusions.filter((item) => keyInScope(item.key, options.only));
  const localCopies = LOCAL_COPIES.filter((copy) => keyInScope(copy.key, options.only));
  const context = { ...options, manifest, today: localDate() };
  const counts = countPlan(plan, exclusions);
  console.log(
    `Plan: ${counts.listings} listings (${counts.play} Google Play, ${counts.appstore} App Store), ` +
      `${counts.screenshots} screenshots (${counts.excluded} more excluded), ${counts.icons} icons, ${LOCAL_COPIES.length} local copies` +
      (options.only ? `; only "${options.only}" (${plural(storeAssets.length + localCopies.length, 'file')})` : ''),
  );

  if (options.dryRun) {
    const problems = await dryRun(storeAssets, localCopies, excluded, context);
    for (const problem of problems) console.error(`problem: ${problem}`);
    return problems.length > 0 ? 1 : 0;
  }

  const storeResults = await settleLimit(storeAssets, CONCURRENCY, (asset) => buildStoreAsset(asset, context));
  const localResults = [];
  for (const copy of localCopies) {
    try {
      localResults.push({ status: 'fulfilled', value: await buildLocalCopy(copy, context) });
    } catch (reason) {
      localResults.push({ status: 'rejected', reason });
    }
  }

  const items = [...storeAssets, ...localCopies];
  const results = [...storeResults, ...localResults];
  const next = { ...manifest };
  const failures = [];
  const tally = {};
  results.forEach((result, index) => {
    const item = items[index];
    if (result.status === 'rejected') {
      failures.push(`${item.key}: ${message(result.reason)}`);
      return;
    }
    const { action, entry, detail, warning } = result.value;
    next[item.key] = entry;
    tally[action] = (tally[action] ?? 0) + 1;
    if (action !== 'skip') console.log(`[${action}] ${item.key.padEnd(34)} ${detail ?? ''}`);
    if (warning) console.warn(`  warning ${item.key}: ${warning}`);
  });

  let removed = [];
  const problems = [...failures];
  if (failures.length === 0) {
    // Manifest entries in scope that the plan no longer produces, then stray files on disk.
    const plannedKeys = new Set(items.map((item) => item.key));
    for (const key of Object.keys(next)) {
      if (keyInScope(key, options.only) && !plannedKeys.has(key)) {
        delete next[key];
        removed.push(`manifest key ${key}`);
      }
    }
    const strays = await sweepStrays(items, options.only, false);
    removed = [...removed, ...strays.removed];
    problems.push(...strays.problems, ...(await verifyOutputs(items, next)), ...(await excludedLeftovers(excluded, next)));
  }

  const serialized = serializeManifest(next);
  if (serialized !== manifestText?.toString('utf8')) await writeAtomic(abs(MANIFEST_PATH), serialized);

  for (const path of removed) console.log(`[removed] ${path}`);
  const storeFiles = Object.entries(next).filter(([key]) => key.startsWith('store/'));
  const storeBytes = storeFiles.reduce((total, [, entry]) => total + entry.bytes, 0);
  console.log(
    `Done: ${Object.entries(tally)
      .map(([action, count]) => `${count} ${action}`)
      .join(', ') || 'nothing to do'}. Manifest: ${Object.keys(next).length} entries; ` +
      `public/store: ${storeFiles.length} files, ${(storeBytes / 1024 / 1024).toFixed(2)} MB.`,
  );
  for (const problem of problems) console.error(`problem: ${problem}`);
  return problems.length > 0 ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof UsageError ? `${error.message}\n${USAGE}` : `prepare-assets failed: ${message(error)}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  },
);
