import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { storeListings } from '@/content/apps/store';
import type { ScreenImage } from '@/content/types';
import { DevSection, Term } from './dev-section';

type Presentation = ScreenImage['presentation'];

/**
 * Local test images, never committed: drop them in public/__tmp__/ to preview this section
 * before real store screenshots exist (W12's store data is used first when present).
 */
const TEST_IMAGES: Readonly<Record<Presentation, Omit<ScreenImage, 'presentation'> & { readonly file: string }>> = {
  raw: {
    file: 'screen-raw.png',
    src: '/__tmp__/screen-raw.png',
    width: 1320,
    height: 2868,
    alt: 'Test image for the raw case: a plain gradient labelled RAW, not an app screen.',
    provenance: 'device',
  },
  marketing: {
    file: 'screen-marketing.png',
    src: '/__tmp__/screen-marketing.png',
    width: 1242,
    height: 2208,
    alt: 'Test image for the marketing case: a plain gradient labelled MARKETING, not an app screen.',
    provenance: 'device',
  },
};

const NOTES: Readonly<Record<Presentation, string>> = {
  raw: "presentation 'raw': inside the phone frame (next/image fill, object-cover object-top, no device chrome).",
  marketing: "presentation 'marketing': a bordered radius-16 card at the image's own aspect ratio, never in a frame.",
};

function storeImage(presentation: Presentation): ScreenImage | null {
  for (const listing of storeListings) {
    const match = listing.screenshots.find((image) => image.presentation === presentation);
    if (match) return match;
  }
  return null;
}

function testImage(presentation: Presentation): ScreenImage | null {
  const { file, ...image } = TEST_IMAGES[presentation];
  return existsSync(join(process.cwd(), 'public', '__tmp__', file)) ? { ...image, presentation } : null;
}

/** Section 6: ScreenView with a real image, once per presentation. */
export function ImageCases(): ReactNode {
  const cases = (['raw', 'marketing'] as const).map((presentation) => ({
    presentation,
    image: storeImage(presentation) ?? testImage(presentation),
  }));
  return (
    <DevSection
      id="images"
      title="6. Real screenshots through ScreenView"
      intro={
        <>
          An image <Term>ScreenSource</Term> for each presentation. Store screenshots are used
          when the store data has them; otherwise local test images in{' '}
          <Term>public/__tmp__/</Term> (never committed).
        </>
      }
    >
      <ul className="flex flex-wrap items-start gap-x-10 gap-y-8">
        {cases.map(({ presentation, image }) => (
          <li key={presentation} className="max-w-xs" data-image-case={presentation}>
            {image ? (
              <ScreenFigure source={{ kind: 'image', image }} size="lg" caption={NOTES[presentation]} />
            ) : (
              <p className="text-body-sm text-ink-3">
                No {presentation} image yet. {NOTES[presentation]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </DevSection>
  );
}
