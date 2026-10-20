// STUB — owned by W11, replaced in wave 2b
import type { Metadata } from 'next';

/*
 * Contract the real module keeps. Pages call pageMetadata() from their `metadata` export or
 * generateMetadata(), and render JSON-LD objects through <JsonLd> (src/components/seo/json-ld.tsx).
 * W11 fills in canonical URLs, Open Graph and Twitter fields, the label-mode noindex rule and the
 * schema.org objects; the signatures below do not change.
 */

export interface PageMetadataInput {
  /** The page title without the site name; the root layout's template adds " · Gerric Measco". */
  readonly title: string;
  readonly description: string;
  /** The page's path, e.g. '/', '/projects' or '/projects/defensys-citizen'. */
  readonly path: string;
  /** An explicit Open Graph image path; routes with an opengraph-image file need none. */
  readonly image?: string;
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  readonly path: string;
}

/** schema.org Person for the site owner. */
export function personJsonLd(): Readonly<Record<string, unknown>> {
  return { '@context': 'https://schema.org', '@type': 'Person', name: 'Gerric Measco' };
}

/** schema.org BreadcrumbList for a page trail, Home first. */
export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]): Readonly<Record<string, unknown>> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path,
    })),
  };
}
