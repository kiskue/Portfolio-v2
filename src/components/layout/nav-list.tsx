'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteLink } from '@/components/ui/site-link';
import type { NavItem } from '@/content/types';

/** A nav item with its icon already rendered on the server (keeps the icon registry out of this island). */
export type NavListItem = Omit<NavItem, 'icon'> & { readonly icon: ReactNode };

export interface NavListProps {
  readonly items: readonly NavListItem[];
  readonly className?: string;
}

/** 'exact' for Home; 'prefix' keeps Projects current on /projects/<slug> (design §2). */
function isCurrent(item: Pick<NavItem, 'href' | 'match'>, pathname: string): boolean {
  if (item.match === 'exact' || item.href === '/') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/*
 * Design §4.1: 40px rows (44 on coarse pointers), radius 12, padding 0 12, 12px icon gap, 18px
 * icons. Inactive: icon ink-3, label ink-2. Current: nav-active pill, a 3×18 ink bar at the
 * inline start, label ink 600, icon accent-ink, aria-current="page". In forced-colours mode the
 * pill and bar vanish, so the current row keeps a visible system-colour border instead.
 * Plain strings, no class merging: tailwind-merge stays out of this first-load island.
 */
const LINK = [
  'relative flex h-10 items-center gap-3 rounded-control border border-transparent px-3 text-nav text-ink-2 pointer-coarse:h-11',
  'transition-colors duration-(--dur-1) ease-out hover:bg-nav-hover hover:text-ink',
  '[&_svg]:text-ink-3 hover:[&_svg]:text-ink-2',
  'aria-[current=page]:bg-nav-active aria-[current=page]:font-semibold aria-[current=page]:text-ink',
  'aria-[current=page]:[&_svg]:text-accent-ink',
  'before:absolute before:start-0 before:top-1/2 before:hidden before:h-4.5 before:w-0.75 before:-translate-y-1/2 before:rounded-full before:bg-ink',
  'aria-[current=page]:before:block',
  'forced-colors:aria-[current=page]:border-[CanvasText]',
].join(' ');

/**
 * The primary nav list (client: it reads the pathname to mark the current page). Every item is
 * a SiteLink, so the heavy routes (Showcase) prefetch only on hover, focus or touch.
 */
export function NavList({ items, className }: NavListProps) {
  const pathname = usePathname();
  return (
    <ul className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      {items.map((item) => (
        <li key={item.id}>
          <SiteLink href={item.href} aria-current={isCurrent(item, pathname) ? 'page' : undefined} className={LINK}>
            {item.icon}
            <span className="min-w-0 truncate">{item.label}</span>
          </SiteLink>
        </li>
      ))}
    </ul>
  );
}
