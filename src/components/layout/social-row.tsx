import { BrandGlyph } from '@/components/ui/brand-glyph';
import { buttonVariants } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { profile } from '@/content/profile';
import type { SocialGlyph } from '@/content/types';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/cn';

export interface SocialRowProps {
  /** Circle size: 40px (44px on coarse pointers anyway), or 44px everywhere. */
  readonly size?: 40 | 44;
  /** The fourth circle, the light/dark toggle (the mobile footer leaves it to Display settings). */
  readonly themeToggle?: boolean;
  readonly className?: string;
}

/** A social mark, named for screen readers (the link has no visible text). */
function Glyph({ glyph, label }: { readonly glyph: SocialGlyph; readonly label: string }) {
  if (glyph.kind === 'icon') return <Icon name={glyph.icon} size={18} label={label} />;
  return <BrandGlyph glyph={glyph} size={18} label={label} />;
}

/**
 * GitHub, LinkedIn, Email and the theme toggle as round 40px buttons (design §4.1): raised
 * background, 1px line border, ink glyphs. GitHub and LinkedIn open in a new tab and say so;
 * Email is a mailto link named "Email Gerric".
 */
export function SocialRow({ size = 40, themeToggle = true, className }: SocialRowProps) {
  const circle = cn(buttonVariants({ variant: 'icon', shape: 'circle' }), 'text-ink', size === 44 && 'size-11');
  return (
    <ul className={cn('flex items-center gap-2.5', className)}>
      {profile.links.map((link) => (
        <li key={link.id} className="flex">
          <ExternalLink href={link.href} look="bare" icon={false} className={circle}>
            <Glyph glyph={link.glyph} label={link.label} />
          </ExternalLink>
        </li>
      ))}
      {themeToggle ? (
        <li className="flex">
          <ThemeToggle className={circle}>
            <Icon name="moon" size={18} className="dark:hidden" />
            <Icon name="sun" size={18} className="hidden dark:block" />
            <span className="sr-only dark:hidden">Switch to dark theme</span>
            <span className="sr-only hidden dark:inline">Switch to light theme</span>
          </ThemeToggle>
        </li>
      ) : null}
    </ul>
  );
}
