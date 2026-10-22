import { StickyNote } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { responderTicket, ticketTxn } from '@/components/replicas/responder/sample-data';

function Divider(): ReactNode {
  return <span className="rx-responder-info__divider" />;
}

/**
 * The ticket's info card in the dispatch sheet: the FIRE type pill and date, Reported by and the
 * TXN pill, ADDRESS, then the amber AGENT NOTE box. At the 85% snap the card runs on under the
 * pinned footer from the note box down, so the DESCRIPTION and IMAGES blocks below it are never
 * visible and are not drawn.
 */
export function IncidentInfoCard(): ReactNode {
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
      <span className="rx-responder-info__label">ADDRESS</span>
      <span className="rx-responder-info__text">{responderTicket.address}</span>
      <Divider />
      <span className="rx-responder-info__label">AGENT NOTE</span>
      <span className="rx-responder-info__note">
        <RGlyph icon={StickyNote} size={14} color="#d97706" />
        <span className="rx-responder-info__text">{responderTicket.agentNote}</span>
      </span>
    </div>
  );
}
