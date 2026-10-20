import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandsSection } from './brands-section';
import { FigureList } from './figure-list';
import { ImageCases } from './image-cases';
import { KitGallery } from './kit-gallery';
import { MotionSection } from './motion-section';
import { SizesSection } from './sizes-section';

export const metadata: Metadata = { title: 'Replicas', robots: { index: false, follow: false } };

const SECTIONS = [
  { id: 'sizes', label: 'Phone sizes' },
  { id: 'brands', label: 'Brand re-skin' },
  { id: 'kit', label: 'Replica kit' },
  { id: 'motion', label: 'Motion contract' },
  { id: 'figures', label: 'Figures' },
  { id: 'images', label: 'Screenshots' },
] as const;

/** Dev-only gallery for the phone frame, the replica kit and every figure (404 in production). */
export default function DevReplicasPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <h1 className="text-h1">Replicas</h1>
      <p className="mt-4 max-w-[65ch] text-lead text-ink-2">
        The phone frame, the replica kit and every figure, for checking work in progress. All data shown is fictional.
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
      <SizesSection />
      <BrandsSection />
      <KitGallery />
      <MotionSection />
      <FigureList />
      <ImageCases />
    </>
  );
}
