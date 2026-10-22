import type { Page } from '@playwright/test';

/*
 * View-transition names on a page (PLAN "Glimpse player": unique phone-<slug> names; review T5).
 *
 * Two sources:
 * - CSS: any rendered element whose computed view-transition-name is a real name (not none,
 *   auto or match-element, which the browser makes unique itself). That includes the UA's
 *   `root` on <html> and the docked rail's `sidebar` (src/components/layout/app-shell.tsx);
 * - React: <ViewTransition name="…"> sets the name only while a transition runs, so at rest it
 *   is invisible to CSS. The mounted boundaries are read from React's fiber tree instead: every
 *   fiber whose elementType is React's view-transition symbol, with its `name` prop. Subtrees
 *   in a hidden <Activity> are skipped (React never names hidden content).
 * A name must not repeat within either source or across them.
 */

export interface PageTransitionNames {
  /** `name` props of the mounted <ViewTransition> boundaries (unnamed ones are skipped). */
  readonly react: readonly string[];
  /** Real computed view-transition-name values, with a short description of each element. */
  readonly css: readonly { readonly name: string; readonly element: string }[];
  /** False when no React root was found (the page did not hydrate). */
  readonly hydrated: boolean;
}

export async function viewTransitionNames(page: Page): Promise<PageTransitionNames> {
  return page.evaluate(() => {
    const AUTO = new Set(['none', 'auto', 'match-element', '']);
    const describe = (element: Element): string => {
      const id = element.id ? `#${element.id}` : '';
      const classes = typeof element.className === 'string' && element.className.trim() ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    // Only rendered elements take part in a transition (not display:none, not content-visibility skipped).
    const css = [...document.querySelectorAll('*')].flatMap((element) => {
      const name = getComputedStyle(element).viewTransitionName;
      return AUTO.has(name) || !element.checkVisibility() ? [] : [{ name, element: describe(element) }];
    });

    interface Fiber {
      readonly tag: number;
      readonly elementType: unknown;
      readonly memoizedProps: { readonly name?: unknown; readonly mode?: unknown } | null;
      readonly child: Fiber | null;
      readonly sibling: Fiber | null;
      readonly return: Fiber | null;
      readonly stateNode: unknown;
    }
    const VIEW_TRANSITION = Symbol.for('react.view_transition');
    /** React's OffscreenComponent tag (the hidden half of <Activity> and Suspense). */
    const OFFSCREEN = 22;
    const html = document.documentElement as unknown as Record<string, Fiber | undefined>;
    const key = Object.keys(html).find((name) => name.startsWith('__reactFiber$'));
    let fiber = key ? html[key] : undefined;
    if (!fiber) return { react: [], css, hydrated: false };
    while (fiber.return) fiber = fiber.return;
    const root = (fiber.stateNode as { current?: Fiber } | null)?.current ?? fiber;

    const react: string[] = [];
    const stack: Fiber[] = [root];
    while (stack.length > 0) {
      const node = stack.pop() as Fiber;
      if (node.sibling) stack.push(node.sibling);
      const hidden = node.tag === OFFSCREEN && node.memoizedProps?.mode === 'hidden';
      if (node.elementType === VIEW_TRANSITION) {
        const name = node.memoizedProps?.name;
        if (typeof name === 'string' && name !== 'auto') react.push(name);
      }
      if (node.child && !hidden) stack.push(node.child);
    }
    return { react, css, hydrated: true };
  });
}

/** Names that occur more than once, each listed once. */
export function duplicates(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }
  return [...repeated].sort();
}

declare global {
  interface Window {
    __qaTransitions?: { names: string[]; ready: string; finished: string; error: string | null }[];
  }
}

/**
 * Wraps document.startViewTransition: each call records the names on the page as the browser is
 * about to capture them (React has named the old elements by then), and whether the transition
 * became ready (an aborted one, e.g. "Unexpected duplicate view-transition-name", rejects).
 */
export async function watchViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    window.__qaTransitions = [];
    const names = (): string[] =>
      [...document.querySelectorAll('*')]
        .filter((element) => element.checkVisibility())
        .map((element) => getComputedStyle(element).viewTransitionName)
        .filter((name) => !['none', 'auto', 'match-element', ''].includes(name));
    document.startViewTransition = ((argument?: Parameters<Document['startViewTransition']>[0]) => {
      const record = { names: names(), ready: 'pending', finished: 'pending', error: null as string | null };
      window.__qaTransitions?.push(record);
      const transition = original(argument);
      transition.ready.then(
        () => (record.ready = 'ok'),
        (error: unknown) => {
          record.ready = 'rejected';
          record.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        },
      );
      transition.finished.then(
        () => (record.finished = 'ok'),
        () => (record.finished = 'rejected'),
      );
      return transition;
    }) as Document['startViewTransition'];
  });
}
