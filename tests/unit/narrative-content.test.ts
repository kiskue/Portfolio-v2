import { describe, expect, it } from 'vitest';
import * as aiBuildsModule from '@/content/ai-builds';
import * as credentialsModule from '@/content/credentials';
import * as experienceModule from '@/content/experience';
import * as faqsModule from '@/content/faqs';
import * as homeModule from '@/content/home';
import * as profileModule from '@/content/profile';
import * as projectsModule from '@/content/projects';
import * as servicesModule from '@/content/services';
import * as skillsModule from '@/content/skills';
import * as testimonialsModule from '@/content/testimonials';
import * as toolsModule from '@/content/tools';
import { CASE_STUDY_SLUGS, SIMPLE_ICON_KEYS, type PageKey, type Project } from '@/content/types';
import { isPlaceholder, segmentText, visible } from '@/lib/placeholder';

/*
 * Contracts for the site-wide narrative content (wave 1, W2a): identity, Home copy, the tools
 * strip, AI builds, projects, people content, the binding claim wording and a content-safety
 * sweep over every string these modules export (confirm notes included).
 */

const { aiBuilds } = aiBuildsModule;
const { credentials, education } = credentialsModule;
const { experience } = experienceModule;
const { faqs } = faqsModule;
const { callsToAction, emptyStates, home, pages } = homeModule;
const { availabilityLine, contactLine, profile } = profileModule;
const { projects } = projectsModule;
const { engagements, processSteps, services } = servicesModule;
const { skills } = skillsModule;
const { testimonials } = testimonialsModule;
const { tools } = toolsModule;

const OWNED_MODULES = {
  'ai-builds': aiBuildsModule,
  credentials: credentialsModule,
  experience: experienceModule,
  faqs: faqsModule,
  home: homeModule,
  profile: profileModule,
  projects: projectsModule,
  services: servicesModule,
  skills: skillsModule,
  testimonials: testimonialsModule,
  tools: toolsModule,
} as const;

/** Every string in a value, with a readable path. Shared objects are visited once. */
function collectStrings(value: unknown, path: string, out: Array<readonly [string, string]>, seen: Set<object>): void {
  if (typeof value === 'string') {
    out.push([path, value]);
    return;
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) value.forEach((entry, index) => collectStrings(entry, `${path}[${index}]`, out, seen));
  else for (const [key, entry] of Object.entries(value)) collectStrings(entry, `${path}.${key}`, out, seen);
}

function stringsOf(value: unknown, path: string): Array<readonly [string, string]> {
  const out: Array<readonly [string, string]> = [];
  collectStrings(value, path, out, new Set());
  return out;
}

const ownedStrings = Object.entries(OWNED_MODULES).flatMap(([name, module]) => stringsOf(module, name));

function project(slug: string): Project {
  const found = projects.find((candidate) => candidate.slug === slug);
  if (!found) throw new Error(`No project ${slug}`);
  return found;
}

// ─── Identity ────────────────────────────────────────────────────────────────────────────

describe('profile (identity from V1)', () => {
  it('keeps the V1 identity facts', () => {
    expect(profile).toMatchObject({
      name: 'Gerric Measco',
      handle: '@kiskue',
      location: 'Taguig City, PH',
      timezone: 'GMT+8',
      email: 'gerricmeasco360@gmail.com',
    });
    expect(profile.links.map((link) => [link.id, link.href])).toEqual([
      ['github', 'https://github.com/kiskue'],
      ['linkedin', 'https://www.linkedin.com/in/gerric-measco-39a0a722a/'],
      ['email', 'mailto:gerricmeasco360@gmail.com'],
    ]);
    expect(profile.education).toBe(education);
    expect(education).toMatchObject({ degree: 'BS Computer Science', school: 'Taguig City University', short: 'TCU' });
    expect(profile.portraitAlt).toContain('Gerric Measco');
  });

  it('defaults the title to "Mobile & full-stack engineer" and asks to confirm it', () => {
    expect(profile.title).toBe('Mobile & full-stack engineer');
    expect(profile.confirm).toMatch(/Frontend Developer/);
  });

  it('leaves unknown facts null and owner wording as placeholders', () => {
    expect(profile.yearsOfExperience).toBeNull();
    expect(profile.cvUrl).toBeNull();
    expect(profile.verifiedCredentialUrl).toBeNull();
    expect(isPlaceholder(profile.availability.label)).toBe(true);
    expect(isPlaceholder(profile.replyTime)).toBe(true);
    expect(isPlaceholder(education.year)).toBe(true);
  });

  it('models the meta lines as segments that hide cleanly', () => {
    expect(segmentText(availabilityLine, 'hide')).toBe('Taguig City, PH · GMT+8');
    expect(segmentText(contactLine, 'hide')).toBe('Taguig City, PH · GMT+8');
    expect(segmentText(availabilityLine, 'label')).toBe(`${profile.availability.label} · Taguig City, PH · GMT+8`);
    expect(segmentText(contactLine, 'label')).toBe(`Taguig City, PH · GMT+8 · ${profile.replyTime}`);
  });
});

// ─── Home ────────────────────────────────────────────────────────────────────────────────

describe('home copy', () => {
  it('uses the approved two-line headline, subline and CTAs', () => {
    expect(home.headline).toEqual(['Mobile apps that keep working', 'when the network doesn’t.']);
    expect(home.subline).toBe(
      'I’m Gerric, a React Native and full-stack engineer in Metro Manila. I build offline-first, real-time apps, from SOS video calls for city command centers to a pocket ERP for Filipino small businesses.',
    );
    // The UI adds the ArrowUpRight icon; the label carries no arrow glyph.
    expect(home.ctas).toEqual({ contact: 'Get in touch', projects: 'View projects', cv: 'Download CV' });
    expect(home.tools).toEqual({ eyebrow: 'Daily drivers', title: 'Tools I work with' });
  });

  it('has copy for all seven bento cards', () => {
    expect(Object.keys(home.cards).sort()).toEqual(['about', 'ai', 'cred', 'live', 'proj', 'serv', 'testi']);
    for (const [area, card] of Object.entries(home.cards)) {
      expect(card.title.trim(), area).not.toBe('');
      expect(card.description.trim(), area).not.toBe('');
      expect(card.linkLabel?.trim(), area).toBeTruthy();
    }
    expect(home.cards.about.description).toBe('Taguig City, PH · GMT+8. The person behind the apps.');
  });

  it('never hard-codes store facts: counts, installs and ratings come from storeSummary', () => {
    const NUMBER = String.raw`(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten)`;
    const STORE_NOUN = String.raw`(?:store (?:apps?|listings?)|listings?|installs?|downloads?|ratings?|reviews?|screenshots?|brands?)`;
    const storeFact = new RegExp(String.raw`\b${NUMBER}\+?\s+(?:[a-z-]+\s+)?${STORE_NOUN}\b|\b\d+(?:\.\d+)?\s*(?:K\+|M\+|★)`, 'i');
    const copy = [
      ...stringsOf(home, 'home'),
      ...stringsOf(pages, 'pages'),
      ...stringsOf(emptyStates, 'emptyStates'),
      ...stringsOf(callsToAction, 'callsToAction'),
    ];
    expect(copy.filter(([, value]) => storeFact.test(value))).toEqual([]);
    expect(storeFact.test('6 apps · 8 store listings')).toBe(true);
    expect(storeFact.test('six public-safety brands')).toBe(true);
    expect(storeFact.test('5K+')).toBe(true);
  });

  it('has a header for every page and the empty states the design asks for', () => {
    const keys: PageKey[] = ['projects', 'showcase', 'services', 'testimonials', 'about', 'contact', 'not-found'];
    for (const key of keys) {
      expect(pages[key].title.trim(), key).not.toBe('');
      expect(pages[key].intro.trim(), key).not.toBe('');
    }
    expect(pages.contact.title).toBe('Let’s talk');
    expect(pages['not-found'].title).toBe('This page isn’t on the map.');
    expect(home.testimonialsEmpty).toMatchObject({
      title: 'Kind words, soon.',
      cta: { href: '/contact?topic=testimonial' },
    });
    expect(emptyStates.projects.cta?.label).toBe('Clear filters');
    expect(emptyStates.showcase.cta?.label).toBe('Clear filters');
  });
});

// ─── Tools strip ─────────────────────────────────────────────────────────────────────────

describe('tools strip', () => {
  it('lists exactly the 20 tools of design §4.2, in order', () => {
    expect(tools.map((tool) => tool.label)).toEqual([
      'Expo · EAS',
      'React Native',
      'TypeScript',
      'Next.js',
      'Tailwind · NativeWind',
      'TanStack Query',
      'Zustand',
      'Socket.IO',
      'WebRTC',
      'SQLite',
      'NestJS',
      'FastAPI',
      'MySQL',
      'Google Gemini',
      'Ollama',
      'MapLibre',
      'Storybook',
      'Jest',
      'GitHub Actions',
      'Vercel',
    ]);
    expect(visible(tools, 'hide')).toHaveLength(20);
  });

  it('uses simple-icons glyphs where they exist and a monogram for Zustand', () => {
    for (const tool of tools) {
      if (tool.glyph.kind === 'si') expect(SIMPLE_ICON_KEYS, tool.id).toContain(tool.glyph.icon);
    }
    expect(tools.find((tool) => tool.id === 'react-native')?.glyph).toEqual({ kind: 'si', icon: 'siReact' });
    expect(tools.find((tool) => tool.id === 'zustand')?.glyph).toEqual({ kind: 'monogram', text: 'Z' });
  });

  it('backs every tool with evidence from a project or a repo', () => {
    const slugs = new Set(projects.map((candidate) => candidate.slug));
    for (const tool of tools) {
      const { projects: used, repos = [], note } = tool.evidence;
      expect(used.length + repos.length, tool.id).toBeGreaterThan(0);
      expect(used.filter((slug) => !slugs.has(slug)), tool.id).toEqual([]);
      expect(note.trim(), tool.id).not.toBe('');
    }
  });
});

// ─── AI builds ───────────────────────────────────────────────────────────────────────────

describe('AI builds', () => {
  it('are exactly the four chips of the plan, with their statuses and links', () => {
    expect(aiBuilds.map((build) => [build.label, build.status, String(build.href)])).toEqual([
      ['SME AI assistant', 'beta', '/projects/sme-panindio#ai'],
      ['Citizen safety brief', 'live', '/projects/defensys-citizen#built'],
      ['Responder facility ranking', 'building', '/projects/defensys-responder#built'],
      ['JP Live Subtitles', 'prototype', '/projects?type=ai'],
    ]);
    expect(visible(aiBuilds, 'hide')).toHaveLength(4);
  });

  it('flag the SME fallback wording for confirmation', () => {
    expect(aiBuilds.find((build) => build.id === 'sme-ai-assistant')?.confirm).toMatch(/open-weights fallback via Ollama/);
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────────────────

describe('projects', () => {
  it('keep the three case-study projects under their slugs', () => {
    for (const slug of CASE_STUDY_SLUGS) {
      expect(project(slug).caseStudy, slug).toBe(slug);
      expect(project(slug).links, slug).toContainEqual({ kind: 'case-study', slug });
    }
    expect(project('sme-panindio').context).toBe('personal');
    expect(project('defensys-citizen')).toMatchObject({ context: 'company', company: 'DGSI', ownership: 'primary' });
    expect(project('defensys-responder')).toMatchObject({ context: 'company', company: 'DGSI' });
  });

  it('show the More work set the plan asks for', () => {
    const shown = new Set(visible(projects, 'label').map((candidate) => candidate.slug));
    for (const slug of [
      'eventbook-exhibitors',
      'jp-live-subtitles',
      'defensys-citizen-web',
      'brilliant-erp',
      'brilliant-virtual-id',
      'telemedicine',
    ]) {
      expect(shown.has(slug), slug).toBe(true);
    }
  });

  it('credit Eventbook Exhibitors to DGSI, as a collaborator, with store-page links', () => {
    const eventbook = project('eventbook-exhibitors');
    expect(eventbook).toMatchObject({ context: 'company', company: 'DGSI', ownership: 'collaborator', status: 'live' });
    expect(eventbook.links.map((link) => (link.kind === 'store-page' ? link.platform : link.kind))).toEqual(['play', 'appstore']);
  });

  it('keep unconfirmed facts as placeholders', () => {
    const citizenWeb = project('defensys-citizen-web');
    expect(isPlaceholder(citizenWeb.statusLabel)).toBe(true);
    expect(citizenWeb.links).toEqual([expect.objectContaining({ kind: 'site', href: expect.stringMatching(/^\[\[.+\]\]$/) })]);
    expect(project('jp-live-subtitles').status).toBe('prototype');
    for (const slug of ['brilliant-erp', 'brilliant-virtual-id', 'telemedicine']) {
      const v1 = project(slug);
      for (const field of [v1.company ?? '', v1.role, v1.period ?? '']) expect(isPlaceholder(field), `${slug} ${field}`).toBe(true);
      expect(v1.confirm, slug).toBeTruthy();
    }
    for (const slug of ['defensys-citizen', 'defensys-responder']) {
      expect(isPlaceholder(project(slug).role), slug).toBe(true);
      expect(isPlaceholder(project(slug).period ?? ''), slug).toBe(true);
    }
  });

  it('hide room video conferencing until it is confirmed', () => {
    expect(project('command-center-room-video').hidden).toBe(true);
    expect(visible(projects, 'label').some((candidate) => candidate.slug === 'command-center-room-video')).toBe(false);
  });
});

// ─── People and pages ────────────────────────────────────────────────────────────────────

describe('testimonials', () => {
  it('are three generic examples that hide mode removes', () => {
    expect(testimonials).toHaveLength(3);
    for (const item of testimonials) {
      expect(item.example, item.id).toBe(true);
      // No invented people, clients or industries: name and role are both placeholders.
      expect(isPlaceholder(item.name), item.id).toBe(true);
      expect(isPlaceholder(item.role), item.id).toBe(true);
      expect(item.quote, item.id).toMatch(/^Example: /);
      expect(item.project, item.id).toBeUndefined();
    }
    expect(visible(testimonials, 'hide')).toEqual([]);
  });
});

describe('services', () => {
  it('cover the five services in ServiceId order, with pricing as placeholders', () => {
    expect(services.map((service) => service.id)).toEqual(['mobile-apps', 'white-label', 'realtime', 'offline-first', 'grounded-ai']);
    for (const service of services) expect(isPlaceholder(service.engagement), service.id).toBe(true);
  });

  it('have the process strip and the engagement cards', () => {
    expect(processSteps.map((step) => step.title)).toEqual(['Discover', 'Design', 'Build', 'Ship', 'Support']);
    expect(engagements.map((engagement) => engagement.title)).toEqual(['Full-time role', 'Contract', 'Fixed-scope project']);
    for (const engagement of engagements) expect(isPlaceholder(engagement.body), engagement.id).toBe(true);
  });
});

describe('credentials, experience, skills and FAQs', () => {
  it('show the example certification first in label mode and the degree in hide mode', () => {
    expect(visible(credentials, 'label')[0]).toMatchObject({ kind: 'certification', example: true });
    expect(visible(credentials, 'hide')).toEqual([
      expect.objectContaining({ kind: 'degree', title: 'BS Computer Science', issuer: 'Taguig City University' }),
    ]);
  });

  it('keep the DGSI title, dates and v1 involvement as placeholders', () => {
    const dgsi = experience.find((entry) => entry.id === 'dgsi');
    expect(dgsi && isPlaceholder(dgsi.title)).toBe(true);
    expect(dgsi && isPlaceholder(dgsi.period)).toBe(true);
    expect(dgsi?.highlights?.some((line) => isPlaceholder(line) && line.includes('v1'))).toBe(true);
  });

  it('tier skills as core, production-tested and working knowledge', () => {
    expect(skills.map((tier) => tier.depth)).toEqual(['core', 'production', 'working']);
  });

  it('leave the owner’s calls (availability, freelance work, pricing) as placeholders', () => {
    for (const id of ['full-time', 'contract', 'process-pricing']) {
      const faq = faqs.find((candidate) => candidate.id === id);
      expect(faq && isPlaceholder(faq.a), id).toBe(true);
    }
  });
});

// ─── Binding wording ─────────────────────────────────────────────────────────────────────

describe('binding claim wording (PLAN.md)', () => {
  const texts = ownedStrings.map(([, value]) => value);

  it('credits the Command Center and API to the DGSI team', () => {
    const wording =
      'Command Center and API built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints';
    expect(texts.filter((text) => text.includes(wording)).length).toBeGreaterThanOrEqual(2);
    // Proper nouns only: "a resident calling their local command center" is not a claim.
    const platformClaim = /\bI (?:built|build|own|led|lead)\b[^.;]*\b(?:Command Center|Defensys API|CMS)\b/;
    const productClaim = /\bI built Defensys\b(?! (?:Citizen|Responder))|\bled the responder program\b/i;
    expect(ownedStrings.filter(([, value]) => platformClaim.test(value) || productClaim.test(value))).toEqual([]);
  });

  it('describes the SME AI fallback neutrally, never as running on someone’s servers', () => {
    expect(texts.some((text) => text.includes('open-weights fallback via Ollama'))).toBe(true);
    expect(ownedStrings.filter(([, value]) => /self-hosted|company-hosted|on-prem|company server/i.test(value))).toEqual([]);
  });
});

// ─── Audited claims (A-W1) ───────────────────────────────────────────────────────────────

/** What the pages can show: `confirm` notes and the tools' `evidence` are build-time only. */
const renderedStrings = ownedStrings.filter(([path]) => !/\.(?:confirm|evidence)(?:\.|\[|$)/.test(path));

describe('audited claims stay fixed (A-W1)', () => {
  const offending = (pattern: RegExp) =>
    renderedStrings.filter(([, value]) => pattern.test(value)).map(([path, value]) => `${path} = ${value}`);

  it('walks only rendered copy', () => {
    expect(renderedStrings.length).toBeGreaterThan(200);
    expect(renderedStrings.length).toBeLessThan(ownedStrings.length);
  });

  it('uses no superlatives or unverifiable marketing words', () => {
    expect(
      offending(
        /\b(?:best|world[- ]class|cutting[- ]edge|state[- ]of[- ]the[- ]art|passionate|ninja|rock ?star|guru|seamless(?:ly)?|revolutionary|unparalleled|award[- ]winning|industry[- ]leading|top[- ]notch|game[- ]chang\w*|10x|fastest|flawless(?:ly)?)\b/i,
      ),
    ).toEqual([]);
  });

  it('never states the Responder deployment as a usage fact (it is confirm-pending)', () => {
    expect(offending(/\b(?:responders?|teams?)\s+use\b|\bused by\b[^.]*\bresponders?\b/i)).toEqual([]);
  });

  it('never promises every store screenshot, or Defensys SAFE screenshots (they are SJDM-branded)', () => {
    expect(offending(/\b(?:all|every|each)\b[^.]{0,40}\bscreenshots?\b/i)).toEqual([]);
    expect(offending(/Defensys SAFE[^.]{0,60}\bscreenshots?\b|\bscreenshots?\b[^.]{0,60}Defensys SAFE/i)).toEqual([]);
  });

  it('does not claim public repos before the owner confirms one', () => {
    expect(faqs.find((faq) => faq.id === 'code')?.a).not.toMatch(/public repos?/i);
  });
});

// ─── Content safety ──────────────────────────────────────────────────────────────────────

describe('content safety (owned narrative modules)', () => {
  const DENY: ReadonlyArray<readonly [string, RegExp]> = [
    ['host or URL with a port', /\b(?:localhost|[a-z0-9-]+(?:\.[a-z0-9-]+)+):\d{2,5}\b/i],
    ['IPv4 address', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
    ['API key', /\bAIza[0-9A-Za-z_-]{20,}|\bsk-[A-Za-z0-9_-]{16,}/],
    ['EAS or Firebase id', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b1:\d{6,}:(?:android|ios|web):/i],
    ['EXPO_PUBLIC', /EXPO_PUBLIC/],
    ['/api/ path', /\/api\//i],
    ['rate limit', /\b\d+\s*(?:\/|per)\s*(?:s|sec|second|min|minute|hour)\b|requests?\s*\/\s*(?:second|minute)/i],
    ['secret or header name', /\bX-[A-Za-z]+(?:-[A-Za-z]+)+\b|\bsecret\b|\bBearer\b/i],
    [
      'unpublished package id',
      /com\.dgsi\.(?:defensysresponseteam|defensys\.taytayrt|sjdmresponderapp|demoresponderapp|antipolosafeapp|demosafeapp|responderppt)|com\.sme\.panindo/,
    ],
    ['"OneHope" (the store name is "1Hope")', /one\s*hope/i],
    ['PH mobile number', /(?:\+63|\b0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/],
  ];

  it('walks every owned module', () => {
    expect(ownedStrings.length).toBeGreaterThan(300);
  });

  it('uses patterns that catch known-bad samples and pass ordinary copy', () => {
    // Samples are assembled at runtime so no key- or number-like literal sits in the source.
    const bad: Readonly<Record<string, string>> = {
      'host or URL with a port': ['http://example', 'com:8080'].join('.'),
      'IPv4 address': ['10', '0', '0', '12'].join('.'),
      'API key': `AIza${'x'.repeat(35)}`,
      'EAS or Firebase id': ['123e4567', 'e89b', '12d3', 'a456', '426614174000'].join('-'),
      EXPO_PUBLIC: ['EXPO', 'PUBLIC', 'API', 'URL'].join('_'),
      '/api/ path': `POST /${'api'}/v1/ai/ask`,
      'rate limit': `${20}/min`,
      'secret or header name': ['X', 'AI', 'Service', 'Secret'].join('-'),
      'unpublished package id': ['com', 'dgsi', 'sjdmresponderapp'].join('.'),
      '"OneHope" (the store name is "1Hope")': ['One', 'Hope'].join(''),
      'PH mobile number': ['0917', '000', '0001'].join(' '),
    };
    for (const [label, pattern] of DENY) expect(pattern.test(bad[label] ?? ''), label).toBe(true);
    for (const fine of ['9:41', '0:07', '10:42 AM', 'Expo SDK 54', 'React Native 0.81', 'GMT+8', 'Apr – May 2025', '1Hope']) {
      expect(DENY.filter(([, pattern]) => pattern.test(fine)).map(([label]) => label), fine).toEqual([]);
    }
  });

  it.each(DENY)('has no %s', (_label, pattern) => {
    expect(ownedStrings.filter(([, value]) => pattern.test(value)).map(([path, value]) => `${path} = ${value}`)).toEqual([]);
  });

  it('has no email other than the profile email', () => {
    const emails = ownedStrings.flatMap(([, value]) => value.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []);
    expect(new Set(emails)).toEqual(new Set([profile.email]));
  });
});
