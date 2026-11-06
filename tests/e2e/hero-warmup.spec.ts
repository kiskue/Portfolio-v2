import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { SCENE_CHUNK_MARKER } from '../support/budgets';
import { alreadyFlown, DRAGON, sceneReady } from '../support/dragon';
import { GPU_TEST_OPTIONS, requireHardwareWebGL } from '../support/gpu';
import { hydrated, storeDisplay } from '../support/page';
import { recordWarmups, WARMUP_ID, warmupRunning, warmups } from '../support/warmup';

/*
 * The warm-ups (smooth-sky follow-up; src/components/sections/home/sky-warmup.ts and dragon/scene.ts).
 * On a cold GPU cache the first sunset or sunrise compiled the GPU programs for the sky's effects in
 * its first frames, and the first night flight those of the dragon's filter. Once the page has
 * settled, in Chromium with hardware WebGL and before any theme change, the scene draws the layers
 * the next change fades in, and the dragon at poses along its path in both themes' filters, at
 * opacity 0.002, so that work is done before. Nothing is warmed over a change, nothing on show or
 * under the painting on show is touched, and the opening flight keeps its slot.
 *
 * The default headless Chromium renders in software (SwiftShader), where nothing is warmed
 * (hero-dragon.spec.ts checks that), so this file launches Chromium on the GPU, as
 * hero-webgl.spec.ts does (tests/support/gpu.ts; E2E_REQUIRE_GPU=1 turns its skip into a failure).
 * Desktop project only; the pixel checks set their own sizes.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

test.use(GPU_TEST_OPTIONS);

const TRACE = 0.002;
const SKY_LAYERS = '[data-section="hero"] [data-hero-layer]';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'a GPU browser of its own; the desktop project is enough');
  await requireHardwareWebGL(page);
});

async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/** The sky's own animations (not the stars' lines), as layer:id. */
async function skyAnimations(page: Page): Promise<string[]> {
  return page.evaluate(
    (selector) => [...document.querySelectorAll(selector)].flatMap((element) => element.getAnimations().map((animation) => `${element.getAttribute('data-hero-layer')}:${animation.id}`)),
    SKY_LAYERS,
  );
}

/** Holds the shooting stars in their first delay (unseen), so two shots of a dark hero compare (before any page script runs). */
async function stillStars(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const still = new CSSStyleSheet();
    still.replaceSync('.hero-stars line { animation-play-state: paused !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, still];
  });
}

interface DragonLog {
  readonly at: number;
  readonly opacity: string;
  readonly warm: boolean;
  readonly filter: string;
  readonly haze: string;
  readonly flight: string;
  readonly renderer: string;
}

interface DragonRecord {
  __dragon: DragonLog[];
}

/** Records every change of the dragon's style, data-warm, data-renderer and data-flight (before any page script runs). */
async function recordDragon(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = window as unknown as DragonRecord;
    record.__dragon = [];
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const dragon = mutation.target as HTMLElement;
        if (!dragon.classList?.contains('hero-dragon')) continue;
        record.__dragon.push({
          at: performance.now(),
          opacity: dragon.style.opacity,
          warm: dragon.hasAttribute('data-warm'),
          filter: getComputedStyle(dragon).filter,
          haze: dragon.style.getPropertyValue('--haze'),
          flight: dragon.dataset.flight ?? '',
          renderer: dragon.dataset.renderer ?? '',
        });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style', 'data-warm', 'data-renderer', 'data-flight'] });
  });
}

async function dragonLog(page: Page): Promise<DragonLog[]> {
  return page.evaluate(() => (window as unknown as DragonRecord).__dragon);
}

/** True once the dragon has shown a warm-up pose (opacity 0.002). */
async function dragonWarming(page: Page): Promise<boolean> {
  return page.evaluate((trace) => (window as unknown as DragonRecord).__dragon.some((entry) => Number(entry.opacity) === trace), TRACE);
}

test.describe('the sky', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: once settled, the layers the next change fades in above the painting on show are drawn once, at a strength no screen shows`, async ({ page }) => {
      await alreadyFlown(page);
      await storeDisplay(page, { theme });
      await recordWarmups(page);
      await page.goto('/', { waitUntil: 'load' });
      await sceneReady(page);
      expect(await page.locator(DRAGON).getAttribute('data-renderer'), 'on the GPU').toBe('webgl');
      const calls = await warmups(page);
      // Each layer the next change fades in, once. Nothing on show is touched, nor the day painting
      // under the night painting on show (Ruling 50).
      const expected = theme === 'light' ? ['night', 'tint', 'scrim-night', 'stars'] : ['tint', 'scrim-day'];
      expect(calls.map((call) => call.layer).sort()).toEqual([...expected].sort());
      for (const call of calls) {
        const label = String(call.layer);
        for (const value of call.opacities) {
          expect(value, `${label} is drawn`).toBeGreaterThan(0);
          expect(value, `${label} stays below what a screen shows`).toBeLessThanOrEqual(TRACE);
        }
      }
      if (theme === 'light') {
        // The warm filter's functions at 0.1%, on the night painting the sunset fades in.
        expect(new Set(calls.find((call) => call.layer === 'night')?.filters), 'the night painting').toEqual(new Set(['brightness(.999) saturate(1.001) sepia(.001)']));
        expect(new Set(calls.find((call) => call.layer === 'stars')?.displays), 'the stars are shown for it').toEqual(new Set(['block']));
      }
      // The scene is ready only once the warm-up is over (no opening flight here): nothing of it is left.
      expect(await warmupRunning(page)).toBe(0);
    });
  }

  for (const theme of ['light', 'dark'] as const) {
    for (const size of [
      { name: '1447×722', use: { viewport: { width: 1447, height: 722 } } },
      { name: '834×1194', use: { viewport: { width: 834, height: 1194 } } },
      { name: '390×844@2', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    ]) {
      test.describe(`${theme}, ${size.name}`, () => {
        test.use(size.use);

        test('the warm-up changes no pixel of the hero by more than 3 levels', async ({ page }) => {
          await alreadyFlown(page);
          await storeDisplay(page, { theme });
          await stillStars(page);
          await recordWarmups(page, true);
          await page.goto('/', { waitUntil: 'load' });
          await hydrated(page);
          await expect.poll(() => warmupRunning(page), { timeout: 15_000 }).toBeGreaterThan(0);
          const hero = page.locator('[data-section="hero"]');
          // Held (it runs slowly), so it is on screen for the shot.
          await twoFrames(page);
          const shot = await hero.screenshot();
          await page.evaluate((id) => {
            for (const animation of document.getAnimations()) if (animation.id === id) animation.cancel();
          }, WARMUP_ID);
          await sceneReady(page);
          await twoFrames(page);
          const rest = await hero.screenshot();
          const pixels = async (png: Buffer) => sharp(png).raw().toBuffer({ resolveWithObject: true });
          const base = await pixels(rest);
          const warm = await pixels(shot);
          expect(warm.info.width, 'same size').toBe(base.info.width);
          expect(warm.info.height, 'same size').toBe(base.info.height);
          let max = 0;
          let sum = 0;
          for (let offset = 0; offset < base.data.length; offset += 1) {
            const delta = Math.abs((warm.data[offset] ?? 0) - (base.data[offset] ?? 0));
            max = Math.max(max, delta);
            sum += delta;
          }
          test.info().annotations.push({ type: 'pixels', description: `${theme} ${size.name}: max ${max}, mean ${(sum / base.data.length).toFixed(3)} levels` });
          // A level or so here and there is the rounding of the extra blends and the gradients' dither;
          // a change anyone could see is many levels (the painting on show put on a layer of its own,
          // as the day painting under the night one did, moved its edges by 10-51).
          expect(max, 'the largest change of a channel').toBeLessThanOrEqual(3);
          expect(sum / base.data.length, 'the mean change of a channel').toBeLessThan(0.5);
        });
      });
    }
  }

  test('a theme change during the warm-up cancels it, and the change plays in full', async ({ page }) => {
    await alreadyFlown(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await recordWarmups(page, true);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await expect.poll(() => warmupRunning(page), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => warmupRunning(page)).toBe(0);
    // The sunset's seven animations, and nothing else, run on the layers.
    await expect.poll(() => skyAnimations(page)).toEqual(['day:', 'day:', 'night:', 'tint:', 'stars:', 'scrim-day:', 'scrim-night:']);
    await sceneReady(page);
  });

  test('a change the scene never heard (before its chunk arrived) is not warmed over', async ({ page }) => {
    await alreadyFlown(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await recordWarmups(page);
    // Holds the scene's chunk until the sunset is playing.
    let release = (): void => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/_next/static/chunks/*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes(SCENE_CHUNK_MARKER)) await released;
      await route.fulfill({ response, body });
    });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => skyAnimations(page)).toHaveLength(7);
    // Every frame from now until the sunset is over: the sky's animations, and whether a painting shows.
    const watching = page.evaluate((selector) => {
      const frames: { readonly ids: string[]; readonly day: number; readonly night: number }[] = [];
      return new Promise<typeof frames>((resolve) => {
        const step = () => {
          const layers = [...document.querySelectorAll(selector)];
          const ids = layers.flatMap((element) => element.getAnimations().map((animation) => animation.id));
          const opacity = (name: string) => Number(getComputedStyle(document.querySelector(`[data-hero-layer="${name}"]`) as Element).opacity);
          frames.push({ ids, day: opacity('day'), night: opacity('night') });
          if (ids.length === 0) resolve(frames);
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, SKY_LAYERS);
    release();
    // The scene starts while the sunset plays (its gate opens in a few hundred ms; the sunset lasts 2.8 s).
    await sceneReady(page);
    const readyWhilePlaying = (await skyAnimations(page)).length > 0;
    const frames = await watching;
    expect(readyWhilePlaying, 'the scene became ready while the sunset still played (else this test proves nothing)').toBe(true);
    expect(
      frames.filter((frame) => frame.ids.includes(WARMUP_ID)),
      'no warm-up animation while the sunset plays',
    ).toEqual([]);
    // The crossfade's midpoint has each painting just under 0.5; the warm-up over it had both near 0.
    expect(
      frames.filter((frame) => frame.day + frame.night < 0.5),
      'the paintings show in every frame',
    ).toEqual([]);
    expect(await warmups(page), 'and none at all: the sunset did that work').toEqual([]);
  });

  test('a theme change before the page settles leaves nothing to warm', async ({ page }) => {
    await alreadyFlown(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await recordWarmups(page);
    // Holds idle callbacks until the change has happened: the start gate's last step is one, with a
    // 1 s timeout (dragon/settled.ts).
    await page.addInitScript(() => {
      const held: { readonly callback: IdleRequestCallback; readonly timeout: number | undefined }[] = [];
      window.requestIdleCallback = (callback, options) => {
        held.push({ callback, timeout: options?.timeout });
        return held.length;
      };
      window.cancelIdleCallback = () => {};
      const hold = window as unknown as { __gateHeld: () => boolean; __releaseIdle: () => void };
      hold.__gateHeld = () => held.some((entry) => entry.timeout === 1_000);
      hold.__releaseIdle = () => {
        for (const { callback } of held.splice(0)) callback({ didTimeout: true, timeRemaining: () => 0 });
      };
    });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __gateHeld: () => boolean }).__gateHeld()), { timeout: 15_000 }).toBe(true);
    await page.emulateMedia({ colorScheme: 'dark' });
    // The page hears of the change at its next rendering update: wait for it before the gate opens.
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    await page.evaluate(() => (window as unknown as { __releaseIdle: () => void }).__releaseIdle());
    await sceneReady(page);
    expect(await warmups(page)).toEqual([]);
  });

  test('reduced motion turned on during the warm-up ends it at once', async ({ page }) => {
    await alreadyFlown(page);
    await storeDisplay(page, { theme: 'light' });
    await recordWarmups(page, true);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await expect.poll(() => warmupRunning(page), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => warmupRunning(page)).toBe(0);
    expect(await skyAnimations(page), 'nothing animates the sky').toEqual([]);
    // The island ends the scene under reduced motion: the dragon is gone, and never became ready.
    await expect(page.locator(DRAGON)).toHaveCount(0);
  });

  test('reduced motion: nothing is warmed', async ({ page }) => {
    await storeDisplay(page, { theme: 'light', motion: 'reduce' });
    await recordWarmups(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForTimeout(1_500);
    expect(await warmups(page)).toEqual([]);
  });
});

test.describe('the dragon', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: with no opening flight, before it is ready, the dragon is drawn in both themes' filters along its path, at a strength no screen shows`, async ({ page }) => {
      await alreadyFlown(page);
      await storeDisplay(page, { theme });
      await recordDragon(page);
      await page.goto('/', { waitUntil: 'load' });
      await sceneReady(page);
      const log = await dragonLog(page);
      const readyAt = log.find((entry) => entry.renderer !== '')?.at ?? Number.POSITIVE_INFINITY;
      const drawn = log.filter((entry) => entry.opacity !== '' && Number(entry.opacity) > 0);
      expect(drawn.length, 'the dragon was drawn').toBeGreaterThan(0);
      for (const entry of drawn) {
        expect(Number(entry.opacity), `opacity before any flight (${entry.flight})`).toBeLessThanOrEqual(TRACE);
        expect(entry.at, 'drawn before the dragon was ready').toBeLessThan(readyAt);
      }
      // At night it has a moonlit drop-shadow: the other theme's filter is drawn too.
      const shadowed = (entry: { readonly filter: string }) => entry.filter.includes('drop-shadow');
      const otherTheme = drawn.filter((entry) => entry.warm);
      const ownTheme = drawn.filter((entry) => !entry.warm);
      expect(otherTheme.length, 'drawn in the other theme’s filter').toBeGreaterThan(0);
      expect(ownTheme.length, 'drawn in the theme on show’s filter').toBeGreaterThan(0);
      for (const entry of otherTheme) expect(shadowed(entry), `the other theme (${theme} on show)`).toBe(theme === 'light');
      for (const entry of ownTheme) expect(shadowed(entry), `the theme on show (${theme})`).toBe(theme === 'dark');
      expect(new Set(drawn.map((entry) => entry.haze)).size, 'at several poses along the path').toBeGreaterThanOrEqual(3);
      // Then hidden, and back on its own theme's filter.
      expect(await page.locator(DRAGON).evaluate((dragon: HTMLElement) => ({ opacity: dragon.style.opacity, warm: dragon.hasAttribute('data-warm') }))).toEqual({
        opacity: '0',
        warm: false,
      });
    });
  }

  test('with an opening flight due, the dragon is ready as soon as it is built and flies 1.2 s after first paint, within a frame', async ({ page }) => {
    await storeDisplay(page, { theme: 'light' });
    await recordDragon(page);
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator(DRAGON)).toHaveAttribute('data-flight', 'flying', { timeout: 15_000 });
    const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0);
    const log = await dragonLog(page);
    const readyAt = log.find((entry) => entry.renderer !== '')?.at ?? Number.NaN;
    const flyingAt = log.find((entry) => entry.flight === 'flying')?.at ?? Number.NaN;
    const firstSeen = log[0]?.at ?? Number.NaN;
    // Nothing of the warm-up comes before ready: no pose, no other theme's filter.
    expect(
      log.filter((entry) => entry.at < readyAt && (entry.warm || Number(entry.opacity) > 0)),
      'no warm-up pose before the dragon is ready',
    ).toEqual([]);
    test.info().annotations.push({ type: 'opening', description: `from first paint: ready ${Math.round(readyAt - fcp)} ms, flying ${Math.round(flyingAt - fcp)} ms` });
    // The slot is max(first paint, the island's mount) + 1.2 s; the island mounts before the scene
    // first writes to its dragon, so the flight is due no later than that + 1.2 s.
    expect(flyingAt - fcp, 'never before first paint + 1.2 s').toBeGreaterThanOrEqual(1199);
    expect(flyingAt, 'at its slot, within a frame (not held back by the warm-up)').toBeLessThanOrEqual(Math.max(fcp, firstSeen) + 1200 + 17);
    // The other theme's filter was warmed between ready and the slot, where that fitted.
    const warmedBeforeFlight = log.filter((entry) => entry.at > readyAt && entry.at < flyingAt && entry.warm && Number(entry.opacity) === TRACE);
    if (flyingAt - readyAt > 300) expect(warmedBeforeFlight.length, 'the night filter warmed before the slot').toBeGreaterThan(0);
  });

  test('a theme change during the dragon’s warm-up stops it, and the switch flight goes 1.6 s later', async ({ page }) => {
    await alreadyFlown(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await recordDragon(page);
    await page.goto('/', { waitUntil: 'load' });
    await expect.poll(() => dragonWarming(page), { timeout: 15_000 }).toBe(true);
    await page.emulateMedia({ colorScheme: 'dark' });
    // Hidden again, on its own filter, at once (within a frame or two of the change).
    await expect
      .poll(() => page.locator(DRAGON).evaluate((dragon: HTMLElement) => ({ opacity: dragon.style.opacity, warm: dragon.hasAttribute('data-warm') })), { timeout: 1_000 })
      .toEqual({ opacity: '0', warm: false });
    await sceneReady(page);
    await expect(page.locator(DRAGON), 'the switch flight').toHaveAttribute('data-flight', 'flying', { timeout: 4_000 });
  });

  test('reduced motion turned on during the dragon’s warm-up stops it, and no dragon flies', async ({ page }) => {
    await alreadyFlown(page);
    await storeDisplay(page, { theme: 'light' });
    await recordDragon(page);
    await page.goto('/', { waitUntil: 'load' });
    await expect.poll(() => dragonWarming(page), { timeout: 15_000 }).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // The island ends the scene under reduced motion: the dragon is gone at once.
    await expect(page.locator(DRAGON)).toHaveCount(0, { timeout: 1_000 });
    await page.waitForTimeout(2_000);
    const log = await dragonLog(page);
    expect(log.filter((entry) => entry.flight === 'flying'), 'no flight').toEqual([]);
    expect(log.filter((entry) => entry.renderer !== ''), 'never ready').toEqual([]);
    expect(await page.locator(DRAGON).count(), 'and no dragon came back').toBe(0);
  });
});
