import { describe, expect, it } from 'vitest';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import type { FigureId, Glimpse, GlimpseId } from '@/content/types';
import { glimpsePlaylist, GLIMPSE_ROTATIONS, initGlimpse, reduceGlimpse, stepStates } from '@/lib/glimpse';

/*
 * The glimpse sequences (src/content/apps/glimpses.ts) against design §5.3: captions are the
 * figures' FIG lines, taps sit on the canvas and finish inside their step, holds stay in the
 * design's range, posters exist for every step, and Home stops after two rotations in about a
 * minute. Structural checks (figures, states, poster steps, brand rotation) live in
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

  it('use taps from design §5.3 for the steps that have them', () => {
    const taps = (id: GlimpseId, index: number) => byId(id).steps[index]?.taps?.map(({ x, y, kind }) => [x, y, kind]);
    expect(taps('home.sme', 1)).toEqual([
      [262, 806, 'tap'],
      [195, 812, 'tap'],
    ]);
    expect(taps('home.sme', 2)).toEqual([[300, 168, 'tap']]);
    expect(taps('home.citizen', 1)).toEqual([
      [195, 768, 'tap'],
      [276, 590, 'tap'],
    ]);
    expect(taps('home.responder', 0)).toEqual([[352, 74, 'tap']]);
    expect(taps('home.responder', 1)).toEqual([[292, 806, 'tap']]);
    expect(taps('hero.defensys-responder', 3)).toEqual([[360, 806, 'hold']]);
  });

  it('end each step on its final coherent state (3.3 on site)', () => {
    const poster = (id: GlimpseId, index: number) => byId(id).steps[index]?.posterState;
    expect(poster('home.responder', 2)).toBe('on-site');
    expect(poster('home.sme', 1)).toBe('confirmed');
    expect(poster('home.sme', 2)).toBe('enhanced');
    expect(poster('home.citizen', 2)).toBe('connected');
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

  it('rotates two Citizen skins and gives Responder its own poster frame', () => {
    expect(playlist.tracks.map((track) => track.rotations ?? 1)).toEqual([1, 2, 1]);
    expect(playlist.tracks.map((track) => track.posterFrame ?? false)).toEqual([false, false, true]);
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

  it('give each step a played state that differs from its poster only where the screen changes', () => {
    const unchanged = steps
      .filter(({ step }) => {
        const states = stepStates(step, defaultState(step.figure));
        return states.play === states.poster;
      })
      .map(({ step }) => step.figure);
    expect([...new Set(unchanged)].sort()).toEqual(['1.1', '1.3', '2.1']);
  });
});
