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

/** Every WCAG violation on the page (or in `scope.include`), in a compact, readable form. */
export async function axeViolations(page: Page, scope: AxeScope = {}): Promise<Violation[]> {
  const rules = new AxeBuilder({ page }).withTags([...WCAG_TAGS]).disableRules(['color-contrast']);
  const contrast = new AxeBuilder({ page }).withRules(['color-contrast']).exclude(REPLICA_CANVAS);
  if (scope.include) {
    rules.include(scope.include);
    contrast.include(scope.include);
  }
  const [rest, colour] = [await rules.analyze(), await contrast.analyze()];
  return summarize([...rest.violations, ...colour.violations]);
}
