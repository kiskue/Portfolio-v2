import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChartGallery } from './chart-gallery';
import { MarkerGallery } from './marker-gallery';
import { MapMotionSection } from './motion-section';
import { SceneGallery } from './scene-gallery';
import { TownOverview } from './town-overview';

export const metadata: Metadata = { title: 'Map', robots: { index: false, follow: false } };

const SECTIONS = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'markers', label: 'Pins and pucks' },
  { id: 'town', label: 'The town' },
  { id: 'motion', label: 'Motion' },
  { id: 'charts', label: 'Charts' },
] as const;

/**
 * Dev-only gallery for the replica kit's fictional-town map (RMapCanvas) and charts: every
 * scene in both themes at 2xl, every pin and puck, the whole town, the motion contract (poster,
 * active, paused, reduced) and every chart case. A 404 in production.
 */
export default function DevMapPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <h1 className="text-h1">Map and charts</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        The shared fictional town behind every map replica, its scenes, markers and motion, and the replica charts. All
        places and data are fictional.
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
      <SceneGallery />
      <MarkerGallery />
      <TownOverview />
      <MapMotionSection />
      <ChartGallery />
    </>
  );
}
