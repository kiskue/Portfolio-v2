import type { NumberedListItem } from '@/components/ui/numbered-list';
import type { SegmentedOption } from '@/components/ui/segmented-control';
import type { Project, StoreListing, Testimonial, ToolGlyph } from '@/content/types';
import { SIMPLE_ICON_KEYS } from '@/content/types';
import { ph } from '@/lib/placeholder';
import { servicesHref } from '@/lib/routes';

/*
 * Fictional sample data for the /dev/ui gallery, typed against the frozen content model so the
 * gallery keeps compiling whatever the narrative content becomes. Nothing here is real.
 */

/** One case study, one destination: a whole-card link. Six stack items collapse to "+2". */
export const caseStudyProject: Project = {
  slug: 'sample-offline-app',
  title: 'Sample Offline App',
  summary: 'A fictional offline-first app used to check the case-study card: summary, status, stack and the call to action.',
  context: 'personal',
  role: 'Solo: design, mobile and backend',
  ownership: 'sole',
  types: ['mobile', 'ai'],
  status: 'beta',
  statusLabel: 'Private beta',
  stack: ['React Native', 'Expo', 'TypeScript', 'SQLite', 'NestJS', 'FastAPI'],
  icon: 'store',
  links: [{ kind: 'case-study', slug: 'sme-panindio' }],
  caseStudy: 'sme-panindio',
  period: ph('YYYY – present'),
};

/** Several destinations, one still a placeholder URL: explicit links, no whole-card link. */
export const moreWorkProject: Project = {
  slug: 'sample-browser-extension',
  example: true,
  title: 'Sample Browser Extension',
  summary: 'A fictional prototype with a placeholder repository link and a store page.',
  context: 'personal',
  role: 'Solo',
  ownership: 'sole',
  types: ['web', 'ai'],
  status: 'prototype',
  statusLabel: 'Prototype',
  stack: ['TypeScript', 'Chrome MV3'],
  icon: 'captions',
  links: [
    { kind: 'repo', href: ph('Repository URL'), label: 'Source code' },
    { kind: 'store-page', platform: 'play', href: 'https://play.google.com/store/apps' },
  ],
};

/** Company work with a placeholder role and a single case-study destination. */
export const companyProject: Project = {
  slug: 'sample-field-app',
  title: 'Sample Field App',
  summary: 'A fictional company project: role still a placeholder, one case study to read.',
  context: 'company',
  company: 'Example Co.',
  role: ph('Your title'),
  ownership: 'contributor',
  types: ['mobile'],
  status: 'live',
  statusLabel: 'Live on the stores',
  stack: ['React Native', 'WebRTC', 'Socket.IO'],
  icon: 'shield-check',
  links: [{ kind: 'case-study', slug: 'defensys-citizen' }],
  caseStudy: 'defensys-citizen',
};

export const exampleTestimonial: Testimonial = {
  id: 'sample-example',
  example: true,
  quote: 'Example: a short note from someone I have worked with will appear here.',
  name: ph('Client name'),
  role: ph('Role · Company'),
  tags: ['Mobile app', 'Offline-first'],
};

export const filledTestimonial: Testimonial = {
  id: 'sample-filled',
  quote:
    'Sample quote to check the typography: two or three sentences about working together, long enough to wrap onto several lines at every width.',
  name: 'Sample Reviewer',
  role: 'Product lead · Example Co.',
  tags: ['Mobile app'],
  project: 'sme-panindio',
};

/** A fictional listing; the app icon route (/icon.svg) stands in for a store icon. */
export const sampleListing: StoreListing = {
  id: 'smile-safe-taytay.play',
  brand: 'smile-safe-taytay',
  platform: 'play',
  name: 'Sample Safety App',
  url: 'https://play.google.com/store/apps',
  publisher: 'Example publisher',
  installs: '5K+',
  rating: { value: 4.2, count: 27 },
  asOf: '2026-10-19',
  icon: { src: '/icon.svg', width: 64, height: 64 },
  screenshots: [],
};

export const sampleAppStoreListing: StoreListing = {
  ...sampleListing,
  id: 'smile-safe-taytay.appstore',
  platform: 'appstore',
  name: 'Sample Safety App with a longer name',
  url: 'https://apps.apple.com/',
  installs: null,
};

export const serviceRows: readonly NumberedListItem[] = [
  { id: 'mobile-apps', label: 'Mobile apps, end to end', icon: 'smartphone', href: servicesHref('mobile-apps') },
  { id: 'white-label', label: 'White-label & multi-brand apps', icon: 'palette', href: servicesHref('white-label') },
  { id: 'realtime', label: 'Real-time & location features', icon: 'radio', href: servicesHref('realtime') },
  { id: 'offline-first', label: 'Offline-first data', icon: 'wifi-off' },
  { id: 'grounded-ai', label: 'Grounded AI features', icon: 'bot' },
];

export type ThemeChoice = 'system' | 'light' | 'dark';
export const themeOptions: readonly SegmentedOption<ThemeChoice>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export type AppChoice = 'all' | 'sme' | 'citizen' | 'responder';
export const appOptions: readonly SegmentedOption<AppChoice>[] = [
  { value: 'all', label: 'All' },
  { value: 'sme', label: 'SME', srLabel: 'SME Panindio' },
  { value: 'citizen', label: 'Citizen', srLabel: 'Defensys Citizen' },
  { value: 'responder', label: 'Responder', srLabel: 'Defensys Responder', disabled: true },
];

export const toolGlyphs: readonly { readonly label: string; readonly glyph: ToolGlyph }[] = [
  ...SIMPLE_ICON_KEYS.map((icon) => ({ label: icon.slice(2), glyph: { kind: 'si', icon } as const })),
  { label: 'LinkedIn', glyph: { kind: 'official', icon: 'linkedin' } },
  { label: 'Zustand', glyph: { kind: 'monogram', text: 'Z' } },
  { label: 'Playwright', glyph: { kind: 'monogram', text: 'PW' } },
];
