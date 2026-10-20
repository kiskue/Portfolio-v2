import { profile } from '@/content/profile';
import type { EmptyState, HomeContent, PageIntro, PageKey } from '@/content/types';
import { contactHref, projectsHref } from '@/lib/routes';

/**
 * Home copy (design §1, §4.2–4.3) plus every page header, empty state and closing call to action.
 *
 * - No store counts, installs, ratings or screenshot numbers appear here. Pages derive them from
 *   `storeSummary` (src/content/derived.ts) at render, so copy can never drift from the listings.
 * - Labels carry no arrows: the UI adds the ArrowUpRight / ArrowRight icons (design §4.2).
 * - Typographic apostrophes throughout ("doesn’t").
 */

/** What a list shows when nothing is left to show (hide mode or a filter that matches nothing). */
export const emptyStates: Readonly<Record<'projects' | 'showcase' | 'testimonials', EmptyState>> = {
  projects: {
    title: 'No projects match.',
    body: 'Try another type or context.',
    cta: { label: 'Clear filters', href: projectsHref() },
  },
  showcase: {
    title: 'Nothing matches these filters.',
    body: 'Try another app, brand or source.',
    cta: { label: 'Clear filters', href: '/showcase' },
  },
  testimonials: {
    title: 'Kind words, soon.',
    body: 'Notes from people I’ve worked with will appear here.',
    cta: { label: 'Worked with me? Leave a note', href: contactHref('testimonial') },
  },
};

export const home: HomeContent = {
  headline: ['Mobile apps that keep working', 'when the network doesn’t.'],
  subline:
    'I’m Gerric, a React Native and full-stack engineer in Metro Manila. I build offline-first, real-time apps, from SOS video calls for city command centers to a pocket ERP for Filipino small businesses.',
  ctas: { contact: 'Get in touch', projects: 'View projects', cv: 'Download CV' },
  tools: { eyebrow: 'Daily drivers', title: 'Tools I work with' },
  cards: {
    proj: {
      title: 'Projects',
      description: 'Three apps I build. Pick a phone for its case study.',
      linkLabel: 'All projects',
    },
    about: {
      title: 'About',
      description: `${profile.location} · ${profile.timezone}. The person behind the apps.`,
      linkLabel: 'More about me',
    },
    ai: {
      title: 'AI builds',
      description: 'AI that explains real numbers instead of inventing them.',
      linkLabel: 'AI projects',
    },
    live: {
      title: 'Live on the stores',
      description: 'Public-safety apps for Philippine local governments, each published under its own brand.',
      linkLabel: 'See the brands',
      // Rendered after the derived "As of <date>" segment.
      footnote: 'from one white-label codebase',
    },
    serv: {
      title: 'Services',
      description: 'What I can build for your team.',
      linkLabel: 'All services',
    },
    cred: {
      title: 'Credentials',
      description: 'Degree and certifications.',
      linkLabel: 'See credentials',
    },
    testi: {
      title: 'Testimonials',
      description: 'What collaborators say.',
      linkLabel: 'Read all',
    },
  },
  testimonialsEmpty: emptyStates.testimonials,
};

/** Page headers for every page except Home. */
export const pages: Readonly<Record<PageKey, PageIntro>> = {
  projects: {
    title: 'Projects',
    intro: 'Case studies first, then everything else I’ve shipped, prototyped or contributed to. Company work is labeled with my role.',
  },
  showcase: {
    title: 'Showcase',
    intro: 'Coded replicas of real app screens (real layouts, fictional data), next to a selection of Defensys Citizen’s published store screenshots.',
  },
  services: {
    title: 'Services',
    intro:
      'I take mobile products from first screen to store release, and I’m happiest where real-time, offline and AI meet. Hiring for a full-time role? Same skills, same standards.',
  },
  testimonials: {
    title: 'Testimonials',
    intro: 'What clients and collaborators say about working with me.',
  },
  about: {
    title: 'About',
    intro: 'I build for the conditions people actually live in: patchy data, bright sun, two languages and no time to read a manual.',
  },
  contact: {
    title: 'Let’s talk',
    intro: 'Hiring, a project, or a question about something here. I read everything.',
  },
  'not-found': {
    title: 'This page isn’t on the map.',
    intro: 'The link may be old or mistyped.',
  },
};

/** Closing call-to-action bands. They share the EmptyState shape: a line, an optional body, one link. */
export const callsToAction: Readonly<Record<'services' | 'testimonials', EmptyState>> = {
  services: {
    title: 'Have a project in mind?',
    body: 'Tell me what you’re building, who it’s for and what’s in the way.',
    cta: { label: 'Get in touch', href: contactHref('project') },
  },
  testimonials: {
    title: 'Worked with me?',
    body: 'A few words about working together help other teams decide.',
    cta: { label: 'Leave a note', href: contactHref('testimonial') },
  },
};
