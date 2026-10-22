import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, useBrand, type BrandScopeProps, type BrandState } from '@/components/showcase/brand-scope';
import type { BrandId } from '@/content/types';

/*
 * BrandScope's URL sync after hydration (I1; design §5.5: the choice persists in ?brand= through
 * history.replaceState, and the server renders the default brand).
 *
 * On a static page the scope's URL reader (BrandParamSync, inside Suspense) mounts in a commit of
 * its own after hydration, and Next.js follows history.replaceState only from the hydration
 * commit's effects on. A brand picked in between used to be lost (never written) and then undone
 * (the reader trusted useSearchParams, which still said the default). These tests run the real
 * BrandScope, reader and useBrand through a minimal hook runtime (the unit suite has no DOM):
 * - Suspense boundaries are held (fallback) until `runtime.release()`: the reader mounts then;
 * - `router` is Next.js: what useSearchParams returns, and whether it follows replaceState yet;
 * - `window` is a stub whose history.replaceState moves the URL (and the router, when it follows).
 * tests/e2e/brand-scope.spec.ts checks the same in the browser.
 */

const { runtime, router } = vi.hoisted(() => {
  type Deps = readonly unknown[] | undefined;
  interface Cell {
    init?: boolean;
    value?: unknown;
    deps?: Deps;
    setter?: (update: unknown) => void;
    cleanup?: () => void;
  }
  interface Instance {
    readonly cells: Cell[];
    seen: boolean;
  }
  interface Effect {
    readonly cell: Cell;
    readonly create: () => unknown;
  }
  interface Element {
    readonly type: unknown;
    readonly key: string | null;
    readonly props: Readonly<Record<string, unknown>>;
  }

  const SUSPENSE = Symbol.for('react.suspense');
  const FRAGMENT = Symbol.for('react.fragment');
  const CONTEXT = Symbol.for('react.context');
  const isContext = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && (value as { $$typeof?: unknown }).$$typeof === CONTEXT;

  const instances = new Map<string, Instance>();
  const providers = new Map<unknown, unknown>();
  let hosts: Readonly<Record<string, unknown>>[] = [];
  let current: Instance | null = null;
  let cursor = 0;
  let own: Effect[] = [];
  let queue: Effect[] = [];
  let dirty = false;
  let held = true;
  let ids = 0;
  let root: () => unknown = () => null;

  function cell(): Cell {
    if (current === null) throw new Error('A hook ran outside a component.');
    const next = current.cells[cursor] ?? {};
    current.cells[cursor] = next;
    cursor += 1;
    return next;
  }
  const changed = (prev: Deps, deps: Deps): boolean =>
    prev === undefined || deps === undefined || prev.length !== deps.length || deps.some((dep, index) => !Object.is(dep, prev[index]));

  const hooks = {
    useState(initial: unknown): [unknown, (update: unknown) => void] {
      const state = cell();
      if (!state.init) {
        state.init = true;
        state.value = typeof initial === 'function' ? (initial as () => unknown)() : initial;
        state.setter = (update) => {
          const next = typeof update === 'function' ? (update as (prev: unknown) => unknown)(state.value) : update;
          if (Object.is(next, state.value)) return;
          state.value = next;
          dirty = true;
        };
      }
      return [state.value, state.setter as (update: unknown) => void];
    },
    useRef(initial: unknown): unknown {
      const ref = cell();
      if (!ref.init) {
        ref.init = true;
        ref.value = { current: initial };
      }
      return ref.value;
    },
    useMemo(factory: () => unknown, deps: Deps): unknown {
      const memo = cell();
      if (!memo.init || changed(memo.deps, deps)) {
        memo.init = true;
        memo.deps = deps;
        memo.value = factory();
      }
      return memo.value;
    },
    useCallback(callback: unknown, deps: Deps): unknown {
      return hooks.useMemo(() => callback, deps);
    },
    useEffect(create: () => unknown, deps: Deps): void {
      const effect = cell();
      if (effect.init && !changed(effect.deps, deps)) return;
      effect.init = true;
      effect.deps = deps;
      own.push({ cell: effect, create });
    },
    useId(): unknown {
      const id = cell();
      if (!id.init) {
        id.init = true;
        id.value = `:r${ids++}:`;
      }
      return id.value;
    },
    use(usable: unknown): unknown {
      if (!isContext(usable)) throw new Error('Only use(context) is supported here.');
      return providers.has(usable) ? providers.get(usable) : null;
    },
  };

  /** Renders a tree: function components with their hook cells, providers, held Suspense, host elements. */
  function walk(node: unknown, path: string): void {
    if (node === null || node === undefined || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}.${index}`));
      return;
    }
    const { type, key, props } = node as Element;
    const at = `${path}/${typeof type === 'function' ? type.name : String(typeof type === 'string' ? type : 'node')}${key === null ? '' : `#${key}`}`;
    if (typeof type === 'string') {
      hosts.push(props);
      walk(props.children, at);
    } else if (type === FRAGMENT) {
      walk(props.children, at);
    } else if (type === SUSPENSE) {
      // A client-only boundary on a static page: its content mounts after hydration (release()).
      if (!held) walk(props.children, at);
    } else if (isContext(type)) {
      const outer = providers.has(type) ? { value: providers.get(type) } : null;
      providers.set(type, props.value);
      walk(props.children, at);
      if (outer) providers.set(type, outer.value);
      else providers.delete(type);
    } else if (typeof type === 'function') {
      const instance = instances.get(at) ?? { cells: [], seen: false };
      instances.set(at, instance);
      instance.seen = true;
      const outer = { current, cursor, own };
      current = instance;
      cursor = 0;
      own = [];
      const output = (type as (props: unknown) => unknown)(props);
      const effects = own;
      ({ current, cursor, own } = outer);
      walk(output, at);
      // Children's effects run before their parent's, each component's in order (as in React).
      queue.push(...effects);
    } else {
      throw new Error(`Unsupported element type: ${String(type)}`);
    }
  }

  /** One render and commit: unmounts what left the tree, then runs the changed effects (cleanups first). */
  function commit(): void {
    for (const instance of instances.values()) instance.seen = false;
    hosts = [];
    queue = [];
    walk(root(), 'root');
    for (const [at, instance] of instances) {
      if (instance.seen) continue;
      for (const effect of instance.cells) effect.cleanup?.();
      instances.delete(at);
    }
    const effects = queue;
    for (const { cell: effect } of effects) {
      effect.cleanup?.();
      effect.cleanup = undefined;
    }
    for (const { cell: effect, create } of effects) {
      const cleanup = create();
      effect.cleanup = typeof cleanup === 'function' ? (cleanup as () => void) : undefined;
    }
  }

  /** Re-renders until no state changes, like React after an event or a commit's effects. */
  function flush(): void {
    let rounds = 0;
    do {
      dirty = false;
      commit();
      rounds += 1;
      if (rounds > 25) throw new Error('The tree keeps re-rendering.');
    } while (dirty);
  }

  const runtime = {
    hooks,
    /** Hydration: renders the tree with every Suspense boundary still on its fallback. */
    mount(render: () => unknown): void {
      for (const instance of instances.values()) for (const effect of instance.cells) effect.cleanup?.();
      instances.clear();
      root = render;
      held = true;
      flush();
    },
    /** The separate commit after hydration: the Suspense content (the URL reader) mounts. */
    release(): void {
      held = false;
      flush();
    },
    /** An event handler, then the re-render it causes. */
    act(handler: () => void = () => undefined): void {
      handler();
      dirty = true;
      flush();
    },
    /** Next.js re-renders its consumers (its router state changed). */
    invalidate(): void {
      dirty = true;
    },
    /** Props of the first host element that matches. */
    host(match: (props: Readonly<Record<string, unknown>>) => boolean): Readonly<Record<string, unknown>> | undefined {
      return hosts.find(match);
    },
  };

  /** Next.js as BrandScope sees it: what useSearchParams says, and whether it follows replaceState yet. */
  const router = { pathname: '/', search: '', follows: true };

  return { runtime, router };
});

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), ...runtime.hooks }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(router.search),
  usePathname: () => router.pathname,
}));

// ─── The browser ─────────────────────────────────────────────────────────────────────────

const location = { pathname: '/', search: '', hash: '' };
const replaceState = vi.fn((_state: unknown, _unused: string, url: string) => {
  const next = new URL(url, 'http://localhost');
  location.pathname = next.pathname;
  location.search = next.search;
  location.hash = next.hash;
  // Once Next.js follows history (its patch runs with the hydration commit's effects), it takes the
  // new URL and re-renders its useSearchParams consumers.
  if (router.follows) {
    router.pathname = next.pathname;
    router.search = next.search;
    runtime.invalidate();
  }
});

/** Loads a URL: the browser and Next.js agree on it. */
function load(href: string): void {
  const url = new URL(href, 'http://localhost');
  Object.assign(location, { pathname: url.pathname, search: url.search, hash: url.hash });
  Object.assign(router, { pathname: url.pathname, search: url.search, follows: true });
}

const href = (): string => `${location.pathname}${location.search}${location.hash}`;

beforeEach(() => {
  replaceState.mockClear();
  vi.stubGlobal('window', { location, history: { replaceState } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── The scope under test ────────────────────────────────────────────────────────────────

interface Probe {
  /** The scope's state as its last consumer render saw it. */
  readonly state: () => BrandState;
  /** Every brand the consumer rendered with, in order (repeats collapsed): an undo would show. */
  readonly seen: BrandId[];
  /** data-brand-ready on the wrapper ('' once the scope follows the URL). */
  readonly ready: () => unknown;
}

function Consumer({ onRender }: { readonly onRender: (state: BrandState) => void }): null {
  onRender(useBrand());
  return null;
}

/** Hydrates a BrandScope with one consumer (as BrandSwitcher reads it); the reader is still held. */
function hydrate(props: Omit<BrandScopeProps, 'children'>): Probe {
  let last: BrandState | null = null;
  const seen: BrandId[] = [];
  const onRender = (state: BrandState): void => {
    last = state;
    if (seen.at(-1) !== state.brand) seen.push(state.brand);
  };
  runtime.mount(() => createElement(BrandScope, props as BrandScopeProps, createElement(Consumer, { onRender })));
  return {
    state: () => {
      if (last === null) throw new Error('The consumer never rendered.');
      return last;
    },
    seen,
    ready: () => runtime.host((attributes) => 'data-brand-scope' in attributes)?.['data-brand-ready'],
  };
}

const citizen = brandScopeProps('citizen');
const responder = brandScopeProps('responder');

// ─── A choice made before the reader mounts ──────────────────────────────────────────────

describe('BrandScope: a brand picked right after hydration', () => {
  it('is held, then written once the reader mounts, and never undone', () => {
    load('/projects/defensys-citizen#screens');
    // Hydration commit: Next.js does not follow history.replaceState yet.
    router.follows = false;
    const scope = hydrate(citizen);
    expect(scope.state().brand).toBe('smile-safe-taytay');
    expect(scope.ready()).toBeUndefined();

    runtime.act(() => scope.state().setBrand('1hope'));
    expect(scope.state().brand).toBe('1hope');
    // Not written yet: Next.js would miss it, and its useSearchParams would keep saying the default.
    expect(replaceState).not.toHaveBeenCalled();

    // The hydration commit's effects ran (Next.js follows history now); the reader mounts.
    router.follows = true;
    runtime.release();
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(href()).toBe('/projects/defensys-citizen?brand=1hope#screens');
    expect(router.search).toBe('?brand=1hope');
    expect(scope.state().brand).toBe('1hope');
    expect(scope.seen).toEqual(['smile-safe-taytay', '1hope']);
    expect(scope.ready()).toBe('');
  });

  it('writes only the latest of several early choices', () => {
    load('/projects/defensys-citizen');
    router.follows = false;
    const scope = hydrate(citizen);
    runtime.act(() => scope.state().setBrand('1hope'));
    runtime.act(() => scope.state().setBrand('sjdm-app'));
    router.follows = true;
    runtime.release();
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(href()).toBe('/projects/defensys-citizen?brand=sjdm-app');
    expect(scope.seen).toEqual(['smile-safe-taytay', '1hope', 'sjdm-app']);
  });

  it('leaves the URL clean when the early choice goes back to the default', () => {
    load('/projects/defensys-citizen');
    router.follows = false;
    const scope = hydrate(citizen);
    runtime.act(() => scope.state().setBrand('1hope'));
    runtime.act(() => scope.state().setBrand('smile-safe-taytay'));
    router.follows = true;
    runtime.release();
    expect(href()).toBe('/projects/defensys-citizen');
    expect(replaceState.mock.calls.every(([, , url]) => !url.includes('brand='))).toBe(true);
    expect(scope.seen).toEqual(['smile-safe-taytay', '1hope', 'smile-safe-taytay']);
  });

  it('wins over the brand the URL arrived with (the user chose after the page loaded)', () => {
    load('/projects/defensys-citizen?brand=aero-app');
    router.follows = false;
    const scope = hydrate(citizen);
    // The server rendered the default; the URL's brand applies once the reader mounts...
    expect(scope.state().brand).toBe('smile-safe-taytay');
    runtime.act(() => scope.state().setBrand('sjdm-app'));
    router.follows = true;
    runtime.release();
    // ...but the user picked first, so their choice is written and kept.
    expect(href()).toBe('/projects/defensys-citizen?brand=sjdm-app');
    expect(scope.state().brand).toBe('sjdm-app');
    expect(scope.seen).toEqual(['smile-safe-taytay', 'sjdm-app']);
  });

  it('is written under the scope’s own key (?rbrand=), leaving the other keys alone', () => {
    load('/showcase?brand=1hope&app=responder');
    router.follows = false;
    const scope = hydrate({ ...responder, param: 'rbrand' });
    runtime.act(() => scope.state().setBrand('sjdm'));
    expect(replaceState).not.toHaveBeenCalled();
    router.follows = true;
    runtime.release();
    expect(href()).toBe('/showcase?brand=1hope&app=responder&rbrand=sjdm');
    expect(scope.state().brand).toBe('sjdm');
    expect(scope.seen).toEqual(['defensys', 'sjdm']);
  });
});

// ─── The reader takes the live URL ───────────────────────────────────────────────────────

describe('BrandScope: the URL reader', () => {
  it('takes the brand from window.location, not from a useSearchParams value that trails it', () => {
    // The URL holds a brand Next.js has not rendered yet (written before it followed history).
    load('/projects/defensys-citizen?brand=aero-app');
    router.search = '';
    const scope = hydrate(citizen);
    runtime.release();
    expect(scope.state().brand).toBe('aero-app');
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('never lets a late useSearchParams value undo a newer choice', () => {
    load('/projects/defensys-citizen');
    const scope = hydrate(citizen);
    runtime.release();
    // Two quick picks; Next.js has not re-rendered either write yet.
    router.follows = false;
    runtime.act(() => scope.state().setBrand('1hope'));
    runtime.act(() => scope.state().setBrand('sjdm-app'));
    expect(href()).toBe('/projects/defensys-citizen?brand=sjdm-app');
    // Next.js now renders the first write: its value says 1hope, the URL says sjdm-app.
    router.search = '?brand=1hope';
    runtime.act();
    expect(scope.state().brand).toBe('sjdm-app');
    // ...and then the second.
    router.search = '?brand=sjdm-app';
    runtime.act();
    expect(scope.seen).toEqual(['smile-safe-taytay', '1hope', 'sjdm-app']);
  });

  it('follows a URL another scope on the same key writes', () => {
    load('/showcase');
    const scope = hydrate(citizen);
    runtime.release();
    // Another scope on ?brand= (Showcase's filter bar) writes; Next.js follows and re-renders.
    runtime.act(() => window.history.replaceState(null, '', '/showcase?app=citizen&brand=1hope'));
    expect(scope.state().brand).toBe('1hope');
  });
});

// ─── Once live ───────────────────────────────────────────────────────────────────────────

describe('BrandScope: once the reader is live', () => {
  it('writes a choice at once with useSearchParam’s rules: other params and the #hash stay, the default removes the key', () => {
    load('/projects/defensys-citizen?ref=home#screens');
    const scope = hydrate(citizen);
    runtime.release();
    expect(replaceState).not.toHaveBeenCalled();

    runtime.act(() => scope.state().setBrand('1hope'));
    expect(href()).toBe('/projects/defensys-citizen?ref=home&brand=1hope#screens');
    runtime.act(() => scope.state().setBrand('smile-safe-taytay'));
    expect(href()).toBe('/projects/defensys-citizen?ref=home#screens');
    // An id outside the scope's options is ignored.
    runtime.act(() => scope.state().setBrand('sjdm'));
    expect(replaceState).toHaveBeenCalledTimes(2);
    expect(scope.state().brand).toBe('smile-safe-taytay');
  });
});
