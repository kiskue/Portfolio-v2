import type { ReactNode } from 'react';
import { ms, pickState, rStyle, type ReplicaProps } from '@/components/replicas/kit';
import { HomeBody } from '@/components/replicas/citizen/parts/home-body';
import { OfflineBanner } from '@/components/replicas/citizen/parts/offline-banner';
import { SosConfirm } from '@/components/replicas/citizen/parts/sos-confirm';
import { TabScreen } from '@/components/replicas/citizen/parts/tab-screen';
import { czTitles } from '@/components/replicas/citizen/sample-data';
import { figureStates } from './figure-states';

const STATES = figureStates('2.3');

/**
 * Glimpse row 2.3, from the step's start: SOS pressed at 0.9 s, the popup in at 1.0 s, then
 * 5 → 4 → 3 a second apart with the bar shrinking, and Confirm Call pressed at 3.3 s (the
 * citizen-side timings live in citizen.css; this is the popup's start).
 */
const POPUP_AFTER_PRESS_MS = 1000;

/**
 * FIG 2.3 SOS countdown (citizen.json sos-countdown), on the Home tab.
 * `idle`: the red SOS docked in the floating tab bar; while active it is pressed and the
 * Emergency Call popup counts 5 → 3, then Confirm Call is pressed.
 * `countdown`: the popup over Home at 3 s with the bar at 60%; while active it counts 5 → 3.
 * `offline`: the paused grey SOS with its WifiOff badge under the "You are offline" strip.
 */
export function SosCountdownScreen({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  const body = (
    <div className="rx-citizen-fill rx-citizen-clip">
      <HomeBody />
    </div>
  );

  if (current === 'offline') {
    return (
      <TabScreen title={czTitles.home} titleSize={10} tab="Home" sos="offline" banner={<OfflineBanner />}>
        {body}
      </TabScreen>
    );
  }

  const startMs = current === 'idle' ? POPUP_AFTER_PRESS_MS : 0;
  return (
    <TabScreen
      title={czTitles.home}
      titleSize={10}
      tab="Home"
      className={current === 'idle' ? 'rx-citizen-sosflow rx-citizen-sosflow--press' : 'rx-citizen-sosflow'}
      style={rStyle({ '--rx-citizen-sos-at': ms(startMs) })}
      overlay={<SosConfirm startMs={startMs} />}
    >
      {body}
    </TabScreen>
  );
}
