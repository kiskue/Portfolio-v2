import { STATUSES, type Status } from '@/content/types';

/** Legend wording for each status (design §4.3: "● Shipped ◐ Beta ◎ Building ◌ Prototype"). */
export const STATUS_LABEL = {
  live: 'Shipped',
  beta: 'Beta',
  building: 'Building',
  prototype: 'Prototype',
} as const satisfies Record<Status, string>;

/** Status shapes: never colour alone (1.4.1). */
export const STATUS_SHAPE = {
  live: 'filled',
  beta: 'half',
  building: 'ring-dot',
  prototype: 'dashed',
} as const satisfies Record<Status, 'filled' | 'half' | 'ring-dot' | 'dashed'>;

/** Every status, in legend order. */
export const STATUS_ORDER: readonly Status[] = STATUSES;
