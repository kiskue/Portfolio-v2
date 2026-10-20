import type { MapPin } from '@/components/replicas/kit';
import { MAP_CHROME } from '@/components/replicas/responder/parts/palette';

/*
 * The one fictional dataset behind the Defensys Responder replicas (3.1–3.6), copied from the
 * research `signatureScreens[].sampleData` (responder.json). Screens and parts read names,
 * numbers and data-bearing sentences from here and never retype them; layout chrome (button
 * labels, section titles, the duty labels) comes from the layoutSpecs and lives in the parts.
 *
 * One incident runs through the figures: ticket 2026-000123 (a kitchen fire) is assigned in
 * 3.2, driven to in 3.3 and discussed with the command center in 3.4. "Ana Sample" is the
 * command-center agent and "Juan Dela Cruz" is the responder holding the phone (the
 * placeholder names the research uses). Nothing here is a real person, place, number or id.
 */

// ─── The shift (3.1) ─────────────────────────────────────────────────────────────────────

/** The public-alert strip under the header (severity Warning). */
export const responderAlert = {
  severity: 'Warning',
  title: 'Sample advisory: heavy rainfall this afternoon',
  more: 1,
} as const;

/** The vehicle the responder is aboard: 3 of 8 seats taken, the responder in seat 3. */
export const responderVehicle = {
  name: 'Rescue Van 2',
  seat: 3,
  capacity: 8,
  /** Seats taken, the responder's own included. */
  taken: [1, 2, 3],
} as const;

/** The occupancy label, e.g. "3/8". */
export function vehicleOccupancy(vehicle: typeof responderVehicle = responderVehicle): string {
  return `${vehicle.taken.length}/${vehicle.capacity}`;
}

// ─── The incident (3.2, 3.3, 3.4) ────────────────────────────────────────────────────────

/** The assigned ticket (status 0 in 3.2, en route in 3.3). */
export const responderTicket = {
  number: '2026-000123',
  type: 'FIRE',
  date: 'Oct 19, 2026 1:32 PM',
  reportedBy: 'Citizen App',
  address: '123 Sample Street, Brgy. Example, Sample City',
  agentNote: 'Caller reports smoke from a two-storey house. Bring breathing apparatus.',
  description: 'Kitchen fire, residents evacuated (sample).',
  /** Placeholder photos attached by the citizen (drawn as abstract tiles). */
  images: 2,
} as const;

/** "TXN #2026-000123", as the info card's pill prints it. */
export const ticketTxn = `TXN #${responderTicket.number}`;

/**
 * The road route's ETA ribbon (its edge takes the zone of the road distance). It comes from the
 * route query, which only refreshes on a re-route, so it does not count down while driving.
 */
export const responderEta = { duration: '6 min', distance: '2.4 km', metres: 2400 } as const;

/** Straight-line distance to the scene in each 3.3 state, in metres. */
export const responderDistance = { far: 1240, near: 80, onSite: 18 } as const;

/** Metres as the distance card prints them ("1,240"). */
export function metres(value: number): string {
  return value.toLocaleString('en-US');
}

// ─── The call (3.4) ──────────────────────────────────────────────────────────────────────

/** The command-center agent ringing the responder about the ticket. */
export const responderCaller = {
  name: 'Ana Sample',
  initials: 'AS',
  subtitle: 'Command Center Agent',
  ticket: `Ticket #${responderTicket.number}`,
  citizenState: 'On a live citizen call',
} as const;

/** The incident room reached through JOIN STREAM. */
export const responderRoom = {
  title: `ROOM · ${responderTicket.number}`,
  participants: 2,
  log: [
    { kind: 'message', text: 'Ana Sample: Copy, two units en route' },
    { kind: 'event', text: 'Juan Dela Cruz joined' },
  ],
} as const;

// ─── The channel (3.5) ───────────────────────────────────────────────────────────────────

/**
 * The team channel. The research lists the own voice note second; it is drawn last here,
 * as the reply to the mention, because the glimpse records it and it lands at the bottom.
 */
export const responderChannel = {
  name: 'Rescue Ops – Alpha',
  onCall: 3,
  staging: { sender: 'Ana Sample', text: 'All units, staging at the plaza (sample).' },
  urgent: { sender: 'Ana Sample', text: 'Road closed at Sample Bridge, reroute via the highway (sample).' },
  mention: { sender: 'Ana Sample', handle: '@Juan Dela Cruz', text: 'please confirm your unit.' },
  voiceNote: { seconds: 7, clock: '0:07', transcript: 'Copy, ETA five minutes.', language: 'English' },
} as const;

// ─── The field report (3.6) ──────────────────────────────────────────────────────────────

export const responderReport = {
  address: '123 Sample Street, Brgy. Example, Sample City',
  lat: '14.000000',
  long: '121.000000',
  emergencyTypes: ['Fire', 'Medical', 'Vehicular Accident', 'Flood'],
  emergencyType: 'Vehicular Accident',
  injury: 'With Injury',
  description: 'Two vehicles collided at the intersection; one driver conscious (sample).',
  photos: 2,
} as const;

// ─── Map scenes (town coordinates = logical px of the 390×844 canvas) ────────────────────

/**
 * Where each map figure puts its overlays. RMapCanvas fills the whole canvas, so these are
 * also screen positions. 3.2 and 3.3 share one scene: the 'en-route' route (W6) should run from
 * the puck to the incident pin.
 */
export const responderScenes = {
  /** 3.1: the responder in follow mode, three fellow responders nearby. */
  shift: {
    puck: { x: 195, y: 470, heading: 40 },
    peers: [
      { x: 300, y: 336 },
      { x: 92, y: 604 },
      { x: 272, y: 590 },
    ],
  },
  /**
   * 3.2 (flat, north-up) and 3.3 (tilted 3D follow, heading-up): the puck in the lower third of
   * the map above the 50% sheet, and the incident up the road.
   */
  incident: {
    puck: { x: 195, y: 404 },
    heading: { flat: 24, nav: 0 },
    scene: { x: 250, y: 168 },
  },
  /** 3.6: the 192px map in the location card, centred on the current location. */
  report: { you: { x: 195, y: 422 } },
} as const;

/** Fellow responders on the 3.1 map: green pins titled "Responder". */
export const peerPins: readonly MapPin[] = responderScenes.shift.peers.map(
  (peer): MapPin => ({ ...peer, kind: 'peer', color: MAP_CHROME.peer, label: 'Responder' }),
);

/** The emergency's map pin, titled as the app titles it ("Emergency FIRE"). */
export function incidentPin(at: { readonly x: number; readonly y: number }): MapPin {
  return { x: at.x, y: at.y, kind: 'incident', label: `Emergency ${responderTicket.type}` };
}
