import { expect, test, type Locator, type Page } from '@playwright/test';
import { aiBuilds } from '@/content/ai-builds';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import { services } from '@/content/services';
import { tools } from '@/content/tools';
import type { GlimpseId } from '@/content/types';

/*
 * Home's own behaviour (W8), against the production build: the bento's order and card links
 * (design §2 "Where the Home bento cards link"), the tools marquee (Pause/Play, hover and
 * off-screen pause, still without JavaScript, wrapped chips under reduced motion), the glimpse
 * trio (Pause/Replay, the stop after two rotations, every step at its posterState under reduced
 * motion: S2.30) and the DOM budget. Cross-cutting checks (axe, budgets, first screen at
 * 1447×722, view-transition names) belong to W13's suites.
 *
 * E2E specs run in plain Node: they import only content without a server-only guard.
 */

const AREAS = ['proj', 'about', 'ai', 'live', 'cred', 'serv', 'testi'] as const;
const HOME_GLIMPSES: readonly GlimpseId[] = ['home.sme', 'home.citizen', 'home.responder'];
const home = HOME_GLIMPSES.map((id) => {
  const glimpse = glimpses.find((candidate) => candidate.id === id);
  if (!glimpse) throw new Error(`missing glimpse ${id}`);
  return glimpse;
});
const figureById = new Map(figures.map((figure) => [figure.id, figure] as const));
/** Per track and step: does the step have a separate still poster (its posterState differs)? */
const posterFrames = home.map((glimpse) =>
  glimpse.steps.map((step) => step.posterState !== undefined && step.posterState !== (step.state ?? figureById.get(step.figure)?.states[0])),
);
/** One rotation of the Home trio, in ms. */
const ROTATION_MS = home.reduce((total, glimpse) => total + glimpse.steps.reduce((sum, step) => sum + step.holdMs, 0), 0);

const bento = (page: Page): Locator => page.locator('[data-section="bento"]');
const cell = (page: Page, area: (typeof AREAS)[number]): Locator => bento(page).locator(`[data-bento="${area}"]`);
const strip = (page: Page): Locator => page.locator('[data-section="tools"]');
const player = (page: Page): Locator => cell(page, 'proj').locator('[data-glimpse-root]');

async function hrefs(links: Locator): Promise<(string | null)[]> {
  return links.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
}

/** The track that plays and the frame it shows: "track.step:kind". */
async function shownFrame(page: Page): Promise<string> {
  return player(page).evaluate((root) => {
    const track = root.querySelector('.gl-track[data-current]');
    const frame = track?.querySelector(':scope > .gl-frame[data-shown]');
    return `${track?.getAttribute('data-glimpse-track')}.${frame?.getAttribute('data-step')}:${frame?.getAttribute('data-kind')}`;
  });
}

/**
 * Nothing overflows sideways: the document is no wider than the viewport, and a mobile browser
 * keeps its layout viewport at the device width (overflow makes it zoom the page out).
 */
async function expectNoSidewaysOverflow(page: Page): Promise<void> {
  const width = page.viewportSize()?.width ?? 0;
  const measured = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(measured).toEqual({ scroll: width, inner: width });
}

async function marqueeState(page: Page): Promise<{ running: boolean; playState: string; name: string }> {
  return strip(page).evaluate((root) => ({
    running: root.hasAttribute('data-running'),
    playState: getComputedStyle(root.querySelector('[data-marquee]') as Element).animationPlayState,
    name: root.querySelector('.ts-pause')?.getAttribute('aria-label') ?? '',
  }));
}

test.describe('Home structure', () => {
  test('one H1, the tools strip and the seven bento cards in reading order', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Mobile apps that keep working when the network doesn’t.');
    await expect(strip(page).locator('[data-marquee]')).toHaveCount(1);
    expect(await bento(page).locator('[data-bento]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-bento')))).toEqual([
      ...AREAS,
    ]);
    // Every card is a section named by its h2.
    for (const area of AREAS) await expect(cell(page, area).locator('section h2')).toHaveCount(1);
    await page.waitForLoadState('networkidle');
    await expectNoSidewaysOverflow(page);
  });

  test('the tools strip lists every tool once for assistive technology', async ({ page }) => {
    await page.goto('/');
    const lists = strip(page).locator('ul');
    await expect(lists).toHaveCount(2);
    await expect(lists.nth(0).locator('li')).toHaveCount(tools.length);
    await expect(lists.nth(1)).toHaveAttribute('aria-hidden', 'true');
    await expect(strip(page).getByRole('listitem')).toHaveCount(tools.length);
  });

  test('stays within the Home DOM budget (3,000 nodes)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const nodes = await page.evaluate(() => document.querySelectorAll('*').length);
    expect(nodes).toBeLessThanOrEqual(3000);
  });
});

test.describe('Home card links (design §2)', () => {
  test('each card links where the design says, whole-card only when nothing else is interactive', async ({ page }) => {
    await page.goto('/');

    // Projects: the header link, and each phone to its case study.
    await expect(cell(page, 'proj').getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects');
    expect(await hrefs(cell(page, 'proj').locator('a.gl-link'))).toEqual([
      '/projects/sme-panindio',
      '/projects/defensys-citizen',
      '/projects/defensys-responder',
    ]);

    // About, Credentials and Testimonials (label mode has quotes): one stretched link each.
    for (const [area, href] of [
      ['about', '/about'],
      ['cred', '/about#credentials'],
      ['testi', '/testimonials'],
    ] as const) {
      expect(await hrefs(cell(page, area).locator('a')), area).toEqual([href]);
    }

    // AI builds: the header link, then one chip per build, named with its status.
    expect(await hrefs(cell(page, 'ai').locator('a'))).toEqual(['/projects?type=ai', ...aiBuilds.map((build) => build.href)]);
    await expect(cell(page, 'ai').getByRole('link', { name: /^SME AI assistant\s*,\s*Beta$/ })).toBeVisible();

    // Live: the header link to the Citizen brands, then one store icon per public brand.
    const live = cell(page, 'live').locator('a');
    await expect(live.first()).toHaveAttribute('href', '/projects/defensys-citizen#brands');
    const stores = cell(page, 'live').locator('a[href^="https://"]');
    await expect(stores).toHaveCount(6);
    for (const href of await hrefs(stores)) expect(href).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=/);
    await expect(cell(page, 'live').getByRole('link', { name: /^Smile SAFE Taytay on Google Play/ })).toBeVisible();

    // Services: the header link, then one row per service.
    expect(await hrefs(cell(page, 'serv').locator('a'))).toEqual([
      '/services',
      ...services.map((service) => `/services#${service.id}`),
    ]);
  });

  test('a whole-card link covers its card and lifts it; header-link cards do not lift', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'hover lift needs a hover-capable pointer');
    await page.goto('/');
    const about = cell(page, 'about').locator('section');
    await about.hover({ position: { x: 40, y: 200 } });
    await expect.poll(() => about.evaluate((card) => getComputedStyle(card).translate)).toBe('0px -3px');
    await page.mouse.click(5, 5); // move away
    const ai = cell(page, 'ai').locator('section');
    await ai.hover({ position: { x: 10, y: 10 } });
    await expect.poll(() => ai.evaluate((card) => getComputedStyle(card).translate)).toBe('none');
    // Clicking the polaroids follows the About link.
    await cell(page, 'about').locator('.fan').click({ force: true });
    await expect(page).toHaveURL(/\/about$/);
  });
});

test.describe('Tools marquee', () => {
  test('runs once hydrated; Pause animation stops it and Play animation resumes it (mouse and keyboard)', async ({ page }) => {
    await page.goto('/');
    await strip(page).scrollIntoViewIfNeeded();
    await expect(strip(page)).toHaveAttribute('data-ready', '');
    await expect.poll(async () => (await marqueeState(page)).running).toBe(true);

    await strip(page).getByRole('button', { name: 'Pause animation' }).click();
    await expect(strip(page).getByRole('button', { name: 'Play animation' })).toBeVisible();
    await page.mouse.move(0, 0);
    await page.locator('h1').click();
    expect(await marqueeState(page)).toMatchObject({ running: false, playState: 'paused' });

    // Keyboard: the same button, by Enter.
    await strip(page).getByRole('button', { name: 'Play animation' }).focus();
    await page.keyboard.press('Enter');
    await expect(strip(page).getByRole('button', { name: 'Pause animation' })).toBeFocused();
    await page.locator('h1').click();
    await expect.poll(async () => marqueeState(page)).toMatchObject({ running: true, playState: 'running' });
  });

  test('pauses on hover and focus-within, and while off-screen', async ({ page }, testInfo) => {
    await page.goto('/');
    await strip(page).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await marqueeState(page)).playState).toBe('running');

    if (testInfo.project.name !== 'mobile') {
      await strip(page).locator('.ts-viewport').hover();
      expect((await marqueeState(page)).playState).toBe('paused');
      await page.mouse.move(0, 0);
      await expect.poll(async () => (await marqueeState(page)).playState).toBe('running');
    }

    await strip(page).getByRole('button', { name: 'Pause animation' }).focus();
    expect((await marqueeState(page)).playState).toBe('paused');
    await page.locator('h1').click();
    await page.mouse.move(0, 0);
    await expect.poll(async () => (await marqueeState(page)).playState).toBe('running');

    // Scrolled away: the autoplay policy suspends it (no user pause, so the button still offers Pause).
    await cell(page, 'testi').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => marqueeState(page)).toMatchObject({ running: false, playState: 'paused', name: 'Pause animation' });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the strip is still and each glimpse track shows its poster', async ({ page }) => {
      await page.goto('/');
      await expect(strip(page)).not.toHaveAttribute('data-ready', '');
      expect(await strip(page).locator('[data-marquee]').evaluate((track) => getComputedStyle(track).animationName)).toBe('none');
      const shown = await player(page).evaluate((root) =>
        [...root.querySelectorAll('.gl-track')].map((track) => {
          const frame = track.querySelector(':scope > .gl-frame[data-shown]');
          return `${frame?.getAttribute('data-step')}:${frame?.getAttribute('data-kind')}`;
        }),
      );
      expect(shown).toEqual(home.map((glimpse, track) => `${glimpse.posterStep}:${posterFrames[track]?.[glimpse.posterStep] ? 'poster' : 'play'}`));
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the strip becomes still, wrapped chips with no Pause button', async ({ page }, testInfo) => {
      await page.goto('/');
      await expect(strip(page)).toHaveAttribute('data-ready', '');
      const look = await strip(page).evaluate((root) => ({
        animation: getComputedStyle(root.querySelector('[data-marquee]') as Element).animationName,
        copy: getComputedStyle(root.querySelector('.ts-copy') as Element).display,
        wrap: getComputedStyle(root.querySelector('.ts-list') as Element).flexWrap,
        pause: getComputedStyle(root.querySelector('.ts-pause') as Element).visibility,
      }));
      expect(look).toEqual({ animation: 'none', copy: 'none', wrap: 'wrap', pause: 'hidden' });
      // The chips wrap inside the strip rather than running off the side.
      await expectNoSidewaysOverflow(page);

      if (testInfo.project.name === 'mobile') {
        // Narrow screens show 12 chips and a "Show all" toggle.
        const items = strip(page).locator('.ts-list:not(.ts-copy) > li');
        await expect(items.nth(11)).toBeVisible();
        await expect(items.nth(12)).toBeHidden();
        const toggle = strip(page).getByRole('button', { name: `Show all ${tools.length}` });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(strip(page).getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');
        await expect(items.nth(tools.length - 1)).toBeVisible();
      } else {
        await expect(strip(page).getByRole('button', { name: /^Show all/ })).toBeHidden();
      }
    });
  });
});

test.describe('Glimpse trio', () => {
  test('Pause and Play, then it stops after two rotations and offers Replay', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await player(page).scrollIntoViewIfNeeded();
    await expect(player(page)).toHaveAttribute('data-status', 'playing');

    await player(page).getByRole('button', { name: 'Pause preview' }).click();
    await expect(player(page)).toHaveAttribute('data-status', 'paused');
    await expect(player(page).locator('.gl-track[data-paused]')).toHaveCount(3);
    await player(page).getByRole('button', { name: 'Play preview' }).click();
    await expect(player(page)).toHaveAttribute('data-status', 'playing');

    // Advance the fake clock a second at a time, so each step's timer is set before the next run.
    let elapsed = 0;
    while (elapsed <= ROTATION_MS * 2 + 2000 && (await player(page).getAttribute('data-status')) !== 'ended') {
      await page.clock.runFor(1000);
      elapsed += 1000;
    }
    await expect(player(page)).toHaveAttribute('data-status', 'ended');
    // Two rotations, not fewer: it was still playing a second before they were done.
    expect(elapsed).toBeGreaterThanOrEqual(ROTATION_MS * 2 - 1000);
    const replay = player(page).getByRole('button', { name: 'Replay preview' });
    await expect(replay).toBeVisible();
    await replay.click();
    await expect(player(page)).toHaveAttribute('data-status', 'playing');
    expect(await shownFrame(page)).toBe('0.0:play');
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('waits on the posters, and after Play shows every step at its posterState (S2.30)', async ({ page }) => {
      await page.clock.install();
      await page.goto('/');
      await player(page).scrollIntoViewIfNeeded();
      await expect(player(page)).toHaveAttribute('data-status', 'paused');
      const play = player(page).getByRole('button', { name: 'Play preview' });
      await expect(play).toBeVisible();
      await expect.poll(() => shownFrame(page)).toBe(`0.${home[0]?.posterStep}:${posterFrames[0]?.[home[0]?.posterStep ?? 0] ? 'poster' : 'play'}`);

      await play.click();
      await expect(player(page)).toHaveAttribute('data-status', 'playing');
      for (const [track, glimpse] of home.entries()) {
        for (const [index, step] of glimpse.steps.entries()) {
          const expected = `${track}.${index}:${posterFrames[track]?.[index] ? 'poster' : 'play'}`;
          await expect.poll(() => shownFrame(page), { message: `${glimpse.id} step ${index}` }).toBe(expected);
          await page.clock.runFor(step.holdMs);
        }
      }
      // A poster frame is still: nothing inside it is marked active.
      expect(await player(page).locator('.gl-frame[data-kind="poster"][data-active]').count()).toBe(0);
    });
  });
});
