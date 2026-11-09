'use client';

import { useId, useSyncExternalStore, type ReactNode } from 'react';
import { getMusicSnapshot, getServerMusicSnapshot, subscribeMusic, toggleMusic } from '@/components/layout/music-store';
import { isMusicPlaying } from '@/lib/music';

export interface MusicToggleProps {
  readonly src: string;
  /** The tooltip and the description: "Music: " + the credit line. */
  readonly credit: string;
  /** Finished on the server (circle classes plus `group/music`); islands never merge classes. */
  readonly className?: string;
  /** The server-rendered glyphs: muted shown by default, speaker shown under `group-data-playing/music`. */
  readonly children: ReactNode;
}

/**
 * The opt-in music button (design: the fifth circle of the social row). It flips between
 * "Play music" and "Pause music"; the press starts the song inside the click, so the browser
 * lets it play. Nothing here runs audio before that first press.
 */
export function MusicToggle({ src, credit, className, children }: MusicToggleProps) {
  const id = useId();
  const playing = isMusicPlaying(useSyncExternalStore(subscribeMusic, getMusicSnapshot, getServerMusicSnapshot));
  return (
    <>
      <button
        type="button"
        className={className}
        data-playing={playing ? '' : undefined}
        aria-label={playing ? 'Pause music' : 'Play music'}
        title={credit}
        aria-describedby={id}
        onClick={() => toggleMusic(src)}
      >
        {children}
      </button>
      <span id={id} hidden>
        {credit}
      </span>
    </>
  );
}
