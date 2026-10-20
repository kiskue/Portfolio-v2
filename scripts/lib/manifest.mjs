/**
 * src/content/apps/store-assets.generated.json: one entry per file scripts/prepare-assets.mjs
 * writes, `{ key: { src, width, height, bytes, sha256, sourceUrl, asOf } }`, keys sorted so the
 * file is stable. Pure functions; tests/unit/store-urls.test.ts covers them.
 */
import { createHash } from 'node:crypto';

export const MANIFEST_PATH = 'src/content/apps/store-assets.generated.json';
/** Entry fields, in the order they are written. */
export const ENTRY_FIELDS = Object.freeze(['src', 'width', 'height', 'bytes', 'sha256', 'sourceUrl', 'asOf']);

const SHA256 = /^[0-9a-f]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Keys start with a letter, so JSON key order is always insertion order (never integer-first). */
const KEY = /^[a-z][a-z0-9-]*(?:\/[a-z0-9][a-z0-9.-]*)+$/;

/** Lower-case hex SHA-256 of a buffer. */
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Code-unit order, independent of the runtime locale. */
export function compareKeys(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function entryProblems(entry, key) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [`${key}: not an object`];
  const problems = [];
  if (!KEY.test(key)) problems.push(`${key}: keys look like "store/<brand>/<platform>-<NN|icon>"`);
  const extra = Object.keys(entry).filter((field) => !ENTRY_FIELDS.includes(field));
  if (extra.length > 0) problems.push(`${key}: unknown fields ${extra.join(', ')}`);
  if (typeof entry.src !== 'string' || entry.src === '') problems.push(`${key}: src must be a non-empty string`);
  for (const field of ['width', 'height', 'bytes']) {
    if (!Number.isInteger(entry[field]) || entry[field] <= 0) problems.push(`${key}: ${field} must be a positive integer`);
  }
  if (typeof entry.sha256 !== 'string' || !SHA256.test(entry.sha256)) problems.push(`${key}: sha256 must be 64 lower-case hex digits`);
  if (typeof entry.sourceUrl !== 'string' || entry.sourceUrl === '') problems.push(`${key}: sourceUrl must be a non-empty string`);
  if (typeof entry.asOf !== 'string' || !ISO_DATE.test(entry.asOf)) problems.push(`${key}: asOf must be YYYY-MM-DD`);
  return problems;
}

/** The entry stored under `key`, with its fields in the written order; throws on an invalid key or value. */
export function makeEntry(key, fields) {
  const problems = entryProblems(fields, key);
  if (problems.length > 0) throw new Error(`Invalid manifest entry:\n  - ${problems.join('\n  - ')}`);
  return Object.fromEntries(ENTRY_FIELDS.map((field) => [field, fields[field]]));
}

/** Validates a parsed manifest and returns a plain key → entry object; throws listing every problem. */
export function validateManifest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The asset manifest must be a JSON object');
  const problems = Object.entries(value).flatMap(([key, entry]) => entryProblems(entry, key));
  if (problems.length > 0) throw new Error(`Invalid asset manifest:\n  - ${problems.join('\n  - ')}`);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, makeEntry(key, entry)]));
}

/** The manifest as stable JSON: keys sorted, fields in order, two-space indent, trailing newline. */
export function serializeManifest(entries) {
  const sorted = Object.keys(entries)
    .sort(compareKeys)
    .map((key) => [key, makeEntry(key, entries[key])]);
  return `${JSON.stringify(Object.fromEntries(sorted), null, 2)}\n`;
}
