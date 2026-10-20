import { Camera, CircleAlert, Image, Images, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { czReport } from '@/components/replicas/citizen/sample-data';

/**
 * A section card's 28 px tile (#eae4e4 at 38%) with its accent glyph. `solid` draws the glyph as
 * a filled disc with a white mark, like the app's filled Ionicons alert-circle.
 */
function SectionTile({ icon, color, solid }: { readonly icon: LucideIcon; readonly color: string; readonly solid?: boolean }): ReactNode {
  return (
    <span className="rx-citizen-rcard__tile" style={{ color }}>
      <RGlyph icon={icon} size={18} fill={solid ? 'currentColor' : undefined} className={solid ? 'rx-citizen-glyph-solid' : undefined} />
    </span>
  );
}

/** "Incident Details": the white section card that heads the form fields. */
export function IncidentDetailsCard(): ReactNode {
  return (
    <span className="rx-citizen-rcard">
      <span className="rx-citizen-rcard__head">
        <SectionTile icon={CircleAlert} color="#F97316" solid />
        <span className="rx-citizen-rcard__title">{czReport.details}</span>
      </span>
    </span>
  );
}

/** One of the two 100 px outline buttons (CameraButton.tsx). */
function CameraButton({ icon, label }: { readonly icon: LucideIcon; readonly label: string }): ReactNode {
  return (
    <span className="rx-citizen-rcam">
      <RGlyph icon={icon} size={24} />
      <span className="rx-citizen-rcam__label">{label}</span>
    </span>
  );
}

/** "Evidence Photos": the optional photo card, its title in the brand primary, with Gallery and Camera. */
export function EvidencePhotosCard(): ReactNode {
  const { photos } = czReport;
  return (
    <span className="rx-citizen-rcard rx-citizen-rcard--photos">
      <span className="rx-citizen-rcard__head">
        <SectionTile icon={Images} color="#A855F7" />
        <span className="rx-citizen-rcard__titles">
          <span className="rx-citizen-rcard__title rx-citizen-rcard__title--brand">{photos.title}</span>
          <span className="rx-citizen-rcard__sub">{photos.subtitle}</span>
        </span>
      </span>
      <span className="rx-citizen-rcard__buttons">
        <CameraButton icon={Image} label={photos.gallery} />
        <CameraButton icon={Camera} label={photos.camera} />
      </span>
    </span>
  );
}

/** The light-blue strip at the end of the form, in the brand primary. */
export function ReportInfoStrip(): ReactNode {
  return (
    <span className="rx-citizen-rinfo">
      <RGlyph icon={Info} size={20} fill="currentColor" className="rx-citizen-glyph-solid" />
      <span className="rx-citizen-rinfo__text">{czReport.info}</span>
    </span>
  );
}
