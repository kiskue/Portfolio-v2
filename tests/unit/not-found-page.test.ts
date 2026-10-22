import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import NotFound, { metadata } from '@/app/not-found';
import { pages } from '@/content/home';

/*
 * W10b-P: the 404 inside the shell (design §8). One h1, the way back (Home, Projects and the
 * Get in touch pill), and a static map phone: MapPhone with the map's 'lost' scene (I3, S4.45).
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
    expect([...hrefs].sort()).toEqual(['/', '/contact', '/projects']);
  });

  it('shows a static map phone with the lost scene ("You are here"), captioned, with no view-transition name', () => {
    const label =
      'Map of a fictional town: a blue You are here dot at the edge of town, where the map runs out into the bay. Fictional data.';
    expect(markup).toContain('data-map-phone="lost"');
    expect(markup).toContain(`role="img" aria-label="${escapeAttribute(label)}"`);
    expect(markup).toContain('data-size="md"');
    expect(markup).toMatch(/<figcaption[^>]*><span[^>]*>FIG 404<\/span>/);
    expect(markup).toContain('>You are here<');
    expect(markup).not.toContain('data-screen-figure');
    expect(markup).not.toMatch(/view-transition|phone-defensys|phone-sme/);
  });

  it('has a title only (no page metadata helper, no JSON-LD)', () => {
    expect(metadata).toEqual({ title: 'Page not found' });
    expect(markup).not.toContain('application/ld+json');
  });
});
