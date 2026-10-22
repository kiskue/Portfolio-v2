import { expect, test } from '@playwright/test';
import { apps } from '@/content/apps/apps';
import { CASE_STUDY_SLUGS } from '@/content/types';
import { caseStudyHref } from '@/lib/routes';
import { hydrated } from '../support/page';
import { CASE_STUDY_ROUTES, PAGE_ROUTES, caseStudyOf } from '../support/routes';
import { duplicates, viewTransitionNames, watchViewTransitions } from '../support/view-transitions';

/*
 * View transitions (PLAN "Verification": each name is unique per page; review T5; common.md §4).
 * The site has ONE view transition, the phone morph: GlimpsePlayer wraps each phone in
 * <ViewTransition name="phone-<slug>" share="morph" default="none">; Home's trio sends, each
 * case-study hero receives. A name that repeats on a page makes the browser abort the
 * transition, so every page is checked at rest (tests/support/view-transitions.ts reads both
 * CSS names and React's mounted <ViewTransition> names), and the morph itself is run from Home
 * into each case study with startViewTransition watched for an aborted (duplicate) transition.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

const phoneName = (slug: string): string => `phone-${slug}`;

for (const route of PAGE_ROUTES) {
  test(`${route}: every view-transition name on the page is unique`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });
    await hydrated(page);
    const names = await viewTransitionNames(page);
    expect(names.hydrated, 'React hydrated the page, so its <ViewTransition> boundaries can be read').toBe(true);
    const all = [...names.react, ...names.css.map((entry) => entry.name)];
    expect(duplicates(all), `names on ${route}: ${JSON.stringify(names)}`).toEqual([]);
  });
}

test('the check catches a repeated name, and ignores elements that are not rendered', async ({ page }) => {
  await page.goto('/about', { waitUntil: 'load' });
  await hydrated(page);
  const before = (await viewTransitionNames(page)).css.map((entry) => entry.name);
  await page.evaluate(() => {
    const add = (name: string, hidden: boolean): void => {
      const element = document.createElement('div');
      element.textContent = name;
      element.style.setProperty('view-transition-name', name);
      if (hidden) element.style.display = 'none';
      document.body.append(element);
    };
    add('qa-same-name', false);
    add('qa-same-name', false);
    // A display:none element takes no part in a view transition, so its name cannot clash.
    add('qa-hidden-name', true);
    add('qa-hidden-name', false);
  });
  const names = await viewTransitionNames(page);
  const css = names.css.map((entry) => entry.name);
  expect(css.slice(before.length)).toEqual(['qa-same-name', 'qa-same-name', 'qa-hidden-name']);
  expect(duplicates([...names.react, ...css])).toEqual(['qa-same-name']);
});

test('the transition watcher records a transition, and catches one a duplicate name aborts', async ({ page }) => {
  await watchViewTransitions(page);
  await page.goto('/about', { waitUntil: 'load' });
  await hydrated(page);
  const run = (duplicate: boolean) =>
    page.evaluate(async (withDuplicate) => {
      if (withDuplicate) {
        for (let copy = 0; copy < 2; copy += 1) {
          const element = document.createElement('div');
          element.textContent = 'duplicate';
          element.style.setProperty('view-transition-name', 'qa-duplicate');
          document.body.append(element);
        }
      }
      const transition = document.startViewTransition(() => undefined);
      await transition.finished.catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return window.__qaTransitions?.at(-1) ?? null;
    }, duplicate);

  const clean = await run(false);
  expect(clean).toMatchObject({ ready: 'ok', finished: 'ok', error: null });
  expect(clean?.names).toContain('root');

  const aborted = await run(true);
  expect(aborted?.ready).toBe('rejected');
  expect(aborted?.error).toMatch(/InvalidStateError/);
  expect(duplicates(aborted?.names ?? [])).toEqual(['qa-duplicate']);
});

test("Home's trio names each phone phone-<slug>, once per case study @needs-pages", async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const { react } = await viewTransitionNames(page);
  expect(react.filter((name) => name.startsWith('phone-')).sort()).toEqual(CASE_STUDY_SLUGS.map(phoneName).sort());
});

for (const route of CASE_STUDY_ROUTES) {
  test(`${route}: the hero phone receives the morph as phone-<slug>, and no other phone reuses it @needs-pages`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });
    await hydrated(page);
    const { react } = await viewTransitionNames(page);
    expect(react.filter((name) => name.startsWith('phone-'))).toEqual([phoneName(caseStudyOf(route) ?? '')]);
  });
}

for (const slug of CASE_STUDY_SLUGS) {
  test(`the phone morph runs from Home into ${slug} without a duplicate name @needs-pages`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (/view-transition|ViewTransition/i.test(message.text())) errors.push(message.text());
    });
    await watchViewTransitions(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    expect(await page.evaluate(() => Array.isArray(window.__qaTransitions)), 'this browser supports view transitions').toBe(true);

    const href = caseStudyHref(slug);
    const phoneLink = page.locator(`[data-section="bento"] a[href="${href}"]:has([data-phone])`);
    await expect(phoneLink).toHaveCount(1);
    if (!(await phoneLink.isVisible())) {
      // The single-phone stage (narrow cards): choose the app first.
      const app = apps.find((entry) => entry.caseStudy === slug);
      await page.locator('[data-section="bento"]').getByRole('radio', { name: app?.name ?? slug }).focus();
      await page.keyboard.press('Space');
      await expect(phoneLink).toBeVisible();
    }
    // Hover first, as a visitor does: the case study prefetches on hover (IntentLink), and the
    // morph forms when the destination renders in the same commit as the navigation.
    await phoneLink.hover();
    await page.waitForLoadState('networkidle');
    await phoneLink.click();
    await page.waitForURL(`**${href}`);
    await expect.poll(() => page.evaluate(() => window.__qaTransitions?.length ?? 0), { message: 'a view transition started' }).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.__qaTransitions?.every((entry) => entry.finished !== 'pending'))).toBe(true);

    const transitions = (await page.evaluate(() => window.__qaTransitions)) ?? [];
    for (const transition of transitions) {
      expect(transition.error, 'the transition was not aborted').toBeNull();
      expect(transition.ready).toBe('ok');
      expect(duplicates(transition.names)).toEqual([]);
    }
    expect(transitions.flatMap((transition) => transition.names)).toContain(phoneName(slug));
    expect(errors).toEqual([]);
  });
}
