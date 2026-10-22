'use client';

import { useId, type ReactNode } from 'react';
import { useShowcaseView } from '@/components/sections/showcase/showcase-provider';
import { BrandScope, BrandSwitcher, type BrandScopeProps } from '@/components/showcase/brand-scope';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import {
  REPLICA_LABEL,
  REPLICA_ONLY_LABEL,
  brandScopeOf,
  realScreenshotsLabel,
  resultText,
  type AppFilter,
  type BrandableApp,
  type SourceFilter,
} from '@/lib/showcase-filters';

/*
 * The Showcase filters (design §7) as native-radio SegmentedControls in their chips look (the
 * primitive's look for filters: it wraps cleanly on a phone, and matches the brand chips):
 * - App: All · SME · Citizen · Responder (full app names in the accessible names);
 * - Brand: the app's BrandSwitcher (store icons or monograms, its status line and the
 *   "emergency colours never change" caption), shown only while Citizen or Responder is chosen.
 *   It is a second BrandScope on the same URL key as the wall's, so both follow one selection;
 * - Source: All · Coded replica · Real screenshots (n), the source toggle's words. A selection
 *   without real screenshots shows the toggle's fixed "Coded replica · fictional data" instead.
 * The live count sits in a role="status" region; Clear filters resets every param at once.
 */

export interface FilterBarProps {
  /** All, then one option per app (short label, full name for screen readers). */
  readonly apps: readonly SegmentedOption<AppFilter>[];
  /** Each white-label app's BrandScope props (same options and URL key as the wall's scope). */
  readonly scopes: Readonly<Record<BrandableApp, Omit<BrandScopeProps, 'children'>>>;
  readonly className?: string;
}

export function FilterBar({ apps, scopes, className }: FilterBarProps): ReactNode {
  const view = useShowcaseView();
  const appName = useId();
  const sourceName = useId();
  const scope = brandScopeOf(view.filters.app);
  const sources: readonly SegmentedOption<SourceFilter>[] = [
    { value: 'all', label: 'All' },
    { value: 'replica', label: REPLICA_LABEL },
    { value: 'real', label: realScreenshotsLabel(view.real) },
  ];

  return (
    <Card
      as="section"
      aria-label="Filter the screens"
      className={className}
      data-showcase-filters=""
      data-ready={view.ready ? '' : undefined}
    >
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <div id={view.appFieldId}>
          <SegmentedControl
            name={appName}
            legend="App"
            options={apps}
            value={view.filters.app}
            onValueChange={view.setApp}
            look="chips"
            size="sm"
          />
        </div>
        {view.real > 0 ? (
          <SegmentedControl
            name={sourceName}
            legend="Source"
            options={sources}
            value={view.source}
            onValueChange={view.setSource}
            look="chips"
            size="sm"
          />
        ) : (
          <div data-source-fixed="">
            <p className="mb-2 text-meta font-semibold text-ink-2">Source</p>
            <p className="flex min-h-8 items-center text-meta font-semibold text-ink">{REPLICA_ONLY_LABEL}</p>
          </div>
        )}
      </div>
      {scope ? (
        <BrandScope key={scope} {...scopes[scope]}>
          <BrandSwitcher label="Brand" className="mt-5" />
        </BrandScope>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <p role="status" className="text-meta font-semibold text-ink-2" data-showcase-count="">
          {resultText(view.shown, view.total)}
        </p>
        {view.filtered ? (
          <Button variant="ghost" size="sm" icon="rotate-ccw" onClick={view.clear}>
            Clear filters
          </Button>
        ) : null}
        <noscript>
          <p className="text-meta text-ink-3">The filters need JavaScript; the whole wall is shown below.</p>
        </noscript>
      </div>
    </Card>
  );
}

export interface ShowcaseEmptyProps {
  /** The server-rendered empty state (components/content EmptyState, with ShowcaseClear as its action). */
  readonly children: ReactNode;
}

/** Shows "Nothing matches these filters." only when no tile matches. */
export function ShowcaseEmpty({ children }: ShowcaseEmptyProps): ReactNode {
  const view = useShowcaseView();
  return view.shown > 0 ? null : children;
}

export interface ShowcaseClearProps {
  readonly label: string;
}

/** The empty state's action: Clear filters, which resets every param and refocuses the App choice. */
export function ShowcaseClear({ label }: ShowcaseClearProps): ReactNode {
  const view = useShowcaseView();
  if (!view.filtered) return null;
  return (
    <Button variant="secondary" size="sm" icon="rotate-ccw" onClick={view.clear}>
      {label}
    </Button>
  );
}
