'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { getDisplaySnapshot, subscribeDisplay } from '@/lib/display-store';
import { skyChange } from '@/components/sections/home/sky';

/**
 * The Home hero's client island (design §3.2, §6.2). On a theme change it plays the sunset or the
 * sunrise with the Web Animations API on the hero's layers (the resting look is CSS from `.dark`).
 * Under reduced motion it plays nothing.
 *
 * The listener runs inside the click's task and keeps it cheap (§6.3): it only pins the animated
 * layers at their start values (inline styles, so the new theme's CSS does not flash), and the
 * animations start one frame later. The backwards-filled first keyframes equal the pins.
 */
export function HeroScene(): ReactNode {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current?.closest('[data-section="hero"]');
    let dark = getDisplaySnapshot().resolved.dark;
    let current: Animation[] = [];
    let frame = 0;
    let timer = 0;
    let pinned: HTMLElement[] = [];

    const unpin = (): void => {
      const list = pinned;
      pinned = [];
      for (const element of list) {
        element.style.removeProperty('opacity');
        element.style.removeProperty('filter');
      }
    };

    const cancelCurrent = (): void => {
      const set = current;
      current = [];
      for (const animation of set) animation.cancel();
    };

    const reset = (): void => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (timer) window.clearTimeout(timer);
      timer = 0;
      cancelCurrent();
      unpin();
    };

    const unsubscribe = subscribeDisplay(() => {
      const { dark: next, reduceMotion } = getDisplaySnapshot().resolved;
      if (next === dark) return;
      const previous = dark;
      dark = next;
      reset();
      if (reduceMotion || !root) return;
      const change = skyChange(previous, next);
      // Pin each animated layer at the first keyframe's values, until the animations take over.
      for (const { layer, keyframes } of change) {
        const element = root.querySelector<HTMLElement>(`[data-hero-layer="${layer}"]`);
        const start = keyframes[0];
        if (!element || !start) continue;
        if (start.opacity !== undefined && start.opacity !== null) element.style.opacity = String(start.opacity);
        if (typeof start.filter === 'string') element.style.filter = start.filter;
        if (!pinned.includes(element)) pinned.push(element);
      }
      // Not in the click's own frame (that is inside INP's interval): after it has been presented.
      const run = (): void => {
        timer = 0;
        const set: Animation[] = [];
        for (const { layer, keyframes, timing } of change) {
          const element = root.querySelector(`[data-hero-layer="${layer}"]`);
          if (element) set.push(element.animate([...keyframes], timing));
        }
        current = set;
        unpin();
        // When every animation has finished, cancel the set: that clears the forwards filter.
        Promise.all(
          set.map((animation) => {
            animation.finished.catch(() => {});
            return animation.finished;
          }),
        )
          .then(() => {
            if (current === set) cancelCurrent();
          })
          .catch(() => {});
      };
      frame = requestAnimationFrame(() => {
        frame = 0;
        timer = window.setTimeout(run, 0);
      });
    });

    return () => {
      unsubscribe();
      reset();
    };
  }, []);

  return <div ref={host} data-dragon-host className="hero-dragon-host" aria-hidden="true" />;
}
