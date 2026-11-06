import { expect, test, type Locator, type Page } from '@playwright/test';
import { site } from '@/content/site';
import { DISPLAY_KEY } from '@/lib/display-settings';
import { axeViolations } from '../support/axe';

/*
 * The site shell (design §4.1, §9, §10; PLAN "Shell" and "Motion"), against the production build.
 * One spec for every Playwright project: at 1280px and wider the docked profile rail is the
 * shell; below it the sticky top bar, the menu sheet and the mobile footer take over.
 *
 * Covered: the CSS-only switch, the seven nav items and aria-current, the menu sheet's focus
 * placement, focus trap, focus return and its Esc / link / route-change closing, the theme
 * toggle, Display settings (Theme and Motion) applying at once, following the OS while on
 * System, and persisting across a reload with no flash (painted before any JS chunk runs),
 * plus axe on the shell in both themes.
 *
 * E2E specs run in plain Node: import only modules without the server-only guard.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

/*
 * Real scrollbars: headless Chromium hides them by default, which would hide the scroll-lock
 * gutter case from the sheet tests wherever the platform draws classic scrollbars (the tablet
 * project on Windows). File-level, because launch options force their own worker.
 */
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const NAV_LABELS = site.nav.map((item) => item.label);

const isDesktop = (page: Page): boolean => (page.viewportSize()?.width ?? 0) >= 1280;

function menuButton(page: Page): Locator {
  return page.getByRole('banner').getByRole('button', { name: 'Menu' });
}

/**
 * The same button by CSS. While the modal sheet is open Radix hides the rest of the page from
 * assistive technology (aria-hidden), so role queries cannot reach it then, by design.
 */
function menuButtonElement(page: Page): Locator {
  return page.locator('header button[aria-haspopup="dialog"]');
}

function sheet(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Menu' });
}

/** Waits until React has hydrated <main> (client islands are live). */
async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => Object.keys(document.querySelector('main') ?? {}).some((key) => key.startsWith('__reactFiber')));
}

async function openSheet(page: Page): Promise<Locator> {
  await menuButton(page).click();
  const dialog = sheet(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The visible profile rail: the docked sidebar, or the menu sheet (opened if needed). */
async function rail(page: Page): Promise<Locator> {
  if (isDesktop(page)) return page.getByRole('complementary', { name: 'Profile and site navigation' });
  return sheet(page).isVisible().then((open) => (open ? sheet(page) : openSheet(page)));
}

interface HtmlDisplay {
  readonly dark: boolean;
  readonly colorScheme: string;
  readonly motion: string | null;
}

async function htmlDisplay(page: Page): Promise<HtmlDisplay> {
  return page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    colorScheme: document.documentElement.style.colorScheme,
    motion: document.documentElement.getAttribute('data-motion'),
  }));
}

declare global {
  interface Window {
    __shellDisplayAtDcl?: HtmlDisplay;
  }
}

/**
 * Reloads with every JS chunk aborted and returns <html>'s display state at DOMContentLoaded:
 * whatever shows there was painted by the inline pre-paint script alone, so there is no flash.
 */
async function reloadWithoutChunks(page: Page): Promise<HtmlDisplay> {
  let blocked = 0;
  await page.route('**/_next/static/**/*.js', async (route) => {
    blocked += 1;
    await route.abort();
  });
  await page.addInitScript(() => {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        const html = document.documentElement;
        window.__shellDisplayAtDcl = {
          dark: html.classList.contains('dark'),
          colorScheme: html.style.colorScheme,
          motion: html.getAttribute('data-motion'),
        };
      },
      { once: true },
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const state = await page.evaluate(() => window.__shellDisplayAtDcl);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  expect(blocked, 'the reload requested JS chunks and every one was blocked').toBeGreaterThan(0);
  if (!state) throw new Error('the DOMContentLoaded state was not recorded');
  return state;
}

async function storedPrefs(page: Page): Promise<unknown> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  }, DISPLAY_KEY);
}

test.describe('layout switch (CSS only)', () => {
  test('1280px and wider: the docked rail; narrower: the top bar, sheet trigger and footer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const aside = page.getByRole('complementary', { name: 'Profile and site navigation' });
    if (isDesktop(page)) {
      await expect(aside).toBeVisible();
      await expect(aside.getByRole('navigation', { name: 'Primary' })).toBeVisible();
      await expect(aside.getByText(site.name, { exact: true })).toBeVisible();
      await expect(page.getByRole('banner')).toBeHidden();
      await expect(page.getByRole('contentinfo')).toBeHidden();
    } else {
      await expect(aside).toBeHidden();
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(menuButton(page)).toBeVisible();
      await expect(page.getByRole('banner').getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', site.contactHref);
      await expect(page.getByRole('contentinfo')).toBeVisible();
    }
    await expect(page.locator('main#content')).toHaveCount(1);
    // <main> is the size container; fixed layers and portals live outside it.
    expect(await page.locator('main#content').evaluate((main) => getComputedStyle(main).containerType)).toBe('inline-size');
  });
});

test.describe('primary nav', () => {
  test('lists the seven template items in order and marks Home current on /', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    const nav = (await rail(page)).getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link')).toHaveText(NAV_LABELS);
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  test('keeps Projects current on a case study (prefix match)', async ({ page }) => {
    await page.goto('/projects/sme-panindio', { waitUntil: 'load' });
    await hydrated(page);
    const nav = (await rail(page)).getByRole('navigation', { name: 'Primary' });
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  });

  test('server HTML already carries aria-current (no JS needed)', async ({ page }) => {
    const response = await page.request.get('/about');
    const html = await response.text();
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/about"|<a[^>]*href="\/about"[^>]*aria-current="page"/);
  });
});

test.describe('menu sheet (below 1280px)', () => {
  test.beforeEach(({ page }) => {
    test.skip(isDesktop(page), 'the sheet replaces the rail only below 1280px');
  });

  test('opens on the current nav link, traps focus, and Esc returns focus to the menu button', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    const trigger = menuButton(page);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = sheet(page);
    await expect(dialog).toBeVisible();
    await expect(menuButtonElement(page)).toHaveAttribute('aria-expanded', 'true');
    // The page behind the modal is hidden from assistive technology while it is open.
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: 'About' })).toBeFocused();
    await expect(dialog.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');

    // Focus never leaves the sheet, forwards or backwards (the loop covers every stop twice).
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let step = 0; step < 26; step += 1) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((node) => node.contains(document.activeElement)), `${key} #${step + 1} stayed in the sheet`).toBe(true);
      }
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('a nav link navigates and closes the sheet; the new page is current', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    const dialog = await openSheet(page);
    await dialog.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(dialog).toBeHidden();
    const reopened = await openSheet(page);
    await expect(reopened.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    await expect(reopened.getByRole('link', { name: 'Projects' })).toBeFocused();
  });

  test('a link to the current page also closes it', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    const dialog = await openSheet(page);
    await dialog.getByRole('link', { name: 'About' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/about$/);
  });

  test('a route change from history (Back) closes it', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    await (await openSheet(page)).getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/\/services$/);
    const dialog = await openSheet(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
    await expect(dialog).toBeHidden();
  });

  test('the scrim covers the full width while scroll is locked, and nothing shifts', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    // A long page, so a classic scrollbar (where the platform draws one) sits in the gutter.
    await page.addStyleTag({ content: 'main#content{padding-bottom:2000px!important}' });
    const gutter = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
    const before = await page.locator('h1').boundingBox();
    await openSheet(page);
    const widths = await page.evaluate(() => {
      const scrim = [...document.body.children].find(
        (el) => el instanceof HTMLElement && getComputedStyle(el).position === 'fixed' && el.getAttribute('data-state') === 'open' && !el.getAttribute('role'),
      );
      return { scrim: scrim?.getBoundingClientRect().width ?? 0, viewport: window.innerWidth };
    });
    expect(widths.scrim, `scrim width with a ${gutter}px scrollbar gutter before the lock`).toBe(widths.viewport);
    expect(await page.locator('h1').boundingBox()).toEqual(before);
  });
});

test.describe('theme and display settings', () => {
  test('the theme toggle flips the theme, renames itself and persists with no flash', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    expect((await htmlDisplay(page)).dark).toBe(false);

    const toDark = (await rail(page)).getByRole('button', { name: 'Switch to dark theme' });
    await toDark.click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await htmlDisplay(page)).toMatchObject({ dark: true, colorScheme: 'dark' });
    await expect((await rail(page)).getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
    expect(await storedPrefs(page)).toEqual({ theme: 'dark', motion: 'system' });

    expect(await reloadWithoutChunks(page)).toMatchObject({ dark: true, colorScheme: 'dark' });
  });

  test('Display settings apply at once, follow the OS on System, and persist with no flash', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);

    let panel: Locator;
    let trigger: Locator;
    if (isDesktop(page)) {
      trigger = page.getByRole('complementary').getByRole('button', { name: 'Display settings' });
      await trigger.click();
      panel = page.getByRole('dialog', { name: 'Display settings' });
    } else {
      trigger = page.getByRole('contentinfo').getByRole('button', { name: 'Display settings' });
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      panel = page.getByRole('contentinfo');
    }
    const theme = panel.getByRole('group', { name: 'Theme' });
    const motion = panel.getByRole('group', { name: 'Motion' });
    await expect(theme.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(motion.getByRole('radio', { name: 'System' })).toBeChecked();

    await theme.getByText('Dark', { exact: true }).click();
    await expect(theme.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await motion.getByText('Reduce', { exact: true }).click();
    await expect(motion.getByRole('radio', { name: 'Reduce' })).toBeChecked();
    expect(await htmlDisplay(page)).toEqual({ dark: true, colorScheme: 'dark', motion: 'reduce' });
    expect(await storedPrefs(page)).toEqual({ theme: 'dark', motion: 'reduce' });

    // Back to System: the OS decides, and the page follows it live.
    await theme.getByText('System', { exact: true }).click();
    expect((await htmlDisplay(page)).dark).toBe(false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    if (isDesktop(page)) {
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
    }

    // Persisted: System theme + Reduce motion, painted before any script on a dark OS.
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await reloadWithoutChunks(page)).toEqual({ dark: true, colorScheme: 'dark', motion: 'reduce' });
  });

  test('Display settings work from the keyboard alone, and focus returns to the trigger', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    const scope = isDesktop(page) ? page.getByRole('complementary') : page.getByRole('contentinfo');
    const trigger = scope.getByRole('button', { name: 'Display settings' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    if (isDesktop(page)) {
      const popover = page.getByRole('dialog', { name: 'Display settings' });
      await expect(popover).toBeVisible();
      // Focus moves into the popover: on the checked Theme radio.
      expect(await popover.evaluate((node) => node.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('ArrowRight'); // System → Light
      await expect(popover.getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'Light' })).toBeChecked();
      expect(await storedPrefs(page)).toEqual({ theme: 'light', motion: 'system' });
      await page.keyboard.press('Escape');
      await expect(popover).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const theme = scope.getByRole('group', { name: 'Theme' });
      await expect(theme).toBeVisible();
      await page.keyboard.press('Tab'); // into the Theme radios (the checked one)
      await page.keyboard.press('ArrowRight');
      await expect(theme.getByRole('radio', { name: 'Light' })).toBeChecked();
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(theme).toBeHidden();
    }
  });

  test('the stored choice is shown when the settings open after a reload', async ({ page }) => {
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, JSON.stringify({ theme: 'light', motion: 'reduce' }));
      } catch {
        // The page must work without storage.
      }
    }, DISPLAY_KEY);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { waitUntil: 'load' });
    await hydrated(page);
    expect(await htmlDisplay(page)).toEqual({ dark: false, colorScheme: 'light', motion: 'reduce' });
    const trigger = isDesktop(page)
      ? page.getByRole('complementary').getByRole('button', { name: 'Display settings' })
      : page.getByRole('contentinfo').getByRole('button', { name: 'Display settings' });
    await trigger.click();
    const panel = isDesktop(page) ? page.getByRole('dialog', { name: 'Display settings' }) : page.getByRole('contentinfo');
    await expect(panel.getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'Light' })).toBeChecked();
    await expect(panel.getByRole('group', { name: 'Motion' }).getByRole('radio', { name: 'Reduce' })).toBeChecked();
  });
});

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`the shell has no violations in ${theme}`, async ({ page }) => {
      await page.addInitScript(
        ({ key, value }) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            // The page must work without storage.
          }
        },
        { key: DISPLAY_KEY, value: JSON.stringify({ theme }) },
      );
      await page.goto('/about', { waitUntil: 'load' });
      await hydrated(page);
      expect((await htmlDisplay(page)).dark).toBe(theme === 'dark');

      // WCAG 2.2 AA; color-contrast alone skips replica canvases (tests/support/axe.ts, audit S6.33).
      expect(await axeViolations(page), 'page at rest').toEqual([]);

      // The open overlay: the Display settings popover on desktop, the menu sheet below 1280px
      // (axe scans the dialog; Radix hides the rest of the page from assistive tech meanwhile).
      if (isDesktop(page)) {
        await page.getByRole('complementary').getByRole('button', { name: 'Display settings' }).click();
        await expect(page.getByRole('dialog', { name: 'Display settings' })).toBeVisible();
        expect(await axeViolations(page, { include: '[role="dialog"]' }), 'Display settings popover').toEqual([]);
      } else {
        const dialog = await openSheet(page);
        await dialog.getByRole('button', { name: 'Display settings' }).click();
        expect(await axeViolations(page, { include: '[role="dialog"]' }), 'menu sheet with Display settings').toEqual([]);
      }
    });
  }
});
