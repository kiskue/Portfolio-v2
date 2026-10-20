import { describe, expect, it } from 'vitest';
import { brands, citizenBrands, responderBrands } from '@/content/apps/brands';
import type { Brand } from '@/content/types';
import { BRAND_LOGO_VAR, BRAND_VAR_NAMES, brandVars, cssString, cssUrl } from '@/lib/brand-vars';

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** The only url() brandVars may emit: a public store icon downloaded by scripts/prepare-assets.mjs. */
const STORE_ICON_URL = /^url\("\/store\/citizen\/[a-z0-9-]+\/play-icon\.webp"\)$/;

function brand(id: string): Brand {
  const found = brands.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing brand ${id}`);
  return found;
}

describe('brandVars', () => {
  it('sets the six colour and name variables for every brand, plus --app-logo for Citizen brands only', () => {
    expect(BRAND_LOGO_VAR).toBe('--app-logo');
    for (const each of citizenBrands) {
      expect(Object.keys(brandVars(each)).sort(), each.id).toEqual([...BRAND_VAR_NAMES, BRAND_LOGO_VAR].sort());
    }
    for (const each of responderBrands) {
      expect(Object.keys(brandVars(each)).sort(), each.id).toEqual([...BRAND_VAR_NAMES].sort());
    }
  });

  it('points --app-logo at the brand’s public store icon (CitizenBrand.icon), never a repo logo or seal', () => {
    for (const each of citizenBrands) {
      const logo = brandVars(each)[BRAND_LOGO_VAR];
      expect(logo, each.id).toBe(`url("${each.icon}")`);
      expect(logo, each.id).toMatch(STORE_ICON_URL);
      expect(logo, each.id).toContain(`/store/citizen/${each.id}/`);
    }
  });

  it('gives Responder brands no logo and no url() at all (they use monograms)', () => {
    for (const each of responderBrands) {
      const vars = brandVars(each);
      expect(vars).not.toHaveProperty(BRAND_LOGO_VAR);
      expect(Object.values(vars).join(' ')).not.toMatch(/url\(/i);
    }
  });

  it('emits no url() anywhere except the Citizen --app-logo', () => {
    for (const each of brands) {
      const others = Object.entries(brandVars(each)).filter(([name]) => name !== BRAND_LOGO_VAR);
      expect(others.map(([, value]) => String(value)).join(' '), each.id).not.toMatch(/url\(/i);
    }
  });

  it('maps 1Hope to its exact palette, quoted store name and store icon', () => {
    expect(brandVars(brand('1hope'))).toEqual({
      '--app-primary': '#DF9830',
      '--app-secondary': '#f2b862',
      '--app-accent': '#8F5E10',
      '--app-lighttext': '#ebe79b',
      '--app-title-ink': '#DF9830',
      '--app-name': '"1Hope"',
      '--app-logo': 'url("/store/citizen/1hope/play-icon.webp")',
    });
  });

  it('maps the default Citizen brand (Smile SAFE Taytay) to the default palette', () => {
    expect(brandVars(brand('smile-safe-taytay'))).toMatchObject({
      '--app-primary': '#085499',
      '--app-secondary': '#248ff3',
      '--app-accent': '#085499',
      '--app-name': '"Smile SAFE Taytay"',
      '--app-logo': 'url("/store/citizen/smile-safe-taytay/play-icon.webp")',
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
    for (const each of brands) {
      const vars = brandVars(each);
      expect(vars['--app-name'].startsWith('"')).toBe(true);
      const colours = Object.entries(vars).filter(([name]) => name !== '--app-name' && name !== BRAND_LOGO_VAR);
      expect(colours).toHaveLength(5);
      for (const [, value] of colours) expect(value).toMatch(HEX);
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

describe('cssUrl', () => {
  it('wraps a public path in a quoted url()', () => {
    expect(cssUrl('/store/citizen/sjdm-app/play-icon.webp')).toBe('url("/store/citizen/sjdm-app/play-icon.webp")');
  });

  it('escapes quotes so a path can never break out of the url()', () => {
    expect(cssUrl('/a"b).png')).toBe('url("/a\\"b).png")');
  });
});
