'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MotionDemoProps {
  /** Server-rendered phones whose kit animations follow the motion contract. */
  readonly children: ReactNode;
}

const BUTTON =
  'inline-flex min-h-10 items-center rounded-full border border-line-strong bg-raised px-4 text-button text-ink aria-pressed:border-ink aria-pressed:bg-nav-active';

/**
 * Dev-only island that proves the motion contract around server-rendered phones: it toggles
 * data-active (and restarts it), data-paused, and html[data-motion="reduce"].
 */
export function MotionDemo({ children }: MotionDemoProps): ReactNode {
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
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

  function restart(): void {
    const node = stage.current;
    if (!node) return;
    node.removeAttribute('data-active');
    // Reading layout flushes styles, so the running animations end before the attribute returns.
    void node.offsetWidth;
    node.setAttribute('data-active', '');
    setActive(true);
  }

  const status = [
    active ? 'data-active set: playing from 0' : 'not active: poster frame',
    paused ? 'data-paused: frozen' : null,
    reduced ? 'reduced motion: poster only' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <div role="group" aria-label="Motion contract controls" className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} aria-pressed={active} onClick={() => setActive((value) => !value)}>
          Active
        </button>
        <button type="button" className={BUTTON} onClick={restart}>
          Restart
        </button>
        <button type="button" className={BUTTON} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          Paused
        </button>
        <button type="button" className={BUTTON} aria-pressed={reduced} onClick={() => setReduced((value) => !value)}>
          Reduced motion
        </button>
      </div>
      <p role="status" className="mt-3 text-meta text-ink-3" data-motion-status="">
        {status}
      </p>
      <div
        ref={stage}
        className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-8"
        data-motion-stage=""
        data-active={active ? '' : undefined}
        data-paused={paused ? '' : undefined}
      >
        {children}
      </div>
    </div>
  );
}
