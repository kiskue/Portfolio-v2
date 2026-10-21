import type { ReactNode } from 'react';
import type { IconName } from '@/content/types';
import { buttonVariants, type ButtonVariantProps } from '@/components/ui/button';
import { Icon, type IconSize } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

/**
 * A button for a shell client island (the menu sheet, display settings), prepared on the server.
 *
 * The islands render their own <button> from it instead of cloning a server-rendered element: an
 * element passed from a Server Component can reach the client as a lazy reference, which neither
 * cloneElement nor Radix's Slot can clone (it crashed every page in `next dev`). The classes are
 * merged here, so no class merging ships in the islands, and the glyph is server-rendered SVG that
 * the island only places as a child.
 */
export interface ShellButton {
  readonly className: string;
  /** The glyph, plus the visible text when there is one. Rendered as children, never cloned. */
  readonly content: ReactNode;
  /** aria-label for an icon-only button; undefined when the content has visible text. */
  readonly label: string | undefined;
}

type ShellButtonOptions = Omit<ButtonVariantProps, 'size'> & {
  readonly size?: 'sm' | 'md';
  readonly icon: IconName;
  readonly className?: string;
} & ({ readonly text: string; readonly label?: never } | { readonly text?: never; readonly label: string });

/** The glyph sizes of ui/Button, so a shell button looks exactly like its Button counterpart. */
function glyphSize(size: 'sm' | 'md', iconOnly: boolean): IconSize {
  if (size === 'sm') return iconOnly ? 16 : 14;
  return iconOnly ? 18 : 16;
}

export function shellButton({ variant, size = 'md', shape, icon, text, label, className }: ShellButtonOptions): ShellButton {
  const glyph = <Icon name={icon} size={glyphSize(size, text === undefined)} />;
  return {
    className: cn(buttonVariants({ variant, size, shape }), className),
    content: text === undefined ? glyph : (
      <>
        {glyph}
        {text}
      </>
    ),
    label: text === undefined ? label : undefined,
  };
}
