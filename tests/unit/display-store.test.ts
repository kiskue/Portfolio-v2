import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import {
  DARK_QUERY,
  DEFAULT_PREFS,
  DISPLAY_KEY,
  DISPLAY_PREPAINT,
  MOTION_PREFS,
  REDUCED_MOTION_QUERY,
  THEME_PREFS,
  serializePrefs,
  type DisplayEnv,
  type DisplayPrefs,
} from '@/lib/display-settings';
import {
  SERVER_DISPLAY_SNAPSHOT,
  SWITCHING_ATTRIBUTE,
  browserDisplayHost,
  createDisplayStore,
  getDisplaySnapshot,
  getServerDisplaySnapshot,
  setDisplay,
  subscribeDisplay,
  type DisplayHost,
  type DisplayPatch,
  type MediaQueryLike,
} from '@/lib/display-store';

/*
 * The display store (architecture D5) with fake hosts: no DOM, no browser. The parity block
 * runs the real inline pre-paint script against the storage the store wrote, which is what a
 * reload does, and requires the same <html> state: settings persist with no flash.
 */

// ─── Fakes ───────────────────────────────────────────────────────────────────────────────

class FakeMediaQuery implements MediaQueryLike {
  readonly listeners = new Set<() => void>();
  constructor(public matches: boolean) {}
  addEventListener(_type: 'change', listener: () => void): void {
    this.listeners.add(listener);
  }
  removeEventListener(_type: 'change', listener: () => void): void {
    this.listeners.delete(listener);
  }
  /** What the OS does when the visitor flips the setting. */
  change(matches: boolean): void {
    this.matches = matches;
    for (const listener of [...this.listeners]) listener();
  }
}

interface FakeRoot {
  readonly classes: Set<string>;
  readonly classList: { toggle(token: string, force?: boolean): boolean };
  readonly style: { colorScheme: string };
  readonly dataset: { [name: string]: string | undefined };
}

function fakeRoot(): FakeRoot {
  const classes = new Set<string>();
  return {
    classes,
    classList: {
      toggle(token, force) {
        const on = force ?? !classes.has(token);
        if (on) classes.add(token);
        else classes.delete(token);
        return on;
      },
    },
    style: { colorScheme: '' },
    dataset: {},
  };
}

/** What a visitor sees: the three things the pre-paint script and the store write. */
function observed(root: FakeRoot) {
  return { dark: root.classes.has('dark'), colorScheme: root.style.colorScheme, motion: root.dataset.motion };
}

type StorageMode = 'ok' | 'missing' | 'throws-on-access' | 'throws-on-write';

interface FakeOptions {
  readonly stored?: string | null;
  readonly env?: DisplayEnv;
  readonly storage?: StorageMode;
  readonly noMatchMedia?: boolean;
}

function fakeHost({ stored = null, env = { prefersDark: false, prefersReducedMotion: false }, storage = 'ok', noMatchMedia = false }: FakeOptions = {}) {
  const root = fakeRoot();
  const items = new Map<string, string>();
  if (stored !== null) items.set(DISPLAY_KEY, stored);
  const dark = new FakeMediaQuery(env.prefersDark);
  const reduce = new FakeMediaQuery(env.prefersReducedMotion);
  const storageListeners = new Set<(key: string | null, value: string | null) => void>();
  const calls = { suspended: 0, writesOutsideSuspension: 0 };
  let suspended = false;

  const area = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (storage === 'throws-on-write') throw new Error('QuotaExceededError');
      items.set(key, value);
    },
  };

  // Every DOM write must happen inside withoutTransitions.
  const guardedRoot: FakeRoot = {
    ...root,
    classList: {
      toggle(token, force) {
        if (!suspended) calls.writesOutsideSuspension += 1;
        return root.classList.toggle(token, force);
      },
    },
  };

  const host: DisplayHost = {
    root: guardedRoot,
    storage() {
      if (storage === 'missing') return null;
      if (storage === 'throws-on-access') throw new Error('SecurityError: storage is disabled');
      return area;
    },
    matchMedia(query) {
      if (noMatchMedia) return null;
      if (query === DARK_QUERY) return dark;
      if (query === REDUCED_MOTION_QUERY) return reduce;
      throw new Error(`unexpected media query ${query}`);
    },
    watchStorage(listener) {
      storageListeners.add(listener);
      return () => storageListeners.delete(listener);
    },
    withoutTransitions(write) {
      calls.suspended += 1;
      suspended = true;
      try {
        write();
      } finally {
        suspended = false;
      }
    },
  };

  /** Another tab writes (or clears) storage. */
  function otherTab(key: string | null, value: string | null): void {
    if (key === null) items.clear();
    else if (value === null) items.delete(key);
    else items.set(key, value);
    for (const listener of [...storageListeners]) listener(key, value);
  }

  return { host, root, items, dark, reduce, calls, storageListeners, otherTab };
}

/** Runs the real inline pre-paint script against a fresh <html>, as a reload does. */
function prepaint(stored: string | null, env: DisplayEnv): FakeRoot {
  const root = fakeRoot();
  vm.runInNewContext(DISPLAY_PREPAINT, {
    document: { documentElement: root },
    localStorage: { getItem: (key: string) => (key === DISPLAY_KEY ? stored : null) },
    window: {
      matchMedia: (query: string) => ({
        matches: (query === DARK_QUERY && env.prefersDark) || (query === REDUCED_MOTION_QUERY && env.prefersReducedMotion),
      }),
    },
  });
  return root;
}

const ENVS: readonly DisplayEnv[] = [
  { prefersDark: false, prefersReducedMotion: false },
  { prefersDark: true, prefersReducedMotion: false },
  { prefersDark: false, prefersReducedMotion: true },
  { prefersDark: true, prefersReducedMotion: true },
];

const ALL_PREFS: readonly DisplayPrefs[] = THEME_PREFS.flatMap((theme) => MOTION_PREFS.map((motion) => ({ theme, motion })));

// ─── Tests ───────────────────────────────────────────────────────────────────────────────

describe('createDisplayStore: initial state', () => {
  it('reads the stored preferences and the OS media queries', () => {
    const { host } = fakeHost({ stored: '{"theme":"dark","motion":"reduce"}', env: { prefersDark: false, prefersReducedMotion: false } });
    expect(createDisplayStore(host).getSnapshot()).toEqual({
      prefs: { theme: 'dark', motion: 'reduce' },
      env: { prefersDark: false, prefersReducedMotion: false },
      resolved: { dark: true, reduceMotion: true },
    });
  });

  it('follows the OS when nothing is stored', () => {
    const { host } = fakeHost({ env: { prefersDark: true, prefersReducedMotion: true } });
    expect(createDisplayStore(host).getSnapshot()).toMatchObject({ prefs: DEFAULT_PREFS, resolved: { dark: true, reduceMotion: true } });
  });

  it.each(['not json', '"dark"', '[]', '{"theme":"blue","motion":"full"}'])('falls back to the defaults for stored %s', (stored) => {
    const { host } = fakeHost({ stored });
    expect(createDisplayStore(host).getSnapshot().prefs).toEqual(DEFAULT_PREFS);
  });

  it.each<StorageMode>(['missing', 'throws-on-access'])('falls back to the defaults when storage is %s', (storage) => {
    const { host } = fakeHost({ storage, env: { prefersDark: true, prefersReducedMotion: false } });
    expect(createDisplayStore(host).getSnapshot()).toMatchObject({ prefs: DEFAULT_PREFS, resolved: { dark: true, reduceMotion: false } });
  });

  it('treats a missing matchMedia as no OS preference', () => {
    const { host } = fakeHost({ noMatchMedia: true, stored: '{"theme":"system"}' });
    expect(createDisplayStore(host).getSnapshot()).toMatchObject({
      env: { prefersDark: false, prefersReducedMotion: false },
      resolved: { dark: false, reduceMotion: false },
    });
  });

  it('writes nothing to <html> on creation (the pre-paint script already did)', () => {
    const { host, root, calls } = fakeHost({ stored: '{"theme":"dark"}' });
    createDisplayStore(host);
    expect(observed(root)).toEqual({ dark: false, colorScheme: '', motion: undefined });
    expect(calls.suspended).toBe(0);
  });

  it('returns the same snapshot object until something changes', () => {
    const { host } = fakeHost();
    const store = createDisplayStore(host);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});

describe('createDisplayStore: set', () => {
  it('stores, applies and notifies', () => {
    const { host, root, items } = fakeHost();
    const store = createDisplayStore(host);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    store.set({ theme: 'dark' });

    expect(items.get(DISPLAY_KEY)).toBe(serializePrefs({ theme: 'dark', motion: 'system' }));
    expect(observed(root)).toEqual({ dark: true, colorScheme: 'dark', motion: 'full' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot()).toMatchObject({ prefs: { theme: 'dark', motion: 'system' }, resolved: { dark: true } });
  });

  it('keeps the other preference when one changes', () => {
    const { host } = fakeHost({ stored: '{"theme":"light","motion":"reduce"}' });
    const store = createDisplayStore(host);
    store.set({ theme: 'dark' });
    expect(store.getSnapshot().prefs).toEqual({ theme: 'dark', motion: 'reduce' });
    store.set({ motion: 'system' });
    expect(store.getSnapshot().prefs).toEqual({ theme: 'dark', motion: 'system' });
  });

  it('sets data-motion="reduce" for Motion: Reduce', () => {
    const { host, root } = fakeHost();
    const store = createDisplayStore(host);
    store.set({ motion: 'reduce' });
    expect(root.dataset.motion).toBe('reduce');
    expect(store.getSnapshot().resolved.reduceMotion).toBe(true);
  });

  it('does nothing when the preference is unchanged', () => {
    const { host, root, items, calls } = fakeHost({ stored: '{"theme":"dark","motion":"system"}' });
    const store = createDisplayStore(host);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    store.set({ theme: 'dark' });
    store.set({});
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
    expect(calls.suspended).toBe(0);
    expect(observed(root).colorScheme).toBe('');
    expect(items.get(DISPLAY_KEY)).toBe('{"theme":"dark","motion":"system"}');
  });

  it('turns an unknown value into "system" instead of storing it', () => {
    const { host, items } = fakeHost({ stored: '{"theme":"dark","motion":"reduce"}' });
    const store = createDisplayStore(host);
    store.set({ theme: 'sepia' as DisplayPrefs['theme'] });
    expect(store.getSnapshot().prefs).toEqual({ theme: 'system', motion: 'reduce' });
    expect(items.get(DISPLAY_KEY)).toBe('{"theme":"system","motion":"reduce"}');
  });

  it.each<StorageMode>(['missing', 'throws-on-access', 'throws-on-write'])(
    'still applies and notifies when storage is %s (just not remembered)',
    (storage) => {
      const { host, root } = fakeHost({ storage });
      const store = createDisplayStore(host);
      const listener = vi.fn();
      store.subscribe(listener);
      expect(() => store.set({ theme: 'dark' })).not.toThrow();
      expect(observed(root).dark).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    },
  );

  it('writes <html> only through withoutTransitions, so no transition animates it (no theme crossfade)', () => {
    const { host, calls } = fakeHost();
    const store = createDisplayStore(host);
    store.set({ theme: 'dark' });
    store.set({ motion: 'reduce' });
    expect(calls.suspended).toBe(2);
    expect(calls.writesOutsideSuspension).toBe(0);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const { host } = fakeHost();
    const store = createDisplayStore(host);
    const kept = vi.fn();
    const dropped = vi.fn();
    store.subscribe(kept);
    const unsubscribe = store.subscribe(dropped);
    unsubscribe();
    store.set({ theme: 'light' });
    expect(kept).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
  });
});

describe('createDisplayStore: following the OS', () => {
  it('follows prefers-color-scheme while the theme is "system"', () => {
    const { host, root, dark } = fakeHost({ env: { prefersDark: false, prefersReducedMotion: false } });
    const store = createDisplayStore(host);
    const listener = vi.fn();
    store.subscribe(listener);

    dark.change(true);
    expect(observed(root)).toMatchObject({ dark: true, colorScheme: 'dark' });
    expect(store.getSnapshot()).toMatchObject({ env: { prefersDark: true }, resolved: { dark: true } });

    dark.change(false);
    expect(observed(root)).toMatchObject({ dark: false, colorScheme: 'light' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps an explicit theme when the OS changes', () => {
    const { host, root, dark } = fakeHost({ stored: '{"theme":"light"}' });
    const store = createDisplayStore(host);
    dark.change(true);
    expect(store.getSnapshot().resolved.dark).toBe(false);
    expect(observed(root).dark).toBe(false);
    // Back to "system": the OS (now dark) decides at once.
    store.set({ theme: 'system' });
    expect(observed(root).dark).toBe(true);
  });

  it('reduces motion whenever the OS asks, even with Motion: System', () => {
    const { host, root, reduce } = fakeHost();
    const store = createDisplayStore(host);
    reduce.change(true);
    expect(root.dataset.motion).toBe('reduce');
    reduce.change(false);
    expect(root.dataset.motion).toBe('full');
    store.set({ motion: 'reduce' });
    reduce.change(true);
    reduce.change(false);
    expect(root.dataset.motion).toBe('reduce');
  });

  it('follows another tab through the storage event', () => {
    const { host, root, otherTab } = fakeHost();
    const store = createDisplayStore(host);
    const listener = vi.fn();
    store.subscribe(listener);

    otherTab(DISPLAY_KEY, '{"theme":"dark","motion":"reduce"}');
    expect(store.getSnapshot().prefs).toEqual({ theme: 'dark', motion: 'reduce' });
    expect(observed(root)).toEqual({ dark: true, colorScheme: 'dark', motion: 'reduce' });

    otherTab('unrelated', 'x');
    expect(listener).toHaveBeenCalledTimes(1);

    otherTab(null, null); // localStorage.clear() elsewhere
    expect(store.getSnapshot().prefs).toEqual(DEFAULT_PREFS);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('destroy detaches every listener', () => {
    const { host, dark, reduce, storageListeners, otherTab } = fakeHost();
    const store = createDisplayStore(host);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(dark.listeners.size).toBe(1);
    expect(reduce.listeners.size).toBe(1);
    expect(storageListeners.size).toBe(1);

    store.destroy();
    expect(dark.listeners.size).toBe(0);
    expect(reduce.listeners.size).toBe(0);
    expect(storageListeners.size).toBe(0);
    otherTab(DISPLAY_KEY, '{"theme":"dark"}');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('parity with the inline pre-paint script (persist across reload, no flash)', () => {
  for (const env of ENVS) {
    for (const prefs of ALL_PREFS) {
      it(`${prefs.theme}/${prefs.motion} on dark-os=${env.prefersDark} reduce-os=${env.prefersReducedMotion}`, () => {
        // Start from the opposite of the target so set() always changes something.
        const start: DisplayPrefs = { theme: prefs.theme === 'dark' ? 'light' : 'dark', motion: prefs.motion === 'reduce' ? 'system' : 'reduce' };
        const { host, root, items } = fakeHost({ stored: serializePrefs(start), env });
        const store = createDisplayStore(host);
        store.set(prefs);
        const reloaded = prepaint(items.get(DISPLAY_KEY) ?? null, env);
        expect(observed(reloaded)).toEqual(observed(root));
        expect(observed(root)).toEqual({
          dark: store.getSnapshot().resolved.dark,
          colorScheme: store.getSnapshot().resolved.dark ? 'dark' : 'light',
          motion: store.getSnapshot().resolved.reduceMotion ? 'reduce' : 'full',
        });
      });
    }
  }

  it('the store reads what the pre-paint script reads (same key, same parser)', () => {
    for (const env of ENVS) {
      for (const stored of [null, 'oops', '{"theme":"dark"}', '{"theme":"light","motion":"reduce"}', '{"motion":"reduce"}']) {
        const painted = prepaint(stored, env);
        const { resolved } = createDisplayStore(fakeHost({ stored, env }).host).getSnapshot();
        expect(observed(painted)).toEqual({ dark: resolved.dark, colorScheme: resolved.dark ? 'dark' : 'light', motion: resolved.reduceMotion ? 'reduce' : 'full' });
      }
    }
  });
});

describe('browserDisplayHost', () => {
  /**
   * Which animation APIs the fake browser has: 'full' (document.getAnimations and CSSTransition,
   * every current browser), 'no-css-transition', or 'none'.
   */
  type AnimationApis = 'full' | 'no-css-transition' | 'none';

  interface FakeWindowOptions {
    readonly storageThrows?: boolean;
    readonly matchMedia?: boolean;
    readonly animations?: AnimationApis;
  }

  /** A running animation the page did not start through CSS transitions (WAAPI, a CSS animation). */
  class FakeAnimation {
    finishCalls = 0;
    constructor(
      readonly name: string,
      private readonly running: FakeAnimation[],
    ) {}
    finish(): void {
      this.finishCalls += 1;
      const index = this.running.indexOf(this);
      if (index >= 0) this.running.splice(index, 1);
    }
  }

  /** A CSS transition of one element's colour: the fake window's CSSTransition. */
  class FakeCSSTransition extends FakeAnimation {
    readonly transitionProperty = 'color';
    readonly effect: { readonly target: object; readonly pseudoElement: string | null };
    constructor(name: string, running: FakeAnimation[]) {
      super(name, running);
      this.effect = { target: { element: name }, pseudoElement: null };
    }
  }

  /** What the fake window's listeners receive: a storage event, or a transition event. */
  interface FakeEvent {
    readonly key?: string | null;
    readonly newValue?: string | null;
    readonly target?: object;
    readonly pseudoElement?: string;
    readonly propertyName?: string;
    readonly stopImmediatePropagation?: () => void;
  }

  function fakeWindow({ storageThrows = false, matchMedia = true, animations = 'full' }: FakeWindowOptions = {}) {
    const root = fakeRoot();
    // What the pre-paint script painted: the fake OS is dark (when matchMedia exists), with full motion.
    if (matchMedia) root.classes.add('dark');
    root.style.colorScheme = matchMedia ? 'dark' : 'light';
    root.dataset.motion = 'full';
    const attributes = new Map<string, string>();
    const events = new Map<string, Set<(event: FakeEvent) => void>>();
    const timers: (() => void)[] = [];
    const frames: (() => void)[] = [];
    const microtasks: (() => void)[] = [];
    const log: string[] = [];
    const items = new Map<string, string>();
    const dark = new FakeMediaQuery(true);
    // Style changes not yet flushed start their transitions at the next flush (getAnimations).
    const running: FakeAnimation[] = [];
    const pending: FakeAnimation[] = [];
    const hooks: { onMutation?: () => void } = {};
    /** A transition that the next style flush starts (a write, or a re-render, changed a colour). */
    const startsTransition = (name: string): FakeCSSTransition => {
      const transition = new FakeCSSTransition(name, running);
      pending.push(transition);
      return transition;
    };
    const queueMicrotask = (callback: () => void): void => {
      microtasks.push(callback);
    };
    /** Runs the microtask queue to the end, as the browser does after a task. */
    const drainMicrotasks = (): void => {
      for (let callback = microtasks.shift(); callback; callback = microtasks.shift()) callback();
    };

    const documentElement = {
      ...root,
      classList: {
        toggle(token: string, force?: boolean) {
          log.push(`toggle ${token}=${String(force)} switching=${attributes.has(SWITCHING_ATTRIBUTE)}`);
          startsTransition(`${token} colour`);
          // A MutationObserver on <html> (useReducedMotion watches data-motion) is told in a microtask.
          if (hooks.onMutation) queueMicrotask(hooks.onMutation);
          return root.classList.toggle(token, force);
        },
        contains: (token: string) => root.classes.has(token),
      },
      setAttribute: (name: string, value: string) => {
        log.push(`set ${name}`);
        attributes.set(name, value);
      },
      removeAttribute: (name: string) => attributes.delete(name),
    };
    const getAnimations = (): FakeAnimation[] => {
      log.push('getAnimations');
      running.push(...pending.splice(0));
      return [...running];
    };
    const win = {
      document: { documentElement, ...(animations === 'none' ? {} : { getAnimations }) },
      ...(animations === 'full' ? { CSSTransition: FakeCSSTransition } : {}),
      queueMicrotask,
      get localStorage() {
        if (storageThrows) throw new Error('SecurityError: the operation is insecure');
        return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value) };
      },
      ...(matchMedia ? { matchMedia: (query: string) => (query === DARK_QUERY ? dark : new FakeMediaQuery(false)) } : {}),
      addEventListener(type: string, listener: (event: FakeEvent) => void) {
        const set = events.get(type) ?? new Set();
        set.add(listener);
        events.set(type, set);
      },
      removeEventListener(type: string, listener: (event: FakeEvent) => void) {
        events.get(type)?.delete(listener);
      },
      requestAnimationFrame(callback: () => void) {
        frames.push(callback);
        return frames.length;
      },
      getComputedStyle() {
        return {
          getPropertyValue(name: string) {
            log.push(`flush ${name} switching=${attributes.has(SWITCHING_ATTRIBUTE)}`);
            return '';
          },
        };
      },
      setTimeout(handler: () => void) {
        timers.push(handler);
        return timers.length;
      },
    };
    return {
      win: win as unknown as Window,
      root,
      attributes,
      events,
      timers,
      frames,
      microtasks,
      drainMicrotasks,
      log,
      items,
      dark,
      running,
      hooks,
      startsTransition,
      queueMicrotask,
      /** Something else is animating when the switch comes: a WAAPI animation and a CSS animation. */
      otherAnimations: (): FakeAnimation[] => {
        const others = [new FakeAnimation('sky crossfade (WAAPI)', running), new FakeAnimation('stars (CSS animation)', running)];
        running.push(...others);
        return others;
      },
    };
  }

  it('drives a store end to end over a window-like object', () => {
    const { win, root, items, dark } = fakeWindow();
    const store = createDisplayStore(browserDisplayHost(win));
    expect(store.getSnapshot().resolved.dark).toBe(true);

    store.set({ theme: 'light' });
    expect(items.get(DISPLAY_KEY)).toBe('{"theme":"light","motion":"system"}');
    expect(observed(root)).toMatchObject({ dark: false, colorScheme: 'light' });

    store.set({ theme: 'system' });
    dark.change(false);
    expect(observed(root).dark).toBe(false);
  });

  it('finishes the CSS transitions the write starts, in the same task, with one style flush and no attribute', () => {
    const { win, attributes, timers, log, running, otherAnimations } = fakeWindow();
    const others = otherAnimations();
    const store = createDisplayStore(browserDisplayHost(win));
    store.set({ theme: 'light' });
    // getAnimations() flushes style, which starts the write's transitions; then each is finished.
    expect(log).toEqual(['toggle dark=false switching=false', 'getAnimations']);
    expect(running.filter((animation) => animation instanceof FakeCSSTransition)).toEqual([]);
    expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(false);
    expect(timers).toEqual([]);
    // Only CSS transitions are finished: the sky's Web Animations and the stars' CSS animations run on.
    expect(others.map((animation) => animation.finishCalls)).toEqual([0, 0]);
    expect(running).toEqual(others);
  });

  it('stops the events of the transitions it finished, until the next frame, and lets the others through', () => {
    const { win, events, frames, running, startsTransition, drainMicrotasks } = fakeWindow();
    const store = createDisplayStore(browserDisplayHost(win));
    const before = startsTransition('link (already in the flush)');
    store.set({ theme: 'light' });
    drainMicrotasks();
    expect(running).toEqual([]);
    /** Dispatches a transition event to the window's capture listeners; true if one stopped it. */
    const dispatch = (type: string, target: object, propertyName = 'color', pseudoElement = ''): boolean => {
      const stop = vi.fn();
      for (const listener of [...(events.get(type) ?? [])]) listener({ target, propertyName, pseudoElement, stopImmediatePropagation: stop });
      return stop.mock.calls.length > 0;
    };
    // The next frame dispatches the finished transitions' run, start and end events: all stopped.
    for (const type of ['transitionrun', 'transitionstart', 'transitionend']) expect(dispatch(type, before.effect.target), type).toBe(true);
    // Another element, another property or a pseudo-element of the same one: someone else's transition.
    expect(dispatch('transitionend', { element: 'unrelated' })).toBe(false);
    expect(dispatch('transitionend', before.effect.target, 'opacity')).toBe(false);
    expect(dispatch('transitionend', before.effect.target, 'color', '::before')).toBe(false);
    // That frame's callbacks take the listeners off again.
    for (const frame of frames.splice(0)) frame();
    for (const type of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']) expect(events.get(type)?.size ?? 0, type).toBe(0);
  });

  it("finishes, two microtasks later, the transitions the listeners' re-render starts (React renders in a microtask)", () => {
    const { win, log, running, drainMicrotasks, startsTransition, queueMicrotask } = fakeWindow();
    const store = createDisplayStore(browserDisplayHost(win));
    const late: FakeCSSTransition[] = [];
    // useSyncExternalStore: the listener schedules React's render in a microtask; the render
    // changes a class that a colour transition follows.
    store.subscribe(() => queueMicrotask(() => late.push(startsTransition('re-render colour'))));
    store.set({ theme: 'light' });
    drainMicrotasks();
    expect(late).toHaveLength(1);
    expect(late[0]?.finishCalls).toBe(1);
    expect(running).toEqual([]);
    // One flush in the switch's task, and one after the re-render; nothing waits for a later task.
    expect(log).toEqual(['toggle dark=false switching=false', 'getAnimations', 'getAnimations']);
  });

  it('also when the re-render comes one microtask later still (a MutationObserver on <html>, then React)', () => {
    const { win, running, hooks, drainMicrotasks, startsTransition, queueMicrotask } = fakeWindow();
    const store = createDisplayStore(browserDisplayHost(win));
    const late: FakeCSSTransition[] = [];
    // useReducedMotion hears the write through a MutationObserver, and only then schedules React.
    hooks.onMutation = () => queueMicrotask(() => late.push(startsTransition('re-render colour')));
    store.set({ motion: 'reduce' });
    drainMicrotasks();
    expect(late).toHaveLength(1);
    expect(late[0]?.finishCalls).toBe(1);
    expect(running).toEqual([]);
  });

  // The attribute path: set after the write and before anything reads style, so the write's one
  // style flush runs with transitions off; the attribute comes off a task later.
  const SUSPENDED = ['toggle dark=false switching=false', `set ${SWITCHING_ATTRIBUTE}`, 'flush color switching=true'];

  it('falls back to the attribute where document.getAnimations is missing: transitions suspended for the style flush, then restored', () => {
    const { win, attributes, timers, log, microtasks } = fakeWindow({ animations: 'none' });
    const store = createDisplayStore(browserDisplayHost(win));
    store.set({ theme: 'light' });
    expect(log).toEqual(SUSPENDED);
    expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(true);
    expect(microtasks).toEqual([]);
    for (const timer of timers.splice(0)) timer();
    expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(false);
  });

  it('falls back to the attribute where CSSTransition is missing', () => {
    const { win, attributes, timers, log } = fakeWindow({ animations: 'no-css-transition' });
    const store = createDisplayStore(browserDisplayHost(win));
    store.set({ theme: 'light' });
    expect(log).toEqual(SUSPENDED);
    for (const timer of timers.splice(0)) timer();
    expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(false);
  });

  it('keeps the attribute for a theme change under reduced motion, where every element transitions colour', () => {
    // Finishing would cascade: each child that inherits its colour would start its own transition
    // once its parent's is finished. So both a theme change while Reduce is on and one that turns
    // Reduce on are suspended.
    const patches: readonly DisplayPatch[] = [{ theme: 'light' }, { theme: 'light', motion: 'reduce' }];
    for (const patch of patches) {
      const { win, attributes, timers, log, microtasks, drainMicrotasks } = fakeWindow();
      const store = createDisplayStore(browserDisplayHost(win));
      if (patch.motion === undefined) {
        store.set({ motion: 'reduce' });
        drainMicrotasks();
      }
      log.length = 0;
      store.set(patch);
      expect(log).toEqual(SUSPENDED);
      expect(microtasks, 'no second pass').toEqual([]);
      expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(true);
      for (const timer of timers.splice(0)) timer();
      expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(false);
    }
  });

  it('finishes instead for a motion change alone, and for a theme change that ends at full motion', () => {
    const { win, attributes, log, running } = fakeWindow();
    const store = createDisplayStore(browserDisplayHost(win));
    store.set({ motion: 'reduce' });
    store.set({ theme: 'light', motion: 'system' });
    expect(log).toEqual(['toggle dark=true switching=false', 'getAnimations', 'toggle dark=false switching=false', 'getAnimations']);
    expect(attributes.has(SWITCHING_ATTRIBUTE)).toBe(false);
    expect(running).toEqual([]);
  });

  it('copes with blocked storage and a missing matchMedia', () => {
    const { win, root } = fakeWindow({ storageThrows: true, matchMedia: false });
    const store = createDisplayStore(browserDisplayHost(win));
    expect(store.getSnapshot()).toMatchObject({ prefs: DEFAULT_PREFS, env: { prefersDark: false, prefersReducedMotion: false } });
    expect(() => store.set({ theme: 'dark' })).not.toThrow();
    expect(observed(root).dark).toBe(true);
  });

  it('listens to the storage event and stops on destroy', () => {
    const { win, events, root } = fakeWindow();
    const store = createDisplayStore(browserDisplayHost(win));
    const listeners = events.get('storage');
    expect(listeners?.size).toBe(1);
    for (const listener of listeners ?? []) listener({ key: DISPLAY_KEY, newValue: '{"theme":"light","motion":"reduce"}' });
    expect(observed(root)).toMatchObject({ dark: false, motion: 'reduce' });
    store.destroy();
    expect(events.get('storage')?.size).toBe(0);
  });
});

describe('module store outside the browser', () => {
  it('serves the server snapshot and ignores writes', () => {
    expect(getServerDisplaySnapshot()).toBe(SERVER_DISPLAY_SNAPSHOT);
    expect(getDisplaySnapshot()).toBe(SERVER_DISPLAY_SNAPSHOT);
    expect(SERVER_DISPLAY_SNAPSHOT).toEqual({
      prefs: DEFAULT_PREFS,
      env: { prefersDark: false, prefersReducedMotion: false },
      resolved: { dark: false, reduceMotion: false },
    });
    const unsubscribe = subscribeDisplay(() => undefined);
    expect(() => unsubscribe()).not.toThrow();
    expect(() => setDisplay({ theme: 'dark' })).not.toThrow();
    expect(getDisplaySnapshot()).toBe(SERVER_DISPLAY_SNAPSHOT);
  });
});
