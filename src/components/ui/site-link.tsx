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

/**
 * The one internal-link primitive: next/link plus the site's prefetch policy
 * (see link-prefetch.ts). Hook-free, so it renders in Server and Client Components alike.
 * External URLs use ExternalLink instead.
 */
export function SiteLink({ href, prefetch, transitionTypes, ...rest }: SiteLinkProps) {
  // An explicit value always wins, null (Next's default) included.
  const mode = resolvePrefetch(href, prefetch);
  const types = transitionTypes ? [...transitionTypes] : undefined;
  if (mode === 'intent') return <IntentLink href={href} transitionTypes={types} {...rest} />;
  return <Link href={href} prefetch={mode} transitionTypes={types} {...rest} />;
}
