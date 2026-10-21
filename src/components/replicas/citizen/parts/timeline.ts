/*
 * In-screen timelines of the Citizen glimpse steps, in ms after [data-active] is set. The glimpse
 * player draws a tap ring that scales in over 180 ms, and a screen reacts once it has
 * (src/content/apps/glimpses.ts contract), so each reaction is its tap's atMs + CZ_TAP_REACT_MS.
 * citizen.css reads these through custom properties set by the screens.
 */

/** How long after a tap's atMs the screen reacts (the tap ring has fully scaled in). */
export const CZ_TAP_REACT_MS = 180;

/** Glimpse taps these timelines answer (glimpses.ts CITIZEN_SOS and CITIZEN_HAZARDS). */
export const CZ_TAPS = { sosMs: 700, confirmMs: 3200, floodMs: 1000 } as const;

/**
 * 2.3 idle → countdown: the SOS dips to 0.92 and its commit ring leaves; the popup fades in on
 * 5s and counts down a second apart (4s, then 3s with the bar at 60%, the countdown poster);
 * Confirm Call is pressed. The press ends at 3660 ms, inside the step's 3700 ms hold.
 */
export const CZ_SOS_TIMELINE = {
  pressMs: CZ_TAPS.sosMs + CZ_TAP_REACT_MS,
  commitMs: CZ_TAPS.sosMs + CZ_TAP_REACT_MS + 90,
  popupMs: CZ_TAPS.sosMs + CZ_TAP_REACT_MS + 100,
  tickMs: 1000,
  confirmMs: CZ_TAPS.confirmMs + CZ_TAP_REACT_MS,
} as const;

/**
 * 2.5 list → map: the Flood card dims under the finger, the Hazard Report modal slides up over
 * the list (420 ms), then its info card rises (380 ms). Done at 2060 ms, inside the 3800 ms hold.
 */
export const CZ_HAZARD_TIMELINE = {
  tapMs: CZ_TAPS.floodMs + CZ_TAP_REACT_MS,
  sheetMs: CZ_TAPS.floodMs + CZ_TAP_REACT_MS + 120,
  cardMs: CZ_TAPS.floodMs + CZ_TAP_REACT_MS + 500,
} as const;
