import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/*
 * axe as the PLAN specifies (Verification → Accessibility; architecture D8 `a11y`): WCAG 2.0 A/AA,
 * 2.1 AA and 2.2 AA. The ONLY exclusion is the color-contrast rule inside replica canvases
 * ([data-replica-canvas]): replicas are role="img" and mirror the shipped apps' colours (for
 * example the SJDM Responder title at 1.87:1). So axe runs twice: every rule except
 * color-contrast with nothing excluded, then color-contrast alone with the canvases excluded.
 */

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] as const;
export const REPLICA_CANVAS = '[data-replica-canvas]';

export interface Violation {
  readonly id: string;
  readonly impact: string | null;
  readonly help: string;
  /** The first targets (CSS selectors) of the failing nodes, with the first failure summary. */
  readonly nodes: readonly string[];
}

export interface AxeScope {
  /** Analyze only this part of the page (e.g. an open dialog). */
  readonly include?: string;
}

function summarize(violations: readonly { id: string; impact?: string | null; help: string; nodes: readonly { target: unknown; failureSummary?: string }[] }[]): Violation[] {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    nodes: violation.nodes.slice(0, 5).map((node) => `${JSON.stringify(node.target)} ${(node.failureSummary ?? '').split('\n').slice(0, 2).join(' ').trim()}`),
  }));
}

/** Resolves after `count` animation frames in the page. */
async function animationFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        const step = (left: number): void => (left === 0 ? resolve() : void requestAnimationFrame(() => step(left - 1)));
        step(frames);
      }),
    count,
  );
}

/*
 * content-visibility: auto (the case-study sections, the Showcase wall's replica tiles) skips
 * rendering off-screen content, and an element that has not rendered yet is only as tall as its
 * contain-intrinsic-size placeholder. axe reads the layout, not the paint, so on a page as loaded
 * it would audit that placeholder layout: content taller than its placeholder overlaps whatever
 * follows it, which no visitor ever sees, because content renders before it reaches the viewport
 * (wave 2b ledger, F3: a Brands phone "behind" the Source toggle at 390px). So the audit renders
 * every such element for a few frames, which records its real size (contain-intrinsic-size:
 * auto), then restores it: the rendering skip stays on, now at the sizes visitors see.
 */
export async function renderSkippedContent(page: Page): Promise<number> {
  const count = await page.evaluate(() => {
    const skipped = [...document.querySelectorAll('*')].filter((element) => getComputedStyle(element).contentVisibility === 'auto');
    for (const element of skipped) element.setAttribute('data-audit-render', '');
    const style = document.createElement('style');
    style.id = 'audit-render';
    style.textContent = '[data-audit-render] { content-visibility: visible !important; }';
    document.head.append(style);
    return skipped.length;
  });
  await animationFrames(page, 3);
  await page.evaluate(() => {
    document.getElementById('audit-render')?.remove();
    for (const element of document.querySelectorAll('[data-audit-render]')) element.removeAttribute('data-audit-render');
  });
  await animationFrames(page, 3);
  return count;
}

/** Every WCAG violation on the page (or in `scope.include`), in a compact, readable form. */
export async function axeViolations(page: Page, scope: AxeScope = {}): Promise<Violation[]> {
  await renderSkippedContent(page);
  const rules = new AxeBuilder({ page }).withTags([...WCAG_TAGS]).disableRules(['color-contrast']);
  const contrast = new AxeBuilder({ page }).withRules(['color-contrast']).exclude(REPLICA_CANVAS);
  if (scope.include) {
    rules.include(scope.include);
    contrast.include(scope.include);
  }
  const [rest, colour] = [await rules.analyze(), await contrast.analyze()];
  return summarize([...rest.violations, ...colour.violations]);
}
