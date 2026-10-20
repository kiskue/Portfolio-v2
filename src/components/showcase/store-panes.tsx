import type { ReactNode } from 'react';
import { storeAfterOn } from '@/components/showcase/brand-options';
import type { PhoneSize } from '@/components/showcase/phone-frame';
import { ScreenView } from '@/components/showcase/screen-view';
import { SourcePane } from '@/components/showcase/source-toggle';
import { STORE_NAME } from '@/components/ui/store-link';
import { listingsForBrand } from '@/content/apps/store';
import { brandsFor } from '@/content/derived';
import { cn } from '@/lib/cn';

export interface StorePanesProps {
  /** Card width, as a phone size (default 'sm'). */
  readonly size?: PhoneSize | 'inherit';
  /** The listing headings' level (default h3, under a section's h2). */
  readonly headingLevel?: 'h3' | 'h4';
  /** Prefix for heading ids, unique per page (default 'store'). */
  readonly id?: string;
  readonly className?: string;
}

/**
 * The store side of a SourceToggle inside a Citizen BrandScope: one SourcePane per brand, shown
 * while that brand is selected, with its kept store screenshots. Every store image is a
 * 'marketing' image (caption and device baked in), so ScreenView shows it frameless as a
 * ScreenCard, never inside a phone. Images are labelled by the listing they come from: the
 * Defensys SAFE listing, for one, publishes SJDM-branded images (its alt texts say so).
 */
export function StorePanes({ size = 'sm', headingLevel: Heading = 'h3', id = 'store', className }: StorePanesProps): ReactNode {
  return brandsFor('citizen').map((brand) => {
    const listings = listingsForBrand(brand.id).filter((listing) => listing.screenshots.length > 0);
    if (listings.length === 0) return null;
    return (
      <SourcePane key={brand.id} source="store" brand={brand.id} className={cn('flex flex-col gap-6', className)}>
        {listings.map((listing) => {
          const store = STORE_NAME[listing.platform];
          const headingId = `${id}-${listing.id.replace('.', '-')}`;
          return (
            <section key={listing.id} aria-labelledby={headingId} className="flex flex-col gap-3">
              <Heading id={headingId} className="text-card-title text-ink">
                From the {listing.name} listing on {storeAfterOn(listing.platform)}
              </Heading>
              <ul className="flex flex-wrap gap-4">
                {listing.screenshots.map((image, index) => (
                  <li key={image.src}>
                    <figure className="flex w-min flex-col gap-2">
                      <ScreenView source={{ kind: 'image', image }} size={size} />
                      <figcaption className="text-meta text-ink-3">
                        {store} · {index + 1} of {listing.screenshots.length}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </SourcePane>
    );
  });
}
