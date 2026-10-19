// STUB — owned by W2, replaced in wave 1
import type { Testimonial } from '@/content/types';
import { ph } from '@/lib/placeholder';

/** Example items use obviously generic text, never realistic fake people. */
export const testimonials: readonly Testimonial[] = [
  {
    id: 'example-1',
    example: true,
    quote: 'Example: a short note from someone I have worked with will appear here.',
    name: ph('Client name'),
    role: ph('Role · Company'),
    tags: ['Mobile app'],
  },
];
