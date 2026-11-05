import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { sceneReady } from '../support/dragon';
import { hydrated, storeDisplay } from '../support/page';
import { recordWarmups, WARMUP_ID, warmupRunning, warmups } from '../support/warmup';

/*
 * The sky's warm-up (smooth-sky follow-up; src/components/sections/home/sky-warmup.ts). On a cold
 * GPU cache the first sunset or sunrise used to compile the GPU programs for the sky's effects and
 * decode the other painting in its first frames: two or three frames of 55-130 ms. Once the page
 * has settled, before any theme change and with a hardware WebGL context, the scene chunk now
 * draws the layers the next change fades in for 0.5 s at opacity 0.002, so that work is done
 * before the first change. The scene is ready to fly only after it, and a theme change cancels it.
 *
 * The default headless Chromium renders in software (SwiftShader), where nothing is warmed
 * (hero-dragon.spec.ts checks that), so this file launches Chromium on the GPU, as
 * hero-webgl.spec.ts does: at the top level, because a launch option needs a worker of its own.
 * Desktop project only; the pixel check sets its own sizes.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

test.use({ reducedMotion: 'no-preference', launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } });

const TRACE = 0.002;

/** Software WebGL renderers. Written again here on purpose: the probe must not share renderer.ts's rule. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Skips the test unless this browser has hardware WebGL (the probe hero-webgl.spec.ts uses). */
async function requireHardwareWebGL(page: Page): Promise<void> {
  await page.goto('about:blank');
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!gl) return null;
    let name = String(gl.getParameter(gl.RENDERER));
    if (name === 'WebKit WebGL') {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    }
    return name;
  });
  test.skip(renderer === null || SOFTWARE.test(renderer), `no hardware WebGL in this browser (${renderer ?? 'no context'})`);
}

/** A session that has already seen the opening flight, so the dragon stays idle. */
async function alreadyFlown(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gm.dragon', '1');
    } catch {
      // Without storage the opening flight would fly; nothing here depends on it.
    }
  });
}

async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'a GPU browser of its own; the desktop project is enough');
  await requireHardwareWebGL(page);
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: once settled, the layers the next change fades in are drawn once, at a strength no screen shows`, async ({ page }) => {
    await alreadyFlown(page);
    await storeDisplay(page, { theme });
    await recordWarmups(page);
    await page.goto('/', { waitUntil: 'load' });
    await sceneReady(page);
    expect(await page.locator('.hero-dragon').getAttribute('data-renderer'), 'on the GPU').toBe('webgl');
    const calls = await warmups(page);
    // Each layer the next change fades in, once; nothing on show is touched.
    const expected = theme === 'light' ? ['night', 'tint', 'scrim-night', 'stars'] : ['day', 'tint', 'scrim-day'];
    expect(calls.map((call) => call.layer).sort()).toEqual([...expected].sort());
    for (const call of calls) {
      const label = String(call.layer);
      for (const value of call.opacities) {
        expect(value, `${label} is drawn`).toBeGreaterThan(0);
        expect(value, `${label} stays below what a screen shows`).toBeLessThanOrEqual(TRACE);
      }
    }
    // The warm filter's functions at 0.1%, on the painting the change fades in.
    const painting = calls.find((call) => call.layer === (theme === 'light' ? 'night' : 'day'));
    expect(new Set(painting?.filters), 'the painting the change fades in').toEqual(new Set(['brightness(.999) saturate(1.001) sepia(.001)']));
    if (theme === 'light') expect(new Set(calls.find((call) => call.layer === 'stars')?.displays), 'the stars are shown for it').toEqual(new Set(['block']));
    // The scene is ready only once the warm-up is over: nothing of it is left.
    expect(await warmupRunning(page)).toBe(0);
  });
}

for (const size of [
  { name: 'a 1447×722 desktop', use: { viewport: { width: 1447, height: 722 } } },
  { name: 'an 834×1194 tablet', use: { viewport: { width: 834, height: 1194 } } },
  { name: 'a 390×844 phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
]) {
  test.describe(size.name, () => {
    test.use(size.use);

    test('the warm-up changes no pixel of the hero by more than a few levels', async ({ page }) => {
      await alreadyFlown(page);
      await storeDisplay(page, { theme: 'light' });
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
      // A level or so here and there is the rounding of the extra blends and the gradients' dither,
      // laid out over the layers in another order (0.25-0.37 on average on the GPU); a change
      // anyone could see is many levels (the painting on show drawn by the compositor instead
      // moved its edges by up to 40 on a tablet).
      expect(max, 'the largest change of a channel').toBeLessThanOrEqual(3);
      expect(sum / base.data.length, 'the mean change of a channel').toBeLessThan(0.5);
    });
  });
}

interface DragonRecord {
  __dragon: { readonly opacity: string; readonly warm: boolean; readonly filter: string; readonly haze: string; readonly flight: string }[];
}

/**
 * The dragon's warm-up (dragon/scene.ts): before it is ready, it is drawn at a few poses along its
 * path in the theme on show's filter and in the other theme's, at opacity 0.002, then hidden. Records
 * every change of the dragon's style or data-warm (before any page script runs).
 */
async function recordDragon(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = window as unknown as DragonRecord;
    record.__dragon = [];
    const seen = (dragon: HTMLElement) =>
      record.__dragon.push({
        opacity: dragon.style.opacity,
        warm: dragon.hasAttribute('data-warm'),
        filter: getComputedStyle(dragon).filter,
        haze: dragon.style.getPropertyValue('--haze'),
        flight: dragon.dataset.flight ?? '',
      });
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target as HTMLElement;
        if (target.classList?.contains('hero-dragon')) seen(target);
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style', 'data-warm'] });
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: before it is ready, the dragon is drawn in both themes' filters along its path, at a strength no screen shows`, async ({ page }) => {
    await alreadyFlown(page);
    await storeDisplay(page, { theme });
    await recordDragon(page);
    await page.goto('/', { waitUntil: 'load' });
    await sceneReady(page);
    const records = await page.evaluate(() => (window as unknown as DragonRecord).__dragon);
    const drawn = records.filter((record) => record.opacity !== '' && Number(record.opacity) > 0);
    expect(drawn.length, 'the dragon was drawn').toBeGreaterThan(0);
    for (const record of drawn) expect(Number(record.opacity), `opacity before any flight (${record.flight})`).toBeLessThanOrEqual(TRACE);
    // At night it has a moonlit drop-shadow: the other theme's filter is drawn too.
    const shadowed = (record: { readonly filter: string }) => record.filter.includes('drop-shadow');
    const otherTheme = drawn.filter((record) => record.warm);
    const ownTheme = drawn.filter((record) => !record.warm);
    expect(otherTheme.length, 'drawn in the other theme’s filter').toBeGreaterThan(0);
    expect(ownTheme.length, 'drawn in the theme on show’s filter').toBeGreaterThan(0);
    for (const record of otherTheme) expect(shadowed(record), `the other theme (${theme} on show)`).toBe(theme === 'light');
    for (const record of ownTheme) expect(shadowed(record), `the theme on show (${theme})`).toBe(theme === 'dark');
    expect(new Set(drawn.map((record) => record.haze)).size, 'at several poses along the path').toBeGreaterThanOrEqual(3);
    // Then hidden, and back on its own theme's filter.
    expect(await page.locator('.hero-dragon').evaluate((dragon: HTMLElement) => ({ opacity: dragon.style.opacity, warm: dragon.hasAttribute('data-warm') }))).toEqual({
      opacity: '0',
      warm: false,
    });
  });
}

test('the dragon’s filters are the same values as before (custom properties)', async ({ page }) => {
  await alreadyFlown(page);
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await sceneReady(page);
  const filterAt = (haze: string, dark: boolean) =>
    page.locator('.hero-dragon').evaluate(
      (dragon: HTMLElement, { value, night }) => {
        document.documentElement.classList.toggle('dark', night);
        dragon.style.setProperty('--haze', value);
        const filter = getComputedStyle(dragon).filter;
        document.documentElement.classList.remove('dark');
        return filter;
      },
      { value: haze, night: dark },
    );
  expect(await filterAt('0.5', false)).toBe('saturate(0.825) contrast(0.85) brightness(1.035) blur(0.25px)');
  expect(await filterAt('0.5', true)).toBe('brightness(0.78) saturate(0.78) blur(0.25px) drop-shadow(rgba(165, 195, 255, 0.55) 0px 0px 9px)');
});

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
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-section="hero"] [data-hero-layer]')].flatMap((element) =>
          element.getAnimations().map((animation) => `${element.getAttribute('data-hero-layer')}:${animation.id}`),
        ),
      ),
    )
    .toEqual(['day:', 'day:', 'night:', 'tint:', 'stars:', 'scrim-day:', 'scrim-night:']);
  await sceneReady(page);
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

test('reduced motion: nothing is warmed', async ({ page }) => {
  await storeDisplay(page, { theme: 'light', motion: 'reduce' });
  await recordWarmups(page);
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.waitForTimeout(1_500);
  expect(await warmups(page)).toEqual([]);
});
