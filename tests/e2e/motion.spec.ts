import { expect, test, type Locator, type Page } from '@playwright/test';
import { runningAnimations } from '../support/glimpse';
import { expectNoJsPosters, expectPauseFreezes, expectPostersHeld, expectStepPosters, expectStill } from '../support/motion';
import { htmlState, hydrated } from '../support/page';
import { CASE_STUDY_ROUTES } from '../support/routes';

/*
 * Motion (PLAN "Verification → Motion"; design §3.6, §4.2, §5.3; architecture D8 `motion`):
 * - reduced motion: glimpses hold their posters (each step's posterState) with a Play button,
 *   nothing animates inside the phones, and the tools marquee is static;
 * - Pause freezes the animations inside the phones (animation-play-state: paused) and the step;
 * - without JavaScript the first frames (posters) show and nothing moves;
 * - the global reduced-motion rules (src/styles/motion.css) apply from the setting, and from the
 *   media query when no script ran.
 * The checks live in tests/support/motion.ts. Tests tagged @needs-pages need Home (W8) and the
 * case-study heroes (W9): run them after the merge.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

interface PlayerPage {
  readonly route: string;
  readonly name: string;
  /** The player on that page. */
  readonly root: (page: Page) => Locator;
}

/** Every glimpse player: Home's trio (common.md §4 selectors) and each case-study hero. */
const PLAYERS: readonly PlayerPage[] = [
  { route: '/', name: 'Home trio', root: (page) => page.locator('[data-section="bento"] [data-glimpse-root]') },
  ...CASE_STUDY_ROUTES.map((route) => ({
    route,
    name: `${route} hero`,
    root: (page: Page) => page.locator('main [data-glimpse-root][data-layout="hero"]'),
  })),
];

/** The tools strip's moving track (common.md §4: W8 renders data-section="tools" and data-marquee). */
const marqueeTrack = (page: Page): Locator => page.locator('[data-section="tools"] [data-marquee]');

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const player of PLAYERS) {
    test(`${player.name}: every track holds its poster frame, Play is offered and nothing animates @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      await hydrated(page);
      expect((await htmlState(page)).motion).toBe('reduce');
      await expectPostersHeld(player.root(page));
    });

    test(`${player.name}: each step shows its posterState when chosen @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      await hydrated(page);
      await expectStepPosters(player.root(page));
    });
  }

  test('the tools marquee is static: no animation runs and the track stands still @needs-pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    const track = marqueeTrack(page);
    await expect(track).toHaveCount(1);
    expect(await runningAnimations(page.locator('[data-section="tools"]'))).toEqual([]);
    await expectStill(track);
  });
});

test.describe('full motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  for (const player of PLAYERS) {
    test(`${player.name}: Pause freezes the animations inside the phones and holds the step @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      await hydrated(page);
      await expectPauseFreezes(page, player.root(page));
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const player of PLAYERS) {
    test(`${player.name}: the first frames show and nothing animates @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      await expectNoJsPosters(player.root(page));
    });
  }

  test('the tools marquee stands still @needs-pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const track = marqueeTrack(page);
    await expect(track).toHaveCount(1);
    expect(await runningAnimations(page.locator('[data-section="tools"]'))).toEqual([]);
    await expectStill(track);
  });
});

/*
 * The global reduced-motion rules every moving part relies on (src/styles/motion.css), on any
 * page: a probe with an infinite animation must stop at once under reduced motion, from the
 * in-site setting (data-motion="reduce") or, when no script ran, from the media query.
 */
const PROBE_CSS = '@keyframes qa-probe { to { translate: 40px 0; } } #qa-probe { animation: qa-probe 2s linear infinite; }';

/**
 * Adds a probe with an infinite 2s animation and reports, a moment later, whether it still runs.
 * Plain DOM calls and a wait from the test side: with JavaScript disabled, page timers and
 * addStyleTag's load event never fire.
 */
async function probeRuns(page: Page): Promise<boolean> {
  await page.evaluate((css) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    const probe = document.createElement('div');
    probe.id = 'qa-probe';
    document.body.append(probe);
  }, PROBE_CSS);
  await page.waitForTimeout(150);
  return page.evaluate(() => (document.getElementById('qa-probe')?.getAnimations() ?? []).some((animation) => animation.playState === 'running'));
}

const scrollBehavior = (page: Page): Promise<string> => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);

test.describe('the reduced-motion baseline', () => {
  test('full motion: an infinite CSS animation keeps running, scrolling is smooth', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/about', { waitUntil: 'load' });
    expect((await htmlState(page)).motion).toBe('full');
    expect(await probeRuns(page)).toBe(true);
    expect(await scrollBehavior(page)).toBe('smooth');
  });

  test('reduced motion from the OS: data-motion="reduce" ends animations at once, smooth scrolling is off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/about', { waitUntil: 'load' });
    expect((await htmlState(page)).motion).toBe('reduce');
    expect(await probeRuns(page)).toBe(false);
    expect(await scrollBehavior(page)).toBe('auto');
  });
});

test.describe('the reduced-motion baseline without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('no script sets data-motion, so the media query takes over', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/about', { waitUntil: 'load' });
    expect((await htmlState(page)).motion).toBeNull();
    expect(await probeRuns(page)).toBe(false);
    expect(await scrollBehavior(page)).toBe('auto');
  });

  test('with no preference, animations run and scrolling stays smooth', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/about', { waitUntil: 'load' });
    expect((await htmlState(page)).motion).toBeNull();
    expect(await probeRuns(page)).toBe(true);
    expect(await scrollBehavior(page)).toBe('smooth');
  });
});
