import { ImageResponse } from 'next/og';
import { loadOgFonts, loadOgTheme } from '@/components/seo/og-assets';
import { SiteCard, siteCardData } from '@/components/seo/og-card';
import { OG_IMAGE_SIZE, OG_IMAGE_TYPE, rootOgImageAlt } from '@/lib/seo';

/*
 * /opengraph-image: the site card (name, the Home headline, a colour bar per app), prerendered
 * as a PNG at build time. Every page without its own card shows it (pageMetadata in
 * src/lib/seo.ts points og:image here).
 */

export const alt = rootOgImageAlt();
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_TYPE;

export default async function Image(): Promise<ImageResponse> {
  const [fonts, theme] = await Promise.all([loadOgFonts(), loadOgTheme()]);
  return new ImageResponse(<SiteCard data={siteCardData()} theme={theme} />, { ...size, fonts });
}
