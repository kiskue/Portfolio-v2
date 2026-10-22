import Image from 'next/image';
import type { ReactNode } from 'react';
import { LightboxDetails, ROLLOUT_LABEL } from '@/components/sections/showcase/lightbox-details';
import { WallTile } from '@/components/sections/showcase/wall-tile';
import { storeAfterOn } from '@/components/showcase/brand-options';
import { ScreenView } from '@/components/showcase/screen-view';
import { ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SectionHeader } from '@/components/ui/section-header';
import { STORE_NAME, StoreLink } from '@/components/ui/store-link';
import { showcaseSummary, storeSummary } from '@/content/derived';
import type { AppInfo, ShowcaseEntry, StoreListing } from '@/content/types';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { caseStudyHref } from '@/lib/routes';
import { PHONE_RATIO, REPLICA_LABEL } from '@/lib/showcase-filters';

/*
 * One app's group on the Showcase wall (design §7): an h2 with the app's context and a link to
 * its case study, the coded replicas, then (Citizen) a "From Google Play and the App Store"
 * divider and the kept store screenshots, grouped by the listing that publishes them, each
 * listing with its store icon and a text store link (no badges). Tiles are WallTile islands;
 * every container here hides itself by CSS once none of its tiles shows.
 */

type ReplicaEntry = Extract<ShowcaseEntry, { readonly source: 'replica' }>;
type RealEntry = Extract<ShowcaseEntry, { readonly source: 'real' }>;

/** Hides a container when no tile inside it shows (the filters set `hidden` on tiles). */
const HIDE_WHEN_EMPTY = '[&:not(:has([data-showcase-tile]:not([hidden])))]:hidden';

/** sm phones (156px) in as many columns as fit: two on a 390px phone. */
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(9.75rem,1fr))] justify-items-center gap-x-4 gap-y-10';

const CASE_STUDY_LABEL = 'Read the case study';

function count(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}

function caseStudy(entry: ShowcaseEntry) {
  return { href: caseStudyHref(entry.caseStudy), label: CASE_STUDY_LABEL } as const;
}

function ReplicaTile({ entry, scoped }: { readonly entry: ReplicaEntry; readonly scoped: boolean }): ReactNode {
  const { figure } = entry;
  const rollout = figure.rollout && figure.rollout !== 'shipped' ? ROLLOUT_LABEL[figure.rollout] : null;
  return (
    <WallTile
      id={entry.id}
      label={
        <>
          <span className="block font-mono text-fig text-ink-3 uppercase">FIG {figure.id}</span> {figure.title}
        </>
      }
      chips={
        <>
          <Chip size="sm">{REPLICA_LABEL}</Chip>
          {rollout ? (
            <Chip size="sm" tone="accent">
              {rollout}
            </Chip>
          ) : null}
        </>
      }
      brandChip={scoped && figure.brandable}
      screen={<ScreenView source={entry.screen} size="inherit" brandMode={scoped ? 'inherit' : 'own'} />}
      skipOffscreen
      ratio={PHONE_RATIO}
      title={`FIG ${figure.id} ${figure.title}`}
      details={<LightboxDetails entry={entry} />}
      caseStudy={caseStudy(entry)}
    />
  );
}

/**
 * A store screenshot. Its listing's header (icon, name, store link) sits right above the grid, so
 * the tile repeats neither as chips; the button's name still says which listing it is from.
 */
function RealTile({ entry }: { readonly entry: RealEntry }): ReactNode {
  const { listing, position } = entry;
  const { image } = entry.screen;
  const store = STORE_NAME[listing.platform];
  return (
    <WallTile
      id={entry.id}
      label={
        <>
          <span className="sr-only">
            {listing.name}, {store}:{' '}
          </span>
          Screenshot {position} of {listing.screenshots.length}
        </>
      }
      screen={<ScreenView source={entry.screen} size="sm" />}
      large={<ScreenView source={entry.screen} size="inherit" />}
      ratio={image.presentation === 'marketing' ? image.height / image.width : PHONE_RATIO}
      title={entry.label}
      details={<LightboxDetails entry={entry} />}
      caseStudy={caseStudy(entry)}
    />
  );
}

function ListingScreens({ listing, entries }: { readonly listing: StoreListing; readonly entries: readonly RealEntry[] }): ReactNode {
  const store = STORE_NAME[listing.platform];
  return (
    <div className={cn('flex flex-col gap-5', HIDE_WHEN_EMPTY)} data-showcase-listing={listing.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Image src={listing.icon.src} alt="" width={32} height={32} sizes="32px" className="size-8 rounded-tile border border-line" />
        <h4 className="text-card-title text-ink">
          {listing.name}
          <span className="sr-only"> on {store}</span>
        </h4>
        <StoreLink listing={listing} className="text-meta" />
      </div>
      <ul className={GRID}>
        {entries.map((entry) => (
          <RealTile key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

export interface ShowcaseGroupProps {
  readonly app: AppInfo;
  /** This app's wall entries, in wall order. */
  readonly entries: readonly ShowcaseEntry[];
  /** True inside a BrandScope: brandable replicas take its brand (and show it as a chip). */
  readonly scoped?: boolean;
}

export function ShowcaseGroup({ app, entries, scoped = false }: ShowcaseGroupProps): ReactNode {
  const headingId = `showcase-${app.id}`;
  const totals = showcaseSummary.byApp[app.id];
  const replicas = entries.filter((entry): entry is ReplicaEntry => entry.source === 'replica');
  const real = entries.filter((entry): entry is RealEntry => entry.source === 'real');
  const listings = [...new Map(real.map((entry) => [entry.listing.id, entry.listing])).values()];
  const stores = [...new Set(listings.map((listing) => storeAfterOn(listing.platform)))];
  const intro = [count(totals.replica, 'coded replica', 'coded replicas'), ...(totals.real > 0 ? [count(totals.real, 'real screenshot', 'real screenshots')] : [])].join(' and ');

  const replicaGrid = (
    <ul className={GRID}>
      {replicas.map((entry) => (
        <ReplicaTile key={entry.id} entry={entry} scoped={scoped} />
      ))}
    </ul>
  );

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-8', HIDE_WHEN_EMPTY)} data-showcase-group={app.id}>
      <SectionHeader
        as="h2"
        size="section"
        id={headingId}
        title={app.name}
        eyebrow={app.stageLabel.slice(1)}
        intro={`${intro}.`}
        action={
          <ButtonLink href={caseStudyHref(app.caseStudy)} variant="secondary" size="sm" icon="arrow-right">
            {CASE_STUDY_LABEL}
            <span className="sr-only">: {app.name}</span>
          </ButtonLink>
        }
      />
      {listings.length > 0 ? (
        <>
          <div className={cn('flex flex-col gap-5', HIDE_WHEN_EMPTY)} data-showcase-region="replica">
            <h3 className="text-h3-hero text-ink">Coded replicas</h3>
            {replicaGrid}
          </div>
          <div className={cn('flex flex-col gap-8', HIDE_WHEN_EMPTY)} data-showcase-region="real">
            <div className="flex flex-col gap-1 border-t border-line pt-6">
              <h3 className="text-h3-hero text-ink">From {stores.join(' and ')}</h3>
              <p className="max-w-[65ch] text-body-sm text-ink-3">
                Grouped by the listing that publishes them, as of {formatDate(storeSummary.asOf)}. Screens that show personal
                details are left out.
              </p>
            </div>
            {listings.map((listing) => (
              <ListingScreens key={listing.id} listing={listing} entries={real.filter((entry) => entry.listing.id === listing.id)} />
            ))}
          </div>
        </>
      ) : (
        replicaGrid
      )}
    </section>
  );
}
