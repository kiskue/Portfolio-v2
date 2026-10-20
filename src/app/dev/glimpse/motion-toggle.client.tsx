'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Dev-only: forces html[data-motion="reduce"] while pressed, so every player on the page can be
 * checked in its reduced-motion state (posters, Play, no tap rings) without changing settings.
 */
export function MotionToggle(): ReactNode {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!reduced) return undefined;
    const root = document.documentElement;
    const previous = root.dataset.motion;
    root.dataset.motion = 'reduce';
    return () => {
      if (previous === undefined) delete root.dataset.motion;
      else root.dataset.motion = previous;
    };
  }, [reduced]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={reduced}
        onClick={() => setReduced((value) => !value)}
        className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-raised px-4 text-button text-ink aria-pressed:border-ink aria-pressed:bg-nav-active"
        data-dev-motion-toggle=""
      >
        Reduced motion on this page
      </button>
      <p className="text-meta text-ink-3">
        {reduced ? 'Reduced motion: posters, Play to start, no tap rings.' : 'Full motion: players start when half visible.'}
      </p>
    </div>
  );
}
