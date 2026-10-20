import { ChevronDown, CircleAlert, Minus, Plus, Search, Trash2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RGlyph } from './glyph';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

/* Drawn form controls: there is no <input>, <select> or <textarea> in a replica. */

export interface RFieldProps extends RBoxProps {
  readonly kind: 'input' | 'select' | 'textarea';
  readonly label?: string;
  /** Adds the red " *". */
  readonly required?: boolean;
  /** A muted note after the label, e.g. "Optional". */
  readonly optional?: string;
  /** The entered value; when absent the placeholder shows. */
  readonly value?: string;
  readonly placeholder?: string;
  /** Draws the 2px focus ring in the brand accent. */
  readonly focused?: boolean;
  /** Error text under the box (red border and alert glyph). */
  readonly error?: string;
  /** Helper text under the box. */
  readonly hint?: string;
  /** A leading glyph inside the box. */
  readonly icon?: LucideIcon;
  /** Minimum box height in px (default 52; 96 for textarea). */
  readonly minHeight?: number;
}

/** The apps' field tokens: 14px label, 52px box, radius 12, #7d8794 border on #eef2f7. */
export function RField({
  kind,
  label,
  required,
  optional,
  value,
  placeholder,
  focused,
  error,
  hint,
  icon,
  minHeight,
  className,
  style,
}: RFieldProps): ReactNode {
  const shown = value ?? placeholder ?? '';
  return (
    <div
      className={cn('rx-field', className)}
      data-kind={kind}
      data-focused={focused ? '' : undefined}
      data-error={error ? '' : undefined}
      style={style}
    >
      {label ? (
        <span className="rx-field__label">
          {label}
          {required ? <span className="rx-field__req"> *</span> : null}
          {optional ? <span className="rx-field__opt">{`  ${optional}`}</span> : null}
        </span>
      ) : null}
      <span className="rx-field__box" style={rStyle({}, { minHeight: minHeight === undefined ? undefined : px(minHeight) })}>
        {icon ? (
          <span className="rx-field__icon">
            <RGlyph icon={icon} size={20} />
          </span>
        ) : null}
        <span className="rx-field__value" data-placeholder={value === undefined ? '' : undefined}>
          {shown}
        </span>
        {kind === 'select' ? (
          <span className="rx-field__chev">
            <RGlyph icon={ChevronDown} size={22} />
          </span>
        ) : null}
      </span>
      {error ? (
        <span className="rx-field__error">
          <RGlyph icon={CircleAlert} size={16} />
          {error}
        </span>
      ) : null}
      {hint ? <span className="rx-field__hint">{hint}</span> : null}
    </div>
  );
}

export interface RSearchFieldProps extends RBoxProps {
  readonly placeholder: string;
  readonly value?: string;
  /** Height in px (default 44). */
  readonly h?: number;
  /** Corner radius in px (default 22) or 'full'. */
  readonly radius?: number | 'full';
  readonly bg?: RColor;
  /** A 1px border in this colour. */
  readonly border?: RColor;
  readonly iconSize?: number;
}

/** A search box with a leading magnifier (POS, storefront, hazard filters). */
export function RSearchField({ placeholder, value, h, radius, bg, border, iconSize = 18, className, style }: RSearchFieldProps): ReactNode {
  return (
    <div
      className={cn('rx-search', className)}
      style={rStyle(
        {},
        {
          height: h === undefined ? undefined : px(h),
          borderRadius: radius === undefined ? undefined : radius === 'full' ? '999px' : px(radius),
          background: bg,
          borderColor: border,
          ...style,
        },
      )}
    >
      <RGlyph icon={Search} size={iconSize} />
      <span className="rx-search__text" data-value={value === undefined ? undefined : ''}>
        {value ?? placeholder}
      </span>
    </div>
  );
}

export interface RStepperProps extends RBoxProps {
  readonly value: number;
  readonly color?: RColor;
  /** Button diameter in px (default 24). */
  readonly size?: number;
  /** pill: on a white pill (default) · plain: buttons only. */
  readonly look?: 'pill' | 'plain';
  /** Show a trash glyph instead of minus at quantity 1 (POS order items). */
  readonly trashAtOne?: boolean;
}

/** A quantity stepper: minus, the quantity, plus. */
export function RStepper({ value, color, size, look = 'pill', trashAtOne, className, style }: RStepperProps): ReactNode {
  const glyph = Math.round((size ?? 24) * 0.58);
  return (
    <div
      className={cn('rx-stepper', className)}
      data-look={look}
      style={rStyle({ '--rx-stepper-c': color, '--rx-stepper-size': size === undefined ? undefined : px(size) }, style)}
    >
      <span className="rx-stepper__btn">
        {trashAtOne && value <= 1 ? <RGlyph icon={Trash2} size={glyph} /> : <RGlyph icon={Minus} size={glyph} strokeWidth={2.5} />}
      </span>
      <span className="rx-stepper__value">{value}</span>
      <span className="rx-stepper__btn" data-solid="">
        <RGlyph icon={Plus} size={glyph} strokeWidth={2.5} />
      </span>
    </div>
  );
}
