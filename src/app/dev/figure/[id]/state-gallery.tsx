import type { ReactNode } from 'react';
import { ScreenView } from '@/components/showcase/screen-view';
import type { Figure } from '@/content/types';
import { ReviewSection, ScrollRow } from './review-section';

/** Every state of the figure at 2xl (420 px wide, about 1:1 with the 390 px canvas), side by side. */
export function StateGallery({ figure }: { readonly figure: Figure }): ReactNode {
  return (
    <ReviewSection
      id="states"
      title="States at 2xl"
      intro={
        <>
          {figure.states.length === 1 ? 'The one state' : `All ${figure.states.length} states`} at the largest phone size, close
          to the 390 × 844 logical canvas, for comparing key boxes with the layoutSpec. The first is the default (static) state
          {figure.brandable ? ', drawn in the app’s default brand' : ''}.
        </>
      }
    >
      <ScrollRow label={`FIG ${figure.id} states`}>
        {figure.states.map((state, index) => (
          <li key={state}>
            <figure className="flex w-min flex-col gap-3" data-state={state}>
              <ScreenView source={{ kind: 'replica', figure: figure.id, state }} size="2xl" />
              <figcaption className="text-meta text-ink-3">
                <span className="font-semibold text-ink-2">{state}</span>
                {index === 0 ? ' · default' : ''}
              </figcaption>
            </figure>
          </li>
        ))}
      </ScrollRow>
    </ReviewSection>
  );
}
