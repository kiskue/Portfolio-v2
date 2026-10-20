import { useEffect, useState, type RefObject } from 'react';
import { isInView, observerThresholds } from '@/hooks/in-view';

export interface InViewOptions {
  /** The visible fraction (0–1) that counts as in view. Default 0: any pixel. */
  readonly threshold?: number;
  readonly rootMargin?: string;
  /** The value before the first observer report (server render and hydration). Default false. */
  readonly initial?: boolean;
}

/**
 * Whether `ref`'s element is in the viewport, via one IntersectionObserver.
 *
 * SSR-safe: it returns `initial` on the server and during hydration, and only starts observing
 * in an effect. Where IntersectionObserver is missing it keeps `initial` (every supported
 * browser has it).
 */
export function useInView(ref: RefObject<Element | null>, options: InViewOptions = {}): boolean {
  const { threshold = 0, rootMargin = '0px', initial = false } = options;
  const [inView, setInView] = useState(initial);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(isInView(entry, threshold));
      },
      { threshold: observerThresholds(threshold), rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);

  return inView;
}
