import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { aiBuilds } from '@/content/ai-builds';
import { apps } from '@/content/apps/apps';
import { brands, citizenBrands, responderBrands } from '@/content/apps/brands';
import { figures, type FigureState } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import { storeListings } from '@/content/apps/store';
import { caseStudies } from '@/content/case-studies';
import { credentials } from '@/content/credentials';
import { experience } from '@/content/experience';
import { faqs } from '@/content/faqs';
import { projects } from '@/content/projects';
import { services } from '@/content/services';
import { site } from '@/content/site';
import { skills } from '@/content/skills';
import { testimonials } from '@/content/testimonials';
import { tools } from '@/content/tools';
import {
  APP_IDS,
  CASE_STUDY_SECTION_KEYS,
  CASE_STUDY_SLUGS,
  type CaseStudy,
  type FigureId,
  type FlowDiagram,
  type GlimpseId,
  type ProjectLink,
  type ScreenSource,
} from '@/content/types';
import { isISODate } from '@/lib/format';
import { hasToken, isPlaceholder } from '@/lib/placeholder';

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => (seen.has(value) ? true : (seen.add(value), false)));
}

const figureIds = new Set<string>(figures.map((figure) => figure.id));
const figureStates = new Map<string, readonly string[]>(figures.map((figure) => [figure.id, figure.states]));
const figureApp = new Map<string, string>(figures.map((figure) => [figure.id, figure.app]));
const figureBrandable = new Map<string, boolean>(figures.map((figure) => [figure.id, figure.brandable]));
const brandApp = new Map<string, string>(brands.map((brand) => [brand.id, brand.app]));
const projectSlugs = new Set(projects.map((project) => project.slug));
const caseStudyBySlug = new Map<string, CaseStudy>(caseStudies.map((study) => [study.slug, study]));
const glimpseById = new Map<string, (typeof glimpses)[number]>(glimpses.map((glimpse) => [glimpse.id, glimpse]));
const listingIds = new Set<string>(storeListings.map((listing) => listing.id));

/** Problems with one screen reference; an empty list means it resolves. */
function screenProblems(source: ScreenSource, where: string): string[] {
  if (source.kind === 'image') return source.image.alt.trim() === '' ? [`${where}: image without alt text`] : [];
  const problems: string[] = [];
  if (!figureIds.has(source.figure)) return [`${where}: unknown figure ${source.figure}`];
  if (source.state !== undefined && !figureStates.get(source.figure)?.includes(source.state)) {
    problems.push(`${where}: figure ${source.figure} has no state "${source.state}"`);
  }
  if (source.brand !== undefined) {
    if (!brandApp.has(source.brand)) problems.push(`${where}: unknown brand ${source.brand}`);
    else if (brandApp.get(source.brand) !== figureApp.get(source.figure)) {
      problems.push(`${where}: brand ${source.brand} is not a ${String(figureApp.get(source.figure))} brand`);
    }
    if (figureBrandable.get(source.figure) === false) problems.push(`${where}: figure ${source.figure} is not brandable`);
  }
  return problems;
}

function linkProblems(link: ProjectLink, where: string): string[] {
  if (link.kind === 'case-study' && !caseStudyBySlug.has(link.slug)) return [`${where}: unknown case study ${link.slug}`];
  if (link.kind === 'store' && !listingIds.has(link.listing)) return [`${where}: unknown store listing ${link.listing}`];
  return [];
}

function diagramsOf(study: CaseStudy): FlowDiagram[] {
  return [...study.architecture, ...study.specials.flatMap((special) => (special.kind === 'ai' ? [special.diagram] : []))];
}

/** Every string in a value, with a readable path. Functions are skipped; shared objects visited once. */
function collectStrings(value: unknown, path: string, out: Array<readonly [string, string]>, seen: Set<object>): void {
  if (typeof value === 'string') {
    out.push([path, value]);
    return;
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, entry] of value) collectStrings(entry, `${path}[${String(key)}]`, out, seen);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStrings(entry, `${path}[${index}]`, out, seen));
  } else {
    for (const [key, entry] of Object.entries(value)) collectStrings(entry, `${path}.${key}`, out, seen);
  }
}

/** Every .ts module under src/content, so content added later is covered automatically. */
function contentModulePaths(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return contentModulePaths(`${dir}/${entry.name}`, `${prefix}${entry.name}/`);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [`${prefix}${entry.name.slice(0, -3)}`] : [];
  });
}

// ─── Placeholders ────────────────────────────────────────────────────────────────────────

describe('placeholder tokens are whole fields', () => {
  const strings: Array<readonly [string, string]> = [];

  beforeAll(async () => {
    const root = fileURLToPath(new URL('../../src/content/', import.meta.url));
    const seen = new Set<object>();
    for (const modulePath of contentModulePaths(root)) {
      const loaded: Record<string, unknown> = await import(/* @vite-ignore */ `@/content/${modulePath}`);
      for (const [name, value] of Object.entries(loaded)) collectStrings(value, `${modulePath}:${name}`, strings, seen);
    }
  });

  it('walks every content module', () => {
    expect(strings.length).toBeGreaterThan(100);
  });

  it('no string contains "[[" or "]]" unless the whole string is one token', () => {
    const offenders = strings.filter(([, value]) => hasToken(value) && !isPlaceholder(value)).map(([path, value]) => `${path} = ${value}`);
    expect(offenders).toEqual([]);
  });
});

// ─── Ids ─────────────────────────────────────────────────────────────────────────────────

describe('ids and slugs are unique', () => {
  it.each<[string, readonly string[]]>([
    ['figure ids', figures.map((figure) => figure.id)],
    ['figure research keys', figures.map((figure) => figure.key)],
    ['brand ids', brands.map((brand) => brand.id)],
    ['app ids', apps.map((app) => app.id)],
    ['project slugs', projects.map((project) => project.slug)],
    ['case-study slugs', caseStudies.map((study) => study.slug)],
    ['glimpse ids', glimpses.map((glimpse) => glimpse.id)],
    ['store listing ids', storeListings.map((listing) => listing.id)],
    ['service ids', services.map((service) => service.id)],
    ['tool ids', tools.map((tool) => tool.id)],
    ['testimonial ids', testimonials.map((testimonial) => testimonial.id)],
    ['credential ids', credentials.map((credential) => credential.id)],
    ['FAQ ids', faqs.map((faq) => faq.id)],
    ['AI build ids', aiBuilds.map((build) => build.id)],
    ['experience ids', experience.map((entry) => entry.id)],
    ['skill tiers', skills.map((tier) => tier.depth)],
    ['nav ids', site.nav.map((item) => item.id)],
    ['nav hrefs', site.nav.map((item) => String(item.href))],
  ])('%s', (_label, values) => {
    expect(duplicates(values)).toEqual([]);
  });

  it('within each case study (metrics, features, challenges, diagrams, lanes, nodes)', () => {
    for (const study of caseStudies) {
      const diagrams = diagramsOf(study);
      expect(duplicates(study.metrics.map((metric) => metric.id)), study.slug).toEqual([]);
      expect(duplicates(study.features.map((feature) => feature.id)), study.slug).toEqual([]);
      expect(duplicates(study.challenges.map((challenge) => challenge.id)), study.slug).toEqual([]);
      expect(duplicates(diagrams.map((diagram) => diagram.id)), study.slug).toEqual([]);
      for (const diagram of diagrams) {
        expect(duplicates(diagram.lanes.map((lane) => lane.id)), diagram.id).toEqual([]);
        expect(duplicates(diagram.lanes.flatMap((lane) => lane.nodes.map((node) => node.id))), diagram.id).toEqual([]);
      }
    }
  });
});

// ─── References ──────────────────────────────────────────────────────────────────────────

describe('every reference resolves', () => {
  it('case studies: the three slugs in cyclic order, with their project, app, glimpse and hero stats', () => {
    expect(caseStudies.map((study) => study.slug)).toEqual([...CASE_STUDY_SLUGS]);
    for (const study of caseStudies) {
      const project = projects.find((candidate) => candidate.slug === study.projectSlug);
      expect(project?.caseStudy, `${study.slug} projectSlug`).toBe(study.slug);
      expect(apps.find((app) => app.id === study.app)?.caseStudy, `${study.slug} app`).toBe(study.slug);
      const glimpse = glimpseById.get(study.hero.glimpse);
      expect(glimpse?.app, `${study.slug} hero glimpse ${study.hero.glimpse}`).toBe(study.app);
      const metricIds = new Set(study.metrics.map((metric) => metric.id));
      for (const stat of study.heroStats) expect(metricIds.has(stat), `${study.slug} hero stat ${stat}`).toBe(true);
    }
  });

  it('screens: figures, states and brands in case studies resolve', () => {
    const problems = caseStudies.flatMap((study) => [
      ...study.hero.flanks.flatMap((source, index) => screenProblems(source, `${study.slug} hero flank ${index}`)),
      ...study.features.flatMap((feature) => screenProblems(feature.screen, `${study.slug} feature ${feature.id}`)),
      ...study.screens.flatMap((source, index) => screenProblems(source, `${study.slug} screens[${index}]`)),
      ...study.specials.flatMap((special) =>
        special.kind === 'ai'
          ? special.figures.flatMap((figure) => (figureIds.has(figure) ? [] : [`${study.slug} #ai: unknown figure ${figure}`]))
          : special.app === study.app
            ? []
            : [`${study.slug} #brands: app ${special.app}`],
      ),
    ]);
    expect(problems).toEqual([]);
  });

  it('glimpses: figures, states, poster steps and brand rotation resolve', () => {
    const problems = glimpses.flatMap((glimpse) => {
      const found: string[] = [];
      for (const [index, step] of glimpse.steps.entries()) {
        const where = `${glimpse.id} step ${index}`;
        if (!figureIds.has(step.figure)) {
          found.push(`${where}: unknown figure ${step.figure}`);
          continue;
        }
        if (figureApp.get(step.figure) !== glimpse.app) found.push(`${where}: figure ${step.figure} is not a ${glimpse.app} figure`);
        for (const state of [step.state, step.posterState]) {
          if (state !== undefined && !figureStates.get(step.figure)?.includes(state)) {
            found.push(`${where}: figure ${step.figure} has no state "${state}"`);
          }
        }
        for (const tap of step.taps ?? []) {
          if (tap.x < 0 || tap.x > 390 || tap.y < 0 || tap.y > 844) found.push(`${where}: tap outside the 390×844 canvas`);
        }
      }
      if (!Number.isInteger(glimpse.posterStep) || glimpse.posterStep < 0 || glimpse.posterStep >= glimpse.steps.length) {
        found.push(`${glimpse.id}: posterStep ${glimpse.posterStep} is out of range`);
      }
      for (const brand of glimpse.brandRotation ?? []) {
        if (glimpse.app !== 'citizen' || brandApp.get(brand) !== 'citizen') found.push(`${glimpse.id}: brand rotation ${brand}`);
      }
      return found;
    });
    expect(problems).toEqual([]);
  });

  it('projects, apps, services, testimonials, experience and AI builds point at real case studies and projects', () => {
    const problems = [
      ...projects.flatMap((project) => [
        ...(project.caseStudy && !caseStudyBySlug.has(project.caseStudy) ? [`${project.slug}: case study ${project.caseStudy}`] : []),
        ...(project.app && !(APP_IDS as readonly string[]).includes(project.app) ? [`${project.slug}: app ${project.app}`] : []),
        ...project.links.flatMap((link) => linkProblems(link, project.slug)),
      ]),
      ...caseStudies.flatMap((study) => study.glance.links.flatMap((link) => linkProblems(link, `${study.slug} glance`))),
      ...apps.flatMap((app) => (caseStudyBySlug.get(app.caseStudy)?.app === app.id ? [] : [`app ${app.id}: case study ${app.caseStudy}`])),
      ...services.flatMap((service) => {
        const study = caseStudyBySlug.get(service.proof.slug);
        if (!study) return [`service ${service.id}: case study ${service.proof.slug}`];
        return service.proof.anchor && !study.sections.includes(service.proof.anchor)
          ? [`service ${service.id}: ${service.proof.slug} has no #${service.proof.anchor}`]
          : [];
      }),
      ...testimonials.flatMap((item) => (item.project && !caseStudyBySlug.has(item.project) ? [`testimonial ${item.id}: ${item.project}`] : [])),
      ...experience.flatMap((entry) => entry.projects.filter((slug) => !projectSlugs.has(slug)).map((slug) => `experience ${entry.id}: ${slug}`)),
      ...aiBuilds.flatMap((build) => {
        const match = /^\/projects\/([^#?]+)(?:#(.+))?$/.exec(String(build.href));
        if (!match) return [];
        const study = caseStudyBySlug.get(match[1] ?? '');
        if (!study) return [`AI build ${build.id}: case study ${match[1]}`];
        const anchor = match[2];
        return anchor && !(study.sections as readonly string[]).includes(anchor) ? [`AI build ${build.id}: no #${anchor}`] : [];
      }),
    ];
    expect(problems).toEqual([]);
  });

  it('store listings belong to a Citizen brand and are keyed brand.platform', () => {
    for (const listing of storeListings) {
      expect(brandApp.get(listing.brand), listing.id).toBe('citizen');
      expect(listing.id).toBe(`${listing.brand}.${listing.platform}`);
      for (const image of listing.screenshots) expect(image.alt.trim(), listing.id).not.toBe('');
    }
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────────────────

describe('projects', () => {
  it('company and client projects name the company', () => {
    const missing = projects.filter((project) => project.context !== 'personal' && !project.company?.trim()).map((project) => project.slug);
    expect(missing).toEqual([]);
  });
});

// ─── Figures ─────────────────────────────────────────────────────────────────────────────

describe('figures', () => {
  const expectedIds: FigureId[] = [
    ...(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'] as const),
    ...(['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'] as const),
    ...(['3.1', '3.2', '3.3', '3.4', '3.5', '3.6'] as const),
  ];

  it('are exactly the 21 replica screens, in order', () => {
    expect(figures.map((figure) => figure.id)).toEqual(expectedIds);
  });

  it('belong to the app their id prefix names', () => {
    const appByPrefix = { '1': 'sme', '2': 'citizen', '3': 'responder' } as const;
    for (const figure of figures) expect(figure.app, figure.id).toBe(appByPrefix[figure.id.charAt(0) as '1' | '2' | '3']);
  });

  it('map to the research signatureScreens ids (design §5.2)', () => {
    expect(Object.fromEntries(figures.map((figure) => [figure.id, figure.key]))).toEqual({
      '1.1': 'owner-dashboard',
      '1.2': 'pos-checkout',
      '1.3': 'credit-ledger',
      '1.4': 'customer-storefront',
      '1.5': 'live-order-tracking',
      '1.6': 'ai-hub-insight-report',
      '1.7': 'ai-hub-restock-forecast',
      '1.8': 'ai-chat-sheet',
      '1.9': 'roi-ai-insight-risk',
      '2.1': 'home-dashboard',
      '2.2': 'home-feed',
      '2.3': 'sos-countdown',
      '2.4': 'live-call',
      '2.5': 'hazard-map',
      '2.6': 'report-incident',
      '3.1': 'emergency-map-online',
      '3.2': 'incoming-dispatch',
      '3.3': 'navigate-to-incident',
      '3.4': 'video-call-command-center',
      '3.5': 'ptt-channel',
      '3.6': 'incident-report-form',
    });
  });

  it('use the plan’s priority set (3.4 is P0; 3.5 Channels is P1 and in rollout)', () => {
    const p0 = figures.filter((figure) => figure.priority === 'P0').map((figure) => figure.id);
    expect(p0).toEqual(['1.1', '1.2', '1.5', '1.6', '2.1', '2.3', '2.4', '2.5', '3.1', '3.2', '3.3', '3.4']);
    const channels = figures.find((figure) => figure.id === '3.5');
    expect(channels?.priority).toBe('P1');
    expect(channels?.rollout).toBe('in-rollout');
  });

  it('have unique, non-empty states and complete copy', () => {
    for (const figure of figures) {
      expect(figure.states.length, figure.id).toBeGreaterThan(0);
      expect(duplicates(figure.states), figure.id).toEqual([]);
      for (const text of [figure.title, figure.caption, figure.summary, figure.purpose]) expect(text.trim(), figure.id).not.toBe('');
      expect(figure.summary, figure.id).toMatch(/Fictional data\.$/);
    }
  });

  it('only re-skin Citizen and Responder screens', () => {
    expect(figures.filter((figure) => figure.app === 'sme' && figure.brandable)).toEqual([]);
  });

  it('give replica screens a typed state union', () => {
    expectTypeOf<FigureState<'2.3'>>().toEqualTypeOf<'idle' | 'countdown' | 'offline'>();
    expectTypeOf<FigureState<'3.3'>>().toEqualTypeOf<'far' | 'near' | 'on-site'>();
  });
});

// ─── Glimpses ────────────────────────────────────────────────────────────────────────────

describe('Home glimpses', () => {
  const homeSequence = (id: GlimpseId) => glimpseById.get(id)?.steps.map((step) => step.figure);

  it('have exactly 3 steps each, in the plan’s order', () => {
    expect(homeSequence('home.sme')).toEqual(['1.1', '1.2', '1.6']);
    expect(homeSequence('home.citizen')).toEqual(['2.1', '2.3', '2.4']);
    expect(homeSequence('home.responder')).toEqual(['3.1', '3.2', '3.3']);
  });

  it('rotate the Citizen skin from Smile SAFE Taytay to 1Hope', () => {
    expect(glimpseById.get('home.citizen')?.brandRotation).toEqual(['smile-safe-taytay', '1hope']);
  });

  it('exist for every app', () => {
    for (const app of APP_IDS) expect(glimpseById.has(`home.${app}`), app).toBe(true);
  });
});

// ─── Brands ──────────────────────────────────────────────────────────────────────────────

describe('brands (public-safe)', () => {
  it('list the six public Citizen apps under their exact store names', () => {
    expect(citizenBrands.map((brand) => [brand.id, brand.name])).toEqual([
      ['smile-safe-taytay', 'Smile SAFE Taytay'],
      ['1hope', '1Hope'],
      ['sjdm-app', 'SJDM App'],
      ['defensys-safe', 'Defensys SAFE'],
      ['safe-icb', 'SAFE ICB'],
      ['aero-app', 'AERO App'],
    ]);
  });

  it('list four Responder brands with their status (no demo build)', () => {
    expect(responderBrands.map((brand) => [brand.id, brand.status])).toEqual([
      ['defensys', 'platform'],
      ['smile-taytay', 'deployed'],
      ['sjdm', 'deployed'],
      ['bagong-pag-asa', 'in-setup'],
    ]);
  });

  it('flag the unconfirmed Responder deployments for confirmation', () => {
    for (const id of ['smile-taytay', 'sjdm']) {
      expect(responderBrands.find((brand) => brand.id === id)?.confirm, id).toBeTruthy();
    }
  });

  it('have exactly one default per app: Smile SAFE Taytay and Defensys', () => {
    expect(brands.filter((brand) => brand.isDefault).map((brand) => brand.id)).toEqual(['smile-safe-taytay', 'defensys']);
  });

  it('use public store icons for Citizen and no icon for Responder', () => {
    for (const brand of citizenBrands) expect(brand.icon).toBe(`/store/citizen/${brand.id}/play-icon.webp`);
    for (const brand of responderBrands) {
      expect(brand.icon).toBeNull();
      expect(brand.monogram.trim()).not.toBe('');
    }
  });

  it('exclude unpublished brands and never use the config name for 1Hope', () => {
    const text = JSON.stringify(brands);
    expect(text).not.toMatch(/antipolo|demo/i);
    expect(text).not.toMatch(/one\s*hope/i);
  });

  it('use hex palette values', () => {
    for (const brand of brands) {
      for (const value of Object.values(brand.palette)) expect(value, brand.id).toMatch(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    }
  });
});

// ─── Case-study structure ────────────────────────────────────────────────────────────────

describe('case-study structure', () => {
  it('flow diagrams have one connector between each pair of lanes', () => {
    for (const study of caseStudies) {
      for (const diagram of diagramsOf(study)) expect(diagram.connectors.length, diagram.id).toBe(diagram.lanes.length - 1);
    }
  });

  it('sections are known, unique and in page order', () => {
    for (const study of caseStudies) {
      const order = study.sections.map((key) => CASE_STUDY_SECTION_KEYS.indexOf(key));
      expect(order.every((index) => index >= 0), study.slug).toBe(true);
      expect([...order].sort((a, b) => a - b), study.slug).toEqual(order);
      expect(duplicates(study.sections), study.slug).toEqual([]);
    }
  });

  it('a special section appears exactly when its data exists', () => {
    for (const study of caseStudies) {
      for (const kind of ['ai', 'brands'] as const) {
        expect(study.sections.includes(kind), `${study.slug} #${kind}`).toBe(study.specials.some((special) => special.kind === kind));
      }
    }
  });

  it('listed sections have content', () => {
    for (const study of caseStudies) {
      const filled = {
        problem: study.problem.paragraphs.length,
        built: study.features.length,
        screens: study.screens.length,
        architecture: study.architecture.length,
        challenges: study.challenges.length,
        numbers: study.metrics.length,
      } as const;
      for (const [key, count] of Object.entries(filled)) {
        if ((study.sections as readonly string[]).includes(key)) expect(count, `${study.slug} #${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('metrics are dated', () => {
    for (const study of caseStudies) {
      for (const metric of study.metrics) expect(isISODate(metric.asOf), `${study.slug} ${metric.id}`).toBe(true);
    }
    expect(isISODate(site.asOf)).toBe(true);
  });
});
