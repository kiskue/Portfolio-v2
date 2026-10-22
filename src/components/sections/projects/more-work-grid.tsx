import type { ReactNode } from 'react';
import { ProjectCard } from '@/components/content/project-card';
import { FacetItem, FacetSection } from '@/components/sections/projects/facet-filter';
import { SectionHeader } from '@/components/ui/section-header';
import type { PlaceholderMode, Project } from '@/content/types';

export interface MoreWorkGridProps {
  /** Every visible project without a case study, in content order. */
  readonly projects: readonly Project[];
  readonly mode: PlaceholderMode;
}

/**
 * "More work" (design §8): compact cards in 3 / 2 / 1 columns, each with an icon tile instead of
 * an image (V1's AI-generated screenshots are never reused), its context and company, status and
 * links. A card is one whole-card link only when it has exactly one destination.
 */
export function MoreWorkGrid({ projects, mode }: MoreWorkGridProps): ReactNode {
  if (projects.length === 0) return null;
  return (
    <FacetSection slugs={projects.map((project) => project.slug)} aria-labelledby="more-work">
      <SectionHeader as="h2" size="section" id="more-work" title="More work" />
      <ul className="mt-6 grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3 @4xl:gap-5">
        {projects.map((project) => (
          <FacetItem key={project.slug} slug={project.slug} className="flex">
            <ProjectCard project={project} look="compact" mode={mode} className="w-full" />
          </FacetItem>
        ))}
      </ul>
    </FacetSection>
  );
}
