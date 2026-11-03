import { expect, test, type Page } from '@playwright/test';
import { music } from '@/content/music';
import { fontsReady, hydrated, storeDisplay } from '../support/page';

/*
 * The painted hero's static first screen (design §3.1, §3.5, §3.6), against the production build:
 * the painting follows the theme from CSS alone (no flash, no JavaScript), the head preloads the
 * AVIF for each OS colour scheme, the hero fills the first screen, the pill scrolls on, the credit
 * line sits on the painting with its two links, and no other page carries a hero.
 *
 * E2E specs run in plain Node: they import only content without a server-only guard (music.ts).
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

const DAY = '[data-hero-layer="day"]';
const NIGHT = '[data-hero-layer="night"]';

async function opacity(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((element) => getComputedStyle(element).opacity);
}

test('a stored dark theme shows the night painting before any script runs', async ({ page }) => {
  await storeDisplay(page, { theme: 'dark' });
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(await opacity(page, NIGHT), 'night layer').toBe('1');
  expect(await opacity(page, DAY), 'day layer').toBe('0');
});

test('light shows the day painting', async ({ page }) => {
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  expect(await opacity(page, DAY), 'day layer').toBe('1');
  expect(await opacity(page, NIGHT), 'night layer').toBe('0');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('without JavaScript the hero shows the day painting, the headline and the credit', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    expect(await opacity(page, DAY), 'day layer').toBe('1');
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('[data-hero-credit]')).toBeVisible();
    expect(await page.locator('[data-hero-layer="stars"]').evaluate((element) => getComputedStyle(element).display)).toBe('none');
  });
});

test('the head preloads the AVIF painting for each OS colour scheme', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const preloads = await page.locator('head link[rel="preload"][as="image"][href^="/scene/"]').evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute('href'),
      type: link.getAttribute('type'),
      media: link.getAttribute('media'),
      priority: link.getAttribute('fetchpriority'),
    })),
  );
  expect(preloads).toHaveLength(2);
  expect(preloads).toContainEqual({ href: '/scene/day.avif', type: 'image/avif', media: '(prefers-color-scheme: light)', priority: 'high' });
  expect(preloads).toContainEqual({ href: '/scene/night.avif', type: 'image/avif', media: '(prefers-color-scheme: dark)', priority: 'high' });
});

test('the hero fills the first screen', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'load' });
  await fontsReady(page);
  const rect = async (selector: string) => {
    const found = await page.locator(selector).boundingBox();
    expect(found, `${selector} is rendered`).not.toBeNull();
    return found as NonNullable<typeof found>;
  };
  const hero = () => rect('[data-section="hero"]');
  const main = () => rect('main#content');
  /*
   * The height is the brief's number when the page has no scrollbar (hidden scrollbars: the plan's
   * numbers); a classic 15px scrollbar narrows <main>, so the width-bound heights are then derived
   * from <main>'s own width.
   */
  // (clientWidth still reports the full width here, so the laid-out <html> width tells.)
  const scrollbar = () => page.evaluate(() => Math.round(window.innerWidth - document.documentElement.getBoundingClientRect().width));
  const expectHeight = async (rule: (width: number) => number, brief: number) => {
    const box = await hero();
    const area = await main();
    expect(box.x, 'x is main’s').toBeCloseTo(area.x, 0);
    expect(box.width, 'width is main’s').toBeCloseTo(area.width, 0);
    const want = (await scrollbar()) === 0 ? brief : rule(area.width);
    expect(Math.abs(box.height - want), `height ${box.height}, wanted ${want}`).toBeLessThanOrEqual(1);
    return box;
  };
  const viewport = page.viewportSize();
  const high = viewport?.height ?? 0;
  switch (testInfo.project.name) {
    case 'mobile': {
      await expectHeight(() => high - 60, 784);
      const position = await page.locator('img[data-hero-painting="day"]').evaluate((image) => getComputedStyle(image).objectPosition);
      expect(position).toBe('66% 50%');
      break;
    }
    case 'tablet':
      await expectHeight((width) => Math.min(high - 64, width * 0.75), 625.5);
      break;
    case 'desktop': {
      const box = await expectHeight((width) => Math.min(high, width * 0.75), 882);
      expect(Math.abs(box.y), 'y').toBeLessThanOrEqual(1);
      expect(Math.abs(box.x - 264), 'x').toBeLessThanOrEqual(1);
      expect(Math.abs(box.width - 1176 + (await scrollbar())), 'width').toBeLessThanOrEqual(1);
      await page.setViewportSize({ width: 2560, height: 1440 });
      await expect
        .poll(async () => {
          const wide = await hero();
          const area = await main();
          return Math.abs(wide.height - ((await scrollbar()) === 0 ? 972 : Math.min(1440, area.width * 0.75)));
        })
        .toBeLessThanOrEqual(1);
      break;
    }
    default:
      throw new Error(`unexpected project ${testInfo.project.name}`);
  }
});

test('the pill scrolls to the projects and services', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const pill = page.getByRole('link', { name: 'Projects, services and more' });
  await expect(pill).toHaveAttribute('href', '#home-more');
  await pill.click();
  await expect
    .poll(async () => page.locator('#home-more').evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(async () => page.locator('#home-more').evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBeLessThanOrEqual(80);
});

test('the credit is on the painting with its two links', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await fontsReady(page);
  const credit = page.locator('[data-hero-credit]');
  const text = await credit.evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    for (const hidden of copy.querySelectorAll('.sr-only')) hidden.remove();
    return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
  });
  expect(text).toBe(`Music: ${music.credit}`);
  await expect(credit.getByRole('link', { name: music.licenceLabel })).toHaveAttribute('href', music.licenceHref);
  await expect(credit.getByRole('link', { name: music.artistLabel })).toHaveAttribute('href', music.artistHref);
  const creditBox = await credit.boundingBox();
  const pillBox = await page.getByRole('link', { name: 'Projects, services and more' }).boundingBox();
  expect(creditBox, 'the credit is rendered').not.toBeNull();
  expect(pillBox, 'the pill is rendered').not.toBeNull();
  const a = creditBox as NonNullable<typeof creditBox>;
  const b = pillBox as NonNullable<typeof pillBox>;
  const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
  expect(apart, `credit ${JSON.stringify(a)} overlaps the pill ${JSON.stringify(b)}`).toBe(true);
});

test('other pages have no hero and request no scene files', async ({ page }) => {
  const scene: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/scene/')) scene.push(pathname);
  });
  for (const path of ['/about', '/projects']) {
    await page.goto(path, { waitUntil: 'load' });
    await hydrated(page);
    await expect(page.locator('[data-section="hero"]'), path).toHaveCount(0);
  }
  expect(scene).toEqual([]);
});
