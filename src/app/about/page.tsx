import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <>
      <h1 className="text-h1">About</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        I build for the conditions people actually live in: patchy data, bright sun and two languages.
      </p>
    </>
  );
}
