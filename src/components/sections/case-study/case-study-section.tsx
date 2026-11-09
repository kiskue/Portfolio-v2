import type { ReactNode } from 'react';
import { SectionHeader } from '@/components/ui/section-header';
import type { CaseStudy, CaseStudySectionKey, Field, Segments } from '@/content/types';
import { cn } from '@/lib/cn';

/** Every section component's props: the one case study the page renders. */
export interface SectionProps {
  readonly study: CaseStudy;
}

/**
 * Section names, used by each section's h2 and the "On this page" list. The section ids are the
 * keys themselves, so other pages can link to /projects/<slug>#ai, #built or #brands.
 */
export const SECTION_LABELS = {
  overview: 'At a glance',
  problem: 'The problem',
  built: 'What I built',
  ai: 'Grounded AI',
  brands: 'Brands',
  screens: 'Screens',
  architecture: 'Architecture',
  challenges: 'Challenges',
  numbers: 'Numbers',
  next: 'What’s next',
} as const satisfies Record<CaseStudySectionKey, string>;

/** The h2 id of a section, for aria-labelledby. */
export function sectionHeadingId(key: CaseStudySectionKey): string {
  return `${key}-title`;
}

export interface CaseStudySectionProps {
  /** The section key: also its id, so the "#key" anchors land here. */
  readonly id: CaseStudySectionKey;
  /** The h2; defaults to the section's label. */
  readonly title?: Field;
  readonly eyebrow?: Field | Segments;
  readonly intro?: Field;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * One case-study section: a <section> with the key as its id, named by its h2 (SectionHeader, reuse
 * rule 5).
 */
export function CaseStudySection({ id, title, eyebrow, intro, children, className }: CaseStudySectionProps): ReactNode {
  const headingId = sectionHeadingId(id);
  return (
    <section id={id} aria-labelledby={headingId} data-cs-section={id} className={cn('flex min-w-0 flex-col gap-6 md:gap-8', className)}>
      <SectionHeader as="h2" size="section" id={headingId} title={title ?? SECTION_LABELS[id]} eyebrow={eyebrow} intro={intro} />
      {children}
    </section>
  );
}
