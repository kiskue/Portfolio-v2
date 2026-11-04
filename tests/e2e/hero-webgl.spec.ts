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
