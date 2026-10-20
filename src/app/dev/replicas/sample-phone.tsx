import type { ReactNode } from 'react';
import { RCanvas } from '@/components/replicas/kit';
import { PhoneFrame, type PhoneSize } from '@/components/showcase/phone-frame';
import { SampleCitizenHome } from './sample-screen';

export interface SamplePhoneProps {
  readonly size: PhoneSize | 'inherit';
  /** Brand named in the accessible label (the colours come from a surrounding BrandVars). */
  readonly brandName?: string;
}

/** The kit-only sample screen in a device-chrome phone. */
export function SamplePhone({ size, brandName }: SamplePhoneProps): ReactNode {
  const label = `Sample Citizen-style home screen${brandName ? ` in the ${brandName} colours` : ''}, built only from replica kit parts. Fictional data.`;
  return (
    <PhoneFrame size={size} label={label} chrome="device" statusBar="dark">
      <RCanvas app="citizen" theme="light">
        <SampleCitizenHome />
      </RCanvas>
    </PhoneFrame>
  );
}
