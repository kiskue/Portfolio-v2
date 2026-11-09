import { describe, expect, it } from 'vitest';
import { CONTACT_TOPICS } from '@/content/types';
import { CONTACT_FIELD_NAMES, CONTACT_LIMITS, CONTACT_TOPIC_LABELS, isContactTopic } from '@/lib/contact/fields';
import { CONTACT_ERRORS, contactSchema, readContactForm, validateContact } from '@/lib/contact/schema';
import { CONTACT_FIELD_ORDER, EMPTY_CONTACT_VALUES, type ContactValues } from '@/lib/contact/state';

/*
 * The contact schema (PLAN → Verification: "the contact schema" unit test; S6.27): topic, name,
 * email and message with their length caps, the error copy, and how FormData is read.
 * Addresses use the reserved example domain only.
 */

const VALID: ContactValues = {
  topic: 'project',
  name: 'Ana Reyes',
  email: 'ana@example.com',
  message: 'I would like to talk about an offline-first mobile app.',
};

const with_ = (patch: Partial<ContactValues>): ContactValues => ({ ...VALID, ...patch });

function errorsOf(values: ContactValues) {
  const result = validateContact(values);
  if (result.ok) throw new Error('expected validation to fail');
  return result.fieldErrors;
}

function form(entries: Readonly<Record<string, string | Blob>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

describe('contact schema: a valid message', () => {
  it('passes and comes back trimmed, with the name on one line', () => {
    const result = validateContact(with_({ name: '  Ana \n  Reyes ', email: '  ana@example.com ', message: '\n  ' + VALID.message + '  \n' }));
    expect(result).toEqual({ ok: true, data: { ...VALID, name: 'Ana Reyes' } });
  });

  it('accepts every contact topic', () => {
    for (const topic of CONTACT_TOPICS) expect(validateContact(with_({ topic })).ok, topic).toBe(true);
  });

  it('accepts the exact length caps', () => {
    const local = 'a'.repeat(CONTACT_LIMITS.email - '@example.com'.length);
    expect(
      validateContact(
        with_({
          name: 'N'.repeat(CONTACT_LIMITS.name),
          email: `${local}@example.com`.slice(0, CONTACT_LIMITS.email),
          message: 'm'.repeat(CONTACT_LIMITS.messageMin),
        }),
      ).ok,
    ).toBe(true);
    expect(validateContact(with_({ message: 'm'.repeat(CONTACT_LIMITS.messageMax) })).ok).toBe(true);
  });
});

describe('contact schema: errors say what to do', () => {
  it('needs a topic', () => {
    expect(errorsOf(with_({ topic: null }))).toEqual({ topic: CONTACT_ERRORS.topic });
  });

  it('needs a name, at most the cap', () => {
    expect(errorsOf(with_({ name: '   ' }))).toEqual({ name: CONTACT_ERRORS.nameMissing });
    expect(errorsOf(with_({ name: 'N'.repeat(CONTACT_LIMITS.name + 1) }))).toEqual({ name: CONTACT_ERRORS.nameLong });
  });

  it('needs a complete email address, at most the cap', () => {
    expect(errorsOf(with_({ email: '' }))).toEqual({ email: CONTACT_ERRORS.emailMissing });
    for (const email of ['ana', 'ana@', 'ana@example', '@example.com', 'ana reyes@example.com', 'ana@example.com\nBcc: x']) {
      expect(errorsOf(with_({ email })), email).toEqual({ email: CONTACT_ERRORS.emailInvalid });
    }
    expect(errorsOf(with_({ email: `${'a'.repeat(CONTACT_LIMITS.email)}@example.com` }))).toEqual({ email: CONTACT_ERRORS.emailLong });
  });

  it('needs a message between the minimum and the cap, counted after trimming', () => {
    expect(errorsOf(with_({ message: ' \n ' }))).toEqual({ message: CONTACT_ERRORS.messageMissing });
    expect(errorsOf(with_({ message: `  ${'m'.repeat(CONTACT_LIMITS.messageMin - 1)}  ` }))).toEqual({ message: CONTACT_ERRORS.messageShort });
    expect(errorsOf(with_({ message: 'm'.repeat(CONTACT_LIMITS.messageMax + 1) }))).toEqual({ message: CONTACT_ERRORS.messageLong });
  });

  it('reports one message per field, for every field at once', () => {
    expect(errorsOf(EMPTY_CONTACT_VALUES)).toEqual({
      topic: CONTACT_ERRORS.topic,
      name: CONTACT_ERRORS.nameMissing,
      email: CONTACT_ERRORS.emailMissing,
      message: CONTACT_ERRORS.messageMissing,
    });
    expect(Object.keys(errorsOf(EMPTY_CONTACT_VALUES))).toEqual([...CONTACT_FIELD_ORDER]);
  });

  it('states the caps the schema enforces', () => {
    expect(CONTACT_ERRORS.nameLong).toContain(String(CONTACT_LIMITS.name));
    expect(CONTACT_ERRORS.messageShort).toContain(String(CONTACT_LIMITS.messageMin));
    expect(CONTACT_ERRORS.messageLong).toContain('5,000');
  });

  it('names no email address (the site shows the profile email only)', () => {
    for (const message of Object.values(CONTACT_ERRORS)) expect(message, message).not.toMatch(/@\S/);
  });

  it('rejects input that is not a string', () => {
    expect(contactSchema.safeParse({ ...VALID, name: 42 }).success).toBe(false);
    expect(contactSchema.safeParse({ ...VALID, topic: 'spam' }).success).toBe(false);
  });
});

describe('reading the submitted form', () => {
  it('reads the four fields and the two abuse controls', () => {
    const input = readContactForm(
      form({
        [CONTACT_FIELD_NAMES.topic]: 'hiring',
        [CONTACT_FIELD_NAMES.name]: 'Ana',
        [CONTACT_FIELD_NAMES.email]: 'ana@example.com',
        [CONTACT_FIELD_NAMES.message]: 'Line one\r\nLine two\rLine three',
        [CONTACT_FIELD_NAMES.honeypot]: '',
        [CONTACT_FIELD_NAMES.fillMs]: '5400',
        $ACTION_KEY: 'ignored',
      }),
    );
    expect(input).toEqual({
      values: { topic: 'hiring', name: 'Ana', email: 'ana@example.com', message: 'Line one\nLine two\nLine three' },
      honeypot: '',
      fillMs: '5400',
    });
  });

  it('reads missing fields, files and unknown topics as empty', () => {
    const input = readContactForm(form({ [CONTACT_FIELD_NAMES.topic]: 'spam', [CONTACT_FIELD_NAMES.name]: new Blob(['x']) }));
    expect(input).toEqual({ values: EMPTY_CONTACT_VALUES, honeypot: '', fillMs: '' });
  });
});

describe('topics', () => {
  it('has a visible label for each of the four topics (review conflict 5)', () => {
    expect(Object.keys(CONTACT_TOPIC_LABELS)).toEqual([...CONTACT_TOPICS]);
    expect(CONTACT_TOPICS).toEqual(['hiring', 'project', 'testimonial', 'other']);
  });

  it('narrows only the four topic values', () => {
    expect(CONTACT_TOPICS.every(isContactTopic)).toBe(true);
    for (const value of ['', 'Hiring', 'spam', null, undefined, 1]) expect(isContactTopic(value), String(value)).toBe(false);
  });
});
