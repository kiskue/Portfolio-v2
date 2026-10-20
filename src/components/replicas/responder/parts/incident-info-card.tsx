import { StickyNote } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { responderTicket, ticketTxn } from '@/components/replicas/responder/sample-data';

function Divider(): ReactNode {
  return <span className="rx-responder-info__divider" />;
}

function Block({ label, children }: { readonly label: string; readonly children: ReactNode }): ReactNode {
  return (
    <>
      <span className="rx-responder-info__label">{label}</span>
      {children}
    </>
  );
}

/**
 * The ticket's info card in the dispatch sheet: the FIRE type pill and date, Reported by and the
 * TXN pill, then ADDRESS, the amber AGENT NOTE box, DESCRIPTION and the image thumbnails.
 */
export function IncidentInfoCard(): ReactNode {
  const images = Array.from({ length: responderTicket.images }, (_, index) => index);
  return (
    <div className="rx-responder-info">
      <span className="rx-responder-info__head">
        <span className="rx-responder-info__type">{responderTicket.type}</span>
        <span className="rx-responder-info__date">{responderTicket.date}</span>
      </span>
      <Divider />
      <span className="rx-responder-info__row">
        <span className="rx-responder-info__key">Reported by</span>
        <span className="rx-responder-info__value">{responderTicket.reportedBy}</span>
      </span>
      <span className="rx-responder-info__row" data-gap="">
        <span className="rx-responder-info__key">Transaction</span>
        <span className="rx-responder-info__txn">{ticketTxn}</span>
      </span>
      <Divider />
      <Block label="ADDRESS">
        <span className="rx-responder-info__text">{responderTicket.address}</span>
      </Block>
      <Divider />
      <Block label="AGENT NOTE">
        <span className="rx-responder-info__note">
          <RGlyph icon={StickyNote} size={14} color="#d97706" />
          <span className="rx-responder-info__text">{responderTicket.agentNote}</span>
        </span>
      </Block>
      <Divider />
      <Block label="DESCRIPTION">
        <span className="rx-responder-info__text">{responderTicket.description}</span>
      </Block>
      <Divider />
      <span className="rx-responder-info__images-head">
        <span className="rx-responder-info__label">IMAGES</span>
        <span className="rx-responder-info__count">{responderTicket.images}</span>
      </span>
      <span className="rx-responder-info__images">
        {images.map((index) => (
          <span key={index} className="rx-responder-photo" data-tone={index} />
        ))}
      </span>
    </div>
  );
}
