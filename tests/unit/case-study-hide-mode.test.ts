import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CaseStudyTemplate } from '@/components/sections/case-study/case-study-template';
import { caseStudies } from '@/content/case-studies';
import type { CaseStudy } from '@/content/types';

/*
 * The case-study template in hide mode (PLAN Placeholders: "hide mode removes token fields, not
 * whole items"): the site as it would go public. No "[[…]]" and no placeholder mark anywhere; a
 * glance field that is only a token disappears with its label; an unconfirmed link renders nothing.
 */

vi.mock('@/content/site', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/content/site')>();
  return { site: { ...original.site, placeholders: 'hide' } };
});

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/projects/defensys-citizen',
}));

const render = (study: CaseStudy): string => renderToStaticMarkup(createElement(CaseStudyTemplate, { study }));

function find(slug: CaseStudy['slug']): CaseStudy {
  const study = caseStudies.find((candidate) => candidate.slug === slug);
  if (!study) throw new Error(slug);
  return study;
}

describe.each(caseStudies.map((study): [string, CaseStudy] => [study.slug, study]))('%s in hide mode', (_slug, study) => {
  const html = render(study);

  it('shows no token and no placeholder mark', () => {
    expect(html).not.toMatch(/\[\[|\]\]/);
    expect(html).not.toContain('<mark');
    expect(html).not.toContain('(placeholder)');
  });

  it('still renders every section', () => {
    for (const key of study.sections) expect(html).toContain(`<section id="${key}"`);
  });
});

describe('hide mode drops token fields, not whole items', () => {
  it('Citizen: the role keeps its confirmed lines; the placeholder timeline goes with its label', () => {
    const html = render(find('defensys-citizen'));
    expect(html).not.toContain('Your title at DGSI');
    expect(html).toContain('I build and maintain the mobile app, one white-label codebase');
    expect(html).not.toContain('data-glance="Timeline"');
    expect(html).toContain('data-glance="Role"');
  });

  it('SME: the unconfirmed repo link renders nothing, so the Links row is gone', () => {
    const html = render(find('sme-panindio'));
    expect(html).not.toContain('Source code');
    expect(html).not.toContain('data-glance="Links"');
    expect(html).toContain('data-glance="Timeline"');
  });
});
