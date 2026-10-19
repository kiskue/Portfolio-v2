import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
  return (
    <>
      <h1 className="text-h1">Projects</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        Case studies first, then everything else I’ve shipped, prototyped or contributed to.
      </p>
    </>
  );
}
