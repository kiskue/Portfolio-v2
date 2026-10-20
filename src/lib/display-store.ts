import {
  applyDisplay,
  DARK_QUERY,
  DEFAULT_PREFS,
  DISPLAY_KEY,
  parsePrefs,
  REDUCED_MOTION_QUERY,
  resolveDisplay,
  serializePrefs,
  type DisplayEnv,
  type DisplayPrefs,
  type DisplayRoot,
  type ResolvedDisplay,
} from '@/lib/display-settings';

/*
 * The client display store (architecture D5): Theme (System / Light / Dark) and Motion
 * (System / Reduce), shared by ThemeToggle and DisplaySettings so neither duplicates logic.
 *
 * - It reads and writes localStorage[DISPLAY_KEY] through parsePrefs / serializePrefs and applies
 *   the result with resolveDisplay + applyDisplay: the functions the inline pre-paint script
 *   mirrors (src/lib/display-settings.ts). So a reload paints exactly what the store showed,
 *   before any JS runs, with no flash.
 * - It follows the OS (prefers-color-scheme, prefers-reduced-motion) through matchMedia: the
 *   theme while it is 'system', and reduced motion always (the site can only add reduction).
 *   Other tabs are followed through the storage event.
 * - Storage may be missing or throw (private mode, blocked site data). The choice then still
 *   applies to this page; it is just not remembered.
 * - No theme crossfade (PLAN → Motion): every DOM write runs with CSS transitions suspended for
 *   one style recalc, so colours switch at once instead of animating element by element.
 *
 * createDisplayStore(host) touches nothing but the injected host, so unit tests drive it with
 * fakes. In the browser one store is created when this module first loads and keeps listening
 * from then on. Components read it with
 * `useSyncExternalStore(subscribeDisplay, getDisplaySnapshot, getServerDisplaySnapshot)` and
 * write with `setDisplay`.
 */

/** The part of a MediaQueryList the store uses. */
export interface MediaQueryLike {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/** The part of a Storage area the store uses. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Everything the store touches outside itself. browserDisplayHost(window) is the real one. */
export interface DisplayHost {
  /** <html>: where .dark, color-scheme and data-motion go. */
  readonly root: DisplayRoot;
  /** The storage area, or null. It may throw: reading window.localStorage can itself throw. */
  storage(): StorageLike | null;
  /** A media query list, or null when matchMedia is unavailable. */
  matchMedia(query: string): MediaQueryLike | null;
  /** Calls `listener` when another tab changes storage (key null = cleared); returns the unsubscribe. */
  watchStorage(listener: (key: string | null, value: string | null) => void): () => void;
  /** Runs one DOM write with CSS transitions suspended. */
  withoutTransitions(write: () => void): void;
}

/** One immutable state: what the visitor chose, what the OS reports, and the result. */
export interface DisplaySnapshot {
  readonly prefs: DisplayPrefs;
  readonly env: DisplayEnv;
  readonly resolved: ResolvedDisplay;
}

export type DisplayPatch = Partial<DisplayPrefs>;

export interface DisplayStore {
  /** The current snapshot; the same object until something changes (useSyncExternalStore). */
  getSnapshot(): DisplaySnapshot;
  subscribe(listener: () => void): () => void;
  /** Stores and applies a preference change. Unknown values fall back to 'system'. */
  set(patch: DisplayPatch): void;
  /** Detaches every listener (tests, teardown). */
  destroy(): void;
}

const NO_PREFERENCE: DisplayEnv = { prefersDark: false, prefersReducedMotion: false };

function snapshotOf(prefs: DisplayPrefs, env: DisplayEnv): DisplaySnapshot {
  return { prefs, env, resolved: resolveDisplay(prefs, env) };
}

/**
 * What server rendering and hydration assume: nothing stored, no OS preference. The pre-paint
 * script has already painted the real theme, so this only decides the first client render of
 * controls that show the preference; useSyncExternalStore re-renders them right after.
 */
export const SERVER_DISPLAY_SNAPSHOT: DisplaySnapshot = snapshotOf(DEFAULT_PREFS, NO_PREFERENCE);

const samePrefs = (a: DisplayPrefs, b: DisplayPrefs): boolean => a.theme === b.theme && a.motion === b.motion;
const sameEnv = (a: DisplayEnv, b: DisplayEnv): boolean =>
  a.prefersDark === b.prefersDark && a.prefersReducedMotion === b.prefersReducedMotion;

/** The stored preferences, or the defaults when storage is missing, blocked or malformed. */
function readStoredPrefs(host: DisplayHost): DisplayPrefs {
  try {
    return parsePrefs(host.storage()?.getItem(DISPLAY_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Creates a store over `host`. It reads storage and matchMedia now; it writes the DOM only on change. */
export function createDisplayStore(host: DisplayHost): DisplayStore {
  const darkQuery = host.matchMedia(DARK_QUERY);
  const motionQuery = host.matchMedia(REDUCED_MOTION_QUERY);
  const listeners = new Set<() => void>();

  const readEnv = (): DisplayEnv => ({
    prefersDark: darkQuery?.matches ?? false,
    prefersReducedMotion: motionQuery?.matches ?? false,
  });

  // The pre-paint script already applied this state, so creating the store writes nothing.
  let snapshot = snapshotOf(readStoredPrefs(host), readEnv());

  function commit(prefs: DisplayPrefs, env: DisplayEnv): void {
    if (samePrefs(prefs, snapshot.prefs) && sameEnv(env, snapshot.env)) return;
    snapshot = snapshotOf(prefs, env);
    const { resolved } = snapshot;
    host.withoutTransitions(() => applyDisplay(host.root, resolved));
    for (const listener of [...listeners]) listener();
  }

  const onMediaChange = (): void => commit(snapshot.prefs, readEnv());
  darkQuery?.addEventListener('change', onMediaChange);
  motionQuery?.addEventListener('change', onMediaChange);

  const stopWatchingStorage = host.watchStorage((key, value) => {
    if (key === DISPLAY_KEY || key === null) commit(parsePrefs(value), snapshot.env);
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(patch) {
      // A round trip through the shared parser keeps only values the pre-paint script knows.
      const prefs = parsePrefs(serializePrefs({ ...snapshot.prefs, ...patch }));
      if (samePrefs(prefs, snapshot.prefs)) return;
      try {
        host.storage()?.setItem(DISPLAY_KEY, serializePrefs(prefs));
      } catch {
        // Not remembered across reloads, but still applied to this page below.
      }
      commit(prefs, snapshot.env);
    },
    destroy() {
      darkQuery?.removeEventListener('change', onMediaChange);
      motionQuery?.removeEventListener('change', onMediaChange);
      stopWatchingStorage();
      listeners.clear();
    },
  };
}

/** Set on <html> while the store switches theme or motion; base.css turns transitions off under it. */
export const SWITCHING_ATTRIBUTE = 'data-display-switching';

/** The real host: <html>, localStorage, matchMedia and the storage event of `win`. */
export function browserDisplayHost(win: Window): DisplayHost {
  const root = win.document.documentElement;
  return {
    root,
    storage: () => win.localStorage,
    matchMedia: (query) => (typeof win.matchMedia === 'function' ? win.matchMedia(query) : null),
    watchStorage(listener) {
      const onStorage = (event: StorageEvent): void => listener(event.key, event.newValue);
      win.addEventListener('storage', onStorage);
      return () => win.removeEventListener('storage', onStorage);
    },
    withoutTransitions(write) {
      root.setAttribute(SWITCHING_ATTRIBUTE, '');
      write();
      // Reading a computed value flushes the style change while transitions are off, so nothing
      // starts animating; transitions come back on the next task with the new colours in place.
      win.getComputedStyle(root).getPropertyValue('color');
      win.setTimeout(() => root.removeAttribute(SWITCHING_ATTRIBUTE), 0);
    },
  };
}

/** The page's store: created once in the browser when this module loads, never on the server. */
const browserStore: DisplayStore | null = typeof window === 'undefined' ? null : createDisplayStore(browserDisplayHost(window));

/** useSyncExternalStore subscribe. */
export function subscribeDisplay(listener: () => void): () => void {
  return browserStore ? browserStore.subscribe(listener) : () => undefined;
}

/** useSyncExternalStore getSnapshot. */
export function getDisplaySnapshot(): DisplaySnapshot {
  return browserStore ? browserStore.getSnapshot() : SERVER_DISPLAY_SNAPSHOT;
}

/** useSyncExternalStore getServerSnapshot. */
export function getServerDisplaySnapshot(): DisplaySnapshot {
  return SERVER_DISPLAY_SNAPSHOT;
}

/** Stores and applies a display preference (no-op on the server). */
export function setDisplay(patch: DisplayPatch): void {
  browserStore?.set(patch);
}
