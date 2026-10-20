import { Button, ButtonLink } from '@/components/ui/button';
import { SiteLink } from '@/components/ui/site-link';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import { Avatar } from '@/components/layout/avatar';
import { MenuSheet } from '@/components/layout/menu-sheet';
import { ProfileRail } from '@/components/layout/profile-rail';

/**
 * The sticky top bar below 1280px (design §4.1): 60px (64 from md), the sidebar colour at 85%
 * with a 12px backdrop blur. Left: the 36px avatar and the name, linking home. Right: a mail
 * button to /contact ("Get in touch", hidden below 300px) and the menu button that opens the
 * sheet. It never hides on scroll.
 *
 * The hairline appears once the bar is stuck (a scroll-state container query, no script); where
 * scroll-state queries are unsupported the hairline simply always shows.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 [container-type:scroll-state] xl:hidden print:hidden">
      <div className="flex h-15 items-center gap-3 border-b border-transparent bg-sidebar/85 px-(--gutter) backdrop-blur-md not-supports-[container-type:scroll-state]:border-line md:h-16 [@container_scroll-state(stuck:top)]:border-line">
        <SiteLink href="/" className="-ms-1 flex min-w-0 items-center gap-2.5 rounded-full py-1 ps-1 pe-2 text-ink">
          <Avatar size={36} />
          <span className="truncate text-[1rem] leading-tight font-bold">{profile.name}</span>
        </SiteLink>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <ButtonLink
            href={site.contactHref}
            variant="icon"
            shape="circle"
            icon="mail"
            label={home.ctas.contact}
            className="size-11 max-[18.75rem]:hidden"
          />
          <MenuSheet trigger={<Button variant="icon" shape="circle" icon="menu" label="Menu" className="size-11" />}>
            <ProfileRail variant="sheet" />
          </MenuSheet>
        </div>
      </div>
    </header>
  );
}
