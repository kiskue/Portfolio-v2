import { describe, expect, it } from 'vitest';
import { citizenBrands } from '@/content/apps/brands';
import { storeListings } from '@/content/apps/store';
import { caseStudies } from '@/content/case-studies';
import { defensysCitizen } from '@/content/case-studies/defensys-citizen';
import {
  buildBrandStoreFacts,
  caseStudyGlanceStatus,
  caseStudyMetrics,
  citizenStoreFacts,
  resolveCaseStudyMetrics,
  resolveGlanceStatus,
  STORE_BACKED_METRICS,
  storeSummary,
  summarizeStore,
} from '@/content/derived';
import type { CaseStudy, CitizenBrandId, InstallBand, ScreenImage, StoreListing, StorePlatform } from '@/content/types';

/*
 * W9 additions to src/content/derived.ts: the case-study store figures (listing counts, installs,
 * ratings) are computed from the store data, never restated by hand (audit S3.M5, S5.05). The
 * builders are tested with fixtures; the exports are tested against the real content, which keeps
 * the same figures as readable text.
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────────────────

function shots(count: number, platform: StorePlatform): ScreenImage[] {
  return Array.from({ length: count }, (_, index): ScreenImage => ({
    src: `/store/citizen/fixture/${platform}-${index + 1}.webp`,
    width: 500,
    height: 1024,
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
  name: string = brand,
): StoreListing {
  return {
    id: `${brand}.${platform}`,
    brand,
    platform,
    name,
    url: `https://example.com/${brand}/${platform}`,
    publisher: 'Fixture',
    installs,
    rating,
    asOf: '2026-10-19',
    icon: { src: `/store/citizen/${brand}/${platform}-icon.webp`, width: 192, height: 192 },
    screenshots: shots(1, platform),
  };
}

const FIXTURE_LISTINGS: readonly StoreListing[] = [
  listing('smile-safe-taytay', 'appstore', null, { value: 4, count: 3 }, 'Smile SAFE Taytay'),
  listing('smile-safe-taytay', 'play', '5K+', { value: 4.2, count: 27 }, 'Smile SAFE Taytay'),
  listing('1hope', 'play', '1K+', { value: 5, count: 9 }, '1Hope'),
  listing('sjdm-app', 'play', '10+', null, 'SJDM App'),
];

/** A Citizen-shaped case study whose store metrics carry stale hand-written text. */
const STALE: CaseStudy = {
  ...defensysCitizen,
  metrics: defensysCitizen.metrics.map((metric) =>
    metric.id in (STORE_BACKED_METRICS['defensys-citizen'] ?? {}) ? { ...metric, value: '0', label: 'stale label' } : metric,
  ),
};

function metric<T extends { readonly id: string }>(list: readonly T[], id: string): T | undefined {
  return list.find((candidate) => candidate.id === id);
}

// ─── resolveCaseStudyMetrics ─────────────────────────────────────────────────────────────

describe('resolveCaseStudyMetrics', () => {
  const summary = summarizeStore(FIXTURE_LISTINGS, '2026-10-19');
  const resolved = resolveCaseStudyMetrics(STALE, FIXTURE_LISTINGS, summary);

  it('computes the listing count from the store summary, whatever the content says', () => {
    expect(metric(resolved, 'store-listings')).toMatchObject({ value: `${summary.play} + ${summary.appstore}`, store: true });
    expect(summary).toMatchObject({ play: 3, appstore: 1 });
  });

  it('computes installs and rating (value and the numbers in the label) from the named listing', () => {
    expect(metric(resolved, 'taytay-installs')).toMatchObject({
      value: '5K+',
      label: 'Google Play installs of Smile SAFE Taytay',
      store: true,
    });
    expect(metric(resolved, 'taytay-rating')).toMatchObject({
      value: '4.2',
      label: 'Google Play rating of Smile SAFE Taytay, from 27 ratings',
      store: true,
    });
  });

  it('keeps every other metric as written, in content order', () => {
    expect(resolved.map((entry) => entry.id)).toEqual(STALE.metrics.map((entry) => entry.id));
    for (const entry of resolved.filter((candidate) => !candidate.store)) {
      expect(entry).toEqual({ ...STALE.metrics.find((candidate) => candidate.id === entry.id), store: false });
    }
  });

  it('leaves out a store figure that fails its display rule or whose listing is gone', () => {
    const small = [listing('smile-safe-taytay', 'play', '500+', { value: 4.2, count: 4 })];
    const dropped = resolveCaseStudyMetrics(STALE, small, summarizeStore(small, '2026-10-19'));
    expect(metric(dropped, 'taytay-installs')).toBeUndefined();
    expect(metric(dropped, 'taytay-rating')).toBeUndefined();
    expect(metric(resolveCaseStudyMetrics(STALE, [], summarizeStore([], '2026-10-19')), 'taytay-installs')).toBeUndefined();
    expect(metric(dropped, 'store-listings')).toMatchObject({ value: '1 + 0' });
  });

  it('marks nothing as a store figure in the case studies without store data', () => {
    for (const study of caseStudies.filter((candidate) => candidate.slug !== 'defensys-citizen')) {
      expect(resolveCaseStudyMetrics(study, FIXTURE_LISTINGS, summary).filter((entry) => entry.store), study.slug).toEqual([]);
    }
  });
});

// ─── resolveGlanceStatus ─────────────────────────────────────────────────────────────────

describe('resolveGlanceStatus', () => {
  it('recomputes each listing-count segment and keeps the rest', () => {
    const summary = summarizeStore(FIXTURE_LISTINGS, '2026-10-19');
    expect(resolveGlanceStatus(['9 on Google Play', '9 on the App Store', 'Published under LGU accounts'], summary)).toEqual([
      '3 on Google Play',
      '1 on the App Store',
      'Published under LGU accounts',
    ]);
    expect(resolveGlanceStatus(['Private beta', 'not on public stores yet'], summary)).toEqual(['Private beta', 'not on public stores yet']);
  });
});

// ─── buildBrandStoreFacts ────────────────────────────────────────────────────────────────

describe('buildBrandStoreFacts', () => {
  const facts = buildBrandStoreFacts(citizenBrands, FIXTURE_LISTINGS);

  it('lists every brand in brand order, with Google Play before the App Store', () => {
    expect(facts.map((entry) => entry.brand.id)).toEqual(citizenBrands.map((brand) => brand.id));
    expect(facts[0]?.listings.map((entry) => entry.listing.platform)).toEqual(['play', 'appstore']);
  });

  it('keeps only the installs and ratings that pass the display rules', () => {
    const taytay = facts[0]?.listings ?? [];
    expect(taytay[0]).toMatchObject({ installs: '5K+', rating: { value: 4.2, count: 27 } });
    // App Store: 3 ratings, under the 5-rating rule; no install band at all.
    expect(taytay[1]).toMatchObject({ installs: null, rating: null });
    const sjdm = facts.find((entry) => entry.brand.id === 'sjdm-app')?.listings[0];
    expect(sjdm).toMatchObject({ installs: null, rating: null });
    expect(facts.find((entry) => entry.brand.id === 'aero-app')?.listings).toEqual([]);
  });
});

// ─── The site's values ───────────────────────────────────────────────────────────────────

describe('the site’s case-study store figures', () => {
  it('map only to metrics that exist in their case study', () => {
    for (const [slug, facts] of Object.entries(STORE_BACKED_METRICS)) {
      const study = caseStudies.find((candidate) => candidate.slug === slug);
      expect(study, slug).toBeDefined();
      for (const id of Object.keys(facts ?? {})) expect(metric(study?.metrics ?? [], id), `${slug} ${id}`).toBeDefined();
    }
  });

  it('match the figures the Citizen content states in words (as of the store data)', () => {
    const rendered = caseStudyMetrics(defensysCitizen);
    for (const entry of rendered.filter((candidate) => candidate.store)) {
      const written = metric(defensysCitizen.metrics, entry.id);
      expect(entry.value, entry.id).toBe(written?.value);
      expect(entry.label, entry.id).toBe(written?.label);
      expect(entry.asOf, entry.id).toBe(storeSummary.asOf);
    }
    expect(rendered.filter((candidate) => candidate.store).map((entry) => entry.id)).toEqual(['store-listings', 'taytay-installs', 'taytay-rating']);
  });

  it('keeps the hero stats resolvable after the store figures are computed', () => {
    for (const study of caseStudies) {
      const ids = new Set(caseStudyMetrics(study).map((entry) => entry.id));
      for (const stat of study.heroStats) expect(ids.has(stat), `${study.slug} ${stat}`).toBe(true);
    }
  });

  it('computes the Citizen At a glance listing counts and leaves the other studies as written', () => {
    const status = caseStudyGlanceStatus(defensysCitizen);
    expect(status.slice(0, 2)).toEqual([`${storeSummary.play} on Google Play`, `${storeSummary.appstore} on the App Store`]);
    expect(status).toEqual(defensysCitizen.glance.status);
    for (const study of caseStudies) expect(caseStudyGlanceStatus(study).length, study.slug).toBe(study.glance.status.length);
  });

  it('gives each of the six public brands its listings from the store data', () => {
    expect(citizenStoreFacts.map((entry) => entry.brand.id)).toEqual(citizenBrands.map((brand) => brand.id));
    const total = citizenStoreFacts.reduce((sum, entry) => sum + entry.listings.length, 0);
    expect(total).toBe(storeSummary.listings);
    expect(total).toBe(storeListings.length);
    const shown = citizenStoreFacts.flatMap((entry) => entry.listings).filter((entry) => entry.installs !== null || entry.rating !== null);
    // Only Smile SAFE Taytay (5K+, 4.2 from 27) and 1Hope (1K+, 5.0 from 9) on Google Play pass the rules.
    expect(shown.map((entry) => entry.listing.id)).toEqual(['smile-safe-taytay.play', '1hope.play']);
  });
});
