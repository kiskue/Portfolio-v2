import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MusicPlayerOptions } from '@/components/layout/music-player';

/*
 * The music store with fakes for the media element, the AudioContext and the lazy player chunk:
 * a failure before the player exists ends the session, and the next press starts a fresh one.
 */

class FakeAudio {
  static all: FakeAudio[] = [];
  static playResult: () => Promise<void> = () => Promise.resolve();
  preload = '';
  loop = false;
  muted = false;
  volume = 1;
  src = '';
  readonly play = vi.fn(() => FakeAudio.playResult());
  readonly pause = vi.fn();
  constructor() {
    FakeAudio.all.push(this);
  }
}

class FakeContext {
  static all: FakeContext[] = [];
  readonly resume = vi.fn(() => Promise.resolve());
  readonly close = vi.fn(() => Promise.resolve());
  constructor() {
    FakeContext.all.push(this);
  }
}

interface Fakes {
  readonly store: typeof import('@/components/layout/music-store');
  readonly createMusicPlayer: ReturnType<typeof vi.fn>;
  readonly release: () => void;
}

/** Loads a fresh store. The player chunk waits for `release()`, or fails when `chunkFails`. */
async function freshStore(chunkFails = false): Promise<Fakes> {
  vi.resetModules();
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const createMusicPlayer = vi.fn<(options: MusicPlayerOptions) => { start(): void; stop(): void }>(() => ({ start: vi.fn(), stop: vi.fn() }));
  vi.doMock('@/components/layout/music-player', async () => {
    await gate;
    if (chunkFails) throw new Error('chunk failed');
    return { createMusicPlayer };
  });
  const store = await import('@/components/layout/music-store');
  return { store, createMusicPlayer, release };
}

/** Lets pending promise callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function install(): void {
  FakeAudio.all = [];
  FakeAudio.playResult = () => Promise.resolve();
  FakeContext.all = [];
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('window', { AudioContext: FakeContext });
}

afterEach(() => {
  vi.doUnmock('@/components/layout/music-player');
  vi.unstubAllGlobals();
});

describe('the music store', () => {
  it('creates nothing until the first press, and then a muted element and a context inside it', async () => {
    install();
    const { store } = await freshStore();
    expect(FakeAudio.all).toHaveLength(0);
    expect(FakeContext.all).toHaveLength(0);
    expect(store.getMusicSnapshot()).toBe('off');
    store.toggleMusic('/a.mp3');
    expect(FakeAudio.all).toHaveLength(1);
    expect(FakeContext.all).toHaveLength(1);
    const [el] = FakeAudio.all;
    expect(el?.play).toHaveBeenCalledTimes(1);
    expect([el?.muted, el?.volume, el?.loop, el?.preload, el?.src]).toEqual([true, 0, true, 'none', '/a.mp3']);
    expect(store.getMusicSnapshot()).toBe('starting');
  });

  it('(a) a failed chunk ends the session, and the next press plays a fresh element at once', async () => {
    install();
    const { store, release } = await freshStore(true);
    store.toggleMusic('/a.mp3');
    release();
    await settle();
    expect(store.getMusicSnapshot()).toBe('off');
    const [first] = FakeAudio.all;
    expect(first?.pause).toHaveBeenCalled();
    expect(FakeContext.all[0]?.close).toHaveBeenCalled();
    store.toggleMusic('/a.mp3');
    expect(FakeAudio.all).toHaveLength(2);
    expect(FakeAudio.all[1]?.play).toHaveBeenCalledTimes(1);
    expect(FakeContext.all).toHaveLength(2);
    expect(store.getMusicSnapshot()).toBe('starting');
  });

  it('(b) a refused play() while the chunk loads ends the session, then a press starts afresh', async () => {
    install();
    FakeAudio.playResult = () => Promise.reject(new Error('NotAllowedError'));
    const { store, createMusicPlayer, release } = await freshStore();
    store.toggleMusic('/a.mp3');
    await settle();
    expect(store.getMusicSnapshot()).toBe('off');
    expect(FakeContext.all[0]?.close).toHaveBeenCalled();
    FakeAudio.playResult = () => Promise.resolve();
    store.toggleMusic('/a.mp3');
    expect(FakeAudio.all).toHaveLength(2);
    expect(FakeAudio.all[1]?.play).toHaveBeenCalledTimes(1);
    expect(store.getMusicSnapshot()).toBe('starting');
    release();
    await settle();
    expect(createMusicPlayer).toHaveBeenCalledTimes(1);
  });

  it('(c) a double press while loading hands the player over already stopping', async () => {
    install();
    const { store, createMusicPlayer, release } = await freshStore();
    store.toggleMusic('/a.mp3');
    store.toggleMusic('/a.mp3');
    expect(store.getMusicSnapshot()).toBe('stopping');
    expect(FakeAudio.all).toHaveLength(1);
    release();
    await settle();
    expect(createMusicPlayer).toHaveBeenCalledTimes(1);
    const options = createMusicPlayer.mock.calls[0]?.[0] as MusicPlayerOptions;
    // The real player stops at once when it is created in this status (it never fades in).
    expect(options.status()).toBe('stopping');
  });

  it("(d) a stale session's late import never hands over", async () => {
    install();
    FakeAudio.playResult = () => Promise.reject(new Error('NotAllowedError'));
    const { store, createMusicPlayer, release } = await freshStore();
    store.toggleMusic('/a.mp3');
    await settle();
    FakeAudio.playResult = () => Promise.resolve();
    store.toggleMusic('/a.mp3');
    release();
    await settle();
    expect(createMusicPlayer).toHaveBeenCalledTimes(1);
    const options = createMusicPlayer.mock.calls[0]?.[0] as MusicPlayerOptions;
    expect(options.el).toBe(FakeAudio.all[1]);
  });

  it('(e) a player that throws on creation ends the session, surfaces the bug, and the next press starts afresh', async () => {
    install();
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const { store, createMusicPlayer, release } = await freshStore();
    const bug = new Error('player bug');
    createMusicPlayer.mockImplementationOnce(() => {
      throw bug;
    });
    store.toggleMusic('/a.mp3');
    release();
    await settle();
    expect(store.getMusicSnapshot()).toBe('off');
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(bug);
    expect(FakeAudio.all[0]?.pause).toHaveBeenCalled();
    expect(FakeContext.all[0]?.close).toHaveBeenCalled();
    store.toggleMusic('/a.mp3');
    expect(FakeAudio.all).toHaveLength(2);
    expect(FakeAudio.all[1]?.play).toHaveBeenCalledTimes(1);
    expect(FakeContext.all).toHaveLength(2);
    expect(store.getMusicSnapshot()).toBe('starting');
  });

  it('presses after the player exists go to the player', async () => {
    install();
    const { store, createMusicPlayer, release } = await freshStore();
    store.toggleMusic('/a.mp3');
    release();
    await settle();
    const player = createMusicPlayer.mock.results[0]?.value as { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
    store.toggleMusic('/a.mp3');
    expect(store.getMusicSnapshot()).toBe('stopping');
    expect(player.stop).toHaveBeenCalledTimes(1);
    store.toggleMusic('/a.mp3');
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(FakeAudio.all).toHaveLength(1);
  });
});
