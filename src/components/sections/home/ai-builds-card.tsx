import type { ReactNode } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { ChipLink } from '@/components/ui/chip';
import { StatusLegend } from '@/components/ui/status-dot';
import { aiBuilds } from '@/content/ai-builds';
import { home } from '@/content/home';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { projectsHref } from '@/lib/routes';
import { cardLink } from '@/components/sections/home/card-link';

export interface AiBuildsCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * AI builds (design §4.3): static wrapping chips, each linking to where the build is shown, with
 * its status as a shape plus words (the chip's accessible name ends in the status, e.g.
 * "SME AI assistant, Beta") and a legend. The chips are links, so the card has a header link to
 * the AI projects and no hover lift.
 */
export function AiBuildsCard({ mode = site.placeholders }: AiBuildsCardProps): ReactNode {
  const copy = home.cards.ai;
  return (
    <BentoCard
      area="ai"
      icon="sparkles"
      title={copy.title}
      description={copy.description}
      link={cardLink('ai', projectsHref({ type: 'ai' }), 'header')}
    >
      <ul className="flex flex-wrap gap-1.5">
        {visible(aiBuilds, mode).map((build) => (
          <li key={build.id} className="max-w-full">
            <ChipLink href={build.href} icon={build.icon} status={build.status}>
              {build.label}
            </ChipLink>
          </li>
        ))}
      </ul>
      <StatusLegend className="mt-auto pt-3" />
    </BentoCard>
  );
}
