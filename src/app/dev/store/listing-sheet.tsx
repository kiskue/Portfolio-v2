import Image from 'next/image';
import type { ReactNode } from 'react';
import { storeAssetBySrc, storeExclusions } from '@/content/apps/store';
import type { ScreenImage, StoreListing, StorePlatform } from '@/content/types';
import { formatDate, formatInstalls, formatRatingCount, formatRatingValue } from '@/lib/format';
import { MIN_RATINGS, showInstalls, showRating } from '@/lib/store-rules';

/** One listing on the /dev/store contact sheet: its facts, then every screenshot in store order. */

export const PLATFORM_LABEL: Readonly<Record<StorePlatform, string>> = { play: 'Google Play', appstore: 'App Store' };

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function listingAnchor(listing: StoreListing): string {
  return `listing-${listing.id.replace('.', '-')}`;
}

/** "04": a screenshot's store position, which its file name keeps (gaps mark excluded ones). */
function storePosition(position: number): string {
  return String(position).padStart(2, '0');
}

/** The position in the file name (<platform>-NN.webp), else the display order. */
function positionOf(image: ScreenImage, index: number): number {
  const match = /-(\d+)\.webp$/.exec(image.src);
  return match ? Number(match[1]) : index + 1;
}

type Tone = 'pass' | 'muted' | 'neutral';

const TONES: Readonly<Record<Tone, string>> = {
  pass: 'bg-avail-bg text-avail-ink',
  muted: 'border border-line bg-sunken text-ink-3',
  neutral: 'border border-line-strong text-ink-2',
};

export function Badge({ tone, children }: { readonly tone: Tone; readonly children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-meta whitespace-nowrap ${TONES[tone]}`}>{children}</span>
  );
}

function Fact({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className="text-eyebrow text-ink-3 uppercase">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-2 text-body-sm text-ink">{children}</dd>
    </div>
  );
}

function InstallsFact({ listing }: { readonly listing: StoreListing }) {
  if (listing.installs === null) return <Fact label="Installs">Not published on the App Store</Fact>;
  const shown = showInstalls(listing.installs);
  return (
    <Fact label="Installs">
      {formatInstalls(listing.installs)}
      <Badge tone={shown ? 'pass' : 'muted'}>{shown ? 'shown' : 'hidden: below 1K+'}</Badge>
    </Fact>
  );
}

function RatingFact({ listing }: { readonly listing: StoreListing }) {
  const { rating } = listing;
  const shown = showRating(rating);
  return (
    <Fact label="Rating">
      {rating ? `${formatRatingValue(rating.value)} from ${formatRatingCount(rating.count)}` : 'No ratings yet'}
      <Badge tone={shown ? 'pass' : 'muted'}>{shown ? 'shown' : `hidden: fewer than ${MIN_RATINGS} ratings`}</Badge>
    </Fact>
  );
}

function ScreenshotCard({ image, position }: { readonly image: ScreenImage; readonly position: number }) {
  const entry = storeAssetBySrc(image.src);
  return (
    <li>
      <figure className="flex h-full flex-col rounded-card border border-line bg-surface p-3">
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="200px"
          className="h-auto w-full rounded-tile border border-line bg-sunken"
        />
        <figcaption className="mt-3 flex flex-1 flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-2">
            <span className="font-mono">{storePosition(position)}</span>
            <Badge tone={image.presentation === 'raw' ? 'pass' : 'neutral'}>{image.presentation}</Badge>
            <span>
              {image.width} × {image.height}
            </span>
            {entry ? <span>{formatBytes(entry.bytes)}</span> : null}
          </p>
          <p className="text-body-sm text-ink">
            <span className="font-semibold">Alt:</span> {image.alt}
          </p>
          <p className="mt-auto text-meta text-ink-3">{image.alt.length} characters</p>
        </figcaption>
      </figure>
    </li>
  );
}

export function ListingSheet({ listing }: { readonly listing: StoreListing }) {
  const anchor = listingAnchor(listing);
  const platform = PLATFORM_LABEL[listing.platform];
  const excluded = storeExclusions.filter((item) => item.listing === listing.id);
  return (
    <section aria-labelledby={anchor} className="scroll-mt-6 rounded-bento border border-line bg-raised p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center gap-4">
        <Image
          src={listing.icon.src}
          width={listing.icon.width}
          height={listing.icon.height}
          alt=""
          sizes="56px"
          className="size-14 rounded-control border border-line"
        />
        <div className="min-w-0 flex-1 basis-48">
          <h2 id={anchor} className="text-h2">
            {listing.name}
            <span className="text-ink-3"> · {platform}</span>
          </h2>
          <p className="mt-1 text-meta text-ink-3">
            <code className="font-mono">{listing.id}</code> · icon {listing.icon.width} × {listing.icon.height}
          </p>
        </div>
        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-6 items-center gap-1 rounded-control font-semibold text-ink underline underline-offset-4 hover:text-accent-ink"
        >
          {platform} listing<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </header>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Publisher">{listing.publisher}</Fact>
        <InstallsFact listing={listing} />
        <RatingFact listing={listing} />
        <Fact label="As of">{formatDate(listing.asOf)}</Fact>
      </dl>

      <h3 className="mt-6 text-card-title">
        Screenshots <span className="text-ink-3">({listing.screenshots.length}, numbered by store position)</span>
      </h3>
      <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
        {listing.screenshots.map((image, index) => (
          <ScreenshotCard key={image.src} image={image} position={positionOf(image, index)} />
        ))}
      </ol>

      {excluded.length > 0 ? (
        <>
          <h3 className="mt-6 text-card-title">
            Excluded <span className="text-ink-3">({excluded.length}, left out of public/ and the site)</span>
          </h3>
          <ul className="mt-2 space-y-1 text-body-sm text-ink-2">
            {excluded.map((item) => (
              <li key={item.position}>
                <span className="font-mono">{storePosition(item.position)}</span> · {item.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
