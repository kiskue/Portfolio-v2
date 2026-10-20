import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** One gallery section: an h3 and its specimens. */
export function DemoSection({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6">
      <div>
        <h3 className="text-card-title text-ink">{title}</h3>
        {note ? <p className="mt-1 text-meta text-ink-3">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A labelled row of specimens that wraps on narrow screens. */
export function Row({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-fig text-ink-4 uppercase">{label}</p>
      <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
    </div>
  );
}
