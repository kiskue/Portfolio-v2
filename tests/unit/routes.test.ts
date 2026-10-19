import type { Route } from 'next';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { caseStudies } from '@/content/case-studies';
import { site } from '@/content/site';
import { CASE_STUDY_SLUGS, CONTACT_TOPICS, type CaseStudyPath, type SiteRoute } from '@/content/types';
import { aboutHref, caseStudyHref, contactHref, projectsHref, servicesHref } from '@/lib/routes';

describe('caseStudyHref', () => {
  it('builds the case-study path, optionally at a section anchor', () => {
    expect(caseStudyHref('sme-panindio')).toBe('/projects/sme-panindio');
    expect(caseStudyHref('sme-panindio', 'ai')).toBe('/projects/sme-panindio#ai');
    expect(caseStudyHref('defensys-citizen', 'brands')).toBe('/projects/defensys-citizen#brands');
  });

  it('returns a typed route that content links accept', () => {
    expectTypeOf(caseStudyHref('defensys-responder')).toEqualTypeOf<Route<CaseStudyPath>>();
    expectTypeOf(caseStudyHref('defensys-responder', 'built')).toExtend<SiteRoute>();
  });

  it('covers every case study in content', () => {
    expect(caseStudies.map((study) => caseStudyHref(study.slug))).toEqual(
      CASE_STUDY_SLUGS.map((slug) => `/projects/${slug}`),
    );
  });
});

describe('contactHref', () => {
  it('links to the contact page, optionally preset to a topic', () => {
    expect(contactHref()).toBe('/contact');
    expect(contactHref('testimonial')).toBe('/contact?topic=testimonial');
  });

  it('has a link for every contact topic', () => {
    expect(CONTACT_TOPICS.map((topic) => contactHref(topic))).toEqual([
      '/contact?topic=hiring',
      '/contact?topic=project',
      '/contact?topic=testimonial',
      '/contact?topic=other',
    ]);
  });

  it('is the site-wide contact link', () => {
    expect(site.contactHref).toBe(contactHref());
    expectTypeOf(contactHref('hiring')).toEqualTypeOf<Route>();
  });
});

describe('page links', () => {
  it('builds the URL-synced project filters in a stable order', () => {
    expect(projectsHref()).toBe('/projects');
    expect(projectsHref({ type: 'ai' })).toBe('/projects?type=ai');
    expect(projectsHref({ context: 'company', type: 'mobile' })).toBe('/projects?type=mobile&context=company');
  });

  it('links to service blocks and About sections', () => {
    expect(servicesHref()).toBe('/services');
    expect(servicesHref('white-label')).toBe('/services#white-label');
    expect(aboutHref('credentials')).toBe('/about#credentials');
  });
});

describe('site navigation', () => {
  it('keeps the template’s seven items in order', () => {
    expect(site.nav.map((item) => [item.label, item.href])).toEqual([
      ['Home', '/'],
      ['Projects', '/projects'],
      ['Services', '/services'],
      ['Showcase', '/showcase'],
      ['Testimonials', '/testimonials'],
      ['About', '/about'],
      ['FAQs / Contact', '/contact'],
    ]);
  });

  it('matches Home exactly and every other item by prefix', () => {
    expect(site.nav.map((item) => item.match)).toEqual(['exact', ...Array<'prefix'>(6).fill('prefix')]);
  });
});
