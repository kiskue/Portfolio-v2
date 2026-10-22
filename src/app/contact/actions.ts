'use server';

import { submitContactForm } from '@/lib/contact/submit';
import type { ContactFormState } from '@/lib/contact/state';

/**
 * The contact form's Server Action (PLAN → Contact). It works without JavaScript (the form posts
 * and the page re-renders with the returned state) and with it (useActionState). The previous
 * state is ignored: it comes from the client, so nothing in it is trusted.
 */
export async function sendContactMessage(_previous: ContactFormState, form: FormData): Promise<ContactFormState> {
  return submitContactForm(form, { env: process.env });
}
