import { expect, test } from '@playwright/test';
import { axeViolations } from '../support/axe';
import { fontsReady, htmlState, hydrated, storeDisplay, type StoredDisplay } from '../support/page';
import { PAGE_ROUTES, expectedStatus } from '../support/routes';

/*
 * Accessibility matrix (PLAN "Verification → Accessibility", architecture D8 `a11y`): axe with
 * wcag2a, wcag2aa, wcag21aa and wcag22aa on every page (the 7 nav routes, the 3 case studies and
 * the 404 page) in every Playwright project (mobile 390, tablet 834, desktop 1440), in light and
 * dark, plus a reduced-motion run, where glimpses hold their posters and the marquee is static.
 * The only exclusion is color-contrast inside replica canvases (tests/support/axe.ts).
 * Overlays (menu sheet, Display settings) are covered in shell.spec.ts.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

interface Variant {
  readonly name: string;
  readonly prefs: StoredDisplay;
  readonly media: { readonly colorScheme: 'light' | 'dark'; readonly reducedMotion: 'reduce' | 'no-preference' };
  readonly expected: { readonly dark: boolean; readonly motion: 'full' | 'reduce' };
}

const VARIANTS: readonly Variant[] = [
  { name: 'light', prefs: { theme: 'light' }, media: { colorScheme: 'light', reducedMotion: 'no-preference' }, expected: { dark: false, motion: 'full' } },
  { name: 'dark', prefs: { theme: 'dark' }, media: { colorScheme: 'light', reducedMotion: 'no-preference' }, expected: { dark: true, motion: 'full' } },
  // Reduced motion from the OS, as most visitors get it: the pre-paint script resolves it.
  { name: 'reduced motion', prefs: { theme: 'light' }, media: { colorScheme: 'light', reducedMotion: 'reduce' }, expected: { dark: false, motion: 'reduce' } },
];

for (const route of PAGE_ROUTES) {
  test.describe(`${route}`, () => {
    for (const variant of VARIANTS) {
      test(`has no WCAG 2.2 AA violations (${variant.name})`, async ({ page }) => {
        await page.emulateMedia(variant.media);
        await storeDisplay(page, variant.prefs);
        const response = await page.goto(route, { waitUntil: 'load' });
        expect(response?.status(), route).toBe(expectedStatus(route));
        await hydrated(page);
        await fontsReady(page);
        // The variant really applies (a dark run that silently tested light would prove nothing).
        expect(await htmlState(page)).toEqual(variant.expected);
        expect(await axeViolations(page), `${route} (${variant.name})`).toEqual([]);
      });
    }
  });
}
