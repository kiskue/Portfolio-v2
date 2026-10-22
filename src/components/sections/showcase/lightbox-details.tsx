import Image from 'next/image';
import type { ReactNode } from 'react';
import { Copy, MetaLine } from '@/components/ui/copy';
import { StoreLink } from '@/components/ui/store-link';
import { appById } from '@/content/derived';
import type { Rollout, ShowcaseEntry } from '@/content/types';
import { formatDate } from '@/lib/format';
import { REPLICA_ONLY_LABEL } from '@/lib/showcase-filters';

/*
 * The lightbox's details panel for one wall tile (design §7: title, purpose, brand and source
 * facts), rendered on the server and handed to the tile, so the client island ships no copy or
 * store data of its own. The dialog title (FIG line or listing label) sits above it; the
 * brand-skin line and "Read the case study" link are added by the dialog.
 */

export const ROLLOUT_LABEL: Readonly<Record<Exclude<Rollout, 'shipped'>, string>> = {
  'in-rollout': 'In rollout',
  'in-progress': 'In progress',
};

const EYEBROW = 'text-eyebrow text-accent-ink uppercase';

function Fact({ term, children }: { readonly term: string; readonly children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line pt-2 first:border-t-0 first:pt-0">
      <dt className="text-meta text-ink-3">{term}</dt>
      <dd className="text-body-sm text-ink">{children}</dd>
    </div>
  );
}

function Description({ heading, text }: { readonly heading: string; readonly text: string }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-meta font-semibold text-ink-2">{heading}</h3>
      <p className="text-body-sm text-ink-2">{text}</p>
    </div>
  );
}

export function LightboxDetails({ entry }: { readonly entry: ShowcaseEntry }): ReactNode {
  const app = appById(entry.app);

  if (entry.source === 'replica') {
    const { figure } = entry;
    const rollout = figure.rollout && figure.rollout !== 'shipped' ? ROLLOUT_LABEL[figure.rollout] : null;
    return (
      <>
        <MetaLine segments={[app.name, REPLICA_ONLY_LABEL]} className={EYEBROW} />
        <Copy as="p" text={figure.caption} className="text-lead text-ink" />
        <Copy as="p" text={figure.purpose} className="text-body-sm text-ink-2" />
        <dl className="flex flex-col gap-2">
          <Fact term="App">{app.name}</Fact>
          <Fact term="Source">Coded replica of the real screen, with fictional data</Fact>
          {rollout ? <Fact term="Status">{rollout}</Fact> : null}
        </dl>
        <Description heading="Screen description" text={figure.summary} />
      </>
    );
  }

  const { listing } = entry;
  const { image } = entry.screen;
  return (
    <>
      <MetaLine segments={[app.name, 'Real screenshot']} className={EYEBROW} />
      <Description heading="Screenshot description" text={image.alt} />
      <dl className="flex flex-col gap-2">
        <Fact term="Store listing">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Image src={listing.icon.src} alt="" width={24} height={24} sizes="24px" className="size-6 rounded-[6px] border border-line" />
            <span className="font-semibold">{listing.name}</span>
            <StoreLink listing={listing} />
          </span>
        </Fact>
        <Fact term="Published by">{listing.publisher}</Fact>
        <Fact term="As of">{formatDate(listing.asOf)}</Fact>
      </dl>
    </>
  );
}
