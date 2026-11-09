import { describe, expect, it } from 'vitest';
import { brandOptions } from '@/components/showcase/brand-options';
import { apps } from '@/content/apps/apps';
import { citizenBrands } from '@/content/apps/brands';
import { figures } from '@/content/apps/figures';
import { listingsForBrand, storeExclusions, storeListings } from '@/content/apps/store';
import {
  screenshotCounts,
  screenshotsByBrand,
  showcaseEntries,
  showcaseSummary,
  storeSummary,
  summarizeShowcase,
} from '@/content/derived';
import type { CitizenBrand, ShowcaseEntry, StoreListing } from '@/content/types';

/*
 * W10a-S additions to src/content/derived.ts: the per-brand count of kept store screenshots
 * (the n of "Real screenshots (n)") and the Showcase wall's totals. Counts come only from
 * derived.ts, so brand-options.ts, SourceToggle and the Showcase read them from here.
 */

const fixtureBrand = (id: CitizenBrand['id']): CitizenBrand => ({
  id,
  app: 'citizen',
  name: id,
  locality: 'Fixture',
  palette: { primary: '#000000', secondary: '#111111', accent: '#222222', titleInk: '#333333' },
  icon: `/store/citizen/${id}/play-icon.webp`,
  headerMark: { kind: 'icon' },
});

const fixtureListing = (brand: CitizenBrand['id'], platform: StoreListing['platform'], shots: number): StoreListing => ({
  id: `${brand}.${platform}`,
  brand,
  platform,
  name: brand,
  url: 'https://play.google.com/store/apps/details?id=com.example.app',
  publisher: 'Fixture',
  installs: platform === 'play' ? '1K+' : null,
  rating: null,
  asOf: '2026-10-19',
  icon: { src: `/store/citizen/${brand}/${platform}-icon.webp`, width: 256, height: 256 },
  screenshots: Array.from({ length: shots }, (_, index) => ({
    src: `/store/citizen/${brand}/${platform}-0${index + 1}.webp` as const,
    width: 500,
    height: 1024,
    alt: `${brand} ${platform} screenshot ${index + 1}`,
    provenance: platform,
    presentation: 'marketing' as const,
  })),
});

describe('screenshotCounts', () => {
  it('adds every listing of a brand and gives brands without a listing 0', () => {
    const counts = screenshotCounts(
      [fixtureListing('1hope', 'play', 7), fixtureListing('1hope', 'appstore', 6), fixtureListing('sjdm-app', 'play', 3)],
      [fixtureBrand('1hope'), fixtureBrand('sjdm-app'), fixtureBrand('aero-app')],
    );
    expect(counts).toEqual({ '1hope': 13, 'sjdm-app': 3, 'aero-app': 0 });
  });

  it('counts the kept screenshots of the real listings per brand (excluded ones never count)', () => {
    expect(Object.keys(screenshotsByBrand)).toEqual(citizenBrands.map((brand) => brand.id));
    for (const brand of citizenBrands) {
      const kept = listingsForBrand(brand.id).reduce((total, listing) => total + listing.screenshots.length, 0);
      expect(screenshotsByBrand[brand.id], brand.id).toBe(kept);
    }
    expect(screenshotsByBrand).toEqual({
      'smile-safe-taytay': 6,
      '1hope': 13,
      'sjdm-app': 3,
      'defensys-safe': 3,
      'safe-icb': 5,
      'aero-app': 5,
    });
  });

  it('adds up to the store summary: 35 shown of the 47 listed, 12 excluded for privacy', () => {
    const shown = Object.values(screenshotsByBrand).reduce((total, count) => total + count, 0);
    expect(shown).toBe(storeSummary.screenshots);
    expect(shown).toBe(35);
    expect(shown + storeExclusions.length).toBe(47);
  });

  it('is the count brand options hand to SourceToggle', () => {
    for (const option of brandOptions('citizen')) {
      expect(option.screenshots).toBe(screenshotsByBrand[option.id as CitizenBrand['id']]);
    }
  });
});

describe('summarizeShowcase', () => {
  it('splits a fixture wall by source and app', () => {
    const replica = (id: string, app: ShowcaseEntry['app']): ShowcaseEntry => {
      const figure = figures.find((candidate) => candidate.app === app);
      if (!figure) throw new Error(`no ${app} figure`);
      return { id, app, caseStudy: 'sme-panindio', label: id, source: 'replica', figure, screen: { kind: 'replica', figure: figure.id }, brand: null };
    };
    const listing = fixtureListing('1hope', 'play', 1);
    const image = listing.screenshots[0];
    if (!image) throw new Error('fixture has no screenshot');
    const real: ShowcaseEntry = {
      id: 'r1',
      app: 'citizen',
      caseStudy: 'defensys-citizen',
      label: 'r1',
      source: 'real',
      listing,
      position: 1,
      screen: { kind: 'image', image },
      brand: '1hope',
    };
    const summary = summarizeShowcase([replica('a', 'sme'), replica('b', 'sme'), replica('c', 'citizen'), real], apps);
    expect(summary).toEqual({
      total: 4,
      replica: 3,
      real: 1,
      byApp: { sme: { replica: 2, real: 0 }, citizen: { replica: 1, real: 1 }, responder: { replica: 0, real: 0 } },
    });
  });

  it('counts the real wall: 21 coded replicas and the 35 kept screenshots', () => {
    expect(showcaseSummary).toEqual({
      total: showcaseEntries.length,
      replica: figures.length,
      real: storeSummary.screenshots,
      byApp: {
        sme: { replica: 9, real: 0 },
        citizen: { replica: 6, real: 35 },
        responder: { replica: 6, real: 0 },
      },
    });
    expect(showcaseSummary.total).toBe(56);
    expect(showcaseSummary.real).toBe(storeListings.reduce((total, listing) => total + listing.screenshots.length, 0));
  });
});
