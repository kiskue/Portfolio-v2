import Link from 'next/link';
import type { ReactNode } from 'react';
import { site } from '@/content/site';

/**
 * STUB from the scaffold; the shell task replaces it with the profile rail, top bar and sheet.
 * Landmarks follow design §10. Fixed decor, toasts and portals must render OUTSIDE <main>:
 * <main> becomes a size container (cqi units, bento container queries), and a size container
 * would become the containing block for fixed-position descendants.
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-button focus:text-raised"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-dvh max-w-[97.5rem] flex-col xl:flex-row">
        <aside
          aria-label="Profile and site navigation"
          className="border-b border-line bg-sidebar p-6 xl:sticky xl:top-0 xl:h-dvh xl:w-66 xl:shrink-0 xl:border-e xl:border-b-0"
        >
          <p className="text-card-title">{site.name}</p>
          <nav aria-label="Primary" className="mt-4">
            <ul className="flex flex-wrap gap-1 xl:flex-col">
              {site.nav.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block rounded-control px-3 py-2 text-nav text-ink-2 hover:bg-nav-hover hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main id="content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </>
  );
}
