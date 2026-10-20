/**
 * Prefetch policy for internal links (PLAN.md → Performance budgets → Prefetch).
 *
 * Next 16.4 App Router `<Link prefetch>` values (node_modules/next/dist/docs, link.md):
 * - `null` / `'auto'` (default): prefetch when the link enters the viewport (production only);
 * - `true`: prefetch the full route;
 * - `false`: never prefetch, neither in the viewport NOR on hover.
 *
 * So "prefetch only on hover or focus" needs a fourth mode, `'intent'`: the link starts with
 * `prefetch={false}` and switches to `null` on the first hover, focus or touch (IntentLink, the
 * pattern in the bundled guides/prefetching.md "Hover-triggered prefetch"). Switching re-mounts
 * Next's link instance, whose IntersectionObserver then prefetches the visible link at once.
 *
 * Heavy routes (case studies and Showcase) default to `'intent'`; everything else keeps Next's
 * default. An explicit `prefetch` prop always wins.
 */

/** Next's own `prefetch` values plus `'intent'` (prefetch on the first hover, focus or touch). */
export type LinkPrefetch = boolean | 'auto' | null | 'intent';

/** /showcase and /projects/<slug> (with or without ?query or #hash). /projects itself is light. */
const HEAVY_ROUTE = /^\/(?:showcase|projects\/[^/?#]+)(?:[?#]|$)/;

/** True for routes whose prefetch payload is heavy: the case studies and the Showcase wall. */
export function isHeavyRoute(href: string): boolean {
  return HEAVY_ROUTE.test(href);
}

/** The prefetch mode a link uses: the explicit prop, else 'intent' for heavy routes, else Next's default. */
export function resolvePrefetch(href: string, prefetch?: LinkPrefetch): LinkPrefetch {
  if (prefetch !== undefined) return prefetch;
  return isHeavyRoute(href) ? 'intent' : null;
}
