import { callsToAction, emptyStates } from '@/content/home';
import { site } from '@/content/site';
import type { EmptyState, PlaceholderMode, Testimonial } from '@/content/types';
import { QuoteGrid } from '@/components/sections/testimonials/quote-grid';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { cn } from '@/lib/cn';
import { visible } from '@/lib/placeholder';

export interface TestimonialsContentProps {
  /** Every testimonial; hidden items always drop out, example items too in hide mode. */
  readonly testimonials: readonly Testimonial[];
  /** Id of the page H1, which names the quote list. */
  readonly labelledBy?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * A line, a body and one contact link in a card: the "Leave a note" band under the grid (kind
 * 'cta'), or the dashed empty state when there is nothing to show (kind 'empty').
 */
function Callout({ state, kind }: { readonly state: EmptyState; readonly kind: 'cta' | 'empty' }) {
  const headingId = kind === 'cta' ? 'testimonials-cta-title' : 'testimonials-empty-title';
  return (
    <Card
      as="section"
      aria-labelledby={headingId}
      surface={kind === 'cta' ? 'raised' : 'sunken'}
      pad="none"
      className={cn('flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8', kind === 'empty' && 'border-dashed md:py-10')}
      data-section={kind === 'cta' ? 'cta' : undefined}
      data-empty-state={kind === 'empty' ? 'testimonials' : undefined}
    >
      {kind === 'empty' ? <IconTile icon="message-square-quote" tone="soft" size={32} /> : null}
      <SectionHeader
        as="h2"
        size="section"
        id={headingId}
        title={state.title}
        intro={state.body}
        className="items-center"
        action={
          state.cta ? (
            <ButtonLink href={state.cta.href} icon="arrow-up-right">
              {state.cta.label}
            </ButtonLink>
          ) : undefined
        }
      />
    </Card>
  );
}

/**
 * The /testimonials body (design §8): the quote grid and the "Leave a note" band, or, once hide
 * mode has removed every example, the "Kind words, soon." empty state. The empty state carries
 * the same contact link (topic: testimonial), so the band is not repeated under it.
 */
export function TestimonialsContent({ testimonials, labelledBy, mode = site.placeholders }: TestimonialsContentProps) {
  const shown = visible(testimonials, mode);
  if (shown.length === 0) return <Callout state={emptyStates.testimonials} kind="empty" />;
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <QuoteGrid testimonials={shown} labelledBy={labelledBy} mode={mode} />
      <Callout state={callsToAction.testimonials} kind="cta" />
    </div>
  );
}
