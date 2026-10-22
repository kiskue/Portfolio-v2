import type { ContactTopic } from '@/content/types';

/*
 * The contact form's state: what the Server Action returns and useActionState renders, with
 * JavaScript and without it. Types only plus two constants, so the form island can import it.
 */

export type ContactField = 'topic' | 'name' | 'email' | 'message';

/** Field order on the page; the error summary lists errors in this order. */
export const CONTACT_FIELD_ORDER: readonly ContactField[] = ['topic', 'name', 'email', 'message'];

/** What the person typed, echoed back so a failed submission never loses their message. */
export interface ContactValues {
  readonly topic: ContactTopic | null;
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

export type ContactFieldErrors = Readonly<Partial<Record<ContactField, string>>>;

export type ContactFormState =
  /** Nothing submitted yet. */
  | { readonly status: 'idle'; readonly values: ContactValues }
  /** Field errors, or a form-level error such as a submission sent too quickly. */
  | {
      readonly status: 'invalid';
      readonly values: ContactValues;
      readonly fieldErrors: ContactFieldErrors;
      readonly formError: string | null;
    }
  /** The honeypot was filled, or the timing field was tampered with: treated as automated. */
  | { readonly status: 'blocked'; readonly values: ContactValues }
  /** Valid, but it could not be delivered (no API key, or the email service refused it). */
  | { readonly status: 'failed'; readonly values: ContactValues }
  /** Delivered; `email` is where the reply will go. */
  | { readonly status: 'sent'; readonly email: string };

/** The Server Action's signature, as useActionState calls it. */
export type ContactAction = (previous: ContactFormState, form: FormData) => Promise<ContactFormState>;

export const EMPTY_CONTACT_VALUES: ContactValues = { topic: null, name: '', email: '', message: '' };

export const INITIAL_CONTACT_STATE: ContactFormState = { status: 'idle', values: EMPTY_CONTACT_VALUES };
