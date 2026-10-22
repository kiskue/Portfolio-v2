import type { ReactNode } from 'react';
import { CaseStudyCards } from '@/components/sections/projects/case-study-cards';
import { FacetBar, FacetEmpty, FacetScope } from '@/components/sections/projects/facet-filter';
import { MoreWorkGrid } from '@/components/sections/projects/more-work-grid';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { facetCounts, projectFacetCounts } from '@/content/derived';
import { emptyStates } from '@/content/home';
import { projects as allProjects } from '@/content/projects';
import { site } from '@/content/site';
import type { PlaceholderMode, Project } from '@/content/types';
import { cn } from '@/lib/cn';
import { visible } from '@/lib/placeholder';
import { CONTEXT_FILTERS, CONTEXT_LABEL, facetEntry, facetOptions, TYPE_FILTERS, TYPE_LABEL } from '@/lib/project-filters';

export interface ProjectsIndexProps {
  /** Defaults to site.placeholders (tests render hide mode too). */
  readonly mode?: PlaceholderMode;
  /** Defaults to every project in src/content/projects.ts. */
  readonly projects?: readonly Project[];
  readonly className?: string;
}

/**
 * The /projects index (design §8, PLAN → Other pages): the Type and Context filters, the three
 * case-study cards, then the "More work" grid, and the empty state for a filter that matches
 * nothing. Every visible project is server-rendered; the FacetFilter island only hides cards.
 * Hidden projects never render, in either placeholder mode; hide mode also drops example items.
 * Option counts come from src/content/derived.ts, never from this file.
 */
export function ProjectsIndex({ mode = site.placeholders, projects = allProjects, className }: ProjectsIndexProps): ReactNode {
  const shown = visible(projects, mode);
  const counts = projects === allProjects && mode === site.placeholders ? projectFacetCounts : facetCounts(projects, mode);
  const empty = emptyStates.projects;

  return (
    <FacetScope entries={shown.map(facetEntry)}>
      <div className={cn('flex flex-col gap-10', className)}>
        <FacetBar
          typeOptions={facetOptions(TYPE_FILTERS, TYPE_LABEL, counts)}
          contextOptions={facetOptions(CONTEXT_FILTERS, CONTEXT_LABEL, counts)}
        />
        <div className="flex flex-col gap-12 md:gap-16">
          <CaseStudyCards projects={shown.filter((project) => project.caseStudy !== undefined)} mode={mode} />
          <MoreWorkGrid projects={shown.filter((project) => project.caseStudy === undefined)} mode={mode} />
          <FacetEmpty clearLabel={empty.cta?.label ?? 'Clear filters'}>
            <IconTile icon="folder-open" tone="soft" size={32} />
            <SectionHeader as="h2" size="card" title={empty.title} intro={empty.body} />
          </FacetEmpty>
        </div>
      </div>
    </FacetScope>
  );
}
