import Image from 'next/image';
import type { StoreListing, StorePlatform } from '@/content/types';
import { ExternalLink } from '@/components/ui/external-link';
import { cn } from '@/lib/cn';

/** The stores' names as text. No official badges or store logos (PLAN; review L1). */
export const STORE_NAME = {
  play: 'Google Play',
  appstore: 'App Store',
} as const satisfies Record<StorePlatform, string>;

export interface StoreLinkProps {
  readonly listing: StoreListing;
  /**
   * 'text': "Google Play ↗" / "App Store ↗" (overview pages, brands table).
   * 'icon': the app's public store icon (48px) with its full store name below (Live card).
   */
  readonly look?: 'text' | 'icon';
  readonly className?: string;
}

/** A link to one public store listing. The accessible name always says which app and store. */
export function StoreLink({ listing, look = 'text', className }: StoreLinkProps) {
  const store = STORE_NAME[listing.platform];

  if (look === 'icon') {
    return (
      <ExternalLink
        href={listing.url}
        look="bare"
        icon={false}
        className={cn('group/store flex w-20 flex-col items-center gap-2 text-center', className)}
      >
        <Image
          src={listing.icon.src}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-control border border-line transition-[translate] duration-(--dur-2) group-hover/store:-translate-y-0.5 reduce-motion:group-hover/store:translate-none"
        />
        <span className="text-[0.75rem] leading-4 font-semibold text-balance text-ink-2 group-hover/store:text-ink">
          {listing.name}
          <span className="sr-only"> on {store}</span>
        </span>
      </ExternalLink>
    );
  }

  return (
    <ExternalLink href={listing.url} className={className}>
      {store}
      <span className="sr-only"> listing for {listing.name}</span>
    </ExternalLink>
  );
}
