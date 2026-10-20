import type { ReactNode } from 'react';
import { BrandVars } from '@/components/showcase/brand-vars';
import { ScreenView } from '@/components/showcase/screen-view';
import { brandsFor } from '@/content/derived';
import type { Brand, Figure } from '@/content/types';
import { ReviewSection, ScrollRow } from './review-section';

/**
 * The brand's mark as the replica sees it: Citizen paints --app-logo (its public store icon) and
 * Responder shows its monogram. Inside BrandVars, so it proves the variables reach the phone.
 */
function BrandMark({ brand }: { readonly brand: Brand }): ReactNode {
  if (brand.app === 'citizen') {
    return <span aria-hidden="true" className="size-6 shrink-0 rounded-tile border border-line bg-sunken bg-(image:--app-logo) bg-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-tile border-2 border-(--app-primary) bg-surface text-fig font-semibold text-ink"
    >
      {brand.monogram}
    </span>
  );
}

/** The default state in every brand of the app, each phone inheriting its own BrandVars wrapper. */
export function BrandGallery({ figure }: { readonly figure: Figure }): ReactNode {
  if (figure.app === 'sme' || !figure.brandable) return null;
  const brands: readonly Brand[] = figure.app === 'citizen' ? brandsFor('citizen') : brandsFor('responder');
  const state = figure.states[0];
  return (
    <ReviewSection
      id="brands"
      title="Brands"
      intro={
        <>
          The default state ({state}) in all {brands.length} brands. Only the --app-* variables differ; emergency, severity,
          status and call colours must stay the same in every phone.
        </>
      }
    >
      <ScrollRow label={`FIG ${figure.id} in every brand`}>
        {brands.map((brand) => (
          <li key={brand.id}>
            <BrandVars brand={brand.id}>
              <figure className="flex w-min flex-col gap-3" data-brand-demo={brand.id}>
                <ScreenView source={{ kind: 'replica', figure: figure.id, state }} size="lg" brandMode="inherit" />
                <figcaption className="flex items-start gap-2 text-meta text-ink-3">
                  <BrandMark brand={brand} />
                  <span>
                    <span className="block font-semibold text-ink-2">{brand.name}</span>
                    primary {brand.palette.primary} · title {brand.palette.titleInk}
                  </span>
                </figcaption>
              </figure>
            </BrandVars>
          </li>
        ))}
      </ScrollRow>
    </ReviewSection>
  );
}
