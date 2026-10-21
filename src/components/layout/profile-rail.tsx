import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import { AvailabilityPill } from '@/components/layout/availability-pill';
import { Avatar } from '@/components/layout/avatar';
import { DisplaySettings } from '@/components/layout/display-settings';
import { NavList, type NavListItem } from '@/components/layout/nav-list';
import { shellButton } from '@/components/layout/shell-button';
import { SocialRow } from '@/components/layout/social-row';
import { cn } from '@/lib/cn';

export type ProfileRailVariant = 'sidebar' | 'sheet';

export interface ProfileRailProps {
  /** 'sidebar': the docked rail at ≥1280px. 'sheet': the same rail inside the menu sheet. */
  readonly variant: ProfileRailVariant;
}

/** The seven template nav items, with 18px icons rendered here on the server. */
const NAV_ITEMS: readonly NavListItem[] = site.nav.map((item) => ({
  id: item.id,
  label: item.label,
  href: item.href,
  match: item.match,
  icon: <Icon name={item.icon} size={18} />,
}));

/** The name, with a verified badge only when a real credential URL exists (design §0, #9). */
function Name() {
  return (
    <p className="mt-4 flex items-center justify-center gap-1.5 text-[1.125rem] leading-snug font-bold text-ink">
      {profile.name}
      {profile.verifiedCredentialUrl ? (
        <ExternalLink href={profile.verifiedCredentialUrl} look="bare" icon={false} className="inline-flex rounded-full text-status-beta">
          <Icon name="badge-check" size={18} label="Verified credential" />
        </ExternalLink>
      ) : null}
    </p>
  );
}

/**
 * The template's left profile rail (design §4.1), top to bottom: avatar with a peach glow, name,
 * handle, availability pill, social row, divider, the primary nav, a spacer, divider, and the
 * footer row with the round accessibility button (Display settings) and the © line.
 *
 * The same component fills the sidebar and the menu sheet. In the sidebar Display settings is
 * a popover; in the sheet it is an inline disclosure (no popover nested in a dialog). The avatar
 * drops from 104 to 80px on screens under 760px tall so the rail fits a 720px viewport.
 */
export function ProfileRail({ variant }: ProfileRailProps) {
  const sidebar = variant === 'sidebar';
  return (
    <div className={cn('flex min-h-full w-full flex-col', sidebar ? 'px-6 pt-6 pb-5' : 'pb-1')}>
      <div className="flex flex-col items-center text-center">
        <Avatar size={104} glow className="[@media(max-height:47.5rem)]:size-20" />
        <Name />
        <p className="text-body-sm font-medium text-ink-3">{profile.handle}</p>
        <AvailabilityPill className="mt-3" />
        <SocialRow className="mt-4" />
      </div>

      <nav aria-label="Primary" className="mt-5 border-t border-line pt-4">
        <NavList items={NAV_ITEMS} />
      </nav>

      <div aria-hidden="true" className="min-h-6 flex-1" />

      <DisplaySettings
        presentation={sidebar ? 'popover' : 'inline'}
        trigger={shellButton({ variant: 'primary', shape: 'circle', icon: 'accessibility', label: 'Display settings' })}
        className="border-t border-line pt-4"
      >
        <p className="text-[0.75rem] leading-4 text-ink-4">
          © {site.copyrightYear} {site.name}
        </p>
      </DisplaySettings>
    </div>
  );
}
