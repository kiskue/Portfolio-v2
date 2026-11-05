import { skyChange, type SkyLayer } from '@/components/sections/home/sky';

/*
 * The sky's warm-up (smooth-sky follow-up). The first time Chrome draws the sky's layers with
 * their effects (the soft-light tint, the warm filter, the scrims and their masks, the other
 * painting, the stars), its GPU process compiles a shader program for each of them, and decodes
 * the other painting. On a cold GPU cache (a first visit) that took 100-270 ms of the GPU's main
 * thread in the first 0.4 s of the first sunset: two or three frames of 55-130 ms.
 *
 * So once the page has settled, before any theme change, the layers the next change fades in are
 * drawn for 0.5 s at opacity 0.002, the painting with the warm filter's own functions at 0.1%: no
 * pixel moves by half a level of 255. Values of exactly 0, or an identity filter, would be skipped
 * by the compositor and compile nothing. Nothing on show is touched: a layer the compositor draws
 * on its own is resampled differently from the page around it, so the painting on show would
 * change at its edges (up to 40 levels on a tablet). The scene chunk runs it (dragon/scene.ts) when
 * it has a hardware WebGL context, so never on a software renderer (there it would only cost
 * drawing time) or under reduced motion; a theme change cancels it.
 */

/** The opacity the warm-up gives a layer the next change fades in. */
export const TRACE_OPACITY = 0.002;

/** WARM_FILTER's functions (sky.ts), in its order, each 0.1% from no change. */
export const WARM_TRACE = 'brightness(.999) saturate(1.001) sepia(.001)';

/** How long the warm-up holds: long enough to be drawn while the GPU is busy compiling. */
export const WARMUP_MS = 500;

/** The id the warm-up's animations carry (Animation.id). */
export const WARMUP_ID = 'sky-warmup';

export interface WarmupLayer {
  readonly layer: SkyLayer;
  /** The state held for the warm-up. */
  readonly frame: Keyframe;
}

/** What the warm-up draws for the change away from the theme `dark`: each layer it fades in, once. */
export function skyWarmup(dark: boolean): readonly WarmupLayer[] {
  const change = skyChange(dark, !dark);
  const shown = new Set(change.filter(({ keyframes }) => keyframes[0]?.opacity === 1).map(({ layer }) => layer));
  const filtered = change.some(({ keyframes }) => typeof keyframes[0]?.filter === 'string');
  const painting: SkyLayer = dark ? 'day' : 'night';
  const warmed = new Map<SkyLayer, Keyframe>();
  for (const { layer } of change) {
    if (shown.has(layer) || warmed.has(layer)) continue;
    const frame: Keyframe = { opacity: TRACE_OPACITY };
    if (filtered && layer === painting) frame.filter = WARM_TRACE;
    // The stars are display: none until .dark (hero.css).
    if (layer === 'stars') frame.display = 'block';
    warmed.set(layer, frame);
  }
  return [...warmed].map(([layer, frame]) => ({ layer, frame }));
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
