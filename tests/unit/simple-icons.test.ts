import * as simpleIcons from 'simple-icons';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { profile } from '@/content/profile';
import { tools } from '@/content/tools';
import { SIMPLE_ICON_KEYS, type SimpleIconKey } from '@/content/types';

const exported = simpleIcons as unknown as Readonly<Record<string, unknown>>;

/** Verified absent from simple-icons 16.35.0 (review.md); they need the official mark or a monogram. */
const KNOWN_ABSENT = [
  'siLinkedin',
  'siVisualstudiocode',
  'siOpenai',
  'siZustand',
  'siPlaywright',
  'siMotion',
  'siReactnative',
] as const;

describe('simple-icons glyph keys', () => {
  it('lists every key once', () => {
    expect(new Set(SIMPLE_ICON_KEYS).size).toBe(SIMPLE_ICON_KEYS.length);
  });

  it('exist as exports of simple-icons with an SVG path (compile time)', () => {
    expectTypeOf<Exclude<SimpleIconKey, keyof typeof simpleIcons>>().toEqualTypeOf<never>();
  });

  it.each(SIMPLE_ICON_KEYS)('%s exists with an SVG path (runtime)', (key) => {
    const icon = simpleIcons[key];
    expect(icon.title.length).toBeGreaterThan(0);
    expect(icon.path.length).toBeGreaterThan(0);
  });

  it('does not list icons that simple-icons does not ship', () => {
    for (const key of KNOWN_ABSENT) {
      expect(exported[key]).toBeUndefined();
      expect((SIMPLE_ICON_KEYS as readonly string[]).includes(key)).toBe(false);
    }
  });

  it('covers every glyph used in content', () => {
    const used = [...tools.map((tool) => tool.glyph), ...profile.links.map((link) => link.glyph)].flatMap((glyph) =>
      glyph.kind === 'si' ? [glyph.icon] : [],
    );
    for (const key of used) expect(exported[key]).toBeDefined();
  });
});
