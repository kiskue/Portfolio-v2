import type { Field, Meta, Placeholder, PlaceholderMode, Segments } from '@/content/types';

/**
 * Placeholder rules (PLAN.md, Placeholders).
 *
 * - A token is a WHOLE field: `title: ph('Your title at DGSI')`, never "Title: [[…]]".
 * - Label mode (default): tokens render as marked placeholders and example items get an
 *   Example tag.
 * - Hide mode: token FIELDS and SEGMENTS disappear and example items are dropped. Whole items
 *   are never dropped for carrying a token, so e.g. an experience entry with a placeholder
 *   period still renders its other fields.
 * - `hidden` items never render in any mode.
 */

const OPEN = '[[';
const CLOSE = ']]';

/** The separator between visible segments of a meta line. */
export const SEGMENT_SEPARATOR = ' · ';

/** Authors a placeholder token. The text must be non-empty and contain no brackets. */
export function ph(text: string): Placeholder {
  const trimmed = text.trim();
  if (trimmed === '' || trimmed.includes(OPEN) || trimmed.includes(CLOSE)) {
    throw new Error(`ph(): invalid placeholder text ${JSON.stringify(text)}`);
  }
  return `${OPEN}${trimmed}${CLOSE}`;
}

/** True when the whole string is exactly one placeholder token. */
export function isPlaceholder(value: string): value is Placeholder {
  return (
    value.length > OPEN.length + CLOSE.length &&
    value.startsWith(OPEN) &&
    value.endsWith(CLOSE) &&
    value.indexOf(OPEN, OPEN.length) === -1 &&
    value.indexOf(CLOSE) === value.length - CLOSE.length &&
    value.slice(OPEN.length, -CLOSE.length).trim() !== ''
  );
}

/** True when the string contains token brackets anywhere (valid or not). */
export function hasToken(value: string): boolean {
  return value.includes(OPEN) || value.includes(CLOSE);
}

/** The text inside a token: "[[N]]" → "N". */
export function placeholderText(token: Placeholder): string {
  return token.slice(OPEN.length, -CLOSE.length);
}

/** Drops `hidden` items always, and `example` items in hide mode. */
export function visible<T extends Meta>(items: readonly T[], mode: PlaceholderMode): readonly T[] {
  return items.filter((item) => item.hidden !== true && (mode === 'label' || item.example !== true));
}

/**
 * The field to render, or null when there is nothing to show: blank text, or (hide mode) a
 * token. A string that only embeds a token is treated as a token too, so a malformed field can
 * never leak "[[…]]" into a public page.
 */
export function fieldOrNull(field: Field | null | undefined, mode: PlaceholderMode): Field | null {
  if (field == null || field.trim() === '') return null;
  if (mode === 'hide' && hasToken(field)) return null;
  return field;
}

/** The visible segments of a meta line: blanks always skipped, tokens skipped in hide mode. */
export function segments(segs: Segments, mode: PlaceholderMode): readonly Field[] {
  return segs.flatMap((segment) => {
    const shown = fieldOrNull(segment, mode);
    return shown === null ? [] : [shown];
  });
}

/** A meta line as plain text (for aria-labels and metadata). Null when nothing is visible. */
export function segmentText(segs: Segments, mode: PlaceholderMode): string | null {
  const shown = segments(segs, mode);
  return shown.length > 0 ? shown.join(SEGMENT_SEPARATOR) : null;
}

/**
 * A nullable fact (years of experience, CV link): the value when set; otherwise the token in
 * label mode and null in hide mode.
 */
export function orPlaceholder<T>(value: T | null, token: Placeholder, mode: PlaceholderMode): T | Placeholder | null {
  if (value !== null) return value;
  return mode === 'label' ? token : null;
}
