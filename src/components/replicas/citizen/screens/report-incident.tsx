import type { ReactNode } from 'react';
import { pickState, RAutoScroll, RButton, RField, rBrand, type ReplicaProps } from '@/components/replicas/kit';
import { CitizenHeader } from '@/components/replicas/citizen/parts/citizen-header';
import { LocationCard } from '@/components/replicas/citizen/parts/location-card';
import { EvidencePhotosCard, IncidentDetailsCard, ReportInfoStrip } from '@/components/replicas/citizen/parts/report-cards';
import { czReport, czTitles } from '@/components/replicas/citizen/sample-data';
import { figureStates } from './figure-states';

const STATES = figureStates('2.6');

/** While active the form scrolls from the location card down to the photos and the info strip. */
const SCROLL = { distance: 520, startMs: 1000, durationMs: 2600 } as const;

/**
 * FIG 2.6 Report incident (citizen.json report-incident): the "Create Report" stack header,
 * the fixed hero with "Report Incident" and the Submit Report button (brand secondary), and
 * the scrolling form: the auto-attached location, Incident Details, Case Type, Injury Status,
 * Description (being typed, so it wears the 2 px focus ring in the brand accent), Evidence
 * Photos and the info strip. No tab bar: the app hides it on this route.
 */
export function ReportIncidentScreen({ state }: ReplicaProps): ReactNode {
  pickState(STATES, state);
  const { caseType, injury, description } = czReport;
  return (
    <div className="rx-citizen-screen">
      <CitizenHeader kind="stack" title={czTitles.createReport} titleSize={14} />
      <span className="rx-citizen-rhero">
        <span className="rx-citizen-rhero__title">{czReport.title}</span>
        <span className="rx-citizen-rhero__sub">{czReport.subtitle}</span>
        <RButton look="solid" label={czReport.submit} color={rBrand.secondary} full className="rx-citizen-rhero__submit" />
      </span>
      <RAutoScroll {...SCROLL} className="rx-citizen-fill">
        <div className="rx-citizen-rbody">
          <LocationCard />
          <IncidentDetailsCard />
          <RField kind="select" label={caseType.label} required value={caseType.value} />
          <RField kind="select" label={injury.label} required value={injury.value} />
          <RField kind="textarea" label={description.label} required value={description.value} focused />
          <EvidencePhotosCard />
          <ReportInfoStrip />
        </div>
      </RAutoScroll>
    </div>
  );
}
