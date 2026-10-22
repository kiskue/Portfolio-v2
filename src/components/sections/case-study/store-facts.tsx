import Image from 'next/image';
import { Fragment, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { StoreLink } from '@/components/ui/store-link';
import type { BrandStoreFacts, ListingFacts } from '@/content/derived';
import { formatDate, formatInstalls, formatRatingCount, formatRatingValue } from '@/lib/format';
import { cn } from '@/lib/cn';

/*
 * Store facts as the case study shows them (design §5.5, PLAN "Store links"): text links
 * "Google Play ↗" / "App Store ↗" beside the app's public store icon, never official badges, and
 * only the figures that pass the display rules (src/content/derived.ts applies them), each dated.
 */

/** "5K+ installs · 4.2★ (27 ratings)" for one listing, or nothing when no figure passes the rules. */
export function ListingFactsText({ facts, className }: { readonly facts: ListingFacts; readonly className?: string }): ReactNode {
  const parts: ReactNode[] = [];
  if (facts.installs) parts.push(formatInstalls(facts.installs));
  if (facts.rating) {
    parts.push(
      <span className="inline-flex items-center gap-0.5">
        {formatRatingValue(facts.rating.value)}
        <span className="sr-only"> out of 5</span>
        <Icon name="star" size={12} className="text-accent-ink" />
        <span>({formatRatingCount(facts.rating.count)})</span>
      </span>,
    );
  }
  if (parts.length === 0) return null;
  return (
    <span className={cn('text-meta text-ink-3 tabular-nums', className)}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, </span>
            </>
          ) : null}
          {part}
        </Fragment>
      ))}
    </span>
  );
}

/** True when any listing of the brand shows a figure (so the row needs its as-of date). */
export function hasFigures(facts: BrandStoreFacts): boolean {
  return facts.listings.some((entry) => entry.installs !== null || entry.rating !== null);
}

/** The brand's public store icon (decorative: the name is always next to it). */
export function BrandIcon({ facts, size = 40 }: { readonly facts: BrandStoreFacts; readonly size?: 32 | 40 }): ReactNode {
  return (
    <Image
      src={facts.brand.icon}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn('shrink-0 rounded-control border border-line', size === 40 ? 'size-10' : 'size-8')}
    />
  );
}

/** One listing per line: its text store link, then its figures. */
export function ListingLines({ facts, className }: { readonly facts: BrandStoreFacts; readonly className?: string }): ReactNode {
  return (
    <ul className={cn('flex flex-col gap-1', className)}>
      {facts.listings.map((entry) => (
        <li key={entry.listing.id} className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
          {/* "Google Play ↗" never splits; the figures wrap to their own line when there is no room. */}
          <StoreLink listing={entry.listing} className="whitespace-nowrap" />
          <ListingFactsText facts={entry} />
        </li>
      ))}
    </ul>
  );
}

/** The hero's store row for one brand: icon, name, its listings with their figures, and the date. */
export function BrandStoreRow({ facts }: { readonly facts: BrandStoreFacts }): ReactNode {
  const asOf = facts.listings[0]?.listing.asOf;
  return (
    <div className="flex items-start gap-3">
      <BrandIcon facts={facts} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-sm font-semibold text-ink">{facts.brand.name}</p>
        <ListingLines facts={facts} />
        {asOf && hasFigures(facts) ? <p className="text-[0.75rem] leading-4 text-ink-4">Store figures as of {formatDate(asOf)}</p> : null}
      </div>
    </div>
  );
}
