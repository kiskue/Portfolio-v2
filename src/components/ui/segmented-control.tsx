import { cva } from 'class-variance-authority';
import type { ChangeEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/*
 * The one single-choice control (reuse rule 4): brand switcher, source toggle, both project
 * filters, the stage app picker, display settings and the contact topic.
 *
 * Built on NATIVE radios in a <fieldset>, so arrow keys, form submission and no-JS all work
 * natively, and it stays hook-free:
 * - uncontrolled inside a server-rendered <form>: pass `defaultValue` (the contact topic);
 * - controlled inside a client island: pass `value` and `onValueChange`.
 * The radio itself is visually hidden; its <label> draws the option and the focus ring.
 */

export interface SegmentedOption<T extends string> {
  readonly value: T;
  /** The visible label. */
  readonly label: string;
  /** A fuller accessible name for a short label ("SME" → "SME Panindio"). It must contain the label (2.5.3). */
  readonly srLabel?: string;
  /** Decorative leading media, e.g. a 24px store icon (alt="") or a status shape. */
  readonly media?: ReactNode;
  readonly disabled?: boolean;
}

type ValueProps<T extends string> =
  | {
      /** Controlled: the checked value. Without onValueChange the radios are read-only. */
      readonly value: T;
      readonly onValueChange?: (value: T) => void;
      readonly defaultValue?: never;
    }
  | {
      readonly value?: never;
      /** Uncontrolled: the initially checked value (works in a server-rendered form). */
      readonly defaultValue?: T;
      readonly onValueChange?: (value: T) => void;
    };

export type SegmentedControlProps<T extends string> = ValueProps<T> & {
  /** The radio group's name (also the form field name). Unique per page. */
  readonly name: string;
  readonly legend: string;
  /** Keep the legend for screen readers only (when a visible heading already names the group). */
  readonly legendHidden?: boolean;
  readonly options: readonly SegmentedOption<T>[];
  /** 'segmented': one pill track; 'chips': wrapping chips (brand switcher, filters). */
  readonly look?: 'segmented' | 'chips';
  /** sm 32px, md 36px. */
  readonly size?: 'sm' | 'md';
  readonly required?: boolean;
  /** Associates the radios with a form elsewhere in the document. */
  readonly form?: string;
  /** Id of a caption or error that describes the group. */
  readonly describedBy?: string;
  readonly className?: string;
};

const trackVariants = cva('', {
  variants: {
    look: {
      segmented: 'inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-line-strong bg-sunken p-0.5',
      chips: 'flex flex-wrap gap-2',
    },
  },
});

const optionVariants = cva(
  [
    'relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full whitespace-nowrap font-semibold select-none',
    'transition-colors duration-(--dur-1) ease-out',
    'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
    'has-disabled:cursor-not-allowed has-disabled:opacity-45',
  ],
  {
    variants: {
      look: {
        // Selected: a 1.5px ink edge on raised (design §5.5, §9).
        segmented: [
          'border-[1.5px] border-transparent text-ink-2 hover:bg-raised hover:text-ink',
          'has-checked:border-ink has-checked:bg-raised has-checked:text-ink has-checked:shadow-xs',
        ],
        chips: [
          'border border-line-strong bg-raised text-ink-2 hover:bg-sunken hover:text-ink',
          'has-checked:border-ink has-checked:text-ink has-checked:ring-[0.5px] has-checked:ring-ink has-checked:ring-inset',
        ],
      },
      size: {
        sm: 'min-h-8 px-3 text-meta',
        md: 'min-h-9 px-3.5 text-body-sm',
      },
    },
    defaultVariants: { look: 'segmented', size: 'md' },
  },
);

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const {
    name,
    legend,
    legendHidden = false,
    options,
    look = 'segmented',
    size = 'md',
    required,
    form,
    describedBy,
    className,
    value,
    defaultValue,
    onValueChange,
  } = props;
  const controlled = value !== undefined;
  const handleChange = onValueChange
    ? (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.currentTarget.value as T)
    : undefined;

  return (
    <fieldset aria-describedby={describedBy} className={cn('min-w-0', className)}>
      <legend className={legendHidden ? 'sr-only' : 'mb-2 text-meta font-semibold text-ink-2'}>{legend}</legend>
      <div className={trackVariants({ look })}>
        {options.map((option) => (
          <label key={option.value} className={optionVariants({ look, size })}>
            <input
              type="radio"
              name={name}
              value={option.value}
              className="sr-only"
              {...(controlled
                ? { checked: value === option.value, readOnly: handleChange === undefined }
                : { defaultChecked: defaultValue === option.value })}
              onChange={handleChange}
              disabled={option.disabled}
              required={required}
              form={form}
            />
            {option.media}
            {option.srLabel ? (
              <>
                <span aria-hidden="true">{option.label}</span>
                <span className="sr-only">{option.srLabel}</span>
              </>
            ) : (
              <span>{option.label}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
