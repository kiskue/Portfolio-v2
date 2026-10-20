import type { Testimonial } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * Testimonials. None are real yet, so three Example items show the layout in label mode. They
 * are deliberately generic: no realistic names, roles, photos or companies (name and role are
 * placeholders), and every quote says it is an example. Hide mode drops them and shows the
 * "Kind words, soon." empty state instead. Never ship example testimonials to a public site.
 */

const EXAMPLE_NOTE =
  'Example. Replace it with a real testimonial, used with the person’s permission, or delete it.';

export const testimonials: readonly Testimonial[] = [
  {
    id: 'example-client-app',
    example: true,
    quote: 'Example: two or three sentences from a client about the app we shipped together and what it changed for their users.',
    name: ph('Client name'),
    role: ph('Role · Company'),
    tags: ['Mobile app', 'Real-time'],
    confirm: EXAMPLE_NOTE,
  },
  {
    id: 'example-teammate',
    example: true,
    quote: 'Example: a teammate on what it is like to build, review and ship with me day to day.',
    name: ph('Teammate name'),
    role: ph('Role · Team'),
    tags: ['React Native', 'Teamwork'],
    confirm: EXAMPLE_NOTE,
  },
  {
    id: 'example-client-retail',
    example: true,
    quote: 'Example: a client on the problem they brought, how we worked through it and what happened after launch.',
    name: ph('Client name'),
    role: ph('Role · Company'),
    tags: ['Offline-first', 'AI'],
    confirm: EXAMPLE_NOTE,
  },
];
