import type { ReactNode } from 'react';
import { MAP_SCENES, type MapSceneKey, RCanvas, RMapCanvas } from '@/components/replicas/kit';
import { PhoneFrame, type PhoneSize } from '@/components/showcase/phone-frame';
import type { AppId } from '@/content/types';

/** The app canvas each scene is shown on (fonts and base tokens; the map has its own palette). */
export const SCENE_APP: Readonly<Record<MapSceneKey, AppId>> = {
  town: 'citizen',
  delivery: 'sme',
  hazards: 'citizen',
  report: 'citizen',
  duty: 'responder',
  dispatch: 'responder',
  'en-route': 'responder',
  'en-route-near': 'responder',
  'en-route-on-site': 'responder',
  'field-report': 'responder',
  lost: 'citizen',
};

/** Where a band-shaped map sits on the canvas: under a 44 px status bar and a 56 px header. */
const BAND_TOP = 116;

export interface ScenePhoneProps {
  readonly scene: MapSceneKey;
  readonly theme: 'light' | 'dark';
  readonly size: PhoneSize;
  /** Show a band-shaped scene full screen instead (the 1.5 expanded state). */
  readonly full?: boolean;
}

/**
 * A map scene in a device phone: band-shaped maps (1.5, 2.6, 3.6) sit at their height in a
 * rounded card under the header area, full-height maps fill the canvas.
 */
export function ScenePhone({ scene, theme, size, full }: ScenePhoneProps): ReactNode {
  const definition = MAP_SCENES[scene];
  const bandHeight = definition.height === 'full' || full ? null : definition.height;
  const label = `Map scene “${definition.title}” in the ${theme} theme: the fictional town${bandHeight ? ` in a ${bandHeight} px band` : ''}. Fictional data.`;
  return (
    <PhoneFrame
      size={size}
      chrome="device"
      statusBar={theme === 'dark' ? 'light' : 'dark'}
      homeIndicator={theme === 'dark' ? 'light' : 'dark'}
      label={label}
    >
      <RCanvas app={SCENE_APP[scene]} theme={theme}>
        {bandHeight ? (
          <div
            className="absolute overflow-hidden rounded-[12px]"
            style={{ top: BAND_TOP, left: 16, right: 16, height: bandHeight, boxShadow: '0 1px 3px rgb(10 31 61 / 0.12)' }}
          >
            <RMapCanvas theme={theme} height={bandHeight} scene={scene} />
          </div>
        ) : (
          <div className="absolute inset-0">
            <RMapCanvas theme={theme} height="full" scene={scene} />
          </div>
        )}
      </RCanvas>
    </PhoneFrame>
  );
}
