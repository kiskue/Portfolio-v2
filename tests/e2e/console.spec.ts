import { expect, test, type Page, type Request } from '@playwright/test';
import { home } from '@/content/home';
import { collectConsoleProblems, describeConsoleProblems, unusedStylePreloads } from '../support/console';
import { hydrated } from '../support/page';
import { CASE_STUDY_ROUTES, NAV_ROUTES } from '../support/routes';

/*
 * An idle page logs nothing (PLAN → Verification → Smoke: "no console errors or warnings"), against
 * the production build. Chrome reports a preloaded stylesheet that nothing applies about 3 s after
 * the preload was added, which is later than the smoke test looks (it stops at network idle), so
 * each route here stays open for 6 s after its load event.
 *
 * Two things used to leave such preloads (ruling F2, wave 2b ledger):
 * - a viewport prefetch of Home from the top bar or the rail: React preloads every stylesheet hint
 *   in a prefetched route, and Home has CSS of its own. Links to Home now prefetch on intent
 *   (PLAN → Performance budgets → Prefetch), which the second block checks;
 * - the root not-found boundary: Next serializes it, with its stylesheets, into every page, so
 *   every page preloads the 404's CSS whether or not it applies that CSS.
 *
 * E2E specs run in plain Node: import content that has no server-only guard (home.ts, site.ts).
 */

// One worker per file, tests in order (see smoke.spec.ts: parallel Chromium loads stall on Windows).
test.describe.configure({ mode: 'default' });

/** How long each page stays open after its load event: twice Chrome's unused-preload delay. */
const IDLE_MS = 6_000;

/** Resolves once the page has been loaded for `ms` milliseconds (the navigation entry's loadEventEnd). */
async function idleAfterLoad(page: Page, ms: number): Promise<void> {
  await page.waitForFunction(
    (idle) => {
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return navigation !== undefined && navigation.loadEventEnd > 0 && performance.now() - navigation.loadEventEnd >= idle;
    },
    ms,
    { polling: 250, timeout: ms + 15_000 },
  );
}

test.describe('an idle page logs no console errors or warnings', () => {
  for (const route of [...NAV_ROUTES, ...CASE_STUDY_ROUTES]) {
    test(`${route} stays quiet for 6 s after load`, async ({ page }) => {
      const problems = collectConsoleProblems(page);
      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response?.status(), route).toBe(200);
      await idleAfterLoad(page, IDLE_MS);
      const unused = await unusedStylePreloads(page);
      expect(describeConsoleProblems(problems), `${route} logged problems (stylesheets preloaded, never applied: ${unused.join(', ') || 'none'})`).toEqual([]);
      expect(unused, `${route} preloads stylesheets it never applies`).toEqual([]);
    });
  }
});

/** A prefetch of Home by Next's router (`/?_rsc=…` with the next-router-prefetch header). */
function isHomePrefetch(request: Request): boolean {
  return new URL(request.url()).pathname === '/' && request.headers()['next-router-prefetch'] === '1';
}

test.describe('links to Home prefetch on intent', () => {
  test('Home is not prefetched while idle; focus prefetches it, and Enter opens it without a page load', async ({ page }) => {
    const homePrefetches: string[] = [];
    const documents: string[] = [];
    page.on('request', (request) => {
      if (isHomePrefetch(request)) homePrefetches.push(request.url());
      if (request.resourceType() === 'document') documents.push(request.url());
    });

    await page.goto('/contact', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForLoadState('networkidle');
    // Viewport prefetches start right after hydration (about 0.2-0.6 s in): none of them is Home.
    expect(homePrefetches, 'no viewport prefetch of Home').toEqual([]);

    // The visible link to Home: the top bar's name below 1280px, the rail's Home item from 1280px.
    const homeLink = page.locator('a[href="/"]:visible').first();
    const prefetched = page.waitForRequest(isHomePrefetch);
    await homeLink.focus();
    await prefetched;

    // A full page load would drop this marker and request a new document.
    await page.evaluate(() => Object.assign(window, { __clientNavigation: true }));
    const documentsBefore = documents.length;
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('h1')).toHaveText(home.headline.join(' '));
    expect(await page.evaluate(() => '__clientNavigation' in window), 'Home opened by client navigation').toBe(true);
    expect(documents.slice(documentsBefore), 'no document request for Home').toEqual([]);
  });
});
