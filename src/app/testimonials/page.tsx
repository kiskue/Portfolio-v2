import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { TestimonialsContent } from '@/components/sections/testimonials/testimonials-content';
import { JsonLd } from '@/components/seo/json-ld';
import { pages } from '@/content/home';
import { site } from '@/content/site';
import { testimonials } from '@/content/testimonials';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

const page = pages.testimonials;
const PATH = '/testimonials';
const HEADING_ID = 'testimonials-title';

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.intro, path: PATH });

/** /testimonials (design §8): the quote grid and a "Leave a note" band, or the empty state in hide mode. */
export default function TestimonialsPage() {
  return (
    <>
      <PageHeader title={page.title} intro={page.intro} id={HEADING_ID} />
      <div className="mt-10 md:mt-12">
        <TestimonialsContent testimonials={testimonials} labelledBy={HEADING_ID} mode={site.placeholders} />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.title, path: PATH },
        ])}
      />
    </>
  );
}
