'use client';

import type { MouseEvent, ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';

/** Initial focus goes to the current page's nav link (design §4.1); without one, Radix's default applies. */
function focusCurrentLink(event: Event): void {
  const content = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const current = content?.querySelector<HTMLElement>('nav [aria-current="page"]');
  if (!current) return;
  event.preventDefault();
  current.focus();
}

export interface MenuSheetDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Id of the sheet's body, which the menu button's aria-controls names. */
  readonly bodyId: string;
  readonly children: ReactNode;
}

/**
 * The menu sheet itself: the Radix dialog (look sheet-start) with the scrim, the focus trap and
 * Esc / scrim / close-button dismissal. Loaded only when the menu button is first hovered,
 * focused or touched (see MenuSheet), so Radix stays out of the first-load JavaScript.
 */
export default function MenuSheetDialog({ open, onOpenChange, bodyId, children }: MenuSheetDialogProps) {
  // Any internal link closes the sheet, even one to the current page (no route change then).
  function closeOnInternalLink(event: MouseEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest('a[href^="/"]')) onOpenChange(false);
  }

  return (
    <Dialog
      look="sheet-start"
      title="Menu"
      titleHidden
      closeLabel="Close menu"
      open={open}
      onOpenChange={onOpenChange}
      onOpenAutoFocus={focusCurrentLink}
      className="[scrollbar-width:thin]"
    >
      {/* Event delegation only: the links inside are the interactive elements. */}
      <div id={bodyId} className="flex min-h-full flex-col" onClick={closeOnInternalLink}>
        {children}
      </div>
    </Dialog>
  );
}
