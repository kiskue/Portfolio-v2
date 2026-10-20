import type { ReactNode } from 'react';
import { RCanvas } from '@/components/replicas/kit';
import { PhoneFrame } from '@/components/showcase/phone-frame';
import { DevSection, Term } from './dev-section';
import { MotionDemo } from './motion-demo.client';
import { MotionCallScreen, MotionDashboardScreen } from './motion-screens';

/** Section 4: the motion contract, driven by a tiny client island. */
export function MotionSection(): ReactNode {
  return (
    <DevSection
      id="motion"
      title="4. Motion contract"
      intro={
        <>
          Kit animations run only under an ancestor with <Term>data-active</Term> and start from 0
          when it appears. <Term>data-paused</Term> freezes them. With reduced motion (the
          in-site setting, or the OS setting when <Term>&lt;html&gt;</Term> has no
          data-motion), the poster shows even while active. These phones start as static posters, like every phone
          outside a glimpse player.
        </>
      }
    >
      <MotionDemo>
        <PhoneFrame
          size="lg"
          chrome="device"
          statusBar="light"
          homeIndicator="light"
          label="Motion demo: a call screen whose status steps from in queue to connected. Fictional data."
        >
          <RCanvas app="citizen" theme="dark">
            <MotionCallScreen />
          </RCanvas>
        </PhoneFrame>
        <PhoneFrame
          size="lg"
          chrome="device"
          statusBar="light"
          label="Motion demo: a dashboard that auto-scrolls while an insight types out. Fictional data."
        >
          <RCanvas app="sme" theme="light">
            <MotionDashboardScreen />
          </RCanvas>
        </PhoneFrame>
      </MotionDemo>
    </DevSection>
  );
}
