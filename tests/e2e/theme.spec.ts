import { expect, test, type Page } from '@playwright/test';
import { DISPLAY_KEY } from '@/lib/display-settings';

/*
 * Pre-paint display settings (PLAN "Theming and pre-paint", architecture e2e `theme`). The inline
 * script in the root layout must apply the stored theme and motion preference while the HTML is
 * parsed, before any JS chunk runs. So every JS request under /_next/static is aborted here, and
 * the state of <html> is recorded at DOMContentLoaded. This asserts the behaviour, not where the
 * script sits in the DOM.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

interface DisplayState {
  readonly dark: boolean;
  /** The inline style the script sets. */
  readonly inlineColorScheme: string;
  /** What the page actually uses. */
  readonly colorScheme: string;
  readonly motion: string | null;
}

declare global {
  interface Window {
    __displayAtDcl?: DisplayState;
  }
}

/** Stores `prefs` (or nothing) under gm.display, blocks every JS chunk, and loads `/`. */
async function loadWithoutChunks(page: Page, prefs: object | null): Promise<{ readonly state: DisplayState; readonly blocked: number }> {
  let blocked = 0;
  await page.route('**/_next/static/**/*.js', async (route) => {
    blocked += 1;
    await route.abort();
  });
  await page.addInitScript(
    ({ key, value }) => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // Storage can be unavailable; the page must still render.
      }
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          const html = document.documentElement;
          window.__displayAtDcl = {
            dark: html.classList.contains('dark'),
            inlineColorScheme: html.style.colorScheme,
            colorScheme: getComputedStyle(html).colorScheme,
            motion: html.getAttribute('data-motion'),
          };
        },
        { once: true },
      );
    },
    { key: DISPLAY_KEY, value: prefs === null ? null : JSON.stringify(prefs) },
  );
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const state = await page.evaluate(() => window.__displayAtDcl);
  if (!state) throw new Error('DOMContentLoaded state was not recorded');
  return { state, blocked };
}

test.describe('pre-paint display settings, with every JS chunk blocked', () => {
  test('a stored dark theme sets html.dark and color-scheme: dark on a light OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const { state, blocked } = await loadWithoutChunks(page, { theme: 'dark' });
    expect(blocked, 'the page requested JS chunks, and every one was aborted').toBeGreaterThan(0);
    expect(state).toMatchObject({ dark: true, inlineColorScheme: 'dark', colorScheme: 'dark' });
  });

  test('a stored light theme stays light on a dark OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const { state } = await loadWithoutChunks(page, { theme: 'light' });
    expect(state).toMatchObject({ dark: false, inlineColorScheme: 'light', colorScheme: 'light' });
  });

  test('with nothing stored the OS decides: dark OS, dark page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const { state } = await loadWithoutChunks(page, null);
    expect(state).toMatchObject({ dark: true, colorScheme: 'dark' });
  });

  test('a stored reduce-motion preference sets data-motion="reduce" on a full-motion OS', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect((await loadWithoutChunks(page, { motion: 'reduce' })).state.motion).toBe('reduce');
  });

  test('reduced motion from the OS with nothing stored', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await loadWithoutChunks(page, null)).state.motion).toBe('reduce');
  });

  test('full motion when neither the OS nor the visitor asks for less', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect((await loadWithoutChunks(page, { theme: 'system', motion: 'system' })).state.motion).toBe('full');
  });
});
