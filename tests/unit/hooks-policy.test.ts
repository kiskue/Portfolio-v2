import { describe, expect, it } from 'vitest';
import {
  autoplayReducer,
  autoplayStatus,
  INITIAL_AUTOPLAY,
  type AutoplayAction,
  type AutoplayEnv,
  type AutoplayState,
} from '@/hooks/autoplay-state';
import { isInView, observerThresholds, type VisibilityEntry } from '@/hooks/in-view';
import { parseParam, withParam } from '@/hooks/search-param';
import { resolveReducedMotion } from '@/hooks/use-reduced-motion';

const SHOWN: AutoplayEnv = { visible: true, hidden: false, reducedMotion: false };

function run(actions: readonly AutoplayAction[], from: AutoplayState = INITIAL_AUTOPLAY): AutoplayState {
  return actions.reduce(autoplayReducer, from);
}

describe('autoplay policy', () => {
  it('plays only while visible and the tab is shown', () => {
    expect(autoplayStatus(INITIAL_AUTOPLAY, SHOWN).running).toBe(true);
    expect(autoplayStatus(INITIAL_AUTOPLAY, { ...SHOWN, visible: false }).running).toBe(false);
    expect(autoplayStatus(INITIAL_AUTOPLAY, { ...SHOWN, hidden: true }).running).toBe(false);
    // Off-screen or hidden is a suspension, not a user pause: the control still offers Pause.
    expect(autoplayStatus(INITIAL_AUTOPLAY, { ...SHOWN, visible: false }).userPaused).toBe(false);
  });

  it('a user pause is sticky until play', () => {
    const paused = run([{ type: 'pause' }]);
    for (const env of [SHOWN, { ...SHOWN, visible: false }, { ...SHOWN, hidden: true }]) {
      expect(autoplayStatus(paused, env)).toEqual({ running: false, userPaused: true, ended: false });
    }
    expect(autoplayStatus(run([{ type: 'play' }], paused), SHOWN).running).toBe(true);
  });

  it('starts paused under reduced motion; Play overrides the hold', () => {
    const reduced = { ...SHOWN, reducedMotion: true };
    expect(autoplayStatus(INITIAL_AUTOPLAY, reduced)).toEqual({ running: false, userPaused: true, ended: false });
    const played = run([{ type: 'play' }]);
    expect(autoplayStatus(played, reduced)).toEqual({ running: true, userPaused: false, ended: false });
    expect(autoplayStatus(played, { ...reduced, visible: false }).running).toBe(false);
  });

  it('ends after maxRuns completed runs; Play replays from zero', () => {
    const twice = run([
      { type: 'run-ended', maxRuns: 2 },
      { type: 'run-ended', maxRuns: 2 },
    ]);
    expect(twice).toEqual({ intent: 'auto', runs: 2, ended: true });
    expect(autoplayStatus(twice, SHOWN)).toEqual({ running: false, userPaused: false, ended: true });
    expect(run([{ type: 'run-ended', maxRuns: 2 }], twice)).toBe(twice);
    expect(run([{ type: 'play' }], twice)).toEqual({ intent: 'playing', runs: 0, ended: false });
  });

  it('never ends without a run limit', () => {
    const many = run(Array.from({ length: 50 }, () => ({ type: 'run-ended', maxRuns: Number.POSITIVE_INFINITY }) as const));
    expect(many.ended).toBe(false);
    expect(many.runs).toBe(50);
  });

  it('pausing twice keeps the same state object', () => {
    const paused = run([{ type: 'pause' }]);
    expect(autoplayReducer(paused, { type: 'pause' })).toBe(paused);
  });
});

describe('in-view rule', () => {
  const entry = (ratio: number, rectHeight: number, rootHeight: number | null, isIntersecting = ratio > 0): VisibilityEntry => ({
    isIntersecting,
    intersectionRatio: ratio,
    intersectionRect: { height: rectHeight },
    rootBounds: rootHeight === null ? null : { height: rootHeight },
  });

  it('threshold 0 means any intersecting pixel', () => {
    expect(isInView(entry(0.01, 5, 800), 0)).toBe(true);
    expect(isInView(entry(0, 0, 800, false), 0)).toBe(false);
  });

  it('half visible counts at 0.5, allowing for observer rounding', () => {
    expect(isInView(entry(0.5, 200, 800), 0.5)).toBe(true);
    expect(isInView(entry(0.4995, 199.8, 800), 0.5)).toBe(true);
    expect(isInView(entry(0.3, 120, 800), 0.5)).toBe(false);
  });

  it('an element taller than the viewport counts once it fills that share of the viewport', () => {
    // 2000px element, 900px viewport: at most 45% of it can ever be visible.
    expect(isInView(entry(0.45, 900, 900), 0.5)).toBe(true);
    expect(isInView(entry(0.2, 400, 900), 0.5)).toBe(false);
    expect(isInView(entry(0.2, 400, null), 0.5)).toBe(false);
  });

  it('observer thresholds include tenths and the threshold, sorted and unique', () => {
    expect(observerThresholds(0.5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(observerThresholds(0.55)).toContain(0.55);
    expect(observerThresholds(2).at(-1)).toBe(1);
  });
});

describe('search param helpers', () => {
  const allowed = ['all', 'mobile', 'web'] as const;

  it('reads allowed values and falls back on unknown or missing ones', () => {
    expect(parseParam('web', allowed, 'all')).toBe('web');
    expect(parseParam('nope', allowed, 'all')).toBe('all');
    expect(parseParam(null, allowed, 'all')).toBe('all');
    expect(parseParam('', allowed, 'all')).toBe('all');
  });

  it('sets a value and removes the key for the fallback, keeping other params in order', () => {
    expect(withParam('', 'type', 'web', 'all')).toBe('?type=web');
    expect(withParam('type=web&context=company', 'type', 'mobile', 'all')).toBe('?type=mobile&context=company');
    expect(withParam('type=web&context=company', 'type', 'all', 'all')).toBe('?context=company');
    expect(withParam('type=web', 'type', 'all', 'all')).toBe('');
    expect(withParam('?brand=1hope', 'brand', 'sjdm-app', 'smile-safe-taytay')).toBe('?brand=sjdm-app');
  });
});

describe('reduced motion', () => {
  it('is the site setting or the OS preference (the site only ever adds reduction)', () => {
    expect(resolveReducedMotion('reduce', false)).toBe(true);
    expect(resolveReducedMotion('full', true)).toBe(true);
    expect(resolveReducedMotion(undefined, true)).toBe(true);
    expect(resolveReducedMotion('full', false)).toBe(false);
    expect(resolveReducedMotion(undefined, false)).toBe(false);
  });
});
