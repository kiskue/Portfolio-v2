// STUB — owned by W7, replaced in wave 2a
'use client';

import type { ReactNode } from 'react';

export interface SourceToggleProps {
  /** Coded replicas and real screenshots available for the current selection. */
  readonly counts: { readonly replica: number; readonly store: number };
}

/**
 * "Coded replica | Real screenshots (n)" as a SegmentedControl (design §5.4); rendered only
 * where screenshots exist. Stub: a static line with the counts.
 */
export function SourceToggle({ counts }: SourceToggleProps): ReactNode {
  return (
    <p className="text-meta text-ink-3">
      Coded replica ({counts.replica}) · Real screenshots ({counts.store})
    </p>
  );
}
