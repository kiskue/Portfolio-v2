import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * /showcase (PLAN "Other pages", design §7), against the production build:
 * - the App, Brand and Source filters sync with the URL (and come back from it);
 * - the lightbox: ← / → step through the screens the filters show, Esc closes it and focus
 *   returns to the tile of the screen on display;
 * - every image has alt text and every phone a summary;
 * - without JavaScript the whole wall renders;
 * - case-study links prefetch only on intent.
 *
 * E2E specs run in plain Node: no imports from server-only content (derived.ts, store.ts).
 */

// One worker for the file, tests in order (see smoke.spec.ts: parallel Chromium loads stall here).
test.describe.configure({ mode: 'default' });

const TOTAL = 56;

/** Waits until the filters follow the URL (the provider marks them data-ready once its reader runs). */
async function hydrated(page: Page): Promise<void> {
  await page.locator('[data-showcase-filters][data-ready]').waitFor();
}

async function open(page: Page, path = '/showcase'): Promise<void> {
  await page.goto(path, { waitUntil: 'load' });
  await hydrated(page);
}

const status = (page: Page): Locator => page.locator('[data-showcase-count]');
const tile = (page: Page, id: string): Locator => page.locator(`[data-showcase-tile="${id}"]`);
const visibleTiles = (page: Page, prefix = ''): Locator =>
  page.locator(prefix ? `[data-showcase-tile^="${prefix}"]:visible` : '[data-showcase-tile]:visible');
const dialog = (page: Page): Locator => page.getByRole('dialog');

/** Chooses an option by its visible label (the radio itself is visually hidden), as the shell specs do. */
async function choose(page: Page, group: 'App' | 'Brand' | 'Source', label: string): Promise<void> {
  await page.getByRole('group', { name: group }).getByText(label, { exact: true }).click();
}

test.describe('filters', () => {
  test('App, Brand and Source sync with the URL and come back from it', async ({ page }) => {
    await open(page);
    await expect(status(page)).toHaveText(`Showing ${TOTAL} screens`);
    await expect(visibleTiles(page)).toHaveCount(TOTAL);
    // The brand chips show only once a white-label app is chosen.
    await expect(page.getByRole('radio', { name: '1Hope' })).toHaveCount(0);

    await choose(page, 'App', 'Citizen');
    await expect(page).toHaveURL(/\/showcase\?app=citizen$/);
    await expect(page.locator('[data-showcase-group="sme"]')).toBeHidden();
    await expect(page.locator('[data-showcase-group="responder"]')).toBeHidden();
    // Citizen starts on Smile SAFE Taytay: its replicas and only its screenshots (one brand at a time).
    await expect(visibleTiles(page, 'replica-2.')).toHaveCount(6);
    await expect(visibleTiles(page, 'smile-safe-taytay.')).toHaveCount(6);
    await expect(visibleTiles(page, '1hope.')).toHaveCount(0);

    await choose(page, 'Brand', '1Hope');
    await expect(page).toHaveURL(/\/showcase\?app=citizen&brand=1hope$/);
    // The wall's Citizen scope follows the same ?brand= key, so its replicas re-skin.
    await expect(page.locator('[data-showcase] [data-brand-scope="citizen"]').last()).toHaveAttribute('data-brand', '1hope');
    await expect(visibleTiles(page, '1hope.')).toHaveCount(13);
    await expect(visibleTiles(page, 'smile-safe-taytay.')).toHaveCount(0);
    await expect(status(page)).toHaveText(`Showing 19 of ${TOTAL} screens`);

    await choose(page, 'Source', 'Real screenshots (13)');
    await expect(page).toHaveURL(/\/showcase\?app=citizen&brand=1hope&source=real$/);
    await expect(visibleTiles(page, 'replica-')).toHaveCount(0);
    await expect(status(page)).toHaveText(`Showing 13 of ${TOTAL} screens`);

    // A reload restores everything from the URL.
    await page.reload({ waitUntil: 'load' });
    await hydrated(page);
    await expect(page.getByRole('radio', { name: 'Defensys Citizen' })).toBeChecked();
    await expect(page.getByRole('radio', { name: '1Hope' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Real screenshots (13)' })).toBeChecked();
    await expect(status(page)).toHaveText(`Showing 13 of ${TOTAL} screens`);
    await expect(visibleTiles(page)).toHaveCount(13);

    // Clear filters resets every param at once and puts focus back on the App choice.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL(/\/showcase$/);
    await expect(status(page)).toHaveText(`Showing ${TOTAL} screens`);
    await expect(visibleTiles(page)).toHaveCount(TOTAL);
    await expect(page.getByRole('radio', { name: 'All apps' })).toBeFocused();
    await expect(page.locator('[data-showcase] [data-brand-scope="citizen"]').last()).toHaveAttribute('data-brand', 'smile-safe-taytay');
  });

  test('Responder keeps its own brand key (?rbrand=) and shows the fixed replica label', async ({ page }) => {
    await open(page, '/showcase?brand=1hope');
    await choose(page, 'App', 'Responder');
    await choose(page, 'Brand', 'Bagong Pag-asa');
    await expect(page).toHaveURL(/\/showcase\?brand=1hope&app=responder&rbrand=bagong-pag-asa$/);
    await expect(page.locator('[data-showcase] [data-brand-scope="responder"]').last()).toHaveAttribute('data-brand', 'bagong-pag-asa');
    // Responder has no store screenshots: no Source radios, the toggle's fixed label instead.
    await expect(page.locator('[data-source-fixed]')).toHaveText(/Coded replica · fictional data/);
    await expect(page.getByRole('radio', { name: /Real screenshots/ })).toHaveCount(0);
    await expect(visibleTiles(page)).toHaveCount(6);
  });
});

test.describe('lightbox', () => {
  test('opens from a tile; ← and → step (wrapping); Esc closes and focus returns to the tile', async ({ page }) => {
    await open(page);
    const opener = tile(page, 'replica-1.1').getByRole('button');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 1.1 Owner dashboard');
    await expect(dialog(page).locator('[data-lightbox-stage] [role="img"]')).toHaveAttribute('aria-label', /SME Panindio owner dashboard/);

    // Esc without stepping: focus goes back to the opener.
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(opener).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 1.1 Owner dashboard');
    await page.keyboard.press('ArrowRight');
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 1.2 Point of sale');
    await expect(dialog(page).locator('[data-lightbox-position]')).toHaveText(`2 of ${TOTAL}`);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 3.6 Incident report form');

    // Focus stays trapped in the dialog.
    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    }

    // After stepping, Esc returns focus to the tile of the screen on display.
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(tile(page, 'replica-3.6').getByRole('button')).toBeFocused();
  });

  test('steps only through the screens the filters show, with the Previous and Next buttons too', async ({ page }) => {
    await open(page, '/showcase?app=sme');
    await expect(visibleTiles(page)).toHaveCount(9);
    await tile(page, 'replica-1.9').getByRole('button').click();
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 1.9 ROI insight with risk badge');
    await dialog(page).getByRole('button', { name: 'Next screen' }).click();
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 1.1 Owner dashboard');
    await expect(dialog(page).locator('[data-lightbox-position]')).toHaveText('1 of 9');
    await dialog(page).getByRole('button', { name: 'Previous screen' }).click();
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('FIG 1.9 ROI insight with risk badge');
  });

  test('shows a store screenshot large with its alt text and a text store link', async ({ page }) => {
    await open(page);
    await tile(page, '1hope.appstore-2').getByRole('button').click();
    await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('1Hope · App Store screenshot 2 of 6');
    const image = dialog(page).locator('[data-lightbox-stage] img');
    const alt = await image.getAttribute('alt');
    expect(alt?.length ?? 0).toBeGreaterThan(20);
    await expect(dialog(page).locator('[data-lightbox-details]')).toContainText(alt ?? '');
    await expect(dialog(page).getByRole('link', { name: /App Store listing for 1Hope/ })).toBeVisible();
    // The card fits the space: it never runs past the viewport.
    const box = await image.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport ? box.y + box.height : Number.POSITIVE_INFINITY).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
  });
});

test.describe('images and phones', () => {
  test('every image has alt text and every phone a summary', async ({ page }) => {
    await open(page);
    const images = page.locator('main img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(35);
    for (let index = 0; index < count; index += 1) {
      await expect(images.nth(index)).toHaveAttribute('alt', /.*/);
    }
    // Store screenshots carry real descriptions; decorative icons beside their names are alt="".
    const screenshots = page.locator('main .screen-card img');
    await expect(screenshots).toHaveCount(35);
    for (let index = 0; index < 35; index += 1) {
      await expect(screenshots.nth(index)).toHaveAttribute('alt', /.{20,}/);
    }
    const phones = page.locator('main [data-phone][role="img"]');
    await expect(phones).toHaveCount(21);
    for (let index = 0; index < 21; index += 1) {
      await expect(phones.nth(index)).toHaveAttribute('aria-label', /Fictional data\.$/);
    }
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the whole wall renders', async ({ page }) => {
    await page.goto('/showcase', { waitUntil: 'load' });
    await expect(page.locator('h1')).toHaveText('Showcase');
    await expect(page.locator('main h2')).toHaveText(['SME Panindio', 'Defensys Citizen', 'Defensys Responder']);
    await expect(page.locator('[data-showcase-tile]')).toHaveCount(TOTAL);
    await expect(page.locator('[data-showcase-tile][hidden]')).toHaveCount(0);
    await expect(status(page)).toHaveText(`Showing ${TOTAL} screens`);
    await expect(tile(page, 'replica-1.1').locator('[data-phone]')).toBeVisible();
    await expect(tile(page, '1hope.play-1').locator('.screen-card img')).toBeVisible();
    await expect(tile(page, 'replica-3.6').locator('[data-phone]')).toBeVisible();
  });
});

test.describe('prefetch', () => {
  test('case-study links prefetch only on hover or focus', async ({ page }) => {
    const prefetched: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/projects/') && (url.includes('_rsc=') || request.headers()['next-router-prefetch'])) prefetched.push(url);
    });
    await open(page);
    await page.waitForLoadState('networkidle');
    expect(prefetched).toEqual([]);
    await page.getByRole('link', { name: 'Read the case study about SME Panindio' }).hover();
    await expect.poll(() => prefetched.filter((url) => url.includes('/projects/sme-panindio')).length).toBeGreaterThan(0);
    expect(prefetched.every((url) => url.includes('/projects/sme-panindio'))).toBe(true);
  });
});
