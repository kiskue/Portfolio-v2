'use client';

import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { useAutoplay } from '@/hooks/use-autoplay';
import { cn } from '@/lib/cn';

/*
 * MarqueeRoot, the tools strip's client island (design §4.2, architecture D2). It only flips
 * attributes on server-rendered markup; tools-strip.css does the rest:
 * - data-ready once hydrated: the marquee animates only from then on, so without JavaScript the
 *   strip is still (WCAG 2.2.2) and the controls, which need JavaScript, stay hidden;
 * - data-running from the one autoplay policy (useAutoplay): off while less than half of the
 *   strip is on screen, in a hidden tab, after a user pause, and under reduced motion (where the
 *   CSS swaps the marquee for wrapped chips anyway). Hovering the track and focus within the
 *   strip pause it in CSS, as a bonus; data-user-play (the user pressed Play) turns the focus
 *   bonus off, so the Play button, which keeps focus, never leaves the strip looking paused;
 * - data-expanded for "Show all", which narrow screens get in the static, wrapped layout.
 * The list renders twice for the seamless loop; the second copy is aria-hidden.
 */

function subscribeNever(): () => void {
  return () => undefined;
}

/** False on the server and during hydration, true afterwards (no effect, no extra render). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export interface MarqueeLabels {
  /** The Pause button while the strip moves ("Pause animation"). */
  readonly pause: string;
  /** The same button after a pause ("Play animation"). */
  readonly play: string;
  /** Static layout on narrow screens: reveal every item ("Show all 20"). */
  readonly more: string;
  /** … and collapse again. */
  readonly less: string;
}

export interface MarqueeRootProps {
  /** Id of the strip's heading, inside `head`. */
  readonly titleId: string;
  /** The label block (eyebrow and h2), server-rendered. */
  readonly head: ReactNode;
  /** The <li> items, server-rendered; rendered twice (the copy is aria-hidden). */
  readonly items: ReactNode;
  readonly labels: MarqueeLabels;
  /** Server-rendered button icons. */
  readonly icons: { readonly pause: ReactNode; readonly play: ReactNode };
  readonly className?: string;
}

export function MarqueeRoot({ titleId, head, items, labels, icons, className }: MarqueeRootProps): ReactNode {
  const ref = useRef<HTMLElement>(null);
  const listId = useId();
  const ready = useHydrated();
  const { running, userPaused, pause, play } = useAutoplay(ref);
  const [expanded, setExpanded] = useState(false);
  /** The user's last choice was Play: the focus-within bonus pause stands down. */
  const [chosePlay, setChosePlay] = useState(false);
  const toggle = (): void => {
    if (userPaused) play();
    else pause();
    setChosePlay(userPaused);
  };

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className={cn('ts', className)}
      data-section="tools"
      data-ready={ready ? '' : undefined}
      data-running={running ? '' : undefined}
      data-user-play={chosePlay ? '' : undefined}
      data-expanded={expanded ? '' : undefined}
    >
      <div className="ts-head">
        <div className="ts-label">{head}</div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'icon', size: 'sm', shape: 'circle' }), 'ts-pause')}
          aria-label={userPaused ? labels.play : labels.pause}
          data-marquee-control={userPaused ? 'play' : 'pause'}
          onClick={toggle}
        >
          {userPaused ? icons.play : icons.pause}
        </button>
      </div>
      <div className="ts-viewport">
        <div className="ts-track" data-marquee="">
          <ul className="ts-list" id={listId}>
            {items}
          </ul>
          <ul className="ts-list ts-copy" aria-hidden="true">
            {items}
          </ul>
        </div>
      </div>
      {/* Shown only in the narrow static layout (tools-strip.css), hence the bare wrapper: the
          button's own utility classes would outrank a layered display rule. */}
      <div className="ts-more">
        <button
          type="button"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? labels.less : labels.more}
        </button>
      </div>
    </section>
  );
}
