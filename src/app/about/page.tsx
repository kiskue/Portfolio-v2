import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { AboutContent } from '@/components/sections/about/about-content';
import { JsonLd } from '@/components/seo/json-ld';
import { pages } from '@/content/home';
import { site } from '@/content/site';
import { aboutHref } from '@/lib/routes';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

const page = pages.about;

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.intro, path: aboutHref() });

/** /about (design §8): portrait card, bio and stats, experience, skills, credentials and education. */
export default function AboutPage() {
  return (
    <>
      <PageHeader title={page.title} intro={page.intro} />
      <div className="mt-10 md:mt-12">
        <AboutContent mode={site.placeholders} />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.title, path: aboutHref() },
        ])}
      />
    </>
  );
}
