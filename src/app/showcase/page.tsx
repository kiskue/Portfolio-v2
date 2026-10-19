import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Showcase' };

export default function ShowcasePage() {
  return (
    <>
      <h1 className="text-h1">Showcase</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        Coded replicas of shipped screens, with real layouts and fictional data, next to the real store screenshots.
      </p>
    </>
  );
}
