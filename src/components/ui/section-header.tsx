import type { ReactNode } from 'react';
import type { Field, Segments } from '@/content/types';
import { Copy, MetaLine } from '@/components/ui/copy';
import { cn } from '@/lib/cn';

export type HeadingLevel = 'h1' | 'h2' | 'h3';
export type SectionHeaderSize = 'page' | 'section' | 'card';

export interface SectionHeaderProps {
  /** The heading element; pick it from the document outline, independently of `size`. */
  readonly as: HeadingLevel;
  /** page: the page H1 scale; section: h2 scale; card: 16px card title. */
  readonly size: SectionHeaderSize;
  readonly title: Field;
  /** Small uppercase line above the title in accent-ink; segments join with " · ". */
  readonly eyebrow?: Field | Segments;
  readonly intro?: Field;
  /** Id on the heading, for anchors and aria-labelledby. */
  readonly id?: string;
  /** Trailing actions, e.g. the "Get in touch" pill or an "All projects →" link. */
  readonly action?: ReactNode;
  readonly className?: string;
}

const TITLE: Record<SectionHeaderSize, string> = {
  page: 'text-h1 text-balance',
  section: 'text-h2 text-balance',
  card: 'text-card-title',
};

const INTRO: Record<SectionHeaderSize, string> = {
  page: 'mt-3 max-w-[65ch] text-lead text-ink-2',
  section: 'mt-2 max-w-[65ch] text-body text-ink-2',
  card: 'mt-1 text-body-sm text-ink-3',
};

/** The one heading block (reuse rule 5): eyebrow, title, intro and an optional action. */
export function SectionHeader({ as: Heading, size, title, eyebrow, intro, id, action, className }: SectionHeaderProps) {
  const eyebrowClass = 'mb-2 text-eyebrow text-accent-ink uppercase';
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0 flex-1 basis-80">
        {typeof eyebrow === 'string' ? (
          <Copy as="p" text={eyebrow} className={eyebrowClass} />
        ) : eyebrow ? (
          <MetaLine segments={eyebrow} className={eyebrowClass} />
        ) : null}
        <Heading id={id} className={cn('text-ink', TITLE[size])}>
          <Copy text={title} />
        </Heading>
        <Copy as="p" text={intro} className={INTRO[size]} />
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
