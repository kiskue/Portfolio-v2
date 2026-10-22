import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateStaticParams } from '@/app/projects/[slug]/opengraph-image';
import { site } from '@/content/site';
import { CASE_STUDY_SLUGS } from '@/content/types';
import { caseStudyHref } from '@/lib/routes';
import { sitemapFor, sitemapPaths } from '@/lib/seo';

/*
 * Route/sitemap parity (PLAN.md → Verification → unit tests). The sitemap lists every nav route
 * plus the three case studies and nothing under /dev, and those are exactly the pages the app
 * routes: a page added under src/app without a sitemap entry (or the reverse) fails here.
 */

const APP = fileURLToPath(new URL('../../src/app/', import.meta.url));
const ORIGIN = 'https://example.com';

/** Route paths of every page.tsx under src/app, with route groups removed: "/", "/about", "/projects/[slug]". */
function pageRoutes(dir: string = APP): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageRoutes(path);
    if (!/^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) return [];
    const segments = relative(APP, dir)
      .split(/[\\/]/)
      .filter((segment) => segment !== '' && !/^\(.*\)$/.test(segment));
    return [`/${segments.join('/')}`];
  });
}

const isDev = (route: string): boolean => route === '/dev' || route.startsWith('/dev/');

describe('route/sitemap parity', () => {
  const paths = sitemapPaths();
  const caseStudyPaths: readonly string[] = CASE_STUDY_SLUGS.map((slug) => caseStudyHref(slug));

  it('lists every nav route, then the three case studies', () => {
    expect(paths).toEqual([...site.nav.map((item) => item.href), ...caseStudyPaths]);
    expect(caseStudyPaths).toEqual(['/projects/sme-panindio', '/projects/defensys-citizen', '/projects/defensys-responder']);
  });

  it('lists nothing under /dev, no duplicates, and no query or #anchor', () => {
    expect(paths.filter(isDev)).toEqual([]);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path).toMatch(/^\/[a-z0-9/-]*$/);
  });

  it('matches the pages the app actually routes', () => {
    const routes = pageRoutes().filter((route) => !isDev(route));
    const staticRoutes = routes.filter((route) => !route.includes('['));
    const dynamicRoutes = routes.filter((route) => route.includes('['));

    expect([...staticRoutes].sort()).toEqual(paths.filter((path) => !caseStudyPaths.includes(path)).sort());
    expect(dynamicRoutes).toEqual(['/projects/[slug]']);
  });

  it('has a case-study card for exactly the sitemap’s case studies', async () => {
    const params = await generateStaticParams();
    expect(params.map(({ slug }) => caseStudyHref(slug))).toEqual(caseStudyPaths);
  });

  it('gives hide mode absolute URLs on the site origin', () => {
    const entries = sitemapFor('hide', ORIGIN) ?? [];
    expect(entries.map((entry) => entry.url)).toEqual(paths.map((path) => `${ORIGIN}${path}`));
    expect(entries[0]?.url).toBe(`${ORIGIN}/`);
  });
});
