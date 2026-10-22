import type { ReactNode } from 'react';
import { SectionHeader } from '@/components/ui/section-header';
import type { AboutSection as AboutSectionId } from '@/lib/routes';

export interface AboutSectionProps {
  /** The anchor aboutHref(id) links to. */
  readonly id: AboutSectionId;
  readonly title: string;
  readonly intro?: string;
  readonly children: ReactNode;
}

/** One titled About section, anchored at its id (#experience, #skills…) and named by its h2. */
export function AboutSection({ id, title, intro, children }: AboutSectionProps) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex flex-col gap-6">
      <SectionHeader as="h2" size="section" id={headingId} title={title} intro={intro} />
      {children}
    </section>
  );
}
