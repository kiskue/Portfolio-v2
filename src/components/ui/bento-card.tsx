import type { ReactNode } from 'react';
import type { BentoArea, Field, IconName, SiteRoute } from '@/content/types';
import { Card, stretchedLinkClass } from '@/components/ui/card';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { SiteLink } from '@/components/ui/site-link';
import { cn } from '@/lib/cn';

export interface BentoCardLink {
  readonly href: SiteRoute;
  readonly label: string;
  /**
   * 'stretched': the whole card is the link (title is the link text, the label is a visual
   * cue). Only for cards with NO other interactive content (design §2 rule).
   * 'header': an explicit "label →" link in the header; the card itself does not lift.
   */
  readonly mode: 'stretched' | 'header';
}

export interface BentoCardProps {
  /** The grid area name used by the Home bento's grid-template-areas. */
  readonly area: BentoArea;
  readonly icon: IconName;
  readonly title: string;
  readonly description?: Field;
  /** The 2×2 Projects card: 20px title and a 32px tile. */
  readonly hero?: true;
  readonly link?: BentoCardLink;
  readonly className?: string;
  readonly children?: ReactNode;
}

/** Static class names (Tailwind only generates classes it can see). */
const AREA: Record<BentoArea, string> = {
  proj: '[grid-area:proj]',
  about: '[grid-area:about]',
  ai: '[grid-area:ai]',
  live: '[grid-area:live]',
  serv: '[grid-area:serv]',
  cred: '[grid-area:cred]',
  testi: '[grid-area:testi]',
};

/**
 * A Home bento card, composed from Card (the template's anatomy: cream surface, orange tile with
 * a white glyph, title, one-line description). Its h2 names the section. Radius is the 18px card
 * radius, concentric with the 30px bento container around the grid.
 */
export function BentoCard({ area, icon, title, description, hero, link, className, children }: BentoCardProps) {
  const titleId = `bento-${area}-title`;
  const stretched = link?.mode === 'stretched';

  return (
    <Card
      as="section"
      aria-labelledby={titleId}
      interactive={stretched}
      className={cn('flex min-w-0 flex-col', AREA[area], stretched && 'group/bento', className)}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone="solid" size={hero ? 32 : 28} />
        <h2 id={titleId} className={cn('min-w-0 text-ink', hero ? 'text-h3-hero' : 'text-card-title')}>
          {stretched ? (
            <SiteLink href={link.href} className={stretchedLinkClass}>
              {title}
            </SiteLink>
          ) : (
            title
          )}
        </h2>
        {link ? (
          link.mode === 'header' ? (
            <SiteLink
              href={link.href}
              className="group/more ms-auto inline-flex min-h-6 shrink-0 items-center gap-1 text-meta font-semibold text-ink-2 transition-colors duration-(--dur-1) hover:text-accent-ink"
            >
              {link.label}
              <Icon
                name="arrow-right"
                size={14}
                className="transition-[translate] duration-(--dur-1) group-hover/more:translate-x-0.5 reduce-motion:group-hover/more:translate-none"
              />
            </SiteLink>
          ) : (
            <span
              aria-hidden="true"
              className="ms-auto inline-flex shrink-0 items-center gap-1 text-meta font-semibold text-ink-2 transition-colors duration-(--dur-1) group-hover/bento:text-accent-ink"
            >
              {link.label}
              <Icon name="arrow-right" size={14} />
            </span>
          )
        ) : null}
      </div>
      <Copy as="p" text={description} className="mt-2 text-body-sm text-ink-3" />
      {children ? <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div> : null}
    </Card>
  );
}
