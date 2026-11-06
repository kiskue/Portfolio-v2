import { coverMap, PAINTING, paintingToScreen, parseObjectPosition, pxPerUnit, unitsToPainting, type CoverMap } from '@/components/sections/home/dragon/cover';
import { DRAGON_UNITS, FLIGHT_DESKTOP, FLIGHT_PHONE, flightAt, headingTurnDeg, nextRoll, PHONE_SCALE, tiltDeg, type FlightFrame } from '@/components/sections/home/dragon/flight';
import { createImageRenderer, createWebGLContext, createWebGLRenderer, loseContext, type DragonRenderer, type WebGLFrames } from '@/components/sections/home/dragon/renderer';
import { markFlown, onThemeSwitch, openingFlightDue, openingStartAt, type FlightPlan } from '@/components/sections/home/dragon/schedule';
import { settle } from '@/components/sections/home/dragon/settled';
import { TAIL } from '@/components/sections/home/dragon/tail';
import { bobUnits, WING_LOOP_S, wingWeights } from '@/components/sections/home/dragon/wings';
import { skyBusy, TRACE_OPACITY, WARMUP_MS, warmSky, type Warmup } from '@/components/sections/home/sky-warmup';
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
 *
 * Once the page has settled, in Chromium with a hardware WebGL context and until a theme change, it
 * also does the GPU's first-use work ahead of time, at a strength no screen shows: it warms the
 * sky's next change (sky-warmup.ts), and once its renderer is built it draws the dragon at poses
 * along its path in the themes' filters (warmDragon); neither runs over a change the sky is playing,
 * and no step of theirs starts while the visitor scrolls or has just pointed, typed or touched.
 * With an opening flight due, nothing of that comes before the dragon is ready, so it is ready as
 * soon as it is built, as before: then the sky (if its 0.5 s fits) and the other theme's filter are
 * warmed while that fits before the flight's slot, and the rest once that flight has flown to its
 * end. Without one, the sky is warmed while the dragon is built, and it is ready once both warm-ups
 * are over. A theme change, reduced motion, a flight, a hidden page or dispose stops them; what they
 * did not reach then stays unwarmed (a flight cut short, or a page hidden with no opening flight,
 * leaves it to the first change or flight to compile, as before the warm-ups).
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
/** The dragon's warm-up poses, in ms of its flight: every 2 s, and one near the end (the blur sizes it flies through). */
const WARM_POSES_MS = [0, 2000, 4000, 6000, 8000, 10_000, 12_000, 13_000];
/** Each pose is held for two frames, or this long where the page draws none. */
const WARM_POSE_MAX_MS = 250;
/** What a pose takes at 60 Hz, with room: none is started that would not end before its deadline. */
const WARM_POSE_MS = 40;
/** The warm-up ends this long before a flight's slot, so the flight's first frame finds the dragon as before. */
const WARM_SLOT_MARGIN_MS = 50;
/** The warm-ups were measured in Chrome, against Skia's program compiles: Chromium only (Ruling 48). */
const CHROMIUM = typeof navigator !== 'undefined' && 'userAgentData' in navigator;
/**
 * No warm-up step starts while the visitor scrolls, or this soon after a pointer, key, wheel or touch
 * event (Ruling 55): on a cold cache a step's compiles took frames from a scroll made at load.
 */
const QUIET_MS = 200;
/** The events that hold the warm-ups back (a scroll in progress fires scroll events every frame; pointerup covers a long press). */
const INPUTS = ['pointerdown', 'pointerup', 'keydown', 'wheel', 'touchstart', 'scroll'];
const PASSIVE: AddEventListenerOptions = { capture: true, passive: true };

/** One warm-up pose: `ms` into the flight, in the other theme's filter or the one on show. */
interface WarmPose {
  readonly other: boolean;
  readonly ms: number;
}

/** The poses along the path, in the other theme's filter or the one on show. */
function posesIn(other: boolean): WarmPose[] {
  return WARM_POSES_MS.map((ms) => ({ other, ms }));
}

/** Resolves after two animation frames, or after `ms` where the page draws none (then the frames are cancelled). */
function twoFrames(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let frame = 0;
    const timer = window.setTimeout(() => {
      cancelAnimationFrame(frame);
      resolve();
    }, ms);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        window.clearTimeout(timer);
        resolve();
      });
    });
  });
}

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
  /** The sky's warm-up, once started. */
  let warmup: Warmup | null = null;
  /** The theme has changed since the scene started: that change did the warm-up's work. */
  let switched = false;
  /** The host's size, as last measured. */
  let hostWidth = 0;
  let hostHeight = 0;
  /** The dragon's warm-up poses not drawn yet, in order. */
  let poses: readonly WarmPose[] = [];
  /** Bumped to stop a dragon warm-up under way before its next pose. */
  let warmRun = 0;
  /** A dragon warm-up is drawing (the dragon shows a pose at opacity 0.002). */
  let warming = false;
  /** The warm-ups may run: Chromium, with a hardware WebGL context (known once the page has settled). */
  let warmable = false;
  /** When the visitor last scrolled, pointed, typed or touched. */
  let inputAt = Number.NEGATIVE_INFINITY;
  /** While the sky's warm-up runs: cancels it, to be tried again once the visitor leaves the page alone. */
  let yieldSky: (() => void) | null = null;
  // A step under way yields too: the frames it has not drawn yet compile nothing.
  const onInput = (): void => {
    inputAt = performance.now();
    yieldSky?.();
    if (warming) unwarm();
  };
  /** How long a warm-up step must still wait for the visitor to leave the page alone (none when 0 or less). */
  const quietIn = (): number => inputAt + QUIET_MS - performance.now();
  if (CHROMIUM) for (const type of INPUTS) window.addEventListener(type, onInput, PASSIVE);

  const measure = (width: number, height: number): void => {
    hostWidth = width;
    hostHeight = height;
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

  /** The dragon as a flight expects it after a warm-up pose: hidden, its own theme's filter, no warm-up haze. */
  const unwarm = (): void => {
    warming = false;
    dragon.removeAttribute('data-warm');
    style.removeProperty('--haze');
    shownHaze = '';
    shownOpacity = '0';
    style.opacity = '0';
  };

  /** Stops a dragon warm-up under way before its next pose, and hides the dragon again at once. */
  const stopWarm = (): void => {
    warmRun += 1;
    if (warming) unwarm();
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
      // What did not fit before the opening flight's slot, now the dragon is idle.
      if (poses.length > 0 || (warmable && !warmup)) window.setTimeout(warmLeft, 0);
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
    // A warm-up still drawing gives the dragon back before the flight's first frame.
    stopWarm();
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

  /** Puts the renderer's nodes in the dragon (once: a warm-up may have put them there already). */
  const attach = (nodes: readonly HTMLElement[]): void => {
    for (const node of nodes) if (node.parentNode !== dragon) dragon.append(node);
  };

  const ready = (made: DragonRenderer, kind: 'webgl' | 'images', nodes: readonly HTMLElement[]): void => {
    renderer = made;
    attach(nodes);
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

  /** Shows the dragon at one warm-up pose, in the middle of the hero, at opacity 0.002. */
  const showPose = (pose: WarmPose, at: FlightFrame): void => {
    warming = true;
    dragon.toggleAttribute('data-warm', pose.other);
    style.transform = `translate(${(hostWidth / 2).toFixed(2)}px, ${(hostHeight / 2).toFixed(2)}px) translate(-50%, -50%) rotate(${tiltDeg(0, pose.ms).toFixed(2)}deg) scale(${at.s.toFixed(4)})`;
    style.setProperty('--haze', at.haze.toFixed(3));
    style.opacity = String(TRACE_OPACITY);
  };

  /**
   * The dragon's own warm-up (smooth-sky follow-up). Its CSS filter (the haze's blur, and at night the
   * moonlit drop-shadow) is drawn by GPU programs compiled the first time each is used, at each blur
   * size the flight's scale gives: on a cold cache the first night flight compiled four in its first
   * frame (a 50-66 ms frame) and more as it flew. So the dragon is drawn at the poses left (scale,
   * tilt and haze along its path; data-warm asks for the other theme's filter, hero.css), two frames
   * each, until `deadline`, a theme change, a change the sky plays (one the scene never heard, too),
   * a flight, a hidden page or the end of the scene; then it is hidden again. The poses it did not
   * reach are drawn only by a later warm-up, if one comes (after the opening flight lands).
   */
  const warmDragon = async (made: DragonRenderer, deadline: number): Promise<void> => {
    if (!map || poses.length === 0) return;
    const run = ++warmRun;
    try {
      for (;;) {
        const [pose, ...rest] = poses;
        if (!pose || run !== warmRun || switched || stopped() || document.hidden || plan.kind === 'flying' || (sky !== null && skyBusy(sky))) return;
        const wait = quietIn();
        if (wait > 0) {
          // The visitor is busy: hidden meanwhile, and every stop is checked again before the next pose.
          if (warming) unwarm();
          await new Promise((resolve) => window.setTimeout(resolve, wait));
          continue;
        }
        if (performance.now() + WARM_POSE_MS > deadline) return;
        poses = rest;
        const at = flightAt(path, pose.ms);
        if (!at) continue;
        // The dragon's frame, drawn once, when its first pose is about to show it.
        if (!warming) made.draw(wingWeights(0), 0);
        showPose(pose, at);
        await twoFrames(WARM_POSE_MAX_MS);
      }
    } finally {
      // A warm-up stopped from outside (stopWarm) has been put back already.
      if (run === warmRun && warming) unwarm();
    }
  };

  /**
   * Starts the sky's warm-up, once, unless the theme has changed, a change is playing (skyBusy) or it
   * no longer `fits`; while the visitor is busy it tries again once they have left the page alone.
   */
  const warmSkyNow = (fits = (): boolean => true): void => {
    if (!warmable || warmup || switched || !sky || stopped() || skyBusy(sky) || !fits()) return;
    const wait = quietIn();
    if (wait > 0) {
      window.setTimeout(() => warmSkyNow(fits), wait);
      return;
    }
    const run = (warmup = warmSky(sky, getDisplaySnapshot().resolved.dark));
    yieldSky = () => {
      yieldSky = null;
      warmup = null;
      run.cancel();
      warmSkyNow(fits);
    };
    void run.done.then(() => {
      if (warmup === run) yieldSky = null;
    });
  };

  /** Warms what fits before the scheduled flight (the opening flight's slot); the rest waits. */
  const warmBeforeFlight = (): void => {
    if (plan.kind !== 'scheduled' || !renderer) return;
    const deadline = plan.at - WARM_SLOT_MARGIN_MS;
    warmSkyNow(() => plan.kind === 'scheduled' && performance.now() + WARMUP_MS <= deadline);
    if (poses.length > 0) warmDragon(renderer, deadline).catch((error: unknown) => reportError(error));
  };

  /** Warms what is left, now the dragon is idle (after the opening flight, or with none coming). */
  const warmLeft = (): void => {
    if (!renderer || plan.kind !== 'idle') return;
    warmSkyNow();
    if (poses.length > 0) warmDragon(renderer, Number.POSITIVE_INFINITY).catch((error: unknown) => reportError(error));
  };

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
    // The warm-ups: in Chromium with a hardware context only. Without one there is no GPU to warm,
    // and they would only cost drawing time. With an opening flight due, the sky's waits until the
    // dragon is ready (its GPU work would slow the dragon's build). Without one it starts now, after
    // asking for the context (that request would wait behind the GPU work it asks for), in the same
    // task, so its programs compile while the dragon's frames load.
    warmable = context !== null && CHROMIUM;
    if (!(plan.kind === 'idle' && openingFlightDue(session()))) warmSkyNow();
    const warmed = (): Promise<void> => warmup?.done ?? Promise.resolve();
    let made: DragonRenderer | null = null;
    let kind: 'webgl' | 'images' = 'webgl';
    let nodes: readonly HTMLElement[] = [canvas];
    if (context) {
      made = await createWebGLRenderer(context, WEBGL_FRAMES, stopped);
      // The renderer owns the context now; without one, the build has lost it.
      context = null;
      if (stopped()) {
        made?.dispose();
        return;
      }
    }
    if (!made) {
      const full = Promise.all([decoded('/scene/dragon-full-up.webp'), decoded('/scene/dragon-full-level.webp'), decoded('/scene/dragon-full-down.webp')]);
      const frames = await decodedOrNull(full);
      if (!frames || stopped()) return;
      made = createImageRenderer(frames);
      kind = 'images';
      nodes = frames;
    }
    const dragonWarm = warmable && kind === 'webgl' && !switched;
    if (plan.kind === 'idle' && openingFlightDue(session())) {
      // An opening flight is due: ready at once, as before the warm-ups. The sky and the other
      // theme's filter are warmed while that fits before the flight's slot, and the rest once the
      // flight has flown to its end (the flight itself draws the theme on show). With no flight
      // coming after all (too late for one), at once; with a hidden page, once it is shown (onVisibility).
      if (dragonWarm) poses = posesIn(true);
      ready(made, kind, nodes);
      // Each checks the plan ready() made: a scheduled flight, or none.
      if (!openingPending) {
        warmBeforeFlight();
        warmLeft();
      }
      return;
    }
    // No opening flight: ready once the warm-ups are over (the other theme's filter first).
    if (dragonWarm) {
      poses = [...posesIn(true), ...posesIn(false)];
      attach(nodes);
      await Promise.all([warmed(), warmDragon(made, Number.POSITIVE_INFINITY)]);
    } else {
      await warmed();
    }
    if (stopped()) {
      made.dispose();
      return;
    }
    ready(made, kind, nodes);
  };
  start().catch((error: unknown) => reportError(error));

  const unsubscribe = subscribeDisplay(() => {
    const { dark: next, reduceMotion } = getDisplaySnapshot().resolved;
    const changed = next !== dark;
    dark = next;
    if (reduceMotion) {
      warmup?.cancel();
      stopWarm();
      abort();
      return;
    }
    if (!changed) return;
    // The change does the warm-ups' work itself; the sky island plays it. No pose is left to draw.
    switched = true;
    poses = [];
    warmup?.cancel();
    stopWarm();
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
      // A dragon warm-up draws nothing now: it stops. The poses it did not reach wait for the warm-up
      // before or after the opening flight; with none coming (no opening flight), they stay unwarmed.
      stopWarm();
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
    warmBeforeFlight();
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
      warmup?.cancel();
      stopWarm();
      abort();
      unsubscribe();
      for (const type of INPUTS) window.removeEventListener(type, onInput, PASSIVE);
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
