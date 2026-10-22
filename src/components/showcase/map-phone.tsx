import type { ReactNode } from 'react';
import { type MapSceneKey, RCanvas, RMapCanvas } from '@/components/replicas/kit';
import { PhoneFrame, type PhoneSize } from '@/components/showcase/phone-frame';
import type { AppId } from '@/content/types';

export interface MapPhoneProps {
  /** A named scene of the fictional-town map (replicas/kit map-scenes.ts), shown full screen. */
  readonly scene: MapSceneKey;
  readonly size: PhoneSize;
  /** The phone's role="img" name: what the map shows, ending with "Fictional data." */
  readonly label: string;
  /** The app canvas the map sits on (fonts and base tokens; the map has its own palette). */
  readonly app?: AppId;
  readonly theme?: 'light' | 'dark';
  readonly className?: string;
}

/**
 * A full-screen map scene in a device phone, for a map that is no registry figure (the 404's
 * 'lost' scene: design §8, audit S4.45). The composition /dev/map uses: PhoneFrame (role="img"
 * with `label`, inert canvas), RCanvas, then RMapCanvas filling the canvas. Static, so it takes
 * no view-transition name. It lives in components/showcase, which composes the replica kit
 * (like ScreenView), so page sections never import replicas/kit.
 */
export function MapPhone({ scene, size, label, app = 'citizen', theme = 'light', className }: MapPhoneProps): ReactNode {
  const glyphs = theme === 'dark' ? 'light' : 'dark';
  return (
    <PhoneFrame size={size} chrome="device" statusBar={glyphs} homeIndicator={glyphs} label={label} className={className}>
      <RCanvas app={app} theme={theme}>
        <div className="absolute inset-0">
          <RMapCanvas theme={theme} height="full" scene={scene} />
        </div>
      </RCanvas>
    </PhoneFrame>
  );
}
