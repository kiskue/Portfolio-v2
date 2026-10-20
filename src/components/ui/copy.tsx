import { Fragment, type ReactNode } from 'react';
import { site } from '@/content/site';
import type { Field, PlaceholderMode, Segments } from '@/content/types';
import { fieldOrNull, hasToken, isPlaceholder, placeholderText, SEGMENT_SEPARATOR, segments } from '@/lib/placeholder';

/*
 * Placeholder-aware text (PLAN → Placeholders; design §10). Every content string renders
 * through <Copy> or <MetaLine> (reuse rule 8):
 * - label mode (site.placeholders, the default): a whole-token field "[[Your title]]" renders as
 *   <mark class="ph"> with the token's inner text and a screen-reader-only " (placeholder)";
 * - hide mode: token fields render nothing, and meta lines skip their token segments, so a
 *   separator never dangles.
 */

/** The placeholder mark: ph colours (6.09:1), dashed underline; dev builds add a dashed outline. */
export const phMarkClass = [
  'ph rounded-[0.25em] bg-ph-bg px-[0.2em] text-ph-ink',
  'underline decoration-dashed decoration-1 underline-offset-[0.2em] [box-decoration-break:clone]',
  'in-data-[env=development]:outline-2 in-data-[env=development]:outline-offset-1 in-data-[env=development]:outline-dashed',
].join(' ');

/** A token's inner text, marked as a placeholder for sighted and screen-reader users alike. */
export function PlaceholderMark({ text }: { readonly text: string }) {
  return (
    <mark className={phMarkClass}>
      {text}
      <span className="sr-only"> (placeholder)</span>
    </mark>
  );
}

/** Captures the inner text of each "[[…]]" token, for the malformed case below. */
const TOKEN = /\[\[(.*?)\]\]/;

/** A visible field: plain text, or a whole token as a mark. */
export function renderField(field: Field): ReactNode {
  if (isPlaceholder(field)) return <PlaceholderMark text={placeholderText(field)} />;
  if (!hasToken(field)) return field;
  // A token inside a sentence breaks the whole-field rule (content tests reject it). If one
  // slips through, it is still marked rather than shown as raw brackets.
  return field
    .split(TOKEN)
    .map((part, index) => (index % 2 === 1 ? <PlaceholderMark key={index} text={part} /> : part));
}

export interface CopyProps {
  /** A content field: plain text or one whole "[[…]]" token. null/blank renders nothing. */
  readonly text: Field | null | undefined;
  /** Wrapper element. Omitted (and no className): the text renders without a wrapper. */
  readonly as?: 'span' | 'p' | 'strong';
  readonly className?: string;
  /** Defaults to site.placeholders. */
  readonly mode?: PlaceholderMode;
}

/** One content string. Returns null when there is nothing to show (hide mode, blank, null). */
export function Copy({ text, as, className, mode = site.placeholders }: CopyProps) {
  const shown = fieldOrNull(text, mode);
  if (shown === null) return null;
  const content = renderField(shown);
  if (as === undefined && className === undefined) return <>{content}</>;
  const Element = as ?? 'span';
  return <Element className={className}>{content}</Element>;
}

export interface MetaLineProps {
  /** Segments joined by " · "; blank segments (and token segments in hide mode) are skipped. */
  readonly segments: Segments;
  readonly as?: 'p' | 'span' | 'div';
  readonly className?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * A meta line such as "Personal · private beta". The dot is decorative; screen readers hear a
 * comma instead. Returns null when no segment is visible.
 */
export function MetaLine({ segments: segs, as = 'p', className, mode = site.placeholders }: MetaLineProps) {
  const shown = segments(segs, mode);
  if (shown.length === 0) return null;
  const Element = as;
  return (
    <Element className={className}>
      {shown.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <>
              <span aria-hidden="true">{SEGMENT_SEPARATOR}</span>
              <span className="sr-only">, </span>
            </>
          ) : null}
          {renderField(segment)}
        </Fragment>
      ))}
    </Element>
  );
}
