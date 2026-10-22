import type { Metadata, MetadataRoute } from 'next';
import { apps } from '@/content/apps/apps';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { seo, site } from '@/content/site';
import { CASE_STUDY_SLUGS, type CaseStudySlug, type PlaceholderMode } from '@/content/types';
import { fieldOrNull } from '@/lib/placeholder';
import { caseStudyHref } from '@/lib/routes';

/*
 * SEO (PLAN.md → Architecture → SEO; placeholders → label mode is noindex with no sitemap).
 *
 * Pages export `pageMetadata({ title, description, path })` from `metadata` or
 * generateMetadata(), and pages with a trail render <JsonLd data={breadcrumbJsonLd([...])} />.
 * The root layout takes rootMetadata() and renders personJsonLd(). src/app/robots.ts and
 * src/app/sitemap.ts call robotsFor() and sitemapFor() with the site's placeholder mode.
 *
 * Paths stay root-relative in metadata: Next resolves them against metadataBase (site.url).
 * Structured data has no metadataBase, so the JSON-LD builders make every URL absolute here.
 * Placeholder tokens from content never reach titles, descriptions or the Person JSON-LD, in
 * either mode: machines read these, and a "[[…]]" is never a real value.
 */

// ─── Shared values ───────────────────────────────────────────────────────────────────────

/** Between a page title and the site name: "Services · Gerric Measco". */
export const TITLE_SEPARATOR = ' · ';
/** The root layout's title template. */
export const TITLE_TEMPLATE = `%s${TITLE_SEPARATOR}${site.name}`;

/** Every Open Graph image is a 1200×630 PNG, the size Facebook, LinkedIn and X all crop well. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_TYPE = 'image/png';
/** The site-wide card, src/app/opengraph-image.tsx. */
export const ROOT_OG_IMAGE_PATH = '/opengraph-image';

/** One case study's card, src/app/projects/[slug]/opengraph-image.tsx. */
export function caseStudyOgImagePath(slug: CaseStudySlug): string {
  return `${caseStudyHref(slug)}/opengraph-image`;
}

/** Text that may go into metadata: null for blanks and for placeholder tokens, in any mode. */
function metaText(value: string | null | undefined): string | null {
  const text = fieldOrNull(value, 'hide');
  return text === null ? null : text.replace(/\s+/g, ' ').trim();
}

/** The site title when a page sets none: "Gerric Measco — Mobile & full-stack engineer". */
export function defaultTitle(): string {
  const title = metaText(profile.title);
  return title ? `${site.name} — ${title}` : site.name;
}

/** "Gerric Measco, Mobile & full-stack engineer: “Mobile apps …”" — the site card's alt text. */
export function rootOgImageAlt(): string {
  const who = [site.name, metaText(profile.title)].filter(Boolean).join(', ');
  // "A, B and C": the site's copy uses no serial comma.
  const listed = new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(apps.map((app) => app.name));
  return `${who}: “${home.headline.join(' ')}” Colour bars for ${listed}.`;
}

/** A case-study card's alt text, from the page title: "SME Panindio, a case study by Gerric Measco". */
export function caseStudyOgImageAlt(title: string): string {
  return `${title}, a case study by ${site.name}`;
}

/**
 * Paths are root-relative ("/about"). A protocol-relative "//host" or a full URL is refused, so
 * no canonical, og:url or JSON-LD URL can point off-site.
 */
function assertRootRelative(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`Expected a root-relative path like "/about", got ${JSON.stringify(path)}`);
  }
}

/** An absolute URL on this site: absoluteUrl('/about') → "https://<origin>/about". */
export function absoluteUrl(path: string, origin: string = site.url): string {
  assertRootRelative(path);
  return new URL(path, origin).href;
}

/**
 * The page's own path for canonical and og:url: no query (filters), no #anchor, and no trailing
 * slash (the site serves /about, not /about/).
 */
function canonicalPath(path: string): string {
  assertRootRelative(path);
  const bare = path.split(/[?#]/, 1)[0] ?? path;
  return bare.length > 1 ? bare.replace(/\/+$/, '') || '/' : bare;
}

function caseStudySlugOf(path: string): CaseStudySlug | null {
  return CASE_STUDY_SLUGS.find((slug) => caseStudyHref(slug) === path) ?? null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────────────────

/** Label mode keeps every page out of search results; hide mode is public. */
export function robotsMetadata(mode: PlaceholderMode): NonNullable<Metadata['robots']> {
  return mode === 'label' ? { index: false, follow: false } : { index: true, follow: true };
}

/**
 * The root layout's metadata. It sets no canonical, og:url, og:title or og:description: Next
 * hands a layout's fields to every page that sets none, and a site-wide canonical or og:url of
 * "/" would claim every page is Home. Pages add those through pageMetadata(); a page that does
 * not gets og:title and og:description from its own title and description, and the site card
 * from src/app/opengraph-image.tsx.
 */
export function rootMetadata(mode: PlaceholderMode = site.placeholders): Metadata {
  return {
    metadataBase: new URL(site.url),
    title: { default: defaultTitle(), template: TITLE_TEMPLATE },
    description: seo.description,
    applicationName: site.name,
    authors: [{ name: site.name, url: '/' }],
    creator: site.name,
    openGraph: { type: 'website', siteName: site.name },
    twitter: { card: 'summary_large_image' },
    robots: robotsMetadata(mode),
  };
}

export interface PageMetadataInput {
  /** The page title without the site name; pageMetadata() appends " · Gerric Measco". */
  readonly title: string;
  readonly description: string;
  /** The page's path, e.g. '/', '/projects' or '/projects/defensys-citizen'. */
  readonly path: string;
  /** An explicit Open Graph image path; routes with an opengraph-image file need none. */
  readonly image?: string;
}

type OgImage = { readonly url: string; readonly alt: string; readonly width?: number; readonly height?: number; readonly type?: string };

/**
 * The page's card. Case studies have their own (src/app/projects/[slug]/opengraph-image.tsx);
 * every other route shows the site card. The image is always set explicitly: a page's
 * `openGraph` replaces the layout's whole object, so without it a page would lose the site card.
 */
function ogImageFor(path: string, title: string, explicit: string | undefined): OgImage {
  if (explicit) return { url: explicit, alt: title };
  const slug = caseStudySlugOf(path);
  const card = { ...OG_IMAGE_SIZE, type: OG_IMAGE_TYPE };
  return slug
    ? { url: caseStudyOgImagePath(slug), alt: caseStudyOgImageAlt(title), ...card }
    : { url: ROOT_OG_IMAGE_PATH, alt: rootOgImageAlt(), ...card };
}

/**
 * A page's metadata: title, description, canonical URL, and the Open Graph and Twitter fields.
 * URLs stay root-relative and resolve against metadataBase. The query and #anchor are dropped
 * from canonical and og:url (/projects?type=ai is /projects). A description that is blank or a
 * placeholder token falls back to the site description.
 *
 * The title is returned whole ("Services · Gerric Measco") as `absolute`: the root layout's
 * template only reaches child segments, so Home, which shares the root segment, would otherwise
 * lose the suffix. Document title, og:title and twitter:title are always the same string.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const path = canonicalPath(input.path);
  const title = metaText(input.title);
  const description = metaText(input.description) ?? seo.description;
  const fullTitle = title ? `${title}${TITLE_SEPARATOR}${site.name}` : defaultTitle();
  const image = ogImageFor(path, title ?? site.name, input.image?.trim() || undefined);
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: site.name,
      url: path,
      title: fullTitle,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}

// ─── robots.txt and sitemap.xml ──────────────────────────────────────────────────────────

/**
 * robots.txt. Hide mode allows everything and names the sitemap. Label mode names no sitemap and
 * still allows crawling: every page carries a noindex robots meta, and a crawler only sees that
 * meta on pages robots.txt lets it fetch. A "Disallow: /" would hide the noindex, and a blocked
 * URL that is linked from elsewhere can still be indexed without its content.
 */
export function robotsFor(mode: PlaceholderMode, origin: string = site.url): MetadataRoute.Robots {
  const rules = { userAgent: '*', allow: '/' };
  return mode === 'hide' ? { rules, sitemap: absoluteUrl('/sitemap.xml', origin) } : { rules };
}

/** Every page the sitemap lists: the nav routes, then the case studies. Never anything under /dev. */
export function sitemapPaths(): readonly string[] {
  const paths = [...site.nav.map((item) => String(item.href)), ...CASE_STUDY_SLUGS.map((slug) => caseStudyHref(slug))];
  return [...new Set(paths)].filter((path) => path !== '/dev' && !path.startsWith('/dev/'));
}

/** The sitemap in hide mode; null in label mode, where the site has none (sitemap.xml is a 404). */
export function sitemapFor(mode: PlaceholderMode, origin: string = site.url): MetadataRoute.Sitemap | null {
  if (mode === 'label') return null;
  return sitemapPaths().map((path) => ({ url: absoluteUrl(path, origin) }));
}

// ─── JSON-LD ─────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  readonly name: string;
  readonly path: string;
}

/** "Taguig City, PH" → locality "Taguig City", country "PH" (a two-letter code after the last comma). */
export function postalAddress(location: string): Readonly<Record<string, string>> {
  const comma = location.lastIndexOf(',');
  const locality = (comma === -1 ? location : location.slice(0, comma)).trim();
  const country = comma === -1 ? '' : location.slice(comma + 1).trim();
  return {
    '@type': 'PostalAddress',
    ...(locality ? { addressLocality: locality } : {}),
    ...(/^[A-Z]{2}$/.test(country) ? { addressCountry: country } : {}),
  };
}

/** schema.org Person for the site owner. */
export function personJsonLd(): Readonly<Record<string, unknown>> {
  const homeUrl = absoluteUrl('/');
  const jobTitle = metaText(profile.title);
  const sameAs = profile.links.filter((link) => link.id !== 'email').map((link) => link.href);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${homeUrl}#person`,
    name: profile.name,
    url: homeUrl,
    ...(jobTitle ? { jobTitle } : {}),
    description: seo.description,
    email: profile.email,
    address: postalAddress(profile.location),
    alumniOf: { '@type': 'CollegeOrUniversity', name: profile.education.school },
    sameAs,
  };
}

/**
 * schema.org BreadcrumbList for a page trail, Home first. Callers may pass the trail with or
 * without Home: when the first item is not "/", Home is put in front.
 */
export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]): Readonly<Record<string, unknown>> {
  const homeLabel = site.nav.find((item) => item.href === '/')?.label ?? 'Home';
  const trail = items[0]?.path === '/' ? items : [{ name: homeLabel, path: '/' }, ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(canonicalPath(item.path)),
    })),
  };
}
