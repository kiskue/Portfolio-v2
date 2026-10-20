import type { ReactNode } from 'react';
import { EN_ROUTE_TIMELINE, type MapSceneKey } from '@/components/replicas/kit';
import { ChartRevealPhone } from './chart-gallery';
import { DevMapSection, PhoneItem, PhoneRow } from './dev-map-section';
import { MapMotionLab } from './motion-lab.client';
import { ScenePhone } from './scene-phone';

/** The scenes that move: the two glides (one with the follow camera), and the pulsing dot and halo. */
const ANIMATED: readonly MapSceneKey[] = ['en-route', 'delivery', 'duty', 'lost'];

const MARKS = [0, 300, 700, 1100, 1500, 2000, 2400, EN_ROUTE_TIMELINE.onSiteMs, 3600] as const;

/** One static column of the states table: a wrapper with the given player attributes. */
function StateColumn({ state, children }: { readonly state: 'poster' | 'active' | 'paused'; readonly children: ReactNode }): ReactNode {
  if (state === 'poster') return <div data-map-state="poster">{children}</div>;
  if (state === 'active') {
    return (
      <div data-map-state="active" data-active="">
        {children}
      </div>
    );
  }
  return (
    <div data-map-state="paused" data-active="" data-paused="">
      {children}
    </div>
  );
}

/** Section 4: the motion contract on the animated scenes, static states and a lab with controls. */
export function MapMotionSection(): ReactNode {
  return (
    <DevMapSection
      id="motion"
      title="4. Motion"
      intro={
        <>
          The puck glides along the route with offset-path, a trimmed route shrinks behind it, recolorAt stops recolour the
          route (FAR, CLOSE, NEAR, ON SITE) and the 3.3 follow camera slides the tilted town under the puck. Everything runs
          only under data-active, freezes under data-paused, and shows the poster when not active or with reduced motion.
        </>
      }
    >
      <div>
        <h3 className="text-h3">Static states</h3>
        <p className="mt-1 max-w-[72ch] text-body-sm text-ink-3">
          Poster (no data-active), Active (data-active from page load: plays once and holds its last frame) and Paused
          (data-active with data-paused: frozen on frame 0, where each glide waits at its first stop).
        </p>
        {(['en-route', 'delivery'] as const).map((scene) => (
          <PhoneRow key={scene} label={`${scene}: poster, active and paused`}>
            {(['poster', 'active', 'paused'] as const).map((state) => (
              <PhoneItem key={state} caption={`${scene} · ${state}`} data-scene={scene} data-state-variant={state}>
                <StateColumn state={state}>
                  <ScenePhone scene={scene} theme="light" size="lg" />
                </StateColumn>
              </PhoneItem>
            ))}
          </PhoneRow>
        ))}
      </div>
      <div>
        <h3 className="text-h3">Lab</h3>
        <p className="mt-1 mb-4 max-w-[72ch] text-body-sm text-ink-3">
          Start, restart, pause or freeze the animated scenes at a time (ms after data-active appears), or switch on reduced
          motion. The 3.3 drive: start {EN_ROUTE_TIMELINE.startMs} ms, CLOSE {EN_ROUTE_TIMELINE.closeMs} ms, NEAR{' '}
          {EN_ROUTE_TIMELINE.nearMs} ms, ON SITE {EN_ROUTE_TIMELINE.onSiteMs} ms.
        </p>
        <MapMotionLab marks={MARKS}>
          {ANIMATED.map((scene) => (
            <figure key={scene} className="flex w-min flex-col gap-2" data-lab-scene={scene}>
              <ScenePhone scene={scene} theme="light" size="lg" />
              <figcaption className="text-meta text-ink-3">{scene}</figcaption>
            </figure>
          ))}
          <figure className="flex w-min flex-col gap-2" data-lab-scene="en-route-dark">
            <ScenePhone scene="en-route" theme="dark" size="lg" />
            <figcaption className="text-meta text-ink-3">en-route · dark</figcaption>
          </figure>
          <figure className="flex w-min flex-col gap-2" data-lab-chart="">
            <ChartRevealPhone />
            <figcaption className="text-meta text-ink-3">charts · reveal</figcaption>
          </figure>
        </MapMotionLab>
      </div>
    </DevMapSection>
  );
}
