import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { JsonLd } from '@/components/seo/json-ld';
import { DISPLAY_PREPAINT } from '@/lib/display-settings';
import { fontClassName } from '@/lib/fonts';
import { personJsonLd, rootMetadata } from '@/lib/seo';
import '@/styles/globals.css';

/*
 * metadataBase (NEXT_PUBLIC_SITE_URL, then the Vercel production domain, then localhost), the
 * " · Gerric Measco" title template, the default description and Open Graph type, and robots:
 * label mode is noindex. Pages add their canonical and Open Graph fields with pageMetadata().
 */
export const metadata: Metadata = rootMetadata();

/*
 * The display pre-paint script must stay the FIRST child of <head>: it sets .dark,
 * color-scheme and data-motion while the HTML is parsed, before first paint. It is a plain
 * inline <script>, not next/script: an inline beforeInteractive script in the App Router only
 * runs after the main chunk has loaded. suppressHydrationWarning covers the attributes it adds.
 *
 * The Person JSON-LD (the site owner) is on every page. Vercel Analytics renders only in builds
 * that run on Vercel (VERCEL is set there at build time); it is cookieless.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      data-env={process.env.NODE_ENV}
      className={fontClassName}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_PREPAINT }} />
        <JsonLd data={personJsonLd()} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
