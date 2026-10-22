import type { MetadataRoute } from 'next';
import { notFound } from 'next/navigation';
import { site } from '@/content/site';
import { sitemapFor } from '@/lib/seo';

/**
 * /sitemap.xml, prerendered: the nav routes and the three case studies with absolute URLs, in
 * hide mode only. Label mode has no sitemap (PLAN.md, Placeholders): the route is a static 404.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries = sitemapFor(site.placeholders);
  if (!entries) notFound();
  return entries;
}
