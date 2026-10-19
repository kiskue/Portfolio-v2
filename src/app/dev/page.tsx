import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/*
 * Development-only galleries. Every page under src/app/dev/** must start with the
 * production guard below, so /dev/* is a 404 in production builds.
 */

export const metadata: Metadata = { title: 'Dev pages', robots: { index: false, follow: false } };

interface DevPage {
  readonly href: string;
  readonly label: string;
  readonly note: string;
}

const DEV_PAGES: readonly DevPage[] = [
  { href: '/dev/ui', label: 'UI primitives', note: 'every primitive in both themes' },
  { href: '/dev/replicas', label: 'Replicas', note: 'the phone frame, the replica kit and each figure' },
  { href: '/dev/store', label: 'Store assets', note: 'contact sheet for screenshot classification and alt text' },
];

export default function DevIndexPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <h1 className="text-h1">Dev pages</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        Galleries for checking work in progress. They return 404 in production builds.
      </p>
      <ul className="mt-6 space-y-2">
        {DEV_PAGES.map((page) => (
          <li key={page.href}>
            {/* Cast: these routes are created by later tasks, so typed routes cannot see them yet. */}
            <Link href={page.href as Route} className="font-semibold underline">
              {page.label}
            </Link>{' '}
            <span className="text-ink-3">· {page.note}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
