import type { ReactElement } from 'react';
import type { Field, IconName } from '@/content/types';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export interface StatProps {
  /**
   * The figure: a content field ("5K+", or a "[[…]]" token), or an element for composed values
   * such as <Years years={…} suffix="+" />. Numbers come from derived.ts or content, never JSX.
   */
  readonly value: Field | ReactElement;
  readonly label: Field;
  /** A decorative glyph after the value, e.g. the star after a rating. */
  readonly icon?: IconName;
  /** sm: 20px figures (cards); md: the fluid stat scale (heroes, Numbers). */
  readonly size?: 'sm' | 'md';
  /** 'li' inside a stat list. */
  readonly as?: 'div' | 'li';
  readonly className?: string;
}

/** A figure with its label (Live card, case-study hero and Numbers, About). */
export function Stat({ value, label, icon, size = 'md', as: Element = 'div', className }: StatProps) {
  return (
    <Element className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-ink tabular-nums',
          size === 'md' ? 'text-stat' : 'text-h3-hero font-extrabold',
        )}
      >
        {typeof value === 'string' ? <Copy text={value} /> : value}
        {icon ? <Icon name={icon} size={size === 'md' ? 24 : 18} className="text-accent-ink" /> : null}
      </span>
      <Copy as="span" text={label} className="text-meta text-ink-3" />
    </Element>
  );
}
