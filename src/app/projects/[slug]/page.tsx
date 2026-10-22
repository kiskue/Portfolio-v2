import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseStudyTemplate } from '@/components/sections/case-study/case-study-template';
import { JsonLd } from '@/components/seo/json-ld';
import { caseStudyBySlug } from '@/content/derived';
import { CASE_STUDY_SLUGS, type CaseStudySlug } from '@/content/types';
import { fieldOrNull } from '@/lib/placeholder';
import { caseStudyHref, projectsHref } from '@/lib/routes';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

/*
 * The three case studies (PLAN routes: /projects/[slug]), each rendered from src/content/case-studies
 * by one template. Statically generated: exactly the three slugs, and any other slug is a 404
 * (dynamicParams = false; npm run check:static asserts it).
 */

function isCaseStudySlug(slug: string): slug is CaseStudySlug {
  return (CASE_STUDY_SLUGS as readonly string[]).includes(slug);
}

/** Only the three slugs exist; anything else is a 404 (no request-time rendering). */
export const dynamicParams = false;

export function generateStaticParams(): { slug: CaseStudySlug }[] {
  return CASE_STUDY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/projects/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (!isCaseStudySlug(slug)) return {};
  const study = caseStudyBySlug(slug);
  return pageMetadata({
    title: `${study.title} case study`,
    // A summary is plain text; hide mode guarantees no "[[…]]" ever reaches a meta tag.
    description: fieldOrNull(study.summary, 'hide') ?? study.title,
    path: caseStudyHref(slug),
  });
}

export default async function CaseStudyPage({ params }: PageProps<'/projects/[slug]'>) {
  const { slug } = await params;
  if (!isCaseStudySlug(slug)) notFound();
  const study = caseStudyBySlug(slug);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: projectsHref() },
          { name: study.title, path: caseStudyHref(slug) },
        ])}
      />
      <CaseStudyTemplate study={study} />
    </>
  );
}
