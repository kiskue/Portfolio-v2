'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { getDisplaySnapshot, subscribeDisplay } from '@/lib/display-store';
import { skyChange } from '@/components/sections/home/sky';

/**
 * The Home hero's client island (design §3.2, §6.2). On a theme change it plays the sunset or the
 * sunrise with the Web Animations API on the hero's layers (the resting look is CSS from `.dark`).
 * Under reduced motion it plays nothing. The listener runs inside the click's task, so it only
 * creates animations: no layout reads.
 */
export function HeroScene(): ReactNode {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current?.closest('[data-section="hero"]');
    let dark = getDisplaySnapshot().resolved.dark;
    let current: Animation[] = [];

    const cancelCurrent = (): void => {
      const set = current;
      current = [];
      for (const animation of set) animation.cancel();
    };

    const unsubscribe = subscribeDisplay(() => {
      const { dark: next, reduceMotion } = getDisplaySnapshot().resolved;
      if (next === dark) return;
      const previous = dark;
      dark = next;
      cancelCurrent();
      if (reduceMotion || !root) return;
      const set: Animation[] = [];
      for (const { layer, keyframes, timing } of skyChange(previous, next)) {
        const element = root.querySelector(`[data-hero-layer="${layer}"]`);
        if (element) set.push(element.animate([...keyframes], timing));
      }
      current = set;
      // When every animation has finished, cancel the set: that clears the forwards filter.
      Promise.all(
        set.map((animation) => {
          animation.finished.catch(() => {});
          return animation.finished;
        }),
      )
        .then(() => {
          if (current !== set) return;
          cancelCurrent();
        })
        .catch(() => {});
    });

    return () => {
      unsubscribe();
      cancelCurrent();
    };
  }, []);

  return <div ref={host} data-dragon-host className="hero-dragon-host" aria-hidden="true" />;
}
