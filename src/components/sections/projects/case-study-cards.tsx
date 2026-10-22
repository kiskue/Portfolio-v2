import { ViewTransition, type ReactNode } from 'react';
import { ProjectCard } from '@/components/content/project-card';
import { FacetItem, FacetSection } from '@/components/sections/projects/facet-filter';
import { ScreenView } from '@/components/showcase/screen-view';
import { SectionHeader } from '@/components/ui/section-header';
import { caseStudyBySlug, getFigure, glimpseById } from '@/content/derived';
import type { CaseStudySlug, PlaceholderMode, Project } from '@/content/types';
import { stepStates } from '@/lib/glimpse';

/**
 * The phone on a case-study card: a static sm phone showing the screen its case-study hero opens
 * on (the hero glimpse's poster step), so the shared `phone-<slug>` View Transition morphs it into
 * the hero without a jump. Names stay unique on /projects: one per case study.
 */
function CaseStudyPhone({ slug }: { readonly slug: CaseStudySlug }): ReactNode {
  const glimpse = glimpseById(caseStudyBySlug(slug).hero.glimpse);
  const step = glimpse.steps[glimpse.posterStep] ?? glimpse.steps[0];
  const { poster } = stepStates(step, getFigure(step.figure).states[0]);
  return (
    <ViewTransition name={`phone-${slug}`} share="morph" default="none">
      <ScreenView source={{ kind: 'replica', figure: step.figure, state: poster }} size="sm" />
    </ViewTransition>
  );
}

export interface CaseStudyCardsProps {
  /** The case-study projects, in content order. */
  readonly projects: readonly Project[];
  readonly mode: PlaceholderMode;
}

/**
 * "Case studies" (design §8): the three large cards first, each a whole-card link to its case
 * study (prefetched only on hover or focus) with a static phone, its status shape and up to four
 * stack chips. Three columns once <main> is 56rem wide, otherwise stacked.
 */
export function CaseStudyCards({ projects, mode }: CaseStudyCardsProps): ReactNode {
  if (projects.length === 0) return null;
  return (
    <FacetSection slugs={projects.map((project) => project.slug)} aria-labelledby="case-studies">
      <SectionHeader as="h2" size="section" id="case-studies" title="Case studies" />
      <ul className="mt-6 grid gap-4 @4xl:grid-cols-3 @4xl:gap-5">
        {projects.map((project) => (
          <FacetItem key={project.slug} slug={project.slug} className="flex">
            <ProjectCard
              project={project}
              look="case-study"
              mode={mode}
              phone={project.caseStudy ? <CaseStudyPhone slug={project.caseStudy} /> : undefined}
              className="w-full"
            />
          </FacetItem>
        ))}
      </ul>
    </FacetSection>
  );
}
