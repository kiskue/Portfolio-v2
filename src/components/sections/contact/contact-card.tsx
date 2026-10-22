import { ContactFallback } from '@/components/sections/contact/contact-fallback';
import { ContactForm } from '@/components/sections/contact/contact-form';
import { DirectContact } from '@/components/sections/contact/direct-contact';
import { PrivacyNotice } from '@/components/sections/contact/privacy-notice';
import { Card } from '@/components/ui/card';
import { Copy } from '@/components/ui/copy';
import { SectionHeader } from '@/components/ui/section-header';
import { profile } from '@/content/profile';
import { CONTACT_FORM_ANCHOR } from '@/lib/contact/fields';
import type { ContactAction } from '@/lib/contact/state';

export interface ContactCardProps {
  /** The Server Action, or null when the form cannot send (no RESEND_API_KEY in production). */
  readonly action: ContactAction | null;
}

/**
 * The contact card (design §8), first on the page at every width: the direct row (email with
 * Copy, socials, CV), then the form, or direct links when the form cannot send. Its heading is
 * the no-JS permalink's anchor, so a post without JavaScript comes back scrolled to the result.
 */
export function ContactCard({ action }: ContactCardProps) {
  return (
    <Card surface="surface" radius="card" pad="none" className="min-w-0">
      <div className="p-5 md:p-6">
        <DirectContact />
      </div>
      <div className="border-t border-line p-5 md:p-6">
        <SectionHeader as="h2" size="card" id={CONTACT_FORM_ANCHOR} title="Send a message" className="mb-5" />
        {action ? (
          <ContactForm
            action={action}
            email={profile.email}
            privacy={<PrivacyNotice />}
            replyNote={<Copy as="p" text={profile.replyTime} className="mt-1 text-body-sm text-ink-3" />}
          />
        ) : (
          <ContactFallback />
        )}
      </div>
    </Card>
  );
}
