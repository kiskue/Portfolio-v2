import type { NavItem, PlaceholderMode, Site } from '@/content/types';

/**
 * The canonical origin for metadataBase, canonical and Open Graph URLs, the sitemap and the
 * JSON-LD: NEXT_PUBLIC_SITE_URL, then the Vercel production domain, then the local server.
 *
 * Each value is reduced to a bare origin: a missing scheme gets https://, and a path or a
 * trailing slash is dropped, so absolute URLs never come out doubled ("…//about"). A value that
 * does not parse fails the build instead of shipping broken canonical URLs.
 */
export function resolveSiteUrl(explicit: string | undefined, vercelProductionHost: string | undefined): string {
  return (
    toOrigin(explicit, 'NEXT_PUBLIC_SITE_URL') ??
    toOrigin(vercelProductionHost, 'VERCEL_PROJECT_PRODUCTION_URL') ??
    `http://localhost:${process.env.PORT ?? '3000'}`
  );
}

function toOrigin(value: string | undefined, name: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`${name} is not a valid URL: ${JSON.stringify(value)}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${name} must be an http(s) URL: ${JSON.stringify(value)}`);
  }
  return url.origin;
}

/**
 * The placeholder mode. PLACEHOLDERS below is the switch the owner flips to go public. The
 * NEXT_PUBLIC_PLACEHOLDERS env var ('label' or 'hide') overrides it for one build, for example
 * the hide-mode build that Lighthouse's SEO audit needs (label mode is noindex by design). It is
 * NEXT_PUBLIC_ because client islands read the mode too: the client bundle must inline the same
 * value the server rendered with. Any other value fails the build rather than guess.
 */
export function resolvePlaceholderMode(value: string | undefined, fallback: PlaceholderMode): PlaceholderMode {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed === 'label' || trimmed === 'hide') return trimmed;
  throw new Error(`NEXT_PUBLIC_PLACEHOLDERS must be "label" or "hide", not ${JSON.stringify(value)}`);
}

/** 'label' shows [[placeholders]] and keeps the site noindex with no sitemap; 'hide' goes public. */
const PLACEHOLDERS: PlaceholderMode = 'label';

/** The template's seven nav items, in the template's order. */
const nav: readonly NavItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: 'house', match: 'exact' },
  { id: 'projects', label: 'Projects', href: '/projects', icon: 'folder-open', match: 'prefix' },
  { id: 'services', label: 'Services', href: '/services', icon: 'layers', match: 'prefix' },
  { id: 'showcase', label: 'Showcase', href: '/showcase', icon: 'smartphone', match: 'prefix' },
  { id: 'testimonials', label: 'Testimonials', href: '/testimonials', icon: 'message-square-quote', match: 'prefix' },
  { id: 'about', label: 'About', href: '/about', icon: 'user-round', match: 'prefix' },
  { id: 'contact', label: 'FAQs / Contact', href: '/contact', icon: 'message-circle', match: 'prefix' },
];

export const site: Site = {
  name: 'Gerric Measco',
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL),
  placeholders: resolvePlaceholderMode(process.env.NEXT_PUBLIC_PLACEHOLDERS, PLACEHOLDERS),
  asOf: '2026-10-19',
  copyrightYear: 2026,
  nav,
  contactHref: '/contact',
};

/**
 * Search and social copy (src/lib/seo.ts). The description is the site default: the root layout
 * uses it, pages without their own fall back to it, and it describes the Person in the JSON-LD.
 * It restates the Home subline (design §1) in the third person.
 */
export const seo = {
  description:
    'Gerric Measco builds offline-first, real-time mobile apps, from SOS video calls for city command centers to a pocket ERP for Filipino small businesses.',
} as const;
