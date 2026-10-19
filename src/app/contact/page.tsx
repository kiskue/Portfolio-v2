import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQs / Contact' };

export default function ContactPage() {
  return (
    <>
      <h1 className="text-h1">Let’s talk</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        Hiring, a project, or a question about something here. I read everything.
      </p>
    </>
  );
}
