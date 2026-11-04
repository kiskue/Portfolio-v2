import { expect, test, type Page } from '@playwright/test';
import { collectConsoleProblems, describeConsoleProblems } from '../support/console';
import { DRAGON, dragonState, flying, navigate, sampleDragon, sceneReady, switchTheme } from '../support/dragon';
import { fontsReady, hydrated, storeDisplay } from '../support/page';

/*
 * The dragon (design §3.3), against the production build: the scene chunk flies it once per session,
 * about 1.2 s after Home has painted, and again 1.6 s after each theme switch; a flight stops when
 * the tab hides or the hero leaves the screen; leaving Home leaves nothing behind. The default
 * headless browser renders WebGL in software, where the dragon flies as stacked frames on purpose
 * (renderer.ts); hero-webgl.spec.ts runs the WebGL renderer on the GPU, and hero-no-webgl.spec.ts
 * the fallback without WebGL. Both need browsers of their own.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

/** The canvases in the document. */
async function canvases(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('canvas').length);
}

/** Starts a session that has already seen the opening flight (before any page script runs). */
async function alreadyFlown(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gm.dragon', '1');
    } catch {
      // Without storage the opening flight would fly; the tests then fail on their idle checks.
    }
  });
}

test.describe('the dragon', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the opening flight plays once per session', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await flying(page);
    const first = await dragonState(page);
    await page.waitForTimeout(500);
    const later = await dragonState(page);
    expect(later.transform, 'the dragon moved in 500 ms').not.toBe(first.transform);
    expect(['webgl', 'images'], 'the renderer').toContain(later.renderer);
    await page.reload({ waitUntil: 'load' });
    expect(await sampleDragon(page, 'flight', 200, 4_000), 'no second opening flight in the same session').not.toContain('flying');
    // Not vacuous: by the end of the window the scene was ready, and it stayed idle.
    expect((await dragonState(page)).renderer, 'the reloaded scene is ready').toMatch(/^(webgl|images)$/);
  });

  test('a theme switch sends it out again 1.6 s later', async ({ page }) => {
    await alreadyFlown(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await sceneReady(page);
    expect((await dragonState(page)).flight, 'idle before the switch').toBe('idle');
    await switchTheme(page);
    await page.waitForTimeout(1_000);
    expect((await dragonState(page)).flight, 'still idle 1 s after the switch').toBe('idle');
    await expect(page.locator(DRAGON), 'flying by 3 s after the switch').toHaveAttribute('data-flight', 'flying', { timeout: 2_000 });
  });

  test('reduced motion: no dragon element and no flight', async ({ page }) => {
    await storeDisplay(page, { motion: 'reduce' });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForTimeout(4_000);
    await expect(page.locator(DRAGON)).toHaveCount(0);
  });

  test('on a phone the big dragon keeps clear of the headline', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the phone path is the mobile project’s');
    test.setTimeout(60_000);
    await page.goto('/', { waitUntil: 'load' });
    await fontsReady(page);
    await flying(page);
    // Every 100 ms until the flight ends: the 800×706 dragon inside its 1000×906 canvas (10% and
    // 11.038% in, 80% × 77.925%), and the H1 and subline boxes.
    const samples = await page.evaluate(async (selector) => {
      const box = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null;
      };
      const found: { scale: number; inner: { left: number; top: number; right: number; bottom: number }; h1: ReturnType<typeof box>; subline: ReturnType<typeof box> }[] = [];
      const end = performance.now() + 15_000;
      while (performance.now() < end) {
        const dragon = document.querySelector<HTMLElement>(selector);
        if (!dragon || dragon.dataset.flight !== 'flying') break;
        const rect = dragon.getBoundingClientRect();
        const left = rect.left + rect.width * 0.1;
        const top = rect.top + rect.height * 0.11038;
        found.push({
          scale: Number(dragon.dataset.scale),
          inner: { left, top, right: left + rect.width * 0.8, bottom: top + rect.height * 0.77925 },
          h1: box(document.querySelector('main h1')),
          subline: box(document.querySelector('main header h1 + p')),
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return found;
    }, DRAGON);
    const big = samples.filter((sample) => sample.scale >= 0.5);
    expect(big.length, `samples while the dragon is big (of ${samples.length})`).toBeGreaterThan(20);
    for (const { scale, inner, h1, subline } of big) {
      for (const [name, text] of [
        ['H1', h1],
        ['subline', subline],
      ] as const) {
        expect(text, `the ${name} is rendered`).not.toBeNull();
        if (!text) continue;
        const apart = inner.right <= text.left || text.right <= inner.left || inner.bottom <= text.top || text.bottom <= inner.top;
        expect(apart, `at scale ${scale} the dragon ${JSON.stringify(inner)} overlaps the ${name} ${JSON.stringify(text)}`).toBe(true);
      }
    }
  });

  test('a flight stops when the hero scrolls away', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await flying(page);
    // #home-more starts where the hero ends: at the top of the viewport, no part of the hero shows.
    await page.evaluate(() => {
      const more = document.querySelector('#home-more');
      if (more) window.scrollTo({ top: more.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    });
    await expect(page.locator(DRAGON)).toHaveAttribute('data-flight', 'idle', { timeout: 1_000 });
  });

  test('a hidden tab drops the flight', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await flying(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator(DRAGON)).toHaveAttribute('data-flight', 'idle', { timeout: 1_000 });
  });

  test('Home → About → Home five times leaks nothing', async ({ page }) => {
    test.setTimeout(60_000);
    const problems = collectConsoleProblems(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await flying(page);
    for (let round = 1; round <= 5; round += 1) {
      await navigate(page, 'About');
      await expect(page, `round ${round}: on About`).toHaveURL(/\/about$/);
      await expect(page.locator(DRAGON), `round ${round}: no dragon on About`).toHaveCount(0);
      await navigate(page, 'Home');
      await expect(page, `round ${round}: back on Home`).toHaveURL(/\/$/);
      await expect(page.locator(DRAGON), `round ${round}: one dragon, ready`).toHaveAttribute('data-renderer', /^(webgl|images)$/);
      expect((await dragonState(page)).count, `round ${round}: one dragon element`).toBe(1);
    }
    expect(await canvases(page), 'canvases in the document').toBeLessThanOrEqual(1);
    expect(describeConsoleProblems(problems)).toEqual([]);
  });

  test('a switch during a flight queues no second flight', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await flying(page);
    await switchTheme(page);
    // The path's scale only ever falls (tests/unit/scene-flight.test.ts), so a restart would show as a rise.
    const scales = (await sampleDragon(page, 'scale', 50, 3_000)).filter((value) => value !== 'absent').map(Number);
    expect(scales.length, 'data-scale samples in 3 s').toBeGreaterThan(20);
    const rises = scales.filter((scale, index) => index > 0 && scale > (scales[index - 1] ?? scale));
    expect(rises, `data-scale after the switch: ${scales.join(' ')}`).toEqual([]);
    expect((await dragonState(page)).count, 'one dragon element').toBe(1);
    await expect(page.locator(DRAGON), 'the flight ends').toHaveAttribute('data-flight', 'idle', { timeout: 20_000 });
    expect(await sampleDragon(page, 'flight', 200, 3_000), 'no flight after the one that ended').not.toContain('flying');
  });

  test('leaving Home while the dragon’s frames load leaves nothing behind', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the rail’s links; one project is enough');
    const problems = collectConsoleProblems(page);
    // Hold every dragon frame request until Home has been left.
    let release = (): void => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const held: string[] = [];
    await page.route('**/scene/dragon-*.webp', async (route) => {
      held.push(new URL(route.request().url()).pathname);
      await released;
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await expect(page.locator(DRAGON), 'the scene started').toHaveCount(1);
    await expect.poll(() => held.length, { message: 'dragon frames requested and held' }).toBeGreaterThan(0);
    await navigate(page, 'About');
    await expect(page).toHaveURL(/\/about$/);
    release();
    await page.waitForTimeout(2_000);
    await expect(page.locator(DRAGON)).toHaveCount(0);
    expect(await canvases(page), 'canvases in the document').toBe(0);
    expect(describeConsoleProblems(problems)).toEqual([]);
  });

  test('leaving Home before a scheduled flight leaves nothing behind', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the rail’s links; one project is enough');
    const problems = collectConsoleProblems(page);
    await alreadyFlown(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await sceneReady(page);
    await switchTheme(page);
    const switched = Date.now();
    await navigate(page, 'About');
    await expect(page).toHaveURL(/\/about$/);
    expect(Date.now() - switched, 'on About within 1 s of the switch, before its flight was due').toBeLessThan(1_000);
    await page.waitForTimeout(2_500);
    await expect(page.locator(DRAGON)).toHaveCount(0);
    expect(await canvases(page), 'canvases in the document').toBe(0);
    expect(describeConsoleProblems(problems)).toEqual([]);
  });

  test('the opening flight still plays after a late visit to Home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the rail’s links; one project is enough');
    test.setTimeout(60_000);
    // A fresh session lands elsewhere; Home opens (client-side) long after the first paint.
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForTimeout(8_500);
    await navigate(page, 'Home');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(DRAGON)).toHaveAttribute('data-flight', 'flying', { timeout: 6_000 });
  });
});
