import Link from 'next/link';
import type { ReactNode } from 'react';
import { apps } from '@/content/apps/apps';
import { figures } from '@/content/apps/figures';
import type { FigureId } from '@/content/types';
import { figureHref } from './figure-nav';

/** Every figure by app, for jumping straight to one. The current figure is marked. */
export function FigureIndex({ current }: { readonly current: FigureId }): ReactNode {
  return (
    <nav aria-labelledby="all-figures-title" className="mt-16 border-t border-line pt-8">
      <h2 id="all-figures-title" className="text-h3-hero">
        All figures
      </h2>
      <div className="mt-4 space-y-4">
        {apps.map((app) => (
          <div key={app.id}>
            <p className="text-eyebrow text-ink-3 uppercase">{app.name}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {figures
                .filter((figure) => figure.app === app.id)
                .map((figure) => (
                  <li key={figure.id}>
                    <Link
                      href={figureHref(figure.id)}
                      aria-current={figure.id === current ? 'page' : undefined}
                      className="inline-flex min-h-8 min-w-12 items-center justify-center rounded-control border border-line bg-surface px-3 text-meta text-ink-2 tabular-nums hover:bg-nav-hover aria-[current=page]:border-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
                    >
                      {figure.id}
                      <span className="sr-only"> {figure.title}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
