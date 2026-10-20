'use client';

import { usePathname } from 'next/navigation';
import { cloneElement, lazy, Suspense, useEffect, useId, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';

/** The sheet's dialog code (Radix) loads on first intent, keeping it out of every page's first load. */
const loadDialog = () => import('@/components/layout/menu-sheet-dialog');
const MenuSheetDialog = lazy(loadDialog);

/** Where the docked sidebar takes over (Tailwind xl, 80rem): an open sheet has no place there. */
const SIDEBAR_QUERY = '(min-width: 80rem)';

function preload(): void {
  void loadDialog();
}

export interface MenuSheetProps {
  /** The menu button, rendered on the server (a plain <button>). */
  readonly trigger: ReactElement<ComponentProps<'button'>>;
  /** The sheet's content: ProfileRail variant="sheet", rendered on the server. */
  readonly children: ReactNode;
}

/**
 * The menu sheet below 1280px (design §4.1): the menu button plus a Radix dialog from the inline
 * start. The button carries aria-haspopup, aria-expanded and aria-controls. The dialog code is
 * fetched when the button is first hovered, focused or touched, and the sheet opens on click.
 *
 * Focus moves to the current nav link on open, is trapped while open, and returns to the menu
 * button on close. The sheet closes on Esc, a scrim click, the close button, any internal link in
 * it (even to the current page) and any route change (back and forward included), and also when
 * the window grows into the sidebar layout.
 */
export function MenuSheet({ trigger, children }: MenuSheetProps) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const pathname = usePathname();
  const [shownPath, setShownPath] = useState(pathname);
  const wasOpen = useRef(false);
  const triggerId = useId();
  const bodyId = useId();

  // A route change closes the sheet. Adjusting state during render (not in an effect) means the
  // new page never renders with the sheet still open.
  if (shownPath !== pathname) {
    setShownPath(pathname);
    if (open) setOpen(false);
  }

  // Focus returns to the menu button however the sheet closed (Radix has no trigger of its own here).
  useEffect(() => {
    if (wasOpen.current && !open) document.getElementById(triggerId)?.focus();
    wasOpen.current = open;
  }, [open, triggerId]);

  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia(SIDEBAR_QUERY);
    const closeWhenWide = (): void => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener('change', closeWhenWide);
    return () => wide.removeEventListener('change', closeWhenWide);
  }, [open]);

  const button = cloneElement(trigger, {
    id: triggerId,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? bodyId : undefined,
    onPointerEnter: preload,
    onFocus: preload,
    onTouchStart: preload,
    onClick: () => {
      setRequested(true);
      setOpen(true);
    },
  });

  return (
    <>
      {button}
      {requested ? (
        <Suspense fallback={null}>
          <MenuSheetDialog open={open} onOpenChange={setOpen} bodyId={bodyId}>
            {children}
          </MenuSheetDialog>
        </Suspense>
      ) : null}
    </>
  );
}
