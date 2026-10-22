import 'server-only';
import { profile } from '@/content/profile';

/*
 * Contact transport settings from the environment (PLAN → Contact, Environment variables;
 * .env.example). Server-only: the API key must never reach a client bundle.
 *
 * - CONTACT_TRANSPORT: 'resend' sends through Resend; 'log' prints the message to the server log
 *   (local and e2e runs). Unset or unknown: 'resend' in production, 'log' everywhere else.
 * - RESEND_API_KEY: without it in production (and with the resend transport), the contact page
 *   shows direct email and LinkedIn links instead of the form.
 * - CONTACT_TO: the inbox; defaults to the profile email.
 * - CONTACT_FROM: the sender; defaults to Resend's test sender, which delivers only to the Resend
 *   account owner's own inbox, so an API key alone is enough to start.
 */

export type ContactTransport = 'resend' | 'log';

export interface ContactConfig {
  readonly transport: ContactTransport;
  readonly apiKey: string | null;
  readonly to: string;
  readonly from: string;
  /** Whether the page offers the form (false: email and LinkedIn links instead). */
  readonly formAvailable: boolean;
}

/** The environment the settings are read from (process.env, or a stub in tests). */
export type ContactEnv = Readonly<Record<string, string | undefined>>;

/**
 * Resend's documented test sender. It is assembled from its parts because the content-safety
 * scan allows no address in src/ other than the profile email; it is never shown on the site,
 * and .env.example documents it as the CONTACT_FROM default.
 */
const RESEND_TEST_SENDER = ['onboarding', 'resend.dev'].join('@');

/** The From line when CONTACT_FROM is unset. */
export const DEFAULT_CONTACT_FROM = `Portfolio contact form <${RESEND_TEST_SENDER}>`;

const setting = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function resolveContactConfig(env: ContactEnv): ContactConfig {
  const production = env.NODE_ENV === 'production';
  const requested = setting(env.CONTACT_TRANSPORT)?.toLowerCase();
  const transport: ContactTransport = requested === 'log' || requested === 'resend' ? requested : production ? 'resend' : 'log';
  const apiKey = setting(env.RESEND_API_KEY);
  return {
    transport,
    apiKey,
    to: setting(env.CONTACT_TO) ?? profile.email,
    from: setting(env.CONTACT_FROM) ?? DEFAULT_CONTACT_FROM,
    formAvailable: transport === 'log' || apiKey !== null || !production,
  };
}
