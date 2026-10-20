import type { ReactNode } from 'react';
import { pendingFigureIds } from '@/components/replicas/registry';
import { ScreenView } from '@/components/showcase/screen-view';
import { apps } from '@/content/apps/apps';
import { figures } from '@/content/apps/figures';
import type { Figure } from '@/content/types';
import { DevSection, Term } from './dev-section';

/** Section 5: every registered figure in every state, with its build status. */
export function FigureList(): ReactNode {
  const pending = new Set(pendingFigureIds());
  return (
    <DevSection
      id="figures"
      title="5. Figures"
      intro={
        <>
          The {figures.length} figures in <Term>figures.ts</Term>, each rendered through{' '}
          <Term>ScreenView</Term> in every state (states[0] is the default).{' '}
          <strong className="text-ink-2">
            {pending.size} of {figures.length} pending
          </strong>
          : those still draw <Term>PendingReplica</Term> until the app task replaces them.
        </>
      }
    >
      {apps.map((app) => (
        <div key={app.id} className="mt-10 first:mt-0">
          <h3 className="text-h3-hero">{app.name}</h3>
          <ul className="mt-4 grid gap-4">
            {figures
              .filter((figure) => figure.app === app.id)
              .map((figure: Figure) => {
                const isPending = pending.has(figure.id);
                return (
                  <li key={figure.id} className="rounded-card border border-line bg-surface p-4" data-figure={figure.id}>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-block w-16 font-mono text-fig text-ink-2 uppercase">FIG {figure.id}</span>
                      <span className="text-card-title">{figure.title}</span>
                      <span
                        className={
                          isPending
                            ? 'rounded-full bg-ph-bg px-2.5 py-0.5 text-meta text-ph-ink'
                            : 'rounded-full bg-avail-bg px-2.5 py-0.5 text-meta text-avail-ink'
                        }
                        data-status={isPending ? 'pending' : 'built'}
                      >
                        {isPending ? 'Pending' : 'Built'}
                      </span>
                      <span className="text-meta text-ink-3">
                        {figure.priority} · {figure.theme} · {figure.brandable ? 'brandable' : 'fixed palette'}
                        {figure.rollout ? ` · ${figure.rollout}` : ''}
                      </span>
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-6">
                      {figure.states.map((state, index) => (
                        <li key={state}>
                          <figure className="flex w-min flex-col gap-2">
                            <ScreenView source={{ kind: 'replica', figure: figure.id, state }} size="sm" />
                            <figcaption className="text-meta text-ink-3">
                              {state}
                              {index === 0 ? ' (default)' : ''}
                            </figcaption>
                          </figure>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </DevSection>
  );
}
