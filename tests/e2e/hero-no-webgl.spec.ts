import { expect, test, type Page } from '@playwright/test';
import { collectConsoleProblems, describeConsoleProblems } from '../support/console';
import { DRAGON, dragonState, flying } from '../support/dragon';

/*
 * The dragon without WebGL (design §5: the fallback): it still flies, as the three full frames
 * stacked as images, and the console stays quiet. The browser is launched with WebGL off, which
 * Playwright allows only at the top level of a file (it needs a worker of its own), so this check
 * lives here and not in hero.spec.ts.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

test.use({ reducedMotion: 'no-preference', launchOptions: { args: ['--disable-webgl', '--disable-3d-apis'] } });

/** Resolves once the page has been loaded for `ms` milliseconds (its navigation entry's loadEventEnd). */
async function loadedFor(page: Page, ms: number): Promise<void> {
  await page.waitForFunction(
    (idle) => {
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return navigation !== undefined && navigation.loadEventEnd > 0 && performance.now() - navigation.loadEventEnd >= idle;
    },
    ms,
    { polling: 250, timeout: ms + 15_000 },
  );
}

test('without WebGL it flies as stacked frames, quietly', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('/', { waitUntil: 'load' });
  await flying(page);
  expect((await dragonState(page)).renderer).toBe('images');
  await expect(page.locator(`${DRAGON} img`)).toHaveCount(3);
  await expect(page.locator(`${DRAGON} canvas`)).toHaveCount(0);
  await loadedFor(page, 6_000);
  expect(describeConsoleProblems(problems)).toEqual([]);
});
