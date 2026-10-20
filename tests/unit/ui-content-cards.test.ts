import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProjectCard, projectDestinations, projectMeta, stackPreview } from '@/components/content/project-card';
import { initials, QuoteCard } from '@/components/content/quote-card';
import { BentoCard } from '@/components/ui/bento-card';
import type { Project, Testimonial } from '@/content/types';
import { ph } from '@/lib/placeholder';

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

const base: Project = {
  slug: 'fixture',
  title: 'Fixture App',
  summary: 'A fixture.',
  context: 'company',
  company: 'Example Co.',
  role: ph('Your title'),
  ownership: 'primary',
  types: ['mobile'],
  status: 'live',
  statusLabel: 'Live',
  stack: ['A', 'B', 'C', 'D', 'E', 'F'],
  icon: 'store',
  links: [{ kind: 'case-study', slug: 'sme-panindio' }],
  caseStudy: 'sme-panindio',
  period: ph('YYYY – present'),
};

describe('ProjectCard helpers', () => {
  it('stackPreview shows four and counts the rest', () => {
    expect(stackPreview(base.stack)).toEqual({ shown: ['A', 'B', 'C', 'D'], more: 2 });
    expect(stackPreview(['A'])).toEqual({ shown: ['A'], more: 0 });
  });

  it('projectMeta lists context, company and period as segments', () => {
    expect(projectMeta(base)).toEqual(['Company', 'Example Co.', '[[YYYY – present]]']);
    expect(projectMeta({ ...base, context: 'personal', company: undefined, period: undefined })).toEqual(['Personal', '', '']);
  });

  it('destinations: the case study first; placeholder URLs pending in label mode and gone in hide mode', () => {
    const project: Project = {
      ...base,
      links: [
        { kind: 'case-study', slug: 'sme-panindio' },
        { kind: 'repo', href: ph('Repository URL'), label: 'Source code' },
        { kind: 'site', href: 'https://example.com', label: 'Website' },
        { kind: 'store-page', platform: 'appstore', href: 'https://apps.apple.com/' },
      ],
    };
    expect(projectDestinations(project, 'label').map((d) => d.kind)).toEqual(['internal', 'pending', 'external', 'external']);
    expect(projectDestinations(project, 'hide').map((d) => d.kind)).toEqual(['internal', 'external', 'external']);
    const [first] = projectDestinations(project, 'label');
    expect(first).toEqual({ kind: 'internal', href: '/projects/sme-panindio', label: 'Read the case study' });
  });
});

describe('ProjectCard rendering', () => {
  it('a single case-study destination makes the title the one stretched link and the card interactive', () => {
    const markup = html(createElement(ProjectCard, { project: base, look: 'compact', mode: 'label' }));
    expect(markup.match(/<a /g)).toHaveLength(1);
    expect(markup).toMatch(/<a [^>]*href="\/projects\/sme-panindio"/);
    expect(markup).toContain('after:absolute');
    expect(markup).toContain('hover:-translate-y-[3px]');
  });

  it('several destinations: explicit links and no lift', () => {
    const project: Project = { ...base, links: [...base.links, { kind: 'site', href: 'https://example.com', label: 'Website' }] };
    const markup = html(createElement(ProjectCard, { project, look: 'compact', mode: 'label' }));
    expect(markup.match(/<a /g)).toHaveLength(2);
    expect(markup).not.toContain('after:absolute');
    expect(markup).not.toContain('hover:-translate-y-[3px]');
  });

  it('an external-only destination never stretches into a whole-card new-tab link', () => {
    const project: Project = {
      ...base,
      caseStudy: undefined,
      links: [{ kind: 'site', href: 'https://example.com', label: 'Website' }],
    };
    const markup = html(createElement(ProjectCard, { project, look: 'compact', mode: 'label' }));
    expect(markup).not.toContain('after:absolute');
    expect(markup).toContain('target="_blank"');
  });

  it('marks placeholders in label mode and drops them in hide mode; Example tag only in label mode', () => {
    const example: Project = { ...base, example: true };
    const label = html(createElement(ProjectCard, { project: example, look: 'case-study', mode: 'label' }));
    expect(label).toContain('<mark class="ph');
    expect(label).toContain('Example');
    const hide = html(createElement(ProjectCard, { project: example, look: 'case-study', mode: 'hide' }));
    expect(hide).not.toContain('<mark');
    expect(hide).not.toContain('[[');
    expect(hide).not.toContain('>Example<');
  });

  it('adjacent look links to the case study', () => {
    const markup = html(createElement(ProjectCard, { project: base, look: 'adjacent', direction: 'previous', mode: 'label' }));
    expect(markup).toContain('Previous case study');
    expect(markup).toMatch(/<a [^>]*href="\/projects\/sme-panindio"/);
  });
});

describe('QuoteCard', () => {
  it('initials come from real names only', () => {
    expect(initials('Ana Reyes')).toBe('AR');
    expect(initials('  Ana  Maria Reyes ')).toBe('AR');
    expect(initials('ana')).toBe('A');
    expect(initials('[[Client name]]')).toBeNull();
    expect(initials('   ')).toBeNull();
  });

  const example: Testimonial = {
    id: 't',
    example: true,
    quote: 'Example: a short note.',
    name: ph('Client name'),
    role: ph('Role · Company'),
    tags: ['Mobile app', 'Offline-first'],
  };

  it('example items carry the Example tag in label mode', () => {
    const markup = html(createElement(QuoteCard, { testimonial: example, look: 'full', mode: 'label' }));
    expect(markup).toContain('Example');
    expect(markup).toContain('<blockquote');
    expect(markup).toContain('<figcaption');
  });

  it('hide mode renders no placeholder marks', () => {
    const markup = html(createElement(QuoteCard, { testimonial: example, look: 'compact', mode: 'hide' }));
    expect(markup).not.toContain('<mark');
    expect(markup).not.toContain('[[');
  });
});

describe('BentoCard', () => {
  it('stretched: the title is the only link, the cue is decorative, the card lifts', () => {
    const markup = html(
      createElement(BentoCard, {
        area: 'about',
        icon: 'user-round',
        title: 'About',
        description: 'Desc',
        link: { href: '/about', label: 'More', mode: 'stretched' },
      }),
    );
    expect(markup).toMatch(/^<section aria-labelledby="bento-about-title"/);
    expect(markup).toContain('[grid-area:about]');
    expect(markup.match(/<a /g)).toHaveLength(1);
    expect(markup).toMatch(/<h2 id="bento-about-title"[^>]*><a [^>]*href="\/about"/);
    expect(markup).toContain('hover:-translate-y-[3px]');
  });

  it('header mode: an explicit link and no lift', () => {
    const markup = html(
      createElement(BentoCard, {
        area: 'proj',
        hero: true,
        icon: 'folder-open',
        title: 'Projects',
        link: { href: '/projects', label: 'All projects', mode: 'header' },
      }),
    );
    expect(markup).toMatch(/<a [^>]*href="\/projects"[^>]*>All projects/);
    expect(markup).not.toContain('hover:-translate-y-[3px]');
    expect(markup).toContain('text-h3-hero');
  });
});
