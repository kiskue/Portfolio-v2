import type { ReactNode } from 'react';
import { DevSection, Term } from '@/app/dev/replicas/dev-section';
import { MotionCallScreen, MotionDashboardScreen } from '@/app/dev/replicas/motion-screens';
import { RCanvas } from '@/components/replicas/kit';
import { Glimpse } from '@/components/showcase/glimpse';
import { PhoneFrame } from '@/components/showcase/phone-frame';
import { TapLayer } from '@/components/showcase/tap-indicator';
import { Icon } from '@/components/ui/icon';
import type { Tap } from '@/content/types';
import type { Playlist } from '@/lib/glimpse';

/** Two kit motion screens (fictional) as a two-step track. */
const PLAYLIST: Playlist = {
  tracks: [{ steps: [{ holdMs: 4200 }, { holdMs: 4200 }], posterStep: 0 }],
  maxRotations: 2,
  reducedMotion: false,
};

const TAPS: readonly (readonly Tap[])[] = [
  [{ x: 195, y: 760, atMs: 900, kind: 'tap' }],
  [{ x: 195, y: 700, atMs: 600, kind: 'hold', holdMs: 1200 }],
];

const ICONS = {
  pause: <Icon name="pause" size={16} />,
  play: <Icon name="play" size={16} />,
  replay: <Icon name="rotate-ccw" size={16} />,
};

/**
 * Section 4: the motion contract inside a player. Registry replicas may still be pending, so
 * this composes Glimpse parts by hand around two kit motion screens whose RStateSequence,
 * RAutoScroll, RTypewriter and pulses really animate: data-active starts them from 0 on each
 * step, Pause (data-paused on the track) freezes them and the tap rings mid-frame.
 */
export function MotionSection(): ReactNode {
  return (
    <DevSection
      id="motion"
      title="4. Motion contract"
      intro={
        <>
          The playing frame gets <Term>data-active</Term>, so its animations start from 0; Pause sets{' '}
          <Term>data-paused</Term> on the track and everything inside freezes on its current frame, tap rings included.
          A frame that is replaced stays underneath, frozen, while the next one fades in.
        </>
      }
    >
      <Glimpse.Root playlist={PLAYLIST} mode="auto" label="Motion demo: two kit screens with tap rings. Fictional data." className="gl">
        <div className="flex flex-col items-start gap-4" data-dev-motion-player="">
          <div className="gl-toolbar">
            <Glimpse.Dots track={0} label="Motion demo steps" labels={['Call screen', 'Dashboard']} />
            <Glimpse.Controls icons={ICONS} />
          </div>
          <Glimpse.Track track={0} className="gl-ps-lg">
            <Glimpse.Frame track={0} step={0}>
              <PhoneFrame size="inherit" chrome="device" statusBar="light" homeIndicator="light" label="Motion demo: a call screen that steps from in queue to connected. Fictional data.">
                <RCanvas app="citizen" theme="dark">
                  <MotionCallScreen />
                </RCanvas>
              </PhoneFrame>
              <TapLayer taps={TAPS[0] ?? []} />
            </Glimpse.Frame>
            <Glimpse.Frame track={0} step={1}>
              <PhoneFrame size="inherit" chrome="device" statusBar="light" label="Motion demo: a dashboard that auto-scrolls while an insight types out. Fictional data.">
                <RCanvas app="sme" theme="light">
                  <MotionDashboardScreen />
                </RCanvas>
              </PhoneFrame>
              <TapLayer taps={TAPS[1] ?? []} />
            </Glimpse.Frame>
          </Glimpse.Track>
        </div>
      </Glimpse.Root>
    </DevSection>
  );
}
