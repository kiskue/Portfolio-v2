'use client';

import {
  createContext,
  Suspense,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { useSearchParam } from '@/hooks/use-search-param';
import { cn } from '@/lib/cn';
import {
  ALL,
  CONTEXT_FILTERS,
  filtersUrl,
  isFiltered,
  matchingSlugs,
  NO_FILTERS,
  offeredOptions,
  projectCount,
  resultSummary,
  sameFilters,
  TYPE_FILTERS,
  type ContextFilter,
  type FacetEntry,
  type FacetOption,
  type ProjectFilterState,
  type TypeFilter,
} from '@/lib/project-filters';

/*
 * FacetFilter (architecture D2; design §8): the /projects filters as one client island in parts
 * that share a context, the way BrandScope works.
 *
 * - FacetScope holds the selection. The server and the first paint show every project (All /
 *   All). A tiny sync part inside <Suspense> reads ?type= and ?context= through useSearchParam
 *   after hydration, so the page stays statically prerendered and every project shows without
 *   JavaScript (the filter bar itself only appears with JavaScript).
 * - A change writes the URL with history.replaceState: no history entry, no server request.
 *   projectsHref builds it, so type always comes before context, and a reset clears both at once.
 * - FacetSection and FacetItem wrap server-rendered sections and cards and only toggle their
 *   `hidden` attribute, so no card re-renders. FacetEmpty shows when nothing matches.
 */

interface FacetContextValue {
  readonly filters: ProjectFilterState;
  readonly setFilters: (next: ProjectFilterState) => void;
  /** Slugs of the projects that pass the filters. */
  readonly matched: ReadonlySet<string>;
  readonly total: number;
  /** The filter bar, so Clear filters can hand focus back to it. */
  readonly barRef: RefObject<HTMLDivElement | null>;
}

const FacetContext = createContext<FacetContextValue | null>(null);

function useFacets(): FacetContextValue {
  const value = use(FacetContext);
  if (value === null) throw new Error('FacetFilter parts must be rendered inside FacetScope');
  return value;
}

/** Reads ?type= and ?context= (inside Suspense: it needs useSearchParams). Renders nothing. */
function FacetParamSync({ onFilters }: { readonly onFilters: (filters: ProjectFilterState) => void }): ReactNode {
  const [type] = useSearchParam<TypeFilter>('type', TYPE_FILTERS, ALL);
  const [context] = useSearchParam<ContextFilter>('context', CONTEXT_FILTERS, ALL);
  // A layout effect, so a client navigation to /projects?type=ai paints the filtered list first.
  useLayoutEffect(() => {
    onFilters({ type, context });
  }, [type, context, onFilters]);
  return null;
}

export interface FacetScopeProps {
  /** Every project the page renders, with its facets. */
  readonly entries: readonly FacetEntry[];
  readonly children: ReactNode;
}

export function FacetScope({ entries, children }: FacetScopeProps): ReactNode {
  const [filters, setState] = useState<ProjectFilterState>(NO_FILTERS);
  const barRef = useRef<HTMLDivElement>(null);

  const onUrlFilters = useCallback((next: ProjectFilterState) => {
    setState((current) => (sameFilters(current, next) ? current : next));
  }, []);
  const setFilters = useCallback((next: ProjectFilterState) => {
    setState(next);
    const { search, hash } = window.location;
    window.history.replaceState(null, '', filtersUrl(next, search, hash));
  }, []);

  const matched = useMemo(() => new Set(matchingSlugs(entries, filters)), [entries, filters]);
  const value = useMemo<FacetContextValue>(
    () => ({ filters, setFilters, matched, total: entries.length, barRef }),
    [filters, setFilters, matched, entries.length],
  );

  return (
    <FacetContext value={value}>
      <Suspense fallback={null}>
        <FacetParamSync onFilters={onUrlFilters} />
      </Suspense>
      {children}
    </FacetContext>
  );
}

/** Radio options: visibly "Mobile 5", heard "Mobile, 5 projects" (the name contains the label, 2.5.3). */
function segments<T extends string>(options: readonly FacetOption<T>[]): SegmentedOption<T>[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    srLabel: `${option.label}, ${projectCount(option.count)}`,
    media: (
      <span aria-hidden="true" className="order-last font-medium text-ink-3 tabular-nums">
        {option.count}
      </span>
    ),
  }));
}

export interface FacetBarProps {
  readonly typeOptions: readonly FacetOption<TypeFilter>[];
  readonly contextOptions: readonly FacetOption<ContextFilter>[];
  readonly className?: string;
}

/**
 * The two filter groups (native radios: arrow keys move the choice) and the live result count.
 * Filtering needs JavaScript, so without it the bar is not shown and every project is listed.
 */
export function FacetBar({ typeOptions, contextOptions, className }: FacetBarProps): ReactNode {
  const { filters, setFilters, matched, total, barRef } = useFacets();
  return (
    <div ref={barRef} className={cn('noscript:hidden', className)} data-facet-bar="">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <SegmentedControl
          name="type"
          legend="Type"
          options={segments(offeredOptions(typeOptions, filters.type))}
          value={filters.type}
          onValueChange={(type) => setFilters({ ...filters, type })}
        />
        <SegmentedControl
          name="context"
          legend="Context"
          options={segments(offeredOptions(contextOptions, filters.context))}
          value={filters.context}
          onValueChange={(context) => setFilters({ ...filters, context })}
        />
      </div>
      <p role="status" className="mt-3 text-meta text-ink-3">
        {resultSummary(matched.size, total)}
      </p>
    </div>
  );
}

export type FacetSectionProps = Omit<ComponentProps<'section'>, 'hidden'> & {
  /** The projects listed in this section; it hides when none of them passes the filters. */
  readonly slugs: readonly string[];
};

export function FacetSection({ slugs, ...rest }: FacetSectionProps): ReactNode {
  const { matched } = useFacets();
  return <section {...rest} hidden={!slugs.some((slug) => matched.has(slug))} />;
}

export interface FacetItemProps {
  readonly slug: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** One project's list item; hidden while the filters exclude it. */
export function FacetItem({ slug, children, className }: FacetItemProps): ReactNode {
  const { matched } = useFacets();
  return (
    <li className={className} hidden={!matched.has(slug)} data-project={slug}>
      {children}
    </li>
  );
}

export interface FacetEmptyProps {
  readonly clearLabel: string;
  /** The server-rendered message (icon, title, body). */
  readonly children: ReactNode;
  readonly className?: string;
}

/** The empty state, shown only when no project passes the filters, with Clear filters when filtered. */
export function FacetEmpty({ clearLabel, children, className }: FacetEmptyProps): ReactNode {
  const { filters, setFilters, matched, barRef } = useFacets();
  if (matched.size > 0) return null;

  const clear = () => {
    // The button disappears with the empty state, so focus moves to the Type group's All radio,
    // which stays on the page (it becomes the checked one).
    barRef.current?.querySelector<HTMLInputElement>('input[name="type"][value="all"]')?.focus();
    setFilters(NO_FILTERS);
  };

  return (
    <Card as="div" surface="sunken" className={cn('flex flex-col items-start gap-3', className)} data-facet-empty="">
      {children}
      {isFiltered(filters) ? (
        <Button variant="secondary" size="sm" icon="rotate-ccw" onClick={clear} className="mt-1">
          {clearLabel}
        </Button>
      ) : null}
    </Card>
  );
}
