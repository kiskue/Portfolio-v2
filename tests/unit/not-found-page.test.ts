import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import NotFound, { metadata } from '@/app/not-found';
import { LOST_SCREEN } from '@/components/sections/not-found/not-found-content';
import { getFigure } from '@/content/derived';
import { pages } from '@/content/home';

/*
 * W10b-P: the 404 inside the shell (design §8). One h1, the way back (Home, Projects and the
 * Get in touch pill), and a static map phone rendered through ScreenFigure / ScreenView.
 */

const markup = renderToStaticMarkup(createElement(NotFound));
const hrefs = [...markup.matchAll(/\shref="([^"]*)"/g)].map((match) => match[1]);

/** Text as React escapes it inside an attribute value. */
const escapeAttribute = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('404 page', () => {
  it('has exactly one h1: "This page isn’t on the map."', () => {
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(markup).toMatch(/<h1[^>]*>This page isn’t on the map\.<\/h1>/);
    expect(markup).toContain(pages['not-found'].intro);
  });

  it('links back home, to the projects and to contact', () => {
    expect(hrefs).toEqual(['/', '/projects', '/contact']);
  });

  it('shows a static map phone from the registry, captioned, with no view-transition name', () => {
    const figure = getFigure(LOST_SCREEN.figure);
    expect(markup).toContain('data-screen-figure=""');
    expect(markup).toContain(`role="img" aria-label="${escapeAttribute(figure.summary)}"`);
    expect(markup).toContain('data-size="md"');
    expect(markup).toContain(`FIG ${figure.id}`);
    expect(markup).not.toMatch(/view-transition|phone-defensys|phone-sme/);
  });

  it('has a title only (no page metadata helper, no JSON-LD)', () => {
    expect(metadata).toEqual({ title: 'Page not found' });
    expect(markup).not.toContain('application/ld+json');
  });
});
