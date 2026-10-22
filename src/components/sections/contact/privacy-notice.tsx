import { Copy } from '@/components/ui/copy';
import { contactPrivacy } from '@/content/faqs';

/**
 * The privacy notice shown with the form, before the send button (PLAN → Contact; RA 10173):
 * purpose, processor (Resend) and retention. Each sentence is a whole field, so hide mode drops
 * the retention placeholder without leaving half a sentence.
 */
export function PrivacyNotice() {
  const { title, purpose, processor, retention } = contactPrivacy;
  return (
    <div className="flex flex-col gap-1 text-meta text-ink-3" data-privacy-notice="">
      <h3 className="font-semibold text-ink-2">
        <Copy text={title} />
      </h3>
      <p>
        <Copy text={purpose} /> <Copy text={processor} /> <Copy text={retention} />
      </p>
    </div>
  );
}
