import './bento.css';
import type { ReactNode } from 'react';
import { site } from '@/content/site';
import type { BentoArea, PlaceholderMode } from '@/content/types';
import { cn } from '@/lib/cn';
import { AboutCard } from '@/components/sections/home/about-card';
import { AiBuildsCard } from '@/components/sections/home/ai-builds-card';
import { CredentialsCard } from '@/components/sections/home/credentials-card';
import { LiveStoresCard } from '@/components/sections/home/live-stores-card';
import { ProjectsCard } from '@/components/sections/home/projects-card';
import { ServicesCard } from '@/components/sections/home/services-card';
import { TestimonialsCard } from '@/components/sections/home/testimonials-card';

/**
 * The cards in DOM order, which is the reading order at every width (PLAN "Home"): proj, about,
 * ai, live, cred, serv, testi. Set explicitly, never from object-key order (home.cards lists
 * serv before cred).
 */
export const BENTO_ORDER = ['proj', 'about', 'ai', 'live', 'cred', 'serv', 'testi'] as const satisfies readonly BentoArea[];

/** Static grid-area classes (Tailwind only generates classes it can see). */
const AREA: Record<BentoArea, string> = {
  proj: '[grid-area:proj]',
  about: '[grid-area:about]',
  ai: '[grid-area:ai]',
  live: '[grid-area:live]',
  serv: '[grid-area:serv]',
  cred: '[grid-area:cred]',
  testi: '[grid-area:testi]',
};

export interface BentoGridProps {
  readonly className?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * The Home bento (PLAN "Home", design §4.3): a CSS grid driven by container queries on <main>,
 * 1 → 2 → 4 columns (bento.css), inside the periwinkle-glow container from 768px. Each card sits
 * in a [data-bento] cell, the grid item.
 */
export function BentoGrid({ className, mode = site.placeholders }: BentoGridProps): ReactNode {
  const cards: Record<(typeof BENTO_ORDER)[number], ReactNode> = {
    proj: <ProjectsCard />,
    about: <AboutCard mode={mode} />,
    ai: <AiBuildsCard mode={mode} />,
    live: <LiveStoresCard />,
    cred: <CredentialsCard mode={mode} />,
    serv: <ServicesCard mode={mode} />,
    testi: <TestimonialsCard mode={mode} />,
  };
  return (
    <div className={cn('bento', className)} data-section="bento">
      <div className="bento-grid">
        {BENTO_ORDER.map((area) => (
          <div key={area} className={cn('bento-cell', AREA[area])} data-bento={area}>
            {cards[area]}
          </div>
        ))}
      </div>
    </div>
  );
}
