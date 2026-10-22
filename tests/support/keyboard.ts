import { expect, type Locator, type Page } from '@playwright/test';

/*
 * Keyboard checks for SegmentedControl (src/components/ui/segmented-control.tsx): native radios
 * in a <fieldset>, so a group is one tab stop and the arrow keys move AND select.
 */

/** The visible radio groups inside `scope`: fieldsets holding enabled radios. */
export function radioGroups(page: Page, scope = 'main'): Locator {
  return page.locator(`${scope} fieldset`).filter({ has: page.locator('input[type="radio"]:not([disabled])') }).filter({ visible: true });
}

/**
 * Arrow keys on one group: ArrowRight selects the next enabled radio, ArrowLeft comes back, focus
 * stays on the radio through any re-render or URL sync, and Tab leaves the group.
 */
export async function expectArrowKeys(page: Page, group: Locator, label: string): Promise<void> {
  const radios = group.locator('input[type="radio"]:not([disabled])');
  const count = await radios.count();
  if (count < 2) return;
  const checked = await radios.evaluateAll((inputs) => inputs.findIndex((input) => (input as HTMLInputElement).checked));
  const start = Math.max(checked, 0);
  await radios.nth(start).focus();
  await expect(radios.nth(start), `${label}: focus lands on the radio`).toBeFocused();

  await page.keyboard.press('ArrowRight');
  const next = (start + 1) % count;
  await expect(radios.nth(next), `${label}: ArrowRight moves focus to the next option`).toBeFocused();
  await expect(radios.nth(next), `${label}: ArrowRight selects it`).toBeChecked();

  await page.keyboard.press('ArrowLeft');
  await expect(radios.nth(start), `${label}: ArrowLeft moves back`).toBeFocused();
  await expect(radios.nth(start), `${label}: ArrowLeft selects it`).toBeChecked();

  // One tab stop: Tab leaves the group.
  await page.keyboard.press('Tab');
  expect(await group.evaluate((node) => node.contains(document.activeElement)), `${label}: Tab leaves the group`).toBe(false);
}

/** The group's legend text, for messages. */
export async function groupLabel(group: Locator, fallback: string): Promise<string> {
  return (await group.locator('legend').first().textContent())?.trim() || fallback;
}
