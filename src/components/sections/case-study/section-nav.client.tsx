'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

/*
 * The client half of the case-study "On this page" pill (SectionNav island, architecture D2).
 * The markup is a native <details> disclosure, so it opens and closes without JavaScript; this
 * island only tidies up after it: a section link closes the list, and so do Escape (focus returns
 * to the toggle) and a click outside. There is no scroll-spy (review §3 cut 5): nothing observes
 * the sections, and the label never changes.
 */

export interface SectionNavDisclosureProps {
  /** The toggle's content (server-rendered, so no icon code reaches the client bundle). */
  readonly summary: ReactNode;
  /** The section list. */
  readonly children: ReactNode;
  readonly className?: string;
  readonly summaryClassName?: string;
}

export function SectionNavDisclosure({ summary, children, className, summaryClassName }: SectionNavDisclosureProps): ReactNode {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  /** A followed section link closes the list, so it never covers the section it opened. */
  const onClick = (event: MouseEvent<HTMLDetailsElement>) => {
    const details = ref.current;
    if (details && event.target instanceof Element && event.target.closest('a[href^="#"]')) details.open = false;
  };

  return (
    <details ref={ref} className={className} onClick={onClick} data-section-nav="">
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
