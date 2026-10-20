import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Orange TEXT only ever uses the accent-ink token (4.64:1 on the cream canvas). The raw accent
 * (#FF7816, 2.55:1 as text) is a fill colour for icon tiles and small bars, so any
 * `text-accent…` utility other than text-accent-ink / text-accent-soft fails, including
 * variants (hover:text-accent), opacity (text-accent/80) and arbitrary values that read the
 * raw token (text-(--c-accent), text-[var(--c-accent)]).
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const ALLOWED_SUFFIXES = new Set(['-ink', '-soft']);

/** Utility tokens: `text-accent` plus an optional `-suffix`, at a class boundary. */
const UTILITY = /(?<![\w-])text-accent(-[a-z0-9-]+)?(?![a-z0-9-])/g;
/** Arbitrary values reading the raw token: text-(--c-accent…), text-[var(--c-accent…)], text-(color:--c-accent…). */
const ARBITRARY = /(?<![\w-])text-[[(](?:color:)?(?:var\()?--c-accent(-[a-z0-9-]+)?(?![a-z0-9-])/g;

/** The forbidden text-accent classes in a source string. */
export function forbiddenTextAccent(source: string): string[] {
  const found: string[] = [];
  for (const pattern of [UTILITY, ARBITRARY]) {
    for (const match of source.matchAll(pattern)) {
      if (!ALLOWED_SUFFIXES.has(match[1] ?? '')) found.push(match[0]);
    }
  }
  return found;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

describe('style rule: orange text only via text-accent-ink', () => {
  it.each([
    'text-accent',
    'hover:text-accent',
    'group-hover/card:text-accent',
    '!text-accent',
    'text-accent/80',
    'text-accent-foo',
    'text-(--c-accent)',
    'text-[var(--c-accent)]',
    'text-(color:--c-accent)',
    '[&>svg]:text-accent',
  ])('flags %s', (sample) => {
    expect(forbiddenTextAccent(`className="p-2 ${sample} font-bold"`)).toHaveLength(1);
  });

  it.each([
    'text-accent-ink',
    'hover:text-accent-ink',
    'text-accent-ink/80',
    'text-accent-soft',
    'text-(--c-accent-ink)',
    'bg-accent text-on-accent',
    'bg-accent-soft text-soft-ink',
    'context-accent',
    'border-accent',
    'fill-accent',
  ])('allows %s', (sample) => {
    expect(forbiddenTextAccent(`className="${sample}"`)).toEqual([]);
  });

  it('src/**/*.{ts,tsx} uses no other text-accent class', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const hits = forbiddenTextAccent(readFileSync(file, 'utf8'));
      if (hits.length > 0) offenders.push(`${relative(ROOT, file).replaceAll('\\', '/')}: ${hits.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
