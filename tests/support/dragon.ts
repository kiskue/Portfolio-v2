import { expect, type Page } from '@playwright/test';
import { isDesktopShell } from './page';

/*
 * The painted dragon (design §3.3) as the e2e specs see it. The scene chunk adds `.hero-dragon` to
 * the hero's dragon host; its state is on the element: data-flight (idle | flying), data-renderer
 * (webgl | images) once it is ready, and data-scale (the path's scale, 2 decimals) while it flies.
 * The opening flight starts about 1.2 s after Home has painted, and a flight takes 14 s.
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

/** The dragon's data-`key` every `every` ms for `ms` ms, read in the page ('absent' while it has none). */
export async function sampleDragon(page: Page, key: 'flight' | 'scale', every: number, ms: number): Promise<string[]> {
  return page.evaluate(
    async ({ selector, key: name, every: step, ms: span }) => {
      const seen: string[] = [];
      const end = performance.now() + span;
      while (performance.now() < end) {
        seen.push(document.querySelector<HTMLElement>(selector)?.dataset[name] ?? 'absent');
        await new Promise((resolve) => setTimeout(resolve, step));
      }
      return seen;
    },
    { selector: DRAGON, key, every, ms },
  );
}

/** Starts a session that has already seen the opening flight (before any page script runs). */
export async function alreadyFlown(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gm.dragon', '1');
    } catch {
      // Without storage the opening flight would fly; the tests then fail on their idle checks.
    }
  });
}

/** Waits for a flight to be under way. */
export async function flying(page: Page): Promise<void> {
  await expect(page.locator(DRAGON)).toHaveAttribute('data-flight', 'flying', { timeout: 6_000 });
}

/** Waits until the scene is ready to fly: it knows its renderer. */
export async function sceneReady(page: Page): Promise<void> {
  await expect(page.locator(DRAGON)).toHaveAttribute('data-renderer', /^(webgl|images)$/);
}

/** Clicks the theme button: the rail's on the desktop shell, the menu sheet's below 1280px. */
export async function switchTheme(page: Page): Promise<void> {
  const name = /Switch to (dark|light) theme/;
  if (isDesktopShell(page)) {
    await page.getByRole('complementary').getByRole('button', { name }).click();
    return;
  }
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name }).click();
}

/** Follows a primary nav link: the rail's on the desktop shell, the menu sheet's below 1280px. */
export async function navigate(page: Page, label: string): Promise<void> {
  if (isDesktopShell(page)) {
    await page.getByRole('complementary').getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: label, exact: true }).click();
    return;
  }
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: label, exact: true }).click();
}
