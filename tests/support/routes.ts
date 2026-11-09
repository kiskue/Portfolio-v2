import { site } from '@/content/site';
import { CASE_STUDY_SLUGS, type CaseStudySlug } from '@/content/types';
import { caseStudyHref } from '@/lib/routes';

/*
 * The pages every cross-cutting e2e suite covers, from the same sources the site uses (site.nav
 * and CASE_STUDY_SLUGS through caseStudyHref), never a hand-typed copy. E2E specs run in plain
 * Node: these modules have no server-only guard.
 */

/** The template's seven nav routes, in nav order. */
export const NAV_ROUTES: readonly string[] = site.nav.map((item) => item.href);

/** The three case studies. */
export const CASE_STUDY_ROUTES: readonly string[] = CASE_STUDY_SLUGS.map((slug) => caseStudyHref(slug));

/** Any unknown URL renders the 404 page inside the shell. */
export const NOT_FOUND_ROUTE = '/no-such-page';

/** Every page a visitor can reach: the nav routes, the case studies and the 404 page. */
export const PAGE_ROUTES: readonly string[] = [...NAV_ROUTES, ...CASE_STUDY_ROUTES, NOT_FOUND_ROUTE];

/** The HTTP status a page answers with. */
export function expectedStatus(route: string): 200 | 404 {
  return route === NOT_FOUND_ROUTE ? 404 : 200;
}

/** A file-name-safe name for a route: "/" → "home", "/projects/sme-panindio" → "projects-sme-panindio". */
export function routeSlug(route: string): string {
  if (route === '/') return 'home';
  if (route === NOT_FOUND_ROUTE) return '404';
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

/** The case study a route shows, or null. */
export function caseStudyOf(route: string): CaseStudySlug | null {
  return CASE_STUDY_SLUGS.find((slug) => caseStudyHref(slug) === route) ?? null;
}
