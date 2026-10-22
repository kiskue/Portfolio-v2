import AxeBuilder from '@axe-core/playwright';
import { expect, test, type ConsoleMessage, type Locator, type Page } from '@playwright/test';
import { profile } from '@/content/profile';
import { CONTACT_TOPIC_LABELS, MIN_FILL_MS } from '@/lib/contact/fields';
import { CONTACT_ERRORS } from '@/lib/contact/schema';
import { DISPLAY_KEY } from '@/lib/display-settings';

/*
 * /contact (PLAN → Contact and Verification: "without JS, errors and success both work, and the
 * honeypot rejects"; S4.37, S6.39). Runs against `next build && next start` with
 * CONTACT_TRANSPORT=log (playwright.config.ts), so a valid message is printed by the server
 * instead of sent. The same three outcomes are checked with JavaScript off and on, plus the
 * ?topic= preset and the FAQ details.
 *
 * Addresses use the reserved example domain only.
 */

test.describe.configure({ mode: 'default' });

const VALID = {
  topic: CONTACT_TOPIC_LABELS.project,
  name: 'Ana Reyes',
  email: 'ana@example.com',
  message: 'Could you build an offline-first field app for our inspectors?',
} as const;

interface Entry {
  readonly topic?: string;
  readonly name?: string;
  readonly email?: string;
  readonly message?: string;
}

const form = (page: Page): Locator => page.getByRole('form', { name: 'Send a message' });
const summary = (page: Page): Locator => page.locator('[data-contact-status="invalid"]');
const alert = (page: Page): Locator => page.locator('[data-contact-status="blocked"], [data-contact-status="failed"]');
const thanks = (page: Page): Locator => page.getByRole('heading', { name: 'Thanks — message sent.' });

async function fill(page: Page, entry: Entry): Promise<void> {
  const fields = form(page);
  if (entry.topic) await fields.getByText(entry.topic, { exact: true }).click();
  if (entry.name !== undefined) await fields.getByLabel('Name').fill(entry.name);
  if (entry.email !== undefined) await fields.getByLabel('Email').fill(entry.email);
  if (entry.message !== undefined) await fields.getByLabel('Message').fill(entry.message);
}

/** Puts a value in the honeypot, as a bot that fills every field would. People can't reach it. */
async function fillHoneypot(page: Page): Promise<void> {
  await page.locator('input[name="website"]').fill('https://spam.example', { force: true });
}

const send = (page: Page) => form(page).getByRole('button', { name: 'Send message' }).click();

/** Waits until React has hydrated <main> (client islands are live). */
async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => Object.keys(document.querySelector('main') ?? {}).some((key) => key.startsWith('__reactFiber')));
}

/** Waits until the page has been open for the minimum fill time, as a person would take. */
async function fillTimeElapsed(page: Page): Promise<void> {
  await page.waitForFunction((min) => performance.now() >= min, MIN_FILL_MS + 250);
}

function consoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('an empty message comes back with every error, linked to its field', async ({ page }) => {
    await page.goto('/contact');
    await send(page);
    await expect(page).toHaveURL(/\/contact#send-message$/);
    await expect(summary(page)).toBeVisible();
    await expect(summary(page).getByRole('heading', { name: 'Your message wasn’t sent' })).toBeVisible();
    const links = summary(page).getByRole('link');
    await expect(links).toHaveText([CONTACT_ERRORS.topic, CONTACT_ERRORS.nameMissing, CONTACT_ERRORS.emailMissing, CONTACT_ERRORS.messageMissing]);
    await expect(links.first()).toHaveAttribute('href', '#contact-topic');
    for (const label of ['Name', 'Email', 'Message']) await expect(form(page).getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
    await expect(thanks(page)).toHaveCount(0);
  });

  test('invalid values come back as typed, with their errors', async ({ page }) => {
    await page.goto('/contact');
    await fill(page, { topic: CONTACT_TOPIC_LABELS.hiring, name: 'Ana Reyes', email: 'ana@', message: 'Too short' });
    await send(page);
    await expect(summary(page).getByRole('link')).toHaveText([CONTACT_ERRORS.emailInvalid, CONTACT_ERRORS.messageShort]);
    const fields = form(page);
    await expect(fields.getByRole('radio', { name: CONTACT_TOPIC_LABELS.hiring })).toBeChecked();
    await expect(fields.getByLabel('Name')).toHaveValue('Ana Reyes');
    await expect(fields.getByLabel('Name')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(fields.getByLabel('Email')).toHaveValue('ana@');
    await expect(fields.getByLabel('Email')).toHaveAttribute('aria-describedby', 'contact-email-error');
    await expect(fields.getByLabel('Message')).toHaveValue('Too short');
  });

  test('a valid message is sent and the form is replaced by the thank-you panel', async ({ page }) => {
    await page.goto('/contact');
    await fill(page, VALID);
    await send(page);
    await expect(thanks(page)).toBeVisible();
    await expect(page.getByRole('status').filter({ has: thanks(page) })).toContainText(`I’ll reply to ${VALID.email}.`);
    await expect(form(page)).toHaveCount(0);
  });

  test('the honeypot rejects the message', async ({ page }) => {
    await page.goto('/contact');
    await fill(page, VALID);
    await fillHoneypot(page);
    await send(page);
    await expect(alert(page)).toBeVisible();
    await expect(alert(page)).toContainText('Couldn’t send your message');
    await expect(alert(page).getByRole('link', { name: profile.email })).toHaveAttribute('href', `mailto:${profile.email}`);
    await expect(thanks(page)).toHaveCount(0);
    // What was typed is kept, so a person caught by mistake loses nothing.
    await expect(form(page).getByLabel('Message')).toHaveValue(VALID.message);
  });

  test('the FAQs open and close, one at a time, with no script', async ({ page }) => {
    await page.goto('/contact');
    const faqs = page.getByRole('region', { name: 'FAQs' });
    const details = faqs.locator('details');
    await expect(details.first()).toHaveAttribute('name', 'faq');
    const [first, second] = [details.nth(0), details.nth(1)];
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('p')).toBeVisible();
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    await expect(first).not.toHaveAttribute('open', '');
    await second.locator('summary').click();
    await expect(second).not.toHaveAttribute('open', '');
  });
});

test.describe('with JavaScript', () => {
  test('an empty message shows the errors in place and focuses the summary', async ({ page }) => {
    const problems = consoleProblems(page);
    await page.goto('/contact');
    await hydrated(page);
    // A full page load would drop this marker: errors must arrive without one.
    await page.evaluate(() => Object.assign(window, { __contactMarker: true }));
    await send(page);
    await expect(summary(page)).toBeFocused();
    await expect(summary(page).getByRole('link')).toHaveCount(4);
    expect(await page.evaluate(() => '__contactMarker' in window)).toBe(true);
    await expect(page).toHaveURL(/\/contact$/);

    // A summary link moves focus to its field; the topic link to the first radio.
    await summary(page).getByRole('link', { name: CONTACT_ERRORS.emailMissing }).click();
    await expect(form(page).getByLabel('Email')).toBeFocused();
    await summary(page).getByRole('link', { name: CONTACT_ERRORS.topic }).click();
    await expect(form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.hiring })).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('a valid message is sent: "Sending…", then the thank-you heading takes focus', async ({ page }) => {
    const problems = consoleProblems(page);
    await page.goto('/contact');
    await hydrated(page);
    // Hold the action's POST briefly, so the pending state can be seen.
    await page.route('**/contact', async (route) => {
      if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await fill(page, VALID);
    await fillTimeElapsed(page);
    await send(page);
    const sending = form(page).getByRole('button', { name: 'Sending…' });
    await expect(sending).toHaveAttribute('aria-busy', 'true');
    await expect(sending).toHaveAttribute('type', 'button');
    await expect(form(page).getByRole('status')).toHaveText('Sending your message…');
    await expect(thanks(page)).toBeFocused();
    await expect(form(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('a message sent too quickly is asked to send again, then goes through', async ({ page }) => {
    await page.goto('/contact');
    await hydrated(page);
    await fill(page, VALID);
    // A bot posts the moment the page loads: make the page look one tenth of a second old.
    await page.evaluate(() => {
      const realNow = performance.now.bind(performance);
      Object.assign(window, { __realNow: realNow });
      performance.now = () => 100;
    });
    await send(page);
    await expect(summary(page)).toBeFocused();
    await expect(summary(page)).toContainText(CONTACT_ERRORS.tooFast);
    await expect(form(page).getByLabel('Message')).toHaveValue(VALID.message);

    await page.evaluate(() => {
      performance.now = (window as unknown as { __realNow: () => number }).__realNow;
    });
    await fillTimeElapsed(page);
    await send(page);
    await expect(thanks(page)).toBeFocused();
  });

  test('the honeypot rejects the message and the alert takes focus', async ({ page }) => {
    await page.goto('/contact');
    await hydrated(page);
    await fill(page, VALID);
    await fillHoneypot(page);
    await fillTimeElapsed(page);
    await send(page);
    await expect(alert(page)).toBeFocused();
    await expect(alert(page).getByRole('button', { name: 'Copy email' })).toBeVisible();
    await expect(thanks(page)).toHaveCount(0);
    await expect(form(page).getByLabel('Name')).toHaveValue(VALID.name);
  });

  test('?topic= preselects the topic; an unknown topic preselects nothing', async ({ page }) => {
    await page.goto('/contact?topic=testimonial');
    await hydrated(page);
    await expect(form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.testimonial })).toBeChecked();

    await page.goto('/contact?topic=nope');
    await hydrated(page);
    const radios = form(page).getByRole('radio');
    await expect(radios).toHaveCount(4);
    for (const radio of await radios.all()) await expect(radio).not.toBeChecked();
  });

  test('the topic radios are one group: arrow keys move the choice', async ({ page }) => {
    await page.goto('/contact?topic=project');
    await hydrated(page);
    const project = form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.project });
    await expect(project).toBeChecked();
    await project.focus();
    await page.keyboard.press('ArrowRight');
    await expect(form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.testimonial })).toBeChecked();
    await expect(form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.testimonial })).toBeFocused();
  });

  test('the preset topic is sent with the message', async ({ page }) => {
    await page.goto('/contact?topic=hiring');
    await hydrated(page);
    await expect(form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.hiring })).toBeChecked();
    await fill(page, { name: '', email: VALID.email, message: VALID.message });
    await fillTimeElapsed(page);
    await send(page);
    // Only the name is missing: the preset topic counted as chosen, and stays chosen.
    await expect(summary(page).getByRole('link')).toHaveText([CONTACT_ERRORS.nameMissing]);
    await expect(form(page).getByRole('radio', { name: CONTACT_TOPIC_LABELS.hiring })).toBeChecked();
  });
});

/*
 * axe on the page's own content in each state the form can be in (the shell has its own axe
 * test in shell.spec.ts, and W13's suite covers every route at rest).
 */
test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

  async function violations(page: Page): Promise<string[]> {
    const { violations: found } = await new AxeBuilder({ page }).withTags(TAGS).include('main').analyze();
    return found.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`);
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`idle, errors, rejected and sent states have no violations in ${theme}`, async ({ page }) => {
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
      await page.goto('/contact');
      await hydrated(page);
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/);
      else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
      expect(await violations(page), 'at rest').toEqual([]);

      await page.getByRole('region', { name: 'FAQs' }).locator('summary').first().click();
      await send(page);
      await expect(summary(page)).toBeFocused();
      expect(await violations(page), 'errors and an open FAQ').toEqual([]);

      await fill(page, VALID);
      await fillHoneypot(page);
      await fillTimeElapsed(page);
      await send(page);
      await expect(alert(page)).toBeFocused();
      expect(await violations(page), 'rejected').toEqual([]);

      await page.locator('input[name="website"]').fill('', { force: true });
      await send(page);
      await expect(thanks(page)).toBeFocused();
      expect(await violations(page), 'sent').toEqual([]);
    });
  }
});
