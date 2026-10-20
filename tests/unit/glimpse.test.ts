import { describe, expect, it } from 'vitest';
import { autoplayStatus, type AutoplayIntent } from '@/hooks/autoplay-state';
import {
  brandIndexForRotation,
  glimpseStatus,
  holdOf,
  initGlimpse,
  initPlayer,
  isLive,
  posterStepOf,
  reduceGlimpse,
  reducePlayer,
  sameFrame,
  shownFrame,
  trackBrandIndex,
  trackRotation,
  upcomingFrame,
  type GlimpseEvent,
  type GlimpseState,
  type Playlist,
  type PlayerEvent,
  type PlayerState,
} from '@/lib/glimpse';

/*
 * The glimpse reducer (architecture D4): sequencing, the shared autoplay policy, suspension with
 * remaining time, the end after two rotations, Replay, GOTO, hover hold, reduced motion and the
 * per-rotation brand skin. Pure, so no DOM is needed.
 */

/** Home-like: SME, Citizen (two skins), Responder (its poster step has its own poster frame). */
const HOME: Playlist = {
  tracks: [
    { steps: [{ holdMs: 3200 }, { holdMs: 4400 }, { holdMs: 3800 }], posterStep: 0 },
    { steps: [{ holdMs: 3200 }, { holdMs: 3700 }, { holdMs: 3000 }], posterStep: 0, rotations: 2 },
    { steps: [{ holdMs: 2800 }, { holdMs: 3000 }, { holdMs: 3600 }], posterStep: 0, posterFrame: true },
  ],
  maxRotations: 2,
  reducedMotion: false,
};

/** A case-study hero: one track whose poster is its last step. */
const HERO: Playlist = {
  tracks: [{ steps: [{ holdMs: 1000 }, { holdMs: 2000 }, { holdMs: 3000 }], posterStep: 2, posterFrame: true }],
  maxRotations: 2,
  reducedMotion: false,
};

const REDUCED: Playlist = { ...HOME, reducedMotion: true };

function run(playlist: Playlist, events: readonly GlimpseEvent[], from: GlimpseState = initGlimpse(playlist)): GlimpseState {
  return events.reduce((state, event) => reduceGlimpse(playlist, state, event), from);
}

const SHOW: GlimpseEvent = { type: 'VISIBLE', visible: true };
const HIDE: GlimpseEvent = { type: 'VISIBLE', visible: false };
const TICK: GlimpseEvent = { type: 'TICK' };
const ticks = (count: number): GlimpseEvent[] => Array.from({ length: count }, () => TICK);

/** Playing in view: the usual starting point. */
const playing = (playlist: Playlist = HOME): GlimpseState => run(playlist, [SHOW]);

const position = (state: GlimpseState) => [state.track, state.step] as const;

describe('initGlimpse', () => {
  it('waits for the first visibility report, with every track on its poster', () => {
    const state = initGlimpse(HOME);
    expect(state).toMatchObject({ track: 0, step: 0, rotation: 0, status: 'suspended', userPaused: false, started: false });
    expect(state.remainingMs).toBe(3200);
    expect([0, 1, 2].map((track) => shownFrame(HOME, state, track))).toEqual([
      { step: 0, kind: 'play' },
      { step: 0, kind: 'play' },
      { step: 0, kind: 'poster' },
    ]);
    expect([0, 1, 2].some((track) => isLive(HOME, state, track))).toBe(false);
  });

  it('starts playing at once when it is known to be in view', () => {
    const state = initGlimpse(HOME, { visible: true });
    expect(state).toMatchObject({ status: 'playing', started: true });
    expect(isLive(HOME, state, 0)).toBe(true);
  });

  it('under reduced motion holds at the poster step with Play offered (D4)', () => {
    const state = initGlimpse({ ...HERO, reducedMotion: true }, { visible: true });
    expect(state).toMatchObject({ status: 'paused', userPaused: true, step: 2, started: false });
    expect(state.remainingMs).toBe(3000);
    expect(shownFrame(HERO, state, 0)).toEqual({ step: 2, kind: 'poster' });
  });
});

describe('the shared autoplay policy', () => {
  const intents: readonly AutoplayIntent[] = ['auto', 'paused', 'playing'];

  it('matches src/hooks/autoplay-state for every combination', () => {
    for (const intent of intents) {
      for (const visible of [true, false]) {
        for (const reducedMotion of [true, false]) {
          for (const ended of [true, false]) {
            const policy = autoplayStatus({ intent, runs: ended ? 2 : 0, ended }, { visible, hidden: false, reducedMotion });
            const glimpse = glimpseStatus(HOME, { intent, visible, reducedMotion, rotation: ended ? 2 : 0 });
            const where = JSON.stringify({ intent, visible, reducedMotion, ended });
            expect(glimpse.userPaused, where).toBe(policy.userPaused);
            expect(glimpse.status === 'ended', where).toBe(policy.ended);
            expect(glimpse.status === 'playing', where).toBe(policy.running);
          }
        }
      }
    }
  });

  it('suspends only when not paused by the user', () => {
    expect(glimpseStatus(HOME, { intent: 'auto', visible: false, reducedMotion: false, rotation: 0 }).status).toBe('suspended');
    expect(glimpseStatus(HOME, { intent: 'paused', visible: false, reducedMotion: false, rotation: 0 }).status).toBe('paused');
  });
});

describe('sequencing', () => {
  it('plays each step, hands over to the next track, and counts a rotation after the last', () => {
    const order: [number, number][] = [];
    let state = playing();
    for (let index = 0; index < 9; index += 1) {
      order.push([state.track, state.step]);
      state = reduceGlimpse(HOME, state, TICK);
    }
    expect(order).toEqual([
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]);
    expect(state).toMatchObject({ track: 0, step: 0, rotation: 1, status: 'playing' });
  });

  it('gives every step its full hold and a new seq', () => {
    const start = playing();
    const next = reduceGlimpse(HOME, start, TICK);
    expect(next.remainingMs).toBe(4400);
    expect(next.seq).toBe(start.seq + 1);
    expect(holdOf(HOME, 1, 1)).toBe(3700);
    expect(holdOf(HOME, 9, 9)).toBe(0);
  });

  it('ignores TICK unless playing (a stale timer never advances a paused player)', () => {
    const paused = run(HOME, [SHOW, { type: 'PAUSE' }]);
    expect(reduceGlimpse(HOME, paused, TICK)).toBe(paused);
    const suspended = initGlimpse(HOME);
    expect(reduceGlimpse(HOME, suspended, TICK)).toBe(suspended);
  });

  it('stops after 2 rotations: every track back on its poster, Replay offered', () => {
    const ended = run(HOME, [SHOW, ...ticks(18)]);
    expect(ended).toMatchObject({ status: 'ended', rotation: 2, started: false, track: 0, step: 0 });
    expect(shownFrame(HOME, ended, 2)).toEqual({ step: 0, kind: 'poster' });
    expect([0, 1, 2].some((track) => isLive(HOME, ended, track))).toBe(false);
    expect(reduceGlimpse(HOME, ended, TICK)).toBe(ended);
    expect(run(HOME, [SHOW, ...ticks(17)]).status).toBe('playing');
  });

  it('a one-track player counts each pass as a rotation', () => {
    const ended = run(HERO, [SHOW, ...ticks(6)]);
    expect(ended).toMatchObject({ status: 'ended', rotation: 2, step: 2 });
    expect(run(HERO, [SHOW, ...ticks(3)])).toMatchObject({ status: 'playing', rotation: 1, step: 0 });
  });

  it('treats a missing or invalid rotation limit as one rotation, and Infinity as endless', () => {
    expect(run({ ...HERO, maxRotations: 0 }, [SHOW, ...ticks(3)]).status).toBe('ended');
    expect(run({ ...HERO, maxRotations: Number.NaN }, [SHOW, ...ticks(3)]).status).toBe('ended');
    expect(run({ ...HERO, maxRotations: Number.POSITIVE_INFINITY }, [SHOW, ...ticks(300)]).status).toBe('playing');
  });
});

describe('pause, suspension and remaining time', () => {
  it('a user pause banks the elapsed time and Play resumes with the rest', () => {
    const paused = run(HOME, [SHOW, TICK, { type: 'PAUSE', elapsedMs: 1400 }]);
    expect(paused).toMatchObject({ status: 'paused', userPaused: true, step: 1, remainingMs: 3000 });
    const resumed = reduceGlimpse(HOME, paused, { type: 'PLAY' });
    expect(resumed).toMatchObject({ status: 'playing', userPaused: false, step: 1, remainingMs: 3000, seq: paused.seq });
  });

  it('a user pause is sticky: visibility and motion changes never resume it', () => {
    const paused = run(HOME, [SHOW, { type: 'PAUSE', elapsedMs: 500 }]);
    const after = run(HOME, [HIDE, SHOW, { type: 'MOTION', reduced: true }, { type: 'MOTION', reduced: false }], paused);
    expect(after.status).toBe('paused');
    expect(after.remainingMs).toBe(paused.remainingMs);
  });

  it('a hidden tab or <50% visibility suspends, keeps the remaining time and resumes by itself', () => {
    const suspended = run(HOME, [SHOW, { type: 'VISIBLE', visible: false, elapsedMs: 2000 }]);
    expect(suspended).toMatchObject({ status: 'suspended', userPaused: false, remainingMs: 1200, step: 0 });
    const back = reduceGlimpse(HOME, suspended, SHOW);
    expect(back).toMatchObject({ status: 'playing', remainingMs: 1200, step: 0, seq: suspended.seq });
  });

  it('banks elapsed time only while playing, and never below zero', () => {
    const suspended = run(HOME, [{ type: 'PAUSE', elapsedMs: 999 }]);
    expect(suspended.remainingMs).toBe(3200);
    expect(run(HOME, [SHOW, { type: 'PAUSE', elapsedMs: 99_999 }]).remainingMs).toBe(0);
    expect(run(HOME, [SHOW, { type: 'PAUSE', elapsedMs: -50 }]).remainingMs).toBe(3200);
    expect(run(HOME, [SHOW, { type: 'PAUSE', elapsedMs: Number.NaN }]).remainingMs).toBe(3200);
  });

  it('pausing while suspended keeps the banked time', () => {
    const state = run(HOME, [SHOW, { type: 'VISIBLE', visible: false, elapsedMs: 700 }, { type: 'PAUSE', elapsedMs: 5000 }]);
    expect(state).toMatchObject({ status: 'paused', remainingMs: 2500 });
  });

  it('repeated events return the same state object (no re-render)', () => {
    const paused = run(HOME, [SHOW, { type: 'PAUSE' }]);
    expect(reduceGlimpse(HOME, paused, { type: 'PAUSE' })).toBe(paused);
    const shown = playing();
    expect(reduceGlimpse(HOME, shown, SHOW)).toBe(shown);
    const played = reduceGlimpse(HOME, shown, { type: 'PLAY' });
    expect(reduceGlimpse(HOME, played, { type: 'PLAY' })).toBe(played);
    expect(reduceGlimpse(HOME, shown, { type: 'MOTION', reduced: false })).toBe(shown);
    expect(reduceGlimpse(HOME, shown, { type: 'HOVER', track: null })).toBe(shown);
  });

  it('pause is ignored after the end', () => {
    const ended = run(HOME, [SHOW, ...ticks(18)]);
    expect(reduceGlimpse(HOME, ended, { type: 'PAUSE' })).toBe(ended);
  });
});

describe('reduced motion', () => {
  it('starts paused on the poster step; Play continues from there', () => {
    const start = run(REDUCED, [SHOW]);
    expect(start).toMatchObject({ status: 'paused', userPaused: true, step: 0, started: false });
    const played = reduceGlimpse(REDUCED, start, { type: 'PLAY' });
    expect(played).toMatchObject({ status: 'playing', userPaused: false, step: 0, started: true });
    expect(reduceGlimpse(REDUCED, played, TICK)).toMatchObject({ status: 'playing', step: 1 });
  });

  it('holds on the poster step when it turns on before playback starts (hydration)', () => {
    const state = run(HERO, [{ type: 'MOTION', reduced: true }, SHOW]);
    expect(state).toMatchObject({ status: 'paused', step: 2, remainingMs: 3000, started: false });
  });

  it('turning it on mid-play holds playback; turning it off resumes autoplay', () => {
    const held = run(HOME, [SHOW, TICK, { type: 'MOTION', reduced: true, elapsedMs: 1000 }]);
    expect(held).toMatchObject({ status: 'paused', userPaused: true, step: 1, remainingMs: 3400, started: true });
    expect(reduceGlimpse(HOME, held, { type: 'MOTION', reduced: false })).toMatchObject({ status: 'playing', step: 1 });
  });

  it('a user who pressed Play keeps playing when it turns on', () => {
    const state = run(HOME, [SHOW, { type: 'PAUSE' }, { type: 'PLAY' }, { type: 'MOTION', reduced: true }]);
    expect(state.status).toBe('playing');
  });

  it('shows the poster frame on the poster step, and the played state elsewhere', () => {
    const reducedHero = { ...HERO, reducedMotion: true };
    const state = run(reducedHero, [SHOW, { type: 'PLAY' }]);
    expect(shownFrame(reducedHero, state, 0)).toEqual({ step: 2, kind: 'poster' });
    expect(isLive(reducedHero, state, 0)).toBe(false);
    const next = reduceGlimpse(reducedHero, state, TICK);
    expect(shownFrame(reducedHero, next, 0)).toEqual({ step: 0, kind: 'play' });
    expect(isLive(reducedHero, next, 0)).toBe(true);
  });
});

describe('Replay', () => {
  it('Play after the end replays from the first step of the first track', () => {
    const ended = run(HOME, [SHOW, ...ticks(18)]);
    for (const event of [{ type: 'PLAY' }, { type: 'REPLAY' }] as const) {
      const state = reduceGlimpse(HOME, ended, event);
      expect(state).toMatchObject({ track: 0, step: 0, rotation: 0, status: 'playing', started: true, remainingMs: 3200 });
      expect(state.seq).toBeGreaterThan(ended.seq);
    }
  });

  it('replays under reduced motion too (the user asked)', () => {
    const ended = run(REDUCED, [SHOW, { type: 'PLAY' }, ...ticks(18)]);
    expect(ended.status).toBe('ended');
    expect(reduceGlimpse(REDUCED, ended, { type: 'REPLAY' }).status).toBe('playing');
  });

  it('a replay while off-screen waits suspended on the posters', () => {
    const ended = run(HOME, [SHOW, ...ticks(18), HIDE]);
    expect(reduceGlimpse(HOME, ended, { type: 'REPLAY' })).toMatchObject({ status: 'suspended', started: false, step: 0 });
  });

  it('REPLAY mid-run restarts from the top and clears a hover hold', () => {
    const state = run(HOME, [SHOW, { type: 'HOVER', track: 2 }, TICK, { type: 'REPLAY' }]);
    expect(state).toMatchObject({ track: 0, step: 0, rotation: 0, hover: null, status: 'playing' });
  });
});

describe('GOTO (step dots and the app picker)', () => {
  it('jumps to a step with its full hold, keeping play or pause', () => {
    const state = run(HOME, [SHOW, { type: 'GOTO', step: 2 }]);
    expect(state).toMatchObject({ track: 0, step: 2, remainingMs: 3800, status: 'playing', started: true });
    const paused = run(HOME, [SHOW, { type: 'PAUSE' }, { type: 'GOTO', track: 1, step: 1 }]);
    expect(paused).toMatchObject({ track: 1, step: 1, status: 'paused', started: true });
  });

  it('shows the chosen step even before playback started (reduced motion)', () => {
    const state = run(REDUCED, [SHOW, { type: 'GOTO', step: 1 }]);
    expect(state).toMatchObject({ status: 'paused', step: 1, started: true });
    expect(shownFrame(REDUCED, state, 0)).toEqual({ step: 1, kind: 'play' });
  });

  it('restarts the current step when chosen again', () => {
    const before = run(HOME, [SHOW, { type: 'PAUSE', elapsedMs: 1000 }]);
    const again = reduceGlimpse(HOME, before, { type: 'GOTO', step: 0 });
    expect(again.remainingMs).toBe(3200);
    expect(again.seq).toBe(before.seq + 1);
  });

  it('ignores steps and tracks that do not exist', () => {
    const state = playing();
    for (const event of [
      { type: 'GOTO', step: 3 },
      { type: 'GOTO', step: -1 },
      { type: 'GOTO', step: 1.5 },
      { type: 'GOTO', track: 3, step: 0 },
    ] as const) {
      expect(reduceGlimpse(HOME, state, event)).toBe(state);
    }
  });

  it('after the end, starts a fresh run paused on the chosen step', () => {
    const ended = run(HOME, [SHOW, ...ticks(18)]);
    const state = reduceGlimpse(HOME, ended, { type: 'GOTO', track: 2, step: 1 });
    expect(state).toMatchObject({ status: 'paused', rotation: 0, track: 2, step: 1, started: true, userPaused: true });
    expect(reduceGlimpse(HOME, state, { type: 'PLAY' }).status).toBe('playing');
  });
});

describe('hover and focus hold (trio)', () => {
  it('makes the hovered track current and loops it instead of handing over', () => {
    const state = run(HOME, [SHOW, { type: 'HOVER', track: 1 }]);
    expect(state).toMatchObject({ track: 1, step: 0, hover: 1, remainingMs: 3200 });
    const looped = run(HOME, ticks(3), state);
    expect(position(looped)).toEqual([1, 0]);
    expect(looped.rotation).toBe(0);
  });

  it('hovering the current track keeps its clock; leaving lets the rotation continue', () => {
    const start = run(HOME, [SHOW, TICK]);
    const hovered = reduceGlimpse(HOME, start, { type: 'HOVER', track: 0 });
    expect(hovered).toMatchObject({ track: 0, step: 1, seq: start.seq, remainingMs: start.remainingMs });
    const left = run(HOME, [{ type: 'HOVER', track: null }, TICK, TICK], hovered);
    expect(position(left)).toEqual([1, 0]);
  });

  it('records but does not act on hover while paused or ended', () => {
    const paused = run(HOME, [SHOW, { type: 'PAUSE' }, { type: 'HOVER', track: 2 }]);
    expect(paused).toMatchObject({ track: 0, hover: 2, status: 'paused' });
    const ended = run(HOME, [SHOW, ...ticks(18), { type: 'HOVER', track: 1 }]);
    expect(ended).toMatchObject({ track: 0, status: 'ended' });
  });

  it('switches while suspended without starting playback', () => {
    const state = run(HOME, [{ type: 'HOVER', track: 2 }]);
    expect(state).toMatchObject({ track: 2, status: 'suspended', started: false });
    expect(shownFrame(HOME, state, 2)).toEqual({ step: 0, kind: 'poster' });
  });

  it('ignores tracks that do not exist', () => {
    const state = playing();
    expect(reduceGlimpse(HOME, state, { type: 'HOVER', track: 5 })).toBe(state);
  });
});

describe('brand skins per rotation', () => {
  it('brandIndexForRotation cycles through the skins', () => {
    expect([0, 1, 2, 3].map((rotation) => brandIndexForRotation(2, rotation))).toEqual([0, 1, 0, 1]);
    expect(brandIndexForRotation(1, 7)).toBe(0);
    expect(brandIndexForRotation(3, -1)).toBe(2);
    expect(brandIndexForRotation(0, 3)).toBe(0);
    expect(brandIndexForRotation(Number.NaN, 1)).toBe(0);
    expect(brandIndexForRotation(2, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('Citizen shows Smile SAFE Taytay on loop 1 and 1Hope on loop 2, switching as it starts to play', () => {
    let state = playing();
    expect(trackBrandIndex(HOME, state, 1)).toBe(0);
    state = run(HOME, ticks(9), state); // rotation 2 begins: SME plays, Citizen not yet
    expect(state.rotation).toBe(1);
    expect(trackRotation(HOME, state, 1)).toBe(0);
    expect(trackBrandIndex(HOME, state, 1)).toBe(0);
    state = run(HOME, ticks(3), state); // Citizen starts its second run
    expect(position(state)).toEqual([1, 0]);
    expect(trackBrandIndex(HOME, state, 1)).toBe(1);
    state = run(HOME, ticks(3), state); // Responder plays; Citizen keeps 1Hope
    expect(trackBrandIndex(HOME, state, 1)).toBe(1);
  });

  it('keeps the last skin after the end, and Replay returns to the first', () => {
    const ended = run(HOME, [SHOW, ...ticks(18)]);
    expect(trackBrandIndex(HOME, ended, 1)).toBe(1);
    expect(trackBrandIndex(HOME, reduceGlimpse(HOME, ended, { type: 'REPLAY' }), 1)).toBe(0);
  });

  it('tracks without a rotation always use skin 0', () => {
    const state = run(HOME, [SHOW, ...ticks(12)]);
    expect(trackBrandIndex(HOME, state, 0)).toBe(0);
    expect(trackBrandIndex(HOME, state, 2)).toBe(0);
  });
});

describe('frames: shown, live and next', () => {
  it('only the current track is live; the others show their poster step', () => {
    const state = run(HOME, [SHOW, ...ticks(4)]); // Citizen, step 1
    expect(isLive(HOME, state, 1)).toBe(true);
    expect(shownFrame(HOME, state, 1)).toEqual({ step: 1, kind: 'play' });
    expect(isLive(HOME, state, 0)).toBe(false);
    expect(shownFrame(HOME, state, 0)).toEqual({ step: 0, kind: 'play' });
    expect(shownFrame(HOME, state, 2)).toEqual({ step: 0, kind: 'poster' });
  });

  it('a paused or suspended player keeps its live frame (frozen by data-paused)', () => {
    const paused = run(HOME, [SHOW, TICK, { type: 'PAUSE' }]);
    expect(isLive(HOME, paused, 0)).toBe(true);
    expect(shownFrame(HOME, paused, 0)).toEqual({ step: 1, kind: 'play' });
    const suspended = run(HOME, [SHOW, TICK, HIDE]);
    expect(isLive(HOME, suspended, 0)).toBe(true);
  });

  it('marks the frame each track shows after the next step change', () => {
    const start = initGlimpse(HOME);
    expect(upcomingFrame(HOME, start, 0)).toBeNull(); // step 0 is the poster and the first played frame
    expect(upcomingFrame(HOME, start, 2)).toBeNull();
    const hover = run(HOME, [{ type: 'HOVER', track: 2 }]);
    expect(upcomingFrame(HOME, hover, 2)).toEqual({ step: 0, kind: 'play' });

    const playingState = playing();
    expect(upcomingFrame(HOME, playingState, 0)).toEqual({ step: 1, kind: 'play' });
    const lastSme = run(HOME, ticks(2), playingState);
    expect(upcomingFrame(HOME, lastSme, 0)).toEqual({ step: 0, kind: 'play' }); // back to its poster step
    expect(upcomingFrame(HOME, lastSme, 1)).toBeNull(); // Citizen step 0 is already its poster
    const lastCitizen = run(HOME, ticks(3), lastSme);
    expect(upcomingFrame(HOME, lastCitizen, 2)).toEqual({ step: 0, kind: 'play' }); // Responder leaves its poster frame
    const ended = run(HOME, [SHOW, ...ticks(18)]);
    expect([0, 1, 2].map((track) => upcomingFrame(HOME, ended, track))).toEqual([null, null, null]);
    expect(upcomingFrame(HOME, playingState, 7)).toBeNull();
  });

  it('compares frames by step and kind', () => {
    expect(sameFrame({ step: 1, kind: 'play' }, { step: 1, kind: 'play' })).toBe(true);
    expect(sameFrame({ step: 1, kind: 'play' }, { step: 1, kind: 'poster' })).toBe(false);
    expect(sameFrame(null, null)).toBe(true);
    expect(sameFrame(null, { step: 0, kind: 'play' })).toBe(false);
  });

  it('clamps poster steps into range', () => {
    const odd: Playlist = { tracks: [{ steps: [{ holdMs: 1 }, { holdMs: 2 }], posterStep: 9 }], maxRotations: 2, reducedMotion: false };
    expect(posterStepOf(odd, 0)).toBe(1);
    expect(posterStepOf({ ...odd, tracks: [{ steps: [{ holdMs: 1 }], posterStep: -3 }] }, 0)).toBe(0);
    expect(posterStepOf(odd, 4)).toBe(0);
  });
});

describe('player crossfade (leaving frames)', () => {
  const step = (state: PlayerState, event: PlayerEvent) => reducePlayer(HOME, state, event);

  it('keeps the previous frame, still live, under a newly shown one until SETTLE', () => {
    const start = step(initPlayer(HOME), SHOW);
    expect(start.leaving).toEqual([null, null, null]); // step 0 was already the shown poster frame
    const next = step(start, TICK);
    expect(next.leaving).toEqual([{ frame: { step: 0, kind: 'play' }, live: true }, null, null]);
    const settled = step(next, { type: 'SETTLE', track: 0 });
    expect(settled.leaving).toEqual([null, null, null]);
    expect(step(settled, { type: 'SETTLE', track: 0 })).toBe(settled);
  });

  it('crossfades a poster frame out (not live) when its track starts', () => {
    const responder = step(step(initPlayer(HOME), SHOW), { type: 'HOVER', track: 2 });
    expect(responder.leaving[2]).toEqual({ frame: { step: 0, kind: 'poster' }, live: false });
  });

  it('a later change replaces the leaving frame; unchanged tracks keep theirs', () => {
    let state = step(initPlayer(HOME), SHOW);
    state = step(state, TICK);
    state = step(state, { type: 'PAUSE' });
    expect(state.leaving[0]).toEqual({ frame: { step: 0, kind: 'play' }, live: true });
    state = step(state, { type: 'GOTO', step: 2 });
    expect(state.leaving[0]).toEqual({ frame: { step: 1, kind: 'play' }, live: true });
  });

  it('returns the same state for events that change nothing, and keeps leaving frames stable', () => {
    const state = step(initPlayer(HOME), SHOW);
    expect(step(state, SHOW)).toBe(state);
    const moved = step(state, TICK);
    const paused = step(moved, { type: 'PAUSE' });
    expect(paused.leaving).toBe(moved.leaving);
  });
});

describe('degenerate playlists', () => {
  it('an empty playlist ignores navigation and simply ends, without throwing', () => {
    const empty: Playlist = { tracks: [], maxRotations: 2, reducedMotion: false };
    const shown = run(empty, [SHOW]);
    expect(reduceGlimpse(empty, shown, { type: 'GOTO', step: 0 })).toBe(shown);
    expect(reduceGlimpse(empty, shown, { type: 'HOVER', track: 0 })).toBe(shown);
    const state = run(empty, ticks(2), shown);
    expect(state).toMatchObject({ status: 'ended', remainingMs: 0 });
    expect(shownFrame(empty, state, 0)).toEqual({ step: 0, kind: 'play' });
    expect(upcomingFrame(empty, state, 0)).toBeNull();
  });

  it('negative or missing holds count as zero', () => {
    const odd: Playlist = { tracks: [{ steps: [{ holdMs: -5 }, { holdMs: Number.NaN }], posterStep: 0 }], maxRotations: 1, reducedMotion: false };
    expect(holdOf(odd, 0, 0)).toBe(0);
    expect(holdOf(odd, 0, 1)).toBe(0);
  });
});
