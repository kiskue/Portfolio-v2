import type { ReactNode } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { MetaLine } from '@/components/ui/copy';
import { Stat } from '@/components/ui/stat';
import { STORE_NAME, StoreLink } from '@/components/ui/store-link';
import { listingById, storeListings } from '@/content/apps/store';
import { storeSummary } from '@/content/derived';
import { home } from '@/content/home';
import type { StoreListing, StoreListingId, StoreSummary } from '@/content/types';
import { formatDate, formatRatingCount, formatRatingValue } from '@/lib/format';
import { caseStudyHref } from '@/lib/routes';
import { cardLink } from '@/components/sections/home/card-link';

/** A decorative " · " that screen readers hear as a comma (as MetaLine does). */
function Dot(): ReactNode {
  return (
    <>
      <span aria-hidden="true"> · </span>
      <span className="sr-only">, </span>
    </>
  );
}

/** "Smile SAFE Taytay on Google Play": whose figure it is, as a fact about the app. */
function listingLabel(id: StoreListingId): string {
  const listing = listingById(id);
  if (!listing) throw new Error(`Unknown store listing: ${id}`);
  return `${listing.name} on ${STORE_NAME[listing.platform]}`;
}

/** One public listing per brand, the Google Play one where there is one (store order). */
export function brandIcons(listings: readonly StoreListing[]): readonly StoreListing[] {
  const byBrand = new Map<string, StoreListing>();
  for (const listing of listings) {
    const kept = byBrand.get(listing.brand);
    if (!kept || (kept.platform !== 'play' && listing.platform === 'play')) byBrand.set(listing.brand, listing);
  }
  return [...byBrand.values()];
}

/** "6 apps · 8 store listings (6 Google Play · 2 App Store)" from the store summary. */
function ListingsLine({ summary }: { readonly summary: StoreSummary }): ReactNode {
  return (
    <p className="text-body-sm text-ink-2">
      <strong className="font-bold text-ink">{summary.publicBrands} apps</strong>
      <Dot />
      <strong className="font-bold text-ink">{summary.listings} store listings</strong> ({summary.play} {STORE_NAME.play}
      <Dot />
      {summary.appstore} {STORE_NAME.appstore})
    </p>
  );
}

/**
 * The top install band and rating, named as the app's (PLAN: facts about the apps, not personal
 * results). When both come from one listing it is named once, above them.
 */
function StoreFacts({ summary }: { readonly summary: StoreSummary }): ReactNode {
  const { topInstalls, topRating } = summary;
  if (!topInstalls && !topRating) return null;
  const shared = topInstalls && topRating && topInstalls.listing === topRating.listing ? topInstalls.listing : null;
  const whose = (listing: StoreListingId) => (shared ? '' : `, ${listingLabel(listing)}`);
  return (
    <div className="mt-3">
      {shared ? <p className="text-meta font-semibold text-ink-2">{listingLabel(shared)}</p> : null}
      <ul className="mt-1 flex flex-wrap gap-x-8 gap-y-2">
        {topInstalls ? (
          <Stat as="li" size="sm" value={topInstalls.installs} label={`installs${whose(topInstalls.listing)}`} />
        ) : null}
        {topRating ? (
          <Stat
            as="li"
            size="sm"
            value={formatRatingValue(topRating.value)}
            icon="star"
            label={`${formatRatingCount(topRating.count)}${whose(topRating.listing)}`}
          />
        ) : null}
      </ul>
    </div>
  );
}

/**
 * Live on the stores (design §4.3; PLAN "Live on the stores"). Every number and the as-of date
 * come from storeSummary and the store listings (src/content/derived.ts, apps/store.ts), and the
 * figures are worded as facts about the apps. The store icons link out to their listings, so the
 * card has a header link (to the Citizen brands) and no hover lift.
 */
export function LiveStoresCard(): ReactNode {
  const copy = home.cards.live;
  const summary = storeSummary;
  return (
    <BentoCard
      area="live"
      icon="rocket"
      title={copy.title}
      description={copy.description}
      link={cardLink('live', caseStudyHref('defensys-citizen', 'brands'), 'header')}
    >
      <ListingsLine summary={summary} />
      <StoreFacts summary={summary} />
      <ul className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(3.5rem,1fr))] gap-x-1 gap-y-3">
        {brandIcons(storeListings).map((listing) => (
          <li key={listing.id} className="flex justify-center">
            <StoreLink listing={listing} look="icon" className="w-full max-w-20" />
          </li>
        ))}
      </ul>
      <MetaLine
        segments={[`As of ${formatDate(summary.asOf)}`, ...(copy.footnote ? [copy.footnote] : [])]}
        className="mt-auto pt-3 text-meta text-ink-4"
      />
    </BentoCard>
  );
}
