import { expect, type Page } from '@playwright/test';

/*
 * The painted dragon (design §3.3) as the e2e specs see it. The scene chunk adds `.hero-dragon` to
 * the hero's dragon host; its state is on the element: data-flight (idle | flying), data-renderer
 * (webgl | images) once it is ready, and data-scale (the path's scale, 2 decimals) while it flies.
 * The opening flight starts about 1.2 s after first paint, and a flight takes 14 s.
 */

export const DRAGON = '.hero-dragon';

export interface DragonState {
  readonly count: number;
  readonly flight: string | null;
  readonly renderer: string | null;
  readonly scale: string | null;
  readonly transform: string | null;
}

/** The dragon element's attributes, and how many dragon elements there are. */
export async function dragonState(page: Page): Promise<DragonState> {
  return page.evaluate((selector) => {
    const all = document.querySelectorAll<HTMLElement>(selector);
    const dragon = all[0];
    return {
      count: all.length,
      flight: dragon?.dataset.flight ?? null,
      renderer: dragon?.dataset.renderer ?? null,
      scale: dragon?.dataset.scale ?? null,
      transform: dragon ? dragon.style.transform : null,
    };
  }, DRAGON);
}

/** data-flight every `every` ms for `ms` ms, read in the page ('absent' while there is no dragon). */
export async function sampleFlight(page: Page, every: number, ms: number): Promise<string[]> {
  return page.evaluate(
    async ({ selector, every: step, ms: span }) => {
      const seen: string[] = [];
      const end = performance.now() + span;
      while (performance.now() < end) {
        seen.push(document.querySelector<HTMLElement>(selector)?.dataset.flight ?? 'absent');
        await new Promise((resolve) => setTimeout(resolve, step));
      }
      return seen;
    },
    { selector: DRAGON, every, ms },
  );
}

/** Waits for a flight to be under way. */
export async function flying(page: Page): Promise<void> {
  await expect(page.locator(DRAGON)).toHaveAttribute('data-flight', 'flying', { timeout: 6_000 });
}
