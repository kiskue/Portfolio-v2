import 'server-only';
import { Resend } from 'resend';
import type { ContactConfig } from '@/lib/contact/config';
import { CONTACT_TOPIC_LABELS } from '@/lib/contact/fields';
import type { ContactSubmission } from '@/lib/contact/schema';

/*
 * The contact email: composed as plain text (no HTML, so nothing a sender types can render),
 * then delivered by the configured transport. Reply-To is the sender, so answering the email
 * answers them.
 */

export interface ContactEmail {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}

export function composeContactEmail(
  submission: ContactSubmission,
  config: Pick<ContactConfig, 'from' | 'to'>,
  receivedAt: Date,
): ContactEmail {
  const topic = CONTACT_TOPIC_LABELS[submission.topic];
  return {
    from: config.from,
    to: config.to,
    replyTo: submission.email,
    subject: `Portfolio contact: ${topic}, from ${submission.name}`,
    text: [
      `Topic: ${topic}`,
      `Name: ${submission.name}`,
      `Email: ${submission.email}`,
      `Received: ${receivedAt.toISOString()}`,
      '',
      submission.message,
      '',
      '--',
      'Sent from the contact form on your portfolio. Reply to this email to answer.',
    ].join('\n'),
  };
}

/** The part of the Resend SDK the transport uses (`resend.emails`); tests pass a stub. */
export interface EmailClient {
  send(payload: {
    readonly from: string;
    readonly to: string;
    readonly replyTo: string;
    readonly subject: string;
    readonly text: string;
  }): Promise<{ readonly error: { readonly name: string; readonly message: string } | null }>;
}

export type DeliveryResult = { readonly ok: true } | { readonly ok: false; readonly reason: 'no-api-key' | 'provider-error' };

export interface DeliveryDeps {
  readonly createClient?: (apiKey: string) => EmailClient;
  /** Where the log transport prints the message (default console.info). */
  readonly log?: (message: string) => void;
  /** Where delivery problems are reported (default console.error). Never given the message itself. */
  readonly logError?: (message: string) => void;
}

const resendClient = (apiKey: string): EmailClient => new Resend(apiKey).emails;

/** The message as the log transport prints it. */
export function formatLoggedEmail(email: ContactEmail): string {
  return [
    'contact: CONTACT_TRANSPORT=log, so the message was printed instead of sent.',
    `From: ${email.from}`,
    `To: ${email.to}`,
    `Reply-To: ${email.replyTo}`,
    `Subject: ${email.subject}`,
    '',
    email.text,
  ].join('\n');
}

export async function deliverContactEmail(config: ContactConfig, email: ContactEmail, deps: DeliveryDeps = {}): Promise<DeliveryResult> {
  const log = deps.log ?? ((message: string) => console.info(message));
  const logError = deps.logError ?? ((message: string) => console.error(message));

  if (config.transport === 'log') {
    log(formatLoggedEmail(email));
    return { ok: true };
  }
  if (config.apiKey === null) {
    logError('contact: RESEND_API_KEY is not set, so the message could not be sent.');
    return { ok: false, reason: 'no-api-key' };
  }
  try {
    const client = (deps.createClient ?? resendClient)(config.apiKey);
    const { error } = await client.send({
      from: email.from,
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
    });
    if (error) {
      logError(`contact: Resend did not accept the message (${error.name}: ${error.message}).`);
      return { ok: false, reason: 'provider-error' };
    }
    return { ok: true };
  } catch (cause) {
    logError(`contact: sending through Resend failed (${cause instanceof Error ? cause.name : 'unknown error'}).`);
    return { ok: false, reason: 'provider-error' };
  }
}
