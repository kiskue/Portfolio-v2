import { expect, type Locator, type Page } from '@playwright/test';
import { playerGlimpses, posterFrame, posterKind, runningAnimations, shownFrame } from './glimpse';

/*
 * The motion checks (PLAN "Verification → Motion"), as functions of one glimpse player root so
 * the same code checks Home's trio, the case-study heroes, and any other player.
 */

/** Fails unless the element keeps its exact box for `ms` (it neither scrolls nor slides). */
export async function expectStill(locator: Locator, ms = 900): Promise<void> {
  const before = await locator.boundingBox();
  expect(before, 'the element is rendered').not.toBeNull();
  await locator.page().waitForTimeout(ms);
  expect(await locator.boundingBox()).toEqual(before);
}

export interface PhoneAnimations {
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
export async function phoneAnimations(track: Locator, settleMs = 0): Promise<PhoneAnimations> {
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
export async function chooseStep(root: Locator, track: number, step: number): Promise<void> {
  const dot = root.locator(`[data-glimpse-dots="${track}"] button`).nth(step);
  await dot.evaluate((button: HTMLButtonElement) => button.click());
}

/** Reduced motion: paused on the posters with Play offered, and nothing animates. */
export async function expectPostersHeld(root: Locator): Promise<void> {
  await expect(root).toHaveCount(1);
  await expect(root).toHaveAttribute('data-status', 'paused');
  await expect(root.locator('[data-glimpse-control]')).toHaveAttribute('data-glimpse-control', 'play');
  const glimpses = await playerGlimpses(root);
  expect(glimpses.length).toBeGreaterThan(0);
  for (const [track, glimpse] of glimpses.entries()) {
    expect(await shownFrame(root, track), `${glimpse.id} shows its poster`).toEqual(posterFrame(glimpse));
  }
  expect(await runningAnimations(root)).toEqual([]);
}

/** Reduced motion: whichever step is chosen, it shows its posterState and stands still. */
export async function expectStepPosters(root: Locator): Promise<void> {
  const glimpses = await playerGlimpses(root);
  for (const [track, glimpse] of glimpses.entries()) {
    for (const [index, step] of glimpse.steps.entries()) {
      await chooseStep(root, track, index);
      await expect
        .poll(() => shownFrame(root, track), { message: `${glimpse.id} step ${index + 1} (${step.figure}: ${step.posterState ?? step.state})` })
        .toEqual({ step: index, kind: posterKind(step) });
      // Poster frames are static; under reduced motion nothing in the phone keeps moving.
      await expect.poll(() => runningAnimations(root.locator(`[data-glimpse-track="${track}"]`))).toEqual([]);
    }
  }
}

/**
 * Full motion: Pause freezes the animations inside the phone (animation-play-state: paused,
 * currentTime held), the step holds past its hold time, and Play resumes.
 */
export async function expectPauseFreezes(page: Page, root: Locator): Promise<void> {
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
  const shown = root.locator('[data-glimpse-track][data-current] > [data-shown]');
  const step = await shown.getAttribute('data-step');
  await page.waitForTimeout(4_500);
  await expect(root).toHaveAttribute('data-status', 'paused');
  await expect(shown).toHaveAttribute('data-step', step ?? '');

  // Play resumes.
  await root.locator('[data-glimpse-control="play"]').click();
  await expect(root).toHaveAttribute('data-status', 'playing');
  await expect(track).not.toHaveAttribute('data-paused', '');
}

/** Without JavaScript: the server-marked posters show, the controls stay hidden, nothing animates. */
export async function expectNoJsPosters(root: Locator): Promise<void> {
  await expect(root).toHaveCount(1);
  // Controls need JavaScript: the player never becomes ready, so they stay hidden.
  expect(await root.getAttribute('data-ready')).toBeNull();
  const glimpses = await playerGlimpses(root);
  expect(glimpses.length).toBeGreaterThan(0);
  for (const [track, glimpse] of glimpses.entries()) {
    expect(await shownFrame(root, track), `${glimpse.id} shows its poster`).toEqual(posterFrame(glimpse));
  }
  await expect(root.locator('[data-glimpse-track] > [data-shown] [data-phone]').first()).toBeVisible();
  await expect(root.locator('[data-active]')).toHaveCount(0);
  expect(await runningAnimations(root)).toEqual([]);
}
