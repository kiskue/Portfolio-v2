import { apps } from '@/content/apps/apps';
import { brands } from '@/content/apps/brands';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import { storeListings } from '@/content/apps/store';
import { caseStudies } from '@/content/case-studies';
import { projects } from '@/content/projects';
import { site } from '@/content/site';
import {
  PROJECT_CONTEXTS,
  PROJECT_TYPES,
  type AppId,
  type AppInfo,
  type Brand,
  type BrandId,
  type CaseStudy,
  type CaseStudySlug,
  type CitizenBrand,
  type Figure,
  type FigureId,
  type Glimpse,
  type GlimpseId,
  type ISODate,
  type PlaceholderMode,
  type Project,
  type ProjectContext,
  type ProjectType,
  type ResolvedScreen,
  type ResponderBrand,
  type ScreenSource,
  type ShowcaseEntry,
  type StoreListing,
  type StoreSummary,
} from '@/content/types';
import { installBandValue } from '@/lib/format';
import { visible } from '@/lib/placeholder';
import { showInstalls, showRating } from '@/lib/store-rules';

/**
 * Every number and lookup the pages need, computed from content. This is the only place counts
 * are derived; copy and JSX never hard-code them. Builders are pure (and unit-tested with
 * fixtures); the exported values apply them to the real content.
 */

// ─── Lookups ─────────────────────────────────────────────────────────────────────────────

function indexBy<T, K>(items: readonly T[], key: (item: T) => K): ReadonlyMap<K, T> {
  return new Map(items.map((item) => [key(item), item]));
}

function required<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Unknown ${what}: ${String(key)}`);
  return value;
}

export const figureById: ReadonlyMap<FigureId, Figure> = indexBy<Figure, FigureId>(figures, (figure) => figure.id);
const brandsById = indexBy<Brand, BrandId>(brands, (brand) => brand.id);
const appsById = indexBy<AppInfo, AppId>(apps, (app) => app.id);
const glimpsesById = indexBy<Glimpse, GlimpseId>(glimpses, (glimpse) => glimpse.id);
const caseStudiesBySlug = indexBy<CaseStudy, CaseStudySlug>(caseStudies, (study) => study.slug);

export function getFigure(id: FigureId): Figure {
  return required(figureById, id, 'figure');
}

export function brandById(id: BrandId): Brand {
  return required(brandsById, id, 'brand');
}

export function appById(id: AppId): AppInfo {
  return required(appsById, id, 'app');
}

export function glimpseById(id: GlimpseId): Glimpse {
  return required(glimpsesById, id, 'glimpse');
}

export function caseStudyBySlug(slug: CaseStudySlug): CaseStudy {
  return required(caseStudiesBySlug, slug, 'case study');
}

/** Previous and next case study in cyclic order (SME → Citizen → Responder → SME). */
export function adjacentCaseStudies(slug: CaseStudySlug): { readonly prev: CaseStudy; readonly next: CaseStudy } {
  const index = caseStudies.findIndex((study) => study.slug === slug);
  const count = caseStudies.length;
  const prev = caseStudies[(index - 1 + count) % count];
  const next = caseStudies[(index + 1) % count];
  if (index === -1 || !prev || !next) throw new Error(`Unknown case study: ${slug}`);
  return { prev, next };
}

/** Brands of one white-label app, in switcher order. */
export function brandsFor(app: 'citizen'): readonly CitizenBrand[];
export function brandsFor(app: 'responder'): readonly ResponderBrand[];
export function brandsFor(app: 'citizen' | 'responder'): readonly Brand[] {
  return brands.filter((brand) => brand.app === app);
}

/** The brand a switcher or replica starts on: Smile SAFE Taytay (Citizen), Defensys (Responder). */
export function defaultBrand(app: 'citizen'): CitizenBrand;
export function defaultBrand(app: 'responder'): ResponderBrand;
export function defaultBrand(app: 'citizen' | 'responder'): Brand;
export function defaultBrand(app: 'citizen' | 'responder'): Brand {
  const brand = brands.find((candidate) => candidate.app === app && candidate.isDefault === true);
  if (!brand) throw new Error(`No default brand for ${app}`);
  return brand;
}

// ─── Screens ─────────────────────────────────────────────────────────────────────────────

/**
 * A screen source with every default filled in: the figure, its state (states[0] when
 * unspecified) and its brand (the app's default brand for brandable figures, else null).
 * Throws on an unknown state or a brand from another app, so content errors fail the build.
 */
export function resolveScreen(source: ScreenSource): ResolvedScreen {
  if (source.kind === 'image') return { kind: 'image', image: source.image };

  const figure = getFigure(source.figure);
  const state = source.state ?? figure.states[0];
  if (!figure.states.includes(state)) {
    throw new Error(`Figure ${figure.id} has no state "${state}" (states: ${figure.states.join(', ')})`);
  }

  if (source.brand !== undefined) {
    const brand = brandById(source.brand);
    if (brand.app !== figure.app) {
      throw new Error(`Brand ${brand.id} belongs to ${brand.app}, not to figure ${figure.id} (${figure.app})`);
    }
    return { kind: 'replica', figure, state, brand };
  }

  const brand = figure.brandable && figure.app !== 'sme' ? defaultBrand(figure.app) : null;
  return { kind: 'replica', figure, state, brand };
}

// ─── Store ───────────────────────────────────────────────────────────────────────────────

/** Store counts and headline facts. Display thresholds come from src/lib/store-rules.ts. */
export function summarizeStore(listings: readonly StoreListing[], fallbackAsOf: ISODate): StoreSummary {
  let topInstalls: StoreSummary['topInstalls'] = null;
  let topRating: StoreSummary['topRating'] = null;

  for (const listing of listings) {
    const { installs, rating } = listing;
    if (installs && showInstalls(installs) && (!topInstalls || installBandValue(installs) > installBandValue(topInstalls.installs))) {
      topInstalls = { listing: listing.id, brand: listing.brand, installs };
    }
    if (
      rating &&
      showRating(rating) &&
      (!topRating || rating.count > topRating.count || (rating.count === topRating.count && rating.value > topRating.value))
    ) {
      topRating = { listing: listing.id, brand: listing.brand, value: rating.value, count: rating.count };
    }
  }

  const latest = listings.reduce<ISODate | null>((max, listing) => (max === null || listing.asOf > max ? listing.asOf : max), null);

  return {
    listings: listings.length,
    play: listings.filter((listing) => listing.platform === 'play').length,
    appstore: listings.filter((listing) => listing.platform === 'appstore').length,
    publicBrands: new Set(listings.map((listing) => listing.brand)).size,
    screenshots: listings.reduce((total, listing) => total + listing.screenshots.length, 0),
    topInstalls,
    topRating,
    asOf: latest ?? fallbackAsOf,
  };
}

export const storeSummary: StoreSummary = summarizeStore(storeListings, site.asOf);

// ─── Showcase ────────────────────────────────────────────────────────────────────────────

const PLATFORM_LABEL = { play: 'Google Play', appstore: 'App Store' } as const;

/** The Showcase wall: grouped by app, replicas first, then each listing's real screenshots. */
export function buildShowcaseEntries(
  allFigures: readonly Figure[],
  listings: readonly StoreListing[],
  appList: readonly AppInfo[],
): readonly ShowcaseEntry[] {
  return appList.flatMap((app): ShowcaseEntry[] => {
    const replicas = allFigures
      .filter((figure) => figure.app === app.id)
      .map(
        (figure): ShowcaseEntry => ({
          id: `replica-${figure.id}`,
          app: app.id,
          caseStudy: app.caseStudy,
          label: `FIG ${figure.id} ${figure.title}`,
          source: 'replica',
          figure,
          screen: { kind: 'replica', figure: figure.id },
          brand: null,
        }),
      );
    const real =
      app.id === 'citizen'
        ? listings.flatMap((listing) =>
            listing.screenshots.map(
              (image, index): ShowcaseEntry => ({
                id: `${listing.id}-${index + 1}`,
                app: app.id,
                caseStudy: app.caseStudy,
                label: `${listing.name} · ${PLATFORM_LABEL[listing.platform]} screenshot ${index + 1} of ${listing.screenshots.length}`,
                source: 'real',
                listing,
                position: index + 1,
                screen: { kind: 'image', image },
                brand: listing.brand,
              }),
            ),
          )
        : [];
    return [...replicas, ...real];
  });
}

export const showcaseEntries: readonly ShowcaseEntry[] = buildShowcaseEntries(figures, storeListings, apps);

// ─── Projects ────────────────────────────────────────────────────────────────────────────

export type ProjectFacet = 'all' | ProjectType | ProjectContext;

/** How many visible projects match each filter value (Projects page filter counts). */
export function facetCounts(list: readonly Project[], mode: PlaceholderMode): Readonly<Record<ProjectFacet, number>> {
  const shown = visible(list, mode);
  const counts = { all: shown.length } as Record<ProjectFacet, number>;
  for (const type of PROJECT_TYPES) counts[type] = shown.filter((project) => project.types.includes(type)).length;
  for (const context of PROJECT_CONTEXTS) counts[context] = shown.filter((project) => project.context === context).length;
  return counts;
}

export const projectFacetCounts: Readonly<Record<ProjectFacet, number>> = facetCounts(projects, site.placeholders);
