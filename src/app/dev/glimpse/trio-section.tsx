import type { ReactNode } from 'react';
import { DevSection, Term } from '@/app/dev/replicas/dev-section';
import { GlimpsePlayer } from '@/components/showcase/glimpse';
import { Card } from '@/components/ui/card';
import type { GlimpseId } from '@/content/types';

const HOME: readonly GlimpseId[] = ['home.sme', 'home.citizen', 'home.responder'];

/** Projects-card widths from design §5.3 (the player sits inside the card's padding). */
const CARDS = [
  { width: 516, note: 'Trio: md centre, sm sides (1440px Home)', morph: true },
  { width: 448, note: 'Compact trio: sm centre, xs sides (1280px Home)', morph: false },
  { width: 728, note: 'Large trio: lg centre, md sides', morph: false },
  { width: 380, note: 'Below 448px: one phone and an app picker', morph: false },
] as const;

/** Section 1: the Home trio at each card width, and the single layout. */
export function TrioSection(): ReactNode {
  return (
    <DevSection
      id="trio"
      title="1. Trio and single"
      intro={
        <>
          The Home Projects stage: <Term>layout=&quot;trio&quot;</Term> with <Term>size=&quot;inherit&quot;</Term> takes
          its phone sizes, overlap and stage height from its own width. Each phone links to its case study; the playing app
          rises with a glow and story bars in its chip. Hover or focus an app to hold the rotation on it. Step dots and
          Pause sit beside the caption. Only the first trio carries the phone-morph names.
        </>
      }
    >
      <div className="flex flex-col gap-10">
        {CARDS.map((card) => (
          <figure key={card.width} className="flex max-w-full flex-col gap-2" data-dev-trio={card.width}>
            <figcaption className="text-meta text-ink-3">
              {card.width}px card · {card.note}
            </figcaption>
            <Card className="max-w-full overflow-hidden" style={{ width: card.width }}>
              <GlimpsePlayer glimpses={HOME} layout="trio" size="inherit" morph={card.morph} id={`dev-trio-${card.width}`} />
            </Card>
          </figure>
        ))}
        <figure className="flex max-w-full flex-col gap-2" data-dev-single="">
          <figcaption className="text-meta text-ink-3">
            layout=&quot;single&quot; · size=&quot;md&quot;: always one phone, with the app picker
          </figcaption>
          <Card className="max-w-full" style={{ width: 360 }}>
            <GlimpsePlayer glimpses={HOME} layout="single" size="md" morph={false} id="dev-single" />
          </Card>
        </figure>
      </div>
    </DevSection>
  );
}
