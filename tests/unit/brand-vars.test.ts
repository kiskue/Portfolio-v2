import { describe, expect, it } from 'vitest';
import { brands, citizenBrands, responderBrands } from '@/content/apps/brands';
import type { Brand } from '@/content/types';
import { BRAND_VAR_NAMES, brandVars, cssString } from '@/lib/brand-vars';

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function brand(id: string): Brand {
  const found = brands.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing brand ${id}`);
  return found;
}

describe('brandVars', () => {
  it('sets exactly the six --app-* variables for every brand', () => {
    for (const each of brands) {
      expect(Object.keys(brandVars(each)).sort()).toEqual([...BRAND_VAR_NAMES].sort());
    }
  });

  it('never emits a logo or url() (no repo logo or seal files)', () => {
    for (const each of brands) {
      const vars = brandVars(each);
      expect(vars).not.toHaveProperty('--app-logo');
      expect(Object.values(vars).join(' ')).not.toMatch(/url\(/i);
    }
  });

  it('maps 1Hope to its exact palette and quoted store name', () => {
    expect(brandVars(brand('1hope'))).toEqual({
      '--app-primary': '#DF9830',
      '--app-secondary': '#f2b862',
      '--app-accent': '#8F5E10',
      '--app-lighttext': '#ebe79b',
      '--app-title-ink': '#DF9830',
      '--app-name': '"1Hope"',
    });
  });

  it('maps the default Citizen brand (Smile SAFE Taytay) to the default palette', () => {
    expect(brandVars(brand('smile-safe-taytay'))).toMatchObject({
      '--app-primary': '#085499',
      '--app-secondary': '#248ff3',
      '--app-accent': '#085499',
      '--app-name': '"Smile SAFE Taytay"',
    });
  });

  it('uses the Responder header-title ink, including the shipped low-contrast SJDM yellow', () => {
    expect(brandVars(brand('defensys'))['--app-title-ink']).toBe('#248ff3');
    expect(brandVars(brand('sjdm'))['--app-title-ink']).toBe('#f9a825');
  });

  it('uses the darker Bagong Pag-asa green for brand-coloured text', () => {
    expect(brandVars(brand('bagong-pag-asa'))).toMatchObject({ '--app-primary': '#28a745', '--app-accent': '#1e7e34' });
  });

  it('falls back to secondary when a brand has no lightText', () => {
    const sjdm = brand('sjdm');
    expect(sjdm.palette.lightText).toBeUndefined();
    expect(brandVars(sjdm)['--app-lighttext']).toBe(sjdm.palette.secondary);
  });

  it('only ever emits valid hex colours', () => {
    for (const each of [...citizenBrands, ...responderBrands]) {
      const { '--app-name': name, ...colours } = brandVars(each);
      expect(name.startsWith('"')).toBe(true);
      for (const value of Object.values(colours)) expect(value).toMatch(HEX);
    }
  });
});

describe('cssString', () => {
  it('quotes plain names', () => {
    expect(cssString('SJDM App')).toBe('"SJDM App"');
  });

  it('escapes quotes, backslashes and newlines', () => {
    expect(cssString('a"b')).toBe('"a\\"b"');
    expect(cssString('a\\b')).toBe('"a\\\\b"');
    expect(cssString('a\nb')).toBe('"a\\A b"');
  });
});
