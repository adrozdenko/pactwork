/**
 * Type tests for pactwork addon types
 *
 * These tests verify that the types are correctly defined and exported.
 * They use TypeScript's type system to catch errors at compile time.
 */

import { describe, it, expectTypeOf } from 'vitest';
import type {
  PactworkParameters,
  PactworkGlobalConfig,
  PactworkPanelState,
  HandlerInfo,
  ScenarioChangePayload,
  LatencyChangePayload,
  NetworkChangePayload,
} from './types.js';

describe('types', () => {
  describe('PactworkParameters', () => {
    it('should allow scenario as string', () => {
      const params: PactworkParameters = {
        scenario: 'getUser.notFound',
      };
      expectTypeOf(params.scenario).toEqualTypeOf<string | undefined>();
    });

    it('should allow scenarios as array', () => {
      const params: PactworkParameters = {
        scenarios: ['getUser.notFound', 'listUsers.empty'],
      };
      expectTypeOf(params.scenarios).toEqualTypeOf<string[] | undefined>();
    });

    it('should allow latency as number', () => {
      const params: PactworkParameters = {
        latency: 1000,
      };
      expectTypeOf(params.latency).toMatchTypeOf<number | undefined>();
    });

    it('should allow latency as LatencyOptions', () => {
      const params: PactworkParameters = {
        latency: { min: 100, max: 500 },
      };
      expectTypeOf(params.latency).toMatchTypeOf<{ min?: number; max?: number } | undefined>();
    });

    it('should allow networkError as string type', () => {
      const params: PactworkParameters = {
        networkError: 'timeout',
      };
      expectTypeOf(params.networkError).toMatchTypeOf<'timeout' | 'abort' | 'network-error' | undefined>();
    });

    it('should allow disabled flag', () => {
      const params: PactworkParameters = {
        disabled: true,
      };
      expectTypeOf(params.disabled).toEqualTypeOf<boolean | undefined>();
    });
  });

  describe('PactworkGlobalConfig', () => {
    it('should require handlers array', () => {
      expectTypeOf<PactworkGlobalConfig>().toHaveProperty('handlers');
    });

    it('should require handlerMeta record', () => {
      expectTypeOf<PactworkGlobalConfig>().toHaveProperty('handlerMeta');
    });

    it('should require scenarios record', () => {
      expectTypeOf<PactworkGlobalConfig>().toHaveProperty('scenarios');
    });

    it('should allow optional debug flag', () => {
      expectTypeOf<PactworkGlobalConfig>().toHaveProperty('debug');
    });
  });

  describe('PactworkPanelState', () => {
    it('should have required properties', () => {
      expectTypeOf<PactworkPanelState>().toHaveProperty('selectedScenario');
      expectTypeOf<PactworkPanelState>().toHaveProperty('latency');
      expectTypeOf<PactworkPanelState>().toHaveProperty('networkError');
      expectTypeOf<PactworkPanelState>().toHaveProperty('enabled');
    });
  });

  describe('HandlerInfo', () => {
    it('should have required properties', () => {
      const info: HandlerInfo = {
        operationId: 'getUser',
        method: 'GET',
        path: '/api/users/:id',
        availableScenarios: ['notFound', 'serverError'],
      };
      expectTypeOf(info.operationId).toBeString();
      expectTypeOf(info.method).toBeString();
      expectTypeOf(info.path).toBeString();
      expectTypeOf(info.availableScenarios).toEqualTypeOf<string[]>();
    });
  });

  describe('Event payloads', () => {
    it('ScenarioChangePayload should have scenario property', () => {
      const payload: ScenarioChangePayload = {
        scenario: 'getUser.notFound',
      };
      expectTypeOf(payload.scenario).toEqualTypeOf<string | null>();
    });

    it('LatencyChangePayload should have latency property', () => {
      const payload: LatencyChangePayload = {
        latency: 1000,
      };
      expectTypeOf(payload.latency).toBeNumber();
    });

    it('NetworkChangePayload should have type property', () => {
      const payload: NetworkChangePayload = {
        type: 'timeout',
      };
      expectTypeOf(payload.type).toEqualTypeOf<'timeout' | 'abort' | 'network-error' | null>();
    });
  });
});
