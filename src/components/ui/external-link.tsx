import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

/** Underlined text link (links in prose are underlined, 1.4.1); hover turns it accent-ink. */
export const inlineLinkClass = [
  'font-semibold text-ink underline decoration-line-strong decoration-1 underline-offset-4',
  'transition-colors duration-(--dur-1) hover:text-accent-ink hover:decoration-current',
].join(' ');

export type ExternalLinkProps = Omit<ComponentProps<'a'>, 'href' | 'target' | 'rel' | 'children'> & {
  /** An absolute URL; mailto: and tel: links stay in the same tab. */
  readonly href: string;
  readonly children: ReactNode;
  /** The trailing ↗ arrow (decorative). Default: shown for new-tab links, not for mailto:/tel:. */
  readonly icon?: boolean;
  /** 'inline': an underlined text link; 'bare': unstyled, the caller styles it. */
  readonly look?: 'inline' | 'bare';
};

const SAME_TAB = /^(?:mailto|tel):/i;

/**
 * A link that leaves the site: a new tab with rel="noopener noreferrer", an ↗ arrow, and a
 * screen-reader-only "(opens in a new tab)" so the change of context is announced (3.2.5).
 */
export function ExternalLink({ href, children, icon, look = 'inline', className, ...rest }: ExternalLinkProps) {
  const newTab = !SAME_TAB.test(href);
  const arrow = icon ?? newTab;
  return (
    <a
      {...rest}
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={cn(look === 'inline' && inlineLinkClass, className)}
    >
      {children}
      {arrow ? <Icon name="arrow-up-right" size={14} className="ms-0.5 inline-block align-[-0.125em]" /> : null}
      {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
