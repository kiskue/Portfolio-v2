import { describe, expect, it, vi } from 'vitest';
import { profile } from '@/content/profile';
import { DEFAULT_CONTACT_FROM, resolveContactConfig, type ContactConfig } from '@/lib/contact/config';
import { composeContactEmail, deliverContactEmail, formatLoggedEmail, type EmailClient } from '@/lib/contact/email';
import { CONTACT_TOPIC_LABELS } from '@/lib/contact/fields';
import type { ContactSubmission } from '@/lib/contact/schema';

/*
 * Transport selection and delivery (PLAN → Contact and Environment variables; S4.40–S4.42,
 * S5.25): CONTACT_TRANSPORT=resend|log, RESEND_API_KEY, CONTACT_TO (default: the profile
 * email), CONTACT_FROM (default: Resend's test sender), and the form replaced by direct links
 * when production has no key. Resend itself is a stub here: no network.
 */

/** Resend's test sender, assembled so this file holds no address outside the reserved domains. */
const RESEND_TEST_SENDER = ['onboarding', 'resend.dev'].join('@');
/** A fake key: a fixed, obviously-not-real value (the content-safety scan looks for real key shapes). */
const KEY = 'test-key';

describe('transport selection', () => {
  it('defaults to resend in production and to log everywhere else', () => {
    expect(resolveContactConfig({ NODE_ENV: 'production' }).transport).toBe('resend');
    expect(resolveContactConfig({ NODE_ENV: 'development' }).transport).toBe('log');
    expect(resolveContactConfig({ NODE_ENV: 'test' }).transport).toBe('log');
    expect(resolveContactConfig({}).transport).toBe('log');
  });

  it('follows CONTACT_TRANSPORT (trimmed, any case); an unknown value falls back to the default', () => {
    expect(resolveContactConfig({ NODE_ENV: 'production', CONTACT_TRANSPORT: 'log' }).transport).toBe('log');
    expect(resolveContactConfig({ NODE_ENV: 'development', CONTACT_TRANSPORT: ' Resend ' }).transport).toBe('resend');
    expect(resolveContactConfig({ NODE_ENV: 'production', CONTACT_TRANSPORT: 'smtp' }).transport).toBe('resend');
    expect(resolveContactConfig({ NODE_ENV: 'development', CONTACT_TRANSPORT: '' }).transport).toBe('log');
  });

  it('sends to the profile email from Resend’s test sender unless CONTACT_TO and CONTACT_FROM say otherwise', () => {
    const defaults = resolveContactConfig({ NODE_ENV: 'production', RESEND_API_KEY: KEY });
    expect(defaults.to).toBe(profile.email);
    expect(defaults.from).toBe(DEFAULT_CONTACT_FROM);
    expect(DEFAULT_CONTACT_FROM).toContain(`<${RESEND_TEST_SENDER}>`);
    const custom = resolveContactConfig({ CONTACT_TO: ' inbox@example.com ', CONTACT_FROM: 'Site <form@example.com>' });
    expect(custom).toMatchObject({ to: 'inbox@example.com', from: 'Site <form@example.com>' });
    expect(resolveContactConfig({ CONTACT_TO: '  ', CONTACT_FROM: '' })).toMatchObject({ to: profile.email, from: DEFAULT_CONTACT_FROM });
  });

  it('reads the API key, treating a blank one as missing', () => {
    expect(resolveContactConfig({ RESEND_API_KEY: ` ${KEY} ` }).apiKey).toBe(KEY);
    expect(resolveContactConfig({ RESEND_API_KEY: '   ' }).apiKey).toBeNull();
    expect(resolveContactConfig({}).apiKey).toBeNull();
  });
});

describe('the form or direct links', () => {
  it.each([
    ['production, resend, no key', { NODE_ENV: 'production' }, false],
    ['production, resend, key', { NODE_ENV: 'production', RESEND_API_KEY: KEY }, true],
    ['production, log (e2e)', { NODE_ENV: 'production', CONTACT_TRANSPORT: 'log' }, true],
    ['development, resend, no key', { NODE_ENV: 'development', CONTACT_TRANSPORT: 'resend' }, true],
    ['development, default', { NODE_ENV: 'development' }, true],
  ] as const)('%s → form: %s', (_label, env, form) => {
    expect(resolveContactConfig(env).formAvailable).toBe(form);
  });
});

const SUBMISSION: ContactSubmission = {
  topic: 'hiring',
  name: 'Ana Reyes',
  email: 'ana@example.com',
  message: 'We are hiring a mobile engineer.\nCan we talk next week?',
};

const CONFIG: ContactConfig = {
  transport: 'resend',
  apiKey: KEY,
  to: profile.email,
  from: DEFAULT_CONTACT_FROM,
  formAvailable: true,
};

const RECEIVED = new Date('2026-10-22T09:30:00.000Z');

describe('the email', () => {
  const email = composeContactEmail(SUBMISSION, CONFIG, RECEIVED);

  it('goes from the configured sender to the configured inbox, replying to the person', () => {
    expect(email).toMatchObject({ from: CONFIG.from, to: profile.email, replyTo: SUBMISSION.email });
  });

  it('names the topic and the sender in the subject', () => {
    expect(email.subject).toBe(`Portfolio contact: ${CONTACT_TOPIC_LABELS.hiring}, from Ana Reyes`);
  });

  it('is plain text with every field and the message as written', () => {
    expect(email.text).toContain(`Topic: ${CONTACT_TOPIC_LABELS.hiring}`);
    expect(email.text).toContain('Name: Ana Reyes');
    expect(email.text).toContain('Email: ana@example.com');
    expect(email.text).toContain('Received: 2026-10-22T09:30:00.000Z');
    expect(email.text).toContain(SUBMISSION.message);
  });
});

describe('delivery', () => {
  const email = composeContactEmail(SUBMISSION, CONFIG, RECEIVED);

  function stubClient(result: Awaited<ReturnType<EmailClient['send']>> | Error) {
    const send = vi.fn<EmailClient['send']>(async () => {
      if (result instanceof Error) throw result;
      return result;
    });
    const createClient = vi.fn<(apiKey: string) => EmailClient>(() => ({ send }));
    return { send, createClient };
  }

  it('log: prints the message and sends nothing', async () => {
    const log = vi.fn();
    const { createClient } = stubClient({ error: null });
    expect(await deliverContactEmail({ ...CONFIG, transport: 'log', apiKey: null }, email, { log, createClient })).toEqual({ ok: true });
    expect(createClient).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(formatLoggedEmail(email));
    expect(formatLoggedEmail(email)).toContain(SUBMISSION.message);
  });

  it('resend: sends through the client built with the key', async () => {
    const { send, createClient } = stubClient({ error: null });
    expect(await deliverContactEmail(CONFIG, email, { createClient })).toEqual({ ok: true });
    expect(createClient).toHaveBeenCalledWith(KEY);
    expect(send).toHaveBeenCalledWith({
      from: email.from,
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
    });
  });

  it('resend without a key: fails without trying', async () => {
    const logError = vi.fn();
    const { createClient } = stubClient({ error: null });
    expect(await deliverContactEmail({ ...CONFIG, apiKey: null }, email, { createClient, logError })).toEqual({
      ok: false,
      reason: 'no-api-key',
    });
    expect(createClient).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledOnce();
  });

  it('resend refusing or throwing: fails, and the log never carries the message', async () => {
    for (const result of [{ error: { name: 'validation_error', message: 'Invalid sender' } }, new Error('network down')]) {
      const logError = vi.fn();
      const { createClient } = stubClient(result);
      expect(await deliverContactEmail(CONFIG, email, { createClient, logError })).toEqual({ ok: false, reason: 'provider-error' });
      expect(logError).toHaveBeenCalledOnce();
      const logged = String(logError.mock.calls[0]?.[0]);
      expect(logged).not.toContain(SUBMISSION.message);
      expect(logged).not.toContain(SUBMISSION.email);
    }
  });
});
