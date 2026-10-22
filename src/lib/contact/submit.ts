import 'server-only';
import { checkAbuse } from '@/lib/contact/abuse';
import { resolveContactConfig, type ContactEnv } from '@/lib/contact/config';
import { composeContactEmail, deliverContactEmail } from '@/lib/contact/email';
import { CONTACT_ERRORS, readContactForm, validateContact } from '@/lib/contact/schema';
import { EMPTY_CONTACT_VALUES, type ContactFormState } from '@/lib/contact/state';

/*
 * One contact submission, start to finish. The Server Action (src/app/contact/actions.ts) is a
 * thin wrapper around this, so every branch is unit-tested with a stub environment and
 * transport. Order: abuse controls, then validation, then the minimum fill time (a person who
 * was merely fast gets their field errors first), then delivery.
 */

export interface SubmitDeps {
  readonly env: ContactEnv;
  readonly now?: () => Date;
  readonly deliver?: typeof deliverContactEmail;
  /** Where blocked submissions are noted (default console.warn); never given what was typed. */
  readonly warn?: (message: string) => void;
}

export async function submitContactForm(form: unknown, deps: SubmitDeps): Promise<ContactFormState> {
  // A Server Action is a public endpoint: anything can arrive, not only the page's FormData.
  if (!(form instanceof FormData)) return { status: 'blocked', values: EMPTY_CONTACT_VALUES };

  const input = readContactForm(form);
  const verdict = checkAbuse(input);
  if (verdict === 'honeypot' || verdict === 'malformed-timing') {
    (deps.warn ?? ((message: string) => console.warn(message)))(`contact: a submission was blocked (${verdict}).`);
    return { status: 'blocked', values: input.values };
  }

  const validation = validateContact(input.values);
  if (!validation.ok) return { status: 'invalid', values: input.values, fieldErrors: validation.fieldErrors, formError: null };
  if (verdict === 'too-fast') return { status: 'invalid', values: input.values, fieldErrors: {}, formError: CONTACT_ERRORS.tooFast };

  const config = resolveContactConfig(deps.env);
  const email = composeContactEmail(validation.data, config, (deps.now ?? (() => new Date()))());
  const delivery = await (deps.deliver ?? deliverContactEmail)(config, email);
  if (!delivery.ok) return { status: 'failed', values: input.values };
  return { status: 'sent', email: validation.data.email };
}
