import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lucide from 'lucide-react';
import { Battery, Bell, Check, CircleAlert, Ellipsis, Pause, Play, Search, X, type LucideIcon } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { RGlyph, type RGlyphProps } from '@/components/replicas/kit';
import { KitGlyph, mergedGlyphPath } from '@/components/replicas/kit/kit-glyph';

/*
 * The kit's own glyphs (kit/kit-glyph.tsx): RGlyph's <svg> with lucide's shapes merged into one
 * path, for the Home DOM budget. The <svg> must stay RGlyph's attribute for attribute, the
 * geometry must be exact, and anything a single path could draw differently (fills) or cannot
 * express exactly keeps RGlyph's markup.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const glyph = (props: RGlyphProps): string => renderToStaticMarkup(createElement(KitGlyph, props));
const plain = (props: RGlyphProps): string => renderToStaticMarkup(createElement(RGlyph, props));
const openingTag = (markup: string): string => markup.slice(0, markup.indexOf('>') + 1);
const children = (markup: string): string => markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</svg>'));

describe('KitGlyph', () => {
  it.each<[string, RGlyphProps]>([
    ['a plain glyph', { icon: Bell }],
    ['a sized, thick glyph', { icon: X, size: 13, strokeWidth: 3 }],
    ['a coloured glyph', { icon: CircleAlert, size: 9, color: '#475569' }],
    ['a styled glyph', { icon: Search, className: 'rx-x', style: { opacity: 0.5 } }],
  ])('keeps RGlyph’s <svg> attribute for attribute: %s', (_label, props) => {
    expect(openingTag(glyph(props))).toBe(openingTag(plain(props)));
    expect(glyph(props)).toMatch(/^<svg [^>]*class="lucide lucide-[a-z0-9-]+[^"]*"/);
  });

  it('draws a multi-shape icon as one path', () => {
    expect(children(glyph({ icon: Bell }))).toMatch(/^<path d="[^"]+"><\/path>$/);
    expect(children(plain({ icon: Bell })).match(/<path /g)).toHaveLength(2);
  });

  it('keeps RGlyph’s exact markup for filled and single-shape glyphs', () => {
    expect(glyph({ icon: Play, size: 18, fill: 'currentColor' })).toBe(plain({ icon: Play, size: 18, fill: 'currentColor' }));
    expect(glyph({ icon: Bell, fill: 'currentColor' })).toBe(plain({ icon: Bell, fill: 'currentColor' }));
    expect(glyph({ icon: Check, size: 13, strokeWidth: 3 })).toBe(plain({ icon: Check, size: 13, strokeWidth: 3 }));
    expect(mergedGlyphPath(Check)).toBeNull();
  });

  it('converts every shape kind exactly', () => {
    // A leading relative moveto becomes absolute, and its implicit pairs explicit relative linetos.
    expect(mergedGlyphPath(X)).toBe('M18 6 6 18M6 6l12 12');
    // Circles and lines.
    expect(mergedGlyphPath(Search)).toBe('M21 21l-4.34-4.34M3 11a8 8 0 1 0 16 0a8 8 0 1 0 -16 0z');
    expect(mergedGlyphPath(CircleAlert)).toBe('M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0zM12 8L12 12M12 16L12.01 16');
    expect(mergedGlyphPath(Ellipsis)).toBe('M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0zM18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0zM4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0z');
    // Rounded rects (rx only: ry follows), clockwise from the top-left corner's end.
    expect(mergedGlyphPath(Pause)).toBe(
      'M15 3H18A1 1 0 0 1 19 4V20A1 1 0 0 1 18 21H15A1 1 0 0 1 14 20V4A1 1 0 0 1 15 3z' +
        'M6 3H9A1 1 0 0 1 10 4V20A1 1 0 0 1 9 21H6A1 1 0 0 1 5 20V4A1 1 0 0 1 6 3z',
    );
    expect(mergedGlyphPath(Battery)).toBe('M 22 14 L 22 10M4 6H16A2 2 0 0 1 18 8V16A2 2 0 0 1 16 18H4A2 2 0 0 1 2 16V8A2 2 0 0 1 4 6z');
  });
});

// ─── Geometry: every icon a replica imports rasterises the same ───────────────────────────

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Every lucide icon imported anywhere in the replicas (screens pass them to kit parts). */
function replicaIcons(): [string, LucideIcon][] {
  const names = new Set<string>();
  for (const file of sourceFiles(join(ROOT, 'src/components/replicas'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g)) {
      for (const part of (match[1] ?? '').split(',')) {
        const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
        if (name && /^[A-Z]/.test(name)) names.add(name);
      }
    }
  }
  const all = lucide as unknown as Readonly<Record<string, LucideIcon | undefined>>;
  return [...names].sort().flatMap((name) => {
    const icon = all[name];
    return icon && typeof (icon as { render?: unknown }).render === 'function' ? [[name, icon] as [string, LucideIcon]] : [];
  });
}

async function alpha(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(size, size).ensureAlpha().extractChannel('alpha').raw().toBuffer();
}

describe('KitGlyph geometry', () => {
  it('matches lucide’s shapes for every icon the replicas import (no pixel flips at 192px)', async () => {
    const icons = replicaIcons();
    expect(icons.length).toBeGreaterThan(40);
    const flipped: string[] = [];
    let merged = 0;
    for (const [name, icon] of icons) {
      if (mergedGlyphPath(icon) === null) continue;
      merged += 1;
      const props = { icon, size: 192, color: '#000000' } as const;
      const [a, b] = await Promise.all([alpha(plain(props), 192), alpha(glyph(props), 192)]);
      // A misplaced or missing shape turns opaque pixels clear (or the reverse). Merging only
      // changes anti-aliasing where shapes meet: separate elements composite their edges twice.
      let flips = 0;
      for (let index = 0; index < a.length; index += 1) {
        const x = a[index] ?? 0;
        const y = b[index] ?? 0;
        if ((x > 230 && y < 25) || (y > 230 && x < 25)) flips += 1;
      }
      if (flips > 0) flipped.push(`${name}: ${flips}`);
    }
    expect(merged).toBeGreaterThan(30);
    expect(flipped).toEqual([]);
  });
});
