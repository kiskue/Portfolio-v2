'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';
import type { SiteRoute } from '@/content/types';

export type IntentLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  readonly href: SiteRoute;
  readonly replace?: boolean;
  readonly scroll?: boolean;
  readonly transitionTypes?: string[];
};

/**
 * A next/link that prefetches only once the user shows intent (first hover, keyboard focus or
 * touch), for the pages with replica phones: Home, /projects, the case studies and the Showcase.
 *
 * It starts with `prefetch={false}` (no viewport prefetch) and switches to `null` (Next's
 * default) on intent. The switch re-mounts Next's link instance, and its IntersectionObserver
 * prefetches the (visible) link straight away. Prefetching only runs in production builds.
 * Use it through SiteLink / ButtonLink, which pick it for these routes automatically.
 */
export function IntentLink({ onMouseEnter, onFocus, onTouchStart, ...props }: IntentLinkProps) {
  const [armed, setArmed] = useState(false);

  return (
    <Link
      {...props}
      prefetch={armed ? null : false}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        setArmed(true);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setArmed(true);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        setArmed(true);
      }}
    />
  );
}
