import type { ReactNode } from 'react';
import { ms, pickState, rStyle, type ReplicaProps } from '@/components/replicas/kit';
import { HomeBody } from '@/components/replicas/citizen/parts/home-body';
import { OfflineBanner } from '@/components/replicas/citizen/parts/offline-banner';
import { SosConfirm } from '@/components/replicas/citizen/parts/sos-confirm';
import { TabScreen } from '@/components/replicas/citizen/parts/tab-screen';
import { CZ_SOS_TIMELINE } from '@/components/replicas/citizen/parts/timeline';
import { czTitles } from '@/components/replicas/citizen/sample-data';
import { figureStates } from './figure-states';

const STATES = figureStates('2.3');

/**
 * FIG 2.3 SOS countdown (citizen.json sos-countdown), on the Home tab.
 * `idle`: the red SOS docked in the floating tab bar; while active it is pressed, the
 * Emergency Call popup counts 5 → 3 and Confirm Call is pressed (CZ_SOS_TIMELINE, glimpse 2.3).
 * `countdown`: the popup over Home at 3 s with the bar at 60%; while active it counts 5 → 3.
 * `offline`: the paused grey SOS with its WifiOff badge under the "You are offline" strip.
 */
export function SosCountdownScreen({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  const body = (
    <div className="rx-citizen-fill rx-citizen-clip">
      <HomeBody feed={current === 'offline' ? 'none' : 'services'} />
    </div>
  );

  if (current === 'offline') {
    return (
      <TabScreen title={czTitles.home} titleSize={10} tab="Home" sos="offline" banner={<OfflineBanner />}>
        {body}
      </TabScreen>
    );
  }

  const press = current === 'idle';
  const popupMs = press ? CZ_SOS_TIMELINE.popupMs : 0;
  return (
    <TabScreen
      title={czTitles.home}
      titleSize={10}
      tab="Home"
      sos={press ? 'press' : 'idle'}
      className={press ? 'rx-citizen-sosflow rx-citizen-sosflow--press' : 'rx-citizen-sosflow'}
      style={rStyle({
        '--rx-citizen-sos-at': ms(popupMs),
        '--rx-citizen-press-at': press ? ms(CZ_SOS_TIMELINE.pressMs) : undefined,
        '--rx-citizen-commit-at': press ? ms(CZ_SOS_TIMELINE.commitMs) : undefined,
        '--rx-citizen-confirm-at': press ? ms(CZ_SOS_TIMELINE.confirmMs) : undefined,
      })}
      overlay={<SosConfirm startMs={popupMs} />}
    >
      {body}
    </TabScreen>
  );
}
