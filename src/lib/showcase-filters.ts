import { APP_IDS, type AppId, type BrandId, type ShowcaseSourceKind } from '@/content/types';

/*
 * Pure logic for the Showcase wall (design §7): the App, Brand and Source facets, the URL params
 * that keep them, which tiles a selection shows, the live counts, and the lightbox's
 * wrap-around stepping and phone fitting. No React: the wall's client islands and the unit
 * tests share it (tests/unit/showcase-filters.test.ts).
 *
 * Rules:
 * - App narrows the wall to one app's group.
 * - Brand applies while a white-label app is selected (its chips show only then): that app's
 *   replicas re-skin through BrandScope, and only the selected brand's real screenshots show,
 *   one brand at a time (PLAN "Source toggle"). With App = All every kept screenshot shows.
 * - Source applies only where the selection has real screenshots. A replica-only selection
 *   (SME, Responder) shows its replicas whatever ?source= says, and the source control shows
 *   the fixed "Coded replica · fictional data" label instead of radios.
 */

/*
 * The source toggle's words (PLAN "Source toggle": "Coded replica | Real screenshots (n)", which
 * wins over design §5.4's "Store screenshots"). They live here, in a plain module, because
 * SourceToggle is a client module: a Server Component importing a constant from it would get a
 * client reference, not the string.
 */

/** The replica side's label. */
export const REPLICA_LABEL = 'Coded replica';

/** The real side's label, with the count of kept screenshots it shows (from derived.ts). */
export function realScreenshotsLabel(count: number): string {
  return `Real screenshots (${count})`;
}

/** The fixed label where a selection has no real screenshots (design §5.4). */
export const REPLICA_ONLY_LABEL = 'Coded replica · fictional data';

/** The URL params: ?app=, ?source=, and the BrandScope keys (?brand= Citizen, ?rbrand= Responder). */
export const SHOWCASE_PARAM = {
  app: 'app',
  source: 'source',
  citizenBrand: 'brand',
  responderBrand: 'rbrand',
} as const;

export type AppFilter = 'all' | AppId;
export type SourceFilter = 'all' | ShowcaseSourceKind;
export type BrandableApp = 'citizen' | 'responder';

export const APP_FILTERS: readonly AppFilter[] = ['all', ...APP_IDS];
export const SOURCE_FILTERS: readonly SourceFilter[] = ['all', 'replica', 'real'];

/** One wall tile's facets, in wall order (from derived showcaseEntries). */
export interface ShowcaseFacet {
  readonly id: string;
  readonly app: AppId;
  readonly source: ShowcaseSourceKind;
  /** The brand a real screenshot belongs to; null for replicas (they follow their BrandScope). */
  readonly brand: BrandId | null;
}

export interface ShowcaseFilters {
  readonly app: AppFilter;
  readonly source: SourceFilter;
  /** The selected brand of each white-label app (what its BrandScope shows). */
  readonly brands: Readonly<Record<BrandableApp, BrandId>>;
}

/** The white-label app whose brand chips show for this App choice, or null. */
export function brandScopeOf(app: AppFilter): BrandableApp | null {
  return app === 'citizen' || app === 'responder' ? app : null;
}

/** Whether a tile matches the App and Brand choices (Source aside). */
function inScope(facet: ShowcaseFacet, filters: ShowcaseFilters): boolean {
  if (filters.app !== 'all' && facet.app !== filters.app) return false;
  const scope = brandScopeOf(filters.app);
  if (scope !== null && facet.source === 'real' && facet.brand !== null && facet.brand !== filters.brands[scope]) return false;
  return true;
}

/** Real screenshots within the App and Brand choices: the n of "Real screenshots (n)". */
export function realCount(facets: readonly ShowcaseFacet[], filters: ShowcaseFilters): number {
  return facets.filter((facet) => facet.source === 'real' && inScope(facet, filters)).length;
}

/** The Source choice that applies: 'all' where the selection has no real screenshots. */
export function effectiveSource(facets: readonly ShowcaseFacet[], filters: ShowcaseFilters): SourceFilter {
  return filters.source !== 'all' && realCount(facets, filters) === 0 ? 'all' : filters.source;
}

/** The tiles a selection shows, in wall order (also the lightbox's stepping order). */
export function visibleFacets(facets: readonly ShowcaseFacet[], filters: ShowcaseFilters): readonly ShowcaseFacet[] {
  const source = effectiveSource(facets, filters);
  return facets.filter((facet) => inScope(facet, filters) && (source === 'all' || facet.source === source));
}

/** True when any choice differs from the defaults (Clear filters is offered then). */
export function isFiltered(filters: ShowcaseFilters, defaults: ShowcaseFilters): boolean {
  return (
    filters.app !== defaults.app ||
    filters.source !== defaults.source ||
    filters.brands.citizen !== defaults.brands.citizen ||
    filters.brands.responder !== defaults.brands.responder
  );
}

/** Field-by-field equality, so a URL sync that changes nothing keeps the same state object. */
export function sameFilters(a: ShowcaseFilters, b: ShowcaseFilters): boolean {
  return a.app === b.app && a.source === b.source && a.brands.citizen === b.brands.citizen && a.brands.responder === b.brands.responder;
}

/** "Showing 12 of 56 screens" / "Showing 56 screens" (no copy ever claims every screenshot). */
export function resultText(shown: number, total: number): string {
  const noun = total === 1 ? 'screen' : 'screens';
  return shown === total ? `Showing ${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`;
}

/** The index `delta` steps from `index` in a list of `length`, wrapping at both ends. */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  return (((index + delta) % length) + length) % length;
}

/** The query string ("?…" or "") without the given keys: Clear filters writes every param at once. */
export function withoutParams(search: string, keys: readonly string[]): string {
  const params = new URLSearchParams(search);
  for (const key of keys) params.delete(key);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The logical outer box of a phone (414×868) or a screenshot card (414 wide, its image's aspect). */
export const LOGICAL_WIDTH = 414;
export const PHONE_RATIO = 868 / 414;

/**
 * The --ps that fits a box of aspect `ratio` (height / width) into `width` × `height` CSS px,
 * clamped to [min, max] (the lightbox: xs to 2xl). Non-finite or empty space gives `min`.
 */
export function fitScale(width: number, height: number, ratio: number, min: number, max: number): number {
  const scale = Math.min(width / LOGICAL_WIDTH, height / (LOGICAL_WIDTH * ratio));
  if (!Number.isFinite(scale) || scale <= 0) return min;
  return Math.min(max, Math.max(min, Math.floor(scale * 10_000) / 10_000));
}
