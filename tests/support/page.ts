import type { Page } from '@playwright/test';
import { DISPLAY_KEY } from '@/lib/display-settings';

/* Small page helpers shared by the cross-cutting e2e suites. */

/** The docked profile rail replaces the top bar and sheet at 1280px and wider (CSS only). */
export function isDesktopShell(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 1280;
}

/** Waits until React has hydrated <main> (client islands are live). */
export async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => Object.keys(document.querySelector('main') ?? {}).some((key) => key.startsWith('__reactFiber')));
}

export interface StoredDisplay {
  readonly theme?: 'system' | 'light' | 'dark';
  readonly motion?: 'system' | 'reduce';
}

/**
 * Stores display preferences before any page script runs, so the inline pre-paint script applies
 * them on the first paint of every page this test loads.
 */
export async function storeDisplay(page: Page, prefs: StoredDisplay): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // The page must work without storage.
      }
    },
    { key: DISPLAY_KEY, value: JSON.stringify(prefs) },
  );
}

export interface HtmlState {
  readonly dark: boolean;
  readonly motion: string | null;
}

/** What the pre-paint script resolved on <html>. */
export async function htmlState(page: Page): Promise<HtmlState> {
  return page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    motion: document.documentElement.getAttribute('data-motion'),
  }));
}

/** Resolves once web fonts are loaded, so layout and contrast are measured on the final text. */
export async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
