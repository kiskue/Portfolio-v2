import type { ReactNode } from 'react';
import { DevSection } from '@/app/dev/replicas/dev-section';
import { glimpses } from '@/content/apps/glimpses';
import { getFigure } from '@/content/derived';
import { stepStates } from '@/lib/glimpse';

/** Section 5: every glimpse step as data, for checking timings, taps and posters against design §5.3. */
export function SequenceTable(): ReactNode {
  return (
    <DevSection
      id="sequences"
      title="5. Sequences"
      intro="Each step plays its state with data-active for its hold; the poster state shows for reduced motion, without JavaScript, before playback starts and after it ends. Taps are logical px on the 390×844 canvas."
    >
      <div className="flex flex-col gap-10">
        {glimpses.map((glimpse) => (
          <div key={glimpse.id} className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={`${glimpse.id} steps`}>
            <table className="w-full min-w-[40rem] border-collapse text-left text-body-sm" data-dev-sequence={glimpse.id}>
              <caption className="pb-2 text-left text-card-title text-ink">
                {glimpse.id}
                <span className="block text-meta font-normal text-ink-3">{glimpse.label}</span>
              </caption>
              <thead className="text-meta text-ink-3">
                <tr>
                  <th scope="col" className="py-1 pe-4">Step</th>
                  <th scope="col" className="py-1 pe-4">Figure</th>
                  <th scope="col" className="py-1 pe-4">State → poster</th>
                  <th scope="col" className="py-1 pe-4">Hold</th>
                  <th scope="col" className="py-1">Taps</th>
                </tr>
              </thead>
              <tbody>
                {glimpse.steps.map((step, index) => {
                  const figure = getFigure(step.figure);
                  const states = stepStates(step, figure.states[0]);
                  return (
                    <tr key={`${glimpse.id}-${index}`} className="border-t border-line align-top">
                      <th scope="row" className="py-2 pe-4 font-semibold">
                        {index + 1}
                        {index === glimpse.posterStep ? ' (poster)' : ''}
                      </th>
                      <td className="py-2 pe-4">
                        FIG {figure.id} {figure.title}
                      </td>
                      <td className="py-2 pe-4">
                        {states.play} → {states.poster}
                      </td>
                      <td className="py-2 pe-4 tabular-nums">{(step.holdMs / 1000).toFixed(1)} s</td>
                      <td className="py-2 tabular-nums">
                        {(step.taps ?? []).map((tap) => `${tap.kind} (${tap.x}, ${tap.y}) at ${tap.atMs} ms`).join(' · ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </DevSection>
  );
}
