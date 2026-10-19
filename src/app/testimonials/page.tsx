import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Testimonials' };

export default function TestimonialsPage() {
  return (
    <>
      <h1 className="text-h1">Testimonials</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">What collaborators say.</p>
    </>
  );
}
