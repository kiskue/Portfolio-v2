import { describe, expect, it } from 'vitest';
import { parseParam, withParam } from '@/hooks/search-param';
import {
  APP_FILTERS,
  SHOWCASE_PARAM,
  SOURCE_FILTERS,
  brandScopeOf,
  effectiveSource,
  fitScale,
  isFiltered,
  PHONE_RATIO,
  realCount,
  resultText,
  sameFilters,
  stepIndex,
  visibleFacets,
  withoutParams,
  type ShowcaseFacet,
  type ShowcaseFilters,
} from '@/lib/showcase-filters';

/*
 * The Showcase facets (design §7): App narrows to one group; Brand applies while a white-label
 * app is selected (re-skin plus one brand's screenshots at a time); Source applies only where
 * the selection has real screenshots. Plus the lightbox's wrap-around stepping and fitting.
 */

const DEFAULTS: ShowcaseFilters = { app: 'all', source: 'all', brands: { citizen: 'smile-safe-taytay', responder: 'defensys' } };
const pick = (patch: Partial<Omit<ShowcaseFilters, 'brands'>> & { citizen?: ShowcaseFilters['brands']['citizen'] }): ShowcaseFilters => ({
  app: patch.app ?? DEFAULTS.app,
  source: patch.source ?? DEFAULTS.source,
  brands: { citizen: patch.citizen ?? DEFAULTS.brands.citizen, responder: DEFAULTS.brands.responder },
});

/** A small wall in wall order: SME replicas, Citizen replicas and screenshots, Responder replicas. */
const FACETS: readonly ShowcaseFacet[] = [
  { id: 'replica-1.1', app: 'sme', source: 'replica', brand: null },
  { id: 'replica-1.2', app: 'sme', source: 'replica', brand: null },
  { id: 'replica-2.1', app: 'citizen', source: 'replica', brand: null },
  { id: 'replica-2.3', app: 'citizen', source: 'replica', brand: null },
  { id: 'smile-safe-taytay.play-1', app: 'citizen', source: 'real', brand: 'smile-safe-taytay' },
  { id: 'smile-safe-taytay.appstore-1', app: 'citizen', source: 'real', brand: 'smile-safe-taytay' },
  { id: '1hope.play-1', app: 'citizen', source: 'real', brand: '1hope' },
  { id: 'replica-3.1', app: 'responder', source: 'replica', brand: null },
];
const ids = (filters: ShowcaseFilters) => visibleFacets(FACETS, filters).map((facet) => facet.id);

describe('showcase facets', () => {
  it('shows the whole wall by default, in wall order', () => {
    expect(ids(DEFAULTS)).toEqual(FACETS.map((facet) => facet.id));
  });

  it('App narrows to one group', () => {
    expect(ids(pick({ app: 'sme' }))).toEqual(['replica-1.1', 'replica-1.2']);
    expect(ids(pick({ app: 'responder' }))).toEqual(['replica-3.1']);
  });

  it('Brand shows one brand’s screenshots at a time while its app is selected; replicas stay (they re-skin)', () => {
    expect(ids(pick({ app: 'citizen' }))).toEqual([
      'replica-2.1',
      'replica-2.3',
      'smile-safe-taytay.play-1',
      'smile-safe-taytay.appstore-1',
    ]);
    expect(ids(pick({ app: 'citizen', citizen: '1hope' }))).toEqual(['replica-2.1', 'replica-2.3', '1hope.play-1']);
  });

  it('Brand does not filter while App is All (its chips are hidden then)', () => {
    expect(ids(pick({ citizen: '1hope' }))).toEqual(FACETS.map((facet) => facet.id));
    expect(brandScopeOf('all')).toBeNull();
    expect(brandScopeOf('sme')).toBeNull();
    expect(brandScopeOf('citizen')).toBe('citizen');
    expect(brandScopeOf('responder')).toBe('responder');
  });

  it('Source keeps one kind', () => {
    expect(ids(pick({ source: 'real' }))).toEqual(['smile-safe-taytay.play-1', 'smile-safe-taytay.appstore-1', '1hope.play-1']);
    expect(ids(pick({ source: 'replica' }))).toEqual(FACETS.filter((facet) => facet.source === 'replica').map((facet) => facet.id));
    expect(ids(pick({ app: 'citizen', citizen: '1hope', source: 'real' }))).toEqual(['1hope.play-1']);
  });

  it('Source is ignored where the selection has no real screenshots (replica-only apps)', () => {
    expect(effectiveSource(FACETS, pick({ app: 'sme', source: 'real' }))).toBe('all');
    expect(ids(pick({ app: 'sme', source: 'real' }))).toEqual(['replica-1.1', 'replica-1.2']);
    expect(effectiveSource(FACETS, pick({ app: 'citizen', source: 'real' }))).toBe('real');
    // Replica-only: any Source choice reads as all, which shows the same replicas.
    expect(effectiveSource(FACETS, pick({ app: 'sme', source: 'replica' }))).toBe('all');
    expect(ids(pick({ app: 'sme', source: 'replica' }))).toEqual(ids(pick({ app: 'sme' })));
  });

  it('counts the real screenshots in scope: the n of "Real screenshots (n)"', () => {
    expect(realCount(FACETS, DEFAULTS)).toBe(3);
    expect(realCount(FACETS, pick({ app: 'citizen' }))).toBe(2);
    expect(realCount(FACETS, pick({ app: 'citizen', citizen: '1hope' }))).toBe(1);
    expect(realCount(FACETS, pick({ app: 'responder' }))).toBe(0);
    // The count does not depend on the Source choice itself.
    expect(realCount(FACETS, pick({ source: 'replica' }))).toBe(3);
  });

  it('can match nothing (the empty state), e.g. a brand with no screenshots under Source = Real', () => {
    const wall: readonly ShowcaseFacet[] = [
      { id: 'a', app: 'citizen', source: 'real', brand: '1hope' },
      { id: 'b', app: 'sme', source: 'replica', brand: null },
    ];
    // App = All, Source = Real: the Citizen screenshot only.
    expect(visibleFacets(wall, pick({ source: 'real' })).map((facet) => facet.id)).toEqual(['a']);
    // A Citizen brand without screenshots has no real tiles, so Source falls back to all: nothing left
    // only when the app has no tiles at all.
    expect(visibleFacets(wall, pick({ app: 'responder' }))).toEqual([]);
  });

  it('knows when anything is filtered and compares field by field', () => {
    expect(isFiltered(DEFAULTS, DEFAULTS)).toBe(false);
    expect(isFiltered(pick({ app: 'sme' }), DEFAULTS)).toBe(true);
    expect(isFiltered(pick({ source: 'real' }), DEFAULTS)).toBe(true);
    expect(isFiltered(pick({ citizen: '1hope' }), DEFAULTS)).toBe(true);
    expect(isFiltered({ ...DEFAULTS, brands: { ...DEFAULTS.brands, responder: 'sjdm' } }, DEFAULTS)).toBe(true);
    expect(sameFilters(pick({}), DEFAULTS)).toBe(true);
    expect(sameFilters(pick({ app: 'citizen' }), DEFAULTS)).toBe(false);
  });

  it('words the live count without claiming every screenshot', () => {
    expect(resultText(56, 56)).toBe('Showing 56 screens');
    expect(resultText(19, 56)).toBe('Showing 19 of 56 screens');
    expect(resultText(0, 56)).toBe('Showing 0 of 56 screens');
    expect(resultText(1, 1)).toBe('Showing 1 screen');
  });
});

describe('showcase URL params', () => {
  it('reads unknown or missing values as the defaults', () => {
    expect(parseParam(new URLSearchParams('app=citizen').get(SHOWCASE_PARAM.app), APP_FILTERS, 'all')).toBe('citizen');
    expect(parseParam(new URLSearchParams('app=web').get(SHOWCASE_PARAM.app), APP_FILTERS, 'all')).toBe('all');
    expect(parseParam(new URLSearchParams('').get(SHOWCASE_PARAM.source), SOURCE_FILTERS, 'all')).toBe('all');
    expect(parseParam(new URLSearchParams('source=real').get(SHOWCASE_PARAM.source), SOURCE_FILTERS, 'all')).toBe('real');
  });

  it('shares the BrandScope keys: ?brand= for Citizen, ?rbrand= for Responder', () => {
    expect(SHOWCASE_PARAM).toEqual({ app: 'app', source: 'source', citizenBrand: 'brand', responderBrand: 'rbrand' });
  });

  it('writes one key at a time and clears every key at once', () => {
    expect(withParam('', SHOWCASE_PARAM.app, 'citizen', 'all')).toBe('?app=citizen');
    expect(withParam('?app=citizen&brand=1hope', SHOWCASE_PARAM.app, 'all', 'all')).toBe('?brand=1hope');
    const keys = Object.values(SHOWCASE_PARAM);
    expect(withoutParams('?app=citizen&brand=1hope&source=real&rbrand=sjdm', keys)).toBe('');
    expect(withoutParams('?app=sme&utm_source=x', keys)).toBe('?utm_source=x');
  });
});

describe('lightbox helpers', () => {
  it('steps with wrap-around at both ends', () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });

  it('fits a phone or a card into the space, between the smallest and the largest phone size', () => {
    // 1440×900 desktop: limited by height.
    expect(fitScale(700, 728, PHONE_RATIO, 0.2899, 1.0145)).toBeCloseTo(728 / 868, 3);
    // Tall space: capped at 2xl.
    expect(fitScale(800, 2000, PHONE_RATIO, 0.2899, 1.0145)).toBe(1.0145);
    // Narrow phone screen: limited by width.
    expect(fitScale(300, 2000, PHONE_RATIO, 0.2899, 1.0145)).toBeCloseTo(300 / 414, 3);
    // A Play screenshot card (500×1024) is a little shorter than a phone, so it may grow more.
    expect(fitScale(700, 728, 1024 / 500, 0.2899, 1.0145)).toBeGreaterThan(fitScale(700, 728, PHONE_RATIO, 0.2899, 1.0145));
    // No space: the smallest size.
    expect(fitScale(0, 0, PHONE_RATIO, 0.2899, 1.0145)).toBe(0.2899);
    expect(fitScale(Number.NaN, 500, PHONE_RATIO, 0.2899, 1.0145)).toBe(0.2899);
  });
});
