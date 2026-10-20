import type { ReactNode } from 'react';
import { pickState, RField, type ReplicaProps } from '@/components/replicas/kit';
import { LocationCard, PhotoTiles, ReportFooter, ReportHeader } from '@/components/replicas/responder/parts/report-form';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { responderReport } from '@/components/replicas/responder/sample-data';
import type { FigureState } from '@/content/apps/figures';

/** One state: the form filled in, scrolled to the top (an empty form would show the placeholders). */
const VIEWS = { form: { filled: true } } as const satisfies Record<FigureState<'3.6'>, { readonly filled: boolean }>;

const STATES = stateTuple(VIEWS);

/**
 * FIG 3.6 Incident report form ("Report an Emergency"): the location card, Emergency Type
 * (Vehicular Accident), Injury Type (With Injury), the description and the photo tiles on a
 * scrolling #f2f5f9 page, above the Create footer. At 390×844 the page is taller than the
 * screen, so the photo tiles sit below the fold, as in the app. The button, the focus ring and
 * the tile glyphs follow the brand primary.
 */
export function IncidentReportFormScreen({ state }: ReplicaProps): ReactNode {
  const { filled } = VIEWS[pickState(STATES, state)];
  return (
    <div className="rx-responder-form">
      <ReportHeader />
      <div className="rx-responder-form__page">
        <LocationCard />
        <RField
          kind="select"
          label="Emergency Type"
          required
          value={filled ? responderReport.emergencyType : undefined}
          placeholder="Select an option"
        />
        <RField kind="select" label="Injury Type" required value={filled ? responderReport.injury : undefined} placeholder="Select an option" />
        <RField
          kind="textarea"
          label="Description"
          required
          value={filled ? responderReport.description : undefined}
          placeholder="Provide a brief description of the incident"
        />
        <PhotoTiles />
      </div>
      <ReportFooter />
    </div>
  );
}
