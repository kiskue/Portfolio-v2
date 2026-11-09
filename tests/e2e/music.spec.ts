import { expect, test, type Locator, type Page } from '@playwright/test';
import { music } from '@/content/music';
import { hydrated, isDesktopShell } from '../support/page';

/*
 * The opt-in music (design: "Ride The Wind"), against the production build. Sound never starts on
 * its own; the speaker is the fifth circle of the rail's social row (the menu sheet on phones and
 * tablets); the player code is a lazy chunk that loads on the first press.
 *
 * An init script counts HTMLMediaElement play/pause calls, Audio elements and AudioContext
 * constructions, and keeps the last media element as window.__qaMedia. Playing is proven by the
 * element's currentTime moving: `paused` is already false the moment play() is called.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

// Reduced motion keeps the dragon's chunk out of the way: the only script requested after load is the player's.
test.use({ reducedMotion: 'reduce' });

declare global {
  interface Window {
    __qa: { play: number; pause: number; contexts: number; audios: number };
    __qaMedia: HTMLMediaElement | undefined;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__qa = { play: 0, pause: 0, contexts: 0, audios: 0 };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__qa.play += 1;
      window.__qaMedia = this;
      return play.call(this);
    };
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      window.__qa.pause += 1;
      window.__qaMedia = this;
      return pause.call(this);
    };
    const OriginalAudio = window.Audio;
    const CountedAudio = function (this: unknown, ...args: ConstructorParameters<typeof Audio>) {
      window.__qa.audios += 1;
      return new OriginalAudio(...args);
    } as unknown as typeof Audio;
    CountedAudio.prototype = OriginalAudio.prototype;
    window.Audio = CountedAudio;
    const OriginalContext = window.AudioContext;
    if (OriginalContext) {
      const CountedContext = function (this: unknown, ...args: ConstructorParameters<typeof AudioContext>) {
        window.__qa.contexts += 1;
        return new OriginalContext(...args);
      } as unknown as typeof AudioContext;
      CountedContext.prototype = OriginalContext.prototype;
      window.AudioContext = CountedContext;
    }
  });
});

/** Every request path that starts with /audio/. */
function trackAudioRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/audio/')) paths.push(pathname);
  });
  return paths;
}

/** The first-party scripts requested so far. */
function trackScripts(page: Page): Set<string> {
  const scripts = new Set<string>();
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/_next\/static\/.*\.js$/.test(pathname)) scripts.add(pathname);
  });
  return scripts;
}

/** The speaker, by its stable title (its accessible name flips between Play and Pause). */
function speaker(page: Page): Locator {
  return page.locator(`button[title="Music: ${music.credit}"]`).filter({ visible: true });
}

/** Opens the menu sheet below 1280px. */
async function openSheet(page: Page): Promise<void> {
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
}

/** Opens the menu sheet below 1280px; returns the speaker, visible. */
async function reachSpeaker(page: Page): Promise<Locator> {
  if (!isDesktopShell(page)) await openSheet(page);
  const button = speaker(page);
  await expect(button).toBeVisible();
  return button;
}

/** A client-side navigation to /about through the nav link (no document load). */
async function clientNavigateToAbout(page: Page): Promise<void> {
  if (isDesktopShell(page)) {
    await page.getByRole('complementary', { name: 'Profile and site navigation' }).getByRole('link', { name: 'About' }).click();
  } else {
    await openSheet(page);
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'About' }).click();
  }
  await expect(page).toHaveURL(/\/about$/);
}

async function mediaPaused(page: Page): Promise<boolean | null> {
  return page.evaluate(() => window.__qaMedia?.paused ?? null);
}

async function mediaTime(page: Page): Promise<number> {
  return page.evaluate(() => window.__qaMedia?.currentTime ?? 0);
}

async function counters(page: Page): Promise<{ play: number; contexts: number; audios: number }> {
  return page.evaluate(() => ({ play: window.__qa.play, contexts: window.__qa.contexts, audios: window.__qa.audios }));
}

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the site never plays sound on its own', async ({ page }) => {
    const audio = trackAudioRequests(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForTimeout(3_000);
    expect(await counters(page), 'on Home after 3 s').toEqual({ play: 0, contexts: 0, audios: 0 });
    expect(audio, 'audio requests on Home').toEqual([]);
    // A client-side navigation keeps the page (and the counters); a full load would reset them.
    await clientNavigateToAbout(page);
    await page.waitForTimeout(1_000);
    expect(await counters(page), 'on About after 1 s').toEqual({ play: 0, contexts: 0, audios: 0 });
    expect(audio, 'audio requests on About').toEqual([]);
  });
});

test('the speaker plays the song and stops it', async ({ page }) => {
  const audio = trackAudioRequests(page);
  const scripts = trackScripts(page);
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.waitForTimeout(1_000);
  const button = await reachSpeaker(page);
  await expect(button).toHaveAccessibleName('Play music');
  const before = new Set(scripts);
  await button.click();
  await expect(button).toHaveAccessibleName('Pause music');
  // The song really runs: its clock moves, it loops and it is not muted.
  await expect.poll(() => mediaTime(page), { timeout: 5_000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__qaMedia?.loop)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__qaMedia?.muted), { timeout: 3_000 }).toBe(false);
  expect(audio.filter((path) => path === music.src), 'requests for the song').toHaveLength(1);
  // The player chunk has loaded, so the stop below runs the real fade-out path.
  await expect.poll(() => [...scripts].filter((url) => !before.has(url)).length, { timeout: 3_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await button.click();
  await expect(button).toHaveAccessibleName('Play music');
  await expect.poll(() => mediaPaused(page), { timeout: 2_000 }).toBe(true);
});

test('the button follows a pause and a resume from the media controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one project is enough');
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await button.click();
  await expect.poll(() => mediaTime(page), { timeout: 5_000 }).toBeGreaterThan(0);
  // Only the player unmutes the element, so its listeners are on.
  await expect.poll(() => page.evaluate(() => window.__qaMedia?.muted), { timeout: 3_000 }).toBe(false);
  // The OS controls (lock screen, headset, media key) act on the element itself.
  await page.evaluate(() => window.__qaMedia?.pause());
  await expect(button, 'an outside pause').toHaveAccessibleName('Play music', { timeout: 1_000 });
  await page.evaluate(() => window.__qaMedia?.play());
  await expect(button, 'an outside resume').toHaveAccessibleName('Pause music', { timeout: 1_000 });
  const resumed = await mediaTime(page);
  await expect.poll(() => mediaTime(page), { message: 'the song runs again', timeout: 3_000 }).toBeGreaterThan(resumed);
});

test('the player chunk loads on the first press', async ({ page }) => {
  const scripts = trackScripts(page);
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.waitForTimeout(1_000);
  const button = await reachSpeaker(page);
  const before = new Set(scripts);
  await button.click();
  await expect.poll(() => [...scripts].filter((url) => !before.has(url)).length, { timeout: 2_000 }).toBeGreaterThan(0);
});

test('music keeps playing across pages', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the docked rail stays on screen only on desktop');
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const rail = page.getByRole('complementary', { name: 'Profile and site navigation' });
  await rail.getByRole('button', { name: 'Play music' }).click();
  await expect.poll(() => mediaTime(page), { timeout: 5_000 }).toBeGreaterThan(0);
  await rail.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
  const atNavigation = await mediaTime(page);
  await page.waitForTimeout(700);
  expect(await mediaTime(page), 'the song kept running').toBeGreaterThan(atNavigation);
  expect(await mediaPaused(page)).toBe(false);
  await expect(rail.getByRole('button', { name: 'Pause music' })).toBeVisible();
});

test('the speaker button carries the credit', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await expect(button).toHaveAttribute('title', `Music: ${music.credit}`);
  await expect(button).toHaveAccessibleDescription(`Music: ${music.credit}`);
});

/** The social row's geometry: circles of `circle` px on one row, inside the rail's content box, no scrolling. */
async function expectRailFits(page: Page, width: number, height: number, circle: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const rail = page.getByRole('complementary', { name: 'Profile and site navigation' });
  const row = rail.locator('ul', { has: page.locator('button[aria-label$="music"]') });
  await expect(row.locator('li')).toHaveCount(5);
  const geometry = await row.evaluate((ul) => {
    const aside = ul.closest('aside');
    const items = [...ul.querySelectorAll('li')].map((li) => li.getBoundingClientRect());
    const sizes = [...ul.querySelectorAll('li > a, li > button')].map((el) => {
      const r = el.getBoundingClientRect();
      return [r.width, r.height];
    });
    // The rail's root is the aside's first child; its horizontal padding makes the content box.
    const root = aside?.firstElementChild;
    const style = root ? getComputedStyle(root) : null;
    const padding = style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 0;
    const contentRight = root && style ? root.getBoundingClientRect().right - parseFloat(style.paddingRight) : 0;
    return {
      tops: items.map((r) => r.top),
      sizes,
      padding,
      lastRight: items[items.length - 1]?.right ?? 0,
      contentRight,
      scrollHeight: aside?.scrollHeight ?? 0,
      clientHeight: aside?.clientHeight ?? 0,
    };
  });
  expect(geometry.padding, 'the rail root carries the side padding').toBeGreaterThan(0);
  const [first = 0] = geometry.tops;
  for (const top of geometry.tops) expect(Math.abs(top - first), `row tops ${geometry.tops.join(', ')}`).toBeLessThanOrEqual(1);
  for (const [w = 0, h = 0] of geometry.sizes) {
    expect(Math.abs(w - circle), `circle width ${w}`).toBeLessThanOrEqual(1);
    expect(Math.abs(h - circle), `circle height ${h}`).toBeLessThanOrEqual(1);
  }
  expect(geometry.lastRight, 'the last circle ends inside the content box').toBeLessThanOrEqual(geometry.contentRight + 0.5);
  expect(geometry.scrollHeight, 'the rail does not scroll').toBeLessThanOrEqual(geometry.clientHeight + 1);
}

test.describe('the rail', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the docked rail is the desktop project');
  });

  test('the rail fits five circles on one row', async ({ page }) => {
    await expectRailFits(page, 1280, 720, 36);
    await expectRailFits(page, 1600, 900, 36);
  });

  test.describe('with a coarse pointer', () => {
    test.use({ isMobile: true, hasTouch: true });

    test('the rail fits five circles on one row', async ({ page }) => {
      await expectRailFits(page, 1280, 720, 40);
    });
  });
});

test('the menu sheet has the speaker and does not overflow', async ({ page }) => {
  test.skip(isDesktopShell(page), 'the sheet belongs to the narrow layouts');
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await expect(button).toHaveAccessibleName('Play music');
  const tops = await button.evaluate((el) => {
    const row = el.closest('ul');
    return row ? [...row.querySelectorAll('li')].map((li) => li.getBoundingClientRect().top) : [];
  });
  expect(tops).toHaveLength(5);
  const [first = 0] = tops;
  for (const top of tops) expect(Math.abs(top - first), `row tops ${tops.join(', ')}`).toBeLessThanOrEqual(1);
});

test('a double press while loading ends silent', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.waitForTimeout(1_000);
  const button = await reachSpeaker(page);
  // After load (reduced motion) the player is the only script still to come: hold it, so the second press lands while it loads.
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = 0;
  await page.route('**/_next/static/chunks/*.js', async (route) => {
    held += 1;
    await gate;
    await route.continue();
  });
  await button.click();
  await expect.poll(() => held, { timeout: 3_000 }).toBeGreaterThan(0);
  await button.click();
  await expect(button).toHaveAccessibleName('Play music');
  release();
  await page.waitForTimeout(3_000);
  await expect(button).toHaveAccessibleName('Play music');
  expect((await counters(page)).play, 'the first press did start the song').toBeGreaterThanOrEqual(1);
  expect(await mediaPaused(page)).toBe(true);
});

test('a failed audio load returns the button to Play music', async ({ page }) => {
  // Chrome logs its own 404 resource line for the song, so only uncaught page errors are checked.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let hits = 0;
  await page.route('**/audio/**', (route) => {
    hits += 1;
    return route.fulfill({ status: 404, body: 'not found' });
  });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await button.click();
  await expect.poll(() => hits, { timeout: 3_000 }).toBeGreaterThan(0);
  await expect(button).toHaveAccessibleName('Play music', { timeout: 3_000 });
  expect((await counters(page)).play, 'the press did start playback').toBeGreaterThanOrEqual(1);
  expect(pageErrors).toEqual([]);
});
