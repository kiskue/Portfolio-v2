import type { MouseEvent, ReactNode, Ref } from 'react';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { inlineLinkClass } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { CONTACT_FIELD_NAMES } from '@/lib/contact/fields';
import { CONTACT_FIELD_ORDER, type ContactField, type ContactFieldErrors } from '@/lib/contact/state';
import { cn } from '@/lib/cn';

/*
 * The contact form's building blocks (design §8 and §10, WCAG 3.3.1–3.3.3 and 4.1.3). Hook-free:
 * the ContactForm island renders them with its state, and unit tests render them directly.
 *
 * - Every field has a visible label; hints and errors are tied to the control with
 *   aria-describedby, and an invalid control gets aria-invalid.
 * - Errors are text with a suggestion, never colour alone (an icon and an "Error:" prefix for
 *   screen readers).
 * - The error summary, the send alert and the thank-you panel take focus when they appear
 *   (focusRef), and sit in alert or status roles so screen readers announce them.
 */

/** The id of a field's control; the error summary links to it. */
export const fieldId = (field: ContactField): string => `contact-${field}`;

/** Labels share the SegmentedControl legend's style, so all four fields read alike. */
export const labelClass = 'text-meta font-semibold text-ink-2';

/** Text controls: 44px tall, line-strong edge (≥3:1, 1.4.11), the global focus ring. */
const controlClass = [
  'w-full min-w-0 rounded-control border border-line-strong bg-raised px-3.5 text-body text-ink',
  'transition-colors duration-(--dur-1) hover:border-ink-3',
  'aria-invalid:border-danger-ink aria-invalid:ring-1 aria-invalid:ring-danger-ink aria-invalid:ring-inset',
].join(' ');

export function FieldError({ id, message, className }: { readonly id: string; readonly message: string; readonly className?: string }) {
  return (
    <p id={id} className={cn('flex items-start gap-1.5 text-meta font-semibold text-danger-ink', className)}>
      <Icon name="circle-alert" size={16} className="mt-px" />
      <span>
        <span className="sr-only">Error: </span>
        {message}
      </span>
    </p>
  );
}

export interface TextFieldProps {
  readonly field: 'name' | 'email' | 'message';
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  /** What the person last submitted (React resets uncontrolled fields to it after an action). */
  readonly defaultValue: string;
  readonly maxLength: number;
  readonly autoComplete: string;
  readonly type?: 'text' | 'email';
  readonly multiline?: boolean;
  readonly className?: string;
}

export function TextField({
  field,
  label,
  hint,
  error,
  defaultValue,
  maxLength,
  autoComplete,
  type = 'text',
  multiline = false,
  className,
}: TextFieldProps) {
  const id = fieldId(field);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const shared = {
    id,
    name: CONTACT_FIELD_NAMES[field],
    defaultValue,
    maxLength,
    autoComplete,
    required: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  } as const;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-meta text-ink-3">
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...shared} rows={6} className={cn(controlClass, 'min-h-36 resize-y py-2.5')} />
      ) : (
        <input
          {...shared}
          type={type}
          spellCheck={type === 'email' ? false : undefined}
          autoCapitalize={type === 'email' ? 'none' : 'words'}
          className={cn(controlClass, 'h-11')}
        />
      )}
      {/* Below the control, so side-by-side fields stay aligned however long a message runs. */}
      {error && errorId ? <FieldError id={errorId} message={error} /> : null}
    </div>
  );
}

/**
 * The honeypot: in the form and the HTML, but hidden from everyone using the page (visually
 * hidden, aria-hidden, out of the tab order, no autofill). A value in it marks a bot.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor="contact-website">Leave this field empty</label>
      <input id="contact-website" type="text" name={CONTACT_FIELD_NAMES.honeypot} tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

/** A summary link moves focus to its field; the topic link focuses the chosen (or first) radio. */
function focusField(event: MouseEvent<HTMLAnchorElement>, field: ContactField): void {
  const target = document.getElementById(fieldId(field));
  const control =
    field === 'topic'
      ? (target?.querySelector<HTMLInputElement>('input:checked') ?? target?.querySelector<HTMLInputElement>('input'))
      : target;
  if (!control) return;
  event.preventDefault();
  control.focus();
}

const calloutClass = 'border-s-4 border-danger-ink outline-offset-4';

export interface ErrorSummaryProps {
  readonly fieldErrors: ContactFieldErrors;
  readonly formError: string | null;
  readonly focusRef?: Ref<HTMLDivElement>;
}

/** Shown above the form after an invalid submission: what to fix, each linked to its field. */
export function ErrorSummary({ fieldErrors, formError, focusRef }: ErrorSummaryProps) {
  const fields = CONTACT_FIELD_ORDER.filter((field) => fieldErrors[field] !== undefined);
  return (
    <Card
      ref={focusRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="contact-summary-title"
      surface="raised"
      radius="control"
      className={calloutClass}
      data-contact-status="invalid"
    >
      <h3 id="contact-summary-title" className="text-card-title text-ink">
        Your message wasn’t sent
      </h3>
      {formError ? <p className="mt-1 text-body-sm text-ink-2">{formError}</p> : null}
      {fields.length > 0 ? (
        <>
          <p className="mt-1 text-body-sm text-ink-2">{fields.length === 1 ? 'Fix this, then send it again:' : 'Fix these, then send it again:'}</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-body-sm marker:text-danger-ink">
            {fields.map((field) => (
              <li key={field}>
                <a href={`#${fieldId(field)}`} onClick={(event) => focusField(event, field)} className={cn(inlineLinkClass, 'text-danger-ink')}>
                  {fieldErrors[field]}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}

export interface SendAlertProps {
  /** blocked: the abuse controls stopped it; failed: it could not be delivered. */
  readonly kind: 'blocked' | 'failed';
  /** The profile email, offered instead. */
  readonly email: string;
  readonly focusRef?: Ref<HTMLDivElement>;
}

/** "Couldn't send. Email me at … [Copy]" (design §8). The form keeps what was typed. */
export function SendAlert({ kind, email, focusRef }: SendAlertProps) {
  return (
    <Card
      ref={focusRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="contact-alert-title"
      surface="raised"
      radius="control"
      className={calloutClass}
      data-contact-status={kind}
    >
      <h3 id="contact-alert-title" className="text-card-title text-ink">
        Couldn’t send your message
      </h3>
      <p className="mt-1 text-body-sm text-ink-2">
        {kind === 'blocked' ? 'It looked automated to the spam check, so it wasn’t sent. ' : 'Something went wrong on my side. '}
        Email me at{' '}
        <a href={`mailto:${email}`} className={cn(inlineLinkClass, '[overflow-wrap:anywhere]')}>
          {email}
        </a>{' '}
        instead.
      </p>
      <CopyButton value={email} label="Copy email" copiedLabel="Email copied" size="sm" className="mt-3" />
    </Card>
  );
}

export interface SuccessPanelProps {
  /** Where the reply will go. */
  readonly email: string;
  /** The reply-time note (server-rendered, placeholder-aware). */
  readonly note?: ReactNode;
  readonly focusRef?: Ref<HTMLHeadingElement>;
}

/** Replaces the form once the message is delivered (design §8): a status panel whose heading takes focus. */
export function SuccessPanel({ email, note, focusRef }: SuccessPanelProps) {
  return (
    <Card role="status" surface="raised" radius="control" className="flex items-start gap-3" data-contact-status="sent">
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-avail-bg text-avail-ink">
        <Icon name="check" size={18} />
      </span>
      <div className="min-w-0">
        <h3 ref={focusRef} tabIndex={-1} className="rounded-[0.25rem] text-card-title text-ink outline-offset-4">
          Thanks — message sent.
        </h3>
        <p className="mt-1 text-body-sm text-ink-2">
          I’ll reply to <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{email}</strong>.
        </p>
        {note}
      </div>
    </Card>
  );
}
