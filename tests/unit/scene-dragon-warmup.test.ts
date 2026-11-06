import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOWN_KEY, OPENING_DELAY_MS, SWITCH_DELAY_MS } from '@/components/sections/home/dragon/schedule';
import { FLIGHT_MS } from '@/components/sections/home/dragon/flight';
import { TRACE_OPACITY, WARMUP_ID } from '@/components/sections/home/sky-warmup';

/*
 * The dragon's warm-up in startScene (dragon/scene.ts; smooth-sky follow-up), with fakes for the
 * browser: the start gate, the WebGL build, the display store, the clock, frames and timers. In
 * Chromium with a hardware context the scene draws the dragon at poses along its path at opacity
 * 0.002 before its flights need them. It never draws over a change the sky is playing (one the
 * scene never heard, too), its first draw comes only once a pose will be shown, and after a theme
 * switch (which does that work itself) nothing is drawn on the hidden dragon again.
 */

const display = vi.hoisted(() => ({ dark: false, reduceMotion: false, listeners: new Set<() => void>() }));
const build = vi.hoisted(() => ({ open: (): void => {}, done: (renderer: unknown): void => void renderer }));

vi.mock('@/lib/display-store', () => ({
  getDisplaySnapshot: () => ({ resolved: { dark: display.dark, reduceMotion: display.reduceMotion } }),
  subscribeDisplay: (listener: () => void) => {
    display.listeners.add(listener);
    return () => display.listeners.delete(listener);
  },
}));

vi.mock('@/components/sections/home/dragon/settled', () => ({
  settle: () => ({
    settled: new Promise<void>((resolve) => {
      build.open = resolve;
    }),
    cancel: () => {},
  }),
}));

vi.mock('@/components/sections/home/dragon/renderer', () => ({
  createWebGLContext: () => ({}),
  createWebGLRenderer: () =>
    new Promise((resolve) => {
      build.done = resolve;
    }),
  createImageRenderer: () => {
    throw new Error('the WebGL path only');
  },
  loseContext: () => {},
}));

/** First contentful paint on the fake clock. */
const FCP = 100;

class FakeStyle {
  readonly opacities: string[] = [];
  transform = '';
  private shown = '';
  private readonly custom = new Map<string, string>();
  get opacity(): string {
    return this.shown;
  }
  set opacity(value: string) {
    this.shown = value;
    this.opacities.push(value);
  }
  setProperty(name: string, value: string): void {
    this.custom.set(name, value);
  }
  removeProperty(name: string): string {
    const value = this.custom.get(name) ?? '';
    this.custom.delete(name);
    return value;
  }
  getPropertyValue(name: string): string {
    return this.custom.get(name) ?? '';
  }
}

class FakeElement {
  className = '';
  width = 0;
  height = 0;
  readonly dataset: Record<string, string> = {};
  readonly style = new FakeStyle();
  readonly children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  parentElement: unknown = null;
  private readonly attributes = new Set<string>();
  appendChild(child: FakeElement): FakeElement {
    this.append(child);
    return child;
  }
  append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
    }
  }
  remove(): void {
    this.parentNode = null;
  }
  toggleAttribute(name: string, force?: boolean): boolean {
    const on = force ?? !this.attributes.has(name);
    if (on) this.attributes.add(name);
    else this.attributes.delete(name);
    return on;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
}

interface FakeAnimation {
  readonly id: string;
  readonly finished: Promise<void>;
  cancel(): void;
}

/** One of the sky's layers: its own animations (the warm-up's and the island's), and the island's inline pins. */
class FakeLayer {
  readonly style = { opacity: '', filter: '' };
  animations: FakeAnimation[] = [];
  getAnimations(): FakeAnimation[] {
    return this.animations;
  }
  /** The warm-up's animation: it ends after its duration on the fake clock, or when cancelled. */
  animate(keyframes: Keyframe[], options: KeyframeAnimationOptions): FakeAnimation {
    void keyframes;
    let finish = (): void => {};
    let reject = (): void => {};
    const finished = new Promise<void>((resolve, fail) => {
      finish = resolve;
      reject = () => fail(new DOMException('cancelled', 'AbortError'));
    });
    const drop = (): void => {
      this.animations = this.animations.filter((entry) => entry !== animation);
    };
    ids += 1;
    const timer = ids;
    timers.set(timer, {
      at: clock + Number(options.duration ?? 0),
      run: () => {
        drop();
        finish();
      },
    });
    const animation: FakeAnimation = {
      id: options.id ?? '',
      finished,
      cancel: () => {
        timers.delete(timer);
        drop();
        reject();
      },
    };
    this.animations.push(animation);
    return animation;
  }
  /** A change the island plays: an animation of the layer's own, with no id. */
  play(): void {
    this.animations.push({ id: '', finished: new Promise<void>(() => {}), cancel: () => {} });
  }
}

const LAYERS = ['day', 'night', 'tint', 'stars', 'scrim-day', 'scrim-night'] as const;

let clock = 0;
let ids = 0;
let timers = new Map<number, { readonly at: number; readonly run: () => void }>();
let frames = new Map<number, FrameRequestCallback>();
let layers = new Map<string, FakeLayer>();
let resizes: ((entries: { contentRect: { width: number; height: number } }[]) => void)[] = [];
let stored = new Map<string, string>();
let reported: ReturnType<typeof vi.fn>;

/** Lets pending promise callbacks run (microtasks only). */
async function microtasks(): Promise<void> {
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

/** Moves the clock on by `ms`, running each timer that comes due, in order. */
async function advance(ms: number): Promise<void> {
  const end = clock + ms;
  for (;;) {
    const next = [...timers.entries()].sort(([, a], [, b]) => a.at - b.at)[0];
    if (!next || next[1].at > end) break;
    timers.delete(next[0]);
    clock = Math.max(clock, next[1].at);
    next[1].run();
    await microtasks();
  }
  clock = end;
  await microtasks();
}

/** One animation frame, 16 ms on. */
async function frame(): Promise<void> {
  clock += 16;
  const due = [...frames.values()];
  frames.clear();
  for (const callback of due) callback(clock);
  await microtasks();
}

function install({ opening }: { readonly opening: boolean }): void {
  clock = 0;
  ids = 0;
  timers = new Map();
  frames = new Map();
  layers = new Map(LAYERS.map((name) => [name, new FakeLayer()]));
  resizes = [];
  stored = new Map(opening ? [] : [[FLOWN_KEY, '1']]);
  display.dark = false;
  display.reduceMotion = false;
  display.listeners.clear();
  reported = vi.fn();
  const painting = {};
  const sky = {
    querySelector: (selector: string) => {
      if (selector === 'img[data-hero-painting="day"]') return painting;
      return layers.get(/data-hero-layer="([^"]+)"/.exec(selector)?.[1] ?? '') ?? null;
    },
    querySelectorAll: (selector: string) => (selector === '[data-hero-layer]' ? [...layers.values()] : []),
  };
  vi.stubGlobal('document', {
    hidden: false,
    createElement: () => new FakeElement(),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
    setTimeout: (run: () => void, ms = 0) => {
      ids += 1;
      timers.set(ids, { at: clock + ms, run });
      return ids;
    },
    clearTimeout: (id: number) => timers.delete(id),
    sessionStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) },
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    ids += 1;
    frames.set(ids, callback);
    return ids;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('getComputedStyle', () => ({ objectPosition: '70% 40%' }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: (entries: { contentRect: { width: number; height: number } }[]) => void) {
        resizes.push(callback);
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal('reportError', reported);
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(performance, 'getEntriesByName').mockImplementation(
    (name: string) => (name === 'first-contentful-paint' ? [{ startTime: FCP }] : []) as unknown as PerformanceEntryList,
  );
  host = new FakeElement();
  host.parentElement = sky;
}

let host = new FakeElement();
let startScene: typeof import('@/components/sections/home/dragon/scene').startScene;

beforeAll(async () => {
  // The warm-ups run only in Chromium (Ruling 48): the scene reads navigator.userAgentData when it loads.
  vi.stubGlobal('navigator', { userAgentData: { brands: [] } });
  ({ startScene } = await import('@/components/sections/home/dragon/scene'));
});

beforeEach(() => {
  vi.stubGlobal('navigator', { userAgentData: { brands: [] } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Started {
  readonly dragon: FakeElement;
  readonly draw: ReturnType<typeof vi.fn>;
  readonly dispose: () => void;
}

/** Starts the scene, measures the hero, opens the gate at `gateAt` and finishes the build at `builtAt`. */
async function start({ gateAt, builtAt }: { readonly gateAt: number; readonly builtAt: number }): Promise<Started> {
  const handle = startScene(host as unknown as HTMLElement, 0);
  const dragon = host.children[0] as FakeElement;
  for (const resize of resizes) resize([{ contentRect: { width: 1183, height: 722 } }]);
  await advance(gateAt - clock);
  build.open();
  await microtasks();
  await advance(builtAt - clock);
  const draw = vi.fn();
  build.done({ draw, dispose: vi.fn() });
  await microtasks();
  return { dragon, draw, dispose: () => handle.dispose() };
}

/** How many warm-up poses the dragon has shown (opacity 0.002). */
function traces(dragon: FakeElement): number {
  return dragon.style.opacities.filter((value) => value === String(TRACE_OPACITY)).length;
}

/** The dragon showed a warm-up pose. */
function posed(dragon: FakeElement): boolean {
  return traces(dragon) > 0;
}

/** Runs the poses to the end, two frames each. */
async function pose(times: number): Promise<void> {
  for (let turn = 0; turn < times * 2; turn += 1) await frame();
}

/** Switches the theme, as the display store does (the sky island hears it too). */
function switchTheme(): void {
  display.dark = !display.dark;
  for (const listener of [...display.listeners]) listener();
}

describe('the dragon’s warm-up', () => {
  it('draws the poses with no opening flight while the sky’s own warm-up still runs (that is not a change)', async () => {
    install({ opening: false });
    const { dragon, draw } = await start({ gateAt: 400, builtAt: 600 });
    expect(
      [...layers.values()].some((layer) => layer.animations.some((animation) => animation.id === WARMUP_ID)),
      'the sky is warming',
    ).toBe(true);
    expect(posed(dragon), 'a pose is on').toBe(true);
    expect(draw, 'drawn once, for the poses').toHaveBeenCalledTimes(1);
    expect(dragon.hasAttribute('data-warm'), 'the other theme’s filter first').toBe(true);
    expect(reported).not.toHaveBeenCalled();
  });

  it('draws the other theme’s poses before the opening flight’s slot while the sky warms', async () => {
    install({ opening: true });
    const { dragon, draw } = await start({ gateAt: 400, builtAt: 500 });
    expect(
      [...layers.values()].some((layer) => layer.animations.some((animation) => animation.id === WARMUP_ID)),
      'the sky is warming (its 0.5 s fits before the slot)',
    ).toBe(true);
    expect(posed(dragon), 'a pose is on').toBe(true);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(reported).not.toHaveBeenCalled();
  });

  it('draws nothing over a change the sky is playing that the scene never heard (before its chunk arrived)', async () => {
    install({ opening: false });
    // The sunset started before the scene subscribed: the island plays it on the paintings.
    layers.get('day')?.play();
    layers.get('night')?.play();
    const { dragon, draw } = await start({ gateAt: 400, builtAt: 600 });
    await pose(16);
    expect(posed(dragon), 'no pose over the change').toBe(false);
    expect(draw, 'and no draw on the hidden dragon').not.toHaveBeenCalled();
    expect(dragon.dataset.renderer, 'ready all the same').toBe('webgl');
    expect(reported).not.toHaveBeenCalled();
  });

  it('draws nothing over the island’s pins (a change about to start)', async () => {
    install({ opening: false });
    const night = layers.get('night');
    if (night) night.style.opacity = '0';
    const { dragon, draw } = await start({ gateAt: 400, builtAt: 600 });
    await pose(16);
    expect(posed(dragon)).toBe(false);
    expect(draw).not.toHaveBeenCalled();
    expect(dragon.dataset.renderer).toBe('webgl');
  });

  it('stops before the next pose when the sky starts a change the scene did not hear', async () => {
    install({ opening: false });
    const { dragon, draw } = await start({ gateAt: 400, builtAt: 600 });
    expect(posed(dragon)).toBe(true);
    const shown = traces(dragon);
    layers.get('day')?.play();
    await pose(16);
    expect(traces(dragon), 'no pose after the change began').toBe(shown);
    expect(dragon.style.opacity, 'hidden again').toBe('0');
    expect(dragon.hasAttribute('data-warm'), 'on its own theme’s filter').toBe(false);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('draws nothing when no pose fits before the opening flight’s slot', async () => {
    install({ opening: true });
    // Ready 38 ms before the slot (FCP + 1.2 s): less than a pose's 40 ms before the warm-up's end, 50 ms before it.
    const slot = FCP + OPENING_DELAY_MS;
    const { dragon, draw } = await start({ gateAt: 400, builtAt: slot - 38 });
    expect(posed(dragon)).toBe(false);
    expect(draw, 'no draw before the flight').not.toHaveBeenCalled();
    await advance(38);
    expect(dragon.dataset.flight, 'the opening flight, at its slot').toBe('flying');
    expect(reported).not.toHaveBeenCalled();
  });

  it('after a theme switch, draws nothing on the hidden dragon once a flight has landed', async () => {
    install({ opening: false });
    const { dragon, draw } = await start({ gateAt: 400, builtAt: 600 });
    await pose(1);
    expect(posed(dragon)).toBe(true);
    // The switch stops the warm-up mid-way: it did that work itself.
    switchTheme();
    expect(dragon.style.opacity, 'hidden at once').toBe('0');
    await pose(1);
    expect(dragon.dataset.renderer, 'ready').toBe('webgl');
    for (let flight = 1; flight <= 2; flight += 1) {
      await advance(SWITCH_DELAY_MS);
      expect(dragon.dataset.flight, `switch flight ${flight}`).toBe('flying');
      await frame();
      // To the end of the flight: it lands.
      clock += FLIGHT_MS;
      await frame();
      expect(dragon.dataset.flight, `landed ${flight}`).toBe('idle');
      const drawn = draw.mock.calls.length;
      const poses = traces(dragon);
      await advance(1000);
      await pose(16);
      expect(draw.mock.calls.length, `no draw after landing ${flight}`).toBe(drawn);
      expect(traces(dragon), `no pose after landing ${flight}`).toBe(poses);
      switchTheme();
    }
    expect(reported).not.toHaveBeenCalled();
  });
});
