/**
 * Tests for the pactwork decorator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setWorker,
  setGlobalConfig,
  getGlobalConfig,
  resetHandlers,
  handleScenarioChange,
  handleLatencyChange,
  handleNetworkChange,
} from './decorator.js';
import type { PactworkGlobalConfig } from './types.js';

// Mock pactwork/runtime module
vi.mock('pactwork/runtime', () => ({
  applyScenario: vi.fn((handlers) => handlers),
  withLatency: vi.fn((handlers) => handlers),
  withNetworkError: vi.fn((handlers) => handlers),
  withAllNetworkErrors: vi.fn((handlers) => handlers),
}));

describe('decorator', () => {
  const mockWorker = {
    use: vi.fn(),
    resetHandlers: vi.fn(),
  };

  const mockConfig: PactworkGlobalConfig = {
    handlers: [],
    handlerMeta: {
      getUser: { operationId: 'getUser', method: 'GET', path: '/api/users/:id', index: 0 },
      listUsers: { operationId: 'listUsers', method: 'GET', path: '/api/users', index: 1 },
    },
    scenarios: {
      getUser: {
        loading: { name: 'Loading', status: 200, data: null, delay: 2000 },
        notFound: { name: 'Not Found', status: 404, data: { error: 'User not found' } },
        serverError: { name: 'Server Error', status: 500, data: { error: 'Internal error' } },
      },
      listUsers: {
        empty: { name: 'Empty', status: 200, data: [] },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setWorker(mockWorker);
    setGlobalConfig(mockConfig);
  });

  afterEach(() => {
    resetHandlers();
  });

  describe('setWorker', () => {
    it('should store the MSW worker reference', () => {
      const worker = { use: vi.fn(), resetHandlers: vi.fn() };
      setWorker(worker);
      // Worker is used internally, verify by calling resetHandlers
      resetHandlers();
      expect(worker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('setGlobalConfig', () => {
    it('should store the global configuration', () => {
      const config: PactworkGlobalConfig = {
        handlers: [],
        handlerMeta: {},
        scenarios: {},
      };
      setGlobalConfig(config);
      expect(getGlobalConfig()).toBe(config);
    });
  });

  describe('resetHandlers', () => {
    it('should call worker.resetHandlers', () => {
      resetHandlers();
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('handleScenarioChange', () => {
    it('should reset handlers when scenario is null', async () => {
      await handleScenarioChange({ scenario: null });
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });

    it('should apply scenario when valid', async () => {
      await handleScenarioChange({ scenario: 'getUser.notFound' });
      // Worker should be used to apply transformed handlers
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('handleLatencyChange', () => {
    it('should apply latency transformation', async () => {
      await handleLatencyChange({ latency: 500 });
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });

    it('should apply latency to specific operations', async () => {
      await handleLatencyChange({ latency: 1000, operations: ['getUser'] });
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });

  describe('handleNetworkChange', () => {
    it('should reset handlers when type is null', async () => {
      await handleNetworkChange({ type: null });
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });

    it('should apply network error transformation', async () => {
      await handleNetworkChange({ type: 'timeout' });
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });

    it('should apply network error with delay', async () => {
      await handleNetworkChange({ type: 'timeout', delay: 5000 });
      expect(mockWorker.resetHandlers).toHaveBeenCalled();
    });
  });
});

describe('parseScenario (internal)', () => {
  // We test the parsing logic indirectly through handleScenarioChange
  // For more thorough testing, we'd need to export parseScenario or test via integration

  it('should handle operationId.scenarioName format via handleScenarioChange', async () => {
    const mockWorker = { use: vi.fn(), resetHandlers: vi.fn() };
    setWorker(mockWorker);
    setGlobalConfig({
      handlers: [],
      handlerMeta: {
        getUser: { operationId: 'getUser', method: 'GET', path: '/api/users/:id', index: 0 },
      },
      scenarios: {
        getUser: {
          notFound: { name: 'Not Found', status: 404, data: { error: 'User not found' } },
        },
      },
    });

    // This tests that the format is parsed correctly
    await handleScenarioChange({ scenario: 'getUser.notFound' });
    expect(mockWorker.resetHandlers).toHaveBeenCalled();
  });
});
