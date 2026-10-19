import type { NavItem, Site } from '@/content/types';

/** NEXT_PUBLIC_SITE_URL, then the Vercel production domain, then the local dev server. */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return `http://localhost:${process.env.PORT ?? '3000'}`;
}

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
  url: resolveSiteUrl(),
  /** 'label' shows [[placeholders]] and keeps the site noindex; switch to 'hide' to go public. */
  placeholders: 'label',
  asOf: '2026-10-19',
  copyrightYear: 2026,
  nav,
  contactHref: '/contact',
};
