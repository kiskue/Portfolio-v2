import type { Page } from '@playwright/test';

/*
 * The sky's warm-up (src/components/sections/home/sky-warmup.ts) as the e2e specs see it: the
 * animations it starts carry the id 'sky-warmup' (a duplicate of WARMUP_ID; tests/unit/scene-warmup.test.ts
 * keeps the two equal).
 */

export const WARMUP_ID = 'sky-warmup';

export interface WarmupCall {
  readonly layer: string | null;
  readonly opacities: readonly number[];
  readonly filters: readonly string[];
  readonly displays: readonly string[];
}

interface WarmupRecord {
  __warmups: WarmupCall[];
}

/**
 * Records the warm-up's animations as the page starts them (before any page script runs). With
 * `hold`, each runs a thousand times slower, so the warm-up stays under way (and on the compositor,
 * as it really runs) until something cancels it.
 */
export async function recordWarmups(page: Page, hold = false): Promise<void> {
  await page.addInitScript(
    ({ id, slow }) => {
      const record = window as unknown as WarmupRecord;
      record.__warmups = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function warmupAnimate(this: Element, keyframes, options) {
        const animation = animate.call(this, keyframes, options);
        if (typeof options === 'object' && options.id === id) {
          const frames = (Array.isArray(keyframes) ? keyframes : []) as Keyframe[];
          record.__warmups.push({
            layer: this.getAttribute('data-hero-layer'),
            opacities: frames.map((frame) => Number(frame.opacity ?? Number.NaN)),
            filters: frames.map((frame) => String(frame.filter ?? '')),
            displays: frames.map((frame) => String(frame.display ?? '')),
          });
          if (slow) animation.playbackRate = 0.001;
        }
        return animation;
      } as typeof animate;
    },
    { id: WARMUP_ID, slow: hold },
  );
}

/** The warm-up animations the page has started so far. */
export async function warmups(page: Page): Promise<WarmupCall[]> {
  return page.evaluate(() => (window as unknown as WarmupRecord).__warmups);
}

/** The warm-up's animations still in the document. */
export async function warmupRunning(page: Page): Promise<number> {
  return page.evaluate((id) => document.getAnimations().filter((animation) => animation.id === id).length, WARMUP_ID);
}
