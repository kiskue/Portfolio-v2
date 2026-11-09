import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { ShowcaseWall } from '@/components/sections/showcase/showcase-wall';
import { JsonLd } from '@/components/seo/json-ld';
import { pages } from '@/content/home';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

/*
 * /showcase (PLAN "Other pages", design §7): the wall of app screens, grouped by app, with
 * URL-synced filters for app, brand and source and a lightbox. Static: the filters sync on the
 * client, so this page never reads searchParams.
 */

const { title, intro } = pages.showcase;
const PATH = '/showcase';

export const metadata: Metadata = pageMetadata({ title, description: intro, path: PATH });

export default function ShowcasePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: title, path: PATH },
        ])}
      />
      <PageHeader title={title} intro={intro} />
      <ShowcaseWall className="mt-8 md:mt-10" />
    </>
  );
}
