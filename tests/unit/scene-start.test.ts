import { afterEach, describe, expect, it, vi } from 'vitest';
import { frameBitmaps } from '@/components/sections/home/dragon/renderer';
import { settle } from '@/components/sections/home/dragon/settled';

/*
 * The dragon's start (design §5 and §6.3; ledger Ruling 40), with fakes for the browser:
 * - the start gate (dragon/settled.ts) opens only after first contentful paint, the painting the
 *   theme shows is decoded, two animation frames and an idle moment, in that order, and cancel()
 *   leaves no observer, frame, idle callback or timer behind;
 * - the WebGL frames (renderer.ts) are fetched and decoded off the main thread as premultiplied
 *   bitmaps; a frame that does not load or decode makes the set null and closes the others.
 */

const FCP = 'first-contentful-paint';

class FakeObserver {
  static all: FakeObserver[] = [];
  static supportedEntryTypes: readonly string[] = ['paint'];
  observed: PerformanceObserverInit | null = null;
  disconnected = false;
  constructor(private readonly callback: PerformanceObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe(options: PerformanceObserverInit): void {
    this.observed = options;
  }
  disconnect(): void {
    this.disconnected = true;
  }
  /** Delivers paint entries with these names, as the browser does. */
  deliver(...names: string[]): void {
    const entries = names.map((name) => ({ name, entryType: 'paint', startTime: 100, duration: 0 }));
    const list = { getEntries: () => entries, getEntriesByName: (name: string) => entries.filter((entry) => entry.name === name), getEntriesByType: () => entries };
    this.callback(list as unknown as PerformanceObserverEntryList, this as unknown as PerformanceObserver);
  }
}

let frames = new Map<number, FrameRequestCallback>();
let idles = new Map<number, { readonly callback: IdleRequestCallback; readonly options: IdleRequestOptions | undefined }>();
let entries: { readonly name: string }[] = [];
let lastId = 0;

/** Fakes the paint observer, animation frames and (unless `idle` is false) idle callbacks. */
function install({ idle = true, painted = false, paintTypes = ['paint'] }: { idle?: boolean; painted?: boolean; paintTypes?: readonly string[] } = {}): void {
  FakeObserver.all = [];
  FakeObserver.supportedEntryTypes = paintTypes;
  frames = new Map();
  idles = new Map();
  entries = painted ? [{ name: FCP }] : [];
  lastId = 0;
  vi.stubGlobal('PerformanceObserver', FakeObserver);
  vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => entries.filter((entry) => entry.name === name) as unknown as PerformanceEntryList);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    lastId += 1;
    frames.set(lastId, callback);
    return lastId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  if (idle) {
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
      lastId += 1;
      idles.set(lastId, { callback, options });
      return lastId;
    });
    vi.stubGlobal('cancelIdleCallback', (id: number) => idles.delete(id));
  } else {
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
  }
}

/** Runs the callbacks of one animation frame. */
function runFrame(): void {
  const due = [...frames.values()];
  frames.clear();
  for (const callback of due) callback(0);
}

function runIdle(): void {
  const due = [...idles.values()];
  idles.clear();
  for (const { callback } of due) callback({ didTimeout: false, timeRemaining: () => 10 });
}

/** Lets pending promise callbacks run (microtasks only: no timer, frame or idle callback). */
async function microtasks(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

interface FakePainting {
  readonly decode: ReturnType<typeof vi.fn<() => Promise<void>>>;
  finish(): void;
  fail(): void;
}

/** A painting whose decode() settles when the test says so. */
function painting(): FakePainting {
  let finish = (): void => {};
  let fail = (): void => {};
  const decoded = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = () => reject(new Error('EncodingError'));
  });
  return { decode: vi.fn(() => decoded), finish: () => finish(), fail: () => fail() };
}

/** Starts the gate on `image` and tracks whether it has opened. */
function gate(image: FakePainting | null): { readonly pick: ReturnType<typeof vi.fn>; readonly opened: () => boolean; readonly cancel: () => void } {
  const pick = vi.fn(() => image as unknown as HTMLImageElement | null);
  const settling = settle(pick);
  let opened = false;
  void settling.settled.then(() => {
    opened = true;
  });
  return { pick, opened: () => opened, cancel: () => settling.cancel() };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the start gate', () => {
  it('waits for first contentful paint, then the painting, two frames and an idle moment', async () => {
    install();
    const image = painting();
    const { pick, opened } = gate(image);
    await microtasks();
    const [observer] = FakeObserver.all;
    expect(observer?.observed, 'a buffered paint observer').toEqual({ type: 'paint', buffered: true });
    observer?.deliver('first-paint');
    await microtasks();
    expect(pick, 'the painting is not looked at before first contentful paint').not.toHaveBeenCalled();
    expect(observer?.disconnected).toBe(false);
    observer?.deliver(FCP);
    await microtasks();
    expect(observer?.disconnected, 'the observer is done').toBe(true);
    expect(pick, 'the painting the theme shows, chosen now').toHaveBeenCalledTimes(1);
    expect(image.decode).toHaveBeenCalledTimes(1);
    expect(frames.size, 'no frame before the painting is decoded').toBe(0);
    image.finish();
    await microtasks();
    expect(frames.size).toBe(1);
    runFrame();
    await microtasks();
    expect([frames.size, idles.size], 'the second frame').toEqual([1, 0]);
    runFrame();
    await microtasks();
    expect(frames.size).toBe(0);
    expect([...idles.values()].map((entry) => entry.options), 'an idle callback, at most 1 s away').toEqual([{ timeout: 1000 }]);
    expect(opened()).toBe(false);
    runIdle();
    await microtasks();
    expect(opened()).toBe(true);
  });

  it('takes a first contentful paint that is already there (a client-side visit) without observing', async () => {
    install({ painted: true });
    const image = painting();
    const { pick } = gate(image);
    await microtasks();
    expect(FakeObserver.all).toHaveLength(0);
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it('skips the paint wait where the browser reports no paints', async () => {
    install({ paintTypes: ['mark', 'measure'] });
    const image = painting();
    const { pick } = gate(image);
    await microtasks();
    expect(FakeObserver.all).toHaveLength(0);
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it('is not held back by a painting that fails to decode, or by a missing one', async () => {
    install({ painted: true });
    const broken = painting();
    gate(broken);
    await microtasks();
    expect(frames.size).toBe(0);
    broken.fail();
    await microtasks();
    expect(frames.size, 'a failed decode is ignored').toBe(1);

    install({ painted: true });
    const missing = gate(null);
    await microtasks();
    expect(missing.pick).toHaveBeenCalledTimes(1);
    expect(frames.size, 'a missing painting is skipped').toBe(1);
  });

  it('without requestIdleCallback (Safari), opens a task after the two frames', async () => {
    install({ idle: false, painted: true });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { opened } = gate(null);
    await microtasks();
    runFrame();
    await microtasks();
    runFrame();
    await microtasks();
    expect(vi.getTimerCount(), 'one timer').toBe(1);
    expect(opened()).toBe(false);
    vi.advanceTimersByTime(0);
    await microtasks();
    expect(opened()).toBe(true);
  });

  describe('cancel() leaves nothing behind, and the gate never opens', () => {
    it('while it waits for first contentful paint', async () => {
      install();
      const { pick, opened, cancel } = gate(painting());
      await microtasks();
      cancel();
      expect(FakeObserver.all[0]?.disconnected, 'the observer is disconnected').toBe(true);
      FakeObserver.all[0]?.deliver(FCP);
      await microtasks();
      expect(pick).not.toHaveBeenCalled();
      expect([frames.size, idles.size, opened()]).toEqual([0, 0, false]);
    });

    it('while the painting decodes', async () => {
      install({ painted: true });
      const image = painting();
      const { opened, cancel } = gate(image);
      await microtasks();
      cancel();
      image.finish();
      await microtasks();
      expect([frames.size, idles.size, opened()], 'no frame is asked for').toEqual([0, 0, false]);
    });

    it('between the two frames', async () => {
      install({ painted: true });
      const { opened, cancel } = gate(null);
      await microtasks();
      runFrame();
      await microtasks();
      expect(frames.size).toBe(1);
      cancel();
      expect(frames.size, 'the second frame is cancelled').toBe(0);
      await microtasks();
      expect([idles.size, opened()]).toEqual([0, false]);
    });

    it('while it waits for an idle moment', async () => {
      install({ painted: true });
      const { opened, cancel } = gate(null);
      await microtasks();
      runFrame();
      await microtasks();
      runFrame();
      await microtasks();
      expect(idles.size).toBe(1);
      cancel();
      expect(idles.size, 'the idle callback is cancelled').toBe(0);
      await microtasks();
      expect(opened()).toBe(false);
    });

    it('while it waits for a task, without requestIdleCallback', async () => {
      install({ idle: false, painted: true });
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { opened, cancel } = gate(null);
      await microtasks();
      runFrame();
      await microtasks();
      runFrame();
      await microtasks();
      expect(vi.getTimerCount()).toBe(1);
      cancel();
      expect(vi.getTimerCount(), 'the timer is cleared').toBe(0);
      await microtasks();
      expect(opened()).toBe(false);
    });
  });
});

interface FakeBitmap {
  readonly from: string;
  readonly close: ReturnType<typeof vi.fn>;
}

/**
 * Fakes fetch (each URL answers as `answers` says: a status, or 'network' for a rejected fetch,
 * 'body' for a body that fails to read) and createImageBitmap ('decode' rejects it).
 */
function fakeNetwork(answers: Readonly<Record<string, number | 'network' | 'body' | 'decode'>> = {}): { readonly made: FakeBitmap[]; readonly decode: ReturnType<typeof vi.fn> } {
  const made: FakeBitmap[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    const answer = answers[url] ?? 200;
    if (answer === 'network') return Promise.reject(new TypeError('Failed to fetch'));
    const status = typeof answer === 'number' ? answer : 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      blob: () => (answer === 'body' ? Promise.reject(new TypeError('network error')) : Promise.resolve({ blobOf: url })),
    });
  });
  const decode = vi.fn((blob: { blobOf: string }, options: ImageBitmapOptions) => {
    void options;
    if (answers[blob.blobOf] === 'decode') return Promise.reject(new DOMException('The source image could not be decoded.', 'InvalidStateError'));
    const bitmap = { from: blob.blobOf, close: vi.fn() };
    made.push(bitmap);
    return Promise.resolve(bitmap);
  });
  vi.stubGlobal('createImageBitmap', decode);
  return { made, decode };
}

const URLS = ['/scene/dragon-up.webp', '/scene/dragon-level.webp', '/scene/dragon-down.webp', '/scene/dragon-tail.webp'] as const;

describe('the WebGL frames', () => {
  it('are fetched and decoded off the main thread as premultiplied bitmaps, in order', async () => {
    const { made, decode } = fakeNetwork();
    const bitmaps = await frameBitmaps(URLS);
    expect(decode.mock.calls).toEqual(URLS.map((url) => [{ blobOf: url }, { premultiplyAlpha: 'premultiply' }]));
    expect((bitmaps as unknown as FakeBitmap[] | null)?.map((bitmap) => bitmap.from)).toEqual([...URLS]);
    expect(made.every((bitmap) => bitmap.close.mock.calls.length === 0), 'none closed: the renderer uploads them').toBe(true);
  });

  for (const [failure, answer] of [
    ['a response that is not ok', 404],
    ['a fetch that fails', 'network'],
    ['a body that fails to read', 'body'],
    ['a picture that does not decode', 'decode'],
  ] as const) {
    it(`${failure} makes the set null, and the other frames are closed`, async () => {
      const { made, decode } = fakeNetwork({ '/scene/dragon-tail.webp': answer });
      expect(await frameBitmaps(URLS)).toBeNull();
      expect(made.map((bitmap) => bitmap.from)).toEqual(URLS.slice(0, 3));
      expect(made.map((bitmap) => bitmap.close.mock.calls.length), 'each other frame closed once').toEqual([1, 1, 1]);
      if (answer === 404) expect(decode, 'nothing decoded from a failed response').toHaveBeenCalledTimes(3);
    });
  }
});
