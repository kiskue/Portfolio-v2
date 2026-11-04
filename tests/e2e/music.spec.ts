import { expect, test, type Locator, type Page } from '@playwright/test';
import { music } from '@/content/music';
import { hydrated, isDesktopShell } from '../support/page';

/*
 * The opt-in music (design: "Ride The Wind"), against the production build. Sound never starts on
 * its own; the speaker is the fifth circle of the rail's social row (the menu sheet on phones and
 * tablets); the player code is a lazy chunk that loads on the first press.
 *
 * An init script counts HTMLMediaElement play/pause calls and AudioContext constructions, and keeps
 * the last media element as window.__qaMedia.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

declare global {
  interface Window {
    __qa: { play: number; pause: number; contexts: number };
    __qaMedia: HTMLMediaElement | undefined;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__qa = { play: 0, pause: 0, contexts: 0 };
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
    const Original = window.AudioContext;
    if (Original) {
      const Counted = function (this: unknown, ...args: ConstructorParameters<typeof AudioContext>) {
        window.__qa.contexts += 1;
        return new Original(...args);
      } as unknown as typeof AudioContext;
      Counted.prototype = Original.prototype;
      window.AudioContext = Counted;
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

/** The speaker, by its stable title (its accessible name flips between Play and Pause). */
function speaker(page: Page): Locator {
  return page.locator(`button[title="Music: ${music.credit}"]`).filter({ visible: true });
}

/** Opens the menu sheet below 1280px; returns the speaker, visible. */
async function reachSpeaker(page: Page): Promise<Locator> {
  if (!isDesktopShell(page)) {
    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  }
  const button = speaker(page);
  await expect(button).toBeVisible();
  return button;
}

async function mediaPaused(page: Page): Promise<boolean | null> {
  return page.evaluate(() => window.__qaMedia?.paused ?? null);
}

test('the site never plays sound on its own', async ({ page }) => {
  const audio = trackAudioRequests(page);
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.waitForTimeout(3_000);
  await page.goto('/about', { waitUntil: 'load' });
  await page.waitForTimeout(1_000);
  expect(await page.evaluate(() => window.__qa.play), 'play() calls').toBe(0);
  expect(await page.evaluate(() => window.__qa.contexts), 'AudioContexts').toBe(0);
  expect(audio, 'audio requests').toEqual([]);
});

test('the speaker plays the song and stops it', async ({ page }) => {
  const audio = trackAudioRequests(page);
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await expect(button).toHaveAccessibleName('Play music');
  await button.click();
  await expect(button).toHaveAccessibleName('Pause music');
  await expect.poll(() => mediaPaused(page), { timeout: 3_000 }).toBe(false);
  expect(await page.evaluate(() => window.__qaMedia?.loop)).toBe(true);
  expect(audio.filter((path) => path === music.src), 'requests for the song').toHaveLength(1);
  await button.click();
  await expect(button).toHaveAccessibleName('Play music');
  await expect.poll(() => mediaPaused(page), { timeout: 2_000 }).toBe(true);
});

test.describe('the player chunk', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the player chunk loads on the first press', async ({ page }) => {
    const scripts = new Set<string>();
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      if (/^\/_next\/static\/.*\.js$/.test(pathname)) scripts.add(pathname);
    });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForTimeout(1_000);
    const button = await reachSpeaker(page);
    const before = new Set(scripts);
    await button.click();
    await expect.poll(() => [...scripts].filter((url) => !before.has(url)).length, { timeout: 2_000 }).toBeGreaterThan(0);
  });
});

test('music keeps playing across pages', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the docked rail stays on screen only on desktop');
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const rail = page.getByRole('complementary', { name: 'Profile and site navigation' });
  const button = rail.getByRole('button', { name: 'Play music' });
  await button.click();
  await expect.poll(() => mediaPaused(page), { timeout: 3_000 }).toBe(false);
  await rail.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.waitForTimeout(500);
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

/** The social row's geometry: one row, inside the rail's content box, no scrolling. */
async function expectRailFits(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const rail = page.getByRole('complementary', { name: 'Profile and site navigation' });
  const row = rail.locator('ul', { has: page.locator('button[aria-label$="music"]') });
  await expect(row.locator('li')).toHaveCount(5);
  const geometry = await row.evaluate((ul) => {
    const items = [...ul.querySelectorAll('li')].map((li) => li.getBoundingClientRect());
    const aside = ul.closest('aside');
    const box = ul.parentElement?.parentElement;
    const style = box ? getComputedStyle(box) : null;
    const contentRight = box && style ? box.getBoundingClientRect().right - parseFloat(style.paddingRight) : 0;
    return {
      tops: items.map((r) => r.top),
      lastRight: items[items.length - 1]?.right ?? 0,
      contentRight,
      scrollHeight: aside?.scrollHeight ?? 0,
      clientHeight: aside?.clientHeight ?? 0,
    };
  });
  const [first = 0] = geometry.tops;
  for (const top of geometry.tops) expect(Math.abs(top - first), `row tops ${geometry.tops.join(', ')}`).toBeLessThanOrEqual(1);
  expect(geometry.lastRight, 'the last circle ends inside the content box').toBeLessThanOrEqual(geometry.contentRight + 0.5);
  expect(geometry.scrollHeight, 'the rail does not scroll').toBeLessThanOrEqual(geometry.clientHeight + 1);
}

test.describe('the rail', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the docked rail is the desktop project');
  });

  test('the rail fits five circles on one row', async ({ page }) => {
    await expectRailFits(page, 1280, 720);
    await expectRailFits(page, 1600, 900);
  });

  test.describe('with a coarse pointer', () => {
    test.use({ isMobile: true, hasTouch: true });

    test('the rail fits five circles on one row', async ({ page }) => {
      await expectRailFits(page, 1280, 720);
    });
  });
});

test('the menu sheet has the speaker and does not overflow', async ({ page }) => {
  test.skip(isDesktopShell(page), 'the sheet belongs to the narrow layouts');
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await expect(button).toHaveAccessibleName('Play music');
  const fits = await button.evaluate((el) => {
    const row = el.closest('ul');
    return row ? row.scrollWidth <= row.clientWidth : false;
  });
  expect(fits, 'the row does not overflow').toBe(true);
});

test('a double press while loading ends silent', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await button.click();
  await button.click();
  await page.waitForTimeout(3_000);
  await expect(button).toHaveAccessibleName('Play music');
  expect(await mediaPaused(page)).not.toBe(false);
});

test('a failed audio load returns the button to Play music', async ({ page }) => {
  // Chrome logs its own 404 resource line for the song, so only uncaught page errors are checked.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/audio/**', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await reachSpeaker(page);
  await button.click();
  await expect(button).toHaveAccessibleName('Play music', { timeout: 3_000 });
  expect(pageErrors).toEqual([]);
});
