import { ChevronRight, Megaphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { responderAlert } from '@/components/replicas/responder/sample-data';
import { ALERT_SEVERITY } from './palette';

/**
 * The public-alert strip under the map header (PublicAlertBanner): full width, filled in the
 * severity colour (Warning #FBBF24 with #1C1917 ink), megaphone, kicker, title, "+1 more".
 */
export function PublicAlertStrip(): ReactNode {
  const severity = ALERT_SEVERITY[responderAlert.severity];
  return (
    <div className="rx-responder-alert" style={{ background: severity.fill, color: severity.ink }}>
      <RGlyph icon={Megaphone} size={22} />
      <span className="rx-responder-alert__copy">
        <span className="rx-responder-alert__kicker">{`${responderAlert.severity.toUpperCase()} · PUBLIC ALERT`}</span>
        <span className="rx-responder-alert__title">{responderAlert.title}</span>
      </span>
      <span className="rx-responder-alert__more">{`+${responderAlert.more} more`}</span>
      <RGlyph icon={ChevronRight} size={18} />
    </div>
  );
}
