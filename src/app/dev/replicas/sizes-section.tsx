import type { CSSProperties, ReactNode } from 'react';
import { PHONE_SCALE, PHONE_SIZES } from '@/components/showcase/phone-frame';
import { DevSection, Term } from './dev-section';
import { SamplePhone } from './sample-phone';

/** Outer box of a phone at scale `ps`: 414×868 logical px. */
function outer(ps: number): string {
  return `${(414 * ps).toFixed(1)} × ${(868 * ps).toFixed(1)} px`;
}

const INHERITED_PS = 0.45;

/** Section 1: the same kit-only screen at every fixed size, plus size="inherit". */
export function SizesSection(): ReactNode {
  return (
    <DevSection
      id="sizes"
      title="1. Phone frame at all six sizes"
      intro={
        <>
          One kit-only sample screen in the brand-neutral frame: punch-hole camera, 9:41 status bar and home
          indicator drawn over the 390×844 canvas, scaled by <Term>--ps</Term>. Each outer box is
          414×868 × <Term>--ps</Term>, set by CSS alone, so nothing shifts while the page loads.
        </>
      }
    >
      <div
        role="region"
        aria-label="Phone sizes"
        tabIndex={0}
        className="-mx-2 overflow-x-auto px-2 pt-2 pb-10"
        data-dev="sizes"
      >
        <ul className="flex flex-wrap items-start gap-x-8 gap-y-10">
          {PHONE_SIZES.map((size) => (
            <li key={size}>
              <figure className="flex w-min flex-col gap-3" data-size-demo={size}>
                <SamplePhone size={size} />
                <figcaption className="min-h-[2lh] text-meta text-ink-3">
                  <span className="block font-mono text-fig text-ink-2 uppercase">{size}</span>
                  {outer(PHONE_SCALE[size])}
                </figcaption>
              </figure>
            </li>
          ))}
          <li>
            <figure
              className="flex w-min flex-col gap-3"
              data-size-demo="inherit"
              style={{ '--ps': String(INHERITED_PS) } as CSSProperties}
            >
              <SamplePhone size="inherit" />
              <figcaption className="min-h-[2lh] text-meta text-ink-3">
                <span className="block font-mono text-fig text-ink-2 uppercase">inherit · --ps {INHERITED_PS}</span>
                {outer(INHERITED_PS)}
              </figcaption>
            </figure>
          </li>
        </ul>
      </div>
    </DevSection>
  );
}
