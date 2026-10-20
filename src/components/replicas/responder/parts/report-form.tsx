import { Camera, Image as ImageGlyph } from 'lucide-react';
import type { ReactNode } from 'react';
import { RAppBar, rBrand, RButton, RGlyph, RMapCanvas } from '@/components/replicas/kit';
import { responderReport, responderScenes } from '@/components/replicas/responder/sample-data';

/** The stack header on #f2f5f9 (back chevron, "Create Emergency Ticket" 16px Bold black) and the white sub-bar. */
export function ReportHeader(): ReactNode {
  return (
    <>
      <RAppBar
        look="responder"
        title="Create Emergency Ticket"
        leading="back"
        bg="#f2f5f9"
        titleColor="#000000"
        titleSize={16}
        iconColor="#000000"
        className="rx-responder-formhead"
      />
      <div className="rx-responder-formbar">Report an Emergency</div>
    </>
  );
}

/**
 * The location card: a 192px live map (top radius 16, shadow-lg, traffic, a "Current Location"
 * pin) joined to a #f4f1f1 footer with the address and the coordinates at opposite ends.
 */
export function LocationCard(): ReactNode {
  const { you } = responderScenes.report;
  return (
    <div className="rx-responder-loc">
      <div className="rx-responder-loc__map">
        <RMapCanvas theme="light" height={192} traffic pins={[{ x: you.x, y: you.y, kind: 'you', label: 'Current Location' }]} />
      </div>
      <div className="rx-responder-loc__foot">
        <span className="rx-responder-loc__label">Current Location</span>
        <span className="rx-responder-loc__address">{responderReport.address}</span>
        <span className="rx-responder-loc__coords">
          <span>{`Lat: ${responderReport.lat}`}</span>
          <span>{`Long: ${responderReport.long}`}</span>
        </span>
      </div>
    </div>
  );
}

/** "Image  Optional": the Pick Photo and Take Photo tiles (120px, gap 12) with accent glyphs. */
export function PhotoTiles(): ReactNode {
  return (
    <div className="rx-responder-photos">
      <span className="rx-responder-photos__label">
        Image<span className="rx-responder-photos__opt">{'  Optional'}</span>
      </span>
      <span className="rx-responder-photos__row">
        <span className="rx-responder-photos__tile">
          <RGlyph icon={ImageGlyph} size={24} color={rBrand.primary} />
          <span>Pick Photo</span>
        </span>
        <span className="rx-responder-photos__tile">
          <RGlyph icon={Camera} size={24} color={rBrand.primary} />
          <span>Take Photo</span>
        </span>
      </span>
    </div>
  );
}

/** The pinned footer: a full-width 56px Create button in the brand primary. */
export function ReportFooter(): ReactNode {
  return (
    <div className="rx-responder-formfoot">
      <RButton look="solid" label="Create" h={56} radius={12} full fontSize={16} />
    </div>
  );
}
