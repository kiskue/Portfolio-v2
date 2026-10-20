'use client';

import { createContext, use, useId, useState, type ReactNode } from 'react';
import { useOptionalBrand } from '@/components/showcase/brand-scope';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { BrandId } from '@/content/types';
import { cn } from '@/lib/cn';

/*
 * "Coded replica | Store screenshots (n)" (design §5.4) as a SegmentedControl. It offers the
 * store side only when the selected brand has kept store screenshots: inside a BrandScope the
 * count is the selected option's `screenshots` (from the store data, see brand-options.tsx);
 * outside one it is counts.store. Without screenshots (SME, Responder) it shows the fixed label
 * "Coded replica · fictional data".
 *
 * The toggle shows one of its SourcePane children. Store screenshots are all 'marketing' images
 * (caption and device baked in): their pane renders them frameless, as ScreenCards, never inside
 * a phone (StorePanes in store-panes.tsx).
 */

export type SourceKind = 'replica' | 'store';

/** The fixed label where no store screenshots exist (design §5.4). */
const REPLICA_ONLY = 'Coded replica · fictional data';

interface SourceContextValue {
  readonly source: SourceKind;
}

const SourceContext = createContext<SourceContextValue>({ source: 'replica' });

export interface SourceToggleProps {
  /** Coded replicas and store screenshots for the current selection (store: the fallback outside a BrandScope). */
  readonly counts: { readonly replica: number; readonly store: number };
  /** SourcePane children: one per source (and per brand for store panes). */
  readonly children?: ReactNode;
  /** The radio group's legend (default "Screens"). */
  readonly label?: string;
  readonly className?: string;
}

export function SourceToggle({ counts, children, label = 'Screens', className }: SourceToggleProps): ReactNode {
  const scope = useOptionalBrand();
  const name = useId();
  const store = scope ? (scope.option?.screenshots ?? 0) : counts.store;
  const [chosen, setChosen] = useState<SourceKind>(counts.replica > 0 ? 'replica' : 'store');
  const source: SourceKind = store > 0 ? chosen : 'replica';

  return (
    <SourceContext value={{ source }}>
      <div className={cn('flex flex-col gap-4', className)} data-source-toggle="" data-source={source}>
        {store > 0 ? (
          <SegmentedControl<SourceKind>
            name={name}
            legend={label}
            legendHidden
            options={[
              { value: 'replica', label: 'Coded replica', disabled: counts.replica === 0 },
              { value: 'store', label: `Store screenshots (${store})` },
            ]}
            value={source}
            onValueChange={setChosen}
            size="sm"
          />
        ) : (
          <p className="text-meta font-semibold text-ink-2">{REPLICA_ONLY}</p>
        )}
        {children}
      </div>
    </SourceContext>
  );
}

export interface SourcePaneProps {
  readonly source: SourceKind;
  /** Store panes: the brand whose screenshots this pane holds (shown while it is selected). */
  readonly brand?: BrandId;
  readonly children: ReactNode;
  readonly className?: string;
}

/** One side of a SourceToggle; hidden panes keep their lazy images unloaded. */
export function SourcePane({ source, brand, children, className }: SourcePaneProps): ReactNode {
  const { source: selected } = use(SourceContext);
  const scope = useOptionalBrand();
  const shown = source === selected && (brand === undefined || scope === null || scope.brand === brand);
  return (
    <div className={className} hidden={!shown} data-source-pane={source} data-brand={brand}>
      {children}
    </div>
  );
}
