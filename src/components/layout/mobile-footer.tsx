import { Button } from '@/components/ui/button';
import { site } from '@/content/site';
import { DisplaySettings } from '@/components/layout/display-settings';
import { SocialRow } from '@/components/layout/social-row';

/**
 * The footer below 1280px (design §4.1), where the rail's footer is out of sight: the "Display
 * settings" disclosure (its panel opens right under the button, so it is also the next stop in
 * tab order), then the © line with GitHub / LinkedIn / Email. The theme lives in Display
 * settings here, so the social row has no toggle.
 */
export function MobileFooter() {
  return (
    <footer className="border-t border-line bg-sidebar xl:hidden print:hidden">
      <div className="mx-auto flex w-full max-w-[calc(75rem+2*var(--gutter))] flex-col gap-5 px-(--gutter) py-6">
        <DisplaySettings
          presentation="inline"
          trigger={
            <Button variant="secondary" size="sm" icon="accessibility">
              Display settings
            </Button>
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-[0.75rem] leading-4 text-ink-4">
            © {site.copyrightYear} {site.name}
          </p>
          <SocialRow themeToggle={false} />
        </div>
      </div>
    </footer>
  );
}
