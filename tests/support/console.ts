import type { ConsoleMessage, Page } from '@playwright/test';

/*
 * Console problems (PLAN → Verification → Smoke: "no console errors or warnings"): every console
 * error or warning and every uncaught page error, as text. Shared by smoke.spec.ts, console.spec.ts
 * and pages.spec.ts. A message that has to be allowed is matched in this file, exactly, with the
 * ruling that allows it. There is one: NOT_FOUND_DOCUMENT_ERROR, below.
 */

/**
 * The one tolerated message (ruling H1-console, wave 2b ledger "Rulings (integration)"; PLAN →
 * Verification → Smoke: "an unknown slug returns 404"). A page that is meant to be a 404 answers
 * its own document request with status 404, and Chrome logs exactly this error for that response,
 * whatever the page renders, so no page can avoid it. It is tolerated only when the test declares
 * that page a 404 (`notFoundUrl`), and only for that document's URL: the same text for any other
 * URL (a missing chunk, image, font or route) is still a problem, as is any other message.
 */
export const NOT_FOUND_DOCUMENT_ERROR = 'Failed to load resource: the server responded with a status of 404 (Not Found)';

export interface ConsoleExpectations {
  /**
   * The absolute URL of a page that is meant to answer 404 (e.g. `new URL('/no-such-page', baseURL).href`):
   * its document's own NOT_FOUND_DOCUMENT_ERROR is expected, and nothing else is.
   */
  readonly notFoundUrl?: string;
}

/** True only for the 404 document's own load error, on the URL the test declared a 404. */
function isNotFoundDocumentError(message: ConsoleMessage, notFoundUrl: string | undefined): boolean {
  return notFoundUrl !== undefined && message.type() === 'error' && message.text() === NOT_FOUND_DOCUMENT_ERROR && message.location().url === notFoundUrl;
}

/** Messages that must never appear, named so a failure says what went wrong. */
const KNOWN_PROBLEMS: readonly (readonly [RegExp, string])[] = [
  [/Encountered a script tag/i, 'React rendered a <script> it will not run (pre-paint script)'],
  [/hydrat/i, 'hydration error or mismatch'],
  [/Minified React error #(?:418|419|421|422|423|425)\b/, 'hydration error (production code)'],
  [
    /was preloaded using link preload but not used within a few seconds/,
    'a stylesheet was preloaded and never applied (a prefetch of a route with its own CSS, or a not-found boundary)',
  ],
];

/**
 * Starts collecting console errors and warnings and uncaught page errors; the array fills as the
 * page runs. Nothing is tolerated, except a declared 404 page's own document error (`expected`).
 */
export function collectConsoleProblems(page: Page, expected: ConsoleExpectations = {}): string[] {
  const { notFoundUrl } = expected;
  if (notFoundUrl !== undefined && !URL.canParse(notFoundUrl)) throw new Error(`notFoundUrl must be an absolute URL, got "${notFoundUrl}"`);
  const problems: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    if (isNotFoundDocumentError(message, notFoundUrl)) return;
    problems.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

/** The collected messages, each prefixed with what it means when it is a known problem. */
export function describeConsoleProblems(messages: readonly string[]): string[] {
  return messages.map((message) => {
    const known = KNOWN_PROBLEMS.find(([pattern]) => pattern.test(message));
    return known ? `${known[1]} — ${message}` : message;
  });
}

/** Resolves once the page has been loaded for `ms` milliseconds (the navigation entry's loadEventEnd). */
export async function idleAfterLoad(page: Page, ms: number): Promise<void> {
  await page.waitForFunction(
    (idle) => {
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return navigation !== undefined && navigation.loadEventEnd > 0 && performance.now() - navigation.loadEventEnd >= idle;
    },
    ms,
    { polling: 250, timeout: ms + 15_000 },
  );
}

/**
 * The stylesheets the page preloads (`<link rel="preload" as="style">`) but does not apply. React
 * adds such a preload for every stylesheet hint in a prefetched route, and Next adds one for each
 * stylesheet of the root not-found boundary; Chrome warns about each one that is still unused about
 * 3 s after it was added.
 */
export async function unusedStylePreloads(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const applied = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href')));
    return [...document.querySelectorAll('link[rel="preload"][as="style"]')]
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => !applied.has(href));
  });
}
