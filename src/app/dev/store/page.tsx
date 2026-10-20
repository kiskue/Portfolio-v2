import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { storeAssetBySrc, storeExclusions, storeListings } from '@/content/apps/store';
import { storeSummary } from '@/content/derived';
import { formatDate, formatInstalls, formatNumber, formatRatingCount, formatRatingValue } from '@/lib/format';
import { MIN_INSTALLS, MIN_RATINGS } from '@/lib/store-rules';
import { Badge, ListingSheet, PLATFORM_LABEL, formatBytes, listingAnchor } from './listing-sheet';

/*
 * /dev/store: the contact sheet for the public Citizen store assets (PLAN "Assets"). It shows
 * every listing with its icon, store facts and display-rule outcome, and every screenshot with
 * its alt text, raw/marketing classification and size, so both can be reviewed by eye.
 * Development only: a 404 in production builds.
 */

export const metadata: Metadata = { title: 'Store assets', robots: { index: false, follow: false } };

function Total({ label, value, detail }: { readonly label: string; readonly value: ReactNode; readonly detail?: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <dt className="text-eyebrow text-ink-3 uppercase">{label}</dt>
      <dd className="mt-2">
        <span className="text-stat">{value}</span>
        {detail ? <span className="mt-1 block text-meta text-ink-2">{detail}</span> : null}
      </dd>
    </div>
  );
}

export default function DevStorePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const screenshots = storeListings.flatMap((listing) => listing.screenshots);
  const raw = screenshots.filter((image) => image.presentation === 'raw').length;
  const files = storeListings.flatMap((listing) => [listing.icon, ...listing.screenshots]);
  const bytes = files.reduce((total, file) => total + (storeAssetBySrc(file.src)?.bytes ?? 0), 0);
  const { topInstalls, topRating } = storeSummary;
  const topInstallsListing = storeListings.find((listing) => listing.id === topInstalls?.listing);
  const topRatingListing = storeListings.find((listing) => listing.id === topRating?.listing);

  return (
    <>
      <h1 className="text-h1">Store assets</h1>
      <p className="mt-4 max-w-[70ch] text-lead text-ink-2">
        Contact sheet for the public Citizen store listings. Review each screenshot&rsquo;s alt text and its classification:{' '}
        <strong className="font-semibold text-ink">raw</strong> is a plain full-bleed capture that may sit inside a phone frame;{' '}
        <strong className="font-semibold text-ink">marketing</strong> has a device frame or caption baked in and never does.
      </p>

      <section aria-labelledby="store-totals" className="mt-8">
        <h2 id="store-totals" className="text-h2">
          Totals
        </h2>
        <dl className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
          <Total label="Listings" value={storeSummary.listings} detail={`${storeSummary.play} Google Play · ${storeSummary.appstore} App Store`} />
          <Total label="Brands" value={storeSummary.publicBrands} detail="Public Citizen brands with a listing" />
          <Total
            label="Screenshots"
            value={storeSummary.screenshots}
            detail={`${raw} raw · ${screenshots.length - raw} marketing · ${storeExclusions.length} excluded`}
          />
          <Total
            label="Files in public/store"
            value={files.length}
            detail={`${screenshots.length} screenshots + ${storeListings.length} icons · ${formatBytes(bytes)} (${formatNumber(bytes)} bytes)`}
          />
          <Total
            label="Top installs shown"
            value={topInstalls ? formatInstalls(topInstalls.installs) : 'None'}
            detail={topInstallsListing ? `${topInstallsListing.name}, ${PLATFORM_LABEL[topInstallsListing.platform]}` : undefined}
          />
          <Total
            label="Top rating shown"
            value={topRating ? formatRatingValue(topRating.value) : 'None'}
            detail={
              topRating && topRatingListing
                ? `${formatRatingCount(topRating.count)}, ${topRatingListing.name}, ${PLATFORM_LABEL[topRatingListing.platform]}`
                : undefined
            }
          />
          <Total
            label="Display rules"
            value={`≥${formatNumber(MIN_INSTALLS)} · ≥${MIN_RATINGS}`}
            detail={
              <>
                Installs from 1K+, ratings from {MIN_RATINGS} ratings; below that a fact is <Badge tone="muted">hidden</Badge>
              </>
            }
          />
          <Total label="As of" value={formatDate(storeSummary.asOf)} detail="Refresh quarterly with npm run assets:prepare" />
        </dl>
      </section>

      <nav aria-label="Listings" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {storeListings.map((listing) => (
            <li key={listing.id}>
              <a
                href={`#${listingAnchor(listing)}`}
                className="inline-flex min-h-8 items-center rounded-control border border-line bg-surface px-3 text-body-sm text-ink hover:bg-nav-hover"
              >
                {listing.name} · {PLATFORM_LABEL[listing.platform]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-8">
        {storeListings.map((listing) => (
          <ListingSheet key={listing.id} listing={listing} />
        ))}
      </div>
    </>
  );
}
