import { CONTACT_TOPICS, type ContactTopic } from '@/content/types';

/*
 * The contact form's field names, limits and topic labels. No dependencies, so the form island
 * imports this (maxLength attributes, labels) without pulling zod or anything server-only into
 * the client bundle; the zod schema imports the same limits.
 */

/** Field names in the submitted FormData. `website` and `fillMs` are the abuse controls. */
export const CONTACT_FIELD_NAMES = {
  topic: 'topic',
  name: 'name',
  email: 'email',
  message: 'message',
  /** The honeypot: hidden from people, so only bots fill it. */
  honeypot: 'website',
  /** Milliseconds from page load to submit, written by the form island when JavaScript runs. */
  fillMs: 'fillMs',
} as const;

/** Length caps in characters, enforced by the schema and mirrored by the inputs' maxLength. */
export const CONTACT_LIMITS = {
  name: 100,
  /** The longest address SMTP allows. */
  email: 254,
  messageMin: 20,
  messageMax: 5000,
} as const;

/**
 * A JavaScript submission sent sooner than this after the page loaded is treated as automated
 * and asked to send again. Submissions without JavaScript carry no timing and are not checked.
 */
export const MIN_FILL_MS = 3000;

/** The topic chips' visible labels (design §8, review conflict 5: four chips); the email subject reuses them. */
export const CONTACT_TOPIC_LABELS = {
  hiring: 'Hiring for a role',
  project: 'A project',
  testimonial: 'A testimonial',
  other: 'Something else',
} as const satisfies Record<ContactTopic, string>;

/** Narrows any value (a FormData entry, a ?topic= param) to a contact topic. */
export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === 'string' && (CONTACT_TOPICS as readonly string[]).includes(value);
}

/**
 * Where the form posts before JavaScript runs (useActionState's permalink): the contact page,
 * scrolled to the form's heading, so a no-JS reader lands on the errors or the thank-you panel.
 */
export const CONTACT_FORM_ANCHOR = 'send-message';
export const CONTACT_FORM_PERMALINK = `/contact#${CONTACT_FORM_ANCHOR}`;
