import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import type { EmptyState as EmptyStateCopy, IconName } from '@/content/types';
import { cn } from '@/lib/cn';

export type EmptyStateSize = 'section' | 'card';

export interface EmptyStateProps {
  /** The copy (src/content/home.ts emptyStates): a line, an optional body and an optional link. */
  readonly state: EmptyStateCopy;
  /**
   * The title's heading element, from the document outline: h2 where the block stands in for a
   * page section, h3 inside a card whose own title is the h2 (Home's Testimonials card).
   */
  readonly as?: 'h2' | 'h3';
  /** 'section': a page's empty result (h2 scale, card radius); 'card': compact, inside a card. */
  readonly size?: EmptyStateSize;
  /** A soft tile above the title: the page's nav icon. Leave it out inside a card that has its own tile. */
  readonly icon?: IconName;
  /**
   * Replaces the state's link, e.g. a client island's "Clear filters" button. Whatever it renders
   * (possibly nothing, while no filter is set) is the block's only action; `null` means none.
   */
  readonly action?: ReactNode;
  /** The data-empty-state value, naming which list is empty (e.g. 'testimonials'). */
  readonly name?: string;
  readonly className?: string;
}

/** Padding, gap and radius per size. Inside a card the box matches the 12px quote cards it replaces. */
const LOOK: Record<EmptyStateSize, { readonly radius: 'card' | 'control'; readonly className: string }> = {
  section: { radius: 'card', className: 'gap-4 px-5 py-8 md:px-8 md:py-10' },
  card: { radius: 'control', className: 'gap-3 p-4 md:p-5' },
};

/**
 * What a list shows when nothing is left to show (design §4.3, §7, §8, §10; audit S5.13): hide
 * mode with no real testimonials, or a filter that matches nothing. One block for Home's
 * Testimonials card, /testimonials, and the /projects and /showcase no-match states: a dashed
 * sunken Card, an optional soft icon tile, the title and body through SectionHeader, then one
 * action, the state's link as a secondary pill, or the `action` slot instead.
 *
 * Hook-free and server-safe: client islands (the filter scopes) wrap it to show or hide it and
 * pass their own buttons in through `action`.
 */
export function EmptyState({ state, as = 'h2', size = 'section', icon, action, name, className }: EmptyStateProps): ReactNode {
  const look = LOOK[size];
  const link = state.cta ? (
    <ButtonLink href={state.cta.href} variant="secondary" size="sm" icon="arrow-right">
      {state.cta.label}
    </ButtonLink>
  ) : null;

  return (
    <Card
      surface="sunken"
      radius={look.radius}
      pad="none"
      className={cn('flex flex-col items-start border-dashed border-line-strong', look.className, className)}
      data-empty-state={name ?? ''}
    >
      {icon ? <IconTile icon={icon} tone="soft" size={32} /> : null}
      <SectionHeader as={as} size={size} title={state.title} intro={state.body} className="self-stretch" />
      {action === undefined ? link : action}
    </Card>
  );
}
