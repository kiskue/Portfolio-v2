import { coverMap, PAINTING, paintingToScreen, parseObjectPosition, pxPerUnit, unitsToPainting, type CoverMap } from '@/components/sections/home/dragon/cover';
import { DRAGON_UNITS, FLIGHT_DESKTOP, FLIGHT_PHONE, flightAt, headingTurnDeg, nextRoll, PHONE_SCALE, tiltDeg } from '@/components/sections/home/dragon/flight';
import { createImageRenderer, createWebGLContext, createWebGLRenderer, loseContext, type DragonRenderer, type WebGLFrames } from '@/components/sections/home/dragon/renderer';
import { markFlown, onThemeSwitch, openingFlightDue, openingStartAt, type FlightPlan } from '@/components/sections/home/dragon/schedule';
import { settle } from '@/components/sections/home/dragon/settled';
import { TAIL } from '@/components/sections/home/dragon/tail';
import { bobUnits, WING_LOOP_S, wingWeights } from '@/components/sections/home/dragon/wings';
import { getDisplaySnapshot, subscribeDisplay } from '@/lib/display-store';

/**
 * The painted dragon (design §3.3), and its chunk entry (§6.3). Home's island loads this module with
 * a dynamic import after the page has loaded and hydrated, and only when motion is allowed, so it is
 * its own size-capped chunk (tests/e2e/budgets.spec.ts). Nothing statically imports it at runtime.
 *
 * startScene adds the dragon to the hero's host and flies it out to sea: once per session about
 * 1.2 s after Home has painted (first paint, or the island's mount on a client-side visit), and
 * 1.6 s after each theme switch (schedule.ts). Its start waits for the page to settle (settled.ts:
 * first paint, the painting on show decoded, two frames, an idle moment) and then runs in short
 * tasks (renderer.ts; Ruling 40). A hidden page (a background tab, a prerender) has not been seen,
 * so an opening flight that has not started waits for it: it starts 1.2 s after the page is shown.
 * A flight stops when the tab hides, the hero leaves the screen or motion is reduced. Each frame
 * writes the element's transform, opacity, --haze and data-scale and draws once; the cover map
 * that turns design units into screen pixels is measured only when the host resizes. The expected
 * failures stay quiet: without a hardware WebGL context, or when its frames do not load or decode,
 * the dragon flies as stacked frames; when those fail to load, it stays away. Anything else is a
 * bug and is reported (reportError), never swallowed.
 */

/** Written to the dragon element at runtime, so the speed gate can tell this chunk from any other (a duplicate lives in tests/support/budgets.ts). */
export const SCENE_CHUNK_MARKER = 'gm-scene-dragon';

export interface SceneHandle {
  dispose(): void;
}

/** Below 768px: the phone path and a 0.6× dragon (design §3.5). */
const PHONE_QUERY = '(max-width: 47.99rem)';
/** A flight stops once less than this share of the hero is on screen. */
const MIN_VISIBLE = 0.1;
/** IntersectionObserver ratios carry rounding error at the threshold. */
const RATIO_EPSILON = 0.001;
/** The WebGL set: the tail-less body's up, level and down frames, and the tail. */
const WEBGL_FRAMES: WebGLFrames = ['/scene/dragon-up.webp', '/scene/dragon-level.webp', '/scene/dragon-down.webp', '/scene/dragon-tail.webp'];

/** An image, decoded off the main thread; rejects when it does not load or decode. */
function decoded(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  // Decorative, like the whole (aria-hidden) sky: the frames shown without WebGL.
  image.alt = '';
  image.src = src;
  return image.decode().then(() => image);
}

/** The decoded images, or null when one does not load or decode: the only failure the start expects. */
function decodedOrNull<T extends readonly HTMLImageElement[]>(images: Promise<T>): Promise<T | null> {
  return images.then(
    (all) => all,
    () => null,
  );
}

/** sessionStorage, or null where reading it throws (blocked site data). */
function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** First contentful paint on the performance.now() clock (0 when the entry is missing). */
function firstPaint(): number {
  return performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
}

/**
 * Starts the dragon in `host` (the hero's [data-dragon-host]). `mountedAt` (performance.now()) is when
 * Home's island mounted: after a client-side visit, first paint belongs to an earlier page.
 */
export function startScene(host: HTMLElement, mountedAt: number): SceneHandle {
  const dragon = document.createElement('div');
  dragon.className = 'hero-dragon';
  dragon.dataset.chunk = SCENE_CHUNK_MARKER;
  dragon.dataset.flight = 'idle';
  host.appendChild(dragon);
  const style = dragon.style;
  const phoneQuery = window.matchMedia(PHONE_QUERY);
  const sky = host.parentElement;
  // The day painting's crop (object-position) places the path; the night painting shares it.
  const painting = sky?.querySelector('img[data-hero-painting="day"]') ?? null;

  let disposed = false;
  /** A WebGL context held before a renderer owns it; lost on dispose. */
  let context: WebGLRenderingContext | null = null;
  let renderer: DragonRenderer | null = null;
  let plan: FlightPlan = { kind: 'idle' };
  /** The scheduled flight is the session's opening flight. */
  let opening = false;
  /** The opening flight waits for the hidden page to be shown; the plan stays idle meanwhile. */
  let openingPending = false;
  /** When a hidden page was last shown again (0 until then): Home was seen afresh at that moment. */
  let shownAt = 0;
  let timer = 0;
  let frame = 0;
  let startedAt = 0;
  let roll = 0;
  let inView = true;
  let dark = getDisplaySnapshot().resolved.dark;
  // Measured when the host resizes, never in a frame.
  let map: CoverMap | null = null;
  let path = FLIGHT_DESKTOP;
  /** Screen pixels per design unit, times the layout's dragon scale. */
  let unitPx = 1;
  // What the element shows, so unchanged values are not written again.
  let shownOpacity = '';
  let shownHaze = '';
  let shownScale = '';

  const measure = (width: number, height: number): void => {
    const position = parseObjectPosition(painting ? getComputedStyle(painting).objectPosition : '');
    map = coverMap({ width, height }, PAINTING, position);
    const phone = phoneQuery.matches;
    path = phone ? FLIGHT_PHONE : FLIGHT_DESKTOP;
    unitPx = pxPerUnit(map) * (phone ? PHONE_SCALE : 1);
    style.setProperty('--dragon-w', `${(DRAGON_UNITS * unitPx).toFixed(2)}px`);
  };

  /** The flight is over or cut short: hidden, idle, no frame left. */
  const land = (): void => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    plan = { kind: 'idle' };
    shownOpacity = '0';
    style.opacity = '0';
    dragon.dataset.flight = 'idle';
  };

  /** Stops a flight and drops a scheduled or pending one. */
  const abort = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    opening = false;
    openingPending = false;
    land();
  };

  /** Keeps the opening flight, unstarted, until the page is shown (onVisibility schedules it then). */
  const holdOpening = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    plan = { kind: 'idle' };
    opening = false;
    openingPending = true;
  };

  const tick = (now: number): void => {
    // A frame's timestamp can be a moment earlier than the start (design §7, Clock).
    const ms = Math.max(0, now - startedAt);
    const at = flightAt(path, ms);
    if (!at) {
      land();
      return;
    }
    frame = requestAnimationFrame(tick);
    if (!map || !renderer) return;
    const tm = (ms / 1000) % WING_LOOP_S;
    renderer.draw(wingWeights(tm), ms / 1000);
    const point = paintingToScreen(unitsToPainting(at), map);
    const bob = bobUnits(tm) * at.s * unitPx;
    roll = nextRoll(roll, headingTurnDeg(path, at.p));
    style.transform = `translate(${point.x.toFixed(2)}px, ${(point.y + bob).toFixed(2)}px) translate(-50%, -50%) rotate(${tiltDeg(roll, ms).toFixed(2)}deg) scale(${at.s.toFixed(4)})`;
    const opacity = at.opacity.toFixed(3);
    if (opacity !== shownOpacity) {
      shownOpacity = opacity;
      style.opacity = opacity;
    }
    const haze = at.haze.toFixed(3);
    if (haze !== shownHaze) {
      shownHaze = haze;
      style.setProperty('--haze', haze);
    }
    const scale = at.s.toFixed(2);
    if (scale !== shownScale) {
      shownScale = scale;
      dragon.dataset.scale = scale;
    }
  };

  const fly = (): void => {
    timer = 0;
    // A start that comes due while the hero is off screen or motion is reduced is dropped.
    if (!inView || getDisplaySnapshot().resolved.reduceMotion) {
      abort();
      return;
    }
    // So is one that comes due while the tab is hidden, except the opening flight: it waits to be seen.
    if (document.hidden) {
      if (opening) holdOpening();
      else abort();
      return;
    }
    if (opening) {
      opening = false;
      markFlown(session());
    }
    plan = { kind: 'flying' };
    dragon.dataset.flight = 'flying';
    roll = 0;
    startedAt = performance.now();
    frame = requestAnimationFrame(tick);
  };

  /** Sets the timer for a scheduled flight, once the dragon is ready to fly. */
  const arm = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    if (plan.kind === 'scheduled' && renderer) timer = window.setTimeout(fly, Math.max(0, plan.at - performance.now()));
  };

  const ready = (made: DragonRenderer, kind: 'webgl' | 'images', nodes: readonly HTMLElement[]): void => {
    renderer = made;
    dragon.append(...nodes);
    dragon.dataset.renderer = kind;
    if (plan.kind === 'idle' && openingFlightDue(session())) {
      if (document.hidden) {
        // A background tab or a prerender has not been seen yet: the opening flight waits for it.
        openingPending = true;
      } else {
        // Home painted at first paint, or when the island mounted after a client-side visit, or was
        // seen afresh when the page was shown again: the start waits for a hidden page to be shown
        // (settled.ts), so the opening it has not started is timed from then, not dropped.
        const at = openingStartAt(Math.max(firstPaint(), mountedAt, shownAt), performance.now());
        if (at !== null) {
          plan = { kind: 'scheduled', at };
          opening = true;
        }
      }
    }
    arm();
  };

  /** Disposed, or motion turned off: the start goes no further. */
  const stopped = (): boolean => disposed || getDisplaySnapshot().resolved.reduceMotion;

  // Nothing is asked of the GPU or the network before the page has settled; the painting waited
  // for is the one the theme shows when the gate gets to it.
  const settling = settle(() => sky?.querySelector<HTMLImageElement>(`img[data-hero-painting="${getDisplaySnapshot().resolved.dark ? 'night' : 'day'}"]`));

  // Then WebGL first: a hardware context on the still-detached canvas (in a task of its own), then
  // its frames and programs in short tasks (renderer.ts). Without the context, or when its frames
  // or programs fail, the three full frames fly as stacked images. Only a frame that does not load
  // or decode is expected to fail.
  const start = async (): Promise<void> => {
    await settling.settled;
    if (stopped()) return;
    const canvas = document.createElement('canvas');
    canvas.width = TAIL.canvasWidth;
    canvas.height = TAIL.canvasHeight;
    context = createWebGLContext(canvas);
    if (context) {
      const webgl = await createWebGLRenderer(context, WEBGL_FRAMES, stopped);
      // The renderer owns the context now; without one, the build has lost it.
      context = null;
      if (stopped()) {
        webgl?.dispose();
        return;
      }
      if (webgl) {
        ready(webgl, 'webgl', [canvas]);
        return;
      }
    }
    const full = Promise.all([decoded('/scene/dragon-full-up.webp'), decoded('/scene/dragon-full-level.webp'), decoded('/scene/dragon-full-down.webp')]);
    const frames = await decodedOrNull(full);
    if (frames && !stopped()) ready(createImageRenderer(frames), 'images', frames);
  };
  start().catch((error: unknown) => reportError(error));

  const unsubscribe = subscribeDisplay(() => {
    const { dark: next, reduceMotion } = getDisplaySnapshot().resolved;
    const changed = next !== dark;
    dark = next;
    if (reduceMotion) {
      abort();
      return;
    }
    if (!changed) return;
    plan = onThemeSwitch(plan, performance.now());
    // A switch before the opening flight (scheduled, or waiting for the page to be shown) replaces it.
    if (plan.kind === 'scheduled') {
      opening = false;
      openingPending = false;
    }
    arm();
  });

  const onVisibility = (): void => {
    if (document.hidden) {
      // A flight in progress stops and a switch's scheduled flight is dropped. The opening flight is
      // kept: if it comes due while the page is still hidden, fly() holds it until the page returns.
      if (!opening && !openingPending) abort();
      return;
    }
    shownAt = performance.now();
    if (!openingPending) return;
    // Shown at last: Home has just been seen, so the opening flight starts 1.2 s from now.
    openingPending = false;
    const now = performance.now();
    const at = openingStartAt(now, now);
    if (at === null) return;
    plan = { kind: 'scheduled', at };
    opening = true;
    arm();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const watch = new IntersectionObserver(
    (entries) => {
      const entry = entries.at(-1);
      if (!entry) return;
      inView = entry.intersectionRatio >= MIN_VISIBLE - RATIO_EPSILON;
      if (!inView) abort();
    },
    { threshold: [0, MIN_VISIBLE] },
  );
  watch.observe(host);

  const resize = new ResizeObserver((entries) => {
    const box = entries.at(-1)?.contentRect;
    if (box && box.width > 0 && box.height > 0) measure(box.width, box.height);
  });
  resize.observe(host);

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      settling.cancel();
      abort();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      watch.disconnect();
      resize.disconnect();
      if (context) loseContext(context);
      context = null;
      renderer?.dispose();
      renderer = null;
      dragon.remove();
    },
  };
}
