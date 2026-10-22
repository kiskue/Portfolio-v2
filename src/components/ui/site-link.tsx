import Link from 'next/link';
import type { ComponentProps } from 'react';
import type { SiteRoute } from '@/content/types';
import { IntentLink } from '@/components/ui/intent-link';
import { resolvePrefetch, type LinkPrefetch } from '@/components/ui/link-prefetch';

export type SiteLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  /** A typed internal route: static pages (with ?query / #hash) or a case-study path. */
  readonly href: SiteRoute;
  /**
   * Next's prefetch values, plus 'intent' (prefetch on first hover, focus or touch). Omitted:
   * Home and the heavy routes (case studies, /showcase) use 'intent', everything else Next's
   * default.
   */
  readonly prefetch?: LinkPrefetch;
  /** Passed to React.addTransitionType for <ViewTransition> (Link prop since Next 16.2). */
  readonly transitionTypes?: readonly string[];
  readonly replace?: boolean;
  readonly scroll?: boolean;
};

/** Home, with or without ?query or #hash. */
const HOME_ROUTE = /^\/(?:[?#]|$)/;

/*
 * Home prefetches on intent too, like the heavy routes in link-prefetch.ts (PLAN → Performance
 * budgets → Prefetch; ruling F2 in the wave 2b ledger). Its prefetch is the site's largest (about
 * 63 KB brotli: the glimpse trio, the bento and the marquee), and it carries stylesheet hints for
 * Home's own CSS. React preloads each hinted stylesheet as soon as the prefetch arrives, so a
 * viewport prefetch of Home from the top bar or the rail left preloads the current page never
 * used, and Chrome warns about each one about 3 s later. On intent, the visitor is about to open
 * Home, which applies them.
 */
function defaultPrefetch(href: SiteRoute): LinkPrefetch | undefined {
  return HOME_ROUTE.test(href) ? 'intent' : undefined;
}

/**
 * The one internal-link primitive: next/link plus the site's prefetch policy
 * (see link-prefetch.ts; Home is added above). Hook-free, so it renders in Server and Client
 * Components alike. External URLs use ExternalLink instead.
 */
export function SiteLink({ href, prefetch, transitionTypes, ...rest }: SiteLinkProps) {
  // An explicit value always wins, null (Next's default) included.
  const mode = resolvePrefetch(href, prefetch === undefined ? defaultPrefetch(href) : prefetch);
  const types = transitionTypes ? [...transitionTypes] : undefined;
  if (mode === 'intent') return <IntentLink href={href} transitionTypes={types} {...rest} />;
  return <Link href={href} prefetch={mode} transitionTypes={types} {...rest} />;
}
