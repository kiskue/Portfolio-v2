import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/* STUB from the scaffold; the case-study task replaces it with the data-driven template. */

const CASE_STUDIES = {
  'sme-panindio': 'SME Panindio',
  'defensys-citizen': 'Defensys Citizen',
  'defensys-responder': 'Defensys Responder',
} as const;

type CaseStudySlug = keyof typeof CASE_STUDIES;

function isCaseStudySlug(slug: string): slug is CaseStudySlug {
  return Object.hasOwn(CASE_STUDIES, slug);
}

/** Only the three slugs exist; anything else is a 404 (no request-time rendering). */
export const dynamicParams = false;

export function generateStaticParams(): { slug: CaseStudySlug }[] {
  return (Object.keys(CASE_STUDIES) as CaseStudySlug[]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/projects/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return isCaseStudySlug(slug) ? { title: CASE_STUDIES[slug] } : {};
}

export default async function CaseStudyPage({ params }: PageProps<'/projects/[slug]'>) {
  const { slug } = await params;
  if (!isCaseStudySlug(slug)) notFound();

  return (
    <>
      <h1 className="text-h1">{CASE_STUDIES[slug]}</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">The full case study is on its way.</p>
    </>
  );
}
