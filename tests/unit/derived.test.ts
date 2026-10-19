import { describe, expect, it } from 'vitest';
import { apps } from '@/content/apps/apps';
import { figures } from '@/content/apps/figures';
import { storeListings } from '@/content/apps/store';
import {
  adjacentCaseStudies,
  buildShowcaseEntries,
  caseStudyBySlug,
  defaultBrand,
  facetCounts,
  figureById,
  projectFacetCounts,
  resolveScreen,
  showcaseEntries,
  storeSummary,
  summarizeStore,
} from '@/content/derived';
import type { CitizenBrandId, InstallBand, Project, ScreenImage, StoreListing, StorePlatform } from '@/content/types';

// ─── Fixtures: the 8 verified listings (research store.json, as of 2026-10-19) ──────────

function screenshots(count: number, platform: StorePlatform): ScreenImage[] {
  return Array.from({ length: count }, (_, index): ScreenImage => ({
    src: `/store/citizen/fixture/${platform}-${index + 1}.webp`,
    width: platform === 'play' ? 500 : 828,
    height: platform === 'play' ? 1024 : 1799,
    alt: `Fixture screenshot ${index + 1}`,
    provenance: platform,
    presentation: 'marketing',
  }));
}

function listing(
  brand: CitizenBrandId,
  platform: StorePlatform,
  installs: InstallBand | null,
  rating: StoreListing['rating'],
  shots: number,
): StoreListing {
  return {
    id: `${brand}.${platform}`,
    brand,
    platform,
    name: brand,
    url: 'https://example.com/listing',
    publisher: 'Fixture',
    installs,
    rating,
    asOf: '2026-10-19',
    icon: { src: `/store/citizen/${brand}/${platform}-icon.webp`, width: 192, height: 192 },
    screenshots: screenshots(shots, platform),
  };
}

const VERIFIED_LISTINGS: readonly StoreListing[] = [
  listing('smile-safe-taytay', 'play', '5K+', { value: 4.2, count: 27 }, 5),
  listing('1hope', 'play', '1K+', { value: 5, count: 9 }, 8),
  listing('sjdm-app', 'play', '10+', null, 5),
  listing('defensys-safe', 'play', '10+', null, 5),
  listing('safe-icb', 'play', '0+', null, 5),
  listing('aero-app', 'play', '1+', null, 5),
  listing('smile-safe-taytay', 'appstore', null, { value: 4, count: 3 }, 5),
  listing('1hope', 'appstore', null, null, 9),
];

// ─── Store ───────────────────────────────────────────────────────────────────────────────

describe('summarizeStore', () => {
  it('derives "6 apps · 8 store listings (6 Google Play · 2 App Store)" and 47 screenshots', () => {
    const summary = summarizeStore(VERIFIED_LISTINGS, '2026-01-01');
    expect(summary).toMatchObject({ listings: 8, play: 6, appstore: 2, publicBrands: 6, screenshots: 47, asOf: '2026-10-19' });
  });

  it('headlines Smile SAFE Taytay: 5K+ installs and 4.2 from 27 ratings', () => {
    const summary = summarizeStore(VERIFIED_LISTINGS, '2026-01-01');
    expect(summary.topInstalls).toEqual({ listing: 'smile-safe-taytay.play', brand: 'smile-safe-taytay', installs: '5K+' });
    expect(summary.topRating).toEqual({ listing: 'smile-safe-taytay.play', brand: 'smile-safe-taytay', value: 4.2, count: 27 });
  });

  it('applies the display rules before choosing a headline', () => {
    const small = [listing('sjdm-app', 'play', '10+', { value: 5, count: 4 }, 5)];
    const summary = summarizeStore(small, '2026-10-19');
    expect(summary.topInstalls).toBeNull();
    expect(summary.topRating).toBeNull();
  });

  it('falls back to the site date with no listings', () => {
    expect(summarizeStore([], '2026-10-19')).toEqual({
      listings: 0,
      play: 0,
      appstore: 0,
      publicBrands: 0,
      screenshots: 0,
      topInstalls: null,
      topRating: null,
      asOf: '2026-10-19',
    });
  });

  it('is what the site uses', () => {
    expect(storeSummary).toEqual(summarizeStore(storeListings, storeSummary.asOf));
  });
});

// ─── Showcase ────────────────────────────────────────────────────────────────────────────

describe('showcase entries', () => {
  it('put every replica first within its app, then the real screenshots', () => {
    const entries = buildShowcaseEntries(figures, VERIFIED_LISTINGS, apps);
    expect(entries).toHaveLength(figures.length + 47);
    expect(entries.map((entry) => entry.app)).toEqual([
      ...Array<string>(9).fill('sme'),
      ...Array<string>(6 + 47).fill('citizen'),
      ...Array<string>(6).fill('responder'),
    ]);
    const citizen = entries.filter((entry) => entry.app === 'citizen');
    expect(citizen.slice(0, 6).every((entry) => entry.source === 'replica')).toBe(true);
    expect(citizen.slice(6).every((entry) => entry.source === 'real')).toBe(true);
  });

  it('label tiles with the FIG id or the listing position, and keep ids unique', () => {
    const entries = buildShowcaseEntries(figures, VERIFIED_LISTINGS, apps);
    expect(entries[0]?.label).toBe('FIG 1.1 Owner dashboard');
    const real = entries.find((entry) => entry.source === 'real');
    expect(real?.label).toBe('smile-safe-taytay · Google Play screenshot 1 of 5');
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });

  it('cover every figure on the site', () => {
    expect(showcaseEntries.filter((entry) => entry.source === 'replica')).toHaveLength(figures.length);
  });
});

// ─── Screens and brands ──────────────────────────────────────────────────────────────────

describe('resolveScreen', () => {
  it('fills in the default state and the app’s default brand', () => {
    const resolved = resolveScreen({ kind: 'replica', figure: '2.3' });
    expect(resolved).toMatchObject({ kind: 'replica', state: 'idle', brand: { id: 'smile-safe-taytay' } });
  });

  it('keeps an explicit state and brand', () => {
    expect(resolveScreen({ kind: 'replica', figure: '2.1', state: 'brief', brand: '1hope' })).toMatchObject({
      state: 'brief',
      brand: { id: '1hope' },
    });
  });

  it('gives SME and non-brandable screens no brand', () => {
    expect(resolveScreen({ kind: 'replica', figure: '1.1' })).toMatchObject({ brand: null });
    expect(resolveScreen({ kind: 'replica', figure: '2.4' })).toMatchObject({ brand: null });
    expect(resolveScreen({ kind: 'replica', figure: '3.1' })).toMatchObject({ brand: { id: 'defensys' } });
  });

  it('rejects unknown states and brands from another app', () => {
    expect(() => resolveScreen({ kind: 'replica', figure: '2.3', state: 'nope' })).toThrow(/no state/);
    expect(() => resolveScreen({ kind: 'replica', figure: '2.3', brand: 'sjdm' })).toThrow(/belongs to responder/);
  });

  it('passes images through, including device captures', () => {
    const image: ScreenImage = {
      src: '/device/sme/dashboard.webp',
      width: 1080,
      height: 2340,
      alt: 'Fixture device capture',
      provenance: 'device',
      presentation: 'raw',
    };
    expect(resolveScreen({ kind: 'image', image })).toEqual({ kind: 'image', image });
  });

  it('looks figures up by id', () => {
    expect(figureById.size).toBe(21);
    expect(figureById.get('3.3')?.title).toBe('Navigate to incident');
  });
});

describe('defaultBrand', () => {
  it('is Smile SAFE Taytay for Citizen and Defensys for Responder', () => {
    expect(defaultBrand('citizen').id).toBe('smile-safe-taytay');
    expect(defaultBrand('responder').id).toBe('defensys');
  });
});

// ─── Case studies ────────────────────────────────────────────────────────────────────────

describe('case-study navigation', () => {
  it('finds a case study by slug', () => {
    expect(caseStudyBySlug('defensys-citizen').app).toBe('citizen');
  });

  it('cycles SME → Citizen → Responder → SME', () => {
    expect(adjacentCaseStudies('sme-panindio')).toMatchObject({ prev: { slug: 'defensys-responder' }, next: { slug: 'defensys-citizen' } });
    expect(adjacentCaseStudies('defensys-responder')).toMatchObject({ prev: { slug: 'defensys-citizen' }, next: { slug: 'sme-panindio' } });
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────────────────

describe('facetCounts', () => {
  const base = {
    summary: 'x',
    role: 'x',
    ownership: 'sole',
    status: 'live',
    statusLabel: 'x',
    stack: [],
    icon: 'code',
    links: [],
  } as const;
  const list: readonly Project[] = [
    { ...base, slug: 'a', title: 'A', context: 'personal', types: ['mobile', 'ai'] },
    { ...base, slug: 'b', title: 'B', context: 'company', company: 'DGSI', types: ['web'] },
    { ...base, slug: 'c', title: 'C', context: 'client', company: 'Client', types: ['mobile'], example: true },
    { ...base, slug: 'd', title: 'D', context: 'personal', types: ['tooling'], hidden: true },
  ];

  it('counts visible projects per type and context', () => {
    expect(facetCounts(list, 'label')).toEqual({
      all: 3,
      mobile: 2,
      web: 1,
      ai: 1,
      tooling: 0,
      personal: 1,
      company: 1,
      client: 1,
    });
  });

  it('drops example projects in hide mode', () => {
    expect(facetCounts(list, 'hide')).toMatchObject({ all: 2, mobile: 1, client: 0 });
  });

  it('is what the site uses', () => {
    expect(projectFacetCounts.all).toBeGreaterThan(0);
  });
});
