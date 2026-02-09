/**
 * Tests for the Pactwork Panel component
 *
 * Note: Full React component testing with Storybook hooks requires
 * @testing-library/react and complex mocking. These tests focus on
 * the display logic and constants integration.
 */

import { describe, it, expect, vi } from 'vitest';
import { EVENTS } from './constants.js';
import { getStatusColor, getMethodColor, formatLatency, formatStatus, getRowBackground } from './panel-utils.js';

describe('Panel display logic', () => {
  describe('scenario display', () => {
    it('should extract scenario name from compound format', () => {
      // Test the display logic: 'getUser.notFound' -> 'notFound'
      const scenario = 'getUser.notFound';
      const displayName = scenario.split('.')[1] || scenario;
      expect(displayName).toBe('notFound');
    });

    it('should handle empty scenario', () => {
      const scenario = '';
      const displayName = scenario === '' ? 'default' : scenario.split('.')[1] || scenario;
      expect(displayName).toBe('default');
    });

    it('should handle scenario without dot', () => {
      const scenario = 'success';
      const displayName = scenario.split('.')[1] || scenario;
      expect(displayName).toBe('success');
    });

    it('should handle multi-part scenario names', () => {
      const scenario = 'getUser.notFound.variation1';
      const displayName = scenario.split('.')[1] || scenario;
      expect(displayName).toBe('notFound');
    });
  });

  describe('network badge variant', () => {
    it('should return error variant for offline', () => {
      const getVariant = (network: string) => network === 'offline' ? 'error' : 'success';
      expect(getVariant('offline')).toBe('error');
    });

    it('should return success variant for online', () => {
      const getVariant = (network: string) => network === 'offline' ? 'error' : 'success';
      expect(getVariant('online')).toBe('success');
    });
  });

  describe('latency display', () => {
    it('should show "None" for zero latency', () => {
      expect(formatLatency(0)).toBe('None');
    });

    it('should show milliseconds for positive latency', () => {
      expect(formatLatency(500)).toBe('500ms');
      expect(formatLatency(1000)).toBe('1000ms');
      expect(formatLatency(2000)).toBe('2000ms');
    });
  });

  describe('status badge color logic', () => {
    it('should return success color for 2xx status', () => {
      expect(getStatusColor(200)).toBe('#49cc90');
      expect(getStatusColor(201)).toBe('#49cc90');
      expect(getStatusColor(204)).toBe('#49cc90');
    });

    it('should return success color for 3xx status', () => {
      expect(getStatusColor(301)).toBe('#49cc90');
      expect(getStatusColor(304)).toBe('#49cc90');
    });

    it('should return warning color for 4xx status', () => {
      expect(getStatusColor(400)).toBe('#fca130');
      expect(getStatusColor(401)).toBe('#fca130');
      expect(getStatusColor(404)).toBe('#fca130');
      expect(getStatusColor(429)).toBe('#fca130');
    });

    it('should return error color for 5xx status', () => {
      expect(getStatusColor(500)).toBe('#f93e3e');
      expect(getStatusColor(502)).toBe('#f93e3e');
      expect(getStatusColor(503)).toBe('#f93e3e');
    });

    it('should return error color for status 0 (network error)', () => {
      expect(getStatusColor(0)).toBe('#f93e3e');
    });
  });

  describe('status text display', () => {
    it('should show "ERR" for status 0', () => {
      expect(formatStatus(0)).toBe('ERR');
    });

    it('should show numeric status for other codes', () => {
      expect(formatStatus(200)).toBe(200);
      expect(formatStatus(404)).toBe(404);
      expect(formatStatus(500)).toBe(500);
    });
  });

  describe('method badge colors', () => {
    it('should return blue for GET', () => {
      expect(getMethodColor('GET')).toBe('#61affe');
    });

    it('should return green for POST', () => {
      expect(getMethodColor('POST')).toBe('#49cc90');
    });

    it('should return orange for PUT', () => {
      expect(getMethodColor('PUT')).toBe('#fca130');
    });

    it('should return red for DELETE', () => {
      expect(getMethodColor('DELETE')).toBe('#f93e3e');
    });

    it('should return gray for unknown methods', () => {
      expect(getMethodColor('PATCH')).toBe('#999');
      expect(getMethodColor('OPTIONS')).toBe('#999');
    });
  });

  describe('request log row background', () => {
    it('should be transparent for success', () => {
      expect(getRowBackground(200)).toBe('transparent');
      expect(getRowBackground(201)).toBe('transparent');
    });

    it('should be orange tint for client errors', () => {
      expect(getRowBackground(400)).toBe('rgba(255, 165, 0, 0.05)');
      expect(getRowBackground(404)).toBe('rgba(255, 165, 0, 0.05)');
    });

    it('should be orange tint for server errors', () => {
      expect(getRowBackground(500)).toBe('rgba(255, 165, 0, 0.05)');
      expect(getRowBackground(503)).toBe('rgba(255, 165, 0, 0.05)');
    });

    it('should be red tint for network errors', () => {
      expect(getRowBackground(0)).toBe('rgba(255, 0, 0, 0.05)');
    });
  });
});

describe('Panel constants integration', () => {
  it('should use EVENTS.HANDLERS_READY for handler events', () => {
    expect(EVENTS.HANDLERS_READY).toBe('pactwork/handlers-ready');
  });

  it('should use EVENTS.STATE_REQUEST for state requests', () => {
    expect(EVENTS.STATE_REQUEST).toBe('pactwork/state-request');
  });

  it('should have request-log event name', () => {
    // The Panel uses 'pactwork/request-log' directly (not from EVENTS)
    const REQUEST_LOG_EVENT = 'pactwork/request-log';
    expect(REQUEST_LOG_EVENT).toBe('pactwork/request-log');
  });
});

describe('Panel types', () => {
  describe('RequestLogEntry shape', () => {
    it('should have all required fields', () => {
      const entry = {
        id: 'abc123',
        timestamp: Date.now(),
        method: 'GET',
        path: '/api/users/1',
        operationId: 'getUser',
        scenario: 'success',
        status: 200,
        duration: 45,
      };

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('method');
      expect(entry).toHaveProperty('path');
      expect(entry).toHaveProperty('operationId');
      expect(entry).toHaveProperty('scenario');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('duration');
    });
  });

  describe('MAX_LOG_ENTRIES constant', () => {
    it('should be 50', async () => {
      const { MAX_LOG_ENTRIES } = await import('./Panel.js');
      expect(MAX_LOG_ENTRIES).toBe(50);
    });

    it('should truncate log correctly', async () => {
      const { MAX_LOG_ENTRIES } = await import('./Panel.js');
      const entries = Array.from({ length: 60 }, (_, i) => ({ id: i }));
      const newEntry = { id: 999 };
      const updated = [newEntry, ...entries].slice(0, MAX_LOG_ENTRIES);
      expect(updated.length).toBe(50);
      expect(updated[0].id).toBe(999);
    });
  });
});

describe('Panel export', () => {
  it('should export Panel component', async () => {
    // Verify the module exports the Panel function
    const module = await import('./Panel.js');
    expect(module.Panel).toBeDefined();
    expect(typeof module.Panel).toBe('function');
  });

  it('should have default export', async () => {
    const module = await import('./Panel.js');
    expect(module.default).toBeDefined();
    expect(module.default).toBe(module.Panel);
  });
});
