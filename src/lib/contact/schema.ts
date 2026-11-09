import { z } from 'zod';
import { CONTACT_TOPICS } from '@/content/types';
import { CONTACT_FIELD_NAMES, CONTACT_LIMITS, isContactTopic } from '@/lib/contact/fields';
import type { ContactField, ContactFieldErrors, ContactValues } from '@/lib/contact/state';

/*
 * Server-side validation of the contact form (PLAN → Contact: a Server Action with zod). The
 * messages say what to do, not just what is wrong (WCAG 3.3.3), and name no example address:
 * the content-safety scan allows no email in src/ other than the profile one.
 */

const count = (value: number): string => new Intl.NumberFormat('en-US').format(value);

export const CONTACT_ERRORS = {
  topic: 'Choose what your message is about.',
  nameMissing: 'Enter your name.',
  nameLong: `Shorten your name to ${count(CONTACT_LIMITS.name)} characters or fewer.`,
  emailMissing: 'Enter your email address, so I can reply.',
  emailInvalid: 'Enter a complete email address, with an @ and a domain, so I can reply.',
  emailLong: `Shorten your email address to ${count(CONTACT_LIMITS.email)} characters or fewer.`,
  messageMissing: 'Enter your message.',
  messageShort: `Write at least ${count(CONTACT_LIMITS.messageMin)} characters, so I know how I can help.`,
  messageLong: `Shorten your message to ${count(CONTACT_LIMITS.messageMax)} characters or fewer.`,
  /** Form-level: a JavaScript submission arrived sooner than MIN_FILL_MS after page load. */
  tooFast: 'That was quick. Check your message, then send it again.',
} as const;

/** Runs of whitespace (including line breaks) become one space: a name is one line. */
const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const contactSchema = z.object({
  topic: z.enum(CONTACT_TOPICS, { error: CONTACT_ERRORS.topic }),
  name: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(1, CONTACT_ERRORS.nameMissing).max(CONTACT_LIMITS.name, CONTACT_ERRORS.nameLong)),
  email: z
    .string()
    .trim()
    .min(1, CONTACT_ERRORS.emailMissing)
    .max(CONTACT_LIMITS.email, CONTACT_ERRORS.emailLong)
    .pipe(z.email({ error: CONTACT_ERRORS.emailInvalid })),
  message: z
    .string()
    .trim()
    .min(1, CONTACT_ERRORS.messageMissing)
    .min(CONTACT_LIMITS.messageMin, CONTACT_ERRORS.messageShort)
    .max(CONTACT_LIMITS.messageMax, CONTACT_ERRORS.messageLong),
});

/** A valid submission: trimmed, one-line name, checked email. */
export type ContactSubmission = z.infer<typeof contactSchema>;

/** The raw form: what the person typed, plus the two abuse-control fields. */
export interface ContactFormInput {
  readonly values: ContactValues;
  readonly honeypot: string;
  readonly fillMs: string;
}

/** A form entry as text; a missing field or a file upload reads as ''. */
function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

/**
 * Reads the submitted FormData. Browsers send textarea line breaks as CRLF; they become LF here,
 * so the length the schema counts matches the one the textarea's maxLength counted.
 */
export function readContactForm(form: FormData): ContactFormInput {
  const topic = text(form, CONTACT_FIELD_NAMES.topic);
  return {
    values: {
      topic: isContactTopic(topic) ? topic : null,
      name: text(form, CONTACT_FIELD_NAMES.name),
      email: text(form, CONTACT_FIELD_NAMES.email),
      message: text(form, CONTACT_FIELD_NAMES.message).replace(/\r\n?/g, '\n'),
    },
    honeypot: text(form, CONTACT_FIELD_NAMES.honeypot),
    fillMs: text(form, CONTACT_FIELD_NAMES.fillMs),
  };
}

export type ContactValidation =
  | { readonly ok: true; readonly data: ContactSubmission }
  | { readonly ok: false; readonly fieldErrors: ContactFieldErrors };

const isField = (key: PropertyKey | undefined): key is ContactField =>
  key === 'topic' || key === 'name' || key === 'email' || key === 'message';

/** Validates the values; on failure, the first message per field (zod reports checks in order). */
export function validateContact(values: ContactValues): ContactValidation {
  const result = contactSchema.safeParse({ ...values, topic: values.topic ?? '' });
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<ContactField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isField(field) && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return { ok: false, fieldErrors };
}
