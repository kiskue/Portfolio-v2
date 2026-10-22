import type { ReactNode } from 'react';
import { QuoteCard } from '@/components/content/quote-card';
import { BentoCard } from '@/components/ui/bento-card';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { SiteLink } from '@/components/ui/site-link';
import { home } from '@/content/home';
import { site } from '@/content/site';
import { testimonials } from '@/content/testimonials';
import type { EmptyState, PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { cardLink } from '@/components/sections/home/card-link';

/** At most this many quote cards on Home (design §4.3: "3 static quote cards"). */
const QUOTES_SHOWN = 3;

/** The empty state (hide mode with no real testimonials): a line, a body and its one link. */
function Empty({ state, mode }: { readonly state: EmptyState; readonly mode: PlaceholderMode }): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2 rounded-control border border-dashed border-line-strong p-5">
      <p className="text-card-title text-ink">{state.title}</p>
      <Copy as="p" text={state.body} mode={mode} className="text-body-sm text-ink-3" />
      {state.cta ? (
        <SiteLink
          href={state.cta.href}
          className="group/more mt-1 inline-flex min-h-6 items-center gap-1 text-meta font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-accent-ink hover:decoration-current"
        >
          {state.cta.label}
          <Icon name="arrow-right" size={14} />
        </SiteLink>
      ) : null}
    </div>
  );
}

export interface TestimonialsCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * Testimonials (design §4.3): up to three static compact quote cards (Example-tagged in label
 * mode) fading out at the bottom, as a whole-card link to /testimonials. In hide mode with no
 * real testimonials it shows the empty state instead; its "Leave a note" link is then the card's
 * only link, so the card is not a stretched link.
 */
export function TestimonialsCard({ mode = site.placeholders }: TestimonialsCardProps): ReactNode {
  const copy = home.cards.testi;
  const quotes = visible(testimonials, mode).slice(0, QUOTES_SHOWN);

  if (quotes.length === 0) {
    return (
      <BentoCard area="testi" icon="message-square-quote" title={copy.title} description={copy.description}>
        <Empty state={home.testimonialsEmpty} mode={mode} />
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
