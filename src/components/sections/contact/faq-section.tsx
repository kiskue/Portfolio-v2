import { Card } from '@/components/ui/card';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { faqs } from '@/content/faqs';
import { site } from '@/content/site';
import type { Faq, PlaceholderMode } from '@/content/types';
import { fieldOrNull, visible } from '@/lib/placeholder';

/** The FAQs a mode shows: hide mode drops a question whose whole answer is still a placeholder. */
export function shownFaqs(mode: PlaceholderMode, items: readonly Faq[] = faqs): readonly Faq[] {
  return visible(items, mode).filter((faq) => fieldOrNull(faq.a, mode) !== null);
}

/**
 * The FAQs (design §8): native exclusive <details name="faq">, so opening one closes the others
 * with zero JavaScript. They follow the contact card in the DOM and sit beside it on wide pages.
 */
export function FaqSection({ mode = site.placeholders }: { readonly mode?: PlaceholderMode }) {
  const items = shownFaqs(mode);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faqs" className="min-w-0">
      <SectionHeader as="h2" size="section" id="faqs" title="FAQs" />
      <Card surface="surface" radius="card" pad="none" className="mt-5 divide-y divide-line">
        {items.map((faq) => (
          <details key={faq.id} id={`faq-${faq.id}`} name="faq" className="group px-5 md:px-6">
            <summary className="-mx-2 my-1.5 flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-control px-2 py-2 text-body font-semibold text-ink transition-colors duration-(--dur-1) hover:text-accent-ink [&::-webkit-details-marker]:hidden">
              <Copy as="span" text={faq.q} mode={mode} className="min-w-0" />
              <Icon name="chevron-down" size={18} className="text-ink-3 transition-transform duration-(--dur-2) group-open:rotate-180" />
            </summary>
            <Copy as="p" text={faq.a} mode={mode} className="max-w-[65ch] pb-5 text-body text-ink-2" />
          </details>
        ))}
      </Card>
    </section>
  );
}
