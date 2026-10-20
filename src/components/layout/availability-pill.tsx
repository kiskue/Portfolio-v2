import { Chip } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { cn } from '@/lib/cn';
import { fieldOrNull } from '@/lib/placeholder';

export interface AvailabilityPillProps {
  readonly className?: string;
  /** Defaults to site.placeholders. */
  readonly mode?: PlaceholderMode;
}

/**
 * The availability pill (design §4.1): 26px tall, 12/600, avail colours, a decorative dot.
 * The wording is a placeholder until confirmed: label mode marks it, hide mode drops the whole
 * pill rather than leaving an empty one.
 */
export function AvailabilityPill({ className, mode = site.placeholders }: AvailabilityPillProps) {
  const { status, label } = profile.availability;
  if (fieldOrNull(label, mode) === null) return null;
  return (
    <Chip tone={status === 'open' ? 'avail' : 'neutral'} size="sm" className={cn('min-h-6.5', className)}>
      <span aria-hidden="true" className="me-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />
      <Copy text={label} mode={mode} />
    </Chip>
  );
}
