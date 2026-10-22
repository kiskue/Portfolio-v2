import type { ReactNode } from 'react';
import { BrandPreviewButton } from '@/components/sections/case-study/brand-parts.client';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { BrandIcon, ListingLines } from '@/components/sections/case-study/store-facts';
import { brandOptions } from '@/components/showcase/brand-options';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { MetaLine } from '@/components/ui/copy';
import { brandsFor, citizenStoreFacts, getFigure, storeSummary } from '@/content/derived';
import type { CaseStudy, ReplicaSource } from '@/content/types';
import { formatDate, formatNumber } from '@/lib/format';
import { MIN_INSTALLS, MIN_RATINGS } from '@/lib/store-rules';

/*
 * Section 5 for the Defensys apps, #brands (design §6 "#brands", §5.5): a table of the app's brands
 * (Citizen: the six public store apps with their text store links and the figures that pass the
 * display rules, dated; Responder: the four brands and their honest status, no store links), each
 * row with a "Preview" button that selects the brand for every phone in the case study's
 * BrandScope, beside a phone that shows the selection.
 */

const CELL = 'py-3 pe-3 align-top';
const HEAD = 'py-2 pe-3 text-start text-eyebrow text-ink-3 uppercase';

function CitizenTable(): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <table className="w-full table-fixed border-collapse text-start">
        <caption className="sr-only">The public Defensys Citizen apps and their store listings</caption>
        <colgroup>
          <col className="w-[46%]" />
          <col />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={HEAD}>
              App
            </th>
            <th scope="col" className={HEAD}>
              Store listings
            </th>
            <th scope="col" className={HEAD}>
              <span className="sr-only">Preview</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {citizenStoreFacts.map((facts) => (
            <tr key={facts.brand.id} className="border-b border-line" data-brand-row={facts.brand.id}>
              <th scope="row" className={`${CELL} text-start font-normal`}>
                <span className="flex items-start gap-2.5">
                  <BrandIcon facts={facts} size={32} />
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-ink">{facts.brand.name}</span>
                    <span className="block text-meta text-ink-3">{facts.brand.locality}</span>
                  </span>
                </span>
              </th>
              <td className={CELL}>
                <ListingLines facts={facts} className="[&_li]:text-meta" />
              </td>
              <td className="py-3 text-end align-top">
                <BrandPreviewButton brand={facts.brand.id} name={facts.brand.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-meta text-ink-3">
        Store figures as of {formatDate(storeSummary.asOf)}; installs show from {formatNumber(MIN_INSTALLS)} and ratings from{' '}
        {MIN_RATINGS} ratings.
      </p>
    </div>
  );
}

function ResponderTable(): ReactNode {
  const options = new Map(brandOptions('responder').map((option) => [option.id, option]));
  return (
    <table className="w-full table-fixed border-collapse text-start">
      <caption className="sr-only">The Defensys Responder brands and their status</caption>
      <colgroup>
        <col className="w-[46%]" />
        <col />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className={HEAD}>
            Brand
          </th>
          <th scope="col" className={HEAD}>
            Status
          </th>
          <th scope="col" className={HEAD}>
            <span className="sr-only">Preview</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {brandsFor('responder').map((brand) => (
          <tr key={brand.id} className="border-b border-line" data-brand-row={brand.id}>
            <th scope="row" className={`${CELL} text-start font-normal`}>
              <span className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-grid size-8 shrink-0 place-items-center rounded-control border border-line bg-sunken text-[0.75rem] leading-none font-bold text-ink"
                >
                  {brand.monogram}
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold text-ink">{brand.name}</span>
                  <span className="block text-meta text-ink-3">{brand.locality}</span>
                </span>
              </span>
            </th>
            <td className={`${CELL} text-meta text-ink-2`}>
              <MetaLine as="span" segments={options.get(brand.id)?.status ?? []} />
            </td>
            <td className="py-3 text-end align-top">
              <BrandPreviewButton brand={brand.id} name={brand.name} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The first brandable replica of the Screens grid, shown in whatever brand is selected. */
function previewSource(study: CaseStudy): ReplicaSource | null {
  for (const source of study.screens) {
    if (source.kind === 'replica' && getFigure(source.figure).brandable) return source;
  }
  return null;
}

export function BrandsSection({ study }: SectionProps): ReactNode {
  const special = study.specials.find((candidate) => candidate.kind === 'brands');
  if (special?.kind !== 'brands') return null;
  const preview = previewSource(study);
  return (
    <CaseStudySection id="brands" intro={special.caption}>
      <div className="@container/brands">
        <div className="grid gap-8 @4xl/brands:grid-cols-[minmax(0,1fr)_auto] @4xl/brands:items-start">
          {special.app === 'citizen' ? <CitizenTable /> : <ResponderTable />}
          {preview ? <ScreenFigure source={preview} size="md" brandMode="inherit" figureClassName="justify-self-center" /> : null}
        </div>
      </div>
    </CaseStudySection>
  );
}
