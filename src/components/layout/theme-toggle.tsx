'use client';

import type { ReactNode } from 'react';
import { setDisplay } from '@/lib/display-store';

export interface ThemeToggleProps {
  /**
   * The server-rendered face: the moon and sun glyphs and both labels, each shown or hidden by
   * the `.dark` class (see SocialRow). The pre-paint script sets that class, so the icon and
   * the accessible name are already right before hydration.
   */
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Flips between light and dark explicitly (design §9), whatever the current preference, and
 * remembers the choice through the display store. Switching is instant: no crossfade (PLAN).
 */
export function ThemeToggle({ children, className }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => setDisplay({ theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark' })}
    >
      {children}
    </button>
  );
}
