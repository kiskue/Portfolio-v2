import type { EmptyState } from '@/content/types';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';

export interface CtaBandProps {
  /** A closing call to action (src/content/home.ts callsToAction): a line, a body and one link. */
  readonly cta: EmptyState;
  /** Id of the band's h2. */
  readonly headingId: string;
}

/**
 * The closing band (design §8, "Have a project in mind?" with the pill): a raised card whose h2
 * and body sit beside the primary pill, which wraps under them on narrow screens.
 */
export function CtaBand({ cta, headingId }: CtaBandProps) {
  return (
    <Card as="section" aria-labelledby={headingId} surface="raised" pad="none" className="px-5 py-6 md:px-8 md:py-8" data-section="cta">
      <SectionHeader
        as="h2"
        size="section"
        id={headingId}
        title={cta.title}
        intro={cta.body}
        className="items-center"
        action={
          cta.cta ? (
            <ButtonLink href={cta.cta.href} icon="arrow-up-right">
              {cta.cta.label}
            </ButtonLink>
          ) : undefined
        }
      />
    </Card>
  );
}
