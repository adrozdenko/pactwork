/**
 * Apply Scenario Utility
 *
 * Replace a handler's response with a predefined scenario.
 * Useful for testing error states, empty states, and edge cases.
 */

import type { HttpHandler } from 'msw';
import type { HandlerMetaMap, Scenario } from './types.js';
import {
  createScenarioHandler,
  findHandlerMeta,
  replaceHandler,
  validateHandlers,
  validateMetaMap,
  validateOperationId,
} from './handler-utils.js';

/**
 * Apply a scenario to a specific operation.
 *
 * @example
 * ```typescript
 * const errorHandlers = applyScenario(
 *   handlers,
 *   handlerMeta,
 *   'getUser',
 *   { name: 'notFound', status: 404, data: { error: 'User not found' } }
 * );
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param operationId - Operation to apply scenario to
 * @param scenario - The scenario to apply
 * @returns New handlers array with scenario applied
 */
export function applyScenario<TData = unknown>(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  operationId: string,
  scenario: Scenario<TData>
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);
  validateOperationId(meta, operationId);

  const handlerMeta = findHandlerMeta(meta, operationId)!;
  const { method, path, index } = handlerMeta;

  const scenarioHandler = createScenarioHandler(method, path, scenario);

  return replaceHandler(handlers, index, scenarioHandler);
}

/**
 * Apply multiple scenarios to different operations at once.
 *
 * @example
 * ```typescript
 * const testHandlers = applyScenarios(handlers, handlerMeta, {
 *   getUser: scenarios.getUser.notFound,
 *   listUsers: scenarios.listUsers.empty,
 * });
 * ```
 *
 * @param handlers - Original MSW handlers array
 * @param meta - Handler metadata map
 * @param scenarios - Map of operationId → scenario
 * @returns New handlers array with all scenarios applied
 */
export function applyScenarios(
  handlers: HttpHandler[],
  meta: HandlerMetaMap,
  scenarios: Record<string, Scenario>
): HttpHandler[] {
  validateHandlers(handlers);
  validateMetaMap(meta);

  let result = handlers;

  for (const [operationId, scenario] of Object.entries(scenarios)) {
    result = applyScenario(result, meta, operationId, scenario);
  }

  return result;
}

/**
 * Create a scenario factory for an operation.
 * Returns a function that applies the scenario when called.
 *
 * @example
 * ```typescript
 * const withUserNotFound = createScenarioApplicator(
 *   handlerMeta,
 *   'getUser',
 *   scenarios.getUser.notFound
 * );
 *
 * // Later:
 * const testHandlers = withUserNotFound(handlers);
 * ```
 *
 * @param meta - Handler metadata map
 * @param operationId - Operation to apply scenario to
 * @param scenario - The scenario to apply
 * @returns Function that applies the scenario to any handlers array
 */
export function createScenarioApplicator<TData = unknown>(
  meta: HandlerMetaMap,
  operationId: string,
  scenario: Scenario<TData>
): (handlers: HttpHandler[]) => HttpHandler[] {
  return (handlers) => applyScenario(handlers, meta, operationId, scenario);
}

/**
 * Helper to create common scenario types.
 */
export const ScenarioHelpers = {
  /**
   * Create a not found (404) scenario.
   */
  notFound: <TData = { error: string }>(
    data: TData = { error: 'Not found' } as TData
  ): Scenario<TData> => ({
    name: 'notFound',
    status: 404,
    data,
  }),

  /**
   * Create an unauthorized (401) scenario.
   */
  unauthorized: <TData = { error: string }>(
    data: TData = { error: 'Unauthorized' } as TData
  ): Scenario<TData> => ({
    name: 'unauthorized',
    status: 401,
    data,
  }),

  /**
   * Create a forbidden (403) scenario.
   */
  forbidden: <TData = { error: string }>(
    data: TData = { error: 'Forbidden' } as TData
  ): Scenario<TData> => ({
    name: 'forbidden',
    status: 403,
    data,
  }),

  /**
   * Create a server error (500) scenario.
   */
  serverError: <TData = { error: string }>(
    data: TData = { error: 'Internal server error' } as TData
  ): Scenario<TData> => ({
    name: 'serverError',
    status: 500,
    data,
  }),

  /**
   * Create a validation error (400) scenario.
   */
  validationError: <TData = { error: string; errors?: unknown[] }>(
    data: TData = { error: 'Validation failed' } as TData
  ): Scenario<TData> => ({
    name: 'validationError',
    status: 400,
    data,
  }),

  /**
   * Create an empty list (200) scenario.
   */
  emptyList: <TData = unknown[]>(data: TData = [] as unknown as TData): Scenario<TData> => ({
    name: 'emptyList',
    status: 200,
    data,
  }),

  /**
   * Create a custom scenario.
   */
  custom: <TData>(
    name: string,
    status: number,
    data: TData,
    options?: { headers?: Record<string, string>; delay?: number }
  ): Scenario<TData> => ({
    name,
    status,
    data,
    ...options,
  }),
};
