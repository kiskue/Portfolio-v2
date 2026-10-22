import { describe, expect, it } from 'vitest';
import { DISPATCH_TIMELINE, DUTY_TIMELINE, NAV_TIMELINE, PTT_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import { ENHANCE_TIMING } from '@/components/replicas/sme/ai';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import type { FigureId, Glimpse, GlimpseId } from '@/content/types';
import { glimpsePlaylist, GLIMPSE_ROTATIONS, initGlimpse, reduceGlimpse, stepStates } from '@/lib/glimpse';

/*
 * The glimpse sequences (src/content/apps/glimpses.ts) against design §5.3 and the replicas:
 * captions are the figures' FIG lines, taps sit on the measured targets and land (180 ms after
 * atMs) when the screen reacts, they finish inside their step, holds stay in the design's range,
 * every step plays an animated state that ends on its poster, and Home stops after two rotations
 * in about a minute. Structural checks (figures, states, poster steps, brand rotation) live in
 * content.invariants.test.ts.
 */

const figureById = new Map(figures.map((figure) => [figure.id, figure] as const));
const defaultState = (figure: FigureId): string => figureById.get(figure)?.states[0] ?? '';
const byId = (id: GlimpseId): Glimpse => {
  const glimpse = glimpses.find((candidate) => candidate.id === id);
  if (!glimpse) throw new Error(`missing glimpse ${id}`);
  return glimpse;
};
const steps = glimpses.flatMap((glimpse) => glimpse.steps.map((step, index) => ({ glimpse, step, where: `${glimpse.id} step ${index}` })));

/** Tap ring timing (design §5.3): scale in 180ms, (hold), fade out 270ms. */
const TAP_IN_MS = 180;
const TAP_OUT_MS = 270;

describe('glimpse steps', () => {
  it('caption each step with its figure’s FIG line', () => {
    const problems = steps.flatMap(({ step, where }) =>
      step.caption === figureById.get(step.figure)?.caption ? [] : [`${where}: "${step.caption}"`],
    );
    expect(problems).toEqual([]);
  });

  it('set a played state and a poster state on every step', () => {
    const problems = steps.flatMap(({ step, where }) => (step.state && step.posterState ? [] : [`${where}: state or posterState missing`]));
    expect(problems).toEqual([]);
  });

  it('hold each step for 2.4–4.4 s (design §5.3; 1.2 runs 1.4 s + 3.0 s)', () => {
    const problems = steps.flatMap(({ step, where }) =>
      Number.isInteger(step.holdMs) && step.holdMs >= 2400 && step.holdMs <= 4400 ? [] : [`${where}: ${step.holdMs}ms`],
    );
    expect(problems).toEqual([]);
  });

  it('place taps on the 390×844 canvas, finishing inside the step', () => {
    const problems = steps.flatMap(({ step, where }) =>
      (step.taps ?? []).flatMap((tap, index) => {
        const found: string[] = [];
        const end = tap.atMs + TAP_IN_MS + (tap.holdMs ?? 0) + TAP_OUT_MS;
        if (tap.x < 22 || tap.x > 368 || tap.y < 22 || tap.y > 822) found.push(`${where} tap ${index}: ring leaves the canvas`);
        if (tap.atMs < 0 || end > step.holdMs) found.push(`${where} tap ${index}: ends at ${end}ms of ${step.holdMs}ms`);
        if ((tap.kind === 'hold') !== (tap.holdMs !== undefined)) found.push(`${where} tap ${index}: holdMs belongs to holds only`);
        return found;
      }),
    );
    expect(problems).toEqual([]);
  });

  it('tap the targets measured on the replicas (wave 2a builder reports)', () => {
    const taps = (id: GlimpseId, index: number) =>
      byId(id).steps[index]?.taps?.map(({ x, y, atMs, kind, holdMs }) => [x, y, atMs, kind, holdMs]);
    // 1.2: Checkout (251, 804) and Confirm Sale (195, 781) (W3a); 1.6: Enhance with AI (298, 179) (W3b).
    expect(taps('home.sme', 1)).toEqual([
      [251, 804, 1220, 'tap', undefined],
      [195, 781, 2820, 'tap', undefined],
    ]);
    expect(taps('home.sme', 2)).toEqual([[298, 179, 220, 'tap', undefined]]);
    // 2.3: SOS (195, 752) and Confirm Call (273, 542); 2.5: the Flood card (195, 276) (W4).
    expect(taps('home.citizen', 1)).toEqual([
      [195, 752, 720, 'tap', undefined],
      [273, 542, 3120, 'tap', undefined],
    ]);
    expect(taps('hero.defensys-citizen', 3)).toEqual([[195, 276, 1020, 'tap', undefined]]);
    // 3.1: the duty switch (351, 72); 3.2: ACCEPT (289, 807); 3.5: hold the mic (356, 806) (W5).
    expect(taps('home.responder', 0)).toEqual([[351, 72, 420, 'tap', undefined]]);
    expect(taps('home.responder', 1)).toEqual([[289, 807, 2550, 'tap', undefined]]);
    expect(taps('home.responder', 2)).toBeUndefined();
    expect(taps('hero.defensys-responder', 3)).toEqual([[356, 806, 420, 'hold', 1200]]);
  });

  it('land each tap ring (180 ms after atMs) when the replica reacts', () => {
    const tap = (id: GlimpseId, step: number, index = 0) => byId(id).steps[step]?.taps?.[index];
    const lands = (id: GlimpseId, step: number, index = 0) => (tap(id, step, index)?.atMs ?? Number.NaN) + TAP_IN_MS;
    // SME 1.2 (sme/core/screens/pos-checkout.tsx SHEET_AT_MS, CONFIRMED_AT_MS): the sheet at
    // 1.4 s, "Sale Confirmed!" at 3.0 s. SME 1.6: ENHANCE_TIMING.
    expect(lands('home.sme', 1, 0)).toBe(1400);
    expect(lands('home.sme', 1, 1)).toBe(3000);
    expect(tap('home.sme', 2)?.atMs).toBe(ENHANCE_TIMING.tapAtMs);
    expect(lands('home.sme', 2)).toBe(ENHANCE_TIMING.enhancingAtMs);
    // Citizen 2.3 and 2.5 (citizen.css): SOS pressed at 900 ms, Confirm Call at 3300 ms, the Flood card at 1200 ms.
    expect(lands('home.citizen', 1, 0)).toBe(900);
    expect(lands('home.citizen', 1, 1)).toBe(3300);
    expect(lands('hero.defensys-citizen', 3)).toBe(1200);
    // Responder (responder/parts/timeline.ts).
    expect(lands('home.responder', 0)).toBe(DUTY_TIMELINE.flipAt);
    expect(lands('hero.defensys-responder', 3)).toBe(PTT_TIMELINE.holdAt);
    expect(lands('hero.defensys-responder', 3) + (tap('hero.defensys-responder', 3)?.holdMs ?? 0)).toBe(PTT_TIMELINE.releaseAt);
    // 3.2 has no in-screen reaction: the ring lands after the sheet settles and fades out just as
    // the next step (3.3, en route) answers it.
    expect(lands('home.responder', 1)).toBeGreaterThan(DISPATCH_TIMELINE.settledAt);
    expect(lands('home.responder', 1) + TAP_OUT_MS).toBe(byId('home.responder').steps[1]?.holdMs);
  });

  it('hold each step until its story has ended', () => {
    const hold = (id: GlimpseId, step: number) => byId(id).steps[step]?.holdMs ?? 0;
    expect(hold('home.responder', 0)).toBeGreaterThan(DUTY_TIMELINE.onlineAt);
    expect(hold('home.responder', 1)).toBeGreaterThan(DISPATCH_TIMELINE.settledAt);
    expect(hold('home.responder', 2)).toBeGreaterThanOrEqual(NAV_TIMELINE.arrivedAt + 600);
    expect(hold('hero.defensys-responder', 3)).toBeGreaterThan(PTT_TIMELINE.landAt + 360);
    expect(hold('home.sme', 2)).toBeGreaterThanOrEqual(ENHANCE_TIMING.arrivedAtMs + ENHANCE_TIMING.typingMs);
  });

  it('end each step on its final coherent state (3.3 on site)', () => {
    const poster = (id: GlimpseId, index: number) => byId(id).steps[index]?.posterState;
    expect(poster('home.responder', 2)).toBe('on-site');
    expect(poster('home.sme', 1)).toBe('confirmed');
    expect(poster('home.sme', 2)).toBe('enhanced');
    expect(poster('home.citizen', 1)).toBe('countdown');
    expect(poster('home.citizen', 2)).toBe('connected');
    expect(poster('hero.defensys-citizen', 3)).toBe('map');
  });

  it('play the state each replica animates under data-active', () => {
    const pairs = steps.map(({ glimpse, step }) => `${glimpse.id} ${step.figure} ${step.state} → ${step.posterState}`);
    expect(pairs).toEqual([
      'home.sme 1.1 kpis → kpis',
      'home.sme 1.2 grid → confirmed',
      'home.sme 1.6 idle → enhanced',
      'home.citizen 2.1 top → top',
      'home.citizen 2.3 idle → countdown',
      'home.citizen 2.4 queue → connected',
      'home.responder 3.1 online → online',
      'home.responder 3.2 toast → toast',
      'home.responder 3.3 on-site → on-site',
      'hero.sme-panindio 1.1 kpis → kpis',
      'hero.sme-panindio 1.2 grid → confirmed',
      'hero.sme-panindio 1.3 ledger → ledger',
      'hero.sme-panindio 1.6 idle → enhanced',
      'hero.defensys-citizen 2.1 top → top',
      'hero.defensys-citizen 2.3 idle → countdown',
      'hero.defensys-citizen 2.4 queue → connected',
      'hero.defensys-citizen 2.5 list → map',
      'hero.defensys-responder 3.1 online → online',
      'hero.defensys-responder 3.2 toast → toast',
      'hero.defensys-responder 3.3 on-site → on-site',
      'hero.defensys-responder 3.5 thread → thread',
    ]);
  });
});

describe('Home playlist', () => {
  const home = (['home.sme', 'home.citizen', 'home.responder'] as const).map(byId);
  const playlist = glimpsePlaylist(home, defaultState);

  it('stops after two rotations, about a minute (design: "about 75s" with four steps)', () => {
    const rotationMs = home.reduce((total, glimpse) => total + glimpse.steps.reduce((sum, step) => sum + step.holdMs, 0), 0);
    expect(GLIMPSE_ROTATIONS).toBe(2);
    expect(rotationMs * GLIMPSE_ROTATIONS).toBeGreaterThan(50_000);
    expect(rotationMs * GLIMPSE_ROTATIONS).toBeLessThanOrEqual(75_000);

    let state = reduceGlimpse(playlist, initGlimpse(playlist), { type: 'VISIBLE', visible: true });
    let elapsed = 0;
    while (state.status === 'playing') {
      elapsed += state.remainingMs;
      state = reduceGlimpse(playlist, state, { type: 'TICK' });
    }
    expect(state.status).toBe('ended');
    expect(elapsed).toBe(rotationMs * 2);
  });

  it('rotates two Citizen skins and needs no separate poster tree (DOM budget)', () => {
    expect(playlist.tracks.map((track) => track.rotations ?? 1)).toEqual([1, 2, 1]);
    // Every Home poster step plays the state it rests on (1.1 kpis, 2.1 top, 3.1 online), so the
    // trio renders 9 phone trees, not 10.
    expect(playlist.tracks.map((track) => track.posterFrame ?? false)).toEqual([false, false, false]);
    expect(playlist.tracks.map((track) => track.posterStep)).toEqual([0, 0, 0]);
  });

  it('start each app on its most representative screen', () => {
    expect(home.map((glimpse) => glimpse.steps[glimpse.posterStep]?.figure)).toEqual(['1.1', '2.1', '3.1']);
  });

  it('keeps Channels (in rollout) off Home', () => {
    expect(home.flatMap((glimpse) => glimpse.steps.map((step) => step.figure))).not.toContain('3.5');
  });
});

describe('case-study hero glimpses', () => {
  it('extend the Home sequence with one more key screen and no repeats', () => {
    const slugs = { sme: 'sme-panindio', citizen: 'defensys-citizen', responder: 'defensys-responder' } as const;
    for (const app of ['sme', 'citizen', 'responder'] as const) {
      const slug = slugs[app];
      const hero = byId(`hero.${slug}`);
      const homeFigures = byId(`home.${app}`).steps.map((step) => step.figure);
      const heroFigures = hero.steps.map((step) => step.figure);
      expect(hero.app).toBe(app);
      expect(new Set(heroFigures).size, slug).toBe(heroFigures.length);
      expect(heroFigures.filter((figure) => homeFigures.includes(figure)), slug).toEqual(homeFigures);
      expect(heroFigures.length, slug).toBe(4);
    }
  });

  it('leave the brand to the case study’s BrandScope (no rotation of their own)', () => {
    expect(glimpses.filter((glimpse) => glimpse.id.startsWith('hero.') && glimpse.brandRotation)).toEqual([]);
  });

  it('label every glimpse as fictional', () => {
    for (const glimpse of glimpses) expect(glimpse.label, glimpse.id).toMatch(/^Preview of .+\. Fictional data\.$/);
  });

  it('give a step a separate poster state only where the replica animates from a start state', () => {
    const unchanged = steps
      .filter(({ step }) => {
        const states = stepStates(step, defaultState(step.figure));
        return states.play === states.poster;
      })
      .map(({ step }) => step.figure);
    // Static or scroll-only screens (1.1, 1.3, 2.1) and the Responder states whose static render is
    // their final frame (responder/parts/timeline.ts).
    expect([...new Set(unchanged)].sort()).toEqual(['1.1', '1.3', '2.1', '3.1', '3.2', '3.3', '3.5']);
  });
});
