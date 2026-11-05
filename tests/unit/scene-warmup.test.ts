import { describe, expect, it, vi } from 'vitest';
import { WARMUP_ID as TEST_WARMUP_ID } from '../support/warmup';
import { SUNRISE, SUNSET, WARM_FILTER } from '@/components/sections/home/sky';
import { skyWarmup, TRACE_OPACITY, WARM_TRACE, WARMUP_ID, WARMUP_MS, warmSky } from '@/components/sections/home/sky-warmup';

/*
 * The sky's warm-up (smooth-sky follow-up): before the first theme change, the layers the next
 * change fades in are drawn once at a strength no screen shows, so the GPU compiles their programs
 * and decodes the other painting then, not in the change's first frames. Nothing on show is touched.
 */

describe('the warm-up plan', () => {
  it('before a sunset: the night painting with the warm filter, the tint, the night scrim and the stars, just showing', () => {
    expect(skyWarmup(false)).toEqual([
      { layer: 'night', frame: { opacity: TRACE_OPACITY, filter: WARM_TRACE } },
      { layer: 'tint', frame: { opacity: TRACE_OPACITY } },
      { layer: 'scrim-night', frame: { opacity: TRACE_OPACITY } },
      { layer: 'stars', frame: { opacity: TRACE_OPACITY, display: 'block' } },
    ]);
  });

  it('before a sunrise: the day painting with the warm filter, the tint and the day scrim, just showing', () => {
    expect(skyWarmup(true)).toEqual([
      { layer: 'day', frame: { opacity: TRACE_OPACITY, filter: WARM_TRACE } },
      { layer: 'tint', frame: { opacity: TRACE_OPACITY } },
      { layer: 'scrim-day', frame: { opacity: TRACE_OPACITY } },
    ]);
  });

  it('warms every layer the change fades in, and none it fades out (a layer on show, drawn by the compositor, is resampled: it would show)', () => {
    for (const [dark, change] of [
      [false, SUNSET],
      [true, SUNRISE],
    ] as const) {
      const fadedIn = change.filter((entry) => entry.keyframes[0]?.opacity !== 1).map((entry) => entry.layer);
      const shown = change.filter((entry) => entry.keyframes[0]?.opacity === 1).map((entry) => entry.layer);
      const warmed = skyWarmup(dark).map((entry) => entry.layer);
      expect(new Set(warmed), `dark ${dark}`).toEqual(new Set(fadedIn.filter((layer) => !shown.includes(layer))));
      for (const layer of shown) expect(warmed, `dark ${dark}: ${layer} is on show`).not.toContain(layer);
    }
  });

  it('draws every warmed layer at the trace opacity, the warm filter only on the painting', () => {
    for (const dark of [false, true]) {
      for (const { layer, frame } of skyWarmup(dark)) {
        expect(frame.opacity, layer).toBe(TRACE_OPACITY);
        if (frame.filter !== undefined) expect(layer).toBe(dark ? 'day' : 'night');
      }
    }
  });

  it('keeps the warm filter’s functions, in order, each 0.1% from no change but not at it', () => {
    const functions = (filter: string) => [...filter.matchAll(/([a-z-]+)\(([^)]*)\)/g)].map(([, name = '', value = '']) => [name, Number(value)] as const);
    const identity: Record<string, number> = { brightness: 1, saturate: 1, sepia: 0 };
    expect(functions(WARM_TRACE).map(([name]) => name)).toEqual(functions(WARM_FILTER).map(([name]) => name));
    for (const [name, value] of functions(WARM_TRACE)) {
      const from = identity[name];
      expect(from, `${name} has a known identity`).toBeDefined();
      expect(Math.abs(value - (from ?? 0)), name).toBeGreaterThan(0);
      expect(Math.abs(value - (from ?? 0)), name).toBeLessThanOrEqual(0.001 + 1e-9);
    }
  });

  it('moves no pixel by more than half a level of 255, and still draws (0 is skipped by the compositor)', () => {
    expect(TRACE_OPACITY).toBeGreaterThan(0);
    expect(TRACE_OPACITY * 255).toBeLessThanOrEqual(0.51);
  });

  it('carries the id the e2e specs look for', () => {
    expect(TEST_WARMUP_ID).toBe(WARMUP_ID);
  });
});

interface FakeAnimation {
  readonly finished: Promise<void>;
  readonly cancel: ReturnType<typeof vi.fn>;
  finish(): void;
}

function fakeAnimation(): FakeAnimation {
  let finish = (): void => {};
  let reject = (): void => {};
  const finished = new Promise<void>((resolve, fail) => {
    finish = resolve;
    reject = () => fail(new DOMException('cancelled', 'AbortError'));
  });
  return { finished, cancel: vi.fn(() => reject()), finish: () => finish() };
}

/** A sky with the given layers; each layer's animate() records its call and returns a fake animation. */
function fakeSky(layers: readonly string[]) {
  const made: { readonly layer: string; readonly keyframes: Keyframe[]; readonly options: KeyframeAnimationOptions; readonly animation: FakeAnimation }[] = [];
  const sky = {
    querySelector(selector: string) {
      const layer = /data-hero-layer="([^"]+)"/.exec(selector)?.[1] ?? '';
      if (!layers.includes(layer)) return null;
      return {
        animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
          const animation = fakeAnimation();
          made.push({ layer, keyframes, options, animation });
          return animation;
        },
      };
    },
  };
  return { sky: sky as unknown as ParentNode, made };
}

async function settled(promise: Promise<void>): Promise<boolean> {
  let done = false;
  void promise.then(() => {
    done = true;
  });
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
  return done;
}

describe('warmSky', () => {
  it('holds each warmed layer’s frame for the warm-up, one animation per layer', () => {
    const { sky, made } = fakeSky(['day', 'night', 'tint', 'scrim-day', 'scrim-night', 'stars']);
    warmSky(sky, false);
    expect(made.map((entry) => entry.layer)).toEqual(skyWarmup(false).map((entry) => entry.layer));
    for (const { layer, frame } of skyWarmup(false)) {
      const entry = made.find((candidate) => candidate.layer === layer);
      expect(entry?.keyframes, layer).toEqual([frame, frame]);
      expect(entry?.options, layer).toEqual({ duration: WARMUP_MS, id: WARMUP_ID });
    }
  });

  it('skips a layer the sky does not have', () => {
    const { sky, made } = fakeSky(['day', 'night']);
    warmSky(sky, false);
    expect(made.map((entry) => entry.layer)).toEqual(['night']);
  });

  it('is done once every animation has finished', async () => {
    const { sky, made } = fakeSky(['day', 'tint', 'scrim-day']);
    const warmup = warmSky(sky, true);
    made[0]?.animation.finish();
    made[1]?.animation.finish();
    expect(await settled(warmup.done), 'one animation still runs').toBe(false);
    made[2]?.animation.finish();
    expect(await settled(warmup.done)).toBe(true);
  });

  it('cancel() cancels every animation, which ends it too', async () => {
    const { sky, made } = fakeSky(['night', 'tint', 'scrim-night']);
    const warmup = warmSky(sky, false);
    warmup.cancel();
    for (const entry of made) expect(entry.animation.cancel, entry.layer).toHaveBeenCalledTimes(1);
    expect(await settled(warmup.done)).toBe(true);
  });
});
