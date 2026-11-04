'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { getDisplaySnapshot, subscribeDisplay } from '@/lib/display-store';
import { skyChange } from '@/components/sections/home/sky';
import type { SceneHandle } from '@/components/sections/home/dragon/scene';

/**
 * The Home hero's client island (design §3.2, §6.2). On a theme change it plays the sunset or the
 * sunrise with the Web Animations API on the hero's layers (the resting look is CSS from `.dark`).
 * Under reduced motion it plays nothing, and turning it on stops a sky already changing.
 *
 * The listener runs inside the click's task and keeps it cheap (§6.3): a change from rest only
 * pins the animated layers at their start values (inline styles, so the new theme's CSS does not
 * flash), and the animations start after the click's frame has been presented. Interruptions never
 * pin or restart: a change while the start is still pending cancels it (the sky never moved, and
 * CSS already shows the restored theme); a change while the set runs cancels it (a snap to CSS).
 */
export function HeroScene(): ReactNode {
  const host = useRef<HTMLDivElement>(null);
  // The server snapshot is true, so rendering and hydration never load the dragon's chunk.
  const reduceMotion = useSyncExternalStore(subscribeDisplay, () => getDisplaySnapshot().resolved.reduceMotion, () => true);

  // The dragon's code is its own chunk, loaded once the page has loaded and only when motion is
  // allowed (design §6.3); this effect running means the island has hydrated. It is a separate
  // effect: the sky change below is untouched.
  useEffect(() => {
    const element = host.current;
    if (reduceMotion || !element) return;
    let cancelled = false;
    let handle: SceneHandle | undefined;
    const load = (): void => {
      // Only a failed chunk load is swallowed; an error thrown by startScene must surface.
      import('@/components/sections/home/dragon/scene').then(
        (scene) => {
          if (!cancelled) handle = scene.startScene(element);
        },
        () => {},
      );
    };
    let timer = 0;
    // The import always starts in a task of its own after the load event's handlers (loadEventEnd is
    // stamped after the last one returns), so the request is after the load event ends.
    const afterLoad = (): void => {
      timer = window.setTimeout(load, 0);
    };
    const ready = document.readyState === 'complete';
    if (ready) afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (!ready) window.removeEventListener('load', afterLoad);
      handle?.dispose();
    };
  }, [reduceMotion]);

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
      const changed = next !== dark;
      const previous = dark;
      dark = next;
      if (reduceMotion) {
        reset();
        return;
      }
      if (!changed || !root) return;
      if (frame || timer) {
        // The start is still pending: the sky never moved, and CSS already shows the restored theme.
        reset();
        return;
      }
      if (current.length > 0) {
        // The set is running: cancel it. CSS already shows the new theme's sky, so the sky snaps to it
        // (running or reversed sets keep producing heavy frames that later input would wait for).
        reset();
        return;
      }
      const change = skyChange(previous, next);
      // Pin each animated layer at the first keyframe's values, until the animations take over.
      for (const { layer, keyframes } of change) {
        const element = root.querySelector<HTMLElement>(`[data-hero-layer="${layer}"]`);
        const first = keyframes[0];
        if (!element || !first) continue;
        if (first.opacity !== undefined && first.opacity !== null) element.style.opacity = String(first.opacity);
        if (typeof first.filter === 'string') element.style.filter = first.filter;
        if (!pinned.includes(element)) pinned.push(element);
      }
      // Not in the click's own frame (that is inside INP's interval): after it has been presented.
      const run = (): void => {
        timer = 0;
        if (getDisplaySnapshot().resolved.reduceMotion) {
          reset();
          return;
        }
        const set: Animation[] = [];
        for (const { layer, keyframes, timing } of change) {
          const element = root.querySelector(`[data-hero-layer="${layer}"]`);
          if (element) set.push(element.animate([...keyframes], timing));
        }
        current = set;
        unpin();
        // When every animation has finished (in either direction), cancel the set: CSS takes over.
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
