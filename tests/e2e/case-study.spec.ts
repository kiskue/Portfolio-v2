import { expect, test, type Locator, type Page } from '@playwright/test';
import { caseStudies } from '@/content/case-studies';
import { CASE_STUDY_SLUGS, type CaseStudy } from '@/content/types';

/*
 * The case-study template (PLAN case-study template; W9) against the production build: the three
 * slugs render every section in order with its #anchor, the "On this page" list links to them, the
 * brand switcher and the #brands Preview buttons re-skin one BrandScope and keep ?brand=, the
 * Screens source toggle shows one brand's real screenshots at a time, previous / next follow the
 * cyclic order, the hero phone is the receiving end of the phone morph with a unique name, and any
 * other slug is a 404.
 *
 * E2E specs run in plain Node: they import content without a server-only guard (the case-study
 * data and types), never src/content/derived.ts or store.ts.
 */

test.describe.configure({ mode: 'default' });

const studyBySlug = new Map(caseStudies.map((study) => [study.slug, study]));

function study(slug: CaseStudy['slug']): CaseStudy {
  const found = studyBySlug.get(slug);
  if (!found) throw new Error(`No case study ${slug}`);
  return found;
}

/** Waits until the page's client parts are live (the hero player marks itself ready once hydrated). */
async function hydrated(page: Page): Promise<void> {
  await expect(page.locator('[data-cs-hero] [data-glimpse-root]')).toHaveAttribute('data-ready', '');
}

async function open(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: 'load' });
  expect(response?.status(), path).toBe(200);
  await hydrated(page);
}

/** The label (the visible part of a native radio) with this text inside a control. */
function option(control: Locator, text: string | RegExp): Locator {
  return control.locator('label').filter({ hasText: text });
}

// ─── Every slug ──────────────────────────────────────────────────────────────────────────

for (const slug of CASE_STUDY_SLUGS) {
  const data = study(slug);

  test.describe(`/projects/${slug}`, () => {
    test('renders the hero, then every section in content order, each at its #anchor with an h2', async ({ page }) => {
      await open(page, `/projects/${slug}`);
      await expect(page.locator('h1')).toHaveText(data.title);
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');

      const ids = await page.locator('[data-case-study] section[data-cs-section]').evaluateAll((sections) => sections.map((section) => section.id));
      expect(ids).toEqual([...data.sections]);
      for (const key of data.sections) {
        const section = page.locator(`section#${key}`);
        await expect(section).toHaveCount(1);
        await expect(section.locator('h2')).toHaveCount(1);
        await expect(section).toHaveAttribute('aria-labelledby', `${key}-title`);
      }
      // Three hero stats, the phone stage and, below the hero, the static "On this page" pill.
      await expect(page.locator('[data-cs-hero] ul[aria-label="Key figures"] > li')).toHaveCount(3);
      await expect(page.locator('[data-hero-stage]')).toHaveCount(1);
    });

    test('lists every section in the sticky "On this page" pill, and a link jumps there and closes it', async ({ page }) => {
      await open(page, `/projects/${slug}`);
      const nav = page.getByRole('navigation', { name: 'On this page' });
      await expect(nav).toHaveCSS('position', 'sticky');
      // Closed, the list is out of the accessibility tree; its links are still in the markup.
      const links = nav.locator('a');
      await expect(links).toHaveCount(data.sections.length);
      expect(await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')))).toEqual(
        data.sections.map((key) => `#${key}`),
      );

      const details = nav.locator('details');
      await nav.locator('summary').click();
      await expect(details).toHaveJSProperty('open', true);
      await expect(nav.getByRole('link')).toHaveCount(data.sections.length);
      await nav.getByRole('link', { name: 'Architecture' }).click();
      await expect(page).toHaveURL(/#architecture$/);
      await expect(details).toHaveJSProperty('open', false);
      // The target lands below the stuck pill, not under it (2.4.11).
      await expect
        .poll(async () => {
          const pill = await nav.boundingBox();
          const heading = await page.locator('#architecture h2').boundingBox();
          return pill && heading ? heading.y >= pill.y + pill.height - 1 : false;
        })
        .toBe(true);
    });

    test('closes the pill with Escape and returns focus to it', async ({ page }) => {
      await open(page, `/projects/${slug}`);
      const nav = page.getByRole('navigation', { name: 'On this page' });
      const summary = nav.locator('summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(nav.locator('details')).toHaveJSProperty('open', true);
      await page.keyboard.press('Escape');
      await expect(nav.locator('details')).toHaveJSProperty('open', false);
      await expect(summary).toBeFocused();
    });

    test('links to the previous and next case studies in cyclic order', async ({ page }) => {
      await open(page, `/projects/${slug}`);
      const index = CASE_STUDY_SLUGS.indexOf(slug);
      const count = CASE_STUDY_SLUGS.length;
      const prev = CASE_STUDY_SLUGS[(index - 1 + count) % count];
      const next = CASE_STUDY_SLUGS[(index + 1) % count];
      const nav = page.locator('#next').getByRole('navigation', { name: 'Other case studies' });
      const links = nav.getByRole('link');
      await expect(links).toHaveCount(2);
      expect(await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')))).toEqual([
        `/projects/${prev}`,
        `/projects/${next}`,
      ]);
      await nav.getByRole('link', { name: study(next ?? slug).title }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${next}$`), { timeout: 15_000 });
      await expect(page.locator('h1')).toHaveText(study(next ?? slug).title);
    });

    test('the hero phone is the morph target phone-<slug>, and every view-transition name is unique', async ({ page }) => {
      await open(page, `/projects/${slug}`);
      const names = await viewTransitionNames(page);
      // React names the phone only during a transition, so the name is read from its <ViewTransition>.
      expect(names.hero).toEqual({ name: `phone-${slug}`, share: 'morph', default: 'none' });
      expect(names.react).toEqual([`phone-${slug}`]);
      const all = [...names.react, ...names.css];
      expect(new Set(all).size, all.join(', ')).toBe(all.length);
    });

    test('fits the viewport: no horizontal scroll', async ({ page }) => {
      await open(page, `/projects/${slug}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

// ─── Brands ──────────────────────────────────────────────────────────────────────────────

test.describe('brand switching', () => {
  test('Citizen: the switcher and the Preview buttons re-skin one BrandScope and keep ?brand=', async ({ page }) => {
    await open(page, '/projects/defensys-citizen');
    const scope = page.locator('[data-brand-scope="citizen"]');
    await expect(scope).toHaveAttribute('data-brand', 'smile-safe-taytay');
    await expect(page.locator('[data-brand-slot="smile-safe-taytay"]')).toBeVisible();

    await option(page.locator('[data-brand-switcher]'), '1Hope').click();
    await expect(scope).toHaveAttribute('data-brand', '1hope');
    await expect(page).toHaveURL(/[?&]brand=1hope(?:&|$)/);
    // The hero store row follows the brand: its icon and text links, never a badge image.
    const row = page.locator('[data-brand-slot="1hope"]');
    await expect(row).toBeVisible();
    await expect(page.locator('[data-brand-slot="smile-safe-taytay"]')).toBeHidden();
    await expect(row.getByRole('link', { name: /^Google Play listing for 1Hope/ })).toBeVisible();
    await expect(row.getByRole('link', { name: /^App Store listing for 1Hope/ })).toBeVisible();

    const preview = page.locator('#brands').getByRole('button', { name: 'Preview SJDM App' });
    await expect(preview).toHaveAttribute('aria-pressed', 'false');
    await preview.click();
    await expect(preview).toHaveAttribute('aria-pressed', 'true');
    await expect(scope).toHaveAttribute('data-brand', 'sjdm-app');
    await expect(page).toHaveURL(/[?&]brand=sjdm-app(?:&|$)/);
    await expect(page.locator('#brands').getByRole('button', { name: 'Preview 1Hope' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-brand-switcher] input[value="sjdm-app"]')).toBeChecked();
  });

  test('Citizen: a flank never twins the main phone', async ({ page }) => {
    await open(page, '/projects/defensys-citizen');
    const start = page.locator('[data-flank="start"] [data-flank-brand]');
    await expect(start).toHaveAttribute('data-flank-brand', 'own');
    await option(page.locator('[data-brand-switcher]'), '1Hope').click();
    // The 1Hope flank would match the 1Hope main phone, so it takes the default brand's colours.
    await expect(start).toHaveAttribute('data-flank-brand', 'fallback');
  });

  test('Citizen: the server renders the default brand and ?brand= selects another one', async ({ page }) => {
    await open(page, '/projects/defensys-citizen?brand=aero-app');
    await expect(page.locator('[data-brand-scope="citizen"]')).toHaveAttribute('data-brand', 'aero-app');
    await expect(page.locator('[data-brand-slot="aero-app"]')).toBeVisible();
  });

  test('Responder: the switcher offers the four brands and keeps ?brand=', async ({ page }) => {
    await open(page, '/projects/defensys-responder');
    const switcher = page.locator('[data-brand-switcher]');
    await expect(switcher.getByRole('radio')).toHaveCount(4);
    await option(switcher, 'SJDM').click();
    await expect(page.locator('[data-brand-scope="responder"]')).toHaveAttribute('data-brand', 'sjdm');
    await expect(page).toHaveURL(/[?&]brand=sjdm(?:&|$)/);
    await expect(page.locator('#brands').getByRole('button', { name: 'Preview SJDM' })).toHaveAttribute('aria-pressed', 'true');
    // Privately distributed: no store links anywhere on the page.
    await expect(page.locator('main a[href*="play.google.com"], main a[href*="apps.apple.com"]')).toHaveCount(0);
  });

  test('SME has no brand switcher', async ({ page }) => {
    await open(page, '/projects/sme-panindio');
    await expect(page.locator('[data-brand-scope]')).toHaveCount(0);
    await expect(page.locator('[data-brand-switcher]')).toHaveCount(0);
  });
});

// ─── Screens ─────────────────────────────────────────────────────────────────────────────

test.describe('the Screens source toggle', () => {
  test('Citizen: switches to the selected brand’s real screenshots, one brand at a time, never double-framed', async ({ page }) => {
    await open(page, '/projects/defensys-citizen');
    const toggle = page.locator('#screens [data-source-toggle]');
    await expect(toggle).toHaveAttribute('data-source', 'replica');
    await expect(toggle.locator('[data-source-pane="replica"]')).toBeVisible();
    await expect(toggle.locator('[data-source-pane="replica"] .phone')).toHaveCount(study('defensys-citizen').screens.length);

    await option(toggle, /screenshots \(\d+\)/i).click();
    await expect(toggle).toHaveAttribute('data-source', 'store');
    const shown = toggle.locator('[data-source-pane="store"]:not([hidden])');
    await expect(shown).toHaveCount(1);
    await expect(shown).toHaveAttribute('data-brand', 'smile-safe-taytay');
    await expect(toggle.locator('[data-source-pane="replica"]')).toBeHidden();

    // Marketing screenshots sit in bordered cards, never inside a phone frame; all have real alt text.
    await expect(shown.locator('.phone')).toHaveCount(0);
    const images = shown.locator('.screen-card img');
    expect(await images.count()).toBeGreaterThan(0);
    const alts = await images.evaluateAll((elements) => elements.map((element) => element.getAttribute('alt') ?? ''));
    expect(alts.every((alt) => alt.trim().length > 10)).toBe(true);

    // One brand at a time: another brand shows its own listing's screenshots.
    await option(page.locator('[data-brand-switcher]'), '1Hope').click();
    await expect(shown).toHaveAttribute('data-brand', '1hope');

    await option(toggle, 'Coded replica').click();
    await expect(toggle).toHaveAttribute('data-source', 'replica');
    await expect(toggle.locator('[data-source-pane="replica"]')).toBeVisible();
  });

  for (const slug of ['sme-panindio', 'defensys-responder'] as const) {
    test(`${slug}: no real screenshots, so a fixed label instead of the toggle`, async ({ page }) => {
      await open(page, `/projects/${slug}`);
      const toggle = page.locator('#screens [data-source-toggle]');
      await expect(toggle).toContainText('Coded replica · fictional data');
      await expect(toggle.getByRole('radio')).toHaveCount(0);
      await expect(toggle.locator('[data-source-pane="replica"] .phone')).toHaveCount(study(slug).screens.length);
    });
  }
});

// ─── Unknown slugs ───────────────────────────────────────────────────────────────────────

test('an unknown case-study slug is a 404', async ({ page }) => {
  const response = await page.goto('/projects/not-a-case-study');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText(/isn.t on the map/);
});

// ─── View-transition names ───────────────────────────────────────────────────────────────

interface TransitionNames {
  /** The props of the <ViewTransition> around the hero glimpse phone. */
  readonly hero: { readonly name: unknown; readonly share: unknown; readonly default: unknown } | null;
  /** Every named <ViewTransition> boundary on the page. */
  readonly react: readonly string[];
  /** Every view-transition-name set by CSS (e.g. the sidebar). */
  readonly css: readonly string[];
}

/**
 * React applies a <ViewTransition>'s name to the DOM only while a transition runs, so the names
 * are read from the React tree: each element's fiber leads up to its nearest ViewTransition
 * boundary (elementType Symbol.for('react.view_transition'); a boundary's current and alternate
 * fibers share one stateNode, which identifies it). CSS-set names are read from computed styles.
 */
async function viewTransitionNames(page: Page): Promise<TransitionNames> {
  return page.evaluate(() => {
    interface Fiber {
      readonly elementType: unknown;
      readonly memoizedProps: Readonly<Record<string, unknown>> | null;
      readonly stateNode: unknown;
      readonly return: Fiber | null;
    }
    const VIEW_TRANSITION = Symbol.for('react.view_transition');
    const fiberOf = (element: Element): Fiber | null => {
      const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
      return key ? ((element as unknown as Record<string, Fiber>)[key] ?? null) : null;
    };
    const boundaryOf = (element: Element): Fiber | null => {
      for (let fiber = fiberOf(element); fiber; fiber = fiber.return) if (fiber.elementType === VIEW_TRANSITION) return fiber;
      return null;
    };

    const boundaries = new Map<unknown, string>();
    for (const element of document.querySelectorAll('body *')) {
      const boundary = boundaryOf(element);
      const name = boundary?.memoizedProps?.['name'];
      if (boundary && typeof name === 'string') boundaries.set(boundary.stateNode, name);
    }
    const css = [...document.querySelectorAll('*')]
      .map((element) => getComputedStyle(element).viewTransitionName)
      .filter((name) => name !== '' && name !== 'none' && name !== 'auto');

    const track = document.querySelector('[data-cs-hero] .gl-track');
    const hero = track ? boundaryOf(track) : null;
    const props = hero?.memoizedProps ?? null;
    return {
      hero: props ? { name: props['name'], share: props['share'], default: props['default'] } : null,
      react: [...boundaries.values()],
      css,
    };
  });
}
