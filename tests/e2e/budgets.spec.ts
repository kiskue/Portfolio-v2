import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import {
  DOM_BUDGET,
  HTML_BROTLI_BUDGET,
  JS_BROTLI_BUDGET,
  JS_GZIP_BUDGET,
  SCENE_CHUNK_BROTLI_BUDGET,
  SCENE_CHUNK_MARKER,
  bytes,
  compressedSizes,
  htmlScriptChunks,
  sumSizes,
  type Sizes,
} from '../support/budgets';
import { fontsReady, hydrated, isDesktopShell } from '../support/page';

/*
 * Budgets (PLAN "Performance budgets" and "Verification → Budgets"; measurements.md):
 * - Home HTML at most 150 KB brotli; Home first-load JS at most 153,515 B brotli (the framework
 *   floor + 40 KB) and 180,000 B gzip, measured from the chunks the HTML requests;
 * - Home DOM at most 3,000 nodes;
 * - at 1447×722 the first screen is the hero: the painting, the H1, the subline and "Get in touch"
 *   (the tools strip and the bento start below it);
 * - Core Web Vitals in the lab: the hero painting or the H1 is the LCP element within 2.5 s (below
 *   768px the Home header's subline may be it too: the ledger's LCP ruling, at the test), CLS at most 0.05
 *   and interactions within 200 ms (INP). These wall-clock tests are tagged @vitals and run in a
 *   pass of their own (scripts/e2e.mjs). Lighthouse CI (lighthouserc.json) measures them throttled.
 * Measured values are printed and attached to each test, for the report.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

function record(testInfo: TestInfo, line: string): void {
  testInfo.annotations.push({ type: 'measured', description: line });
  console.log(`[${testInfo.project.name}] ${line}`);
}

function describeSizes(size: Sizes): string {
  return `${bytes(size.raw)} raw, ${bytes(size.gzip)} gzip, ${bytes(size.brotli)} brotli`;
}

test.describe('Home weight', () => {
  test('the HTML is at most 150 KB brotli', async ({ request }, testInfo) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const size = compressedSizes(await response.body());
    record(testInfo, `Home HTML: ${describeSizes(size)} (budget ${bytes(HTML_BROTLI_BUDGET)} brotli)`);
    expect(size.brotli).toBeLessThanOrEqual(HTML_BROTLI_BUDGET);
  });

  test('first-load JS is at most 153,515 B brotli and 180,000 B gzip', async ({ request }, testInfo) => {
    const html = await (await request.get('/')).text();
    const chunks = htmlScriptChunks(html);
    // At least the framework's root chunks (measurements.md: 5), so the parse found the scripts.
    expect(chunks.length).toBeGreaterThanOrEqual(5);
    const sizes = await Promise.all(
      chunks.map(async (url) => {
        const response = await request.get(url);
        expect(response.status(), url).toBe(200);
        return compressedSizes(await response.body());
      }),
    );
    const total = sumSizes(sizes);
    record(
      testInfo,
      `Home first-load JS: ${chunks.length} chunks, ${describeSizes(total)} (budgets ${bytes(JS_BROTLI_BUDGET)} brotli, ${bytes(JS_GZIP_BUDGET)} gzip; headroom ${bytes(JS_BROTLI_BUDGET - total.brotli)} brotli)`,
    );
    expect(total.brotli).toBeLessThanOrEqual(JS_BROTLI_BUDGET);
    expect(total.gzip).toBeLessThanOrEqual(JS_GZIP_BUDGET);
  });

  /*
   * The budget above counts the chunks Home's HTML lists, so the browser may load no other
   * first-party script while Home loads and hydrates (a client-side import() on mount, say): it
   * would escape that count. Router prefetches are not Home's first load, though: a prefetch
   * fetches another route's RSC payload, and the browser then loads that route's client chunks
   * (today /contact's, from the viewport prefetch of its links). So the router's prefetch requests
   * are stopped before they reach the server. In this build each one is a fetch() with
   * `next-router-prefetch: 1` (plus `next-router-segment-prefetch`, `rsc: 1` and `?_rsc=`). That
   * header marks a prefetch (node_modules/next/dist/docs, guides/cdn-caching.md), and Next 16.4
   * sets it on nothing else (next/dist/client/components/segment-cache/cache.js: 1, or 2 and 3
   * in its PPR modes), whereas `_rsc` also marks navigations and refreshes, whose chunks must
   * still count. Every other request goes through, and every first-party /_next/static JS
   * request counts, whatever started it: a prefetch that comes another way (a <link
   * rel=prefetch>, or a prefetch={true} of a dynamic route, which carries no such header) fails
   * here. Home has none.
   *
   * One exception (ruling H1, and the owner's 2026-11-03 decision for one separately capped scene
   * chunk; design §6.3): the painted dragon's code is a single chunk that the Home island imports
   * after the load event, only when motion is allowed. It is identified by the marker its code
   * writes at runtime (SCENE_CHUNK_MARKER), must be exactly one, within its brotli cap, and
   * requested after loadEventEnd. Any other unlisted script still fails, and under reduced motion
   * nothing unlisted loads at all.
   */
  async function loadHome(page: Page, request: APIRequestContext, baseURL: string | undefined, reducedMotion: 'reduce' | 'no-preference') {
    if (!baseURL) throw new Error('playwright.config.ts sets the baseURL this check compares origins with');
    const origin = new URL(baseURL).origin;
    const listed = new Set(htmlScriptChunks(await (await request.get('/')).text()).map((path) => new URL(path, origin).pathname));
    const prefetches: string[] = [];
    await page.route('**/*', async (route) => {
      const pending = route.request();
      const prefetch = pending.headers()['next-router-prefetch'];
      if (prefetch === undefined) return route.fallback();
      const url = new URL(pending.url());
      prefetches.push(`${url.pathname} ${pending.headers()['next-router-segment-prefetch'] ?? ''}${prefetch === '1' ? '' : ` (next-router-prefetch: ${prefetch})`}`.trim());
      return route.abort('blockedbyclient');
    });
    const loaded = new Set<string>();
    let lastScriptAt = 0;
    page.on('request', (request_) => {
      const url = new URL(request_.url());
      if (url.origin !== origin || !url.pathname.startsWith('/_next/static/') || !url.pathname.endsWith('.js')) return;
      loaded.add(url.pathname);
      lastScriptAt = Date.now();
    });
    await page.emulateMedia({ reducedMotion });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForLoadState('networkidle');
    // Network idle fires once per document, possibly before hydration ended: also watch for at
    // least a second past hydration and network idle with no new script request, so a chunk that
    // hydration starts late (an idle-callback import, say) is still seen on a slow, loaded run.
    const settledAt = Date.now();
    await expect
      .poll(() => Date.now() - Math.max(lastScriptAt, settledAt), { message: 'a second with no new script request', timeout: 15_000 })
      .toBeGreaterThanOrEqual(1_000);
    const unlisted = [...loaded].filter((path) => !listed.has(path));
    const unfetched = [...listed].filter((path) => !loaded.has(path));
    return { loaded, unlisted, unfetched, prefetches };
  }

  function describeLoad(result: Awaited<ReturnType<typeof loadHome>>): string {
    const { loaded, unlisted, unfetched, prefetches } = result;
    return `Home scripts fetched at load: ${loaded.size}; not in the HTML: ${JSON.stringify(unlisted)}; in the HTML but not fetched: ${JSON.stringify(unfetched)}; router prefetches stopped: ${prefetches.length} ${JSON.stringify(prefetches)}`;
  }

  test('the browser loads no first-party script the HTML does not list, except the one capped scene chunk after load (router prefetches stopped)', async ({ page, request, baseURL }, testInfo) => {
    const result = await loadHome(page, request, baseURL, 'no-preference');
    const { loaded, unlisted } = result;
    const scene: { path: string; size: Sizes; startTime: number }[] = [];
    for (const path of unlisted) {
      const body = await (await request.get(path)).body();
      if (!body.includes(SCENE_CHUNK_MARKER)) continue;
      const startTime = await page.evaluate((p) => performance.getEntriesByType('resource').find((e) => new URL(e.name).pathname === p)?.startTime ?? -1, path);
      scene.push({ path, size: compressedSizes(body), startTime });
    }
    const others = unlisted.filter((path) => !scene.some((chunk) => chunk.path === path));
    const loadEnd = await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).loadEventEnd);
    record(testInfo, describeLoad(result));
    record(
      testInfo,
      `scene chunk: ${JSON.stringify(scene.map((chunk) => ({ path: chunk.path, brotli: chunk.size.brotli, startTime: Math.round(chunk.startTime) })))}; load event ended at ${Math.round(loadEnd)} ms (cap ${bytes(SCENE_CHUNK_BROTLI_BUDGET)} brotli)`,
    );
    expect(loaded.size, 'the browser fetched the framework chunks').toBeGreaterThanOrEqual(5);
    // Anything here would escape the HTML-based budget above.
    expect(others, 'first-party scripts Home loads that its HTML does not list, other than the scene chunk').toEqual([]);
    expect(scene, 'exactly one scene chunk loads when motion is allowed').toHaveLength(1);
    expect(scene[0]?.size.brotli ?? Infinity, `scene chunk brotli (cap ${bytes(SCENE_CHUNK_BROTLI_BUDGET)})`).toBeLessThanOrEqual(SCENE_CHUNK_BROTLI_BUDGET);
    expect(scene[0]?.startTime ?? -1, 'the scene chunk is requested after the load event').toBeGreaterThanOrEqual(loadEnd);
  });

  test('under reduced motion, no script the HTML does not list loads at all', async ({ page, request, baseURL }, testInfo) => {
    const result = await loadHome(page, request, baseURL, 'reduce');
    record(testInfo, describeLoad(result));
    expect(result.loaded.size, 'the browser fetched the framework chunks').toBeGreaterThanOrEqual(5);
    expect(result.unlisted, 'first-party scripts Home loads under reduced motion that its HTML does not list').toEqual([]);
  });

  test('the DOM has at most 3,000 nodes', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.waitForLoadState('networkidle');
    const nodes = await page.evaluate(() => document.querySelectorAll('*').length);
    record(testInfo, `Home DOM: ${nodes.toLocaleString('en-US')} elements (budget ${DOM_BUDGET.toLocaleString('en-US')})`);
    expect(nodes).toBeLessThanOrEqual(DOM_BUDGET);
  });
});

test.describe('the first screen at 1447×722 (the template viewport)', () => {
  const VIEWPORT = { width: 1447, height: 722 };
  test.use({ viewport: VIEWPORT, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

  async function box(page: Page, selector: string, name: string) {
    const found = await page.locator(selector).first().boundingBox();
    expect(found, `${name} (${selector}) is rendered`).not.toBeNull();
    return found as NonNullable<typeof found>;
  }

  function expectInView(name: string, rect: { x: number; y: number; width: number; height: number }): void {
    expect(rect.y, `${name}: top edge on screen`).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height, `${name}: bottom edge within ${VIEWPORT.height}px`).toBeLessThanOrEqual(VIEWPORT.height + 0.5);
    expect(rect.x + rect.width, `${name}: within ${VIEWPORT.width}px`).toBeLessThanOrEqual(VIEWPORT.width + 0.5);
  }

  test('the H1 is fully on the first screen, with no horizontal scroll', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await fontsReady(page);
    expectInView('H1', await box(page, 'main h1', 'the H1'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('shows the hero: the painting, the H1, the subline and Get in touch', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await fontsReady(page);
    const hero = await box(page, '[data-section="hero"]', 'the hero');
    const painting = await page.evaluate(() => {
      const shown = [...document.querySelectorAll<HTMLElement>('[data-section="hero"] [data-hero-painting]')].find(
        (image) => getComputedStyle(image.parentElement ?? image).opacity === '1',
      );
      const rect = shown?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    });
    expect(painting, 'one painting is visible').not.toBeNull();
    const shown = painting as NonNullable<typeof painting>;
    const h1 = await box(page, 'main h1', 'the H1');
    const subline = await box(page, 'main header h1 + p', "the header's subline");
    const touch = await box(page, 'main header a:has-text("Get in touch")', 'the Get in touch link');
    const tools = await box(page, '[data-section="tools"]', 'the tools strip');
    record(testInfo, `1447×722: hero ${JSON.stringify(hero)}, H1 bottom ${Math.round(h1.y + h1.height)}, tools top ${Math.round(tools.y)}`);
    // The hero spans <main>'s border box: x and width are <main>'s (264 and 1183 with hidden
    // scrollbars; a classic scrollbar narrows both), y and height are the first screen's.
    const main = await box(page, 'main#content', 'main');
    for (const [name, got, want] of [
      ['x', hero.x, main.x],
      ['y', hero.y, 0],
      ['width', hero.width, main.width],
      ['height', hero.height, 722],
    ] as const) {
      expect(Math.abs(got - want), `hero ${name} ${got}`).toBeLessThanOrEqual(1);
    }
    expect(shown.x, 'the painting covers the hero (left)').toBeLessThanOrEqual(hero.x + 1);
    expect(shown.y, 'the painting covers the hero (top)').toBeLessThanOrEqual(hero.y + 1);
    expect(shown.x + shown.width, 'the painting covers the hero (right)').toBeGreaterThanOrEqual(hero.x + hero.width - 1);
    expect(shown.y + shown.height, 'the painting covers the hero (bottom)').toBeGreaterThanOrEqual(hero.y + hero.height - 1);
    expectInView('H1', h1);
    expectInView('subline', subline);
    expectInView('Get in touch', touch);
    expect(tools.y, 'the tools strip starts below the first screen').toBeGreaterThanOrEqual(721);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

/**
 * The Home LCP element. PLAN "Performance budgets" (line 310) now names the hero painting or the
 * H1, at every width. The ledger's LCP ruling ("Rulings (integration)", 2026-10-23) is unchanged
 * for the subline: below 768px it is also accepted, because design §3's type scale (a 32px
 * display H1 over an 18px lead subline of about five lines at 390px) makes the subline the larger
 * text block, painted in the same frame as the H1. No other element counts, at any width.
 */
const SUBLINE_ACCEPTED_BELOW = 768;
/** The hero painting: either theme's image (src/components/sections/home/home-hero.tsx). */
const HOME_PAINTING = '[data-section="hero"] [data-hero-painting]';
/** The Home H1 (a line inside it counts as the H1). */
const HOME_H1 = 'main h1';
/**
 * The Home header's subline: the paragraph right after the H1 in the header row
 * (src/components/sections/home/home-header.tsx), matched by that structure, never by its classes.
 */
const HOME_SUBLINE = 'main header h1 + p';

/** What an LCP entry painted: the hero painting, the Home H1, the Home header's subline, or another element. */
type LcpTarget = 'painting' | 'h1' | 'subline' | 'other';

const LCP_TARGET_NAMES: Readonly<Record<LcpTarget, string>> = {
  painting: 'the hero painting',
  h1: 'the H1 (or a line inside it)',
  subline: "the Home header's subline",
  other: 'another element',
};

/** What the observers collect in the page (mutable there: the observers add to it). */
interface Vitals {
  lcp: { readonly time: number; readonly element: string; readonly target: LcpTarget }[];
  cls: number;
  shifts: { readonly value: number; readonly sources: string[] }[];
  interactions: { readonly name: string; readonly duration: number; readonly id: number; readonly target: string }[];
  firstInput: number | null;
}

declare global {
  interface Window {
    __qaVitals?: Vitals;
  }
}

/** Starts the Web Vitals observers before any page script runs. */
async function observeVitals(page: Page): Promise<void> {
  await page.addInitScript(({ h1, subline, painting }) => {
    const vitals: Vitals = { lcp: [], cls: 0, shifts: [], interactions: [], firstInput: null };
    window.__qaVitals = vitals;
    const describe = (node: Node | null | undefined): string => {
      if (!(node instanceof Element)) return node ? node.nodeName : 'none';
      const classes = (node.getAttribute('class') ?? '').trim().split(/\s+/).slice(0, 2).join('.');
      return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${classes ? `.${classes}` : ''}`;
    };
    const lcpTarget = (element: Element | null | undefined): LcpTarget => {
      if (element?.closest(painting)) return 'painting';
      if (element?.closest(h1)) return 'h1';
      if (element?.closest(subline)) return 'subline';
      return 'other';
    };
    const observe = (type: string, callback: (entries: PerformanceEntryList) => void, extra: Record<string, unknown> = {}): void => {
      try {
        new PerformanceObserver((list) => callback(list.getEntries())).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
      } catch {
        // An unsupported entry type leaves its list empty; the tests then fail on that.
      }
    };
    observe('largest-contentful-paint', (entries) => {
      for (const entry of entries as (PerformanceEntry & { element?: Element | null })[]) {
        vitals.lcp.push({ time: entry.startTime, element: describe(entry.element), target: lcpTarget(entry.element) });
      }
    });
    observe('layout-shift', (entries) => {
      for (const entry of entries as (PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: { node?: Node | null }[] })[]) {
        if (entry.hadRecentInput) continue;
        vitals.cls += entry.value;
        vitals.shifts.push({ value: entry.value, sources: (entry.sources ?? []).map((source) => describe(source.node)) });
      }
    });
    observe(
      'event',
      (entries) => {
        for (const entry of entries as (PerformanceEntry & { interactionId?: number; target?: Node | null })[]) {
          if (entry.interactionId) vitals.interactions.push({ name: entry.name, duration: entry.duration, id: entry.interactionId, target: describe(entry.target) });
        }
      },
      { durationThreshold: 16 },
    );
    observe('first-input', (entries) => {
      for (const entry of entries) vitals.firstInput = entry.duration;
    });
  }, { h1: HOME_H1, subline: HOME_SUBLINE, painting: HOME_PAINTING });
}

async function vitals(page: Page): Promise<Vitals> {
  const value = await page.evaluate(() => window.__qaVitals);
  if (!value) throw new Error('the Web Vitals observers did not start');
  return value;
}

/** INP for a handful of interactions: the slowest one (Event Timing entries grouped by interaction). */
function inp(value: Vitals): number {
  const byInteraction = new Map<number, number>();
  for (const entry of value.interactions) byInteraction.set(entry.id, Math.max(byInteraction.get(entry.id) ?? 0, entry.duration));
  return Math.max(0, ...byInteraction.values());
}

/*
 * Wall-clock vitals (LCP time, CLS, INP), tagged @vitals: `npm run e2e` (scripts/e2e.mjs) runs
 * them in a pass of their own after every other test, one at a time, because lab timings measure
 * the machine as much as the page (ledger "Rulings (integration)", 2026-10-23: the shell INP read
 * 912 ms in a 4-worker run and 120–136 ms alone). Same tests, same thresholds.
 */
test.describe('Core Web Vitals in the lab', { tag: '@vitals' }, () => {
  /**
   * LCP within 2.5 s (PLAN "Performance budgets", line 310): from 768px up the LCP element must
   * be the hero painting or the H1; below 768px it may also be the Home header's subline
   * paragraph (HOME_SUBLINE), under the ledger's LCP ruling ("Rulings (integration)",
   * 2026-10-23); never any other element.
   */
  test('the hero painting or the H1 is the LCP element on Home, within 2.5 s', async ({ page }, testInfo) => {
    await observeVitals(page);
    await page.goto('/', { waitUntil: 'load' });
    await fontsReady(page);
    await page.waitForTimeout(500);
    const { lcp } = await vitals(page);
    const last = lcp.at(-1);
    const width = page.viewportSize()?.width;
    const allowed: readonly LcpTarget[] = width !== undefined && width < SUBLINE_ACCEPTED_BELOW ? ['painting', 'h1', 'subline'] : ['painting', 'h1'];
    record(testInfo, `Home LCP: ${last ? `${Math.round(last.time)} ms on ${last.element}, ${LCP_TARGET_NAMES[last.target]}` : 'none'}`);
    expect(last, 'an LCP entry was recorded').toBeDefined();
    expect(
      allowed,
      `${width === undefined ? 'with no viewport' : `at ${width}px`} the LCP element is ${allowed.map((target) => LCP_TARGET_NAMES[target]).join(' or ')}, not ${last?.element}`,
    ).toContain(last?.target);
    expect(last?.time ?? Infinity).toBeLessThanOrEqual(2_500);
  });

  test('Home does not shift: CLS at most 0.05 through load and the first seconds of autoplay', async ({ page }, testInfo) => {
    await observeVitals(page);
    await page.goto('/', { waitUntil: 'load' });
    await fontsReady(page);
    await page.waitForTimeout(3_000);
    const value = await vitals(page);
    record(testInfo, `Home CLS: ${value.cls.toFixed(4)} over ${value.shifts.length} shift(s)`);
    expect(value.cls, JSON.stringify(value.shifts)).toBeLessThanOrEqual(0.05);
  });

  test('a theme switch on Home shifts nothing: CLS ≤ 0.05 through the sunset', async ({ page }, testInfo) => {
    await observeVitals(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await fontsReady(page);
    if (isDesktopShell(page)) {
      await page.getByRole('complementary').getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
    } else {
      await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
    }
    await page.waitForTimeout(3_000);
    const value = await vitals(page);
    record(testInfo, `theme switch CLS: ${value.cls.toFixed(4)} over ${value.shifts.length} shift(s)`);
    expect(value.cls, JSON.stringify(value.shifts)).toBeLessThanOrEqual(0.05);
  });

  test('shell interactions respond within 200 ms (INP)', async ({ page }, testInfo) => {
    await observeVitals(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    if (isDesktopShell(page)) {
      const rail = page.getByRole('complementary');
      await rail.getByRole('button', { name: 'Switch to dark theme' }).click();
      await rail.getByRole('button', { name: 'Switch to light theme' }).click();
      await rail.getByRole('button', { name: 'Display settings' }).click();
      await page.keyboard.press('Escape');
    } else {
      await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
      await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
    }
    await page.waitForTimeout(300);
    const value = await vitals(page);
    record(testInfo, `shell INP: ${inp(value)} ms over ${new Set(value.interactions.map((entry) => entry.id)).size} slow-enough interaction(s); first input ${value.firstInput ?? 'none'} ms`);
    expect(value.firstInput, 'Event Timing reported the first input').not.toBeNull();
    expect(inp(value)).toBeLessThanOrEqual(200);
  });

  test('Home controls respond within 200 ms (INP)', async ({ page }, testInfo) => {
    await observeVitals(page);
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    await page.getByRole('button', { name: 'Pause animation' }).click();
    await page.getByRole('button', { name: 'Play animation' }).click();
    const glimpse = page.locator('[data-section="bento"] [data-glimpse-root]');
    await glimpse.scrollIntoViewIfNeeded();
    await glimpse.locator('[data-glimpse-control]').click();
    await glimpse.locator('[data-glimpse-control]').click();
    await page.waitForTimeout(300);
    const value = await vitals(page);
    record(testInfo, `Home controls INP: ${inp(value)} ms`);
    expect(value.firstInput).not.toBeNull();
    expect(inp(value)).toBeLessThanOrEqual(200);
  });
});
