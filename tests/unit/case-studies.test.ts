import { describe, expect, it } from 'vitest';
import { citizenBrands } from '@/content/apps/brands';
import { listingsForBrand, storeListings } from '@/content/apps/store';
import { caseStudies } from '@/content/case-studies';
import { defensysCitizen } from '@/content/case-studies/defensys-citizen';
import { defensysResponder } from '@/content/case-studies/defensys-responder';
import { smePanindio } from '@/content/case-studies/sme-panindio';
import { storeSummary } from '@/content/derived';
import { experience } from '@/content/experience';
import { projects } from '@/content/projects';
import type { CaseStudy, Challenge, Feature, FlowDiagram, FlowOwner, Metric } from '@/content/types';
import { formatRatingValue } from '@/lib/format';
import { isPlaceholder } from '@/lib/placeholder';

/**
 * Pins the case-study claims fixed by PLAN.md ("Binding corrections and guardrails") and
 * review.md §2 and §4, so a later edit cannot quietly bring an old claim back, and sweeps every
 * case-study string for the public-safety deny list. Structure (references, ids, figure states,
 * connectors = lanes − 1) lives in content.invariants.test.ts.
 */

const AS_OF = '2026-10-19';
const API_WORDING =
  'Integrates with the Command Center and API built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints';

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────

/** Every string in a value. Keys in `skip` are not descended into; shared objects are visited once. */
function stringsOf(value: unknown, skip: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  const seen = new Set<object>();
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (node === null || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [key, entry] of Object.entries(node)) if (!skip.has(key)) walk(entry);
  };
  walk(value);
  return out;
}

/** What the page can show: `confirm` notes are never rendered. */
const renderedStrings = (study: CaseStudy): string[] => stringsOf(study, new Set(['confirm']));

/** Keys that hold ids, enum values or references rather than prose. */
const ID_KEYS: ReadonlySet<string> = new Set([
  'id',
  'slug',
  'projectSlug',
  'app',
  'kind',
  'figure',
  'figures',
  'state',
  'brand',
  'glimpse',
  'heroStats',
  'sections',
  'owner',
  'rollout',
  'asOf',
]);

function metric(study: CaseStudy, id: string): Metric {
  const found = study.metrics.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`${study.slug} has no metric ${id}`);
  return found;
}

function diagram(study: CaseStudy, id: string): FlowDiagram {
  const found = study.architecture.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`${study.slug} has no diagram ${id}`);
  return found;
}

function feature(study: CaseStudy, id: string): Feature {
  const found = study.features.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`${study.slug} has no feature ${id}`);
  return found;
}

function challenge(study: CaseStudy, id: string): Challenge {
  const found = study.challenges.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`${study.slug} has no challenge ${id}`);
  return found;
}

function allDiagrams(study: CaseStudy): FlowDiagram[] {
  return [...study.architecture, ...study.specials.flatMap((special) => (special.kind === 'ai' ? [special.diagram] : []))];
}

function nodeOwners(flow: FlowDiagram): Record<string, FlowOwner> {
  return Object.fromEntries(flow.lanes.flatMap((lane) => lane.nodes.map((node) => [node.id, node.owner])));
}

/** Strings matching `pattern`, for readable failure output. */
function matching(strings: readonly string[], pattern: RegExp): string[] {
  return strings.filter((text) => pattern.test(text));
}

/** `it.each` rows: [slug, case study]. */
const studyRows = caseStudies.map((study): [string, CaseStudy] => [study.slug, study]);

// ─── Public safety ───────────────────────────────────────────────────────────────────────

describe('case studies are public-safe', () => {
  /** PLAN.md content-safety list, applied to every string including confirm notes. */
  const DENY: ReadonlyArray<readonly [string, RegExp]> = [
    ['a URL', /\bhttps?:\/\/|\bwww\./i],
    ['a host with a port', /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}:\d{2,5}\b|\blocalhost:\d/i],
    ['an IPv4 address', /\b\d{1,3}(?:\.\d{1,3}){3}\b/],
    ['an API path', /\/api\/|\/v\d+\//i],
    ['an Expo public env name', /EXPO_PUBLIC/i],
    ['a key, EAS project or Firebase id', /\bAIza[\w-]{8,}|projectId|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
    [
      'a rate limit',
      /\d[\d,.]*\s*(?:req(?:uest)?s?|calls?)?\s*(?:\/|per)\s*(?:s|secs?|seconds?|min|mins|minutes?|h|hours?|days?)\b/i,
    ],
    ['a secret or header name', /secret|\bbearer\b|\bauthorization\b|\bX-[A-Za-z]+-[A-Za-z-]+/i],
    ['a package id', /\bcom\.[a-z0-9_]+\.[a-z0-9_.]+/i],
    ['the config name "OneHope"', /one\s*hope/i],
    ['an email address', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
    ['a PH mobile number', /(?:\+63|\b0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/],
    ['an unpublished brand', /antipolo|demo\s+(?:defensys|responder|safe|app)/i],
  ];

  it.each(studyRows)('%s has no deny-listed strings', (_slug, study) => {
    const strings = stringsOf(study);
    expect(strings.length).toBeGreaterThan(50);
    const offenders = DENY.flatMap(([what, pattern]) => matching(strings, pattern).map((text) => `${what}: ${text}`));
    expect(offenders).toEqual([]);
  });

  it('mentions "demo" only as the Responder demo build', () => {
    const offenders = caseStudies.flatMap((study) =>
      stringsOf(study).filter((text) => text.replace(/\bdemo build\b/gi, '').match(/demo/i)),
    );
    expect(offenders).toEqual([]);
  });

  it('spells the store names exactly as published', () => {
    const names: ReadonlyArray<readonly [string, RegExp]> = [
      ['Smile SAFE Taytay', /smile\s*safe\s*taytay/gi],
      ['1Hope', /\b1\s*hope\b/gi],
      ['SJDM App', /\bsjdm\s*app\b/gi],
      ['Defensys SAFE', /\bdefensys\s*safe\b/gi],
      ['SAFE ICB', /\bsafe\s*icb\b/gi],
      ['AERO App', /\baero\s*app\b/gi],
    ];
    const misspelled = caseStudies.flatMap((study) =>
      stringsOf(study, ID_KEYS).flatMap((text) =>
        names.flatMap(([exact, pattern]) => [...text.matchAll(pattern)].map((match) => match[0]).filter((found) => found !== exact)),
      ),
    );
    expect(misspelled).toEqual([]);
  });
});

// ─── Shared template rules ───────────────────────────────────────────────────────────────

describe('every case study', () => {
  it.each(studyRows)('%s: dated, sourced numbers and its own hero glimpse', (slug, study) => {
    for (const entry of study.metrics) {
      expect(entry.asOf, `${slug} ${entry.id}`).toBe(AS_OF);
      expect(entry.source.trim(), `${slug} ${entry.id}`).not.toBe('');
      expect(entry.value.trim(), `${slug} ${entry.id}`).not.toBe('');
    }
    expect(new Set(study.heroStats).size).toBe(3);
    expect(study.hero.glimpse).toBe(`hero.${slug}`);
  });

  it('lists its sections in page order, with #ai for SME and #brands for the Defensys apps', () => {
    const base = ['overview', 'problem', 'built', 'screens', 'architecture', 'challenges', 'numbers', 'next'];
    const withSpecial = (special: 'ai' | 'brands') => [...base.slice(0, 3), special, ...base.slice(3)];
    expect(smePanindio.sections).toEqual(withSpecial('ai'));
    expect(defensysCitizen.sections).toEqual(withSpecial('brands'));
    expect(defensysResponder.sections).toEqual(withSpecial('brands'));
  });

  it('shows each feature as a static row with its own phone', () => {
    for (const study of caseStudies) {
      expect(study.features.length, study.slug).toBeGreaterThanOrEqual(5);
      for (const feature of study.features) {
        expect(feature.screen.kind, `${study.slug} ${feature.id}`).toBe('replica');
        expect(feature.body.trim(), `${study.slug} ${feature.id}`).not.toBe('');
      }
    }
  });

  it('credits the Defensys API and the Command Center to the DGSI team in every diagram', () => {
    const teamOwned = /Defensys API|Command Center/;
    const problems = caseStudies.flatMap((study) =>
      allDiagrams(study).flatMap((flow) => [
        ...flow.lanes.filter((lane) => teamOwned.test(lane.title) && lane.owner !== 'team').map((lane) => `${flow.id} lane ${lane.id}`),
        ...flow.lanes.flatMap((lane) =>
          lane.nodes.filter((node) => teamOwned.test(node.label) && node.owner !== 'team').map((node) => `${flow.id} node ${node.id}`),
        ),
      ]),
    );
    expect(problems).toEqual([]);
  });
});

// ─── SME Panindio ────────────────────────────────────────────────────────────────────────

describe('SME Panindio', () => {
  const rendered = renderedStrings(smePanindio);

  it('is a personal product in private beta, with no store links', () => {
    expect(smePanindio.eyebrow).toEqual(['Personal product', 'Private beta']);
    expect(smePanindio.glance.status).toContain('Private beta');
    expect(smePanindio.glance.links.filter((link) => link.kind === 'store' || link.kind === 'store-page')).toEqual([]);
    expect(matching(rendered, /Google Play|App Store/)).toEqual([]);
  });

  it('states the git timeline as the Projects card and the About timeline do, and keeps the code link a placeholder', () => {
    // One fact, one wording: the timeline comes from git (first commit Dec 2025) and is confirm-flagged.
    expect(smePanindio.glance.timeline).toBe('Dec 2025 – present');
    expect(projects.find((project) => project.slug === 'sme-panindio')?.period).toBe(smePanindio.glance.timeline);
    expect(experience.find((entry) => entry.id === 'sme-panindio')?.period).toBe(smePanindio.glance.timeline);
    expect(smePanindio.confirm).toMatch(/timeline/);
    const repo = smePanindio.glance.links.find((link) => link.kind === 'repo');
    expect(repo?.kind === 'repo' && isPlaceholder(repo.href)).toBe(true);
  });

  it('draws a public-safe AI pipeline: phone → server → AI service (all mine) → external providers', () => {
    const ai = smePanindio.specials.find((special) => special.kind === 'ai');
    if (ai?.kind !== 'ai') throw new Error('SME has no #ai section');
    expect(ai.figures).toEqual(['1.6', '1.7', '1.8']);
    expect(ai.diagram.lanes.map((lane) => lane.owner)).toEqual(['me', 'me', 'me', 'external']);
    const providers = ai.diagram.lanes.at(-1)?.nodes ?? [];
    expect(providers.map((node) => [node.label, node.owner, node.faded === true])).toEqual([
      ['Google Gemini', 'external', false],
      ['Open-weights fallback via Ollama', 'external', false],
      ['OpenAI · Anthropic · OpenRouter', 'external', true],
    ]);
    expect(providers[0]?.detail).toMatch(/primary/i);
    expect(ai.diagram.connectors.map((connector) => connector.label)).toContain('Private, authenticated link');
  });

  it('flags the Ollama wording for confirmation and never implies employer infrastructure', () => {
    expect(smePanindio.confirm).toContain('open-weights fallback via Ollama');
    expect(matching(rendered, /self-hosted|company-hosted|\bcompany\b|employer|\bDGSI\b|Dynamic Global|Defensys|Qwen/i)).toEqual([]);
  });
});

// ─── Defensys Citizen ────────────────────────────────────────────────────────────────────

describe('Defensys Citizen', () => {
  const rendered = renderedStrings(defensysCitizen);

  it('uses the placeholder role and timeline and the exact Command Center and API wording', () => {
    expect(isPlaceholder(defensysCitizen.glance.role[0] ?? '')).toBe(true);
    expect(defensysCitizen.glance.role).toContain(API_WORDING);
    expect(isPlaceholder(defensysCitizen.glance.timeline)).toBe(true);
  });

  it('leaves out the deep-link tenant story', () => {
    expect(matching(rendered, /deep[\s-]?link|tenant|url scheme|auto-?login|demo login/i)).toEqual([]);
  });

  it('tells the store-review challenge generically: no LGU and no rejection code', () => {
    const review = defensysCitizen.challenges.filter((challenge) => /store review/i.test(stringsOf(challenge).join(' ')));
    expect(review).toHaveLength(1);
    const text = stringsOf(review).join(' ');
    expect(text).not.toMatch(/Taytay|Pag-asa|San Jose|SJDM|Isabela|Abra|Basilan|Rizal|Quezon|Bulacan|Mindoro|1Hope|Smile|AERO|ICB/i);
    expect(stringsOf(defensysCitizen).join(' ')).not.toMatch(/2\.1\s*\(a\)|reject/i);
  });

  it('links the default brand’s store listings as text links (no badges), and nothing else', () => {
    expect(defensysCitizen.glance.links).toEqual([
      { kind: 'store', listing: 'smile-safe-taytay.play' },
      { kind: 'store', listing: 'smile-safe-taytay.appstore' },
    ]);
    expect(citizenBrands.find((brand) => brand.isDefault)?.id).toBe('smile-safe-taytay');
  });

  it('never calls Citizen Web shipped or live, and keeps room video conferencing out', () => {
    expect(matching(rendered, /Citizen Web/).filter((text) => /shipped|\blive\b|launched/i.test(text))).toEqual([]);
    expect(defensysCitizen.confirm).toMatch(/Citizen Web/);
    expect(matching(rendered, /conferenc/i)).toEqual([]);
  });

  it('states the verified store facts as facts about the app (as of Oct 19, 2026)', () => {
    expect(metric(defensysCitizen, 'store-listings').value).toBe('6 + 2');
    expect(metric(defensysCitizen, 'taytay-installs').value).toBe('5K+');
    const rating = metric(defensysCitizen, 'taytay-rating');
    expect(rating.value).toBe('4.2');
    expect(rating.label).toContain('from 27 ratings');
    expect(defensysCitizen.glance.status.slice(0, 2)).toEqual(['6 on Google Play', '2 on the App Store']);
    expect(defensysCitizen.factLine).toContain('March 27, 2025');
    for (const id of ['store-listings', 'taytay-installs', 'taytay-rating']) {
      const entry = metric(defensysCitizen, id);
      expect(`${entry.label} ${entry.source}`, id).not.toMatch(/\b(I|my|me|mine)\b/);
    }
    expect(defensysCitizen.factLine).not.toMatch(/\b(I|my|me|mine)\b/);
    for (const id of ['taytay-installs', 'taytay-rating']) expect(metric(defensysCitizen, id).confirm, id).toMatch(/v1/);
  });
});

// ─── Defensys Responder ──────────────────────────────────────────────────────────────────

describe('Defensys Responder', () => {
  const rendered = renderedStrings(defensysResponder);

  it('uses the placeholder role and timeline and the exact Command Center and API wording', () => {
    expect(isPlaceholder(defensysResponder.glance.role[0] ?? '')).toBe(true);
    expect(defensysResponder.glance.role).toContain(API_WORDING);
    expect(isPlaceholder(defensysResponder.glance.timeline)).toBe(true);
  });

  it('counts 4 brands plus a demo build, never 5', () => {
    const brands = metric(defensysResponder, 'brands');
    expect(brands.value).toBe('4');
    expect(brands.label).toMatch(/demo build/);
    expect(matching(rendered, /\b(5|five) brands\b/i)).toEqual([]);
  });

  it('is privately distributed, with no store links', () => {
    expect(defensysResponder.eyebrow).toContain('Private distribution');
    expect(defensysResponder.glance.status[0]).toBe('Private distribution');
    expect(defensysResponder.glance.links.filter((link) => link.kind === 'store' || link.kind === 'store-page')).toEqual([]);
    expect(matching(rendered, /Google Play|App Store/)).toEqual([]);
  });

  it('labels Channels "in rollout" and facility referral "in progress"', () => {
    const channels = defensysResponder.features.find((feature) => feature.id === 'channels');
    expect(channels?.rollout).toBe('in-rollout');
    expect(channels?.body).toMatch(/in rollout/);
    expect(defensysResponder.features.find((feature) => feature.id === 'facility-referral')?.rollout).toBe('in-progress');
  });

  it('flags the v1.4.0 → v2.5.17 upgrade fact line for confirmation', () => {
    expect(defensysResponder.factLine).toMatch(/v1\.4\.0.*v2\.5\.17/);
    expect(defensysResponder.confirm).toMatch(/v1\.4\.0.*v2\.5\.17/);
  });

  it('reuses the shared ecosystem diagram, with the platform credited to the team', () => {
    const ecosystem = diagram(defensysResponder, 'defensys-ecosystem');
    expect(ecosystem).toBe(diagram(defensysCitizen, 'defensys-ecosystem'));
    expect(nodeOwners(ecosystem)).toEqual({
      'citizen-app': 'me',
      'citizen-web': 'me',
      api: 'team',
      'command-center': 'team',
      'responder-app': 'me',
      'ptt-hardware': 'prototype',
    });
  });
});

// ─── Store consistency (activates once store-listings.json holds the listings) ─────────────

describe.skipIf(storeListings.length === 0)('Citizen store facts match the store data', () => {
  it('counts the listings per store', () => {
    expect(metric(defensysCitizen, 'store-listings').value).toBe(`${storeSummary.play} + ${storeSummary.appstore}`);
    expect(defensysCitizen.glance.status).toContain(`${storeSummary.play} on Google Play`);
    expect(defensysCitizen.glance.status).toContain(`${storeSummary.appstore} on the App Store`);
    expect(storeSummary.publicBrands).toBe(6);
  });

  it('uses the top install band and the most-reviewed rating, both Smile SAFE Taytay', () => {
    expect(storeSummary.topInstalls?.brand).toBe('smile-safe-taytay');
    expect(metric(defensysCitizen, 'taytay-installs').value).toBe(storeSummary.topInstalls?.installs);
    const top = storeSummary.topRating;
    expect(top?.brand).toBe('smile-safe-taytay');
    expect(metric(defensysCitizen, 'taytay-rating').value).toBe(top ? formatRatingValue(top.value) : null);
    expect(metric(defensysCitizen, 'taytay-rating').label).toContain(`from ${top?.count ?? 0} ratings`);
  });

  it('dates the store metrics with the store data', () => {
    for (const id of ['store-listings', 'taytay-installs', 'taytay-rating']) {
      expect(metric(defensysCitizen, id).asOf, id).toBe(storeSummary.asOf);
    }
  });

  it('links exactly the default brand’s listings, Google Play first', () => {
    const listings = listingsForBrand('smile-safe-taytay').map((listing) => ({ kind: 'store', listing: listing.id }));
    expect(listings.length).toBeGreaterThan(0);
    expect(defensysCitizen.glance.links).toEqual(listings);
  });
});

// ─── Audited claims (A-W1): each was traced to the research and corrected; keep it that way ──

describe('audited case-study claims stay fixed (A-W1)', () => {
  it('Citizen: the Taytay launch predates the white-label codebase, so it is never framed as its result', () => {
    expect(defensysCitizen.factLine).toMatch(/March 27, 2025.*before .*white-label codebase/);
  });

  it('Citizen: the server-side dispatch queue is the DGSI team’s; the app side is mine', () => {
    const queue = challenge(defensysCitizen, 'dispatch-queue');
    expect(queue.title).not.toMatch(/server-side/i);
    expect(queue.did).toMatch(/dispatcher queue that runs in the DGSI team's API/);
  });

  it('Citizen: the release pipeline does not claim every public brand ships through it', () => {
    const pipeline = diagram(defensysCitizen, 'citizen-white-label');
    expect(stringsOf(pipeline).filter((text) => /every (?:public )?brand/i.test(text))).toEqual([]);
    expect(pipeline.sideNote).toMatch(/^Four brands are wired to these release workflows so far\./);
    expect(defensysCitizen.gaps.join(' ')).toMatch(/SAFE ICB and AERO App[^.]*release workflows are not wired up yet/);
  });

  it('Citizen: the safety brief is bilingual, the app is not claimed to be', () => {
    expect(matching(defensysCitizen.problem.constraints, /English|Filipino|Tagalog|bilingual/i)).toEqual([]);
    expect(feature(defensysCitizen, 'safety-brief').body).toMatch(/bilingual safety brief \(English and Filipino\)/);
  });

  it('Responder: the Taytay fact line says what the build can do, not that the rollout happened', () => {
    expect(defensysResponder.factLine).toMatch(/\bcan update\b/);
    expect(defensysResponder.factLine).not.toMatch(/\bupgraded\b/i);
    expect(defensysResponder.confirm).toMatch(/actually been replaced in place/);
  });

  it('Responder: six channels share five bundled sounds, so no claim of one sound per channel', () => {
    expect(metric(defensysResponder, 'notification-channels').label).toMatch(/5 bundled alert sounds/);
    expect(matching(renderedStrings(defensysResponder), /each with its own (?:bundled )?sound/i)).toEqual([]);
  });

  it('Responder: voice-note transcription is credited to the server, not the app', () => {
    expect(feature(defensysResponder, 'channels').body).toMatch(/which the server transcribes/);
  });

  it('SME: only the POS and the books are claimed to work fully offline', () => {
    expect(matching(renderedStrings(smePanindio), /owner side works fully offline/i)).toEqual([]);
  });
});
