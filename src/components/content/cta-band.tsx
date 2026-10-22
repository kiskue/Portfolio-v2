import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import type { EmptyState } from '@/content/types';
import { cn } from '@/lib/cn';

export interface CtaBandProps {
  /** A closing call to action (src/content/home.ts callsToAction): a line, a body and one link. */
  readonly cta: EmptyState;
  /** Id of the band's h2, which names the section. */
  readonly headingId: string;
  readonly className?: string;
}

/**
 * The closing call-to-action band (design §8: "Have a project in mind?" with the pill on
 * /services, "Worked with me?" under the /testimonials grid). A raised Card as a labelled
 * section: the h2 and body beside the primary pill, which wraps under them on narrow screens.
 * Shared by Services and Testimonials (reuse rule 10).
 */
export function CtaBand({ cta, headingId, className }: CtaBandProps): ReactNode {
  return (
    <Card
      as="section"
      aria-labelledby={headingId}
      surface="raised"
      pad="none"
      className={cn('px-5 py-6 md:px-8 md:py-8', className)}
      data-section="cta"
    >
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
