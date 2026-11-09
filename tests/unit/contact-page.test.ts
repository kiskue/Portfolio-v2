import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContactFallback } from '@/components/sections/contact/contact-fallback';
import { ContactForm } from '@/components/sections/contact/contact-form';
import {
  ErrorSummary,
  HoneypotField,
  SendAlert,
  SuccessPanel,
  TextField,
} from '@/components/sections/contact/contact-form-parts';
import { DirectContact } from '@/components/sections/contact/direct-contact';
import { FaqSection, shownFaqs } from '@/components/sections/contact/faq-section';
import { PrivacyNotice } from '@/components/sections/contact/privacy-notice';
import { contactPrivacy, faqs } from '@/content/faqs';
import { profile } from '@/content/profile';
import { CONTACT_FIELD_NAMES, CONTACT_LIMITS, CONTACT_TOPIC_LABELS } from '@/lib/contact/fields';
import { CONTACT_ERRORS } from '@/lib/contact/schema';
import { INITIAL_CONTACT_STATE, type ContactFormState } from '@/lib/contact/state';
import { isPlaceholder, placeholderText } from '@/lib/placeholder';

/*
 * The contact page's markup (design §8, §10): the FAQ details, the direct row, the no-key
 * fallback, the privacy notice, and the form's accessible wiring in each state. Behaviour with
 * and without JavaScript is covered by tests/e2e/contact.spec.ts.
 */

const html = (element: ReactElement) => renderToStaticMarkup(element);

/** Each tag's attributes (React's SSR attribute order differs from source order). */
function tags(markup: string, name: string): Record<string, string>[] {
  return [...markup.matchAll(new RegExp(`<${name}( [^>]*?)?/?>`, 'g'))].map((tag) =>
    Object.fromEntries([...(tag[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)].map((attr) => [attr[1]!.toLowerCase(), attr[2]!])),
  );
}

/** Every address in the markup. */
const emails = (markup: string) => markup.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];

describe('FAQs', () => {
  it('are native exclusive details, one per FAQ, with the question as the summary', () => {
    const markup = html(createElement(FaqSection, { mode: 'label' }));
    const details = tags(markup, 'details');
    expect(details).toHaveLength(faqs.length);
    expect(details.every((attrs) => attrs.name === 'faq')).toBe(true);
    expect(details.map((attrs) => attrs.id)).toEqual(faqs.map((faq) => `faq-${faq.id}`));
    expect(details.some((attrs) => 'open' in attrs)).toBe(false);
    for (const faq of faqs) expect(markup).toContain(faq.q);
    expect(markup).toContain('<h2 id="faqs"');
  });

  it('label mode marks placeholder answers; hide mode drops those questions', () => {
    const placeholders = faqs.filter((faq) => isPlaceholder(faq.a)).map((faq) => faq.id);
    expect(placeholders).toEqual(['full-time', 'contract', 'process-pricing']);
    expect(shownFaqs('label').map((faq) => faq.id)).toEqual(faqs.map((faq) => faq.id));
    expect(shownFaqs('hide').map((faq) => faq.id)).toEqual(faqs.map((faq) => faq.id).filter((id) => !placeholders.includes(id)));
    expect(html(createElement(FaqSection, { mode: 'label' }))).toContain('<mark class="ph');
    const hidden = html(createElement(FaqSection, { mode: 'hide' }));
    expect(hidden).not.toContain('[[');
    expect(hidden).not.toContain('class="ph');
    expect(tags(hidden, 'details')).toHaveLength(faqs.length - placeholders.length);
  });
});

describe('the direct row', () => {
  const markup = html(createElement(DirectContact, { mode: 'label' }));

  it('shows the profile email, and no other, with a mailto link and a Copy button', () => {
    expect(new Set(emails(markup))).toEqual(new Set([profile.email]));
    expect(markup).toContain(`href="mailto:${profile.email}"`);
    expect(markup).toContain('Copy email');
  });

  it('links LinkedIn and GitHub in a new tab, saying so', () => {
    for (const id of ['linkedin', 'github'] as const) {
      const link = profile.links.find((candidate) => candidate.id === id)!;
      expect(markup).toContain(`href="${link.href}"`);
    }
    expect(markup.match(/\(opens in a new tab\)/g)).toHaveLength(2);
  });

  it('shows the CV as a non-link placeholder chip in label mode, and nothing in hide mode (cvUrl is null)', () => {
    expect(profile.cvUrl).toBeNull();
    expect(markup).toContain('Download CV<span class="sr-only"> (placeholder)</span>');
    expect(markup).not.toMatch(/<a [^>]*download/);
    const hidden = html(createElement(DirectContact, { mode: 'hide' }));
    expect(hidden).not.toContain('Download CV');
    expect(hidden).not.toContain('class="ph');
  });

  it('shows location · time zone · reply time, dropping the reply-time placeholder in hide mode', () => {
    expect(markup).toContain(profile.location);
    expect(markup).toContain(placeholderText(profile.replyTime as `[[${string}]]`));
    expect(html(createElement(DirectContact, { mode: 'hide' }))).not.toContain(placeholderText(profile.replyTime as `[[${string}]]`));
  });
});

describe('without RESEND_API_KEY in production', () => {
  it('offers email and LinkedIn links instead of a form', () => {
    const markup = html(createElement(ContactFallback));
    expect(markup).not.toContain('<form');
    expect(markup).toContain(`href="mailto:${profile.email}"`);
    expect(markup).toContain(`href="${profile.links.find((link) => link.id === 'linkedin')!.href}"`);
  });
});

describe('privacy notice (RA 10173)', () => {
  it('states the purpose and the processor, with retention as a placeholder', () => {
    const markup = html(createElement(PrivacyNotice, { mode: 'label' }));
    expect(markup).toContain(contactPrivacy.purpose);
    expect(markup).toContain('Resend');
    expect(isPlaceholder(contactPrivacy.retention)).toBe(true);
    expect(markup).toContain(placeholderText(contactPrivacy.retention));
    expect(markup).toContain('(placeholder)');
  });

  it('drops only the retention placeholder in hide mode', () => {
    const markup = html(createElement(PrivacyNotice, { mode: 'hide' }));
    expect(markup).toContain(contactPrivacy.purpose);
    expect(markup).not.toContain(placeholderText(contactPrivacy.retention));
  });
});

const noAction = async (state: ContactFormState): Promise<ContactFormState> => state;

describe('the form', () => {
  const markup = html(
    createElement(ContactForm, {
      action: noAction,
      email: profile.email,
      privacy: createElement(PrivacyNotice, { mode: 'label' }),
    }),
  );

  it('posts every field, without native validation bubbles (the server validates)', () => {
    expect(tags(markup, 'form')[0]).toMatchObject({ novalidate: '' });
    const names = tags(markup, 'input')
      .map((attrs) => attrs.name)
      .concat(tags(markup, 'textarea').map((attrs) => attrs.name));
    for (const name of Object.values(CONTACT_FIELD_NAMES)) expect(names, name).toContain(name);
  });

  it('offers the four topics as radios with nothing preselected (?topic= presets them on the client)', () => {
    const radios = tags(markup, 'input').filter((attrs) => attrs.type === 'radio');
    expect(radios.map((attrs) => attrs.value)).toEqual(['hiring', 'project', 'testimonial', 'other']);
    expect(radios.every((attrs) => attrs.name === 'topic' && 'required' in attrs && !('checked' in attrs))).toBe(true);
    for (const label of Object.values(CONTACT_TOPIC_LABELS)) expect(markup).toContain(label);
  });

  it('labels each text field, with autocomplete and the length caps', () => {
    const name = tags(markup, 'input').find((attrs) => attrs.name === 'name');
    const email = tags(markup, 'input').find((attrs) => attrs.name === 'email');
    const message = tags(markup, 'textarea')[0];
    expect(name).toMatchObject({ id: 'contact-name', autocomplete: 'name', maxlength: String(CONTACT_LIMITS.name), required: '' });
    expect(email).toMatchObject({ id: 'contact-email', type: 'email', autocomplete: 'email', maxlength: String(CONTACT_LIMITS.email) });
    expect(message).toMatchObject({ id: 'contact-message', maxlength: String(CONTACT_LIMITS.messageMax), 'aria-describedby': 'contact-message-hint' });
    for (const id of ['contact-name', 'contact-email', 'contact-message']) expect(markup).toContain(`for="${id}"`);
  });

  it('starts the timing field empty: only the island’s submit handler fills it', () => {
    expect(tags(markup, 'input').find((attrs) => attrs.name === CONTACT_FIELD_NAMES.fillMs)).toMatchObject({ type: 'hidden', value: '' });
  });

  it('shows the privacy notice and a Send message button', () => {
    expect(markup).toContain('data-privacy-notice');
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*>.*Send message/);
  });

  it('starts with no summary, alert or thank-you panel', () => {
    expect(markup).not.toContain('data-contact-status');
    expect(INITIAL_CONTACT_STATE.status).toBe('idle');
  });
});

describe('the honeypot', () => {
  it('is hidden from people: aria-hidden, out of the tab order, no autofill', () => {
    const markup = html(createElement(HoneypotField));
    expect(markup).toMatch(/^<div aria-hidden="true" class="sr-only">/);
    expect(tags(markup, 'input')[0]).toMatchObject({ name: 'website', tabindex: '-1', autocomplete: 'off', type: 'text' });
    expect(markup).toContain('Leave this field empty');
  });
});

describe('field errors', () => {
  const markup = html(
    createElement(TextField, {
      field: 'email',
      type: 'email',
      label: 'Email',
      autoComplete: 'email',
      maxLength: CONTACT_LIMITS.email,
      defaultValue: 'ana@',
      error: CONTACT_ERRORS.emailInvalid,
    }),
  );

  it('mark the control invalid and describe it with the message, keeping what was typed', () => {
    expect(tags(markup, 'input')[0]).toMatchObject({ 'aria-invalid': 'true', 'aria-describedby': 'contact-email-error', value: 'ana@' });
    expect(markup).toContain(`id="contact-email-error"`);
    expect(markup).toContain(`<span class="sr-only">Error: </span>${CONTACT_ERRORS.emailInvalid}`);
  });

  it('are listed in a summary in field order, each linked to its field', () => {
    const summary = html(
      createElement(ErrorSummary, {
        fieldErrors: { message: CONTACT_ERRORS.messageShort, topic: CONTACT_ERRORS.topic },
        formError: null,
      }),
    );
    expect(summary).toMatch(/^<div[^>]*role="alert"/);
    expect(summary).toContain('tabindex="-1"');
    expect(tags(summary, 'a').map((attrs) => attrs.href)).toEqual(['#contact-topic', '#contact-message']);
  });

  it('a form-level error (too fast) shows on its own', () => {
    const summary = html(createElement(ErrorSummary, { fieldErrors: {}, formError: CONTACT_ERRORS.tooFast }));
    expect(summary).toContain(CONTACT_ERRORS.tooFast);
    expect(summary).not.toContain('<a ');
  });
});

describe('after sending', () => {
  it('a failure offers the profile email with a Copy button', () => {
    for (const kind of ['failed', 'blocked'] as const) {
      const markup = html(createElement(SendAlert, { kind, email: profile.email }));
      expect(markup).toMatch(/^<div[^>]*role="alert"/);
      expect(markup).toContain('Couldn’t send your message');
      expect(markup).toContain(`href="mailto:${profile.email}"`);
      expect(markup).toContain('Copy email');
      expect(markup).toContain(`data-contact-status="${kind}"`);
    }
  });

  it('success replaces the form with a status panel whose heading can take focus', () => {
    const markup = html(createElement(SuccessPanel, { email: 'ana@example.com' }));
    expect(markup).toMatch(/^<div[^>]*role="status"/);
    expect(markup).toMatch(/<h3 tabindex="-1"[^>]*>Thanks — message sent\.<\/h3>/);
    expect(markup).toContain('ana@example.com');
    expect(markup).not.toContain('<form');
  });
});
