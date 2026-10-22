import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { site } from '@/content/site';
import { robotsFor, robotsMetadata, rootMetadata, sitemapFor } from '@/lib/seo';

/*
 * Label mode vs hide mode (PLAN.md → Placeholders and SEO). Label mode, the default, keeps the
 * whole site noindex with no sitemap; hide mode is indexable and publishes the sitemap.
 */

const ORIGIN = 'https://example.com';

describe('label mode (the default)', () => {
  it('marks every page noindex through the root layout', () => {
    expect(robotsMetadata('label')).toEqual({ index: false, follow: false });
    expect(rootMetadata('label').robots).toEqual({ index: false, follow: false });
  });

  it('has no sitemap', () => {
    expect(sitemapFor('label', ORIGIN)).toBeNull();
  });

  it('lists no sitemap in robots.txt and still lets crawlers read the noindex', () => {
    expect(robotsFor('label', ORIGIN)).toEqual({ rules: { userAgent: '*', allow: '/' } });
  });
});

describe('hide mode (public)', () => {
  it('is indexable', () => {
    expect(robotsMetadata('hide')).toEqual({ index: true, follow: true });
    expect(rootMetadata('hide').robots).toEqual({ index: true, follow: true });
  });

  it('publishes the sitemap and names it in robots.txt', () => {
    expect(robotsFor('hide', ORIGIN)).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: `${ORIGIN}/sitemap.xml` });
    const entries = sitemapFor('hide', ORIGIN);
    expect(entries).not.toBeNull();
    expect(entries?.length).toBeGreaterThan(0);
  });
});

describe('the robots and sitemap routes follow site.placeholders', () => {
  it('robots.txt', () => {
    expect(robots()).toEqual(robotsFor(site.placeholders));
  });

  it('sitemap.xml', () => {
    if (site.placeholders === 'label') {
      // notFound(): the route prerenders as a static 404.
      expect(() => sitemap()).toThrow(expect.objectContaining({ digest: expect.stringMatching(/;404$/) }));
    } else {
      expect(sitemap()).toEqual(sitemapFor('hide'));
    }
  });

  it('the root layout', () => {
    expect(rootMetadata().robots).toEqual(robotsMetadata(site.placeholders));
  });
});
