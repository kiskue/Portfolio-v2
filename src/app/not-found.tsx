import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <>
      <h1 className="text-h1">This page isn’t on the map</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        The link may be old, or the page may have moved. <Link href="/" className="underline">Go to the home page</Link>.
      </p>
    </>
  );
}
