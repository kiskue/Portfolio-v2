import { describe, expect, it } from 'vitest';
import { parseParam } from '@/hooks/search-param';
import {
  ALL,
  CONTEXT_FILTERS,
  facetOptions,
  filtersHref,
  filtersUrl,
  isFiltered,
  matchesFilters,
  matchingSlugs,
  NO_FILTERS,
  offeredOptions,
  parseProjectFilters,
  resultSummary,
  sameFilters,
  TYPE_FILTERS,
  TYPE_LABEL,
  type FacetEntry,
  type ProjectFilterState,
} from '@/lib/project-filters';
import { projectsHref } from '@/lib/routes';

/*
 * The /projects filters (PLAN → Routes; design §8): ?type=mobile|web|ai and
 * &context=personal|company|client, AND logic, URLs built by projectsHref (type first).
 */

const entries: readonly FacetEntry[] = [
  { slug: 'app', types: ['mobile', 'ai'], context: 'personal' },
  { slug: 'site', types: ['web'], context: 'company' },
  { slug: 'tool', types: ['web', 'ai'], context: 'personal' },
  { slug: 'kiosk', types: ['mobile'], context: 'client' },
];

const filters = (type: ProjectFilterState['type'], context: ProjectFilterState['context']): ProjectFilterState => ({
  type,
  context,
});

describe('filter vocabulary', () => {
  it('offers mobile, web and ai as types: never tooling (its only project is hidden)', () => {
    expect(TYPE_FILTERS).toEqual(['all', 'mobile', 'web', 'ai']);
    expect(TYPE_FILTERS).not.toContain('tooling');
  });

  it('offers every context the content model has', () => {
    expect(CONTEXT_FILTERS).toEqual(['all', 'personal', 'company', 'client']);
  });
});

describe('parseProjectFilters', () => {
  it('reads both params, and nothing as All', () => {
    expect(parseProjectFilters('')).toEqual(NO_FILTERS);
    expect(parseProjectFilters('?type=ai')).toEqual(filters('ai', ALL));
    expect(parseProjectFilters('context=client')).toEqual(filters(ALL, 'client'));
    expect(parseProjectFilters(new URLSearchParams('context=company&type=web&utm=x'))).toEqual(filters('web', 'company'));
  });

  it('reads unknown values, tooling and wrong case as All', () => {
    expect(parseProjectFilters('type=tooling')).toEqual(NO_FILTERS);
    expect(parseProjectFilters('type=AI&context=Company')).toEqual(NO_FILTERS);
    expect(parseProjectFilters('type=&context=nope')).toEqual(NO_FILTERS);
  });

  it('agrees with what the island reads through useSearchParam', () => {
    for (const raw of [null, '', 'all', 'mobile', 'web', 'ai', 'tooling', 'AI', 'personal', 'company', 'client', 'x']) {
      const search = raw === null ? '' : `type=${raw}&context=${raw}`;
      expect(parseProjectFilters(search), String(raw)).toEqual({
        type: parseParam(raw, TYPE_FILTERS, ALL),
        context: parseParam(raw, CONTEXT_FILTERS, ALL),
      });
    }
  });
});

describe('matching (AND)', () => {
  it('All / All matches everything', () => {
    expect(matchingSlugs(entries, NO_FILTERS)).toEqual(['app', 'site', 'tool', 'kiosk']);
  });

  it('a type matches any project that lists it', () => {
    expect(matchingSlugs(entries, filters('ai', ALL))).toEqual(['app', 'tool']);
    expect(matchingSlugs(entries, filters('web', ALL))).toEqual(['site', 'tool']);
  });

  it('a context matches exactly', () => {
    expect(matchingSlugs(entries, filters(ALL, 'client'))).toEqual(['kiosk']);
  });

  it('both groups combine with AND', () => {
    expect(matchingSlugs(entries, filters('web', 'personal'))).toEqual(['tool']);
    expect(matchingSlugs(entries, filters('mobile', 'company'))).toEqual([]);
    expect(matchesFilters({ types: ['mobile', 'ai'], context: 'personal' }, filters('ai', 'personal'))).toBe(true);
    expect(matchesFilters({ types: ['mobile', 'ai'], context: 'personal' }, filters('ai', 'company'))).toBe(false);
  });

  it('knows when a filter is set', () => {
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered(filters('web', ALL))).toBe(true);
    expect(isFiltered(filters(ALL, 'company'))).toBe(true);
    expect(sameFilters(filters('web', 'company'), filters('web', 'company'))).toBe(true);
    expect(sameFilters(filters('web', 'company'), filters('web', ALL))).toBe(false);
  });
});

describe('URLs', () => {
  it('are built by projectsHref: type first, then context, All left out', () => {
    expect(filtersHref(NO_FILTERS)).toBe('/projects');
    expect(filtersHref(filters('ai', ALL))).toBe('/projects?type=ai');
    expect(filtersHref(filters(ALL, 'company'))).toBe('/projects?context=company');
    expect(filtersHref(filters('web', 'personal'))).toBe('/projects?type=web&context=personal');
    expect(filtersHref(filters('web', 'personal'))).toBe(projectsHref({ type: 'web', context: 'personal' }));
  });

  it('put the params back in order after a change, keep other params after them, and keep the hash', () => {
    expect(filtersUrl(filters('web', 'company'), '?context=company')).toBe('/projects?type=web&context=company');
    expect(filtersUrl(filters('ai', ALL), '?utm_source=cv&type=web', '#more-work')).toBe('/projects?type=ai&utm_source=cv#more-work');
    expect(filtersUrl(NO_FILTERS, '?type=web&context=company')).toBe('/projects');
    expect(filtersUrl(NO_FILTERS, '?type=web&ref=home')).toBe('/projects?ref=home');
    expect(filtersUrl(NO_FILTERS, '', '#case-studies')).toBe('/projects#case-studies');
  });
});

describe('options', () => {
  const counts = { all: 4, mobile: 2, web: 2, ai: 0 } as const;
  const options = facetOptions(TYPE_FILTERS, TYPE_LABEL, counts);

  it('carry their labels and the counts they are given, All first', () => {
    expect(options).toEqual([
      { value: 'all', label: 'All', count: 4 },
      { value: 'mobile', label: 'Mobile', count: 2 },
      { value: 'web', label: 'Web', count: 2 },
      { value: 'ai', label: 'AI', count: 0 },
    ]);
  });

  it('offer only values some project carries, plus the selected one, and always All', () => {
    expect(offeredOptions(options, ALL).map((option) => option.value)).toEqual(['all', 'mobile', 'web']);
    expect(offeredOptions(options, 'ai').map((option) => option.value)).toEqual(['all', 'mobile', 'web', 'ai']);
    const none = facetOptions(TYPE_FILTERS, TYPE_LABEL, { all: 0, mobile: 0, web: 0, ai: 0 });
    expect(offeredOptions(none, ALL).map((option) => option.value)).toEqual(['all']);
  });
});

describe('resultSummary', () => {
  it('reads as a sentence fragment for the live region', () => {
    expect(resultSummary(11, 11)).toBe('Showing all 11 projects');
    expect(resultSummary(3, 11)).toBe('Showing 3 of 11 projects');
    expect(resultSummary(1, 11)).toBe('Showing 1 of 11 projects');
    expect(resultSummary(0, 11)).toBe('Showing 0 of 11 projects');
    expect(resultSummary(1, 1)).toBe('Showing 1 project');
    expect(resultSummary(0, 0)).toBe('No projects to show yet');
  });
});
