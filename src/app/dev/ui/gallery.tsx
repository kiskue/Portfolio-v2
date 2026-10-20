import { Card } from '@/components/ui/card';
import type { BentoArea } from '@/content/types';
import { cn } from '@/lib/cn';
import { DemoSection } from './demo-section';
import { LinksDemo, OverlaysDemo, PlaceholdersDemo, ProjectCardsDemo, QuoteCardsDemo } from './gallery-content';
import { ButtonsDemo, ChipsDemo, SegmentedDemo } from './gallery-controls';
import { BentoDemo, CardsDemo, HeadersDemo } from './gallery-surfaces';
import { GlyphsDemo, IconsDemo, StatusDemo } from './gallery-visuals';
import { HooksDemo } from './hooks-demo';

export type PanelTheme = 'light' | 'dark';

/** Bento areas per panel: each BentoCard's title id derives from its area, so panels differ. */
const BENTO_AREAS: Record<PanelTheme, readonly [BentoArea, BentoArea, BentoArea]> = {
  light: ['proj', 'about', 'serv'],
  dark: ['live', 'cred', 'testi'],
};

/**
 * One themed panel with every primitive. The dark panel adds the `dark` class, which switches
 * the --c-* tokens for its subtree. (With a stored dark preference the whole page is dark.)
 */
export function GalleryPanel({ theme }: { readonly theme: PanelTheme }) {
  const id = `ui-${theme}`;
  const dark = theme === 'dark';
  return (
    <Card
      as="section"
      surface="sunken"
      radius="bento"
      aria-labelledby={`${id}-title`}
      className={cn('flex min-w-0 flex-col gap-6 text-ink', dark && 'dark')}
    >
      <h2 id={`${id}-title`} className="text-h2 text-ink">
        {dark ? 'Dark panel' : 'Light panel'}
      </h2>
      <ButtonsDemo />
      <ChipsDemo />
      <SegmentedDemo id={id} />
      <IconsDemo />
      <GlyphsDemo />
      <StatusDemo />
      <CardsDemo />
      <BentoDemo areas={BENTO_AREAS[theme]} />
      <HeadersDemo id={id} />
      <PlaceholdersDemo />
      <LinksDemo />
      <OverlaysDemo id={id} dark={dark} />
      <ProjectCardsDemo />
      <QuoteCardsDemo />
      <DemoSection title="Hooks" note="useInView, useAutoplay (pauses below 50% visible or in a hidden tab), useReducedMotion, useSearchParam.">
        <HooksDemo id={id} />
      </DemoSection>
    </Card>
  );
}
