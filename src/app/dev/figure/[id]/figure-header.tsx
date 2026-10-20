import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { pendingFigureIds } from '@/components/replicas/registry';
import { Chip } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { appById } from '@/content/derived';
import type { Figure } from '@/content/types';
import { adjacentFigures, figureHref } from './figure-nav';

const PAGER_LINK =
  'inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-line-strong bg-raised px-4 py-2 text-body-sm text-ink hover:bg-nav-hover';

/** Previous / next figure (figures.ts order, wrapping), so a reviewer can step through all 21. */
function FigurePager({ figure }: { readonly figure: Figure }): ReactNode {
  const { previous, next } = adjacentFigures(figure.id);
  return (
    <nav aria-label="Previous and next figure" className="mt-6 flex flex-wrap gap-3">
      <Link href={figureHref(previous.id)} rel="prev" className={PAGER_LINK}>
        <Icon name="arrow-left" size={16} />
        <span className="min-w-0">
          <span className="text-ink-3">Previous:</span> FIG {previous.id} {previous.title}
        </span>
      </Link>
      <Link href={figureHref(next.id)} rel="next" className={PAGER_LINK}>
        <span className="min-w-0">
          <span className="text-ink-3">Next:</span> FIG {next.id} {next.title}
        </span>
        <Icon name="arrow-right" size={16} />
      </Link>
    </nav>
  );
}

function Fact({ label, children }: { readonly label: string; readonly children: ReactNode }): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="text-eyebrow text-ink-3 uppercase">{label}</dt>
      <dd className="mt-1 text-body-sm text-ink">{children}</dd>
    </div>
  );
}

/** The figure's identity: FIG id, title, caption, priority and the facts a reviewer checks against. */
export function FigureHeader({ figure }: { readonly figure: Figure }): ReactNode {
  const app = appById(figure.app);
  const pending = pendingFigureIds().includes(figure.id);
  return (
    <header>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 text-meta text-ink-3">
          <li>
            <Link href={'/dev' as Route} className="inline-flex min-h-6 items-center underline underline-offset-4">
              Dev pages
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={'/dev/replicas#figures' as Route} className="inline-flex min-h-6 items-center underline underline-offset-4">
              Replicas
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">FIG {figure.id}</li>
        </ol>
      </nav>

      <p className="mt-6 text-eyebrow text-ink-3 uppercase">
        FIG {figure.id} · {app.name} · {figure.priority}
      </p>
      <h1 className="mt-2 text-h1">{figure.title}</h1>
      <p className="mt-3 max-w-[65ch] text-lead text-ink-2">
        <Copy text={figure.caption} />
      </p>
      <p className="mt-4 flex flex-wrap gap-2">
        <Chip tone={pending ? 'ph' : 'avail'}>{pending ? 'Replica pending' : 'Built'}</Chip>
        <Chip tone="ink">Priority {figure.priority}</Chip>
        {figure.rollout ? <Chip>{figure.rollout}</Chip> : null}
      </p>

      <dl className="mt-6 grid max-w-5xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="App">{app.name}</Fact>
        <Fact label="Theme">
          {figure.theme === 'dark' ? 'Dark' : 'Light'} theme · {figure.statusBar} status-bar glyphs
        </Fact>
        <Fact label="Brands">{figure.brandable ? 'Re-skinned by brand' : 'Fixed palette'}</Fact>
        <Fact label="Research screen">{figure.key}</Fact>
        <Fact label={`States (${figure.states.length})`}>{figure.states.join(' · ')}</Fact>
        <Fact label="Accessible summary">{figure.summary}</Fact>
        <Fact label="Purpose">
          <Copy text={figure.purpose} />
        </Fact>
      </dl>

      <FigurePager figure={figure} />
    </header>
  );
}
