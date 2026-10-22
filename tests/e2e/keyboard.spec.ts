import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectArrowKeys, groupLabel, radioGroups } from '../support/keyboard';
import { hydrated, isDesktopShell } from '../support/page';
import { CASE_STUDY_ROUTES, PAGE_ROUTES, caseStudyOf } from '../support/routes';

/*
 * Keyboard: radios (PLAN "Verification → Keyboard"; architecture D8 `keyboard`, "segmented
 * arrow keys"). Every single-choice control is a SegmentedControl on native radios: one tab stop
 * per group, and the arrow keys move AND select, wrapping at the ends. A choice that syncs the
 * URL or re-renders the page must keep focus on the radio.
 * Elsewhere: the menu sheet's focus trap and return are in shell.spec.ts, the lightbox keys in
 * showcase.spec.ts (W10a-S), and Home's pause buttons in home.spec.ts (W8).
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

/** Opens Display settings: the rail's popover at 1280px and wider, the footer disclosure below. */
async function openDisplaySettings(page: Page): Promise<Locator> {
  if (isDesktopShell(page)) {
    await page.getByRole('complementary').getByRole('button', { name: 'Display settings' }).click();
    const popover = page.getByRole('dialog', { name: 'Display settings' });
    await expect(popover).toBeVisible();
    return popover;
  }
  const footer = page.getByRole('contentinfo');
  const trigger = footer.getByRole('button', { name: 'Display settings' });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return footer;
}

/** The radio that is focused now, by its accessible name, or null when focus is elsewhere. */
async function focusedRadio(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement) || active.type !== 'radio') return null;
    return active.labels?.[0]?.textContent?.trim() ?? active.value;
  });
}

test.describe('Display settings radios', () => {
  test('arrow keys move and select, wrap at both ends, and the choice applies at once', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    const panel = await openDisplaySettings(page);
    const theme = panel.getByRole('group', { name: 'Theme' });
    const radio = (name: string): Locator => theme.getByRole('radio', { name, exact: true });

    await radio('System').focus();
    await expect(radio('System')).toBeChecked();
    const html = page.locator('html');

    await page.keyboard.press('ArrowRight');
    await expect(radio('Light')).toBeFocused();
    await expect(radio('Light')).toBeChecked();
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.keyboard.press('ArrowRight');
    await expect(radio('Dark')).toBeFocused();
    await expect(radio('Dark')).toBeChecked();
    await expect(html).toHaveClass(/\bdark\b/);

    await page.keyboard.press('ArrowRight'); // wraps to the first option
    await expect(radio('System')).toBeFocused();
    await expect(radio('System')).toBeChecked();
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.keyboard.press('ArrowLeft'); // and back across the start
    await expect(radio('Dark')).toBeFocused();
    await expect(radio('Dark')).toBeChecked();

    await page.keyboard.press('ArrowUp');
    await expect(radio('Light')).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(radio('Dark')).toBeChecked();
    await expect(radio('Dark')).toBeFocused();
    await expect(html).toHaveClass(/\bdark\b/);
  });

  test('each group is one tab stop that lands on its checked radio', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'load' });
    await hydrated(page);
    const panel = await openDisplaySettings(page);
    const theme = panel.getByRole('group', { name: 'Theme' });
    const motion = panel.getByRole('group', { name: 'Motion' });

    // The radio itself is visually hidden; its label draws the option (as a pointer user sees it).
    await theme.getByText('Light', { exact: true }).click();
    await expect(theme.getByRole('radio', { name: 'Light', exact: true })).toBeChecked();
    await theme.getByRole('radio', { name: 'Light', exact: true }).focus();
    await page.keyboard.press('Tab');
    // Straight past the other Theme options into Motion, on its checked option.
    await expect(motion.getByRole('radio', { name: 'System', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(theme.getByRole('radio', { name: 'Light', exact: true })).toBeFocused();

    // Motion: the choice applies at once.
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await expect(motion.getByRole('radio', { name: 'Reduce', exact: true })).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    expect(await focusedRadio(page)).toBe('Reduce');
  });
});

/** Routes whose pages must carry at least one SegmentedControl (PLAN "Reusable components"). */
const ROUTES_WITH_RADIOS = new Set<string>([
  '/projects', // type and context filters
  '/showcase', // app, brand and source filters
  '/contact', // the topic
  ...CASE_STUDY_ROUTES.filter((route) => caseStudyOf(route) !== 'sme-panindio'), // the brand switcher
]);

test.describe('every SegmentedControl on every page', () => {
  for (const route of PAGE_ROUTES) {
    test(`${route}: radio groups work with the arrow keys and keep focus`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load' });
      await hydrated(page);
      const total = await radioGroups(page).count();
      if (ROUTES_WITH_RADIOS.has(route)) expect(total, `${route} renders its radio groups`).toBeGreaterThan(0);
      for (let index = 0; index < total; index += 1) {
        // A fresh page per group: a choice may filter the page and change the other groups.
        await page.goto(route, { waitUntil: 'load' });
        await hydrated(page);
        const group = radioGroups(page).nth(index);
        await expectArrowKeys(page, group, `${route} "${await groupLabel(group, `group ${index + 1}`)}"`);
      }
    });
  }
});
