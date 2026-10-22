import type { ReactNode } from 'react';
import { EmptyState } from '@/components/content/empty-state';
import { QuoteCard } from '@/components/content/quote-card';
import { BentoCard } from '@/components/ui/bento-card';
import { home } from '@/content/home';
import { site } from '@/content/site';
import { testimonials } from '@/content/testimonials';
import type { PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { cardLink } from '@/components/sections/home/card-link';

/** At most this many quote cards on Home (design §4.3: "3 static quote cards"). */
const QUOTES_SHOWN = 3;

export interface TestimonialsCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * Testimonials (design §4.3): up to three static compact quote cards (Example-tagged in label
 * mode) fading out at the bottom, as a whole-card link to /testimonials. In hide mode with no
 * real testimonials it shows the shared empty state instead, compact, with its title as an h3
 * under the card's h2; its "Leave a note" link is then the card's only link, so the card is not
 * a stretched link.
 */
export function TestimonialsCard({ mode = site.placeholders }: TestimonialsCardProps): ReactNode {
  const copy = home.cards.testi;
  const quotes = visible(testimonials, mode).slice(0, QUOTES_SHOWN);

  if (quotes.length === 0) {
    return (
      <BentoCard area="testi" icon="message-square-quote" title={copy.title} description={copy.description}>
        <EmptyState state={home.testimonialsEmpty} as="h3" size="card" name="testimonials" className="flex-1 justify-center" />
      </BentoCard>
    );
  }

  return (
    <BentoCard
      area="testi"
      icon="message-square-quote"
      title={copy.title}
      description={copy.description}
      link={cardLink('testi', '/testimonials', 'stretched')}
      className="bento-testi"
    >
      {/* Pointer events pass through to the stretched link that covers the card. */}
      <ul className="testi-quotes pointer-events-none flex flex-col gap-2">
        {quotes.map((testimonial) => (
          <QuoteCard key={testimonial.id} testimonial={testimonial} look="compact" as="li" mode={mode} />
        ))}
      </ul>
      <span aria-hidden="true" className="testi-mark">
        “
      </span>
    </BentoCard>
  );
}
