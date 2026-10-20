import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import type { IconName, Status } from '@/content/types';
import { Icon } from '@/components/ui/icon';
import { SiteLink, type SiteLinkProps } from '@/components/ui/site-link';
import { STATUS_LABEL } from '@/components/ui/status';
import { StatusDot } from '@/components/ui/status-dot';
import { cn } from '@/lib/cn';

/**
 * The one chip (reuse rule 3): stack chips, AI-build chips, tags, the availability pill and the
 * Example tag are all tones of it. sm is 24px tall (12px text), md 32px (13px text).
 */
export const chipVariants = cva('inline-flex max-w-full items-center rounded-full border text-left', {
  variants: {
    tone: {
      neutral: 'border-line bg-raised text-ink',
      accent: 'border-transparent bg-accent-soft text-soft-ink',
      ink: 'border-transparent bg-ink text-raised',
      ph: 'border-transparent bg-ph-bg text-ph-ink',
      avail: 'border-transparent bg-avail-bg text-avail-ink',
    },
    size: {
      sm: 'min-h-6 gap-1 px-2.5 py-0.5 text-[0.75rem] leading-4 font-semibold',
      md: 'min-h-8 gap-1.5 px-3 py-1 text-meta leading-5 font-semibold',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

export type ChipVariantProps = VariantProps<typeof chipVariants>;

interface ChipLookProps extends ChipVariantProps {
  /** A leading icon (accent-ink on neutral chips, like the template's AI chips). */
  readonly icon?: IconName;
  /** A trailing status shape; the status word is added for screen readers ("…, Beta"). */
  readonly status?: Status;
  readonly className?: string;
  readonly children: ReactNode;
}

function ChipInner({ icon, status, tone, size, children }: Omit<ChipLookProps, 'className'>) {
  return (
    <>
      {icon ? (
        <Icon
          name={icon}
          size={size === 'sm' ? 14 : 16}
          className={tone === 'neutral' || tone == null ? 'text-accent-ink' : undefined}
        />
      ) : null}
      <span className="min-w-0">{children}</span>
      {status ? (
        <>
          <StatusDot status={status} size={size === 'sm' ? 8 : 10} />
          <span className="sr-only">, {STATUS_LABEL[status]}</span>
        </>
      ) : null}
    </>
  );
}

export type ChipProps = Omit<ComponentProps<'span'>, 'children' | 'className'> & ChipLookProps;

/** A static chip. */
export function Chip({ tone, size, icon, status, className, children, ...rest }: ChipProps) {
  return (
    <span {...rest} className={cn(chipVariants({ tone, size }), className)}>
      <ChipInner icon={icon} status={status} tone={tone} size={size}>
        {children}
      </ChipInner>
    </span>
  );
}

export type ChipLinkProps = Omit<SiteLinkProps, 'children' | 'className'> & ChipLookProps;

type ChipTone = NonNullable<ChipVariantProps['tone']>;

/** Hover keeps each tone's fill: neutral steps to sunken, tinted tones gain an edge in their ink. */
const LINK_HOVER: Record<ChipTone, string> = {
  neutral: 'hover:border-line-strong hover:bg-sunken',
  accent: 'hover:border-current',
  ink: 'hover:bg-ink/85',
  ph: 'hover:border-current',
  avail: 'hover:border-current',
};

/** A chip that links to an internal route (e.g. an AI-build chip to its case-study anchor). */
export function ChipLink({ tone, size, icon, status, className, children, ...rest }: ChipLinkProps) {
  return (
    <SiteLink
      {...rest}
      className={cn(
        chipVariants({ tone, size }),
        'transition-colors duration-(--dur-1)',
        LINK_HOVER[tone ?? 'neutral'],
        className,
      )}
    >
      <ChipInner icon={icon} status={status} tone={tone} size={size}>
        {children}
      </ChipInner>
    </SiteLink>
  );
}

/** The "Example" tag on example items in label mode (design §10): a ph-tone chip, 12px uppercase. */
export function ExampleTag({ className }: { readonly className?: string }) {
  return (
    <Chip tone="ph" size="sm" className={cn('min-h-5 px-2 py-0 tracking-[0.06em] uppercase', className)}>
      Example
    </Chip>
  );
}
