import type { Metadata } from 'next';
import { Copy } from '@/components/ui/copy';
import { pages } from '@/content/home';

export const metadata: Metadata = { title: 'Showcase' };

export default function ShowcasePage() {
  return (
    <>
      <h1 className="text-h1">
        <Copy text={pages.showcase.title} />
      </h1>
      <Copy as="p" text={pages.showcase.intro} className="mt-4 max-w-[65ch] text-lead text-ink-2" />
    </>
  );
}
