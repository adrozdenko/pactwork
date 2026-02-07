/**
 * Pactwork Storybook Addon Constants
 *
 * Centralized constants for addon identification and channel communication.
 */

/** Unique addon identifier */
export const ADDON_ID = 'pactwork';

/** Panel identifier */
export const PANEL_ID = `${ADDON_ID}/panel`;

/** Parameter key in story parameters */
export const PARAM_KEY = 'pactwork';

/**
 * Channel events for communication between panel and decorator
 */
export const EVENTS = {
  /** Emitted when scenario changes in panel */
  SCENARIO_CHANGE: `${ADDON_ID}/scenario-change`,
  /** Emitted when latency changes in panel */
  LATENCY_CHANGE: `${ADDON_ID}/latency-change`,
  /** Emitted when network state changes in panel */
  NETWORK_CHANGE: `${ADDON_ID}/network-change`,
  /** Emitted to request current state */
  STATE_REQUEST: `${ADDON_ID}/state-request`,
  /** Emitted with current state */
  STATE_UPDATE: `${ADDON_ID}/state-update`,
  /** Emitted when handler metadata is available */
  HANDLERS_READY: `${ADDON_ID}/handlers-ready`,
  /** Emitted to reset all transformations */
  RESET: `${ADDON_ID}/reset`,
} as const;

/** Event type union */
export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
