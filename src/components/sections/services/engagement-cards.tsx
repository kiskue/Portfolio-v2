import type { Route } from 'next';
import { site } from '@/content/site';
import type { Engagement, IconName, PlaceholderMode } from '@/content/types';
import { Card, stretchedLinkClass } from '@/components/ui/card';
import { ExampleTag } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { SiteLink } from '@/components/ui/site-link';
import { cn } from '@/lib/cn';
import { contactHref } from '@/lib/routes';

export interface EngagementCardsProps {
  /** The engagement models to show, already filtered with visible(). */
  readonly engagements: readonly Engagement[];
  readonly mode?: PlaceholderMode;
}

export const ENGAGEMENTS_HEADING_ID = 'engagements-title';

interface EngagementLook {
  readonly icon: IconName;
  /** The card's one link: contact, preset to the matching topic. */
  readonly cta: string;
  readonly href: Route;
}

/** Hiring goes to the hiring topic; contract and fixed-scope work are projects. */
const LOOK: Readonly<Record<string, EngagementLook>> = {
  'full-time': { icon: 'briefcase', cta: 'Talk about a role', href: contactHref('hiring') },
  contract: { icon: 'users', cta: 'Ask about a contract', href: contactHref('project') },
  'fixed-scope': { icon: 'file-text', cta: 'Scope a project', href: contactHref('project') },
};

const FALLBACK: EngagementLook = { icon: 'message-circle', cta: 'Get in touch', href: contactHref('other') };

export function engagementLook(id: string): EngagementLook {
  return LOOK[id] ?? FALLBACK;
}

/**
 * The engagement cards (design §8): full-time role, contract and fixed-scope project. Terms and
 * pricing are the owner's to write, so the bodies are placeholders (marked in label mode, gone
 * in hide mode). Each card is one stretched link to the contact form with its topic preset.
 */
export function EngagementCards({ engagements, mode = site.placeholders }: EngagementCardsProps) {
  if (engagements.length === 0) return null;
  return (
    <section aria-labelledby={ENGAGEMENTS_HEADING_ID} data-section="engagements">
      <SectionHeader as="h2" size="section" id={ENGAGEMENTS_HEADING_ID} title="Ways to work together" />
      <ul className="mt-6 grid gap-4 @3xl:grid-cols-3">
        {engagements.map((engagement) => {
          const look = engagementLook(engagement.id);
          return (
            <Card
              key={engagement.id}
              as="li"
              surface="raised"
              interactive
              className="group/engagement flex flex-col gap-3"
              data-engagement-card={engagement.id}
            >
              <div className="flex items-start justify-between gap-3">
                <IconTile icon={look.icon} tone="soft" size={32} />
                {mode === 'label' && engagement.example === true ? <ExampleTag /> : null}
              </div>
              <h3 className="text-card-title text-ink">{engagement.title}</h3>
              <Copy as="p" text={engagement.body} mode={mode} className="text-body-sm text-ink-3" />
              <SiteLink
                href={look.href}
                className={cn(
                  stretchedLinkClass,
                  'mt-auto inline-flex items-center gap-1.5 pt-1 text-meta font-semibold text-ink transition-colors duration-(--dur-1) group-hover/engagement:text-accent-ink',
                )}
              >
                {look.cta}
                <Icon name="arrow-right" size={14} />
              </SiteLink>
            </Card>
          );
        })}
      </ul>
    </section>
  );
}
