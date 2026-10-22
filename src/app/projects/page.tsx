import { PageHeader } from '@/components/layout/page-header';
import { JsonLd } from '@/components/seo/json-ld';
import { ProjectsIndex } from '@/components/sections/projects/projects-index';
import { pages } from '@/content/home';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { projectsHref } from '@/lib/routes';

const page = pages.projects;

export const metadata = pageMetadata({ title: page.title, description: page.intro, path: projectsHref() });

/**
 * /projects (PLAN → Routes, Other pages). Statically prerendered: the page never reads
 * searchParams. ?type= and &context= are applied on the client by the FacetFilter island, and
 * without JavaScript every project shows.
 */
export default function ProjectsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.title, path: projectsHref() },
        ])}
      />
      <PageHeader title={page.title} intro={page.intro} />
      <ProjectsIndex className="mt-8 md:mt-10" />
    </>
  );
}
