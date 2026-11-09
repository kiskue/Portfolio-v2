import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fontsReady, htmlState, hydrated, storeDisplay } from '../support/page';
import { PAGE_ROUTES, expectedStatus, routeSlug } from '../support/routes';

/*
 * Visual captures (PLAN "Verification → Visual"; architecture D8 `npm run visual`): every page at
 * 1447×722 (the template's viewport: its first screen and the full page), 390, 1024 and 1920,
 * in light and dark, saved to test-results/visual/ for the owner to compare with the template.
 * No baselines yet: toHaveScreenshot comes after design sign-off (the `visual` project in
 * playwright.config.ts already stores baselines under tests/visual/).
 * Runs in the `visual` project only: `npm run visual`.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

interface Size {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly mobile: boolean;
  /** Also save the first screen on its own (the template is one 1447×722 screen). */
  readonly firstScreen: boolean;
}

const SIZES: readonly Size[] = [
  { name: '1447x722', width: 1447, height: 722, mobile: false, firstScreen: true },
  { name: '390x844', width: 390, height: 844, mobile: true, firstScreen: false },
  { name: '1024x768', width: 1024, height: 768, mobile: false, firstScreen: false },
  { name: '1920x1080', width: 1920, height: 1080, mobile: false, firstScreen: false },
];

const THEMES = ['light', 'dark'] as const;

/** Scrolls through the page so lazy images and content-visibility sections render, then back to the top. */
async function renderWholePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.8, 200);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await fontsReady(page);
}

for (const size of SIZES) {
  test.describe(`${size.name}`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      isMobile: size.mobile,
      hasTouch: size.mobile,
      deviceScaleFactor: size.mobile ? 2 : 1,
    });

    for (const theme of THEMES) {
      for (const route of PAGE_ROUTES) {
        test(`${route} (${theme})`, async ({ page }, testInfo) => {
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
          await storeDisplay(page, { theme });
          const response = await page.goto(route, { waitUntil: 'load' });
          expect(response?.status(), route).toBe(expectedStatus(route));
          await hydrated(page);
          expect((await htmlState(page)).dark).toBe(theme === 'dark');
          await renderWholePage(page);

          const dir = path.join(testInfo.project.outputDir, 'visual');
          mkdirSync(dir, { recursive: true });
          const base = `${routeSlug(route)}--${size.name}--${theme}`;
          if (size.firstScreen) {
            await page.screenshot({ path: path.join(dir, `${base}--first-screen.png`), animations: 'disabled' });
          }
          await page.screenshot({ path: path.join(dir, `${base}.png`), fullPage: true, animations: 'disabled' });
        });
      }
    }
  });
}
