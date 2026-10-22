import { site } from '@/content/site';
import type { PlaceholderMode, Testimonial } from '@/content/types';
import { QuoteCard } from '@/components/content/quote-card';

export interface QuoteGridProps {
  /** The testimonials to show, already filtered with visible(). */
  readonly testimonials: readonly Testimonial[];
  /** Id of the heading that names the list (the page H1). */
  readonly labelledBy?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * The quote grid (design §8): full quote cards, one column on phones, two from 42rem of <main>
 * and three from 56rem. Example cards carry their Example tag in label mode.
 */
export function QuoteGrid({ testimonials, labelledBy, mode = site.placeholders }: QuoteGridProps) {
  return (
    <ul aria-labelledby={labelledBy} className="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3" data-quote-grid="">
      {testimonials.map((testimonial) => (
        <QuoteCard key={testimonial.id} testimonial={testimonial} look="full" as="li" mode={mode} />
      ))}
    </ul>
  );
}
