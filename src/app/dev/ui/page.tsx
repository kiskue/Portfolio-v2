import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GalleryPanel } from './gallery';

export const metadata: Metadata = { title: 'UI primitives', robots: { index: false, follow: false } };

/** Development-only gallery of every UI primitive, a light and a dark panel side by side. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <h1 className="text-h1 text-ink">UI primitives</h1>
      <p className="mt-3 max-w-[65ch] text-lead text-ink-2">
        Every primitive and variant, light and dark side by side. Placeholders render in label mode; sample data is
        fictional.
      </p>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <GalleryPanel theme="light" />
        <GalleryPanel theme="dark" />
      </div>
    </>
  );
}
