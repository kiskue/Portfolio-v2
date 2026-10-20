import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { buttonVariants } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { renderField } from '@/components/ui/copy';
import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { cvState, yearsValue } from '@/components/ui/placeholder-values';
import { cn } from '@/lib/cn';

export interface YearsProps {
  /** profile.yearsOfExperience. */
  readonly years: number | null;
  /** Text after the count. Default "+ years"; use "+" inside a Stat whose label says "years …". */
  readonly suffix?: string;
  readonly as?: 'span' | 'p' | 'strong';
  readonly className?: string;
  readonly mode?: PlaceholderMode;
}

/** "5+ years" when set; "[[N]]+ years" with N marked in label mode; nothing in hide mode. */
export function Years({ years, suffix = '+ years', as, className, mode = site.placeholders }: YearsProps) {
  const value = yearsValue(years, mode);
  if (value === null) return null;
  const content = (
    <>
      {renderField(value)}
      {suffix}
    </>
  );
  if (as === undefined && className === undefined) return content;
  const Element = as ?? 'span';
  return <Element className={className}>{content}</Element>;
}

export interface CvLinkProps {
  /** profile.cvUrl. */
  readonly href: string | null;
  readonly label?: string;
  readonly variant?: 'primary' | 'secondary' | 'ghost';
  readonly size?: 'sm' | 'md';
  readonly className?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * The CV control: a download button when cvUrl is set; in label mode without a CV, a NON-link
 * placeholder chip (dashed ph chip, "(placeholder)" for screen readers); in hide mode, nothing.
 */
export function CvLink({
  href,
  label = 'Download CV',
  variant = 'secondary',
  size = 'md',
  className,
  mode = site.placeholders,
}: CvLinkProps) {
  const state = cvState(href, mode);
  if (state.kind === 'none') return null;

  if (state.kind === 'placeholder') {
    return (
      <Chip tone="ph" size={size} icon="file-text" className={cn('border-dashed border-ph-ink', className)}>
        {label}
        <span className="sr-only"> (placeholder)</span>
      </Chip>
    );
  }

  const classes = cn(buttonVariants({ variant, size }), className);
  if (state.download) {
    return (
      <a href={state.href} download className={classes}>
        {label}
        <Icon name="download" size={size === 'sm' ? 14 : 16} />
      </a>
    );
  }
  return (
    <ExternalLink href={state.href} look="bare" className={classes}>
      {label}
    </ExternalLink>
  );
}
