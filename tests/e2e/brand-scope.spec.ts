import { expect, test, type Page } from '@playwright/test';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import type { Brand } from '@/content/types';

/*
 * BrandScope's URL sync right after hydration (I1; design §5.5: the brand choice persists in
 * ?brand= through history.replaceState, and the server renders the default brand), against the
 * production build.
 *
 * On a static page the scope's URL reader sits inside Suspense, so it mounts in a commit of its
 * own after hydration, and Next.js follows history.replaceState only from the hydration commit's
 * effects on. A brand picked in between used to be lost (never written to the URL) and then
 * undone (the reader trusted useSearchParams, which still said the default).
 *
 * So each test picks from inside the page, at the earliest moment a user's click can land: in a
 * microtask right after the first React commit after which the control is hydrated, before that
 * commit's effects run and before the scope's reader mounts. Then it checks that the URL gets the
 * brand and that, once the scope follows the URL (data-brand-ready), the choice still holds, also
 * on a fresh visit to that URL.
 *
 * E2E specs run in plain Node: no imports from server-only content (derived.ts, store.ts).
 */

// One worker for the file, tests in order (see smoke.spec.ts: parallel Chromium loads stall here).
test.describe.configure({ mode: 'default' });

/** What the page records about each pick (window.__brandPicks). */
interface PickRecord {
  readonly selector: string;
  /** The React commit right after which the pick was made (1: the hydration commit). */
  readonly commit: number;
  /** data-brand-ready on the control's BrandScope at that moment (null: not following the URL yet). */
  readonly ready: string | null;
  /** The scope's brand at that moment. */
  readonly brand: string | null;
}

/**
 * Runs in the page before its scripts. It installs a minimal React DevTools hook (React calls
 * onCommitFiberRoot at the end of every commit, production builds included) and picks each
 * selector in turn, in a microtask right after the first commit after which its element is
 * hydrated (React has attached its props). A radio is picked through its label, as a user does.
 */
function pickRightAfterHydration(selectors: readonly string[]): void {
  const picks: PickRecord[] = [];
  let commits = 0;
  let next = 0;
  let waiting = false;
  const hydrated = (element: Element | null): element is HTMLElement =>
    element instanceof HTMLElement && Object.keys(element).some((key) => key.startsWith('__reactProps$'));
  const hook = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    onScheduleFiberRoot: () => undefined,
    onCommitFiberRoot: () => {
      commits += 1;
      const selector = selectors[next];
      if (waiting || selector === undefined) return;
      const target = document.querySelector(selector);
      if (!hydrated(target)) return;
      waiting = true;
      const commit = commits;
      queueMicrotask(() => {
        const scope = target.closest('[data-brand-scope]');
        picks.push({ selector, commit, ready: scope?.getAttribute('data-brand-ready') ?? null, brand: scope?.getAttribute('data-brand') ?? null });
        next += 1;
        waiting = false;
        (target.closest('label') ?? target).click();
      });
    },
    onPostCommitFiberRoot: () => undefined,
    onCommitFiberUnmount: () => undefined,
    setStrictMode: () => undefined,
    checkDCE: () => undefined,
  };
  Object.assign(window, { __brandPicks: picks, __REACT_DEVTOOLS_GLOBAL_HOOK__: hook });
}

/** Waits for the page to make `count` picks and returns what it recorded. */
async function picks(page: Page, count: number): Promise<readonly PickRecord[]> {
  const read = (): Promise<readonly PickRecord[]> =>
    page.evaluate(() => (window as unknown as { __brandPicks?: PickRecord[] }).__brandPicks ?? []);
  await expect.poll(async () => (await read()).length, { message: 'the page made its picks' }).toBe(count);
  return read();
}

/** The query as a plain object (order-independent). */
const query = (page: Page): Record<string, string> => Object.fromEntries(new URL(page.url()).searchParams);

const defaultOf = (family: readonly Brand[]): string => family.find((brand) => brand.isDefault === true)?.id ?? '';

/** The scope shows `brand`: its data-brand, the switcher's checked radio and the pressed Preview button. */
async function expectBrand(page: Page, app: 'citizen' | 'responder', brand: string): Promise<void> {
  const scope = page.locator(`[data-brand-scope="${app}"]`);
  await expect(scope).toHaveAttribute('data-brand', brand);
  await expect(scope.locator(`[data-brand-switcher] input[value="${brand}"]`)).toBeChecked();
  await expect(scope.locator(`[data-brand-preview="${brand}"]`)).toHaveAttribute('aria-pressed', 'true');
}

interface HydrationCase {
  readonly title: string;
  readonly path: string;
  readonly app: 'citizen' | 'responder';
  /** The scope's URL key: ?brand= on both case studies (one scope per page). */
  readonly param: string;
  readonly defaultBrand: string;
  readonly brand: string;
  /** The control picked: the brand's radio in the hero switcher, or its #brands Preview button. */
  readonly target: string;
}

const switcherRadio = (app: 'citizen' | 'responder', brand: string): string =>
  `[data-brand-scope="${app}"] [data-brand-switcher] input[value="${brand}"]`;

const CASES: readonly HydrationCase[] = [
  {
    title: 'Citizen hero switcher',
    path: '/projects/defensys-citizen',
    app: 'citizen',
    param: 'brand',
    defaultBrand: defaultOf(citizenBrands),
    brand: '1hope',
    target: switcherRadio('citizen', '1hope'),
  },
  {
    title: 'Citizen #brands Preview button',
    path: '/projects/defensys-citizen',
    app: 'citizen',
    param: 'brand',
    defaultBrand: defaultOf(citizenBrands),
    brand: 'sjdm-app',
    target: '[data-brand-scope="citizen"] #brands [data-brand-preview="sjdm-app"]',
  },
  {
    title: 'Responder hero switcher',
    path: '/projects/defensys-responder',
    app: 'responder',
    param: 'brand',
    defaultBrand: defaultOf(responderBrands),
    brand: 'sjdm',
    target: switcherRadio('responder', 'sjdm'),
  },
];

test.describe('a brand picked right after hydration', () => {
  for (const item of CASES) {
    test(`${item.title}: stays selected and reaches ?${item.param}=`, async ({ page, context }) => {
      await page.addInitScript(pickRightAfterHydration, [item.target]);
      const response = await page.goto(item.path, { waitUntil: 'load' });
      expect(response?.status()).toBe(200);

      // The pick landed in the race window: on the server's default brand, before the scope followed the URL.
      const [pick] = await picks(page, 1);
      expect(pick?.ready, 'picked before the scope followed the URL').toBeNull();
      expect(pick?.brand).toBe(item.defaultBrand);

      const scope = page.locator(`[data-brand-scope="${item.app}"]`);
      await expect(scope).toHaveAttribute('data-brand-param', item.param);
      // Not lost: the URL gets the brand under the scope's key...
      await expect.poll(() => query(page)[item.param]).toBe(item.brand);
      // ...and not undone: once the scope follows the URL, the choice still holds, there and in the URL.
      await expect(scope).toHaveAttribute('data-brand-ready', '');
      await expectBrand(page, item.app, item.brand);
      expect(query(page)[item.param]).toBe(item.brand);

      // A fresh visit to that URL shows the same brand (the server renders the default; the URL applies).
      const visit = await context.newPage();
      await visit.goto(page.url(), { waitUntil: 'load' });
      await expect(visit.locator(`[data-brand-scope="${item.app}"]`)).toHaveAttribute('data-brand-ready', '');
      await expectBrand(visit, item.app, item.brand);
      await visit.close();
    });
  }

  test('Showcase Responder (?rbrand=): an App and a brand picked right after hydration both stay', async ({ page, context }) => {
    // The Responder chips appear once Responder is chosen; their scope keeps ?rbrand= (beside Citizen's ?brand=).
    const app = '#showcase-app-filter input[value="responder"]';
    const brand = '[data-showcase-filters] [data-brand-scope="responder"] [data-brand-switcher] input[value="bagong-pag-asa"]';
    await page.addInitScript(pickRightAfterHydration, [app, brand]);
    const response = await page.goto('/showcase', { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    await picks(page, 2);

    await expect.poll(() => query(page)).toEqual({ app: 'responder', rbrand: 'bagong-pag-asa' });
    await page.locator('[data-showcase-filters][data-ready]').waitFor();
    // The filter bar's scope and the wall's follow the same key.
    const scopes = page.locator('[data-brand-scope="responder"]');
    await expect(scopes).toHaveCount(2);
    for (const scope of await scopes.all()) {
      await expect(scope).toHaveAttribute('data-brand-param', 'rbrand');
      await expect(scope).toHaveAttribute('data-brand-ready', '');
      await expect(scope).toHaveAttribute('data-brand', 'bagong-pag-asa');
    }
    await expect(page.locator(app)).toBeChecked();
    await expect(page.locator(brand)).toBeChecked();
    expect(query(page)).toEqual({ app: 'responder', rbrand: 'bagong-pag-asa' });

    const visit = await context.newPage();
    await visit.goto(page.url(), { waitUntil: 'load' });
    await visit.locator('[data-showcase-filters][data-ready]').waitFor();
    await expect(visit.locator(brand)).toBeChecked();
    await expect(visit.locator('[data-showcase] [data-brand-scope="responder"]').last()).toHaveAttribute('data-brand', 'bagong-pag-asa');
    await visit.close();
  });
});
