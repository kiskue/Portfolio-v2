import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebGLRenderer, type DragonRenderer, type WebGLFrames } from '@/components/sections/home/dragon/renderer';

/*
 * The dragon's WebGL build (renderer.ts createWebGLRenderer; design §5, ledger Ruling 40) on a fake
 * WebGL context. Tasks (MessageChannel posts), animation frames, fetch and createImageBitmap are
 * fakes that the test runs one at a time, so every WebGL call is stamped with the task it ran in:
 * - the link status is read in a later task than the one that queued the link;
 * - each upload runs in a task of its own, after that read;
 * - a stop during the KHR_parallel_shader_compile poll, or before any upload, ends the build with
 *   null, the context lost and every bitmap closed;
 * - so does a context lost during the poll, even where the browser answers false for it;
 * - a bug that throws mid-build still closes every bitmap.
 */

const LINK_STATUS = 0x8b82;
const COMPLETION_STATUS_KHR = 0x91b1;
const TEXTURE0 = 0x84c0;
const URLS: WebGLFrames = ['/up.webp', '/level.webp', '/down.webp', '/tail.webp'];

/** The task (or frame) now running; every fake WebGL call records it. */
let task = 0;
let tasks: (() => void)[] = [];
let frames: FrameRequestCallback[] = [];

class FakeChannel {
  readonly port1 = { onmessage: null as ((event: unknown) => void) | null, close: (): void => {} };
  readonly port2 = { postMessage: (): void => void tasks.push(() => this.port1.onmessage?.({})) };
}

interface Call {
  readonly name: string;
  readonly task: number;
  readonly args: readonly unknown[];
}

interface FakeGl {
  readonly gl: WebGLRenderingContext;
  readonly calls: Call[];
  /** What COMPLETION_STATUS_KHR answers while the context is not lost. */
  complete: boolean;
  /** Loses the context from outside (a GPU reset, say). */
  lose(): void;
  isLost(): boolean;
  /** A method that throws when called (a bug). */
  throwOn: string | null;
}

/**
 * A WebGL context that records every call. Constants read as numbers; `parallel` exposes
 * KHR_parallel_shader_compile; `answerWhenLost` is what COMPLETION_STATUS_KHR answers once the
 * context is lost (the WebGL extension says true; a browser that answered false must not hang).
 */
function fakeGl({ parallel = true, answerWhenLost = true }: { parallel?: boolean; answerWhenLost?: boolean } = {}): FakeGl {
  const calls: Call[] = [];
  let lost = false;
  const fake: FakeGl = {
    gl: undefined as unknown as WebGLRenderingContext,
    calls,
    complete: true,
    lose: () => {
      lost = true;
    },
    isLost: () => lost,
    throwOn: null,
  };
  const handlers: Record<string, (...args: never[]) => unknown> = {
    isContextLost: () => lost,
    getExtension: (name: string) => {
      if (name === 'WEBGL_lose_context') return { loseContext: () => fake.lose() };
      if (name === 'KHR_parallel_shader_compile' && parallel && !lost) return { COMPLETION_STATUS_KHR };
      return null;
    },
    getProgramParameter: (_program: unknown, name: number) => {
      if (name === COMPLETION_STATUS_KHR) return lost ? answerWhenLost : fake.complete;
      if (name === LINK_STATUS) return lost ? null : true;
      return null;
    },
    createProgram: () => (lost ? null : {}),
    createShader: () => (lost ? null : {}),
    createBuffer: () => (lost ? null : {}),
    createTexture: () => (lost ? null : {}),
    getUniformLocation: () => (lost ? null : {}),
  };
  const constants: Record<string, number> = { LINK_STATUS, TEXTURE0 };
  (fake as { gl: WebGLRenderingContext }).gl = new Proxy(
    {},
    {
      get(_target, name) {
        if (typeof name !== 'string') return undefined;
        if (/^[A-Z][A-Z0-9_]*$/.test(name)) return constants[name] ?? 1;
        return (...args: unknown[]) => {
          calls.push({ name, task, args });
          if (fake.throwOn === name) throw new Error(`${name} failed`);
          return handlers[name]?.(...(args as never[]));
        };
      },
    },
  ) as WebGLRenderingContext;
  return fake;
}

interface FakeBitmap {
  readonly from: string;
  readonly close: ReturnType<typeof vi.fn>;
}

/** Bitmaps made so far, in the order they were made. */
let bitmaps: FakeBitmap[] = [];

/** fetch and createImageBitmap, each answering in a later task, as a browser does. */
function fakeNetwork(): void {
  vi.stubGlobal('fetch', (url: string) => new Promise((resolve) => tasks.push(() => resolve({ ok: true, blob: () => Promise.resolve({ blobOf: url }) }))));
  vi.stubGlobal(
    'createImageBitmap',
    (blob: { blobOf: string }) =>
      new Promise((resolve) =>
        tasks.push(() => {
          const bitmap = { from: blob.blobOf, close: vi.fn() };
          bitmaps.push(bitmap);
          resolve(bitmap);
        }),
      ),
  );
}

/** Lets every pending promise callback run. */
async function microtasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

/** Runs the next task, or else the next frame; false when nothing is scheduled. */
async function step(): Promise<boolean> {
  const next = tasks.shift();
  if (next) {
    task += 1;
    next();
  } else if (frames.length > 0) {
    task += 1;
    const due = frames;
    frames = [];
    for (const callback of due) callback(0);
  } else {
    return false;
  }
  await microtasks();
  return true;
}

/** Runs tasks and frames until `done()` holds; false when it never does within `limit` steps. */
async function runUntil(done: () => boolean, limit = 200): Promise<boolean> {
  await microtasks();
  for (let count = 0; count < limit; count += 1) {
    if (done()) return true;
    if (!(await step())) return done();
  }
  return done();
}

interface Build {
  readonly settled: () => boolean;
  readonly result: () => DragonRenderer | null | undefined;
  readonly error: () => unknown;
}

function build(fake: FakeGl, stopped: () => boolean = () => false): Build {
  let settled = false;
  let result: DragonRenderer | null | undefined;
  let error: unknown;
  createWebGLRenderer(fake.gl, URLS, stopped).then(
    (value) => {
      settled = true;
      result = value;
    },
    (reason: unknown) => {
      settled = true;
      error = reason;
    },
  );
  return { settled: () => settled, result: () => result, error: () => error };
}

const named = (fake: FakeGl, name: string): Call[] => fake.calls.filter((call) => call.name === name);
const linkReads = (fake: FakeGl): Call[] => named(fake, 'getProgramParameter').filter((call) => call.args[1] === LINK_STATUS);
const polls = (fake: FakeGl): Call[] => named(fake, 'getProgramParameter').filter((call) => call.args[1] === COMPLETION_STATUS_KHR);

/** Every bitmap made was closed exactly once. */
function allClosedOnce(): boolean {
  return bitmaps.length > 0 && bitmaps.every((bitmap) => bitmap.close.mock.calls.length === 1);
}

beforeEach(() => {
  task = 0;
  tasks = [];
  frames = [];
  bitmaps = [];
  vi.stubGlobal('MessageChannel', FakeChannel);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  fakeNetwork();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the WebGL build, task by task', () => {
  for (const parallel of [false, true]) {
    it(`reads the link status in a later task than the link, then uploads one frame per task (${parallel ? 'with' : 'without'} KHR_parallel_shader_compile)`, async () => {
      const fake = fakeGl({ parallel });
      const made = build(fake);
      expect(await runUntil(made.settled)).toBe(true);
      expect(made.result(), 'a renderer').not.toBeNull();
      const links = named(fake, 'linkProgram');
      const reads = linkReads(fake);
      expect(links).toHaveLength(2);
      expect(reads.length, 'link status read').toBeGreaterThan(0);
      const linkedIn = Math.max(...links.map((call) => call.task));
      const firstRead = reads[0]?.task ?? -1;
      expect(firstRead - linkedIn, `tasks between the link (task ${linkedIn}) and its status read (task ${firstRead})`).toBeGreaterThanOrEqual(1);
      const uploads = named(fake, 'texImage2D');
      expect(uploads.map((call) => (call.args[5] as FakeBitmap).from), 'the four frames, in order').toEqual([...URLS]);
      expect(new Set(uploads.map((call) => call.task)).size, `upload tasks ${uploads.map((call) => call.task).join(', ')}`).toBe(4);
      expect(Math.min(...uploads.map((call) => call.task)), 'the uploads come after the link status read').toBeGreaterThan(firstRead);
      expect(bitmaps.map((bitmap) => bitmap.close.mock.calls.length), 'each bitmap closed once').toEqual([1, 1, 1, 1]);
      expect(fake.isLost(), 'the context is kept').toBe(false);
    });
  }

  it('with KHR_parallel_shader_compile, polls once a frame until the programs are done, and only then reads their link status', async () => {
    const fake = fakeGl({ parallel: true });
    fake.complete = false;
    const made = build(fake);
    expect(await runUntil(() => polls(fake).length > 0)).toBe(true);
    for (let frame = 0; frame < 3; frame += 1) expect(await step()).toBe(true);
    expect(linkReads(fake), 'no link status read while compiling').toHaveLength(0);
    const pollTasks = new Set(polls(fake).map((call) => call.task));
    expect(pollTasks.size, 'one poll per frame').toBeGreaterThanOrEqual(3);
    fake.complete = true;
    expect(await runUntil(made.settled)).toBe(true);
    expect(made.result()).not.toBeNull();
    expect(linkReads(fake).length).toBeGreaterThan(0);
  });
});

describe('a stop ends the build: null, the context lost, every bitmap closed', () => {
  it('while the frames load, with no WebGL call after it but losing the context', async () => {
    const fake = fakeGl({ parallel: true });
    let stop = false;
    const made = build(fake, () => stop);
    expect(await runUntil(() => named(fake, 'linkProgram').length === 2)).toBe(true);
    expect(bitmaps, 'no frame in yet').toHaveLength(0);
    stop = true;
    const before = fake.calls.length;
    expect(await runUntil(made.settled), 'the build ended').toBe(true);
    expect(made.result()).toBeNull();
    const after = fake.calls.slice(before).map((call) => call.name);
    expect(
      after.filter((name) => name !== 'isContextLost' && name !== 'getExtension'),
      'WebGL calls after the stop',
    ).toEqual([]);
    expect(fake.isLost(), 'the context is lost').toBe(true);
    expect(bitmaps).toHaveLength(4);
    expect(allClosedOnce(), 'every bitmap closed').toBe(true);
  });

  it('during the KHR_parallel_shader_compile poll', async () => {
    const fake = fakeGl({ parallel: true });
    fake.complete = false;
    let stop = false;
    const made = build(fake, () => stop);
    expect(await runUntil(() => polls(fake).length > 0)).toBe(true);
    stop = true;
    expect(await runUntil(made.settled), 'the build ended').toBe(true);
    expect(made.result()).toBeNull();
    expect(fake.isLost(), 'the context is lost').toBe(true);
    expect(named(fake, 'texImage2D')).toHaveLength(0);
    expect(allClosedOnce(), 'every bitmap closed').toBe(true);
    expect(bitmaps).toHaveLength(4);
  });

  for (const before of [0, 1, 2, 3]) {
    it(`before upload ${before + 1} of 4`, async () => {
      const fake = fakeGl({ parallel: false });
      let stop = false;
      const made = build(fake, () => stop);
      // Run until the build has read the link status and made `before` uploads, and waits for its next task.
      expect(await runUntil(() => linkReads(fake).length > 0 && named(fake, 'texImage2D').length === before)).toBe(true);
      expect(named(fake, 'texImage2D'), 'uploads so far').toHaveLength(before);
      stop = true;
      expect(await runUntil(made.settled), 'the build ended').toBe(true);
      expect(made.result()).toBeNull();
      expect(named(fake, 'texImage2D'), 'no upload after the stop').toHaveLength(before);
      expect(fake.isLost(), 'the context is lost').toBe(true);
      expect(bitmaps).toHaveLength(4);
      expect(allClosedOnce(), 'every bitmap closed').toBe(true);
    });
  }
});

describe('a context lost during the KHR_parallel_shader_compile poll ends the build', () => {
  for (const answerWhenLost of [true, false]) {
    it(`when the browser answers ${String(answerWhenLost)} for a lost context`, async () => {
      const fake = fakeGl({ parallel: true, answerWhenLost });
      fake.complete = false;
      const made = build(fake);
      expect(await runUntil(() => polls(fake).length > 0)).toBe(true);
      fake.lose();
      expect(await runUntil(made.settled, 50), 'the build ended within 50 tasks or frames').toBe(true);
      expect(made.result()).toBeNull();
      expect(named(fake, 'texImage2D')).toHaveLength(0);
      expect(allClosedOnce(), 'every bitmap closed').toBe(true);
    });
  }
});

it('a bug that throws mid-build still closes every bitmap, and the error surfaces', async () => {
  const fake = fakeGl({ parallel: false });
  fake.throwOn = 'bufferData';
  const made = build(fake);
  expect(await runUntil(made.settled)).toBe(true);
  expect(made.error(), 'the error rejects the build (the scene reports it)').toBeInstanceOf(Error);
  expect(bitmaps).toHaveLength(4);
  expect(allClosedOnce(), 'every bitmap closed').toBe(true);
});
