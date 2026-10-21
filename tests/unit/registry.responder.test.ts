import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EN_ROUTE_TIMELINE, RCanvas } from '@/components/replicas/kit';
import { replicas } from '@/components/replicas/registry';
import { NAV_FOLLOW } from '@/components/replicas/responder/parts/map-scene';
import { DISPATCH_TIMELINE, DUTY_TIMELINE, NAV_TIMELINE, PTT_TIMELINE, TAP_REACTION } from '@/components/replicas/responder/parts/timeline';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import type { FigureId, GlimpseStep, Tap } from '@/content/types';

/*
 * Defensys Responder replicas (3.1–3.6) against the glimpse step contract (src/content/apps/
 * glimpses.ts) and the Home DOM budget: each glimpse step's `state` plays its in-screen animation
 * toward `posterState` at the step's tap times, the poster states are still, the map screens
 * use the town's scenes, and every state stays lean (Home renders about ten replica trees).
 */

const responderFigures = figures.filter((figure) => figure.app === 'responder');

function render(id: FigureId, state: string): string {
  const figure = responderFigures.find((candidate) => candidate.id === id);
  if (!figure) throw new Error(`no Responder figure ${id}`);
  return renderToStaticMarkup(createElement(RCanvas, { app: 'responder', theme: figure.theme }, createElement(replicas[figure.id], { state })));
}

const elementCount = (html: string): number => [...html.matchAll(/<[a-zA-Z]/g)].length;

/** Every Responder glimpse step, by figure (Home and the case-study hero share the step objects). */
const responderSteps = glimpses.filter((glimpse) => glimpse.app === 'responder').flatMap((glimpse) => glimpse.steps);

function stepFor(figure: FigureId): GlimpseStep {
  const step = responderSteps.find((candidate) => candidate.figure === figure);
  if (!step) throw new Error(`no Responder glimpse step for ${figure}`);
  return step;
}

function onlyTap(step: GlimpseStep): Tap {
  const [tap, ...rest] = step.taps ?? [];
  if (!tap || rest.length > 0) throw new Error(`expected one tap on ${step.figure}`);
  return tap;
}

describe('Responder DOM budget', () => {
  // 3.3 'far' draws the tilted town culled along the whole drive (the kit map is about 100
  // elements of it); every other state keeps to the 250 target.
  const BUDGET: Readonly<Record<string, number>> = { '3.3 far': 280 };

  it('keeps every figure state lean', () => {
    const counts = responderFigures.flatMap((figure) =>
      figure.states.map((state) => ({ key: `${figure.id} ${state}`, count: elementCount(render(figure.id, state)) })),
    );
    console.info(`[registry.responder] elements per state: ${counts.map(({ key, count }) => `${key} ${count}`).join(', ')}`);
    const over = counts.filter(({ key, count }) => count > (BUDGET[key] ?? 250)).map(({ key, count }) => `${key}: ${count}`);
    expect(over).toEqual([]);
  });
});

describe('Responder glimpse steps', () => {
  it('play the step states toward their posters (3.1 offline, 3.2 toast, 3.3 far, 3.5 recording)', () => {
    expect([stepFor('3.1'), stepFor('3.2'), stepFor('3.3'), stepFor('3.5')].map((step) => [step.figure, step.state, step.posterState])).toEqual([
      ['3.1', 'offline', 'online'],
      ['3.2', 'toast', 'sheet'],
      ['3.3', 'far', 'on-site'],
      ['3.5', 'recording', 'thread'],
    ]);
    expect(render('3.1', 'offline')).toMatch(/data-flip=""/);
    expect(render('3.2', 'toast')).toMatch(/rx-responder-sheet--rise[\s\S]*rx-responder-footbtn--press/);
    expect(render('3.3', 'far')).toMatch(/data-drive="3"/);
    expect(render('3.3', 'far')).toMatch(/data-glide="2"/);
    expect(render('3.5', 'recording')).toMatch(/data-land=""[\s\S]*data-press=""/);
  });

  it('keep the poster and other still states free of step animations', () => {
    const stepHooks = /data-flip|rx-responder-sheet--rise|rx-responder-footbtn--press|data-drive|data-glide|data-land|data-press|rx-seq/;
    for (const [id, state] of [
      ['3.1', 'online'],
      ['3.1', 'connecting'],
      ['3.2', 'sheet'],
      ['3.3', 'near'],
      ['3.3', 'on-site'],
      ['3.5', 'thread'],
    ] as const) {
      expect(render(id, state), `${id} ${state}`).not.toMatch(stepHooks);
    }
  });

  it('react to the taps about 180ms after their atMs, inside each hold', () => {
    const duty = stepFor('3.1');
    const dutyTap = onlyTap(duty);
    expect(DUTY_TIMELINE.tapAt).toBe(dutyTap.atMs);
    expect(DUTY_TIMELINE.flipAt).toBe(dutyTap.atMs + TAP_REACTION);
    expect(DUTY_TIMELINE.onlineAt - DUTY_TIMELINE.flipAt).toBe(400);
    expect(DUTY_TIMELINE.onlineAt).toBeLessThan(duty.holdMs);

    const dispatch = stepFor('3.2');
    const accept = onlyTap(dispatch);
    expect(DISPATCH_TIMELINE.acceptTapAt).toBe(accept.atMs);
    expect(DISPATCH_TIMELINE.acceptPressAt).toBe(accept.atMs + TAP_REACTION);
    expect(DISPATCH_TIMELINE.settledAt).toBeLessThan(accept.atMs);
    expect(DISPATCH_TIMELINE.acceptPressAt + 300).toBeLessThanOrEqual(dispatch.holdMs);

    const channel = stepFor('3.5');
    const mic = onlyTap(channel);
    expect(mic.kind).toBe('hold');
    expect(PTT_TIMELINE.holdAt).toBe(mic.atMs + TAP_REACTION);
    expect(PTT_TIMELINE.releaseAt).toBe(mic.atMs + (mic.holdMs ?? 0));
    expect(PTT_TIMELINE.landAt + 360).toBeLessThan(channel.holdMs);
  });

  it('drive 3.3 on the map’s EN_ROUTE_TIMELINE and record arrival inside the hold', () => {
    expect(NAV_TIMELINE).toMatchObject({
      startAt: EN_ROUTE_TIMELINE.startMs,
      closeAt: EN_ROUTE_TIMELINE.closeMs,
      nearAt: EN_ROUTE_TIMELINE.nearMs,
      onSiteAt: EN_ROUTE_TIMELINE.onSiteMs,
    });
    expect(NAV_TIMELINE.arrivedAt).toBeGreaterThan(NAV_TIMELINE.onSiteAt);
    expect(NAV_TIMELINE.arrivedAt).toBeLessThan(stepFor('3.3').holdMs);
    const readings = [...render('3.3', 'far').matchAll(/<div class="rx-seq__frame"[^>]*>([\d,]+)<\/div>/g)].map((match) => Number((match[1] ?? '').replace(',', '')));
    expect(readings[0]).toBe(1240);
    expect(readings.at(-1)).toBe(18);
    expect(readings).toContain(500);
    expect(readings).toContain(80);
    expect([...readings].sort((a, b) => b - a)).toEqual(readings);
  });
});

describe('Responder map screens', () => {
  it('draw the puck through the map (the kit plate), never an overlay of their own', () => {
    for (const [id, state] of [
      ['3.1', 'online'],
      ['3.2', 'toast'],
      ['3.3', 'far'],
    ] as const) {
      const html = render(id, state);
      expect(html, `${id} ${state}`).toMatch(/class="rx-map-puck" data-look="plate"/);
      expect(html, `${id} ${state}`).not.toMatch(/rx-responder-puck/);
    }
  });

  it('title the incident where FIRE must show at the half snap, and pin the report location', () => {
    expect(render('3.2', 'toast')).toContain('Emergency FIRE');
    expect(render('3.3', 'near')).toContain('Emergency FIRE');
    expect(render('3.6', 'form')).toContain('Current Location');
  });

  it('pin the nav puck where the app keeps it above the half sheet (y ≈ 368)', () => {
    expect((NAV_FOLLOW.y ?? 0) * 844).toBeCloseTo(367.8, 0);
  });
});
