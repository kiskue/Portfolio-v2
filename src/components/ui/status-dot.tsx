import type { Status } from '@/content/types';
import { STATUS_LABEL, STATUS_ORDER } from '@/components/ui/status';
import { cn } from '@/lib/cn';

export interface StatusDotProps {
  readonly status: Status;
  /** Rendered size in px. */
  readonly size?: 8 | 10;
  readonly className?: string;
}

const STATUS_COLOR: Record<Status, string> = {
  live: 'text-status-live',
  beta: 'text-status-beta',
  building: 'text-status-building',
  prototype: 'text-status-prototype',
};

/** Ring geometry on a 12×12 box: r 4.5 with a 1.5 stroke. 8 dashes of 2.3 + 1.23 ≈ 2π·4.5. */
function Shape({ status }: { readonly status: Status }) {
  const ring = <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />;
  switch (status) {
    case 'live':
      return <circle cx="6" cy="6" r="5.25" fill="currentColor" />;
    case 'beta':
      return (
        <>
          {ring}
          <path d="M6 1.5a4.5 4.5 0 0 0 0 9z" fill="currentColor" />
        </>
      );
    case 'building':
      return (
        <>
          {ring}
          <circle cx="6" cy="6" r="2" fill="currentColor" />
        </>
      );
    case 'prototype':
      return (
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.3 1.23" />
      );
  }
}

/**
 * A status shape (design §3.5): live = filled circle, beta = half-filled, building = ring with a
 * centre dot, prototype = dashed ring. Decorative: the status is always also given as text
 * (a label, a legend or sr-only text), so the meaning never rests on colour or shape alone.
 */
export function StatusDot({ status, size = 10, className }: StatusDotProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className={cn('inline-block shrink-0', STATUS_COLOR[status], className)}
    >
      <Shape status={status} />
    </svg>
  );
}

export interface StatusLegendProps {
  readonly statuses?: readonly Status[];
  /** Accessible name of the legend list. */
  readonly label?: string;
  readonly className?: string;
}

/** The text key for status shapes: "● Shipped ◐ Beta ◎ Building ◌ Prototype". */
export function StatusLegend({ statuses = STATUS_ORDER, label = 'Status key', className }: StatusLegendProps) {
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-3', className)}>
      {statuses.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <StatusDot status={status} />
          {STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  );
}
