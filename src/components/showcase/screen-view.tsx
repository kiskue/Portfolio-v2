import type { ReactNode } from 'react';
import { RCanvas } from '@/components/replicas/kit';
import { replicas } from '@/components/replicas/registry';
import { BrandVars } from '@/components/showcase/brand-vars';
import { PhoneFrame, ScreenCard, type PhoneSize } from '@/components/showcase/phone-frame';
import { resolveScreen } from '@/content/derived';
import type { ScreenSource } from '@/content/types';

export interface ScreenViewProps {
  readonly source: ScreenSource;
  readonly size: PhoneSize | 'inherit';
  /** Device chrome over a replica (default 'device'). Images never get chrome. */
  readonly chrome?: 'device' | 'none';
  /**
   * 'own' (default) wraps a brandable replica in BrandVars for its brand (the source's, else
   * the app's default). Inside a BrandScope pass 'inherit', so the scope's brand applies.
   */
  readonly brandMode?: 'own' | 'inherit';
  readonly className?: string;
}

/**
 * The only way a screen is rendered (architecture D2, reuse rule 6). A replica draws its
 * registry component inside RCanvas inside PhoneFrame; a 'raw' screenshot goes inside the
 * frame; a 'marketing' screenshot becomes a bordered card and is never put in a frame.
 * Server-only (it imports the replica registry): client islands receive it as children.
 */
export function ScreenView({ source, size, chrome = 'device', brandMode = 'own', className }: ScreenViewProps): ReactNode {
  const screen = resolveScreen(source);

  if (screen.kind === 'image') {
    const { image } = screen;
    if (image.presentation === 'marketing') return <ScreenCard image={image} size={size} className={className} />;
    return <PhoneFrame size={size} label={image.alt} chrome="none" image={{ ...image, presentation: 'raw' }} className={className} />;
  }

  const { figure, state, brand } = screen;
  const Replica = replicas[figure.id];
  const canvas = (
    <RCanvas app={figure.app} theme={figure.theme}>
      <Replica state={state} />
    </RCanvas>
  );
  const frame =
    chrome === 'device' ? (
      <PhoneFrame
        size={size}
        label={figure.summary}
        chrome="device"
        statusBar={figure.statusBar}
        homeIndicator={figure.theme === 'dark' ? 'light' : 'dark'}
        className={className}
      >
        {canvas}
      </PhoneFrame>
    ) : (
      <PhoneFrame size={size} label={figure.summary} chrome="none" className={className}>
        {canvas}
      </PhoneFrame>
    );

  return brand && brandMode === 'own' ? <BrandVars brand={brand.id}>{frame}</BrandVars> : frame;
}
