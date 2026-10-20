import type { ReactNode } from 'react';
import { DecorLayer } from '@/components/layout/decor-layer';
import { MobileFooter } from '@/components/layout/mobile-footer';
import { ProfileRail } from '@/components/layout/profile-rail';
import { SkipLink } from '@/components/layout/skip-link';
import { TopBar } from '@/components/layout/top-bar';

/*
 * The site shell (design §4.1, PLAN "Shell"). The sidebar/top-bar switch is CSS only (xl =
 * 1280px), so server HTML and hydration always agree:
 *
 * - ≥1600 (3xl): the shell is centred at max 1560px; the 264px sidebar has borders on both sides.
 * - 1280–1599 (xl): the sidebar docks flush left, sticky, full height, scrolling on its own.
 * - <1280: a sticky top bar with a menu sheet that reuses the same ProfileRail, and a footer.
 *
 * <main id="content" tabindex="-1"> is the size container for every page (container-type:
 * inline-size: the cqi type scale and the bento container queries). Its content box is at most
 * 1200px and its padding is the page gutter, --gutter: 16px (20 from 360px), 24 from 768, 32
 * from 1024, 40 from 1280 and 48 from 1440. Pages add no top padding of their own.
 *
 * A size container is the containing block of fixed-position descendants, so fixed layers
 * (DecorLayer), portals (dialogs, popovers) and toasts always render OUTSIDE <main>.
 */

const GUTTER = '[--gutter:1rem] min-[22.5rem]:[--gutter:1.25rem] md:[--gutter:1.5rem] lg:[--gutter:2rem] xl:[--gutter:2.5rem] min-[90rem]:[--gutter:3rem]';

export function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <DecorLayer />
      <div className={`relative isolate mx-auto flex min-h-dvh w-full flex-col xl:flex-row 3xl:max-w-[97.5rem] ${GUTTER}`}>
        <TopBar />
        <aside
          aria-label="Profile and site navigation"
          className="sticky top-0 hidden h-dvh w-66 shrink-0 self-start overflow-y-auto overscroll-contain border-e border-line bg-sidebar [scrollbar-width:thin] [view-transition-name:sidebar] xl:flex 3xl:border-s print:hidden"
        >
          <ProfileRail variant="sidebar" />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="content"
            tabIndex={-1}
            className="@container mx-auto w-full max-w-[calc(75rem+2*var(--gutter))] flex-1 px-(--gutter) pt-6 pb-16 outline-hidden md:pt-8 xl:pt-10"
          >
            {children}
          </main>
          <MobileFooter />
        </div>
      </div>
    </>
  );
}
