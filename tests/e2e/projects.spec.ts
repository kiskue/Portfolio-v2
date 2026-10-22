import { expect, test, type Locator, type Page } from '@playwright/test';
import { projects } from '@/content/projects';
import { site } from '@/content/site';
import { CASE_STUDY_SLUGS } from '@/content/types';
import { visible } from '@/lib/placeholder';
import {
  ALL,
  facetEntry,
  filtersHref,
  matchingSlugs,
  resultSummary,
  type ProjectFilterState,
} from '@/lib/project-filters';
import { caseStudyHref } from '@/lib/routes';
import { axeViolations } from '../support/axe';

/*
 * /projects (PLAN → Routes, Other pages; design §8), against the production build: the Type and
 * Context filters stay in sync with ?type= and &context= in both directions (projectsHref order:
 * type first), work from the keyboard (native radios), combine with AND, and fall back to an
 * empty state with Clear filters. Cards link to the case studies, which prefetch only on hover or
 * focus, and without JavaScript every project shows.
 *
 * E2E specs run in plain Node: import only modules without the server-only guard (never
 * src/content/derived.ts or src/content/apps/store.ts).
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

const entries = visible(projects, site.placeholders).map(facetEntry);
const allSlugs = entries.map((entry) => entry.slug);
const total = entries.length;

const filters = (type: ProjectFilterState['type'], context: ProjectFilterState['context']): ProjectFilterState => ({
  type,
  context,
});

/** Waits until React has hydrated <main> (client islands are live). */
async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => Object.keys(document.querySelector('main') ?? {}).some((key) => key.startsWith('__reactFiber')));
}

/** Opens /projects (optionally with a query) and waits for the island to apply the URL. */
async function open(page: Page, href: string = filtersHref(filters(ALL, ALL))): Promise<void> {
  await page.goto(href, { waitUntil: 'load' });
  await hydrated(page);
}

function group(page: Page, legend: 'Type' | 'Context'): Locator {
  return page.getByRole('group', { name: legend });
}

/** A radio by its visible label; its accessible name is "<label>, <n> projects". */
function radio(page: Page, legend: 'Type' | 'Context', label: string): Locator {
  return group(page, legend).getByRole('radio', { name: new RegExp(`^${label}, \\d+ projects?$`) });
}

/** Clicks an option by its visible label, the way a person does (the input itself is visually hidden). */
async function choose(page: Page, legend: 'Type' | 'Context', label: string): Promise<void> {
  await group(page, legend).getByText(label, { exact: true }).click();
}

function status(page: Page): Locator {
  return page.locator('[data-facet-bar]').getByRole('status');
}

/** Slugs of the project cards that are actually rendered, in page order. */
async function shownSlugs(page: Page): Promise<string[]> {
  return page
    .locator('li[data-project]')
    .evaluateAll((items) => items.filter((item) => item.checkVisibility()).map((item) => item.getAttribute('data-project') ?? ''));
}

function path(page: Page): string {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}${url.hash}`;
}

test.describe('filters', () => {
  test('start on All: every project, case studies first, and the full count', async ({ page }) => {
    await open(page);
    await expect(radio(page, 'Type', 'All')).toBeChecked();
    await expect(radio(page, 'Context', 'All')).toBeChecked();
    await expect(status(page)).toHaveText(resultSummary(total, total));
    const shown = await shownSlugs(page);
    expect(shown).toEqual(allSlugs);
    expect(shown.slice(0, 3)).toEqual([...CASE_STUDY_SLUGS]);
    await expect(page.getByRole('heading', { level: 2, name: 'Case studies' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'More work' })).toBeVisible();
  });

  test('?type=ai preselects AI and lists only AI projects', async ({ page }) => {
    await open(page, '/projects?type=ai');
    await expect(radio(page, 'Type', 'AI')).toBeChecked();
    await expect(radio(page, 'Context', 'All')).toBeChecked();
    const expected = matchingSlugs(entries, filters('ai', ALL));
    await expect(status(page)).toHaveText(resultSummary(expected.length, total));
    expect(await shownSlugs(page)).toEqual(expected);
    expect(path(page)).toBe('/projects?type=ai');
  });

  test('?context= preselects too, and both combine with AND', async ({ page }) => {
    await open(page, '/projects?context=personal&type=web');
    await expect(radio(page, 'Type', 'Web')).toBeChecked();
    await expect(radio(page, 'Context', 'Personal')).toBeChecked();
    const expected = matchingSlugs(entries, filters('web', 'personal'));
    expect(expected.length).toBeGreaterThan(0);
    expect(await shownSlugs(page)).toEqual(expected);
    // No case study is web work, so that section steps aside.
    await expect(page.getByRole('heading', { level: 2, name: 'Case studies' })).toBeHidden();
  });

  test('choosing filters writes the URL, type first, and All removes its param', async ({ page }) => {
    await open(page);
    await choose(page, 'Context', 'Company');
    await expect(radio(page, 'Context', 'Company')).toBeChecked();
    await expect.poll(() => path(page)).toBe('/projects?context=company');
    expect(await shownSlugs(page)).toEqual(matchingSlugs(entries, filters(ALL, 'company')));

    await choose(page, 'Type', 'Web');
    await expect.poll(() => path(page)).toBe('/projects?type=web&context=company');
    await expect(status(page)).toHaveText(resultSummary(matchingSlugs(entries, filters('web', 'company')).length, total));
    expect(await shownSlugs(page)).toEqual(matchingSlugs(entries, filters('web', 'company')));

    await choose(page, 'Type', 'All');
    await expect.poll(() => path(page)).toBe('/projects?context=company');
    await choose(page, 'Context', 'All');
    await expect.poll(() => path(page)).toBe('/projects');
    expect(await shownSlugs(page)).toEqual(allSlugs);

    // The URL is the state: a reload keeps the selection.
    await choose(page, 'Type', 'Mobile');
    await expect.poll(() => path(page)).toBe('/projects?type=mobile');
    await page.reload({ waitUntil: 'load' });
    await hydrated(page);
    await expect(radio(page, 'Type', 'Mobile')).toBeChecked();
    expect(await shownSlugs(page)).toEqual(matchingSlugs(entries, filters('mobile', ALL)));
  });

  test('changing filters adds no history entries', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await open(page);
    await choose(page, 'Type', 'Web');
    await choose(page, 'Type', 'AI');
    await expect.poll(() => path(page)).toBe('/projects?type=ai');
    await page.goBack({ waitUntil: 'load' });
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('unknown values, and tooling, read as All', async ({ page }) => {
    await open(page, '/projects?type=tooling&context=nope');
    await expect(radio(page, 'Type', 'All')).toBeChecked();
    await expect(radio(page, 'Context', 'All')).toBeChecked();
    await expect(group(page, 'Type').getByRole('radio')).toHaveCount(4);
    expect(await shownSlugs(page)).toEqual(allSlugs);
  });

  test('arrow keys move between the radios and filter as they go', async ({ page }) => {
    await open(page);
    await radio(page, 'Type', 'All').focus();
    await page.keyboard.press('ArrowRight');
    await expect(radio(page, 'Type', 'Mobile')).toBeChecked();
    await expect(radio(page, 'Type', 'Mobile')).toBeFocused();
    await expect.poll(() => path(page)).toBe('/projects?type=mobile');
    await page.keyboard.press('ArrowRight');
    await expect(radio(page, 'Type', 'Web')).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(radio(page, 'Type', 'Mobile')).toBeChecked();
    expect(await shownSlugs(page)).toEqual(matchingSlugs(entries, filters('mobile', ALL)));

    // Tab leaves the group and lands on the next group's checked radio.
    await page.keyboard.press('Tab');
    await expect(radio(page, 'Context', 'All')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(radio(page, 'Context', 'Personal')).toBeChecked();
    await expect.poll(() => path(page)).toBe('/projects?type=mobile&context=personal');
    expect(await shownSlugs(page)).toEqual(matchingSlugs(entries, filters('mobile', 'personal')));
  });

  test('a filter that matches nothing shows the empty state, and Clear filters resets both groups', async ({ page }) => {
    await open(page, '/projects?type=mobile&context=client');
    await expect(radio(page, 'Type', 'Mobile')).toBeChecked();
    await expect(radio(page, 'Context', 'Client')).toBeChecked();
    await expect(status(page)).toHaveText(resultSummary(0, total));
    await expect(page.getByRole('heading', { level: 2, name: 'No projects match.' })).toBeVisible();
    expect(await shownSlugs(page)).toEqual([]);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect.poll(() => path(page)).toBe('/projects');
    await expect(radio(page, 'Type', 'All')).toBeChecked();
    await expect(radio(page, 'Type', 'All')).toBeFocused();
    await expect(radio(page, 'Context', 'All')).toBeChecked();
    await expect(page.getByRole('heading', { level: 2, name: 'No projects match.' })).toHaveCount(0);
    expect(await shownSlugs(page)).toEqual(allSlugs);
  });

  // axe as the PLAN specifies (tests/support/axe.ts): every WCAG rule over the whole page, and only
  // the contrast rule skips the replica canvases (PLAN → Verification → Accessibility).
  test('the filtered and empty states pass axe, and the default state in both themes', async ({ page }) => {
    await open(page, '/projects?type=web&context=personal');
    expect(await axeViolations(page), 'filtered').toEqual([]);
    await open(page, '/projects?context=client');
    expect(await axeViolations(page), 'empty').toEqual([]);
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await open(page);
      if (colorScheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/);
      else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
      expect(await axeViolations(page), colorScheme).toEqual([]);
    }
  });
});

test.describe('cards', () => {
  test('each case-study card is one link to its case study', async ({ page }) => {
    await open(page);
    for (const slug of CASE_STUDY_SLUGS) {
      const card = page.locator(`li[data-project="${slug}"]`);
      await expect(card.getByRole('link')).toHaveCount(1);
      await expect(card.getByRole('link')).toHaveAttribute('href', caseStudyHref(slug));
      await expect(card).toContainText('Read the case study');
      await expect(card.locator('[data-phone]')).toHaveCount(1);
    }
  });

  test('the whole card is the link: a click on the phone opens the case study', async ({ page }) => {
    await open(page);
    const phone = page.locator('li[data-project="defensys-citizen"] [data-phone]');
    await phone.scrollIntoViewIfNeeded();
    const box = await phone.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/projects\/defensys-citizen$/);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('case studies prefetch only once a card is hovered', async ({ page }) => {
    const requested = new Set<string>();
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      for (const slug of CASE_STUDY_SLUGS) if (pathname.startsWith(`/projects/${slug}`)) requested.add(slug);
    });
    await page.goto('/projects', { waitUntil: 'networkidle' });
    await hydrated(page);
    // Every card has been in or near the viewport by now; nothing is fetched on sight.
    for (const slug of CASE_STUDY_SLUGS) await page.locator(`li[data-project="${slug}"]`).scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    expect([...requested]).toEqual([]);

    await page.locator('li[data-project="sme-panindio"]').getByRole('link').hover();
    await expect.poll(() => [...requested]).toEqual(['sme-panindio']);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every project shows, whatever the address asks for, and the filter bar stays hidden', async ({ page }) => {
    await page.goto('/projects?type=ai&context=company', { waitUntil: 'load' });
    for (const slug of allSlugs) await expect(page.locator(`li[data-project="${slug}"]`), slug).toBeVisible();
    await expect(page.locator('[data-facet-bar]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 2, name: 'No projects match.' })).toHaveCount(0);
  });
});
