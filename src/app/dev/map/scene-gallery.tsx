import type { ReactNode } from 'react';
import { MAP_SCENE_KEYS, MAP_SCENES } from '@/components/replicas/kit';
import { DevMapSection, PhoneItem, PhoneRow } from './dev-map-section';
import { ScenePhone } from './scene-phone';

/** Section 1: every scene in both themes at 2xl (about 1:1 with the 390 × 844 canvas). */
export function SceneGallery(): ReactNode {
  return (
    <DevMapSection
      id="scenes"
      title="1. Scenes"
      intro={
        <>
          Each named scene of map-scenes.ts as its figure shows it, in the light and dark palettes, at the largest phone size.
          These are posters: nothing animates here (section 4 has the motion). Band-shaped maps sit under a 116 px header area.
        </>
      }
    >
      {MAP_SCENE_KEYS.map((key) => {
        const scene = MAP_SCENES[key];
        return (
          <div key={key} id={`scene-${key}`} className="scroll-mt-24">
            <h3 className="text-h3">
              {scene.title} <span className="text-body-sm font-normal text-ink-3">· {key}</span>
            </h3>
            <p className="mt-1 max-w-[72ch] text-body-sm text-ink-3">
              {scene.usedBy.length > 0 ? `Used by ${scene.usedBy.join(', ')}. ` : ''}
              {scene.height === 'full' ? 'Full height. ' : `${scene.height} px band. `}
              {scene.note}
            </p>
            <PhoneRow label={`Scene ${key}, light and dark`}>
              {(['light', 'dark'] as const).map((theme) => (
                <PhoneItem key={theme} caption={`${key} · ${theme}`} data-scene={key} data-theme-variant={theme}>
                  <ScenePhone scene={key} theme={theme} size="2xl" />
                </PhoneItem>
              ))}
              {key === 'delivery' ? (
                <PhoneItem caption="delivery · light · full screen (1.5 expanded)" data-scene={key} data-theme-variant="light-full">
                  <ScenePhone scene={key} theme="light" size="2xl" full />
                </PhoneItem>
              ) : null}
            </PhoneRow>
          </div>
        );
      })}
    </DevMapSection>
  );
}
