import type { ReactNode } from 'react';
import { ProjectCard } from '@/components/content/project-card';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { adjacentCaseStudies } from '@/content/derived';
import { projects } from '@/content/projects';
import { site } from '@/content/site';
import type { CaseStudy, Project } from '@/content/types';
import { fieldOrNull } from '@/lib/placeholder';

/*
 * Section 10, Next (design §6.10): the honest gaps first, then the previous and next case studies in
 * cyclic order (SME → Citizen → Responder). The cards carry no phone, so no view-transition name
 * repeats the hero's; their links prefetch only on hover or focus (heavy routes, SiteLink).
 */

function projectOf(study: CaseStudy): Project | undefined {
  return projects.find((project) => project.slug === study.projectSlug);
}

export function NextSection({ study }: SectionProps): ReactNode {
  const gaps = study.gaps.filter((gap) => fieldOrNull(gap, site.placeholders) !== null);
  const { prev, next } = adjacentCaseStudies(study.slug);
  const previous = projectOf(prev);
  const following = projectOf(next);
  return (
    <CaseStudySection id="next" intro={gaps.length > 0 ? 'The known gaps first: what isn’t built or verified yet. Then the other case studies.' : undefined}>
      {gaps.length > 0 ? (
        <ul aria-label="Known gaps" className="flex max-w-[75ch] flex-col gap-3">
          {gaps.map((gap, index) => (
            <li key={index} className="flex gap-3 text-body-sm text-ink-2">
              <Icon name="circle-alert" size={18} className="mt-0.5 text-ink-3" />
              <Copy text={gap} />
            </li>
          ))}
        </ul>
      ) : null}
      <nav aria-label="Other case studies" className="@container/next">
        <ul className="grid gap-4 @2xl/next:grid-cols-2">
          {previous ? <ProjectCard project={previous} look="adjacent" direction="previous" as="li" /> : null}
          {following ? <ProjectCard project={following} look="adjacent" direction="next" as="li" /> : null}
        </ul>
      </nav>
    </CaseStudySection>
  );
}
