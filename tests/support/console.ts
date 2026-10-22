import type { ConsoleMessage, Page } from '@playwright/test';

/*
 * Console problems (PLAN.md:402: "no console errors or warnings"): every console error or warning
 * and every uncaught page error, as text. Shared by smoke.spec.ts and console.spec.ts. Nothing is
 * tolerated here: a message that has to be allowed would be matched in this file, exactly, with
 * the ruling that allows it.
 */

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

/** Starts collecting console errors and warnings and uncaught page errors; the array fills as the page runs. */
export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`console.${message.type()}: ${message.text()}`);
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
