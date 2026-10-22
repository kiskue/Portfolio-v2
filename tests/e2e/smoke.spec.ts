import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { site } from '@/content/site';
import { CASE_STUDY_ROUTES, NAV_ROUTES, NOT_FOUND_ROUTE } from '../support/routes';

/*
 * Smoke test (architecture "E2E tests", PLAN "Verification"), against the production build that
 * playwright.config.ts starts. Every nav route and case study renders with status 200, exactly one
 * h1 and a clean console; the skip link works; unknown pages and /dev are 404s.
 *
 * E2E specs run in plain Node: import content that has no server-only guard (site.ts, types.ts),
 * never src/content/derived.ts or src/content/apps/store.ts.
 */

/*
 * One worker per file, tests in order: on the owner's Windows machine three or more Chromium
 * processes loading from the local server at once stall their subresource loads for 10 s or
 * more (any server, even a bare Node one, so the cause is the machine, not the site). Each test
 * here takes about a second, so running the file in order costs little.
 */
test.describe.configure({ mode: 'default' });

/** The nav routes and the case studies, from site.nav and the slugs (tests/support/routes.ts). */
const ROUTES: readonly string[] = [...NAV_ROUTES, ...CASE_STUDY_ROUTES];

/** Messages that must never appear, named so a failure says what went wrong. */
const KNOWN_PROBLEMS: readonly [RegExp, string][] = [
  [/Encountered a script tag/i, 'React rendered a <script> it will not run (pre-paint script)'],
  [/hydrat/i, 'hydration error or mismatch'],
  [/Minified React error #(?:418|419|421|422|423|425)\b/, 'hydration error (production code)'],
];

interface Collected {
  readonly messages: string[];
}

/** Every console error or warning and every uncaught page error, as text. */
function collectProblems(page: Page): Collected {
  const messages: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error' || message.type() === 'warning') messages.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
  return { messages };
}

function describeProblems(messages: readonly string[]): string[] {
  return messages.map((message) => {
    const known = KNOWN_PROBLEMS.find(([pattern]) => pattern.test(message));
    return known ? `${known[1]} — ${message}` : message;
  });
}

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`${route} returns 200 with one h1 and no console errors or warnings`, async ({ page }) => {
      const { messages } = collectProblems(page);
      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      // Let hydration finish and late warnings arrive.
      await page.waitForLoadState('networkidle');
      expect(describeProblems(messages), `${route} logged problems`).toEqual([]);
    });
  }
});

test('the skip link is the first stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('MAIN');
});

test.describe('unknown pages', () => {
  for (const route of ['/projects/nope', NOT_FOUND_ROUTE]) {
    test(`${route} is a 404 rendered inside the shell`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(404);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(/isn.t on the map/);
      await expect(page.locator('main#content')).toHaveCount(1);
    });
  }

  test('/dev (development galleries) is a 404 in production', async ({ page }) => {
    for (const route of ['/dev', '/dev/ui', '/dev/replicas', '/dev/store']) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(404);
    }
  });
});

/** The nav item a route belongs to: an exact match, or a prefix item's sub-route (Projects on a case study). */
function currentNavHref(route: string): string | null {
  const item = site.nav.find((entry) => route === entry.href || (entry.match === 'prefix' && route.startsWith(`${entry.href}/`)));
  return item?.href ?? null;
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const route of [...ROUTES, NOT_FOUND_ROUTE]) {
    test(`${route} renders its content, with its nav item current, from the server HTML`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response?.status(), route).toBe(route === NOT_FOUND_ROUTE ? 404 : 200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main#content')).toBeVisible();
      // The nav is in the server HTML (the docked rail; CSS hides it below 1280px).
      const current = page.locator('nav[aria-label="Primary"] a[aria-current="page"]');
      const expected = currentNavHref(route);
      if (expected === null) {
        await expect(current).toHaveCount(0);
      } else {
        await expect(current).toHaveCount(1);
        await expect(current).toHaveAttribute('href', expected);
      }
    });
  }
});
