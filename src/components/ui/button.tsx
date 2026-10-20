import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import type { IconName } from '@/content/types';
import { Icon, type IconSize } from '@/components/ui/icon';
import { SiteLink, type SiteLinkProps } from '@/components/ui/site-link';
import { cn } from '@/lib/cn';

/**
 * Button styles (design §9). Hover steps the background or border, press scales to .98 (none
 * under reduced motion), focus is the global 2px outline ring from base.css.
 * Sizes: sm 32px, md 44px; circles are 32 / 40px (44px on coarse pointers).
 */
export const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,scale] duration-(--dur-1) ease-out',
    'active:scale-[0.98] reduce-motion:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-45',
    'aria-busy:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink text-raised hover:bg-ink/85',
        secondary: 'border border-line-strong bg-raised text-ink hover:bg-sunken',
        ghost: 'text-ink hover:bg-nav-hover',
        icon: 'border border-line bg-raised text-ink-2 hover:border-line-strong hover:text-ink',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-meta font-semibold',
        md: 'h-11 gap-2 px-4.5 text-button',
      },
      shape: {
        pill: '',
        circle: 'aspect-square px-0',
      },
    },
    compoundVariants: [
      { shape: 'circle', size: 'sm', className: 'size-8' },
      { shape: 'circle', size: 'md', className: 'size-10 pointer-coarse:size-11' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', shape: 'pill' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonLookProps extends ButtonVariantProps {
  readonly icon?: IconName;
  /** Where the icon sits next to the text (Button default 'start', ButtonLink default 'end'). */
  readonly iconAt?: 'start' | 'end';
  readonly className?: string;
}

/**
 * How a button gets its accessible name: text children, or (icon-only) a required `label`
 * that becomes aria-label. An icon-only button without a label does not type-check.
 */
export type ButtonLabelProps =
  | { readonly children: ReactNode; readonly label?: never }
  | { readonly children?: never; readonly icon: IconName; readonly label: string };

/** Arrow glyphs nudge toward their direction on hover (design §4.2); never under reduced motion. */
const NUDGE: Partial<Record<IconName, string>> = {
  'arrow-up-right':
    'transition-[translate] duration-(--dur-1) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5 reduce-motion:group-hover/button:translate-none',
  'arrow-right':
    'transition-[translate] duration-(--dur-1) group-hover/button:translate-x-0.5 reduce-motion:group-hover/button:translate-none',
};

function glyphSize(size: ButtonVariantProps['size'], iconOnly: boolean): IconSize {
  if (size === 'sm') return iconOnly ? 16 : 14;
  return iconOnly ? 18 : 16;
}

interface ButtonInnerProps {
  readonly icon: IconName | undefined;
  readonly iconAt: 'start' | 'end';
  readonly loading: boolean;
  readonly size: ButtonVariantProps['size'];
  readonly children: ReactNode;
}

function ButtonInner({ icon, iconAt, loading, size, children }: ButtonInnerProps) {
  const iconOnly = children == null;
  const px = glyphSize(size, iconOnly);
  const glyph = loading ? (
    <Icon name="loader-circle" size={px} className="animate-spin" />
  ) : icon ? (
    <Icon name={icon} size={px} className={NUDGE[icon]} />
  ) : null;
  return iconAt === 'end' ? (
    <>
      {children}
      {glyph}
    </>
  ) : (
    <>
      {glyph}
      {children}
    </>
  );
}

export type ButtonProps = Omit<ComponentProps<'button'>, 'children' | 'className'> &
  ButtonLookProps &
  ButtonLabelProps & {
    /**
     * Busy state: spinner, aria-busy, aria-disabled, and no clicks (pointer or keyboard). A busy
     * submit button renders as type="button" so it cannot submit twice; focus stays on it (it is
     * not disabled).
     */
    readonly loading?: boolean;
  };

/** A native button. Hook-free, so it renders in Server and Client Components. */
export function Button({
  variant,
  size,
  shape,
  icon,
  iconAt = 'start',
  loading = false,
  label,
  children,
  className,
  type = 'button',
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={loading ? 'button' : type}
      onClick={loading ? undefined : onClick}
      aria-label={label ?? rest['aria-label']}
      aria-busy={loading || undefined}
      aria-disabled={loading || rest['aria-disabled'] || undefined}
      className={cn(buttonVariants({ variant, size, shape }), className)}
    >
      <ButtonInner icon={icon} iconAt={iconAt} loading={loading} size={size}>
        {children}
      </ButtonInner>
    </button>
  );
}

export type ButtonLinkProps = Omit<SiteLinkProps, 'children' | 'className'> & ButtonLookProps & ButtonLabelProps;

/**
 * An internal link that looks like a button. `href` is a typed SiteRoute; `transitionTypes`
 * and `prefetch` pass through to next/link (heavy routes prefetch on intent by default).
 */
export function ButtonLink({
  variant,
  size,
  shape,
  icon,
  iconAt = 'end',
  label,
  children,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <SiteLink
      {...rest}
      aria-label={label ?? rest['aria-label']}
      className={cn(buttonVariants({ variant, size, shape }), className)}
    >
      <ButtonInner icon={icon} iconAt={iconAt} loading={false} size={size}>
        {children}
      </ButtonInner>
    </SiteLink>
  );
}
