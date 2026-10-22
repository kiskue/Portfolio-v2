import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JsonLd, serializeJsonLd } from '@/components/seo/json-ld';
import { apps } from '@/content/apps/apps';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { resolvePlaceholderMode, resolveSiteUrl, seo, site } from '@/content/site';
import { CASE_STUDY_SLUGS } from '@/content/types';
import { ph } from '@/lib/placeholder';
import { caseStudyHref } from '@/lib/routes';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  caseStudyOgImageAlt,
  caseStudyOgImagePath,
  defaultTitle,
  OG_IMAGE_SIZE,
  OG_IMAGE_TYPE,
  pageMetadata,
  personJsonLd,
  postalAddress,
  ROOT_OG_IMAGE_PATH,
  rootMetadata,
  rootOgImageAlt,
  TITLE_SEPARATOR,
  TITLE_TEMPLATE,
} from '@/lib/seo';

/*
 * The SEO helpers (PLAN.md → SEO; W11). Mode-dependent behaviour (robots, sitemap, noindex) is
 * in seo-modes.test.ts and the route/sitemap parity in seo-sitemap.test.ts.
 */

const ORIGIN = new URL(site.url).origin;

/** Every string value in a JSON-able tree. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('resolveSiteUrl (metadataBase)', () => {
  it('prefers NEXT_PUBLIC_SITE_URL, then the Vercel production domain', () => {
    expect(resolveSiteUrl('https://gerric.example.com', 'portfolio.vercel.app')).toBe('https://gerric.example.com');
    expect(resolveSiteUrl(undefined, 'portfolio.vercel.app')).toBe('https://portfolio.vercel.app');
    expect(resolveSiteUrl('   ', 'portfolio.vercel.app')).toBe('https://portfolio.vercel.app');
  });

  it('falls back to the local server when neither is set', () => {
    const url = new URL(resolveSiteUrl(undefined, undefined));
    expect(url.protocol).toBe('http:');
    expect(url.hostname).toBe('localhost');
    expect(url.pathname).toBe('/');
  });

  it('reduces any value to a bare origin, adding https:// when the scheme is missing', () => {
    expect(resolveSiteUrl('example.com/', undefined)).toBe('https://example.com');
    expect(resolveSiteUrl('https://example.com/some/path/?q=1#x', undefined)).toBe('https://example.com');
    expect(resolveSiteUrl('  HTTPS://Example.com  ', undefined)).toBe('https://example.com');
    expect(resolveSiteUrl(undefined, 'example.com')).toBe('https://example.com');
  });

  it('fails the build on a value that is not an http(s) URL', () => {
    expect(() => resolveSiteUrl('https://exa mple.com', undefined)).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() => resolveSiteUrl('ftp://example.com', undefined)).toThrow(/http\(s\)/);
  });

  it('gives site.url as an origin', () => {
    expect(site.url).toBe(ORIGIN);
  });
});

describe('resolvePlaceholderMode', () => {
  it('keeps the code default unless NEXT_PUBLIC_PLACEHOLDERS names a mode', () => {
    expect(resolvePlaceholderMode(undefined, 'label')).toBe('label');
    expect(resolvePlaceholderMode('', 'label')).toBe('label');
    expect(resolvePlaceholderMode(' hide ', 'label')).toBe('hide');
    expect(resolvePlaceholderMode('label', 'hide')).toBe('label');
  });

  it('fails on anything else instead of guessing', () => {
    expect(() => resolvePlaceholderMode('hidden', 'label')).toThrow(/"label" or "hide"/);
  });
});

describe('absoluteUrl', () => {
  it('resolves root-relative paths against the site origin', () => {
    expect(absoluteUrl('/')).toBe(`${ORIGIN}/`);
    expect(absoluteUrl('/about')).toBe(`${ORIGIN}/about`);
    expect(absoluteUrl('/projects/sme-panindio', 'https://example.com')).toBe('https://example.com/projects/sme-panindio');
  });

  it('refuses anything that could leave the site', () => {
    for (const path of ['about', '//evil.example.com/x', 'https://example.com/']) {
      expect(() => absoluteUrl(path)).toThrow(/root-relative/);
    }
  });
});

describe('titles and alt text', () => {
  it('appends " · Gerric Measco" to page titles', () => {
    expect(TITLE_TEMPLATE).toBe('%s · Gerric Measco');
    expect(TITLE_SEPARATOR).toBe(' · ');
  });

  it('defaults to the name and the positioning title', () => {
    expect(defaultTitle()).toBe(`Gerric Measco — ${profile.title}`);
  });

  it('describes the site card with the headline and every app', () => {
    const alt = rootOgImageAlt();
    expect(alt).toContain(site.name);
    expect(alt).toContain(home.headline.join(' '));
    for (const app of apps) expect(alt).toContain(app.name);
    expect(alt).not.toContain('[[');
  });

  it('names a case-study card after the page', () => {
    expect(caseStudyOgImageAlt('SME Panindio')).toBe('SME Panindio, a case study by Gerric Measco');
  });
});

describe('rootMetadata (the root layout)', () => {
  const metadata = rootMetadata('label');

  it('sets metadataBase from site.url and the title template', () => {
    expect(String(metadata.metadataBase)).toBe(`${ORIGIN}/`);
    expect(metadata.title).toEqual({ default: defaultTitle(), template: TITLE_TEMPLATE });
    expect(metadata.description).toBe(seo.description);
  });

  it('sets nothing a page could wrongly inherit: no canonical, og:url, og:title or og:description', () => {
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toEqual({ type: 'website', siteName: site.name });
    expect(metadata.twitter).toEqual({ card: 'summary_large_image' });
  });
});

describe('pageMetadata', () => {
  const services = pageMetadata({ title: 'Services', description: 'Five ways I can help.', path: '/services' });

  it('sets the title, description and a canonical URL resolved against metadataBase', () => {
    expect(services.title).toBe('Services');
    expect(services.description).toBe('Five ways I can help.');
    expect(services.alternates).toEqual({ canonical: '/services' });
  });

  it('sets the Open Graph and Twitter fields, with the site card on routes without their own', () => {
    const image = { url: ROOT_OG_IMAGE_PATH, alt: rootOgImageAlt(), ...OG_IMAGE_SIZE, type: OG_IMAGE_TYPE };
    expect(services.openGraph).toEqual({
      type: 'website',
      siteName: site.name,
      url: '/services',
      title: 'Services · Gerric Measco',
      description: 'Five ways I can help.',
      images: [image],
    });
    expect(services.twitter).toEqual({
      card: 'summary_large_image',
      title: 'Services · Gerric Measco',
      description: 'Five ways I can help.',
      images: [{ url: image.url, alt: image.alt }],
    });
  });

  it('gives each case study its own card', () => {
    for (const slug of CASE_STUDY_SLUGS) {
      const metadata = pageMetadata({ title: 'A case study', description: 'Summary.', path: caseStudyHref(slug) });
      const images = metadata.openGraph?.images;
      expect(images).toEqual([
        { url: caseStudyOgImagePath(slug), alt: caseStudyOgImageAlt('A case study'), ...OG_IMAGE_SIZE, type: OG_IMAGE_TYPE },
      ]);
      expect(caseStudyOgImagePath(slug)).toBe(`/projects/${slug}/opengraph-image`);
    }
  });

  it('drops the query and #anchor from canonical and og:url', () => {
    const projects = pageMetadata({ title: 'Projects', description: 'All work.', path: '/projects?type=ai#list' });
    expect(projects.alternates).toEqual({ canonical: '/projects' });
    expect(projects.openGraph).toMatchObject({ url: '/projects' });
    const anchored = pageMetadata({ title: 'SME Panindio', description: 'x', path: '/projects/sme-panindio#ai' });
    expect(anchored.openGraph).toMatchObject({ images: [{ url: '/projects/sme-panindio/opengraph-image' }] });
  });

  it('uses an explicit image when given one', () => {
    const metadata = pageMetadata({ title: 'About', description: 'Me.', path: '/about', image: '/about-card.png' });
    expect(metadata.openGraph).toMatchObject({ images: [{ url: '/about-card.png', alt: 'About' }] });
    expect(metadata.twitter).toMatchObject({ images: [{ url: '/about-card.png', alt: 'About' }] });
  });

  it('never puts a placeholder token into metadata', () => {
    const metadata = pageMetadata({ title: ph('Page title'), description: ph('Intro'), path: '/about' });
    expect(metadata).not.toHaveProperty('title');
    expect(metadata.description).toBe(seo.description);
    expect(strings(metadata).some((text) => text.includes('[['))).toBe(false);
    expect(metadata.openGraph).toMatchObject({ title: defaultTitle() });
  });

  it('leaves robots to the root layout, so label mode stays noindex on every page', () => {
    expect(services).not.toHaveProperty('robots');
  });

  it('refuses a path that is not root-relative', () => {
    expect(() => pageMetadata({ title: 'X', description: 'Y', path: 'services' })).toThrow(/root-relative/);
  });
});

describe('personJsonLd', () => {
  const person = personJsonLd();

  it('is a full schema.org Person built from the profile', () => {
    expect(person).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${ORIGIN}/#person`,
      name: 'Gerric Measco',
      url: `${ORIGIN}/`,
      jobTitle: profile.title,
      description: seo.description,
      email: 'gerricmeasco360@gmail.com',
      address: { '@type': 'PostalAddress', addressLocality: 'Taguig City', addressCountry: 'PH' },
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'Taguig City University' },
      sameAs: ['https://github.com/kiskue', 'https://www.linkedin.com/in/gerric-measco-39a0a722a/'],
    });
  });

  it('carries only absolute URLs and no placeholder tokens', () => {
    for (const text of strings(person)) expect(text).not.toContain('[[');
    for (const url of [person['@id'], person.url, ...(person.sameAs as string[])]) {
      expect(String(url)).toMatch(/^https?:\/\//);
    }
  });
});

describe('postalAddress', () => {
  it('splits "City, CC" into a locality and a country code', () => {
    expect(postalAddress('Taguig City, PH')).toEqual({ '@type': 'PostalAddress', addressLocality: 'Taguig City', addressCountry: 'PH' });
  });

  it('keeps only what it can read', () => {
    expect(postalAddress('Metro Manila')).toEqual({ '@type': 'PostalAddress', addressLocality: 'Metro Manila' });
    expect(postalAddress('Taguig, Metro Manila')).toEqual({ '@type': 'PostalAddress', addressLocality: 'Taguig' });
  });
});

describe('breadcrumbJsonLd', () => {
  const expected = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Projects', item: `${ORIGIN}/projects` },
      { '@type': 'ListItem', position: 3, name: 'SME Panindio', item: `${ORIGIN}/projects/sme-panindio` },
    ],
  };

  it('builds a Home-first trail with absolute URLs', () => {
    expect(
      breadcrumbJsonLd([
        { name: 'Projects', path: '/projects' },
        { name: 'SME Panindio', path: '/projects/sme-panindio' },
      ]),
    ).toEqual(expected);
  });

  it('does not repeat Home when the caller already starts with it', () => {
    expect(
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Projects', path: '/projects' },
        { name: 'SME Panindio', path: '/projects/sme-panindio' },
      ]),
    ).toEqual(expected);
  });
});

describe('JsonLd', () => {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const tricky = { name: '</script><script>alert(1)</script>', note: 'a & b > c', sep: `line${LS}para${PS}end` };

  it('escapes <, >, & and the JavaScript line separators, and stays the same JSON', () => {
    const json = serializeJsonLd(tricky);
    for (const raw of ['<', '>', '&', LS, PS]) expect(json).not.toContain(raw);
    expect(JSON.parse(json)).toEqual(tricky);
  });

  it('renders one application/ld+json script that nothing inside can close', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: tricky }));
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const body = html.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    expect(JSON.parse(body)).toEqual(tricky);
  });

  it('renders the Person as valid JSON', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: personJsonLd() }));
    const body = html.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    expect(JSON.parse(body)).toEqual(personJsonLd());
  });
});
