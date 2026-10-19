// STUB — owned by W2, replaced in wave 1
import type { HomeContent, PageIntro, PageKey } from '@/content/types';

export const home: HomeContent = {
  headline: ['Mobile apps that keep working', 'when the network doesn’t.'],
  subline:
    'I’m Gerric, a React Native and full-stack engineer in Metro Manila. I build offline-first, real-time apps, from SOS video calls for city command centers to a pocket ERP for Filipino small businesses.',
  ctas: { contact: 'Get in touch', projects: 'View projects', cv: 'Download CV' },
  tools: { eyebrow: 'Daily drivers', title: 'Tools I work with' },
  cards: {
    proj: { title: 'Projects', description: 'Three apps I build end to end. Tap a phone for the case study.', linkLabel: 'All projects' },
    about: { title: 'About', description: 'Taguig City, PH · GMT+8. The person behind the apps.' },
    ai: { title: 'AI builds', description: 'AI that explains real numbers instead of inventing them.' },
    live: {
      title: 'Live on the stores',
      description: 'One white-label codebase, many public-safety brands.',
      footnote: 'from one white-label codebase',
    },
    serv: { title: 'Services', description: 'What I can build for your team.' },
    cred: { title: 'Credentials', description: 'Degree and certifications.' },
    testi: { title: 'Testimonials', description: 'What collaborators say.', linkLabel: 'Read all' },
  },
  testimonialsEmpty: {
    title: 'Kind words, soon.',
    cta: { label: 'Worked with me? Leave a note', href: '/contact?topic=testimonial' },
  },
};

/** Page headers for every page except Home. */
export const pages: Readonly<Record<PageKey, PageIntro>> = {
  projects: {
    title: 'Projects',
    intro: 'Case studies first, then everything else I’ve shipped, prototyped or contributed to.',
  },
  showcase: { title: 'Showcase', intro: 'Coded replicas of shipped screens (real layouts, fictional data).' },
  services: { title: 'Services', intro: 'I take mobile products from first screen to store release.' },
  testimonials: { title: 'Testimonials', intro: 'What collaborators say.' },
  about: { title: 'About', intro: 'I build for the conditions people actually live in.' },
  contact: { title: 'Let’s talk', intro: 'Hiring, a project, or a question about something here. I read everything.' },
  'not-found': { title: 'This page isn’t on the map.', intro: 'The link may be old or mistyped.' },
};
