'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ErrorSummary,
  FieldError,
  fieldId,
  HoneypotField,
  SendAlert,
  SuccessPanel,
  TextField,
} from '@/components/sections/contact/contact-form-parts';
import { Button } from '@/components/ui/button';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { CONTACT_TOPICS, type ContactTopic } from '@/content/types';
import {
  CONTACT_FIELD_NAMES,
  CONTACT_FORM_ANCHOR,
  CONTACT_FORM_PERMALINK,
  CONTACT_LIMITS,
  CONTACT_TOPIC_LABELS,
  isContactTopic,
} from '@/lib/contact/fields';
import { INITIAL_CONTACT_STATE, type ContactAction } from '@/lib/contact/state';

/*
 * The contact form island (architecture D2: ContactForm). The <form> posts to a Server Action
 * through useActionState, so it works in two ways:
 *
 * - Without JavaScript the browser posts to CONTACT_FORM_PERMALINK and the server re-renders this
 *   page with the action's state: errors, the alert or the thank-you panel, scrolled to the form.
 * - With JavaScript the same action runs in place: "Sending…" while pending, then focus moves to
 *   the error summary, the alert or the thank-you heading.
 *
 * Fields are uncontrolled. Each state echoes what was submitted as defaultValue, so React's
 * post-action form reset (and the no-JS re-render) restores it rather than clearing the form.
 * The island also writes the minimum-fill-time field on submit and presets the topic from
 * ?topic= (contactHref), which it reads on the client so the route stays static.
 */

const TOPIC_OPTIONS: readonly SegmentedOption<ContactTopic>[] = CONTACT_TOPICS.map((topic) => ({
  value: topic,
  label: CONTACT_TOPIC_LABELS[topic],
}));

/** Reads ?topic= (inside Suspense, as useSearchParams needs on a static page). Renders nothing. */
function TopicFromUrl({ onTopic }: { readonly onTopic: (topic: ContactTopic | null) => void }): null {
  const raw = useSearchParams().get('topic');
  const topic = isContactTopic(raw) ? raw : null;
  useEffect(() => {
    onTopic(topic);
  }, [topic, onTopic]);
  return null;
}

export interface ContactFormProps {
  /** The Server Action (src/app/contact/actions.ts), passed down from the page. */
  readonly action: ContactAction;
  /** The profile email, offered when a message cannot be sent. */
  readonly email: string;
  /** The privacy notice, rendered on the server and shown above the send button. */
  readonly privacy: ReactNode;
  /** The reply-time note for the thank-you panel, rendered on the server (placeholder-aware). */
  readonly replyNote?: ReactNode;
}

export function ContactForm({ action, email, privacy, replyNote }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CONTACT_STATE, CONTACT_FORM_PERMALINK);
  const [urlTopic, setUrlTopic] = useState<ContactTopic | null>(null);
  const fillField = useRef<HTMLInputElement>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const setFocusTarget = useCallback((node: HTMLElement | null) => {
    focusTarget.current = node;
  }, []);

  // Each new state moves focus to what it produced (on hydration too, after a no-JS post).
  useEffect(() => {
    if (state.status !== 'idle') focusTarget.current?.focus();
  }, [state]);

  if (state.status === 'sent') return <SuccessPanel email={state.email} note={replyNote} focusRef={setFocusTarget} />;

  const { values } = state;
  const errors = state.status === 'invalid' ? state.fieldErrors : {};
  // Until something is submitted the URL decides; afterwards, what was submitted.
  const topic = state.status === 'idle' ? urlTopic : values.topic;
  const topicErrorId = errors.topic ? `${fieldId('topic')}-error` : undefined;

  /** How long the page has been open (ms since navigation start: clock-skew proof). */
  const recordFillTime = () => {
    if (fillField.current) fillField.current.value = String(Math.round(performance.now()));
  };

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={null}>
        <TopicFromUrl onTopic={setUrlTopic} />
      </Suspense>
      {state.status === 'invalid' ? (
        <ErrorSummary fieldErrors={state.fieldErrors} formError={state.formError} focusRef={setFocusTarget} />
      ) : null}
      {state.status === 'blocked' || state.status === 'failed' ? (
        <SendAlert kind={state.status} email={email} focusRef={setFocusTarget} />
      ) : null}

      <form
        action={formAction}
        onSubmit={recordFillTime}
        noValidate
        aria-labelledby={CONTACT_FORM_ANCHOR}
        className="@container flex flex-col gap-5"
      >
        <div id={fieldId('topic')} tabIndex={-1} className="flex flex-col gap-2 rounded-control outline-offset-4">
          <SegmentedControl
            // A new preset (from ?topic= or a submission) remounts the radios with it checked.
            key={topic ?? 'none'}
            name={CONTACT_FIELD_NAMES.topic}
            legend="What’s this about?"
            options={TOPIC_OPTIONS}
            defaultValue={topic ?? undefined}
            look="chips"
            required
            describedBy={topicErrorId}
          />
          {errors.topic && topicErrorId ? <FieldError id={topicErrorId} message={errors.topic} /> : null}
        </div>

        <div className="grid gap-5 @lg:grid-cols-2">
          <TextField field="name" label="Name" autoComplete="name" maxLength={CONTACT_LIMITS.name} defaultValue={values.name} error={errors.name} />
          <TextField
            field="email"
            type="email"
            label="Email"
            autoComplete="email"
            maxLength={CONTACT_LIMITS.email}
            defaultValue={values.email}
            error={errors.email}
          />
        </div>

        <TextField
          field="message"
          multiline
          label="Message"
          hint={`At least ${CONTACT_LIMITS.messageMin} characters.`}
          autoComplete="off"
          maxLength={CONTACT_LIMITS.messageMax}
          defaultValue={values.message}
          error={errors.message}
        />

        <HoneypotField />
        <input ref={fillField} type="hidden" name={CONTACT_FIELD_NAMES.fillMs} defaultValue="" />

        {privacy}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending} icon="send" iconAt="end">
            {pending ? 'Sending…' : 'Send message'}
          </Button>
          <p role="status" className="sr-only">
            {pending ? 'Sending your message…' : ''}
          </p>
        </div>
      </form>
    </div>
  );
}
