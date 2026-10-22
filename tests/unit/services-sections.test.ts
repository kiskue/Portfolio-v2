import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ServicesPage, { metadata } from '@/app/services/page';
import { CtaBand } from '@/components/content/cta-band';
import { EngagementCards, engagementLook } from '@/components/sections/services/engagement-cards';
import { ProcessSteps } from '@/components/sections/services/process-steps';
import { ServiceBlocks } from '@/components/sections/services/service-blocks';
import { caseStudyBySlug } from '@/content/derived';
import { callsToAction, pages } from '@/content/home';
import { engagements, processSteps, services } from '@/content/services';
import type { Engagement, Service } from '@/content/types';
import { ph } from '@/lib/placeholder';
import { caseStudyHref, contactHref, servicesHref } from '@/lib/routes';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

/*
 * W10b-P: the /services compositions (design §8). Anchors are the ServiceIds that the Home
 * Services card links to; placeholders follow label and hide mode; the CTAs carry the right
 * contact topic.
 */

const html = (element: ReactElement) => renderToStaticMarkup(element);

/** The value of every `attribute="…"` in the markup, in order. */
function attributeValues(markup: string, attribute: string): string[] {
  return [...markup.matchAll(new RegExp(`\\s${attribute}="([^"]*)"`, 'g'))].map((match) => match[1] ?? '');
}

/** The attribute text of every <a> tag (attribute order varies with how props are spread). */
function anchorTags(markup: string): string[] {
  return [...markup.matchAll(/<a\s([^>]*)>/g)].map((match) => match[1] ?? '');
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag);
  return match ? (match[1] ?? '') : null;
}

/** The JSON-LD objects rendered in the markup. */
function jsonLd(markup: string): unknown[] {
  return [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) =>
    JSON.parse((match[1] ?? '').replace(/\\u003c/g, '<')),
  );
}

describe('ServiceBlocks', () => {
  const label = html(createElement(ServiceBlocks, { services, mode: 'label' }));
  const hide = html(createElement(ServiceBlocks, { services, mode: 'hide' }));

  it('anchors each block at its ServiceId, in content order, under an h2', () => {
    expect(attributeValues(label, 'id')).toEqual(services.map((service) => service.id));
    expect(label.match(/<h2[ >]/g)).toHaveLength(services.length);
    for (const service of services) {
      expect(servicesHref(service.id)).toBe(`/services#${service.id}`);
      expect(label).toContain(service.title.replace(/&/g, '&amp;'));
    }
  });

  it('links every block to its proof in a case study', () => {
    const proofs = anchorTags(label)
      .filter((tag) => attribute(tag, 'data-proof') !== null)
      .map((tag) => attribute(tag, 'href'));
    expect(proofs).toEqual(services.map((service) => caseStudyHref(service.proof.slug, service.proof.anchor)));
    for (const service of services) expect(label).toContain(`${caseStudyBySlug(service.proof.slug).title} case study`);
  });

  it('marks the engagement placeholder in label mode and drops the whole line in hide mode', () => {
    expect(label.match(/data-engagement=""/g)).toHaveLength(services.length);
    expect(label).toContain('<mark class="ph');
    expect(hide).not.toContain('data-engagement');
    expect(hide).not.toContain('Engagement:');
    expect(hide).not.toContain('<mark');
    expect(hide).not.toContain('[[');
  });

  it('keeps the confirmed copy in hide mode: good-fit bullets, deliverables and stack', () => {
    const [first] = services;
    if (!first) throw new Error('no services');
    expect(hide).toContain('Good fit if…');
    expect(hide).toContain('Deliverables');
    expect(hide).toContain(first.stack[0]);
  });

  it('skips placeholder bullets in hide mode and shows the Example tag only in label mode', () => {
    const base = services[0] as Service;
    const fixture: Service = { ...base, example: true, deliverables: [ph('Deliverable to confirm'), 'A real deliverable'] };
    const labelled = html(createElement(ServiceBlocks, { services: [fixture], mode: 'label' }));
    const hidden = html(createElement(ServiceBlocks, { services: [fixture], mode: 'hide' }));
    expect(labelled).toContain('Deliverable to confirm');
    expect(labelled).toContain('>Example<');
    expect(hidden).not.toContain('Deliverable to confirm');
    expect(hidden).toContain('A real deliverable');
    expect(hidden).not.toContain('>Example<');
  });
});

describe('ProcessSteps', () => {
  it('lists Discover → Design → Build → Ship → Support in order, numbered', () => {
    const markup = html(createElement(ProcessSteps, { steps: processSteps, mode: 'label' }));
    const titles = [...markup.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((match) => match[1]);
    expect(titles).toEqual(['Discover', 'Design', 'Build', 'Ship', 'Support']);
    expect(markup).toMatch(/<ol[ >]/);
    expect(markup).toContain('>01<');
    expect(markup).toContain('>05<');
    expect(markup).toMatch(/<h2 id="process-title"/);
  });

  it('marks the placeholder bodies in label mode; hide mode keeps only the titles', () => {
    const label = html(createElement(ProcessSteps, { steps: processSteps, mode: 'label' }));
    const hide = html(createElement(ProcessSteps, { steps: processSteps, mode: 'hide' }));
    expect(label.match(/<mark class="ph/g)).toHaveLength(processSteps.length);
    expect(hide).not.toContain('<mark');
    expect(hide).not.toContain('[[');
    for (const step of processSteps) expect(hide).toContain(`>${step.title}<`);
  });
});

describe('EngagementCards', () => {
  const label = html(createElement(EngagementCards, { engagements, mode: 'label' }));

  it('sends each card to the contact form with the matching topic', () => {
    expect(attributeValues(label, 'href')).toEqual(engagements.map((engagement) => engagementLook(engagement.id).href));
    expect(engagementLook('full-time').href).toBe(contactHref('hiring'));
    expect(engagementLook('contract').href).toBe(contactHref('project'));
    expect(engagementLook('fixed-scope').href).toBe(contactHref('project'));
    expect(engagementLook('something-new').href).toBe(contactHref('other'));
  });

  it('is one stretched link per card, with the placeholder terms marked in label mode only', () => {
    expect(label.match(/<a /g)).toHaveLength(engagements.length);
    expect(label).toContain('after:absolute');
    expect(label.match(/<mark class="ph/g)).toHaveLength(engagements.length);
    const hide = html(createElement(EngagementCards, { engagements, mode: 'hide' }));
    expect(hide).not.toContain('<mark');
    expect(hide).not.toContain('[[');
    for (const engagement of engagements) expect(hide).toContain(engagement.title);
  });

  it('renders nothing when there are no engagement models', () => {
    expect(html(createElement(EngagementCards, { engagements: [] as Engagement[], mode: 'label' }))).toBe('');
  });
});

describe('CtaBand', () => {
  it('closes /services with the project topic', () => {
    const markup = html(createElement(CtaBand, { cta: callsToAction.services, headingId: 'cta' }));
    expect(callsToAction.services.cta?.href).toBe(contactHref('project'));
    expect(markup).toMatch(/<section aria-labelledby="cta"/);
    expect(markup).toMatch(/<h2 id="cta"[^>]*>Have a project in mind\?<\/h2>/);
    expect(attributeValues(markup, 'href')).toEqual(['/contact?topic=project']);
  });
});

describe('/services page', () => {
  const markup = html(createElement(ServicesPage));

  it('has one h1 and every section, in design order', () => {
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    const order = ['id="mobile-apps"', 'data-section="process"', 'data-section="engagements"', 'data-section="cta"'];
    const positions = order.map((needle) => markup.indexOf(needle));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('exports its metadata through pageMetadata and renders a BreadcrumbList', () => {
    expect(metadata).toEqual(pageMetadata({ title: pages.services.title, description: pages.services.intro, path: '/services' }));
    expect(jsonLd(markup)).toContainEqual(
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
      ]),
    );
  });
});
