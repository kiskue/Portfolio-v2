import { expect, test, type Page } from '@playwright/test';
import { callsToAction } from '@/content/home';
import { services } from '@/content/services';
import { testimonials } from '@/content/testimonials';
import { aboutHref, contactHref, servicesHref, type AboutSection } from '@/lib/routes';
import { collectConsoleProblems, describeConsoleProblems } from '../support/console';

/*
 * W10b-P pages against the production build: /services, /testimonials, /about and the 404.
 * - The anchors Home links to exist and scroll into view (/services#<ServiceId>, /about#…).
 * - Every CTA presets the right contact topic.
 * - Label-mode markup that hide mode removes is marked: placeholders are <mark class="ph"> with a
 *   screen-reader "(placeholder)", example items carry the Example tag, years are "[[N]]+" and the
 *   CV is a chip, not a link; no raw "[[…]]" token reaches the page. (Hide mode itself is covered
 *   by the unit tests: the build runs in label mode.)
 * - An unknown path is a 404 inside the shell, with one h1 and a clean console.
 *
 * E2E specs run in plain Node: import content that has no server-only guard (never derived.ts).
 */

// One worker per file, tests in order (see smoke.spec.ts: parallel Chromium loads stall on Windows).
test.describe.configure({ mode: 'default' });

const ABOUT_SECTIONS: readonly AboutSection[] = ['experience', 'skills', 'credentials', 'education'];

/** Placeholders are marked for everyone, and no raw token text ever shows. */
async function expectMarkedPlaceholders(page: Page): Promise<void> {
  const main = page.locator('main#content');
  expect(await main.textContent()).not.toMatch(/\[\[|\]\]/);
  const marks = main.locator('mark.ph');
  expect(await marks.count()).toBeGreaterThan(0);
  const unannounced = await marks.evaluateAll(
    (elements) => elements.filter((element) => element.querySelector('.sr-only')?.textContent !== ' (placeholder)').length,
  );
  expect(unannounced).toBe(0);
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('/services', () => {
  test('anchors every service block at its ServiceId, titled by an h2', async ({ page }) => {
    await page.goto(servicesHref(), { waitUntil: 'load' });
    for (const service of services) {
      const block = page.locator(`[id="${service.id}"]`);
      await expect(block).toHaveCount(1);
      await expect(block.getByRole('heading', { level: 2, name: service.title, exact: true })).toBeVisible();
    }
    await expectNoHorizontalScroll(page);
  });

  test('a /services#<id> link from Home lands on its block', async ({ page }) => {
    const target = services[services.length - 1];
    if (!target) throw new Error('no services');
    await page.goto(servicesHref(target.id), { waitUntil: 'load' });
    await expect(page.locator(`[id="${target.id}"]`).getByRole('heading', { level: 2 })).toBeInViewport();
  });

  test('every CTA presets the right contact topic', async ({ page }) => {
    await page.goto(servicesHref(), { waitUntil: 'load' });
    const band = page.locator('[data-section="cta"]');
    await expect(band.getByRole('heading', { level: 2, name: callsToAction.services.title })).toBeVisible();
    await expect(band.getByRole('link', { name: callsToAction.services.cta?.label })).toHaveAttribute('href', contactHref('project'));
    await expect(page.getByRole('link', { name: 'Talk about a role' })).toHaveAttribute('href', contactHref('hiring'));
    await expect(page.getByRole('link', { name: 'Ask about a contract' })).toHaveAttribute('href', contactHref('project'));
    await expect(page.getByRole('link', { name: 'Scope a project' })).toHaveAttribute('href', contactHref('project'));
  });

  test('marks pricing and process as placeholders (label mode)', async ({ page }) => {
    await page.goto(servicesHref(), { waitUntil: 'load' });
    await expectMarkedPlaceholders(page);
    await expect(page.locator('[data-engagement]')).toHaveCount(services.length);
    await expect(page.locator('[data-section="process"] mark.ph')).toHaveCount(5);
  });
});

test.describe('/testimonials', () => {
  test('shows the example quotes with their Example tag and links Leave a note to the testimonial topic', async ({ page }) => {
    await page.goto('/testimonials', { waitUntil: 'load' });
    const cards = page.locator('[data-quote-grid] > li');
    await expect(cards).toHaveCount(testimonials.length);
    await expect(page.locator('[data-quote-grid]').getByText('Example', { exact: true })).toHaveCount(
      testimonials.filter((item) => item.example).length,
    );
    await expect(page.getByRole('list', { name: 'Testimonials' })).toBeVisible();
    await expect(page.locator('[data-empty-state]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: callsToAction.testimonials.cta?.label })).toHaveAttribute(
      'href',
      contactHref('testimonial'),
    );
    await expectMarkedPlaceholders(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe('/about', () => {
  test('renders every section Home links to', async ({ page }) => {
    await page.goto(aboutHref(), { waitUntil: 'load' });
    for (const section of ABOUT_SECTIONS) await expect(page.locator(`[id="${section}"]`), section).toHaveCount(1);
    await expect(page.getByRole('img', { name: /portrait of Gerric Measco/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  for (const section of ['credentials', 'education'] as const) {
    test(`/about#${section} lands on its section`, async ({ page }) => {
      await page.goto(aboutHref(section), { waitUntil: 'load' });
      await expect(page.locator(`[id="${section}"]`).getByRole('heading').first()).toBeInViewport();
    });
  }

  test('label mode: years as a marked "[[N]]+" stat and the CV as a placeholder chip, not a link', async ({ page }) => {
    await page.goto(aboutHref(), { waitUntil: 'load' });
    const main = page.locator('main#content');
    const years = main.locator('[data-stat="years"]');
    await expect(years.locator('mark.ph')).toHaveText('N (placeholder)');
    await expect(years).toContainText('years shipping production apps');
    await expect(main.getByText('Download CV')).toBeVisible();
    await expect(main.getByRole('link', { name: /Download CV/ })).toHaveCount(0);
    await expect(main.locator('[id="credentials"]').getByText('Example', { exact: true })).toHaveCount(1);
    await expectMarkedPlaceholders(page);
  });
});

test.describe('404', () => {
  for (const path of ['/no-such-page', '/projects/nope']) {
    test(`${path} renders the map 404 inside the shell with one h1 and a clean console`, async ({ page, baseURL }) => {
      // The shared collector tolerates exactly one message: this document's own 404 load error.
      const problems = collectConsoleProblems(page, { notFoundUrl: new URL(path, baseURL).href });
      const response = await page.goto(path, { waitUntil: 'load' });
      expect(response?.status()).toBe(404);
      const main = page.locator('main#content');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(main.getByRole('heading', { level: 1 })).toHaveText(/isn.t on the map/);
      await expect(main.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/');
      await expect(main.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/projects');
      await expect(main.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
      const phone = main.locator('[data-map-phone="lost"] [role="img"]');
      await expect(phone).toBeVisible();
      await expect(phone).toHaveAttribute('aria-label', /a blue You are here dot at the edge of town/);
      await expect(main.locator('figcaption')).toContainText('FIG 404');
      await expectNoHorizontalScroll(page);
      await page.waitForLoadState('networkidle');
      expect(describeConsoleProblems(problems)).toEqual([]);
    });
  }
});
