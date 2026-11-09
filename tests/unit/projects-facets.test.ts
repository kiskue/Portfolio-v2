import { describe, expect, it } from 'vitest';
import { facetCounts, projectFacetCounts } from '@/content/derived';
import { projects } from '@/content/projects';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import {
  ALL,
  CONTEXT_FILTERS,
  CONTEXT_LABEL,
  facetEntry,
  facetOptions,
  matchingSlugs,
  NO_FILTERS,
  offeredOptions,
  TYPE_FACETS,
  TYPE_FILTERS,
} from '@/lib/project-filters';

/*
 * Facet counts on the real content: the numbers beside each filter come from
 * src/content/derived.ts (projectFacetCounts), and they must equal what that filter then shows.
 */

const MODES: readonly PlaceholderMode[] = ['label', 'hide'];

describe('projectFacetCounts agrees with the filters', () => {
  for (const mode of MODES) {
    const shown = visible(projects, mode);
    const entries = shown.map(facetEntry);
    const counts = mode === site.placeholders ? projectFacetCounts : facetCounts(projects, mode);

    it(`${mode} mode: All counts every visible project`, () => {
      expect(counts.all).toBe(shown.length);
      expect(matchingSlugs(entries, NO_FILTERS)).toHaveLength(counts.all);
    });

    it(`${mode} mode: each type count is what that type filter shows`, () => {
      for (const type of TYPE_FILTERS) {
        expect(matchingSlugs(entries, { type, context: ALL }), type).toHaveLength(counts[type]);
      }
    });

    it(`${mode} mode: each context count is what that context filter shows`, () => {
      for (const context of CONTEXT_FILTERS) {
        expect(matchingSlugs(entries, { type: ALL, context }), context).toHaveLength(counts[context]);
      }
    });
  }
});

describe('facets on the real content', () => {
  const shown = visible(projects, site.placeholders);

  it('every visible project is reachable through an offered type (none is tooling-only)', () => {
    const unreachable = shown.filter((project) => !project.types.some((type) => (TYPE_FACETS as readonly string[]).includes(type)));
    expect(unreachable.map((project) => project.slug)).toEqual([]);
  });

  it('the only tooling project is hidden, so tooling counts nothing', () => {
    expect(projects.filter((project) => project.types.includes('tooling')).every((project) => project.hidden === true)).toBe(true);
    expect(projectFacetCounts.tooling).toBe(0);
  });

  it('offers a context only while some visible project has it (no client work yet → no Client radio)', () => {
    const options = facetOptions(CONTEXT_FILTERS, CONTEXT_LABEL, projectFacetCounts);
    const offered = offeredOptions(options, ALL).map((option) => option.value);
    for (const option of options) {
      if (option.value !== ALL) expect(offered.includes(option.value), option.value).toBe(option.count > 0);
    }
    // A shared ?context=client still shows the radio it selects (next to the empty state).
    expect(offeredOptions(options, 'client').map((option) => option.value)).toContain('client');
  });

  it('?type=ai lists JP Live Subtitles (the Home AI builds chip links there)', () => {
    expect(matchingSlugs(shown.map(facetEntry), { type: 'ai', context: ALL })).toContain('jp-live-subtitles');
  });
});
