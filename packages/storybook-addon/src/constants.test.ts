/**
 * Tests for addon constants
 */

import { describe, it, expect } from 'vitest';
import { ADDON_ID, PANEL_ID, PARAM_KEY, EVENTS } from './constants.js';

describe('constants', () => {
  describe('ADDON_ID', () => {
    it('should be "pactwork"', () => {
      expect(ADDON_ID).toBe('pactwork');
    });
  });

  describe('PANEL_ID', () => {
    it('should include ADDON_ID', () => {
      expect(PANEL_ID).toBe('pactwork/panel');
      expect(PANEL_ID).toContain(ADDON_ID);
    });
  });

  describe('PARAM_KEY', () => {
    it('should be "pactwork"', () => {
      expect(PARAM_KEY).toBe('pactwork');
    });
  });

  describe('EVENTS', () => {
    it('should have all required events', () => {
      expect(EVENTS.SCENARIO_CHANGE).toBe('pactwork/scenario-change');
      expect(EVENTS.LATENCY_CHANGE).toBe('pactwork/latency-change');
      expect(EVENTS.NETWORK_CHANGE).toBe('pactwork/network-change');
      expect(EVENTS.STATE_REQUEST).toBe('pactwork/state-request');
      expect(EVENTS.STATE_UPDATE).toBe('pactwork/state-update');
      expect(EVENTS.HANDLERS_READY).toBe('pactwork/handlers-ready');
      expect(EVENTS.RESET).toBe('pactwork/reset');
    });

    it('should have all events prefixed with ADDON_ID', () => {
      for (const event of Object.values(EVENTS)) {
        expect(event).toMatch(/^pactwork\//);
      }
    });
  });
});
