import { expect, test, type Page } from '@playwright/test';
import { collectConsoleProblems, describeConsoleProblems, idleAfterLoad } from '../support/console';
import { DRAGON, dragonState, flying, navigate } from '../support/dragon';
import { hydrated } from '../support/page';

/*
 * The dragon's WebGL renderer, in the gate (design §3.3; ledger ruling 26). The default headless
 * Chromium renders WebGL in software (SwiftShader), where the dragon flies as stacked frames on
 * purpose (renderer.ts: drawing on the CPU, and the compositor's read-back logs a console warning),
 * so this file launches Chromium on the GPU (ANGLE on Direct3D 11). Desktop project only.
 *
 * The tests skip only when an independent probe, run before Home loads, finds no hardware WebGL in
 * this browser. So a regression that makes the dragon fall back to its frames on a GPU fails here
 * instead of skipping.
 */

// One worker per file, tests in order (see smoke.spec.ts for why).
test.describe.configure({ mode: 'default' });

test.use({ reducedMotion: 'no-preference', launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } });

/** Software WebGL renderers. Written again here on purpose: the probe must not share renderer.ts's rule. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * Skips the test unless this browser has hardware WebGL: on about:blank, a detached canvas asks for
 * a context that refuses a major performance caveat, and its renderer's name must not be software.
 */
async function requireHardwareWebGL(page: Page): Promise<void> {
  await page.goto('about:blank');
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!gl) return null;
    let name = String(gl.getParameter(gl.RENDERER));
    if (name === 'WebKit WebGL') {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    }
    return name;
  });
  test.skip(renderer === null || SOFTWARE.test(renderer), `no hardware WebGL in this browser (${renderer ?? 'no context'})`);
}

/** What watchBitmaps saw: the page's ImageBitmaps and its texture uploads. */
interface BitmapWatch {
  /** Each createImageBitmap call: the source's type and its premultiplyAlpha option. */
  readonly calls: string[];
  /** Bitmaps made, and those not closed yet. */
  created: number;
  open: number;
  /** Each texImage2D call: the source's type. */
  readonly uploads: string[];
}

/**
 * Watches, before any page script runs, every ImageBitmap the page makes and closes, and what each
 * texImage2D uploads (renderer.ts decodes the WebGL frames off the main thread as bitmaps and closes
 * each one; an upload from an <img> would decode it again on the main thread).
 */
async function watchBitmaps(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const watch: BitmapWatch = { calls: [], created: 0, open: 0, uploads: [] };
    (window as unknown as { __bitmaps: BitmapWatch }).__bitmaps = watch;
    const open = new Set<ImageBitmap>();
    const typeOf = (value: unknown): string => (value !== null && typeof value === 'object' ? value.constructor.name : typeof value);
    const create = window.createImageBitmap.bind(window) as (...args: unknown[]) => Promise<ImageBitmap>;
    window.createImageBitmap = ((...args: unknown[]) => {
      const options = args.find((value, index) => index > 0 && typeof value === 'object') as ImageBitmapOptions | undefined;
      watch.calls.push(`${typeOf(args[0])} ${options?.premultiplyAlpha ?? 'default'}`);
      return create(...args).then((bitmap) => {
        watch.created += 1;
        open.add(bitmap);
        watch.open = open.size;
        return bitmap;
      });
    }) as typeof window.createImageBitmap;
    const close = ImageBitmap.prototype.close;
    ImageBitmap.prototype.close = function closeBitmap(this: ImageBitmap) {
      open.delete(this);
      watch.open = open.size;
      close.call(this);
    };
    const texImage2D = WebGLRenderingContext.prototype.texImage2D as (...args: unknown[]) => void;
    WebGLRenderingContext.prototype.texImage2D = function upload(this: WebGLRenderingContext, ...args: unknown[]) {
      watch.uploads.push(typeOf(args.at(-1)));
      texImage2D.apply(this, args);
    } as typeof WebGLRenderingContext.prototype.texImage2D;
  });
}

async function bitmaps(page: Page): Promise<BitmapWatch> {
  return page.evaluate(() => (window as unknown as { __bitmaps: BitmapWatch }).__bitmaps);
}

/** The four frames only the WebGL renderer uses (the stacked fallback uses dragon-full-*). */
const WEBGL_FRAMES = /\/scene\/dragon-(up|level|down|tail)\.webp$/;

test('on the GPU the dragon flies in WebGL, quietly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one GPU browser is enough: the desktop project');
  await requireHardwareWebGL(page);
  const problems = collectConsoleProblems(page);
  await page.goto('/', { waitUntil: 'load' });
  await flying(page);
  expect((await dragonState(page)).renderer, 'the renderer').toBe('webgl');
  await expect(page.locator(`${DRAGON} canvas`)).toHaveCount(1);
  const first = await dragonState(page);
  await page.waitForTimeout(500);
  expect((await dragonState(page)).transform, 'the dragon moved in 500 ms').not.toBe(first.transform);
  await idleAfterLoad(page, 6_000);
  expect(describeConsoleProblems(problems)).toEqual([]);
});

test('on the GPU, Home → About → Home five times leaks nothing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one GPU browser is enough: the desktop project');
  test.setTimeout(60_000);
  await requireHardwareWebGL(page);
  const problems = collectConsoleProblems(page);
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await flying(page);
  expect((await dragonState(page)).renderer, 'the renderer').toBe('webgl');
  for (let round = 1; round <= 5; round += 1) {
    await navigate(page, 'About');
    await expect(page, `round ${round}: on About`).toHaveURL(/\/about$/);
    await expect(page.locator(DRAGON), `round ${round}: no dragon on About`).toHaveCount(0);
    await navigate(page, 'Home');
    await expect(page, `round ${round}: back on Home`).toHaveURL(/\/$/);
    await expect(page.locator(DRAGON), `round ${round}: the dragon is ready, in WebGL`).toHaveAttribute('data-renderer', 'webgl');
  }
  expect(await page.evaluate(() => document.querySelectorAll('canvas').length), 'canvases in the document').toBeLessThanOrEqual(1);
  expect(describeConsoleProblems(problems)).toEqual([]);
});

test('on the GPU the frames are decoded off the main thread, and every bitmap is closed', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one GPU browser is enough: the desktop project');
  await requireHardwareWebGL(page);
  await watchBitmaps(page);
  const problems = collectConsoleProblems(page);
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator(DRAGON)).toHaveAttribute('data-renderer', 'webgl');
  const watch = await bitmaps(page);
  expect(watch.calls, 'createImageBitmap calls: from the fetched files, premultiplied').toEqual(['Blob premultiply', 'Blob premultiply', 'Blob premultiply', 'Blob premultiply']);
  expect(watch.uploads, 'texImage2D uploads').toEqual(['ImageBitmap', 'ImageBitmap', 'ImageBitmap', 'ImageBitmap']);
  expect({ created: watch.created, open: watch.open }, 'bitmaps made, and left open').toEqual({ created: 4, open: 0 });
  expect(describeConsoleProblems(problems)).toEqual([]);
});

test('on the GPU, leaving Home while the frames load closes every bitmap', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one GPU browser is enough: the desktop project');
  await requireHardwareWebGL(page);
  await watchBitmaps(page);
  const problems = collectConsoleProblems(page);
  // Hold the WebGL frames until Home has been left.
  let release = (): void => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const held: string[] = [];
  await page.route(WEBGL_FRAMES, async (route) => {
    held.push(new URL(route.request().url()).pathname);
    await released;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'load' });
  await hydrated(page);
  await expect.poll(() => held.length, { message: 'the four WebGL frames requested and held' }).toBe(4);
  await navigate(page, 'About');
  await expect(page).toHaveURL(/\/about$/);
  release();
  await expect.poll(async () => (await bitmaps(page)).created, { message: 'the frames arrived after Home was left' }).toBe(4);
  await expect.poll(async () => (await bitmaps(page)).open, { message: 'bitmaps left open' }).toBe(0);
  await expect(page.locator(DRAGON)).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelectorAll('canvas').length), 'canvases in the document').toBe(0);
  expect(describeConsoleProblems(problems)).toEqual([]);
});

test('on the GPU, a frame that does not decode sends the stacked frames instead, closing the others', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one GPU browser is enough: the desktop project');
  await requireHardwareWebGL(page);
  await watchBitmaps(page);
  const problems = collectConsoleProblems(page);
  await page.route('**/scene/dragon-tail.webp', (route) => route.fulfill({ status: 200, contentType: 'image/webp', body: 'not a picture' }));
  await page.goto('/', { waitUntil: 'load' });
  await flying(page);
  expect((await dragonState(page)).renderer, 'the renderer').toBe('images');
  await expect(page.locator(`${DRAGON} img`)).toHaveCount(3);
  expect(await page.evaluate(() => document.querySelectorAll('canvas').length), 'canvases in the document').toBe(0);
  const watch = await bitmaps(page);
  expect({ created: watch.created, open: watch.open }, 'the three frames that decoded were closed').toEqual({ created: 3, open: 0 });
  expect(describeConsoleProblems(problems)).toEqual([]);
});
