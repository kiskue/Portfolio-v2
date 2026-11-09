import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { loadOgFonts, loadOgTheme } from '@/components/seo/og-assets';
import { CaseStudyCard, caseStudyCardData } from '@/components/seo/og-card';
import { CASE_STUDY_SLUGS, type CaseStudySlug } from '@/content/types';
import { OG_IMAGE_SIZE, OG_IMAGE_TYPE } from '@/lib/seo';

/*
 * /projects/<slug>/opengraph-image: one card per case study, prerendered for the three slugs.
 * Any other slug is a 404, like the page itself.
 *
 * `alt` is static per file, so it is generic here; pageMetadata() gives each case-study page
 * the specific alt text ("<title>, a case study by Gerric Measco").
 */

export const alt = 'A case study by Gerric Measco: the project’s name and summary over its brand colours';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_TYPE;

export const dynamicParams = false;

export function generateStaticParams(): { slug: CaseStudySlug }[] {
  return CASE_STUDY_SLUGS.map((slug) => ({ slug }));
}

function isCaseStudySlug(slug: string): slug is CaseStudySlug {
  return (CASE_STUDY_SLUGS as readonly string[]).includes(slug);
}

export default async function Image({ params }: { readonly params: Promise<{ slug: string }> }): Promise<ImageResponse> {
  const { slug } = await params;
  if (!isCaseStudySlug(slug)) notFound();
  const [fonts, theme] = await Promise.all([loadOgFonts(), loadOgTheme()]);
  return new ImageResponse(<CaseStudyCard data={caseStudyCardData(slug)} theme={theme} />, { ...size, fonts });
}
