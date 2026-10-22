import { CtaBand } from '@/components/content/cta-band';
import { EmptyState } from '@/components/content/empty-state';
import { callsToAction, emptyStates } from '@/content/home';
import { site } from '@/content/site';
import type { PlaceholderMode, Testimonial } from '@/content/types';
import { QuoteGrid } from '@/components/sections/testimonials/quote-grid';
import { visible } from '@/lib/placeholder';

export interface TestimonialsContentProps {
  /** Every testimonial; hidden items always drop out, example items too in hide mode. */
  readonly testimonials: readonly Testimonial[];
  /** Id of the page H1, which names the quote list. */
  readonly labelledBy?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * The /testimonials body (design §8): the quote grid and the "Leave a note" band, or, once hide
 * mode has removed every example, the "Kind words, soon." empty state. The empty state carries
 * the same contact link (topic: testimonial), so the band is not repeated under it.
 */
export function TestimonialsContent({ testimonials, labelledBy, mode = site.placeholders }: TestimonialsContentProps) {
  const shown = visible(testimonials, mode);
  if (shown.length === 0) {
    return <EmptyState state={emptyStates.testimonials} icon="message-square-quote" name="testimonials" />;
  }
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <QuoteGrid testimonials={shown} labelledBy={labelledBy} mode={mode} />
      <CtaBand cta={callsToAction.testimonials} headingId="testimonials-cta-title" />
    </div>
  );
}
