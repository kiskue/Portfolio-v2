import { expect, test, type Page } from '@playwright/test';
import { music } from '@/content/music';
import { collectConsoleProblems, describeConsoleProblems } from '../support/console';
import { DRAGON, dragonState, flying, sampleFlight } from '../support/dragon';
import { fontsReady, hydrated, isDesktopShell, storeDisplay } from '../support/page';

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
  const pill = page.getByRole('link', { name: 'Projects, services and more', exact: true });
  await expect(pill).toHaveAttribute('href', '#home-more');
  await pill.click();
  // Smooth scrolling may be on: wait until two reads 100 ms apart agree, then judge that value.
  const settled = await page.locator('#home-more').evaluate(async (element) => {
    let last = Number.NaN;
    for (let tries = 0; tries < 100; tries += 1) {
      const top = Math.round(element.getBoundingClientRect().top);
      if (top === last) return top;
      last = top;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return last;
  });
  expect(settled, '#home-more top after the scroll settled').toBeGreaterThanOrEqual(0);
  expect(settled, '#home-more top after the scroll settled').toBeLessThanOrEqual(80);
});

test('on short screens the hero grows to fit its text: nothing overlaps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'sizes are set here; one project is enough');
  for (const size of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/', { waitUntil: 'load' });
    await fontsReady(page);
    const label = `${size.width}×${size.height}`;
    const rects = await page.evaluate(() => {
      const rect = (selector: string) => {
        const found = document.querySelector(selector)?.getBoundingClientRect();
        if (!found) throw new Error(`${selector} is not rendered`);
        return { top: found.top, bottom: found.bottom, left: found.left, right: found.right, height: found.height, width: found.width };
      };
      const main = document.querySelector('main#content');
      const gutter = main ? Number.parseFloat(getComputedStyle(main).paddingLeft) : 0;
      return {
        hero: rect('[data-section="hero"]'),
        header: rect('[data-section="hero"] header'),
        foot: rect('.hero-foot'),
        tools: rect('[data-section="tools"]'),
        main: main ? { width: main.getBoundingClientRect().width, gutter } : { width: 0, gutter },      };
    });
    const { hero, header, foot, tools, main } = rects;
    const wide = size.width >= 1280;
    const heroWidth = main.width + 2 * main.gutter;
    const formula = size.width < 768 ? size.height - 60 : wide ? Math.min(size.height, heroWidth * 0.75) : Math.min(size.height - 64, heroWidth * 0.75);
    expect(hero.height, `${label}: hero height ${hero.height} is at least ${formula}`).toBeGreaterThanOrEqual(formula - 1);
    expect(header.bottom, `${label}: the header ends inside the hero`).toBeLessThanOrEqual(hero.bottom + 0.5);
    const apart = foot.bottom <= header.top || header.bottom <= foot.top || foot.right <= header.left || header.right <= foot.left;
    expect(apart, `${label}: the foot ${JSON.stringify(foot)} overlaps the header ${JSON.stringify(header)}`).toBe(true);
    expect(tools.top, `${label}: the tools strip starts below the hero`).toBeGreaterThanOrEqual(hero.bottom - 1);
  }
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

/*
 * The sky change (design §3.2): the sunset or sunrise runs from a Web Animations island on the
 * theme change. The click tests use the docked rail's theme button, so they run on the desktop project.
 */
const LAYERS = ['day', 'night', 'tint', 'scrim-day', 'scrim-night', 'stars'] as const;

interface Running {
  readonly layer: string;
  readonly duration: number;
  readonly delay: number;
}

/** Every Web Animation on the hero's layers themselves (the stars' CSS animation runs on the lines inside). */
async function heroAnimations(page: Page): Promise<Running[]> {
  return page.evaluate((layers) => {
    const found: { layer: string; duration: number; delay: number }[] = [];
    for (const layer of layers) {
      const element = document.querySelector(`[data-section="hero"] [data-hero-layer="${layer}"]`);
      if (!element) continue;
      for (const animation of element.getAnimations()) {
        const timing = animation.effect?.getComputedTiming();
        found.push({ layer, duration: Number(timing?.duration), delay: Number(timing?.delay) });
      }
    }
    return found;
  }, LAYERS);
}

function themeButton(page: Page) {
  return page.getByRole('complementary').getByRole('button', { name: /Switch to (dark|light) theme/ });
}

type Timing = readonly [string, number, number];

const SUNSET_TIMINGS: readonly Timing[] = [
  ['day', 900, 0],
  ['day', 1300, 600],
  ['night', 1500, 550],
  ['tint', 2600, 0],
  ['scrim-day', 1200, 350],
  ['scrim-night', 1200, 350],
  ['stars', 600, 2200],
];

function sorted(list: readonly Timing[]): Timing[] {
  return [...list].sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
}

function timings(found: readonly Running[]): Timing[] {
  return sorted(found.map((entry): Timing => [entry.layer, entry.duration, entry.delay]));
}

test('switching to dark plays the sunset', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.getByRole('complementary').getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.waitForTimeout(100);
  expect(timings(await heroAnimations(page))).toEqual(sorted(SUNSET_TIMINGS));
  await page.waitForTimeout(3_200);
  expect(await heroAnimations(page), 'nothing runs after the sunset').toEqual([]);
  expect(await opacity(page, DAY), 'day layer').toBe('0');
  expect(await page.locator(DAY).evaluate((element) => getComputedStyle(element).filter)).toBe('none');
  expect(await opacity(page, NIGHT), 'night layer').toBe('1');
});

test('an OS change while on System plays it too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  expect(await heroAnimations(page)).toEqual([]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(async () => timings(await heroAnimations(page))).toEqual(sorted(SUNSET_TIMINGS));
});

test('reduced motion swaps the paintings at once, with no stars', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light', motion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await page.getByRole('complementary').getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.waitForTimeout(100);
  expect(await heroAnimations(page)).toEqual([]);
  expect(await opacity(page, DAY), 'day layer').toBe('0');
  expect(await opacity(page, NIGHT), 'night layer').toBe('1');
  expect(await page.locator('[data-hero-layer="stars"]').evaluate((element) => getComputedStyle(element).display)).toBe('none');
});

test('rapid toggling settles on the final theme', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = themeButton(page);
  await button.click();
  await button.click();
  await button.click();
  await page.waitForTimeout(3_200);
  expect(await heroAnimations(page), 'nothing runs once settled').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  expect(await opacity(page, DAY), 'day layer').toBe('0');
  expect(await page.locator(DAY).evaluate((element) => getComputedStyle(element).filter)).toBe('none');
});

/** Inline opacity or filter left on any hero layer. */
async function inlineStyles(page: Page): Promise<string[]> {
  return page.evaluate((layers) => {
    const left: string[] = [];
    for (const layer of layers) {
      const element = document.querySelector<HTMLElement>(`[data-section="hero"] [data-hero-layer="${layer}"]`);
      if (element && (element.style.opacity !== '' || element.style.filter !== '')) left.push(`${layer}: ${element.getAttribute('style')}`);
    }
    return left;
  }, LAYERS);
}

test('a quick double click never flashes the night painting', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await themeButton(page).elementHandle();
  expect(button, 'the theme button').not.toBeNull();
  // Both clicks land in the same task, so the second arrives while the sunset's start is pending.
  const seen = await page.evaluate(async (target) => {
    (target as HTMLElement).click();
    (target as HTMLElement).click();
    const samples: string[] = [];
    const day = document.querySelector('[data-section="hero"] [data-hero-layer="day"]');
    const end = performance.now() + 300;
    while (performance.now() < end) {
      samples.push(day ? getComputedStyle(day).opacity : 'missing');
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return samples;
  }, button);
  expect(seen.length, 'frames sampled').toBeGreaterThan(3);
  expect(new Set(seen), 'the day layer stayed fully shown').toEqual(new Set(['1']));
  expect(await heroAnimations(page), 'nothing runs').toEqual([]);
  expect(await inlineStyles(page), 'no inline styles are left').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
});

test('a switch back mid-sunset snaps to the restored sky', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = themeButton(page);
  await button.click();
  await page.waitForTimeout(400);
  expect((await heroAnimations(page)).length, 'the sunset is running').toBeGreaterThan(0);
  await button.click();
  // Within one animation frame of the click, the set is gone and CSS shows the restored sky.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await heroAnimations(page), 'no animation remains').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  expect(await opacity(page, DAY), 'day layer').toBe('1');
  expect(await page.locator(DAY).evaluate((element) => getComputedStyle(element).filter)).toBe('none');
  expect(await inlineStyles(page), 'no inline styles are left').toEqual([]);
});

test('turning reduced motion on mid-sunset stops the sky', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await themeButton(page).click();
  await page.waitForTimeout(200);
  expect((await heroAnimations(page)).length, 'the sunset is running').toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await heroAnimations(page)).length, { timeout: 500 }).toBe(0);
  expect(await opacity(page, DAY), 'day layer').toBe('0');
  expect(await opacity(page, NIGHT), 'night layer').toBe('1');
  expect(await inlineStyles(page), 'no inline styles are left').toEqual([]);
});

test('the click’s frame keeps the old sky (pins)', async ({ page }) => {
  test.skip(!isDesktopShell(page), 'the rail’s theme button is the desktop shell');
  await storeDisplay(page, { theme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  const button = await themeButton(page).elementHandle();
  const day = await page.evaluate(async (target) => {
    (target as HTMLElement).click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const layer = document.querySelector('[data-section="hero"] [data-hero-layer="day"]');
    return layer ? getComputedStyle(layer).opacity : 'missing';
  }, button);
  expect(day, 'the day layer is still shown in the click’s frame').toBe('1');
});

/*
 * The dragon (design §3.3): the scene chunk flies it once per session, about 1.2 s after first
 * paint, and again 1.6 s after each theme switch (tests/support/dragon.ts reads its state). Without
 * WebGL it flies as stacked frames: hero-no-webgl.spec.ts, which needs a browser of its own.
 */

/** Clicks the theme button: the rail's on the desktop shell, the menu sheet's below 1280px. */
async function switchTheme(page: Page): Promise<void> {
  if (isDesktopShell(page)) {
    await themeButton(page).click();
    return;
  }
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
}

/** Follows a primary nav link: the rail's on the desktop shell, the menu sheet's below 1280px. */
async function navigate(page: Page, label: string): Promise<void> {
  if (isDesktopShell(page)) {
    await page.getByRole('complementary').getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: label, exact: true }).click();
    return;
  }
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: label, exact: true }).click();
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
    expect(await sampleFlight(page, 200, 4_000), 'no second opening flight in the same session').not.toContain('flying');
  });

  test('a theme switch sends it out again 1.6 s later', async ({ page }) => {
    // The session has already seen the opening flight, so only the switch can send it out.
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('gm.dragon', '1');
      } catch {
        // Without storage the opening flight would fly; the test then fails on the idle check.
      }
    });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    // The scene is ready once it knows its renderer.
    await expect(page.locator(DRAGON)).toHaveAttribute('data-renderer', /^(webgl|images)$/);
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
    expect(await page.evaluate(() => document.querySelectorAll('canvas').length), 'canvases in the document').toBeLessThanOrEqual(1);
    expect(describeConsoleProblems(problems)).toEqual([]);
  });

  test('a switch during a flight queues no second flight', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await flying(page);
    await switchTheme(page);
    expect((await dragonState(page)).count, 'one dragon element').toBe(1);
    await expect(page.locator(DRAGON), 'the flight ends').toHaveAttribute('data-flight', 'idle', { timeout: 20_000 });
    expect(await sampleFlight(page, 200, 3_000), 'no flight after the one that ended').not.toContain('flying');
  });
});
