import type { ReactNode } from 'react';
import { GlimpsePlayer } from '@/components/showcase/glimpse';
import { BentoCard } from '@/components/ui/bento-card';
import { home } from '@/content/home';
import type { GlimpseId } from '@/content/types';
import { projectsHref } from '@/lib/routes';
import { cardLink } from '@/components/sections/home/card-link';

/** The Home trio, in the rotation order SME → Citizen → Responder (design §5.3). */
export const HOME_GLIMPSES: readonly GlimpseId[] = ['home.sme', 'home.citizen', 'home.responder'];

/**
 * Projects, the 2×2 hero card (design §4.3, §5.3): the glimpse trio, each phone linking to its
 * case study with the phone morph (the player's default), and "All projects →" in the header.
 * The phones peek up from the card's bottom edge: the player cancels the card's bottom padding.
 */
export function ProjectsCard(): ReactNode {
  const copy = home.cards.proj;
  return (
    <BentoCard
      area="proj"
      icon="folder-open"
      title={copy.title}
      description={copy.description}
      hero
      link={cardLink('proj', projectsHref(), 'header')}
    >
      {/* bento.css (.proj-player): 12px wider than the card's text column, bigger trio phones. */}
      <div className="proj-player -mb-4 mt-auto md:-mb-5">
        <GlimpsePlayer glimpses={HOME_GLIMPSES} layout="trio" size="inherit" />
      </div>
    </BentoCard>
  );
}
