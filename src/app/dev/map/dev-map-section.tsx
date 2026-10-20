import type { ReactNode } from 'react';

export interface DevMapSectionProps {
  readonly id: string;
  readonly title: string;
  readonly intro: ReactNode;
  readonly children: ReactNode;
}

/** One numbered block of the /dev/map page: an h2, a short note, then the phones. */
export function DevMapSection({ id, title, intro, children }: DevMapSectionProps): ReactNode {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-16 scroll-mt-24">
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      <div className="mt-2 max-w-[72ch] text-body-sm text-ink-3">{intro}</div>
      <div className="mt-8 space-y-10">{children}</div>
    </section>
  );
}

/**
 * A horizontally scrolling row of phones: full-size phones are wider than a small viewport, so
 * the row scrolls instead of the page. Focusable so keyboard users can scroll it.
 */
export function PhoneRow({ label, children }: { readonly label: string; readonly children: ReactNode }): ReactNode {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-card px-4 pt-4 pb-12">
      <ul className="flex w-max items-start gap-8">{children}</ul>
    </div>
  );
}

/** A phone with a caption, as one item of a PhoneRow. */
export function PhoneItem({ caption, children, ...data }: { readonly caption: ReactNode; readonly children: ReactNode } & Readonly<Record<`data-${string}`, string>>): ReactNode {
  return (
    <li>
      <figure className="flex w-min flex-col gap-3" {...data}>
        {children}
        <figcaption className="max-w-[420px] text-meta text-ink-3">{caption}</figcaption>
      </figure>
    </li>
  );
}
