import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ProjectsPage, { metadata } from '@/app/projects/page';
import { ProjectsIndex } from '@/components/sections/projects/projects-index';
import { projectFacetCounts } from '@/content/derived';
import { projects } from '@/content/projects';
import type { PlaceholderMode, Project } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { projectCount } from '@/lib/project-filters';
import { caseStudyHref } from '@/lib/routes';

/*
 * The /projects index as the server renders it (design §8): every visible project, case studies
 * first, hidden projects never; the filters with counts from derived.ts; placeholders by mode.
 * The page is static, so even with ?type=ai in the address the server HTML lists every project
 * (the island applies the URL after hydration).
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('type=ai'),
  usePathname: () => '/projects',
}));

const render = (mode: PlaceholderMode, list?: readonly Project[]): string =>
  renderToStaticMarkup(createElement(ProjectsIndex, { mode, projects: list }));

/** The markup of one project's list item (up to the next project; cards nest their own lists). */
function item(markup: string, slug: string): string {
  const start = markup.indexOf(`data-project="${slug}"`);
  expect(start, slug).toBeGreaterThan(-1);
  const next = markup.indexOf('data-project="', start + 1);
  return markup.slice(start, next === -1 ? undefined : next);
}

interface Radio {
  readonly name: string;
  readonly value: string;
  readonly checked: boolean;
}

/** Every radio in document order (React orders attributes its own way). */
function radios(markup: string): readonly Radio[] {
  return [...markup.matchAll(/<input type="radio"[^>]*>/g)].map(([tag]) => ({
    name: /name="([^"]*)"/.exec(tag)?.[1] ?? '',
    value: /value="([^"]*)"/.exec(tag)?.[1] ?? '',
    checked: /\schecked=""/.test(tag),
  }));
}

const hiddenProjects = projects.filter((project) => project.hidden === true);

describe('ProjectsIndex', () => {
  const label = render('label');

  it('renders every visible project once, the three case studies first', () => {
    const shown = visible(projects, 'label');
    const order = [...label.matchAll(/data-project="([^"]+)"/g)].map((match) => match[1]);
    expect(order).toEqual(shown.map((project) => project.slug));
    expect(order.slice(0, 3)).toEqual(['sme-panindio', 'defensys-citizen', 'defensys-responder']);
  });

  it('never renders hidden projects, in either mode', () => {
    expect(hiddenProjects.length).toBeGreaterThan(0);
    for (const markup of [label, render('hide')]) {
      for (const project of hiddenProjects) {
        expect(markup, project.slug).not.toContain(project.title);
        expect(markup, project.slug).not.toContain(`data-project="${project.slug}"`);
      }
    }
  });

  it('case-study cards link to their case study with the "Read the case study" cue and a static phone', () => {
    for (const slug of ['sme-panindio', 'defensys-citizen', 'defensys-responder'] as const) {
      const card = item(label, slug);
      expect(card).toContain(`href="${caseStudyHref(slug)}"`);
      expect(card).toContain('Read the case study');
      expect(card.match(/data-phone=""/g), slug).toHaveLength(1);
      expect(card).toContain('data-size="sm"');
    }
  });

  it('More work cards carry an icon tile, never an image (V1 screenshots are not reused)', () => {
    for (const project of visible(projects, 'label').filter((candidate) => !candidate.caseStudy)) {
      const card = item(label, project.slug);
      expect(card, project.slug).toContain('bg-accent text-on-accent');
      expect(card, project.slug).not.toContain('<img');
    }
    expect(label).not.toMatch(/\/images\//);
  });

  it('names the company on company work', () => {
    expect(item(label, 'eventbook-exhibitors')).toContain('DGSI');
    expect(item(label, 'brilliant-erp')).toContain('Company or client');
  });

  it('store links say which app they list', () => {
    const card = item(label, 'eventbook-exhibitors');
    expect(card).toContain('href="https://play.google.com/store/apps/details?id=com.eventbook.exhibitor"');
    expect(card).toContain('<span class="sr-only"> listing for Eventbook Exhibitors</span>');
  });

  it('draws no status shape beside a status that is still a placeholder (S5.35)', () => {
    const status = /<p class="flex items-center gap-2 text-meta text-ink-2">(.*?)<\/p>/;
    const unconfirmed = status.exec(item(label, 'defensys-citizen-web'))?.[1] ?? '';
    expect(unconfirmed).toContain('Status to confirm');
    expect(unconfirmed).not.toContain('<svg');
    const confirmed = status.exec(item(label, 'jp-live-subtitles'))?.[1] ?? '';
    expect(confirmed).toContain('<svg');
    expect(confirmed).toContain('Prototype');
  });

  it('offers Type and Context radios with counts from projectFacetCounts, and no tooling or empty values', () => {
    const values = (name: string) => radios(label).filter((radio) => radio.name === name).map((radio) => radio.value);
    expect(values('type')).toEqual(['all', 'mobile', 'web', 'ai']);
    const contexts = values('context');
    expect(contexts.slice(0, 3)).toEqual(['all', 'personal', 'company']);
    expect(contexts.includes('client')).toBe(projectFacetCounts.client > 0);
    expect(label).toContain(`AI, ${projectCount(projectFacetCounts.ai)}`);
    expect(label).toContain(`Company, ${projectCount(projectFacetCounts.company)}`);
    expect(label).toContain(`All, ${projectCount(projectFacetCounts.all)}`);
  });

  it('server-renders All checked and the full count, whatever the address says', () => {
    const checked = radios(label).filter((radio) => radio.checked);
    expect(checked).toEqual([
      { name: 'type', value: 'all', checked: true },
      { name: 'context', value: 'all', checked: true },
    ]);
    expect(label).toContain(`role="status" class="mt-3 text-meta text-ink-3">Showing all ${projectFacetCounts.all} projects</p>`);
    expect(label).not.toMatch(/<li[^>]*hidden=""/);
    expect(label).not.toMatch(/<section[^>]*hidden=""/);
    expect(label).not.toContain('No projects match.');
  });

  it('hides the filters without JavaScript (there is nothing to filter with)', () => {
    expect(label).toMatch(/class="noscript:hidden[^"]*" data-facet-bar=""/);
  });

  it('marks placeholders in label mode and removes them in hide mode', () => {
    expect(label).toContain('<mark class="ph');
    const hide = render('hide');
    expect(hide).not.toContain('<mark');
    expect(hide).not.toContain('[[');
    expect(hide).not.toContain('Status to confirm');
    expect(item(hide, 'brilliant-erp')).not.toContain('Company or client');
  });

  it('example projects show the Example tag in label mode and are dropped in hide mode', () => {
    const example: Project = { ...projects[3]!, slug: 'example-project', title: 'Example Project', example: true };
    const list = [...projects, example];
    expect(item(render('label', list), 'example-project')).toContain('Example');
    expect(render('hide', list)).not.toContain('data-project="example-project"');
  });

  it('shows the empty state, without Clear filters, when there is nothing to list', () => {
    const empty = render('label', []);
    expect(empty).toContain('No projects match.');
    expect(empty).toContain('Try another type or context.');
    expect(empty).not.toContain('Clear filters');
    expect(empty).not.toContain('data-project=');
  });
});

describe('/projects page', () => {
  const markup = renderToStaticMarkup(createElement(ProjectsPage));

  it('has one h1, the page intro and the Get in touch pill', () => {
    expect(markup.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(markup).toContain('Case studies first');
    expect(markup).toContain('Get in touch');
  });

  it('renders the Home → Projects BreadcrumbList', () => {
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(markup)?.[1];
    expect(JSON.parse(json ?? '{}')).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Home', item: '/' },
        { position: 2, name: 'Projects', item: '/projects' },
      ],
    });
  });

  it('exports its metadata through pageMetadata', () => {
    expect(metadata).toMatchObject({ title: 'Projects', alternates: { canonical: '/projects' } });
    expect(typeof metadata.description).toBe('string');
  });
});
