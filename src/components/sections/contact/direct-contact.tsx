import { BrandGlyph } from '@/components/ui/brand-glyph';
import { buttonVariants } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { MetaLine } from '@/components/ui/copy';
import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { CvLink } from '@/components/ui/placeholder-facts';
import { cvState } from '@/components/ui/placeholder-values';
import { SectionHeader } from '@/components/ui/section-header';
import { contactLine, profile } from '@/content/profile';
import { site } from '@/content/site';
import type { PlaceholderMode, SocialLink } from '@/content/types';

/** A social link's mark, decorative beside its visible label. */
function LinkGlyph({ link }: { readonly link: SocialLink }) {
  if (link.glyph.kind === 'icon') return <Icon name={link.glyph.icon} size={14} />;
  return <BrandGlyph glyph={link.glyph} size={14} />;
}

/**
 * The direct row of the contact card (design §8): the profile email (the only email the site
 * shows) with a Copy button, the location · time zone · reply-time line, LinkedIn and GitHub,
 * and the CV control (a link once cvUrl is set; a placeholder chip in label mode; nothing in
 * hide mode).
 */
export function DirectContact({ mode = site.placeholders }: { readonly mode?: PlaceholderMode }) {
  const socials = profile.links.filter((link) => link.id !== 'email');
  const showCv = cvState(profile.cvUrl, mode).kind !== 'none';
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader as="h2" size="card" title="Reach me directly" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ExternalLink href={`mailto:${profile.email}`} className="inline-flex min-h-6 items-center text-lead font-bold [overflow-wrap:anywhere]">
          {profile.email}
        </ExternalLink>
        <CopyButton value={profile.email} label="Copy email" copiedLabel="Email copied" size="sm" />
      </div>
      <MetaLine segments={contactLine} mode={mode} className="text-meta text-ink-3" />
      <ul className="mt-1 flex flex-wrap gap-2">
        {socials.map((link) => (
          <li key={link.id} className="flex">
            <ExternalLink href={link.href} look="bare" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <LinkGlyph link={link} />
              {link.label}
            </ExternalLink>
          </li>
        ))}
        {showCv ? (
          <li className="flex">
            <CvLink href={profile.cvUrl} size="sm" mode={mode} />
          </li>
        ) : null}
      </ul>
    </div>
  );
}
