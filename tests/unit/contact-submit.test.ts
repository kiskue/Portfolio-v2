import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendContactMessage } from '@/app/contact/actions';
import type { deliverContactEmail } from '@/lib/contact/email';
import { CONTACT_FIELD_NAMES, MIN_FILL_MS } from '@/lib/contact/fields';
import { CONTACT_ERRORS } from '@/lib/contact/schema';
import { INITIAL_CONTACT_STATE } from '@/lib/contact/state';
import { submitContactForm, type SubmitDeps } from '@/lib/contact/submit';

/*
 * One submission, end to end (the Server Action's logic): abuse controls, validation, the
 * minimum fill time, delivery and the state each returns. The transport is a stub, except in
 * the last block, which runs the real 'use server' action with CONTACT_TRANSPORT=log.
 */

const FIELDS = {
  [CONTACT_FIELD_NAMES.topic]: 'project',
  [CONTACT_FIELD_NAMES.name]: 'Ana Reyes',
  [CONTACT_FIELD_NAMES.email]: 'ana@example.com',
  [CONTACT_FIELD_NAMES.message]: 'Could you build an offline-first field app?',
  [CONTACT_FIELD_NAMES.honeypot]: '',
  [CONTACT_FIELD_NAMES.fillMs]: String(MIN_FILL_MS + 4000),
};

function form(patch: Readonly<Record<string, string>> = {}): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...FIELDS, ...patch })) data.append(key, value);
  return data;
}

const VALUES = { topic: 'project', name: 'Ana Reyes', email: 'ana@example.com', message: 'Could you build an offline-first field app?' };

function deps(delivered: boolean = true) {
  const deliver = vi.fn<typeof deliverContactEmail>(async () => (delivered ? { ok: true } : { ok: false, reason: 'provider-error' }));
  const warn = vi.fn();
  const value: SubmitDeps = { env: { NODE_ENV: 'production', CONTACT_TRANSPORT: 'log' }, now: () => new Date('2026-10-22T09:30:00Z'), deliver, warn };
  return { deps: value, deliver, warn };
}

describe('a valid message', () => {
  it('is delivered and thanks the sender, with where the reply will go', async () => {
    const { deps: d, deliver } = deps();
    expect(await submitContactForm(form(), d)).toEqual({ status: 'sent', email: 'ana@example.com' });
    expect(deliver).toHaveBeenCalledOnce();
    const [config, email] = deliver.mock.calls[0]!;
    expect(config.transport).toBe('log');
    expect(email).toMatchObject({ replyTo: 'ana@example.com', subject: 'Portfolio contact: A project, from Ana Reyes' });
    expect(email.text).toContain('Received: 2026-10-22T09:30:00.000Z');
  });

  it('is accepted without a timing (sent without JavaScript)', async () => {
    const { deps: d } = deps();
    expect((await submitContactForm(form({ [CONTACT_FIELD_NAMES.fillMs]: '' }), d)).status).toBe('sent');
  });

  it('keeps what was typed when delivery fails', async () => {
    const { deps: d } = deps(false);
    expect(await submitContactForm(form(), d)).toEqual({ status: 'failed', values: VALUES });
  });
});

describe('invalid fields', () => {
  it('come back with one message per field and what was typed, and nothing is sent', async () => {
    const { deps: d, deliver } = deps();
    const state = await submitContactForm(
      form({ [CONTACT_FIELD_NAMES.topic]: '', [CONTACT_FIELD_NAMES.email]: 'ana@', [CONTACT_FIELD_NAMES.message]: 'Too\r\nshort' }),
      d,
    );
    expect(state).toEqual({
      status: 'invalid',
      values: { ...VALUES, topic: null, email: 'ana@', message: 'Too\nshort' },
      fieldErrors: { topic: CONTACT_ERRORS.topic, email: CONTACT_ERRORS.emailInvalid, message: CONTACT_ERRORS.messageShort },
      formError: null,
    });
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe('abuse controls', () => {
  it('the honeypot blocks the message and notes it without what was typed', async () => {
    const { deps: d, deliver, warn } = deps();
    expect(await submitContactForm(form({ [CONTACT_FIELD_NAMES.honeypot]: 'https://spam.example' }), d)).toEqual({
      status: 'blocked',
      values: VALUES,
    });
    expect(deliver).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('contact: a submission was blocked (honeypot).');
  });

  it('a tampered timing blocks the message', async () => {
    const { deps: d, deliver } = deps();
    expect((await submitContactForm(form({ [CONTACT_FIELD_NAMES.fillMs]: 'soon' }), d)).status).toBe('blocked');
    expect(deliver).not.toHaveBeenCalled();
  });

  it('a valid message sent too quickly is asked to send again, keeping what was typed', async () => {
    const { deps: d, deliver } = deps();
    expect(await submitContactForm(form({ [CONTACT_FIELD_NAMES.fillMs]: String(MIN_FILL_MS - 1) }), d)).toEqual({
      status: 'invalid',
      values: VALUES,
      fieldErrors: {},
      formError: CONTACT_ERRORS.tooFast,
    });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('a fast submission with field errors gets the field errors first', async () => {
    const { deps: d } = deps();
    const state = await submitContactForm(form({ [CONTACT_FIELD_NAMES.fillMs]: '10', [CONTACT_FIELD_NAMES.name]: '' }), d);
    expect(state).toMatchObject({ status: 'invalid', fieldErrors: { name: CONTACT_ERRORS.nameMissing }, formError: null });
  });

  it('anything but form data is refused', async () => {
    const { deps: d, deliver } = deps();
    for (const payload of [null, 'topic=project', { topic: 'project' }]) {
      expect((await submitContactForm(payload, d)).status).toBe('blocked');
    }
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe('the Server Action (src/app/contact/actions.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('runs a submission against process.env: with CONTACT_TRANSPORT=log it prints the message', async () => {
    vi.stubEnv('CONTACT_TRANSPORT', 'log');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await sendContactMessage(INITIAL_CONTACT_STATE, form())).toEqual({ status: 'sent', email: 'ana@example.com' });
    expect(info).toHaveBeenCalledOnce();
    expect(String(info.mock.calls[0]?.[0])).toContain(VALUES.message);
  });

  it('ignores the previous state the client sends back', async () => {
    vi.stubEnv('CONTACT_TRANSPORT', 'log');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const forged = { status: 'sent', email: 'someone@example.com' } as const;
    expect(await sendContactMessage(forged, form({ [CONTACT_FIELD_NAMES.name]: '' }))).toMatchObject({ status: 'invalid' });
  });
});
