import 'server-only';
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
 *
 * Server-only (like src/content/apps/store.ts, which it imports): a client island never imports
 * this module; it receives the values it needs as props or as server-rendered children.
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

// ─── W9 additions ───
// Case-study store facts. The Citizen case study shows listing counts, installs and ratings in its
// metrics, its At a glance status and its per-brand store rows. Every such number is computed here
// from the store data (store-listings.json via store.ts), never restated in JSX (audit S3.M5, S5.05).
// The content files keep the same figures as readable, test-guarded text
// (tests/unit/case-studies.test.ts); the page renders the values below.
//
// Self-contained on purpose: types are indexed off the imports at the top (no second import of a
// type name another block might also add), and the one new value import carries a W9 alias.

import { formatRatingCount as w9RatingCount, formatRatingValue as w9RatingValue } from '@/lib/format';

/** The store fact behind one case-study metric. */
export type StoreMetricFact =
  | { readonly kind: 'listing-count' }
  | { readonly kind: 'installs'; readonly listing: StoreListing['id'] }
  | { readonly kind: 'rating'; readonly listing: StoreListing['id'] };

/**
 * Which case-study metrics are store facts, by case study and metric id. Their values (and the
 * numbers in their labels) are computed from the store data; tests/unit/derived-w9.test.ts checks
 * every id resolves and that the content's text still matches.
 */
export const STORE_BACKED_METRICS: Readonly<Partial<Record<CaseStudySlug, Readonly<Record<string, StoreMetricFact>>>>> = {
  'defensys-citizen': {
    'store-listings': { kind: 'listing-count' },
    'taytay-installs': { kind: 'installs', listing: 'smile-safe-taytay.play' },
    'taytay-rating': { kind: 'rating', listing: 'smile-safe-taytay.play' },
  },
};

/** A metric as a case study renders it. `store`: the value comes from the store data. */
export type CaseStudyMetric = CaseStudy['metrics'][number] & { readonly store: boolean };

/**
 * A case study's metrics in content order, with every store-backed value computed from `listings`
 * and `summary`. A store fact that fails its display rule (installs under 1K, fewer than 5
 * ratings) or whose listing is gone is left out rather than shown.
 */
export function resolveCaseStudyMetrics(
  study: CaseStudy,
  listings: readonly StoreListing[],
  summary: StoreSummary,
): readonly CaseStudyMetric[] {
  const facts = STORE_BACKED_METRICS[study.slug] ?? {};
  return study.metrics.flatMap((metric): CaseStudyMetric[] => {
    const fact = facts[metric.id];
    if (fact === undefined) return [{ ...metric, store: false }];
    if (fact.kind === 'listing-count') {
      return [{ ...metric, value: `${summary.play} + ${summary.appstore}`, asOf: summary.asOf, store: true }];
    }
    const listing = listings.find((candidate) => candidate.id === fact.listing);
    if (!listing) return [];
    const store = PLATFORM_LABEL[listing.platform];
    if (fact.kind === 'installs') {
      const installs = listing.installs;
      if (!installs || !showInstalls(installs)) return [];
      return [{ ...metric, value: installs, label: `${store} installs of ${listing.name}`, asOf: listing.asOf, store: true }];
    }
    const rating = listing.rating;
    if (!rating || !showRating(rating)) return [];
    return [
      {
        ...metric,
        value: w9RatingValue(rating.value),
        label: `${store} rating of ${listing.name}, from ${w9RatingCount(rating.count)}`,
        asOf: listing.asOf,
        store: true,
      },
    ];
  });
}

/** The metrics a case study renders (store-backed values from the site's store data). */
export function caseStudyMetrics(study: CaseStudy): readonly CaseStudyMetric[] {
  return resolveCaseStudyMetrics(study, storeListings, storeSummary);
}

/** "6 on Google Play" / "2 on the App Store": a listing count written into a status segment. */
const STORE_COUNT_SEGMENT = /^\d+ on (Google Play|the App Store)$/;

/**
 * An At a glance status line with each listing-count segment ("6 on Google Play", "2 on the App
 * Store") recomputed from `summary`; every other segment is kept as written.
 */
export function resolveGlanceStatus(status: CaseStudy['glance']['status'], summary: StoreSummary): CaseStudy['glance']['status'] {
  return status.map((segment) => {
    const store = STORE_COUNT_SEGMENT.exec(segment)?.[1];
    if (store === undefined) return segment;
    return store === 'Google Play' ? `${summary.play} on Google Play` : `${summary.appstore} on the App Store`;
  });
}

/** A case study's At a glance status, with its listing counts from the site's store data. */
export function caseStudyGlanceStatus(study: CaseStudy): CaseStudy['glance']['status'] {
  return resolveGlanceStatus(study.glance.status, storeSummary);
}

/** One public listing as a case study shows it: the link, and the facts that pass the display rules. */
export interface ListingFacts {
  readonly listing: StoreListing;
  /** The install band when it passes the display rule (1K+), else null. */
  readonly installs: StoreListing['installs'];
  /** The rating when it passes the display rule (5+ ratings), else null. */
  readonly rating: StoreListing['rating'];
}

/** A Citizen brand's public listings (Google Play first), for the hero store row and the #brands table. */
export interface BrandStoreFacts {
  readonly brand: CitizenBrand;
  readonly listings: readonly ListingFacts[];
}

const PLATFORM_ORDER: Readonly<Record<StoreListing['platform'], number>> = { play: 0, appstore: 1 };

/** Each brand's listings with their displayable facts, in brand order; Google Play before the App Store. */
export function buildBrandStoreFacts(brandList: readonly CitizenBrand[], listings: readonly StoreListing[]): readonly BrandStoreFacts[] {
  return brandList.map((brand) => ({
    brand,
    listings: listings
      .filter((listing) => listing.brand === brand.id)
      .toSorted((a, b) => PLATFORM_ORDER[a.platform] - PLATFORM_ORDER[b.platform])
      .map((listing) => ({
        listing,
        installs: listing.installs && showInstalls(listing.installs) ? listing.installs : null,
        rating: showRating(listing.rating) ? listing.rating : null,
      })),
  }));
}

/** The six public Citizen brands with their store facts (switcher order). */
export const citizenStoreFacts: readonly BrandStoreFacts[] = buildBrandStoreFacts(brandsFor('citizen'), storeListings);
