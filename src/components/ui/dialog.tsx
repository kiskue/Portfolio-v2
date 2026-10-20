'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/components/ui/card';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/cn';

export type DialogLook = 'sheet-start' | 'center' | 'fullscreen';

export interface DialogProps {
  readonly title: string;
  /** Keep the title for screen readers only (it still names the dialog). */
  readonly titleHidden?: boolean;
  readonly description?: string;
  /** sheet-start: the menu sheet; center: a modal card; fullscreen: the lightbox on mobile. */
  readonly look: DialogLook;
  readonly children: ReactNode;
  /** Controlled open state (with onOpenChange). */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly defaultOpen?: boolean;
  /** One element that opens the dialog (rendered through Radix Trigger asChild). */
  readonly trigger?: ReactElement;
  readonly closeLabel?: string;
  /** e.g. move initial focus to the current nav link (call event.preventDefault() first). */
  readonly onOpenAutoFocus?: (event: Event) => void;
  readonly className?: string;
}

const OVERLAY = 'fixed inset-0 z-50 bg-scrim transition-opacity duration-(--dur-3) ease-out starting:opacity-0';

/** Enter animations use @starting-style; under reduced motion motion.css keeps only the fade. */
const CONTENT: Record<DialogLook, string> = {
  'sheet-start': cn(
    cardVariants({ surface: 'sidebar', radius: 'none', pad: 'none', elevation: 'high' }),
    'fixed inset-y-0 start-0 z-50 flex h-dvh w-[min(360px,88vw)] flex-col overflow-y-auto border-y-0 border-s-0',
    'transition-[opacity,translate] duration-240 ease-out starting:-translate-x-6 starting:opacity-0',
  ),
  center: cn(
    cardVariants({ surface: 'raised', radius: 'card', pad: 'md', elevation: 'high' }),
    'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto',
    'transition-[opacity,scale] duration-(--dur-2) ease-out starting:scale-[0.98] starting:opacity-0',
  ),
  fullscreen: cn(
    cardVariants({ surface: 'surface', radius: 'none', pad: 'none', elevation: 'flat' }),
    'fixed inset-0 z-50 flex flex-col overflow-y-auto border-0',
    'transition-opacity duration-(--dur-2) ease-out starting:opacity-0',
  ),
};

/** Exit keyframes (Web Animations): Radix unmounts on close, so CSS transitions cannot run. */
const EXIT: Record<DialogLook, Keyframe[]> = {
  'sheet-start': [
    { opacity: 1, translate: '0 0' },
    { opacity: 0, translate: '-24px 0' },
  ],
  center: [
    { opacity: 1, scale: '1' },
    { opacity: 0, scale: '0.98' },
  ],
  fullscreen: [{ opacity: 1 }, { opacity: 0 }],
};
const FADE_OUT: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];

/**
 * A modal dialog on Radix: focus is trapped inside and returns to the trigger (or the element
 * focused before) on close; Esc, the close button and a scrim click close it; it renders in a
 * portal outside <main>. Exits animate for 160ms (fade only, 120ms, under reduced motion).
 */
export function Dialog({
  title,
  titleHidden = false,
  description,
  look,
  children,
  open: openProp,
  onOpenChange,
  defaultOpen = false,
  trigger,
  closeLabel = 'Close',
  onOpenAutoFocus,
  className,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const reducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  function commit(next: boolean) {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      commit(true);
      return;
    }
    const content = contentRef.current;
    if (closing.current) return;
    if (!content || typeof content.animate !== 'function') {
      commit(false);
      return;
    }
    closing.current = true;
    const timing: KeyframeAnimationOptions = {
      duration: reducedMotion ? 120 : 160,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    };
    const animations = [content.animate(reducedMotion ? FADE_OUT : EXIT[look], timing)];
    if (overlayRef.current) animations.push(overlayRef.current.animate(FADE_OUT, timing));
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      closing.current = false;
      // Render the close synchronously, then drop the held end frame: it no longer matters once
      // Radix has unmounted the content, and it restores the dialog if the owner kept it open.
      flushSync(() => commit(false));
      for (const animation of animations) animation.cancel();
    });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay ref={overlayRef} className={OVERLAY} />
        <DialogPrimitive.Content
          ref={contentRef}
          className={cn(CONTENT[look], className)}
          onOpenAutoFocus={onOpenAutoFocus}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className={cn('flex items-start gap-4', look === 'center' ? '' : 'p-4 md:p-5')}>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className={titleHidden ? 'sr-only' : 'text-h3-hero text-ink'}>
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className={cn('text-body-sm text-ink-3', !titleHidden && 'mt-1')}>
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" shape="circle" icon="x" label={closeLabel} />
            </DialogPrimitive.Close>
          </div>
          <div className={cn('min-h-0 flex-1', look === 'center' ? 'mt-4' : 'px-4 pb-4 md:px-5 md:pb-5')}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
