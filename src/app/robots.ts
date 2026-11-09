import type { MetadataRoute } from 'next';
import { site } from '@/content/site';
import { robotsFor } from '@/lib/seo';

/**
 * /robots.txt, prerendered. Hide mode points crawlers at the sitemap. Label mode lists no
 * sitemap, and keeps pages out of search results with their noindex robots meta (see robotsFor).
 */
export default function robots(): MetadataRoute.Robots {
  return robotsFor(site.placeholders);
}
