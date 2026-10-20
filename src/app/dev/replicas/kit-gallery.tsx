import type { ReactNode } from 'react';
import { DevSection, Term } from './dev-section';
import { GalleryContent } from './gallery-content';
import { GalleryStructure } from './gallery-structure';

/** Section 3: every kit part at 1:1 on its app's canvas tokens. */
export function KitGallery(): ReactNode {
  return (
    <DevSection
      id="kit"
      title="3. Replica kit"
      intro={
        <>
          Every part of <Term>@/components/replicas/kit</Term> at 1:1 (one logical px is one CSS
          px), on cropped canvases that carry each app&apos;s tokens. Motion parts show their static poster here; section
          4 plays them. Hex values are the apps&apos; own palettes; data is fictional.
        </>
      }
    >
      <div className="grid gap-x-6 gap-y-8 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
        <GalleryStructure />
        <GalleryContent />
      </div>
    </DevSection>
  );
}
