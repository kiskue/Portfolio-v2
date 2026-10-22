import { BrandGlyph } from '@/components/ui/brand-glyph';
import { buttonVariants } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { profile } from '@/content/profile';

/**
 * What replaces the form when it cannot send (PLAN → Contact: no RESEND_API_KEY in production):
 * direct email and LinkedIn links, so nobody fills in a form that would fail.
 */
export function ContactFallback() {
  const linkedin = profile.links.find((link) => link.id === 'linkedin');
  return (
    <div className="flex flex-col gap-4" data-contact-fallback="">
      <p className="max-w-[60ch] text-body text-ink-2">
        The form isn’t available right now. Email me or message me on LinkedIn, and I’ll reply from there.
      </p>
      <div className="flex flex-wrap gap-2">
        <ExternalLink href={`mailto:${profile.email}`} look="bare" className={buttonVariants({ variant: 'primary' })}>
          <Icon name="mail" size={16} />
          Email me
        </ExternalLink>
        {linkedin ? (
          <ExternalLink href={linkedin.href} look="bare" className={buttonVariants({ variant: 'secondary' })}>
            <BrandGlyph glyph={{ kind: 'official', icon: 'linkedin' }} size={16} />
            Message me on LinkedIn
          </ExternalLink>
        ) : null}
      </div>
    </div>
  );
}
