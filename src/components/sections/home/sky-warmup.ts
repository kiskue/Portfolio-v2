import { skyChange, type SkyLayer } from '@/components/sections/home/sky';

/*
 * The sky's warm-up (smooth-sky follow-up). The first time Chrome draws the sky's layers with
 * their effects (the soft-light tint, the warm filter, the scrims and their masks, the other
 * painting, the stars), its GPU process compiles a shader program for each of them, and decodes
 * the other painting. On a cold GPU cache (a first visit) that took 100-270 ms of the GPU's main
 * thread in the first 0.4 s of the first sunset: two or three frames of 55-130 ms.
 *
 * So once the page has settled, before any theme change, the layers the next change fades in are
 * drawn for 0.5 s at opacity 0.002, the night painting with the warm filter's own functions at
 * 0.1%. Values of exactly 0, or an identity filter, would be skipped by the compositor and compile
 * nothing. A layer at 0.002 adds at most about half a level of 255; with the rounding of the extra
 * blends and the gradients' dither, no channel of the hero moved by more than 3 levels (measured on
 * the GPU at three sizes, in both themes).
 *
 * Nothing on show is touched, and nothing drawn under the painting on show: a layer the compositor
 * draws on its own is resampled differently from the page around it, and compositing a layer under
 * the painting on show puts that painting on a layer of its own too. Its edges then moved by up to
 * 30-51 levels (the day painting under the night one, before a sunrise), so before a sunrise only
 * the tint and the day scrim are warmed, and the sunrise compiles the rest itself. Nothing is warmed
 * while a change plays or is about to (skyBusy).
 *
 * The scene chunk runs it (dragon/scene.ts), only in Chromium with a hardware WebGL context, so never
 * on a software renderer (there it would only cost drawing time) or under reduced motion; a theme
 * change cancels it.
 */

/** The opacity the warm-up gives a layer the next change fades in. */
export const TRACE_OPACITY = 0.002;

/** WARM_FILTER's functions (sky.ts), in its order, each 0.1% from no change. */
export const WARM_TRACE = 'brightness(.999) saturate(1.001) sepia(.001)';

/** How long the warm-up holds: long enough to be drawn while the GPU is busy compiling. */
export const WARMUP_MS = 500;

/** The id the warm-up's animations carry (Animation.id). */
export const WARMUP_ID = 'sky-warmup';

/**
 * The sky's layers from the bottom up (hero.css, home-hero.tsx): the two paintings (no z-index, in
 * DOM order), then the z-index 1 layers in DOM order.
 */
export const SKY_PAINT_ORDER = ['day', 'night', 'tint', 'stars', 'scrim-day', 'scrim-night'] as const satisfies readonly SkyLayer[];

export interface WarmupLayer {
  readonly layer: SkyLayer;
  /** The state held for the warm-up. */
  readonly frame: Keyframe;
}

/**
 * What the warm-up draws for the change away from the theme `dark`: each layer it fades in that is
 * drawn above the painting on show, once.
 */
export function skyWarmup(dark: boolean): readonly WarmupLayer[] {
  const change = skyChange(dark, !dark);
  const shown = new Set(change.filter(({ keyframes }) => keyframes[0]?.opacity === 1).map(({ layer }) => layer));
  const filtered = change.some(({ keyframes }) => typeof keyframes[0]?.filter === 'string');
  const floor = SKY_PAINT_ORDER.indexOf(dark ? 'night' : 'day');
  const warmed = new Map<SkyLayer, Keyframe>();
  for (const { layer } of change) {
    if (shown.has(layer) || warmed.has(layer) || SKY_PAINT_ORDER.indexOf(layer) <= floor) continue;
    const frame: Keyframe = { opacity: TRACE_OPACITY };
    if (filtered && layer === 'night') frame.filter = WARM_TRACE;
    // The stars are display: none until .dark (hero.css).
    if (layer === 'stars') frame.display = 'block';
    warmed.set(layer, frame);
  }
  return [...warmed].map(([layer, frame]) => ({ layer, frame }));
}

/**
 * A change is playing on the sky, or about to: a layer has an animation of its own other than the
 * warm-up's (its children, the stars' lines, do not count), or the island holds a layer at its
 * start (its inline pins). The stars' layer is an <svg>.
 */
export function skyBusy(sky: ParentNode): boolean {
  return [...sky.querySelectorAll<HTMLElement | SVGElement>('[data-hero-layer]')].some(
    (layer) => layer.getAnimations().some(({ id }) => id !== WARMUP_ID) || layer.style.opacity !== '' || layer.style.filter !== '',
  );
}

export interface Warmup {
  /** Resolves once the warm-up has ended or been cancelled. */
  readonly done: Promise<void>;
  cancel(): void;
}

/** Runs the warm-up on the layers in `sky` for the change away from the theme `dark`. */
export function warmSky(sky: ParentNode, dark: boolean): Warmup {
  const animations: Animation[] = [];
  for (const { layer, frame } of skyWarmup(dark)) {
    const element = sky.querySelector(`[data-hero-layer="${layer}"]`);
    if (element) animations.push(element.animate([frame, frame], { duration: WARMUP_MS, id: WARMUP_ID }));
  }
  return {
    // A cancelled animation rejects `finished`: that ends the warm-up too.
    done: Promise.all(animations.map((animation) => animation.finished.then(noop, noop))).then(noop),
    cancel(): void {
      for (const animation of animations) animation.cancel();
    },
  };
}

function noop(): void {}
