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
 * The pages with replica phones (Home, /projects, the case studies and Showcase) default to
 * `'intent'`; everything else keeps Next's default. An explicit `prefetch` prop always wins.
 *
 * Home and /projects count as heavy too (ruling F2 in the wave 2b ledger). Home's prefetch is
 * the site's largest (about 63 KB brotli: the glimpse trio, the bento and the marquee), and a
 * prefetch carries stylesheet hints for its route's CSS: Home's own, and the replicas' on both.
 * React preloads each hinted stylesheet as soon as the prefetch arrives, so a viewport prefetch
 * from the top bar or the rail left preloads the current page never used, and Chrome warns about
 * each one about 3 s later.
 */

/** Next's own `prefetch` values plus `'intent'` (prefetch on the first hover, focus or touch). */
export type LinkPrefetch = boolean | 'auto' | null | 'intent';

/** Home, /projects, /projects/<slug> and /showcase (with or without ?query or #hash). */
const HEAVY_ROUTE = /^\/(?:showcase|projects(?:\/[^/?#]+)?)?(?:[?#]|$)/;

/** True for routes whose prefetch is heavy: the pages with replica phones. */
export function isHeavyRoute(href: string): boolean {
  return HEAVY_ROUTE.test(href);
}

/** The prefetch mode a link uses: the explicit prop, else 'intent' for heavy routes, else Next's default. */
export function resolvePrefetch(href: string, prefetch?: LinkPrefetch): LinkPrefetch {
  if (prefetch !== undefined) return prefetch;
  return isHeavyRoute(href) ? 'intent' : null;
}
