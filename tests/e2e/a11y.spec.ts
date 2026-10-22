import { expect, test, type Page } from '@playwright/test';
import axeCore from 'axe-core';
import { caseStudyHref } from '@/lib/routes';
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

/** Opens a page the way every test in this file audits it: in the variant, hydrated, fonts loaded. */
async function openForAudit(page: Page, route: string, variant: Variant): Promise<void> {
  await page.emulateMedia(variant.media);
  await storeDisplay(page, variant.prefs);
  const response = await page.goto(route, { waitUntil: 'load' });
  expect(response?.status(), route).toBe(expectedStatus(route));
  await hydrated(page);
  await fontsReady(page);
  // The variant really applies (a dark run that silently tested light would prove nothing).
  expect(await htmlState(page)).toEqual(variant.expected);
}

for (const route of PAGE_ROUTES) {
  test.describe(`${route}`, () => {
    for (const variant of VARIANTS) {
      test(`has no WCAG 2.2 AA violations (${variant.name})`, async ({ page }) => {
        await openForAudit(page, route, variant);
        expect(await axeViolations(page), `${route} (${variant.name})`).toEqual([]);
      });
    }
  });
}

/*
 * Regression (wave 2b integration, F3): the Source toggle on the Citizen case study. At 390px in
 * dark it failed color-contrast at 1.72:1 (#b8c0cf on #fff7f1): axe composed the "Real
 * screenshots" label's background from a Citizen replica, the Brands section's preview phone.
 * No visitor sees that. axe reads the layout of the page as loaded, while the sections below
 * the hero have not rendered yet, and a section that has not rendered is only as tall as its
 * content-visibility placeholder; Brands is taller than that on a phone, so its phone lay over
 * the Screens section in the layout axe read. So the toggle's text must have no part of any
 * phone (frame, screen or replica) in axe's own background stacks, in either theme (in light the
 * wrong background happened to pass), and the Screens section must pass axe.
 */

/** The parts of axe-core's in-page API read below (axe.commons is its helper API for rules). */
interface AxeInPage {
  setup(node: Document): unknown;
  teardown(): void;
  readonly commons: {
    readonly dom: {
      isVisibleOnScreen(node: Element): boolean;
      getTextElementStack(node: Element): Element[][];
    };
  };
}

/** Each "text ← phone part" where axe's background stack for the Source toggle's text holds part of a phone. */
async function phonePartsBehindSourceToggle(page: Page): Promise<string[]> {
  await page.evaluate(axeCore.source);
  return page.evaluate(() => {
    const axe = (window as unknown as { axe: AxeInPage }).axe;
    axe.setup(document);
    try {
      const toggle = document.querySelector('#screens [data-source-toggle]');
      if (!toggle) return ['#screens has no Source toggle'];
      const describe = (node: Element): string => `${node.tagName.toLowerCase()}.${[...node.classList].slice(0, 2).join('.')}`;
      const found = new Set<string>();
      for (const element of toggle.querySelectorAll('*')) {
        if (element.closest('[data-source-pane]')) continue;
        const ownText = [...element.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim());
        if (!ownText || !axe.commons.dom.isVisibleOnScreen(element)) continue;
        for (const stack of axe.commons.dom.getTextElementStack(element)) {
          for (const node of stack) {
            if (node.closest('.phone')) found.add(`"${element.textContent?.trim()}" ← ${describe(node)}`);
          }
        }
      }
      return [...found];
    } finally {
      axe.teardown();
    }
  });
}

test.describe(`${caseStudyHref('defensys-citizen')} Source toggle`, () => {
  for (const variant of VARIANTS.filter((candidate) => candidate.expected.motion === 'full')) {
    test(`has no phone behind its text and no violations in #screens (${variant.name})`, async ({ page }) => {
      await openForAudit(page, caseStudyHref('defensys-citizen'), variant);
      expect(await axeViolations(page, { include: '#screens' }), `#screens (${variant.name})`).toEqual([]);
      expect(await phonePartsBehindSourceToggle(page), `Source toggle (${variant.name})`).toEqual([]);
    });
  }
});
