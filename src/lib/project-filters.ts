import type { Route } from 'next';
import { PROJECT_CONTEXTS, type Project, type ProjectContext, type ProjectType } from '@/content/types';
import { projectsHref } from '@/lib/routes';

/**
 * The /projects filters as pure functions, shared by the server sections, the FacetFilter island
 * and the tests (PLAN → Routes: `?type=mobile|web|ai` and `&context=personal|company|client`).
 *
 * - Two groups, combined with AND. 'all' is each group's unfiltered value and never appears in
 *   the URL.
 * - The type group offers mobile, web and ai only (PLAN.md:78). 'tooling' stays in the content
 *   model, but its only project is hidden, so it is not a filter value: ?type=tooling reads as All.
 * - Unknown or missing values read as All.
 * - URLs come from projectsHref (type first, then context); other query params follow them and
 *   the #hash is kept.
 */

export const ALL = 'all';

/** Type facets offered on /projects, in display order. */
export const TYPE_FACETS = ['mobile', 'web', 'ai'] as const satisfies readonly ProjectType[];
export type TypeFacet = (typeof TYPE_FACETS)[number];

export type TypeFilter = typeof ALL | TypeFacet;
export type ContextFilter = typeof ALL | ProjectContext;

/** Every value each group accepts, All first: the URL vocabulary. */
export const TYPE_FILTERS: readonly TypeFilter[] = [ALL, ...TYPE_FACETS];
export const CONTEXT_FILTERS: readonly ContextFilter[] = [ALL, ...PROJECT_CONTEXTS];

/** The selection of both groups. */
export interface ProjectFilterState {
  readonly type: TypeFilter;
  readonly context: ContextFilter;
}

export const NO_FILTERS: ProjectFilterState = { type: ALL, context: ALL };

export const TYPE_LABEL = {
  all: 'All',
  mobile: 'Mobile',
  web: 'Web',
  ai: 'AI',
} as const satisfies Record<TypeFilter, string>;

export const CONTEXT_LABEL = {
  all: 'All',
  personal: 'Personal',
  company: 'Company',
  client: 'Client',
} as const satisfies Record<ContextFilter, string>;

/** What the filters need to know about one project (serialisable, so a client island can take it). */
export interface FacetEntry {
  readonly slug: string;
  readonly types: readonly ProjectType[];
  readonly context: ProjectContext;
}

export function facetEntry(project: Project): FacetEntry {
  return { slug: project.slug, types: project.types, context: project.context };
}

/** True when the project passes both groups (AND). */
export function matchesFilters(entry: Pick<FacetEntry, 'types' | 'context'>, filters: ProjectFilterState): boolean {
  return (
    (filters.type === ALL || entry.types.includes(filters.type)) &&
    (filters.context === ALL || entry.context === filters.context)
  );
}

/** The slugs of the entries that pass the filters, in content order. */
export function matchingSlugs(entries: readonly FacetEntry[], filters: ProjectFilterState): readonly string[] {
  return entries.filter((entry) => matchesFilters(entry, filters)).map((entry) => entry.slug);
}

export function isFiltered(filters: ProjectFilterState): boolean {
  return filters.type !== ALL || filters.context !== ALL;
}

export function sameFilters(a: ProjectFilterState, b: ProjectFilterState): boolean {
  return a.type === b.type && a.context === b.context;
}

function pick<T extends string>(raw: string | null | undefined, allowed: readonly T[]): T | typeof ALL {
  return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : ALL;
}

/** The filters a query string asks for. Unknown values, ?type=tooling among them, read as All. */
export function parseProjectFilters(search: string | Pick<URLSearchParams, 'get'>): ProjectFilterState {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return {
    type: pick(params.get('type'), TYPE_FILTERS),
    context: pick(params.get('context'), CONTEXT_FILTERS),
  };
}

/** /projects with these filters, built by projectsHref: type first, then context, All omitted. */
export function filtersHref(filters: ProjectFilterState): Route {
  return projectsHref({
    type: filters.type === ALL ? undefined : filters.type,
    context: filters.context === ALL ? undefined : filters.context,
  });
}

/**
 * The address after a filter change: filtersHref's path and query, then any other query params
 * the page was opened with (in their order), then the #hash.
 */
export function filtersUrl(filters: ProjectFilterState, search = '', hash = ''): string {
  const href: string = filtersHref(filters);
  const others = new URLSearchParams(search);
  others.delete('type');
  others.delete('context');
  const rest = others.toString();
  const url = rest === '' ? href : `${href}${href.includes('?') ? '&' : '?'}${rest}`;
  return `${url}${hash}`;
}

/** One radio of a filter group, with how many visible projects carry its value. */
export interface FacetOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly count: number;
}

/**
 * A group's options in display order with their counts. The counts are passed in from
 * src/content/derived.ts (`projectFacetCounts`, where `all` is the visible total); nothing is
 * counted here.
 */
export function facetOptions<T extends string>(
  values: readonly T[],
  labels: Readonly<Record<T, string>>,
  counts: Readonly<Record<T, number>>,
): readonly FacetOption<T>[] {
  return values.map((value) => ({ value, label: labels[value], count: counts[value] }));
}

/**
 * The options a group shows: All, every value at least one visible project carries, and the
 * selected value even when nothing carries it (a shared ?context=client then shows what it
 * selects, next to the empty state). A value with no projects is otherwise a dead end, so it is
 * not offered; it appears by itself once content carries it.
 */
export function offeredOptions<T extends string>(options: readonly FacetOption<T>[], selected: T): readonly FacetOption<T>[] {
  return options.filter((option) => option.value === ALL || option.count > 0 || option.value === selected);
}

/** "5 projects", "1 project". */
export function projectCount(count: number): string {
  return `${count} ${count === 1 ? 'project' : 'projects'}`;
}

/** The live result line: "Showing all 11 projects", "Showing 3 of 11 projects". */
export function resultSummary(shown: number, total: number): string {
  if (total === 0) return 'No projects to show yet';
  if (shown === total) return total === 1 ? 'Showing 1 project' : `Showing all ${projectCount(total)}`;
  return `Showing ${shown} of ${projectCount(total)}`;
}
