'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MapMotionLabProps {
  /** Server-rendered phones whose map animations follow the motion contract. */
  readonly children: ReactNode;
  /** Times to freeze the animations at, in ms after activation. */
  readonly marks: readonly number[];
}

const BUTTON =
  'inline-flex min-h-10 items-center rounded-full border border-line-strong bg-raised px-4 text-button text-ink aria-pressed:border-ink aria-pressed:bg-nav-active';

/**
 * Dev-only island for the map's motion: toggles data-active (and restarts it), data-paused and
 * html[data-motion="reduce"], and freezes every animation at a chosen time (Web Animations
 * seek), so each frame of a glide or recolour can be reviewed and captured.
 */
export function MapMotionLab({ children, marks }: MapMotionLabProps): ReactNode {
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [frozenAt, setFrozenAt] = useState<number | null>(null);

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

  function activateFromZero(node: HTMLDivElement): void {
    node.removeAttribute('data-active');
    // Reading layout flushes styles, so the running animations end before the attribute returns.
    void node.offsetWidth;
    node.setAttribute('data-active', '');
  }

  function restart(): void {
    const node = stage.current;
    if (!node) return;
    activateFromZero(node);
    setActive(true);
    setFrozenAt(null);
  }

  function freezeAt(ms: number): void {
    const node = stage.current;
    if (!node) return;
    activateFromZero(node);
    for (const animation of node.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = ms;
    }
    setActive(true);
    setFrozenAt(ms);
  }

  const status = [
    active ? (frozenAt === null ? 'data-active set: playing from 0' : `frozen at ${frozenAt} ms`) : 'not active: poster',
    paused ? 'data-paused: frozen' : null,
    reduced ? 'reduced motion: poster only' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <div role="group" aria-label="Map motion controls" className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON}
          aria-pressed={active}
          onClick={() => {
            setActive((value) => !value);
            setFrozenAt(null);
          }}
        >
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
      <div role="group" aria-label="Freeze the animations at a time" className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-meta text-ink-3">Freeze at</span>
        {marks.map((mark) => (
          <button key={mark} type="button" className={BUTTON} aria-pressed={frozenAt === mark} onClick={() => freezeAt(mark)} data-freeze={mark}>
            {(mark / 1000).toFixed(1)} s
          </button>
        ))}
      </div>
      <p role="status" className="mt-3 text-meta text-ink-3" data-map-motion-status="">
        {status}
      </p>
      <div
        ref={stage}
        className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-8"
        data-map-motion-stage=""
        data-active={active ? '' : undefined}
        data-paused={paused ? '' : undefined}
      >
        {children}
      </div>
    </div>
  );
}
