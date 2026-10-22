import { expect, test, type APIRequestContext } from '@playwright/test';
import { site } from '@/content/site';
import { CASE_STUDY_SLUGS } from '@/content/types';
import { absoluteUrl, personJsonLd, sitemapPaths } from '@/lib/seo';

/*
 * SEO files and site-wide metadata (PLAN.md → SEO and Placeholders; W11), against the
 * production build. Mode-aware: the build and this process read the same placeholder mode
 * (site.placeholders, overridable with NEXT_PUBLIC_PLACEHOLDERS=hide for one build), so one spec
 * checks whichever mode was built.
 *
 * Label mode (the default): every page is noindex, robots.txt names no sitemap, /sitemap.xml is
 * a 404. Hide mode: pages are indexable and the sitemap lists every nav route and case study.
 * Both: the Open Graph cards are 1200×630 PNGs, every page's og:image and twitter:image name its
 * card (a case study's own, the site card on every other page) and load, the layout's Person
 * JSON-LD parses, and the GM icon is served and linked.
 *
 * Per-page titles, descriptions and canonicals come from each page's own pageMetadata() call and
 * are checked after the pages land, not here.
 *
 * E2E specs run in plain Node: import only modules without the server-only guard.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

const MODE = site.placeholders;
const CASE_STUDY_ROUTES: readonly string[] = CASE_STUDY_SLUGS.map((slug) => `/projects/${slug}`);
const ROUTES: readonly string[] = [...site.nav.map((item) => item.href), ...CASE_STUDY_ROUTES];
/** The site card (src/app/opengraph-image.tsx). */
const SITE_CARD = '/opengraph-image';
/** A case study's own card (src/app/projects/[slug]/opengraph-image.tsx). */
const caseStudyCard = (route: string): string => `${route}/opengraph-image`;
const OG_IMAGES: readonly string[] = [SITE_CARD, ...CASE_STUDY_ROUTES.map(caseStudyCard)];
/** The card a route's og:image and twitter:image name: its own on a case study, the site card everywhere else. */
const cardFor = (route: string): string => (CASE_STUDY_ROUTES.includes(route) ? caseStudyCard(route) : SITE_CARD);
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function html(request: APIRequestContext, route: string): Promise<string> {
  const response = await request.get(route);
  expect(response.status(), route).toBe(200);
  return response.text();
}

/** The <head> of a page: metadata tags live there, never in the body. */
const headOf = (page: string): string => page.slice(0, page.indexOf('</head>'));

function metaContent(head: string, attribute: 'name' | 'property', key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<meta ${attribute}="${escaped}" content="([^"]*)"`).exec(head)?.[1] ?? null;
}

function jsonLdBlocks(head: string): Record<string, unknown>[] {
  return [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1] ?? 'null') as Record<string, unknown>,
  );
}

test.describe(`robots and sitemap (${MODE} mode)`, () => {
  test('robots.txt allows crawling and names the sitemap only in hide mode', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    const body = await response.text();
    expect(body).toMatch(/^User-Agent: \*$/m);
    expect(body).toMatch(/^Allow: \/$/m);
    expect(body).not.toMatch(/^Disallow: \/$/m);
    if (MODE === 'label') {
      expect(body).not.toMatch(/^Sitemap:/im);
    } else {
      expect(body).toMatch(new RegExp(`^Sitemap: ${absoluteUrl('/sitemap.xml').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
    }
  });

  test(MODE === 'label' ? 'there is no sitemap' : 'the sitemap lists every nav route and case study', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    if (MODE === 'label') {
      expect(response.status()).toBe(404);
      return;
    }
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');
    const locs = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(sitemapPaths().map((path) => absoluteUrl(path)));
    expect(locs.some((loc) => new URL(loc ?? '').pathname.startsWith('/dev'))).toBe(false);
    for (const path of sitemapPaths()) expect((await request.get(path)).status(), path).toBe(200);
  });

  test(MODE === 'label' ? 'every page is noindex' : 'every page is indexable', async ({ request }) => {
    for (const route of ROUTES) {
      const robots = metaContent(headOf(await html(request, route)), 'name', 'robots');
      if (MODE === 'label') expect(robots, route).toBe('noindex, nofollow');
      else expect(robots ?? '', route).not.toContain('noindex');
    }
  });
});

test.describe('Open Graph cards', () => {
  for (const path of OG_IMAGES) {
    test(`${path} is a prerendered 1200×630 PNG`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
      const png = await response.body();
      expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
      // IHDR: width and height are the first two fields of the first chunk.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    });
  }

  test('an unknown case study has no card', async ({ request }) => {
    expect((await request.get('/projects/nope/opengraph-image')).status()).toBe(404);
  });

  test('every page’s og:image and twitter:image load: case studies show their own card, every other page the site card', async ({ request }) => {
    for (const route of ROUTES) {
      const head = headOf(await html(request, route));
      for (const [attribute, key] of [['property', 'og:image'], ['name', 'twitter:image']] as const) {
        const content = metaContent(head, attribute, key);
        expect(content, `${route} ${key}`).not.toBeNull();
        const url = new URL(content ?? '');
        expect(url.pathname, `${route} ${key}`).toBe(cardFor(route));
        const image = await request.get(`${url.pathname}${url.search}`);
        expect(image.status(), `${route} ${key}`).toBe(200);
        expect(image.headers()['content-type'], `${route} ${key}`).toBe('image/png');
      }
    }
  });
});

test.describe('structured data and icon', () => {
  test('every page carries one Person JSON-LD that parses to the profile', async ({ request }) => {
    for (const route of ROUTES) {
      const people = jsonLdBlocks(headOf(await html(request, route))).filter((block) => block['@type'] === 'Person');
      expect(people, route).toEqual([personJsonLd()]);
    }
  });

  test('the Person JSON-LD is in the live document after hydration', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const blocks = await page.locator('head script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((text) => JSON.parse(text) as Record<string, unknown>);
    expect(parsed.filter((block) => block['@type'] === 'Person')).toEqual([personJsonLd()]);
  });

  test('the GM icon is served as SVG and linked from every page', async ({ request }) => {
    const icon = await request.get('/icon.svg');
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toContain('image/svg+xml');
    expect(await icon.text()).toContain('<svg');
    for (const route of ROUTES) {
      expect(headOf(await html(request, route)), route).toMatch(/<link rel="icon" href="\/icon\.svg(?:\?[^"]*)?"[^>]*type="image\/svg\+xml"/);
    }
  });
});
