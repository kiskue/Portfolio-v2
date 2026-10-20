import type { ReactNode } from 'react';
import { ScreenCard } from '@/components/showcase/phone-frame';
import { STORE_NAME } from '@/components/ui/store-link';
import { listingsForBrand, storeExclusions } from '@/content/apps/store';
import { defaultBrand } from '@/content/derived';
import { ReviewSection, ScrollRow } from './review-section';

/**
 * The default Citizen brand's kept store screenshots, for comparing a Citizen replica with the
 * shipped app. They are all marketing images (caption and device baked in), so they render as
 * ScreenCards and never inside a phone frame.
 */
export function StoreGallery(): ReactNode {
  const brand = defaultBrand('citizen');
  const listings = listingsForBrand(brand.id);
  return (
    <ReviewSection
      id="store"
      title={`Store screenshots: ${brand.name}`}
      intro="The screenshots kept on the site for the default Citizen brand, numbered as shown. Screenshots excluded for privacy are left out."
    >
      {listings.map((listing) => {
        const store = STORE_NAME[listing.platform];
        const shown = listing.screenshots.length;
        const excluded = storeExclusions.filter((item) => item.listing === listing.id).length;
        return (
          <div key={listing.id}>
            <h3 className="text-card-title">
              {listing.name} · {store}{' '}
              <span className="font-normal text-ink-3">
                ({shown} shown{excluded > 0 ? `, ${excluded} excluded for privacy` : ''})
              </span>
            </h3>
            <ScrollRow label={`${listing.name} ${store} screenshots`}>
              {listing.screenshots.map((image, index) => (
                <li key={image.src}>
                  <figure className="flex w-min flex-col gap-2">
                    <ScreenCard image={image} size="xl" />
                    <figcaption className="text-meta text-ink-3">
                      {store} · {index + 1} of {shown}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ScrollRow>
          </div>
        );
      })}
    </ReviewSection>
  );
}
