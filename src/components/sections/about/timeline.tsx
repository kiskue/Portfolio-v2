import { projects as allProjects } from '@/content/projects';
import { site } from '@/content/site';
import type { ExperienceEntry, Field, PlaceholderMode, Project, Segments } from '@/content/types';
import { Chip, ChipLink, ExampleTag } from '@/components/ui/chip';
import { Copy, MetaLine } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { fieldOrNull, visible } from '@/lib/placeholder';
import { caseStudyHref } from '@/lib/routes';

export interface TimelineProps {
  /** Experience entries, newest first, already filtered with visible(). */
  readonly entries: readonly ExperienceEntry[];
  /** Projects the entries refer to by slug (default: every project in content). */
  readonly projects?: readonly Project[];
  readonly mode?: PlaceholderMode;
}

/**
 * What an entry shows once placeholder rules apply. The heading is the title, or the
 * organisation when hide mode has removed the title; the line under it repeats the organisation
 * only when the title took the heading. Nothing here is ever an empty element.
 */
export function entryLines(entry: ExperienceEntry, mode: PlaceholderMode): { readonly heading: Field | null; readonly sub: Segments } {
  const title = fieldOrNull(entry.title, mode);
  const org = fieldOrNull(entry.org, mode);
  return title !== null ? { heading: title, sub: org !== null ? [org] : [] } : { heading: org, sub: [] };
}

function Bullets({ items, mode }: { readonly items: readonly Field[]; readonly mode: PlaceholderMode }) {
  const shown = items.filter((item) => fieldOrNull(item, mode) !== null);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5 text-body-sm text-ink-2">
      {shown.map((item, index) => (
        <li key={index} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-line-strong" />
          <Copy as="span" text={item} mode={mode} className="min-w-0" />
        </li>
      ))}
    </ul>
  );
}

/** The projects an entry names: case studies link to them, other work is a plain chip. */
function ProjectChips({ slugs, projects, label }: { readonly slugs: readonly string[]; readonly projects: readonly Project[]; readonly label: string }) {
  const named = slugs.flatMap((slug) => projects.filter((project) => project.slug === slug));
  if (named.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {named.map((project) => (
        <li key={project.slug}>
          {project.caseStudy ? (
            <ChipLink href={caseStudyHref(project.caseStudy)} size="sm">
              {project.title}
              <span className="sr-only"> case study</span>
              <Icon name="arrow-right" size={12} className="ms-1 inline-block align-[-0.0625em]" />
            </ChipLink>
          ) : (
            <Chip size="sm">{project.title}</Chip>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The About experience timeline (design §8), newest first. Titles and dates that cannot be
 * proven are placeholders: marked in label mode; in hide mode those fields go and the entry
 * keeps the rest (PLAN: hide removes token fields, not items).
 */
export function Timeline({ entries, projects = allProjects, mode = site.placeholders }: TimelineProps) {
  const shownProjects = visible(projects, mode);
  return (
    <ol className="relative ms-1 flex flex-col gap-10 border-s border-line-strong/40 ps-7" data-timeline="">
      {entries.map((entry) => {
        const { heading, sub } = entryLines(entry, mode);
        return (
          <li key={entry.id} className="relative flex flex-col gap-3" data-entry={entry.id}>
            <span
              aria-hidden="true"
              className="absolute -start-[calc(1.75rem+0.5px+5px)] top-[0.3rem] size-2.5 rounded-full bg-accent ring-4 ring-bg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Copy as="p" text={entry.period} mode={mode} className="text-meta font-semibold text-accent-ink" />
                {mode === 'label' && entry.example === true ? <ExampleTag /> : null}
              </div>
              {heading !== null ? (
                <h3 className="mt-1 text-h3-hero text-ink">
                  <Copy text={heading} mode={mode} />
                </h3>
              ) : null}
              <MetaLine segments={sub} mode={mode} className="mt-0.5 text-body-sm text-ink-3" />
            </div>
            <Copy as="p" text={entry.body} mode={mode} className="max-w-[65ch] text-body text-ink-2" />
            {entry.highlights ? <Bullets items={entry.highlights} mode={mode} /> : null}
            <ProjectChips slugs={entry.projects} projects={shownProjects} label="Projects" />
          </li>
        );
      })}
    </ol>
  );
}
