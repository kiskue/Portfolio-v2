import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { home } from '@/content/home';
import { site } from '@/content/site';
import type { Field, Segments } from '@/content/types';

export interface PageHeaderProps {
  /** The page H1. */
  readonly title: Field;
  readonly intro?: Field;
  /** Small uppercase line above the title (segments join with " · "). */
  readonly eyebrow?: Field | Segments;
  /** Extra actions, placed before the Get in touch pill. */
  readonly actions?: ReactNode;
  /** Id on the H1 (anchors, aria-labelledby). */
  readonly id?: string;
  readonly className?: string;
}

/**
 * The header of every page except Home: the H1 at the page scale, an optional eyebrow and
 * intro, and the "Get in touch" pill top-right (consistent help, 3.2.6), which wraps under the
 * title on narrow screens. It adds no outer margin; the page spaces it.
 */
export function PageHeader({ title, intro, eyebrow, actions, id, className }: PageHeaderProps) {
  return (
    <SectionHeader
      as="h1"
      size="page"
      title={title}
      intro={intro}
      eyebrow={eyebrow}
      id={id}
      className={className}
      action={
        <>
          {actions}
          <ButtonLink href={site.contactHref} icon="arrow-up-right">
            {home.ctas.contact}
          </ButtonLink>
        </>
      }
    />
  );
}
