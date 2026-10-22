import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadOgFonts, loadOgTheme } from '@/components/seo/og-assets';
import { appColours, caseStudyCardData, monogram, siteCardData } from '@/components/seo/og-card';
import { ogTheme, parseRootTokens } from '@/components/seo/og-theme';
import { apps } from '@/content/apps/apps';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import { caseStudies } from '@/content/case-studies';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import { CASE_STUDY_SLUGS } from '@/content/types';

/*
 * The Open Graph cards' inputs (src/components/seo/og-*): colours from the design tokens and
 * the brand data, the words from content with placeholder tokens left out, the fonts on disk,
 * and the static monogram icon. The PNGs themselves are prerendered by `next build` and
 * fetched by tests/e2e/seo.spec.ts.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const tokensCss = readFileSync(`${ROOT}src/styles/tokens.css`, 'utf8');
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

describe('og-theme', () => {
  const tokens = parseRootTokens(tokensCss);

  it('reads the light theme from the first :root block of tokens.css', () => {
    expect(tokens['c-bg']).toBe('#F3F3EB');
    expect(tokens['c-ink']).toBe('#0D1C3D');
    expect(tokens['c-accent-ink']).toBe('#C2410C');
    expect(tokens.glow).toBe('191 212 255');
  });

  it('maps the tokens the cards use, all as real colours', () => {
    const theme = ogTheme(tokens);
    expect(theme).toMatchObject({ bg: tokens['c-bg'], ink: tokens['c-ink'], ink2: tokens['c-ink-2'], accentInk: tokens['c-accent-ink'] });
    for (const value of [theme.bg, theme.surface, theme.line, theme.ink, theme.ink2, theme.ink3, theme.accentInk, theme.onInk]) {
      expect(value).toMatch(HEX);
    }
    expect(theme.glow).toBe(`rgba(191, 212, 255, ${tokens['glow-alpha']})`);
    expect(theme.glowFade).toBe('rgba(191, 212, 255, 0)');
  });

  it('fails the build when a token it needs is missing or not a colour', () => {
    expect(() => ogTheme({ ...tokens, 'c-ink': 'var(--x)' })).toThrow(/--c-ink/);
    expect(() => ogTheme({ ...tokens, 'glow-alpha': '' })).toThrow(/--glow/);
    expect(() => parseRootTokens('.dark { --c-bg: #000000; }')).toThrow(/:root/);
  });

  it('loads the same theme from disk', async () => {
    expect(await loadOgTheme()).toEqual(ogTheme(tokens));
  });
});

describe('og-assets fonts', () => {
  it('loads three static TrueType weights of the site face, with its licence', async () => {
    const fonts = await loadOgFonts();
    expect(fonts.map(({ name, weight }) => [name, weight])).toEqual([
      ['Plus Jakarta Sans', 500],
      ['Plus Jakarta Sans', 700],
      ['Plus Jakarta Sans', 800],
    ]);
    for (const font of fonts) expect(font.data.readUInt32BE(0)).toBe(0x00010000);
    expect(existsSync(`${ROOT}src/components/seo/fonts/OFL.txt`)).toBe(true);
  });
});

describe('og-card data', () => {
  const noTokens = (value: unknown): void => expect(JSON.stringify(value)).not.toContain('[[');

  it('colours each app from the brand data: distinct brand primaries, or SME’s own theme', () => {
    const distinct = (list: readonly { palette: { primary: string } }[]) => [...new Set(list.map((brand) => brand.palette.primary.toLowerCase()))];
    expect(appColours('citizen')).toEqual(distinct(citizenBrands));
    expect(appColours('responder')).toEqual(distinct(responderBrands));
    expect(appColours('sme')).toHaveLength(3);
    for (const app of apps) for (const colour of appColours(app.id)) expect(colour).toMatch(HEX);
  });

  it('builds the site card from the profile, the Home headline and every app', () => {
    const data = siteCardData();
    expect(data.monogram).toBe('GM');
    expect(data.name).toBe(site.name);
    expect(data.byline).toBe(`${profile.title} · ${profile.location}`);
    expect(data.headline).toEqual(home.headline);
    expect(data.apps.map((app) => app.name)).toEqual(apps.map((app) => app.name));
    expect(data.apps.map((app) => app.stage)).toEqual(['Personal · private beta', 'Company · live on the stores', 'Company · private distribution']);
    noTokens(data);
  });

  it('builds a card for each case study, from its own content', () => {
    for (const slug of CASE_STUDY_SLUGS) {
      const study = caseStudies.find((entry) => entry.slug === slug);
      const data = caseStudyCardData(slug);
      expect(data.title).toBe(study?.title);
      expect(data.eyebrow.startsWith('Case study · ')).toBe(true);
      expect(data.summary).toBe(study?.summary);
      expect(data.colours).toEqual(appColours(study?.app ?? 'sme'));
      noTokens(data);
    }
  });

  it('makes a monogram from initials', () => {
    expect(monogram('Gerric Measco')).toBe('GM');
  });
});

describe('src/app/icon.svg', () => {
  const svg = readFileSync(`${ROOT}src/app/icon.svg`, 'utf8');

  it('is the GM monogram drawn as outlines, so no font is needed to render it', () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/);
    expect(svg).not.toMatch(/<text\b/);
    expect(svg.match(/<path\b/g)).toHaveLength(2);
  });

  it('uses the ink token for the tile', () => {
    expect(svg).toContain(`fill="${parseRootTokens(tokensCss)['c-ink']}"`);
  });

  it('is well-formed: no double hyphen inside a comment', () => {
    for (const [, body] of svg.matchAll(/<!--([\s\S]*?)-->/g)) expect(body).not.toContain('--');
  });
});
