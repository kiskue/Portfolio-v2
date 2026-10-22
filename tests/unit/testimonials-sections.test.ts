import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TestimonialsPage, { metadata } from '@/app/testimonials/page';
import { QuoteGrid } from '@/components/sections/testimonials/quote-grid';
import { TestimonialsContent } from '@/components/sections/testimonials/testimonials-content';
import { callsToAction, emptyStates, pages } from '@/content/home';
import { testimonials } from '@/content/testimonials';
import type { Testimonial } from '@/content/types';
import { contactHref } from '@/lib/routes';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

/*
 * W10b-P: /testimonials (design §8). Label mode shows the generic Example quotes with their
 * Example tag and the "Leave a note" band; hide mode drops every example and shows the empty
 * state, which carries the same testimonial-topic link.
 */

const html = (element: ReactElement) => renderToStaticMarkup(element);

const hrefs = (markup: string) => [...markup.matchAll(/\shref="([^"]*)"/g)].map((match) => match[1]);

const real: Testimonial = {
  id: 'real',
  quote: 'A real note.',
  name: 'Ana Reyes',
  role: 'Product lead · Example Co.',
  tags: ['Mobile app'],
};

describe('TestimonialsContent', () => {
  it('label mode: every example quote card carries its Example tag, then the Leave a note band', () => {
    const markup = html(createElement(TestimonialsContent, { testimonials, labelledBy: 'title', mode: 'label' }));
    expect(markup).toMatch(/<ul aria-labelledby="title"/);
    expect(markup.match(/<blockquote/g)).toHaveLength(testimonials.length);
    expect(markup.match(/>Example</g)).toHaveLength(testimonials.length);
    expect(markup).toContain('<mark class="ph');
    expect(markup).toContain(callsToAction.testimonials.title);
    expect(markup).toContain('data-section="cta"');
    expect(markup).not.toContain('data-empty-state');
    expect(hrefs(markup)).toEqual([contactHref('testimonial')]);
  });

  it('hide mode: no examples, no placeholder marks, only the empty state and its one contact link', () => {
    const markup = html(createElement(TestimonialsContent, { testimonials, mode: 'hide' }));
    expect(markup).toContain('data-empty-state="testimonials"');
    expect(markup).toContain(emptyStates.testimonials.title);
    expect(markup).not.toContain('<blockquote');
    expect(markup).not.toContain('>Example<');
    expect(markup).not.toContain('<mark');
    expect(markup).not.toContain('[[');
    expect(markup).not.toContain('data-section="cta"');
    expect(hrefs(markup)).toEqual(['/contact?topic=testimonial']);
  });

  it('hide mode keeps real testimonials, with the band under them', () => {
    const markup = html(createElement(TestimonialsContent, { testimonials: [...testimonials, real], mode: 'hide' }));
    expect(markup.match(/<blockquote/g)).toHaveLength(1);
    expect(markup).toContain('A real note.');
    expect(markup).toContain('>AR<');
    expect(markup).toContain('data-section="cta"');
    expect(markup).not.toContain('data-empty-state');
  });

  it('never renders hidden testimonials', () => {
    const markup = html(createElement(TestimonialsContent, { testimonials: [{ ...real, hidden: true }], mode: 'label' }));
    expect(markup).toContain('data-empty-state="testimonials"');
  });
});

describe('QuoteGrid', () => {
  it('is a list of full quote cards, 1 / 2 / 3 columns', () => {
    const markup = html(createElement(QuoteGrid, { testimonials: [real], mode: 'label' }));
    expect(markup).toMatch(/^<ul[^>]*class="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3"/);
    expect(markup).toMatch(/<li class="[^"]*rounded-card/);
  });
});

describe('/testimonials page', () => {
  const markup = html(createElement(TestimonialsPage));

  it('names the quote list with its one h1', () => {
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(markup).toMatch(/<h1 id="testimonials-title"/);
    expect(markup).toMatch(/<ul aria-labelledby="testimonials-title"/);
  });

  it('links Leave a note to the testimonial topic', () => {
    expect(callsToAction.testimonials.cta).toEqual({ label: 'Leave a note', href: '/contact?topic=testimonial' });
    expect(hrefs(markup)).toContain('/contact?topic=testimonial');
  });

  it('exports its metadata through pageMetadata and renders a BreadcrumbList', () => {
    expect(metadata).toEqual(
      pageMetadata({ title: pages.testimonials.title, description: pages.testimonials.intro, path: '/testimonials' }),
    );
    const script = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(markup)?.[1] ?? '';
    expect(JSON.parse(script.replace(/\\u003c/g, '<'))).toEqual(
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Testimonials', path: '/testimonials' },
      ]),
    );
  });
});
