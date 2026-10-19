import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { site } from '@/content/site';
import { DISPLAY_PREPAINT } from '@/lib/display-settings';
import { fontClassName } from '@/lib/fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'Gerric Measco — Mobile & full-stack engineer',
    template: '%s · Gerric Measco',
  },
  description:
    'Gerric Measco builds offline-first, real-time mobile apps, from SOS video calls for city command centers to a pocket ERP for Filipino small businesses.',
  // Placeholder ("label") mode is not for search engines; sitemap and indexing come with 'hide'.
  robots: site.placeholders === 'label' ? { index: false, follow: false } : undefined,
};

/*
 * The display pre-paint script must stay the FIRST child of <head>: it sets .dark,
 * color-scheme and data-motion while the HTML is parsed, before first paint. It is a plain
 * inline <script>, not next/script: an inline beforeInteractive script in the App Router only
 * runs after the main chunk has loaded. suppressHydrationWarning covers the attributes it adds.
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
      </head>
      <body>
        <AppShell>{children}</AppShell>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
