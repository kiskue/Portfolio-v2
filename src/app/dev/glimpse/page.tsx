import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandsSection } from './brands-section';
import { HeroSection } from './hero-section';
import { MotionSection } from './motion-section';
import { MotionToggle } from './motion-toggle.client';
import { SequenceTable } from './sequence-table';
import { TrioSection } from './trio-section';

export const metadata: Metadata = { title: 'Glimpse player', robots: { index: false, follow: false } };

const SECTIONS = [
  { id: 'trio', label: 'Trio and single' },
  { id: 'hero', label: 'Case-study heroes' },
  { id: 'brands', label: 'Brand scope and source toggle' },
  { id: 'motion', label: 'Motion contract' },
  { id: 'sequences', label: 'Sequences' },
] as const;

/**
 * Dev-only gallery for the glimpse player (404 in production): the trio, single and hero
 * layouts, the brand scope with its switcher and the source toggle, the motion contract inside
 * a player, and the glimpse data. Only the first player of each app carries the phone-morph
 * View Transition name, so names stay unique on the page.
 */
export default function DevGlimpsePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <h1 className="text-h1">Glimpse player</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        Server-rendered steps with client parts that only flip attributes. Players pause below 50% visibility and in a
        hidden tab, stop after two rotations, and show posters under reduced motion. All data shown is fictional.
      </p>
      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm">
          {SECTIONS.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline underline-offset-4">
                {index + 1}. {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <MotionToggle />
      <TrioSection />
      <HeroSection />
      <BrandsSection />
      <MotionSection />
      <SequenceTable />
    </>
  );
}
