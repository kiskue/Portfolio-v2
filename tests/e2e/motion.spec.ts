import { expect, test, type Locator, type Page } from '@playwright/test';
import { playerGlimpses, posterFrame, posterKind, runningAnimations, shownFrame } from '../support/glimpse';
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
 * Tests tagged @needs-pages need Home (W8) and the case-study heroes (W9): run after the merge.
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

/** Fails unless the element keeps its exact box for `ms` (it neither scrolls nor slides). */
async function expectStill(locator: Locator, ms = 900): Promise<void> {
  const before = await locator.boundingBox();
  expect(before, 'the element is rendered').not.toBeNull();
  await locator.page().waitForTimeout(ms);
  expect(await locator.boundingBox()).toEqual(before);
}

interface PhoneAnimations {
  readonly running: number;
  readonly paused: number;
  /** Paused animations whose element does not compute animation-play-state: paused. */
  readonly cssNotPaused: readonly string[];
  /** Paused animations whose currentTime still changed over `settleMs`. */
  readonly moved: number;
}

/**
 * The keyframe animations inside a track's phones (the replica and its tap rings; not the frames'
 * own step crossfade, which belongs to the player): how many run, how many are paused, whether
 * the paused ones compute animation-play-state: paused, and whether they stay put for settleMs.
 */
async function phoneAnimations(track: Locator, settleMs = 0): Promise<PhoneAnimations> {
  return track.evaluate(async (element, wait) => {
    const animations = element.getAnimations({ subtree: true }).filter((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      return animation instanceof CSSAnimation && target !== element && target?.parentElement !== element;
    });
    const paused = animations.filter((animation) => animation.playState === 'paused');
    const cssNotPaused = paused.flatMap((animation) => {
      const effect = animation.effect as KeyframeEffect;
      const state = effect.target ? getComputedStyle(effect.target, effect.pseudoElement).animationPlayState : '';
      return state.split(',').every((value) => value.trim() === 'paused') ? [] : [`${(animation as CSSAnimation).animationName}: ${state}`];
    });
    const times = paused.map((animation) => animation.currentTime);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return {
      running: animations.filter((animation) => animation.playState === 'running').length,
      paused: paused.length,
      cssNotPaused,
      moved: paused.filter((animation, index) => animation.currentTime !== times[index]).length,
    };
  }, settleMs);
}

/** Jumps a track to a step through its step button (works on hidden tracks too: a plain DOM click). */
async function chooseStep(root: Locator, track: number, step: number): Promise<void> {
  const dot = root.locator(`[data-glimpse-dots="${track}"] button`).nth(step);
  await dot.evaluate((button: HTMLButtonElement) => button.click());
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const player of PLAYERS) {
    test(`${player.name}: every track holds its poster frame, Play is offered and nothing animates @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      await hydrated(page);
      expect((await htmlState(page)).motion).toBe('reduce');
      const root = player.root(page);
      await expect(root).toHaveCount(1);
      await expect(root).toHaveAttribute('data-status', 'paused');
      await expect(root.locator('[data-glimpse-control]')).toHaveAttribute('data-glimpse-control', 'play');
      const glimpses = await playerGlimpses(root);
      expect(glimpses.length).toBeGreaterThan(0);
      for (const [track, glimpse] of glimpses.entries()) {
        expect(await shownFrame(root, track), `${glimpse.id} shows its poster`).toEqual(posterFrame(glimpse));
      }
      expect(await runningAnimations(root)).toEqual([]);
    });

    test(`${player.name}: each step shows its posterState when chosen @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      await hydrated(page);
      const root = player.root(page);
      const glimpses = await playerGlimpses(root);
      for (const [track, glimpse] of glimpses.entries()) {
        for (const [index, step] of glimpse.steps.entries()) {
          await chooseStep(root, track, index);
          await expect
            .poll(() => shownFrame(root, track), { message: `${glimpse.id} step ${index + 1} (${step.figure} → ${step.posterState ?? step.state})` })
            .toEqual({ step: index, kind: posterKind(step) });
          // Poster frames are static; under reduced motion nothing in the phone keeps moving.
          await expect.poll(() => runningAnimations(root.locator(`[data-glimpse-track="${track}"]`))).toEqual([]);
        }
      }
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
      const root = player.root(page);
      await root.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute('data-status', 'playing');
      const track = root.locator('[data-glimpse-track][data-current]');
      await expect(track).toHaveCount(1);
      // Restart the current track's first step (its step button), so its animations run from 0,
      // then wait until something animates inside the phone: the check below is never vacuous.
      const trackIndex = Number(await track.getAttribute('data-glimpse-track'));
      await chooseStep(root, trackIndex, 0);
      await expect.poll(async () => (await phoneAnimations(track)).running, { timeout: 10_000 }).toBeGreaterThan(0);

      await root.locator('[data-glimpse-control="pause"]').click();
      await expect(root).toHaveAttribute('data-status', 'paused');
      await expect(track).toHaveAttribute('data-paused', '');
      await expect(root.locator('[data-glimpse-control]')).toHaveAttribute('data-glimpse-control', 'play');

      const frozen = await phoneAnimations(track, 600);
      expect(frozen.paused, 'animations inside the phone are paused, not finished').toBeGreaterThan(0);
      expect(frozen).toEqual({ running: 0, paused: frozen.paused, cssNotPaused: [], moved: 0 });

      // The step holds while paused (every hold is shorter than this wait).
      const step = await root.locator('[data-glimpse-track][data-current] > [data-shown]').getAttribute('data-step');
      await page.waitForTimeout(4_500);
      await expect(root).toHaveAttribute('data-status', 'paused');
      await expect(root.locator('[data-glimpse-track][data-current] > [data-shown]')).toHaveAttribute('data-step', step ?? '');

      // Play resumes from where it was.
      await root.locator('[data-glimpse-control="play"]').click();
      await expect(root).toHaveAttribute('data-status', 'playing');
      await expect(track).not.toHaveAttribute('data-paused', '');
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const player of PLAYERS) {
    test(`${player.name}: the first frames show and nothing animates @needs-pages`, async ({ page }) => {
      await page.goto(player.route, { waitUntil: 'load' });
      const root = player.root(page);
      await expect(root).toHaveCount(1);
      // Controls need JavaScript: the player never becomes ready, so they stay hidden.
      expect(await root.getAttribute('data-ready')).toBeNull();
      const glimpses = await playerGlimpses(root);
      for (const [track, glimpse] of glimpses.entries()) {
        expect(await shownFrame(root, track), `${glimpse.id} shows its poster`).toEqual(posterFrame(glimpse));
        await expect(root.locator(`[data-glimpse-track="${track}"] > [data-shown] [data-phone]`)).toBeVisible();
      }
      await expect(root.locator('[data-active]')).toHaveCount(0);
      expect(await runningAnimations(root)).toEqual([]);
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
