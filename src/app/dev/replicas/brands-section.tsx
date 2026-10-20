import type { ReactNode } from 'react';
import { BrandVars } from '@/components/showcase/brand-vars';
import { brandById } from '@/content/derived';
import type { CitizenBrandId } from '@/content/types';
import { DevSection, Term } from './dev-section';
import { SamplePhone } from './sample-phone';

const BRANDS: readonly CitizenBrandId[] = ['smile-safe-taytay', '1hope'];

/** Section 2: the same screen re-skinned through BrandVars and the --app-* bridge. */
export function BrandsSection(): ReactNode {
  return (
    <DevSection
      id="brands"
      title="2. Brand re-skin through BrandVars"
      intro={
        <>
          The same server-rendered tree inside <Term>BrandVars</Term>. Only the{' '}
          <Term>--app-*</Term> variables differ: the menu glyph, logo tile, chevron tile, EN / FIL
          toggle, brief glyph, outline button and tab pill follow the brand. The heat-index bands and the SOS red never
          change.
        </>
      }
    >
      <ul className="flex flex-wrap items-start gap-x-10 gap-y-8">
        {BRANDS.map((id) => {
          const brand = brandById(id);
          return (
            <li key={id}>
              <figure className="flex w-min flex-col gap-3" data-brand-demo={id}>
                <BrandVars brand={id}>
                  <SamplePhone size="lg" brandName={brand.name} />
                </BrandVars>
                <figcaption className="min-h-[2lh] text-meta text-ink-3">
                  {brand.name} · primary {brand.palette.primary}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </DevSection>
  );
}
