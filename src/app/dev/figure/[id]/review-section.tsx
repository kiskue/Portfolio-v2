import type { ReactNode } from 'react';

export interface ReviewSectionProps {
  readonly id: string;
  readonly title: string;
  readonly intro?: ReactNode;
  readonly children: ReactNode;
}

/** One block of the figure review page: an h2, a short note, then the phones. */
export function ReviewSection({ id, title, intro, children }: ReviewSectionProps): ReactNode {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-14 scroll-mt-24">
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-[72ch] text-body-sm text-ink-3">{intro}</p> : null}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

/**
 * A horizontally scrolling row of phones. Full-size phones are wider than a small viewport, so
 * the row scrolls instead of the page. It is focusable (tabIndex 0) so keyboard users can scroll
 * it, and named for screen readers. The padding leaves room for the phone shadows.
 */
export function ScrollRow({ label, children }: { readonly label: string; readonly children: ReactNode }): ReactNode {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-card px-4 pt-4 pb-12">
      <ul className="flex w-max items-start gap-8">{children}</ul>
    </div>
  );
}
