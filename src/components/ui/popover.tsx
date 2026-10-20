'use client';

import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { cardVariants } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export interface PopoverProps {
  /** One element that toggles the popover (Radix Trigger asChild); it gets aria-expanded. */
  readonly trigger: ReactElement;
  /** Accessible name of the popover panel (role="dialog"). */
  readonly label: string;
  readonly children: ReactNode;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly defaultOpen?: boolean;
  readonly className?: string;
}

/**
 * A non-modal popover on Radix (Display settings on desktop): Esc and an outside click close it
 * (1.4.13), focus moves in on open and back to the trigger on close. It renders in a portal
 * outside <main>; the enter animation is a short fade and scale from the trigger side.
 */
export function Popover({
  trigger,
  label,
  children,
  side = 'top',
  align = 'start',
  open,
  onOpenChange,
  defaultOpen,
  className,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-label={label}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            cardVariants({ surface: 'raised', radius: 'card', pad: 'md', elevation: 'high' }),
            'z-50 w-[min(20rem,calc(100vw-2rem))] origin-(--radix-popover-content-transform-origin)',
            'transition-[opacity,scale] duration-(--dur-2) ease-out starting:scale-95 starting:opacity-0',
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
