import { PageHeader } from '@/components/layout/page-header';
import { ContactCard } from '@/components/sections/contact/contact-card';
import { FaqSection } from '@/components/sections/contact/faq-section';
import { JsonLd } from '@/components/seo/json-ld';
import { pages } from '@/content/home';
import { site } from '@/content/site';
import { resolveContactConfig } from '@/lib/contact/config';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { sendContactMessage } from './actions';

/** A nav item's label, so the title and the breadcrumb follow the nav. */
const navLabel = (id: string): string => site.nav.find((item) => item.id === id)?.label ?? id;

export const metadata = pageMetadata({
  title: navLabel('contact'),
  description:
    'Get in touch with Gerric Measco about a role, a project or a testimonial, and read answers to common questions about his work.',
  path: '/contact',
});

/**
 * FAQs / Contact (PLAN → Other pages; design §8). The contact card comes first in the DOM and on
 * small screens; the FAQs follow, beside it on wide pages. The page is static: whether the form
 * can send is read from the environment at build time, ?topic= is read by the form island on the
 * client, and a post without JavaScript is rendered per request by the Server Action.
 */
export default function ContactPage() {
  const { formAvailable } = resolveContactConfig(process.env);
  return (
    <>
      <PageHeader title={pages.contact.title} intro={pages.contact.intro} />
      <div className="mt-8 grid items-start gap-12 md:mt-10 @4xl:grid-cols-[1.1fr_0.9fr] @4xl:gap-8 @6xl:gap-10">
        <ContactCard action={formAvailable ? sendContactMessage : null} />
        <FaqSection />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: navLabel('home'), path: '/' },
          { name: navLabel('contact'), path: '/contact' },
        ])}
      />
    </>
  );
}
