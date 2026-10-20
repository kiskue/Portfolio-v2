import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * The ONE surface (reuse rule 1): no other component defines a surface border, radius or
 * shadow. Bento, project and quote cards compose <Card>; dialogs, sheets and popovers use
 * `cardVariants` on their Radix content element.
 *
 * - surface: cream `surface` (cards), white `raised` (inner cards, quote cards, popovers),
 *   `sunken` (diagram lanes, mono blocks), `sidebar` (the menu sheet).
 * - radius: `control` 12px, `card` 18px, `bento` 30px (the bento container, concentric with
 *   18px cards inside its 12px padding), `none` (edge-to-edge sheets).
 * - elevation: shadows come with the surface; `flat` removes them, `high` is for floating
 *   layers (popovers, dialogs). Dark mode swaps the soft shadows for the 1px border (tokens.css).
 * - interactive: the linked-card hover lift (−3px, shadow sm→md, glow border; colour and shadow
 *   only under reduced motion), press .985, and the focus ring drawn on the card while its
 *   stretched link has keyboard focus. Use it only on a card that is one single link.
 */
export const cardVariants = cva('relative border', {
  variants: {
    surface: {
      surface: 'border-line bg-surface shadow-xs',
      raised: 'border-line bg-raised shadow-sm',
      sunken: 'border-line bg-sunken',
      sidebar: 'border-line bg-sidebar',
    },
    radius: {
      none: 'rounded-none',
      control: 'rounded-control',
      card: 'rounded-card',
      bento: 'rounded-bento',
    },
    pad: {
      none: '',
      sm: 'p-3',
      md: 'p-4 md:p-5',
    },
    elevation: {
      flat: 'shadow-none',
      high: 'shadow-lg',
    },
    interactive: {
      true: [
        'transition-[translate,scale,box-shadow,border-color] duration-(--dur-2) ease-out',
        'hover:-translate-y-[3px] hover:border-glow hover:shadow-md',
        'active:scale-[0.985]',
        'reduce-motion:hover:translate-y-0 reduce-motion:active:scale-100',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
      ],
      false: '',
    },
  },
  defaultVariants: { surface: 'surface', radius: 'card', pad: 'md', interactive: false },
});

export type CardVariantProps = VariantProps<typeof cardVariants>;
export type CardElement = 'div' | 'article' | 'section' | 'li';

export type CardProps<E extends CardElement = 'div'> = CardVariantProps & {
  /** The element to render; a plain div by default. */
  readonly as?: E;
  readonly className?: string;
} & Omit<ComponentProps<E>, 'as' | 'className'>;

/** A surface. Hook-free, so it renders in Server and Client Components alike. */
export function Card<E extends CardElement = 'div'>({
  as,
  surface,
  radius,
  pad,
  elevation,
  interactive,
  className,
  ...rest
}: CardProps<E>) {
  // The props were checked against `E` at the call site; one element type is enough here.
  const Element = (as ?? 'div') as 'div';
  return (
    <Element
      {...(rest as Omit<ComponentProps<'div'>, 'className'>)}
      className={cn(cardVariants({ surface, radius, pad, elevation, interactive }), className)}
    />
  );
}

/**
 * Classes for the one link that makes a whole card clickable: its ::after covers the card (the
 * card must be `relative`, which Card is) and the focus ring moves to the card itself (Card
 * `interactive`), so the link draws no second ring around its text. `outline-hidden` keeps a
 * transparent outline, which still shows in forced-colors mode.
 */
export const stretchedLinkClass = 'after:absolute after:inset-0 focus-visible:outline-hidden';
