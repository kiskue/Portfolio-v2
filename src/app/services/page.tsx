import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Services' };

export default function ServicesPage() {
  return (
    <>
      <h1 className="text-h1">Services</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        I take mobile products from first screen to store release.
      </p>
    </>
  );
}
