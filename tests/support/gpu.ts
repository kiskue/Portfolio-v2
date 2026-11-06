import { expect, test, type Page } from '@playwright/test';

/*
 * The GPU specs (hero-webgl.spec.ts, hero-warmup.spec.ts). The default headless Chromium renders in
 * software (SwiftShader), where the dragon flies as stacked frames and nothing is warmed on purpose, so
 * these files launch Chromium on the GPU (ANGLE on Direct3D 11). A launch option needs a worker of its
 * own, so each file sets GPU_TEST_OPTIONS at its top level.
 *
 * A browser without hardware WebGL skips them. E2E_REQUIRE_GPU=1 turns that skip into a failure, so a
 * run that must exercise the GPU path cannot pass by skipping it.
 */

/** Chromium on the GPU (ANGLE, Direct3D 11), whatever its blocklist says. */
export const GPU_TEST_OPTIONS = {
  reducedMotion: 'no-preference',
  launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
} as const satisfies Parameters<typeof test.use>[0];

/** Software WebGL renderers. Written again here on purpose: the probe must not share renderer.ts's rule. */
export const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * Skips the test unless this browser has hardware WebGL (fails instead with E2E_REQUIRE_GPU=1): on
 * about:blank, a detached canvas asks for a context that refuses a major performance caveat, and its
 * renderer's name must not be a software one.
 */
export async function requireHardwareWebGL(page: Page): Promise<void> {
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
  const hardware = renderer !== null && !SOFTWARE.test(renderer);
  if (process.env.E2E_REQUIRE_GPU === '1') {
    expect(hardware, `E2E_REQUIRE_GPU=1: hardware WebGL in this browser (${renderer ?? 'no context'})`).toBe(true);
    return;
  }
  test.skip(!hardware, `no hardware WebGL in this browser (${renderer ?? 'no context'})`);
}
